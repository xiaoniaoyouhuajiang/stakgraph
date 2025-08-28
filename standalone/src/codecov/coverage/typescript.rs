use super::TestCoverage;
use crate::codecov::utils::{has_any_files_with_ext, parse_summary_or_final};
use crate::types::LanguageReport;
use lsp::Language;
use shared::{Error, Result};
use std::fs;
use std::path::{Path, PathBuf};

pub struct TypeScriptCoverage;

impl TypeScriptCoverage {
    fn run_cmd(repo_path: &Path, cmd: &str, args: &[&str]) -> Option<()> {
        use std::process::Command;
        let out = Command::new(cmd)
            .args(args)
            .current_dir(repo_path)
            .output()
            .ok()?;
        if out.status.success() { Some(()) } else { None }
    }

    fn parse_reports(
        repo_path: &Path,
        vitest: bool,
        jest: bool,
    ) -> Result<Option<LanguageReport>> {
        let (lines, branches, functions, statements) = parse_summary_or_final(repo_path)?;
        let empty = lines.is_none()
            && branches.is_none()
            && functions.is_none()
            && statements.is_none();
        if empty { return Ok(None); }

        let label = match (vitest, jest) {
            (true, false) => "typescript(vitest)",
            (false, true) => "typescript(jest)",
            _ => "typescript",
        };

        Ok(Some(LanguageReport {
            language: label.into(),
            lines,
            branches,
            functions,
            statements,
        }))
    }
}

impl TestCoverage for TypeScriptCoverage {
    fn name(&self) -> &'static str { "typescript" }
    fn detect(&self, repo_path: &Path) -> bool {
        let pkg = repo_path.join("package.json");
        if !pkg.exists() { return false; }
        has_any_files_with_ext(repo_path, &Language::Typescript.exts()).unwrap_or(false)
    }

