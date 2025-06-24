use anyhow::Result;
use ast::utils::{logger, print_json};
use ast::{self, repo::Repo};

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    logger();

    let url = "https://github.com/campsite/campsite";
    let repos = Repo::new_clone_multi_detect(url, None, None, Vec::new(), Vec::new(), None).await?;
    let graph = repos.build_graphs().await?;

    print_json(&graph, "campsite")?;
    Ok(())
}
