use anyhow::Result;
use ast::{self, lang::Lang, repo::Repo};
use std::str::FromStr;
use ast::utils::{logger, print_json};

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    logger();

    let language = "react";
    let lang = Lang::from_str(language)?;

    let repo = Repo::new(
        "ast/examples/sphinx-tribes-frontend",
        lang,
        true,
        Vec::new(),
        Vec::new(),
    )?;
    println!("building graph...");
    let graph = repo.build_graph().await?;
    print_json(&graph, "tribes-front")?;
    Ok(())
}
