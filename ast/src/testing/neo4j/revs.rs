use crate::lang::Graph;
use crate::repo::{check_revs_files, Repo};
use crate::utils::logger;
use anyhow::{Context, Result};
use std::env;
use tracing::{debug, info};

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

    let actual_path = match &repo_path {
        Some(path) => path.clone(),
        None => {
            let first_url = repo_urls
                .as_ref()
                .ok_or_else(|| anyhow::anyhow!("no REPO_URL"))?
                .split(',')
                .next()
                .ok_or_else(|| anyhow::anyhow!("Empty REPO_URL"))?;

            Repo::get_path_from_url(first_url)?
        }
    };

    let revs = match env::var("REV").ok().filter(|v| !v.is_empty()) {
        Some(rev_str) => {
            info!("Using revisions from env: {}", rev_str);
            let revs: Vec<String> = rev_str.split(',').map(String::from).collect();
            revs
        }
        None => match Repo::get_last_revisions(&actual_path, 2) {
            Ok(revs) => revs,
            Err(_) => {
                debug!("Using default HEAD revisions");
                vec!["HEAD~1".to_string(), "HEAD".to_string()]
            }
        },
    };
    if revs.len() < 2 {
        return Err(anyhow::anyhow!(
            "Need at least two revisions for comparison"
        ));
    }

    info!("{} : {} -> {}", actual_path, revs[0], revs[1]);

    if let Some(changed_files) = check_revs_files(&actual_path, revs.clone()) {
        info!("\n==== Files changed between revisions ====");
        for file in &changed_files {
            info!("  -> {}", file);
        }
        info!("\n==== Total: {} files ====", changed_files.len());
    }

    let repo_without_filter = Repo::new_multi_detect(&actual_path, None, Vec::new(), Vec::new())
        .await
        .context("Failed to create repo without filter")?;

    let mut complete_graph = Neo4jGraph::default();
    complete_graph.connect().await?;
    complete_graph.clear();

    info!("=====Building complete graph=====");
    let complete_graph = repo_without_filter
        .build_graphs_inner::<Neo4jGraph>()
        .await
        .context("Failed to build complete graph")?;

    let (complete_nodes, complete_edges) = complete_graph.get_graph_size();
    info!(
        "Complete graph: \n {} nodes \n{} edges",
        complete_nodes, complete_edges,
    );

    let repo_with_filter = Repo::new_multi_detect(&actual_path, None, Vec::new(), revs.clone())
        .await
        .context("Failed to create repo with filter")?;

    let mut filtered_graph = Neo4jGraph::default();
    filtered_graph.connect().await?;
    filtered_graph.clear();

    info!("=====Building filtered graph with revs=====");
    let filtered_graph = repo_with_filter
        .build_graphs_inner::<Neo4jGraph>()
        .await
        .context("Failed to build filtered graph")?;

    let (filtered_nodes, filtered_edges) = filtered_graph.get_graph_size();
    info!(
        "Filtered graph: \n{} nodes \n{} edges",
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
