use anyhow::{Context, Result};
use ast::utils::{logger, print_json};
use ast::{self, repo::Repo};
use std::env;

/*

export REPO_URL="https://github.com/stakwork/sphinx-tribes.git,https://github.com/stakwork/sphinx-tribes-frontend.git"
export OUTPUT_FORMAT=jsonl
cargo run --bin urls

*/

#[tokio::main]
async fn main() -> Result<()> {
    logger();

    let repo_urls = env::var("REPO_URL").context("no REPO_URL")?;
    let username = env_not_empty("USERNAME");
    let pat = env_not_empty("PAT");
    let rev = env_not_empty("REV");
    let revs: Vec<String> = rev
        .map(|r| r.split(',').map(|s| s.to_string()).collect())
        .unwrap_or_default();

    let repos = Repo::new_clone_multi_detect(
        &repo_urls,
        username.clone(),
        pat.clone(),
        Vec::new(),
        revs.clone(),
    )
    .await?;

    let graph = repos.build_graphs().await?;
    print_json(&graph, "urls")?;

    Ok(())
}

fn env_not_empty(name: &str) -> Option<String> {
    // return None if it doesn't exist or is empty string
    std::env::var(name).ok().filter(|v| !v.is_empty())
}
