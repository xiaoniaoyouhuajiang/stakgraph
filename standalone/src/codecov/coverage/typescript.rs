use super::TestCoverage;
use crate::codecov::utils::{has_any_files_with_ext, parse_summary_or_final, pct};
use crate::types::{LanguageReport, Metric};
use lsp::Language;
use shared::{Error, Result};
use std::fs;
use std::path::{Path, PathBuf};

pub struct TypeScriptCoverage;

impl TypeScriptCoverage {
    fn run_cmd(repo_path: &Path, cmd: &str, args: &[&str]) -> Result<()> {
        use std::process::Command;
        let out = Command::new(cmd)
            .args(args)
            .current_dir(repo_path)
            .output()
            .map_err(|_| Error::Custom(format!("spawn failed: {}", cmd)))?;
        let cov_dir = repo_path.join("coverage");
        let _ = fs::create_dir_all(&cov_dir);
        let mut log = String::new();
        log.push_str(&format!("$ {} {}\n", cmd, args.join(" ")));
        log.push_str(&format!("exit: {:?}\n", out.status.code()));
        if !out.stdout.is_empty() {
            log.push_str("--- stdout ---\n");
            log.push_str(&String::from_utf8_lossy(&out.stdout));
        }
        if !out.stderr.is_empty() {
            log.push_str("--- stderr ---\n");
            log.push_str(&String::from_utf8_lossy(&out.stderr));
        }
        use std::io::Write;
        if let Ok(mut f) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(cov_dir.join("coverage-run.log"))
        {
            let _ = f.write_all(log.as_bytes());
        }
        if out.status.success() { Ok(()) } else { Err(Error::Custom(format!("command failed: {}", cmd))) }
    }

