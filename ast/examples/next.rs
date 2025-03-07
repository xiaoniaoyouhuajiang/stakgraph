use anyhow::Result;
use ast::{self, lang::Lang, repo::Repo};
use std::str::FromStr;
use ast::utils::{logger, print_json};

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    let language = "react";
    let lang = Lang::from_str(language)?;
    logger();
    tracing::info!("building graph for {}...", language);
    let repo = Repo::new(
        "ast/examples/next-example/app",
        lang,
        true,
        Vec::new(),
        Vec::new(),
    )?;
    println!("building graph...");
    let graph = repo.build_graph().await?;
    print_json(&graph, "next")?;
    Ok(())
}
