use crate::lang::Graph;
use anyhow::Result;
use std::fmt;
use std::io::Error;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::EnvFilter;

pub fn print_json(graph: &Graph, name: &str) -> Result<()> {
    use serde_jsonlines::write_json_lines;
    match std::env::var("OUTPUT_FORMAT")
        .unwrap_or_else(|_| "json".to_string())
        .as_str()
    {
        "jsonl" => {
            let nodepath = format!("ast/examples/{}-nodes.jsonl", name);
            write_json_lines(nodepath, &graph.nodes)?;
            let edgepath = format!("ast/examples/{}-edges.jsonl", name);
            write_json_lines(edgepath, &graph.edges)?;
        }
        _ => {
            let pretty = serde_json::to_string_pretty(&graph)?;
            let path = format!("ast/examples/{}.json", name);
            std::fs::write(path, pretty)?;
        }
    }
    Ok(())
}

pub fn logger() {
    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();
    tracing_subscriber::fmt()
        .with_target(false)
        .with_env_filter(filter)
        .init();
}

#[derive(Debug)]
pub enum TestStatus {
    Success,
    Failure,
    Skipped,
}

#[derive(Debug)]
pub struct TestResult {
    pub status: TestStatus,
    pub message: String,
    pub test_name: String,
    pub details: Option<String>,
}

impl TestResult {
    pub fn success(test_name: &str, message: &str) -> Self {
        Self {
            status: TestStatus::Success,
            message: message.to_string(),
            test_name: test_name.to_string(),
            details: None,
        }
    }

    pub fn failure(test_name: &str, message: &str, details: &str) -> Self {
        Self {
            status: TestStatus::Failure,
            message: message.to_string(),
            test_name: test_name.to_string(),
            details: Some(details.to_string()),
        }
    }

    pub fn skipped(test_name: &str, message: &str) -> Self {
        Self {
            status: TestStatus::Skipped,
            message: message.to_string(),
            test_name: test_name.to_string(),
            details: None,
        }
    }
}

impl fmt::Display for TestResult {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.status {
            TestStatus::Success => write!(f, "✅ {}: {}", self.test_name, self.message),
            TestStatus::Failure => {
                let details = self.details.as_deref().unwrap_or("");
                write!(f, "❌ {}: {} - {}", self.test_name, self.message, details)
            }
            TestStatus::Skipped => write!(f, "⏭️ {}: {}", self.test_name, self.message),
        }
    }
}

impl From<Error> for TestResult {
    fn from(err: Error) -> Self {
        TestResult::failure("Error", "An error occurred", &err.to_string())
    }
}
