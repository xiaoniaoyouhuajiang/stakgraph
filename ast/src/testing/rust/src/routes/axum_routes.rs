use anyhow::Result;
use axum::{
    extract::{Json, Path},
    http::StatusCode,
    response::{IntoResponse, Json as JsonResponse},
    routing::{get, post},
    Router,
};
use serde_json::json;

use crate::db::{Database, Person};

pub fn create_router() -> Router {
    Router::new()
        .route("/person/:id", get(get_person))
        .route("/person", post(create_person))
}

async fn get_person(Path(id): Path<u32>) -> (StatusCode, JsonResponse<serde_json::Value>) {
    let person_result: Result<Person> = Database::get_person_by_id(id).await;

    match person_result {
        Ok(person) => {
            let person_data: Person = person;
            (StatusCode::OK, JsonResponse(json!(person_data)))
        }
        Err(err) => {
            let error_message = err.to_string();
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                JsonResponse(json!({ "error": error_message })),
            )
        }
    }
}

async fn create_person(Json(person): Json<Person>) -> impl axum::response::IntoResponse {
    let result: Result<Person> = Database::new_person(person).await;

    match result {
        Ok(created_person) => {
            (StatusCode::CREATED, JsonResponse(json!(created_person))).into_response()
        }
        Err(err) => {
            let error_message = err.to_string();
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                JsonResponse(json!({ "error": error_message })),
            )
                .into_response()
        }
    }
}
