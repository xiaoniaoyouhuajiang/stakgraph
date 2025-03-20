use crate::db::{Database, Person};
use actix_web::{get, post, web, HttpResponse, Responder};
use serde_json::json;

#[get("/person/{id}")]
async fn get_person(path: web::Path<u32>) -> impl Responder {
    let id = path.into_inner();

    match Database::get_person_by_id(id).await {
        Ok(person) => HttpResponse::Ok().json(person),
        Err(err) => {
            let error_message = err.to_string();
            HttpResponse::InternalServerError().json(json!({ "error": error_message}))
        }
    }
}

#[post("/person")]
async fn create_person(person: web::Json<Person>) -> impl Responder {
    match Database::new_person(person.into_inner()).await {
        Ok(created_person) => HttpResponse::Created().json(created_person),
        Err(err) => {
            let error_message = err.to_string();
            HttpResponse::InternalServerError().json(json!({ "error": error_message}))
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_person).service(create_person);
}
