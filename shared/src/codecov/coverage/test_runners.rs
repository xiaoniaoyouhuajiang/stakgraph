use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub enum TestRunner {
    Vitest,
    Jest,
    Playwright,
    Cypress,
    Pytest,
    CargoTest,
    Maven,
}

#[derive(Debug, Clone)]
pub struct TestScript {
    pub name: String,
    pub runner: TestRunner,
    pub has_coverage: bool,
}

impl TestRunner {
    pub fn detect_from_package_json(scripts: &HashMap<String, String>) -> Vec<TestScript> {
        let mut test_scripts = Vec::new();
        let patterns = [
            "test:coverage",
            "test",
            "test:unit",
            "coverage",
            "test:integration",
        ];
        for script_name in patterns {
            if let Some(script_content) = scripts.get(script_name) {
                let (runner, has_cov) = Self::detect_runner_from_script(script_content);
                test_scripts.push(TestScript {
                    name: script_name.to_string(),
                    runner,
                    has_coverage: has_cov || script_name.contains("coverage"),
                });
            }
        }
        test_scripts
    }

    fn detect_runner_from_script(script: &str) -> (TestRunner, bool) {
        if script.contains("vitest") {
            (TestRunner::Vitest, script.contains("coverage"))
        } else if script.contains("jest") {
            (TestRunner::Jest, script.contains("coverage"))
        } else if script.contains("playwright") {
            (TestRunner::Playwright, false)
        } else if script.contains("cypress") {
            (TestRunner::Cypress, false)
        } else {
            (TestRunner::Jest, false)
        }
    }

    pub fn coverage_dependency(&self) -> Option<&'static str> {
        match self {
            TestRunner::Vitest => Some("@vitest/coverage-v8"),
            TestRunner::Jest => Some("@jest/globals"),
            _ => None,
        }
    }

    pub fn coverage_reporters(&self) -> Vec<&'static str> {
        match self {
            TestRunner::Vitest | TestRunner::Jest => vec!["json-summary", "json"],
            _ => vec![],
        }
    }
}
