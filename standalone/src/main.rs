use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::EnvFilter;

pub type Result<T> = std::result::Result<T, AppError>;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();
    tracing_subscriber::fmt()
        .with_target(false)
        .with_env_filter(filter)
        .init();
    start().await
}

async fn start() -> Result<()> {
    let cors_layer = tower_http::cors::CorsLayer::permissive();
    let app = Router::new()
        .route("/process", get(process))
        .layer(cors_layer);
    let port = std::env::var("PORT").unwrap_or_else(|_| "7777".to_string());
    let bind = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(bind).await.unwrap();
    println!("=> listening on http://{}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
    Ok(())
}

#[derive(Serialize, Deserialize)]
pub struct ProcessBody {
    pub keyword: String,
}

#[axum::debug_handler]
pub async fn process(Json(_body): Json<ProcessBody>) -> Result<Json<String>> {
    Ok(Json("ok".to_string()))
}

#[derive(Debug)]
pub enum AppError {
    Anyhow(anyhow::Error),
}

// Tell axum how to convert `AppError` into a response.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::Anyhow(err) => (StatusCode::BAD_REQUEST, err.to_string()).into_response(),
        }
    }
}

impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self::Anyhow(err.into())
    }
}
