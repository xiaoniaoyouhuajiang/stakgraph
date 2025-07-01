#[cfg(feature = "neo4j")]
mod handlers;
mod types;

use ast::repo::StatusUpdate;
use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::{routing::get, routing::post, Router};
use futures::{stream, Stream};
use std::convert::Infallible;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeFile;
use tracing_subscriber::{filter::LevelFilter, EnvFilter};
use types::Result;

#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<StatusUpdate>,
}

#[cfg(feature = "neo4j")]
#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();
    tracing_subscriber::fmt()
        .with_target(false)
        .with_env_filter(filter)
        .init();

    let (tx, _rx) = broadcast::channel(10);
    let app_state = Arc::new(AppState { tx: tx });

    let cors_layer = CorsLayer::permissive();
    let app = Router::new()
        .route("/process", post(handlers::process))
        .route("/clear", post(handlers::clear_graph))
        .route("/ingest", post(handlers::ingest))
        .route("/fetch-repo", post(handlers::fetch_repo))
        .route("/events", get(sse_handler))
        .route_service("/", static_file("index.html"))
        .route_service("/styles.css", static_file("styles.css"))
        .route_service("/app.js", static_file("app.js"))
        .route_service("/utils.js", static_file("utils.js"))
        .with_state(app_state)
        .layer(cors_layer);

    let port = std::env::var("PORT").unwrap_or_else(|_| "7777".to_string());
    let bind = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(bind).await.unwrap();
    println!("=> listening on http://{}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
    Ok(())
}

fn static_file(path: &str) -> ServeFile {
    ServeFile::new(format!("standalone/static/{}", path))
}

async fn sse_handler(
    State(app_state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = std::result::Result<Event, Infallible>>> {
    // Create a receiver for the broadcast channel
    let rx = app_state.tx.subscribe();

    // Create a stream that yields events from the channel
    let stream = stream::unfold(rx, move |mut rx| async move {
        match rx.recv().await {
            Ok(msg) => {
                let event = Event::default().data(msg.as_json_str());
                Some((Ok(event), rx))
            }
            Err(e) => {
                println!("Error receiving from channel: {:?}", e);
                None // End the stream on error
            }
        }
    });

    // Return the Sse response with keep-alive configured
    Sse::new(stream).keep_alive(KeepAlive::default())
}

#[cfg(not(feature = "neo4j"))]
fn main() -> Result<()> {
    println!(
        "The 'neo4j' feature must be enabled to build this binary. Use: cargo run --features neo4j"
    );
    Ok(())
}
