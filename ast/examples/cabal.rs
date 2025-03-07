use anyhow::Result;
use ast::utils::{logger, print_json};
use ast::{self, lang::Lang, repo::Repo, repo::Repos};
use std::str::FromStr;
/*
export LSP_SKIP_POST_CLONE=true
export DEV_SKIP_CALLS=true
RUST_LOG=info cargo run --example cabal
*/

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    logger();
    let repo1 = Repo::new(
        "ast/examples/cabal",
        Lang::from_str("ts")?,
        true,
        Vec::new(),
        Vec::new(),
    )?;
    let repo2 = Repo::new(
        "ast/examples/cabal",
        Lang::from_str("ruby")?,
        false,
        Vec::new(),
        Vec::new(),
    )?;
    // let repos = Repos(vec![repo1, repo2]);
    let repos = Repos(vec![repo2]);
    let graph = repos.build_graphs().await?;
    print_json(&graph, "cabal")?;
    Ok(())
}
