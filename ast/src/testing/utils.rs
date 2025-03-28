use std::fmt;
use std::io::Error;

#[derive(Debug)]
#[allow(dead_code)]
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
    pub fn _success(test_name: &str, message: &str) -> Self {
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

    pub fn _skipped(test_name: &str, message: &str) -> Self {
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

impl From<anyhow::Error> for TestResult {
    fn from(err: anyhow::Error) -> Self {
        TestResult::failure("Error", "An error occurred", &err.to_string())
    }
}