    fn workspace_package_paths(repo_path: &Path) -> Vec<PathBuf> {
        let mut out = Vec::new();
        let pkg_path = repo_path.join("package.json");
        let text = fs::read_to_string(&pkg_path).ok();
        if let Some(t) = text {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&t) {
                let ws = v.get("workspaces");
                let mut patterns: Vec<String> = Vec::new();
                if let Some(arr) = ws.and_then(|x| x.as_array()) {
                    for p in arr { if let Some(s) = p.as_str() { patterns.push(s.to_string()); } }
                } else if let Some(obj) = ws.and_then(|x| x.as_object()) {
                    if let Some(pkgs) = obj.get("packages").and_then(|p| p.as_array()) {
                        for ptn in pkgs { if let Some(s) = ptn.as_str() { patterns.push(s.to_string()); } }
                    }
                }
                for pat in patterns {
                    if pat.ends_with("/*") {
                        let base = pat.trim_end_matches("/*");
                        let dir = repo_path.join(base);
                        if let Ok(rd) = fs::read_dir(&dir) {
                            for entry in rd.flatten() {
                                let p = entry.path();
                                if p.is_dir() && p.join("package.json").exists() { out.push(p); }
                            }
                        }
                    } else {
                        let p = repo_path.join(&pat);
                        if p.join("package.json").exists() { out.push(p); }
                    }
                }
            }
        }
        out
    }

    fn aggregate(parts: Vec<(Option<Metric>, Option<Metric>, Option<Metric>, Option<Metric>)>) -> (Option<Metric>, Option<Metric>, Option<Metric>, Option<Metric>) {
        let mut lt=0; let mut lc=0; let mut bt=0; let mut bc=0; let mut ft=0; let mut fc=0; let mut st=0; let mut sc=0;
        for (l,b,f,s) in parts { if let Some(m)=l { lt+=m.total; lc+=m.covered; } if let Some(m)=b { bt+=m.total; bc+=m.covered; } if let Some(m)=f { ft+=m.total; fc+=m.covered; } if let Some(m)=s { st+=m.total; sc+=m.covered; } }
        let lines = if lt>0 { Some(Metric{ total: lt, covered: lc, pct: pct(lc, lt) }) } else { None };
        let branches = if bt>0 { Some(Metric{ total: bt, covered: bc, pct: pct(bc, bt) }) } else { None };
        let functions = if ft>0 { Some(Metric{ total: ft, covered: fc, pct: pct(fc, ft) }) } else { None };
        let statements = if st>0 { Some(Metric{ total: st, covered: sc, pct: pct(sc, st) }) } else { None };
        (lines, branches, functions, statements)
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
        if repo_path.join("yarn.lock").exists() { let _ = Self::run_cmd(repo_path, "yarn", &["install"]); }
        else if repo_path.join("pnpm-lock.yaml").exists() { let _ = Self::run_cmd(repo_path, "pnpm", &["install"]); }
        else if repo_path.join("package-lock.json").exists() { let _ = Self::run_cmd(repo_path, "npm", &["ci"]); }
        else { let _ = Self::run_cmd(repo_path, "npm", &["install"]); }
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
                let _ = Self::run_cmd(repo_path, "yarn", &["add", "-D", "@vitest/coverage-v8"]);
            } else if repo_path.join("pnpm-lock.yaml").exists() {
                let _ = Self::run_cmd(repo_path, "pnpm", &["add", "-D", "@vitest/coverage-v8"]);
            } else {
                let _ = Self::run_cmd(
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
        
        let workspace_dirs = Self::workspace_package_paths(repo_path);
        if !workspace_dirs.is_empty() {
            for pkg_dir in workspace_dirs.iter() {
                let pj = pkg_dir.join("package.json");
                if !pj.exists() { continue; }
                if let Ok(pv) = serde_json::from_slice::<serde_json::Value>(&fs::read(&pj)?) {
                    let w_jest = pv.get("devDependencies").and_then(|d| d.get("jest")).is_some()
                        || pv.get("dependencies").and_then(|d| d.get("jest")).is_some();
                    let w_vitest = pv.get("devDependencies").and_then(|d| d.get("vitest")).is_some()
                        || pv.get("dependencies").and_then(|d| d.get("vitest")).is_some();
                    if w_jest {
                        let args_all = ["jest","--coverage","--coverageReporters=json-summary","--all","--silent"];
                        let args_std = ["jest","--coverage","--coverageReporters=json-summary","--silent"];
                        let args: &[&str] = if std::env::var("CODECOV_FORCE_ALL").is_ok() { &args_all } else { &args_std };
                        let _ = if uses_yarn { Self::run_cmd(pkg_dir, "yarn", args) }
                            else if uses_pnpm { Self::run_cmd(pkg_dir, "pnpm", &std::iter::once(&"exec").chain(args.iter()).cloned().collect::<Vec<_>>()) }
                            else { Self::run_cmd(pkg_dir, "npx", args) };
                    } else if w_vitest {
                        let mut ran_script = false;
                        if let Some(scripts)=pv.get("scripts").and_then(|s| s.as_object()) {
                            if scripts.get("test:coverage").is_some() {
                                if uses_yarn { let _ = Self::run_cmd(pkg_dir, "yarn", &["run","test:coverage"]); }
                                else if uses_pnpm { let _ = Self::run_cmd(pkg_dir, "pnpm", &["run","test:coverage"]); }
                                else { let _ = Self::run_cmd(pkg_dir, "npm", &["run","test:coverage"]); }
                                ran_script = true;
                            }
                        }
                        if !ran_script {
                            let args = ["vitest","run","--coverage","--coverage.provider=istanbul","--coverage.reporter=json","--coverage.reporter=json-summary"];
                            let _ = if uses_yarn { Self::run_cmd(pkg_dir, "yarn", &args) }
                                else if uses_pnpm { Self::run_cmd(pkg_dir, "pnpm", &["exec","vitest","run","--coverage","--coverage.provider=istanbul","--coverage.reporter=json","--coverage.reporter=json-summary"]) }
                                else { Self::run_cmd(pkg_dir, "npx", &args) };
                        }
                    }
                }
            }
            return Ok(());
        }

        if has_jest {
            let r = if uses_yarn {
                Self::run_cmd(repo_path, "yarn", &["jest","--coverage","--coverageReporters=json-summary","--silent"]) 
            } else if uses_pnpm {
                Self::run_cmd(repo_path, "pnpm", &["exec","jest","--coverage","--coverageReporters=json-summary","--silent"]) 
            } else {
                Self::run_cmd(repo_path, "npx", &["jest","--coverage","--coverageReporters=json-summary","--silent"]) 
            };
            r?;
        } else if has_vitest {
            let scripts = pkg_json.get("scripts").and_then(|s| s.as_object());
            let mut ran_script = false;
            if let Some(scripts_obj) = scripts {
                if scripts_obj.get("test:coverage").is_some() {
                    if uses_yarn { let _ = Self::run_cmd(repo_path, "yarn", &["run","test:coverage"]); }
                    else if uses_pnpm { let _ = Self::run_cmd(repo_path, "pnpm", &["run","test:coverage"]); }
                    else { let _ = Self::run_cmd(repo_path, "npm", &["run","test:coverage"]); }
                    ran_script = true;
                }
            }
            if !ran_script {
                let args = ["vitest","run","--coverage","--coverage.provider=istanbul","--coverage.reporter=json","--coverage.reporter=json-summary"];
                if uses_yarn { let _ = Self::run_cmd(repo_path, "yarn", &args); }
                else if uses_pnpm { let _ = Self::run_cmd(repo_path, "pnpm", &["exec","vitest","run","--coverage","--coverage.provider=istanbul","--coverage.reporter=json","--coverage.reporter=json-summary"]); }
                else { let _ = Self::run_cmd(repo_path, "npx", &args); }
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


        let workspace_dirs = Self::workspace_package_paths(repo_path);
        if !workspace_dirs.is_empty() {
            let mut parts = Vec::new();
            for w in workspace_dirs.iter() { if let Ok(tuple) = parse_summary_or_final(w) { parts.push(tuple); } }
            let (l,b,f,s) = Self::aggregate(parts);
            if l.is_none() && b.is_none() && f.is_none() && s.is_none() && std::env::var("CODECOV_SECOND_PASS").is_err() {
                std::env::set_var("CODECOV_SECOND_PASS", "1");
                std::env::set_var("CODECOV_FORCE_ALL", "1");
                let _ = self.execute(repo_path);
                let mut parts2 = Vec::new();
                for w in workspace_dirs.iter() { if let Ok(tuple) = parse_summary_or_final(w) { parts2.push(tuple); } }
                let (l2,b2,f2,s2) = Self::aggregate(parts2);
                if l2.is_none() && b2.is_none() && f2.is_none() && s2.is_none() { return Ok(None); }
                return Ok(Some(LanguageReport { language: "typescript".into(), lines: l2, branches: b2, functions: f2, statements: s2 }));
            }
            if l.is_none() && b.is_none() && f.is_none() && s.is_none() { return Ok(None); }
            return Ok(Some(LanguageReport { language: "typescript".into(), lines: l, branches: b, functions: f, statements: s }));
        }

        let res = Self::parse_reports(repo_path, has_vitest, has_jest)?;
        if res.is_none() && std::env::var("CODECOV_SECOND_PASS").is_err() {
            std::env::set_var("CODECOV_SECOND_PASS", "1");
            std::env::set_var("CODECOV_FORCE_ALL", "1");
            let _ = self.execute(repo_path);
            return Self::parse_reports(repo_path, has_vitest, has_jest);
        }
        Ok(res)
    }
    fn artifact_paths(&self, repo_path: &Path) -> Vec<PathBuf> {
        let mut out: Vec<PathBuf> = Vec::new();
        for name in ["coverage-summary.json", "coverage-run.log"].iter() {
            let p = repo_path.join("coverage").join(name);
            if p.exists() { out.push(p); }
        }
      
        let workspaces = Self::workspace_package_paths(repo_path);
        for ws in workspaces.iter() {
            for name in ["coverage-summary.json", "coverage-run.log"].iter() {
                let p = ws.join("coverage").join(name);
                if p.exists() { out.push(p); }
            }
        }
        out
    }
}
