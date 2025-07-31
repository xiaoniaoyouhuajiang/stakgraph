use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serde JSON error: {0}")]
    SerdeJson(#[from] serde_json::Error),

    #[error("Environment variable error: {0}")]
    Env(#[from] std::env::VarError),

    #[error("Custom error: {0}")]
    Custom(String),
}
impl Error {
    pub fn custom<S: Into<String>>(msg: S) -> Self {
        Error::Custom(msg.into())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
