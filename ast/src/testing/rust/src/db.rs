use crate::model::Person;
use anyhow::{Context, Result};
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::sync::OnceLock;

pub struct Database {
    pool: Pool<Sqlite>,
}

static DB_INSTANCE: OnceLock<Database> = OnceLock::new();

async fn get_db() -> &'static Database {
    DB_INSTANCE.get().expect("Database not initialized")
}

pub async fn init_db() -> Result<()> {
    let database_url = "sqlite::memory:";
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .context("failed to connect to database")?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL
    )"#,
    )
    .execute(&pool)
    .await
    .context("failed to create table")?;

    let db = Database { pool };

    if DB_INSTANCE.get().is_none() {
        if let Err(_) = DB_INSTANCE.set(db) {
            return Err(anyhow::anyhow!("Database already initialized"));
        }
    }

    Ok(())
}

impl Database {
    async fn new_person_impl(&self, person: Person) -> Result<Person> {
        let id = sqlx::query("INSERT INTO people (name, email) VALUES (?, ?)")
            .bind(&person.name)
            .bind(&person.email)
            .execute(&self.pool)
            .await?
            .last_insert_rowid();

        let result: Person = Person {
            id: Some(id as i32),
            name: person.name,
            email: person.email,
        };

        Ok(result)
    }

    async fn get_person_by_id_impl(&self, id: u32) -> Result<Person> {
        let person: Person =
            sqlx::query_as::<_, Person>("SELECT id, name, email FROM people WHERE id = ?")
                .bind(id as i32)
                .fetch_one(&self.pool)
                .await
                .context("Person not found")?;

        Ok(person)
    }

    pub async fn new_person(person: Person) -> Result<Person> {
        get_db().await.new_person_impl(person).await
    }
    pub async fn get_person_by_id(id: u32) -> Result<Person> {
        let result: Result<Person> = get_db().await.get_person_by_id_impl(id).await;
        result
    }
}
