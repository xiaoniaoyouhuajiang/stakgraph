use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serde JSON error: {0}")]
    SerdeJson(#[from] serde_json::Error),

    #[error("Environment variable error: {0}")]
    Env(#[from] std::env::VarError),

    #[error("Regex error: {0}")]
    Regex(#[from] regex::Error),

    #[error("Neo4j error: {0}")]
    Neo4j(#[from] neo4rs::Error),

    #[error("Tokio oneshot receive error: {0}")]
    Recv(#[from] tokio::sync::oneshot::error::RecvError),

    #[error("LSP error: {0}")]
    Lsp(#[from] async_lsp::Error),

    #[error("UTF-8 error: {0}")]
    Utf8(#[from] std::str::Utf8Error),

    #[error("Git URL parse error: {0}")]
    GitUrlParse(#[from] git_url_parse::GitUrlParseError),

    #[error("git2 error: {0}")]
    Git2(#[from] git2::Error),

    #[error("Walkdir error: {0}")]
    Walkdir(#[from] walkdir::Error),

    #[error("Tree-sitter language error: {0}")]
    TreeSitterLanguage(#[from] tree_sitter::LanguageError),

    #[error("Error : {0}")]
    Custom(String),
}
impl Error {
    pub fn custom<S: Into<String>>(msg: S) -> Self {
        Error::Custom(msg.into())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
pub trait Context<T> {
    fn context(self, msg: &str) -> Result<T>;
}

impl<T> Context<T> for Option<T> {
    fn context(self, msg: &str) -> Result<T> {
        self.ok_or_else(|| Error::Custom(msg.to_string()))
    }
}

impl<T, E: std::fmt::Display> Context<T> for std::result::Result<T, E> {
    fn context(self, msg: &str) -> Result<T> {
        self.map_err(|e| Error::Custom(format!("{msg}: {e}")))
    }
}
