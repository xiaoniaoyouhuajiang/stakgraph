use crate::lang::Graph;
use crate::repo::{check_revs_files, Repo};
use crate::utils::logger;
use anyhow::{Context, Result};
use std::env;
use tracing::info;

#[cfg(feature = "neo4j")]
use crate::lang::graphs::Neo4jGraph;

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_neo4j_revs() -> Result<()> {
    logger();

    let repo_path = env::var("REPO_PATH").ok();
    let repo_urls = env::var("REPO_URL").ok();
    if repo_path.is_none() && repo_urls.is_none() {
        return Err(anyhow::anyhow!("no REPO_PATH or REPO_URL"));
    }

    let revs = vec![
        "cd62bfc822e2ece669b193de0918c023c83bb219".to_string(),
        "de154e3a28b971d9465df25bbf54a0e595352162".to_string(),
    ];

    println!("Using revisions: {} -> {}", revs[0], revs[1]);

    if let Some(repo_path) = &repo_path {
        if let Some(changed_files) = check_revs_files(repo_path, revs.clone()) {
            info!("\n--- Files changed between revisions ---");
            for file in &changed_files {
                println!("  • {}", file);
            }
            info!("--- Total: {} files ---\n", changed_files.len());
        } else {
            info!("\n❗ No files changed between revisions or couldn't determine changes\n");
        }
    }
    let no_revs: Vec<String> = Vec::new();

    let repo_without_filter = if let Some(repo_path) = &repo_path {
        Repo::new_multi_detect(repo_path, None, Vec::new(), no_revs)
            .await
            .context("Failed to create repo without filter")?
    } else {
        let username = env_var_if_exists("USERNAME");
        let pat = env_var_if_exists("PAT");
        let repo_urls = repo_urls.as_ref().context("no REPO_URL")?;

        Repo::new_clone_multi_detect(repo_urls, username, pat, Vec::new(), no_revs)
            .await
            .context("Failed to create repo without filter")?
    };

    let mut complete_graph = Neo4jGraph::default();
    complete_graph.connect().await?;
    complete_graph.clear();

    println!("Building complete graph...");
    let complete_graph = repo_without_filter
        .build_graphs_inner::<Neo4jGraph>()
        .await
        .context("Failed to build complete graph")?;

    let (complete_nodes, complete_edges) = complete_graph.get_graph_size();
    println!(
        "Complete graph has {} nodes and {} edges",
        complete_nodes, complete_edges
    );

    let repo_with_filter = if let Some(repo_path) = &repo_path {
        Repo::new_multi_detect(repo_path, None, Vec::new(), revs.clone())
            .await
            .context("Failed to create repo with filter")?
    } else {
        let username = env_var_if_exists("USERNAME");
        let pat = env_var_if_exists("PAT");
        let repo_urls = repo_urls.as_ref().context("no REPO_URL")?;

        Repo::new_clone_multi_detect(repo_urls, username, pat, Vec::new(), revs.clone())
            .await
            .context("Failed to create repo with filter")?
    };

    let mut filtered_graph = Neo4jGraph::default();
    filtered_graph.connect().await?;
    filtered_graph.clear();

    println!("Building filtered graph with revs...");
    let filtered_graph = repo_with_filter
        .build_graphs_inner::<Neo4jGraph>()
        .await
        .context("Failed to build filtered graph")?;

    let (filtered_nodes, filtered_edges) = filtered_graph.get_graph_size();
    println!(
        "Filtered graph has {} nodes and {} edges",
        filtered_nodes, filtered_edges
    );

    assert!(
        filtered_nodes <= complete_nodes,
        "Expected filtered graph to have fewer or equal nodes, but found {} vs {}",
        filtered_nodes,
        complete_nodes
    );

    Ok(())
}

fn env_var_if_exists(name: &str) -> Option<String> {
    env::var(name).ok().filter(|v| !v.is_empty())
}