    fn needs_install(&self, repo_path: &Path) -> bool {
        !repo_path.join("node_modules").exists() && std::env::var("CODECOV_SKIP_INSTALL").is_err()
    }
    fn install(&self, repo_path: &Path) -> Result<()> {
        if repo_path.join("yarn.lock").exists() {
            Self::run_cmd(repo_path, "yarn", &["install"]);
        } else if repo_path.join("pnpm-lock.yaml").exists() {
            Self::run_cmd(repo_path, "pnpm", &["install"]);
        } else if repo_path.join("package-lock.json").exists() {
            Self::run_cmd(repo_path, "npm", &["ci"]);
        } else {
            Self::run_cmd(repo_path, "npm", &["install"]);
        }
        Ok(())
    }
    fn prepare(&self, repo_path: &Path) -> Result<()> {
        let pkg = repo_path.join("package.json");
        if !pkg.exists() { return Ok(()); }

        let pkg_json: serde_json::Value = serde_json::from_slice(&fs::read(&pkg)?)?;
        let has_jest = pkg_json
            .get("devDependencies")
            .and_then(|d| d.get("jest"))
            .is_some()
            || pkg_json
                .get("dependencies")
                .and_then(|d| d.get("jest"))
                .is_some();
        let has_vitest = pkg_json
            .get("devDependencies")
            .and_then(|d| d.get("vitest"))
            .is_some()
            || pkg_json
                .get("dependencies")
                .and_then(|d| d.get("vitest"))
                .is_some();

        if !has_jest && !has_vitest {
            return Err(Error::Custom("no jest/vitest detected".into()));
        }

        let vitest_plugin_missing = has_vitest
            && !has_jest
            && !repo_path.join("node_modules/@vitest/coverage-v8").exists();
        if vitest_plugin_missing {
            if repo_path.join("yarn.lock").exists() {
                Self::run_cmd(repo_path, "yarn", &["add", "-D", "@vitest/coverage-v8"]);
            } else if repo_path.join("pnpm-lock.yaml").exists() {
                Self::run_cmd(repo_path, "pnpm", &["add", "-D", "@vitest/coverage-v8"]);
            } else {
                Self::run_cmd(
                    repo_path,
                    "npm",
                    &["install", "--save-dev", "@vitest/coverage-v8"],
                );
            }
        }
        Ok(())
    }
    fn has_existing_coverage(&self, repo_path: &Path) -> bool {
        repo_path.join("coverage/coverage-summary.json").exists()
            || repo_path.join("coverage/coverage-final.json").exists()
    }
    fn execute(&self, repo_path: &Path) -> Result<()> {
        let pkg = repo_path.join("package.json");
        if !pkg.exists() { return Ok(()); }

        let pkg_json: serde_json::Value = serde_json::from_slice(&fs::read(&pkg)?)?;
        let has_jest = pkg_json
            .get("devDependencies")
            .and_then(|d| d.get("jest"))
            .is_some()
            || pkg_json
                .get("dependencies")
                .and_then(|d| d.get("jest"))
                .is_some();
        let has_vitest = pkg_json
            .get("devDependencies")
            .and_then(|d| d.get("vitest"))
            .is_some()
            || pkg_json
                .get("dependencies")
                .and_then(|d| d.get("vitest"))
                .is_some();

        let uses_yarn = repo_path.join("yarn.lock").exists();
        let uses_pnpm = repo_path.join("pnpm-lock.yaml").exists();

        if has_jest {
            let r = if uses_yarn {
                Self::run_cmd(
                    repo_path,
                    "yarn",
                    &["jest", "--coverage", "--coverageReporters=json-summary", "--silent"],
                )
            } else if uses_pnpm {
                Self::run_cmd(
                    repo_path,
                    "pnpm",
                    &[
                        "exec",
                        "jest",
                        "--coverage",
                        "--coverageReporters=json-summary",
                        "--silent",
                    ],
                )
            } else {
                Self::run_cmd(
                    repo_path,
                    "npx",
                    &["jest", "--coverage", "--coverageReporters=json-summary", "--silent"],
                )
            };
            if r.is_none() {
                return Err(Error::Custom("jest spawn failed".into()));
            }
        } else if has_vitest {
            let scripts = pkg_json.get("scripts").and_then(|s| s.as_object());
            let mut ran_script = false;
            if let Some(scripts_obj) = scripts {
                if scripts_obj.get("test:coverage").is_some() {
                    if uses_yarn {
                        Self::run_cmd(repo_path, "yarn", &["run", "test:coverage"]);
                    } else if uses_pnpm {
                        Self::run_cmd(repo_path, "pnpm", &["run", "test:coverage"]);
                    } else {
                        Self::run_cmd(repo_path, "npm", &["run", "test:coverage"]);
                    }
                    ran_script = true;
                }
            }
            if !ran_script {
                if uses_yarn {
                    Self::run_cmd(
                        repo_path,
                        "yarn",
                        &[
                            "vitest",
                            "run",
                            "--coverage",
                            "--coverage.provider=v8",
                            "--coverage.reporter=json-summary",
                        ],
                    );
                } else if uses_pnpm {
                    Self::run_cmd(
                        repo_path,
                        "pnpm",
                        &[
                            "exec",
                            "vitest",
                            "run",
                            "--coverage",
                            "--coverage.provider=v8",
                            "--coverage.reporter=json-summary",
                        ],
                    );
                } else {
                    Self::run_cmd(
                        repo_path,
                        "npx",
                        &[
                            "vitest",
                            "run",
                            "--coverage",
                            "--coverage.provider=v8",
                            "--coverage.reporter=json-summary",
                        ],
                    );
                }
            }
        }
        Ok(())
    }
    fn parse(&self, repo_path: &Path) -> Result<Option<LanguageReport>> {
        let pkg = repo_path.join("package.json");
        if !pkg.exists() { return Ok(None); }

        let pkg_json: serde_json::Value = serde_json::from_slice(&fs::read(&pkg)?)?;
        let has_jest = pkg_json
            .get("devDependencies")
            .and_then(|d| d.get("jest"))
            .is_some()
            || pkg_json
                .get("dependencies")
                .and_then(|d| d.get("jest"))
                .is_some();
        let has_vitest = pkg_json
            .get("devDependencies")
            .and_then(|d| d.get("vitest"))
            .is_some()
            || pkg_json
                .get("dependencies")
                .and_then(|d| d.get("vitest"))
                .is_some();

        Self::parse_reports(repo_path, has_vitest, has_jest)
    }
    fn artifact_paths(&self, repo_path: &Path) -> Vec<PathBuf> {
        let cov_dir = repo_path.join("coverage");
        [
            "coverage-summary.json",
            "coverage-final.json",
            "coverage-run.log",
        ]
        .into_iter()
        .map(|name| cov_dir.join(name))
        .filter(|p| p.exists())
        .collect()
    }
}
