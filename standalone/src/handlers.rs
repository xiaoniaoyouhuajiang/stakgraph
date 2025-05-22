use crate::types::{AppError, ProcessResponse, Result};
#[cfg(feature = "neo4j")]
use ast::lang::graphs::graph_ops::GraphOps;
use ast::repo::Repo;
use axum::Json;
pub async fn process() -> Result<Json<ProcessResponse>> {
    let repo_path = env_not_empty("REPO_PATH");
    let repo_url = env_not_empty("REPO_URL");
    let username = env_not_empty("USERNAME");
    let pat = env_not_empty("PAT");

    if repo_path.is_none() && repo_url.is_none() {
        return Err(AppError::Anyhow(anyhow::anyhow!(
            "Neither REPO_PATH nor REPO_URL is set in the environment"
        )));
    }

    let (final_repo_path, final_repo_url, need_clone) = if let Some(path) = repo_path {
        (path, repo_url.unwrap_or_default(), false)
    } else {
        let url = repo_url.unwrap();
        let tmp_path = Repo::get_path_from_url(&url)?;
        (tmp_path, url, true)
    };

    let username_clone = username.clone();
    let pat_clone = pat.clone();
    let result = tokio::task::spawn_blocking(move || {
        #[cfg(feature = "neo4j")]
        {
            use ast::lang::Graph;
            use futures::executor::block_on;
            use lsp::git::{get_commit_hash, git_pull_or_clone};
            use tracing::info;

            if need_clone {
                info!(
                    "Cloning or Pulling repo from {} to {}",
                    final_repo_url, final_repo_path
                );
                if let Err(e) = block_on(git_pull_or_clone(
                    &final_repo_url,
                    &final_repo_path,
                    username_clone,
                    pat_clone,
                )) {
                    return Err(AppError::Anyhow(anyhow::anyhow!(
                        "Git pull or clone failed : {}",
                        e
                    )));
                }
            }

            let repo_path = &final_repo_path;
            let repo_url = &final_repo_url;

            let current_hash = match block_on(get_commit_hash(&repo_path)) {
                Ok(hash) => hash,
                Err(e) => {
                    return Err(AppError::Anyhow(anyhow::anyhow!(
                        "Could not get current hash: {}",
                        e
                    )))
                }
            };

            let mut graph_ops = GraphOps::new();
            graph_ops.connect()?;

            let stored_hash = match graph_ops.graph.get_repository_hash(&repo_url) {
                Ok(hash) => Some(hash),
                Err(_) => None,
            };

            info!(
                "Current hash: {} | Stored hash: {:?}",
                current_hash, stored_hash
            );

            if let Some(hash) = &stored_hash {
                if hash == &current_hash {
                    let (nodes, edges) = graph_ops.graph.get_graph_size();
                    return Ok(ProcessResponse {
                        status: "success".to_string(),
                        message: "Repository already processed".to_string(),
                        nodes: nodes as usize,
                        edges: edges as usize,
                    });
                }
            }

            let (nodes, edges) = if let Some(hash) = stored_hash {
                info!("Updating repository hash from {} to {}", hash, current_hash);
                graph_ops.update_incremental(&repo_url, &repo_path, &current_hash, &hash)?
            } else {
                info!("Adding new repository hash: {}", current_hash);
                graph_ops.update_full(&repo_url, &repo_path, &current_hash)?
            };

            Ok(ProcessResponse {
                status: "success".to_string(),
                message: "Repository processed successfully".to_string(),
                nodes: nodes as usize,
                edges: edges as usize,
            })
        }
        #[cfg(not(feature = "neo4j"))]
        {
            Err(AppError::Anyhow(anyhow::anyhow!(
                "Neo4j feature is not enabled"
            )))
        }
    })
    .await
    .map_err(|e| AppError::Anyhow(anyhow::anyhow!("An error occured: {}", e)))?;

    Ok(Json(result?))
}

pub async fn clear_graph() -> Result<Json<ProcessResponse>> {
    #[cfg(feature = "neo4j")]
    {
        let mut graph_ops = GraphOps::new();
        graph_ops.connect()?;
        let (nodes, edges) = graph_ops.clear()?;
        Ok(Json(ProcessResponse {
            status: "success".to_string(),
            message: "Graph cleared".to_string(),
            nodes: nodes as usize,
            edges: edges as usize,
        }))
    }
    #[cfg(not(feature = "neo4j"))]
    {
        Err(AppError::Anyhow(anyhow::anyhow!(
            "Neo4j feature is not enabled"
        )))
    }
}

pub async fn ingest() -> Result<Json<ProcessResponse>> {
    let repo_path = env_not_empty("REPO_PATH");
    let repo_url = env_not_empty("REPO_URL");
    let username = env_not_empty("USERNAME");
    let pat = env_not_empty("PAT");

    if repo_path.is_none() && repo_url.is_none() {
        return Err(AppError::Anyhow(anyhow::anyhow!(
            "Neither REPO_PATH nor REPO_URL is set in the environment"
        )));
    }

    let (final_repo_path, final_repo_url, need_clone) = if let Some(path) = repo_path {
        (path, repo_url.unwrap_or_default(), false)
    } else {
        let url = repo_url.unwrap();
        let tmp_path = Repo::get_path_from_url(&url)?;
        (tmp_path, url, true)
    };

    let username_clone = username.clone();
    let pat_clone = pat.clone();

    let result = tokio::task::spawn_blocking(move || {
        #[cfg(feature = "neo4j")]
        {
            use ast::lang::Graph;
            use futures::executor::block_on;
            use lsp::git::{get_commit_hash, git_pull_or_clone};
            use tracing::info;

            if need_clone {
                info!(
                    "Cloning or Pulling repo from {} to {}",
                    final_repo_url, final_repo_path
                );
                if let Err(e) = block_on(git_pull_or_clone(
                    &final_repo_url,
                    &final_repo_path,
                    username_clone,
                    pat_clone,
                )) {
                    return Err(AppError::Anyhow(anyhow::anyhow!(
                        "Git pull or clone failed : {}",
                        e
                    )));
                }
            }

            let repo_path = &final_repo_path;
            let repo_url = &final_repo_url;

            let current_hash = match block_on(get_commit_hash(&repo_path)) {
                Ok(hash) => hash,
                Err(e) => {
                    return Err(AppError::Anyhow(anyhow::anyhow!(
                        "Could not get current hash: {}",
                        e
                    )))
                }
            };

            let mut graph_ops = GraphOps::new();
            graph_ops.connect()?;

            let (nodes, edges) = graph_ops.update_full(&repo_url, &repo_path, &current_hash)?;

            Ok(ProcessResponse {
                status: "success".to_string(),
                message: "Repository ingested fully".to_string(),
                nodes: nodes as usize,
                edges: edges as usize,
            })
        }
        #[cfg(not(feature = "neo4j"))]
        {
            Err(AppError::Anyhow(anyhow::anyhow!(
                "Neo4j feature is not enabled"
            )))
        }
    })
    .await
    .map_err(|e| AppError::Anyhow(anyhow::anyhow!("An error occured: {}", e)))?;

    Ok(Json(result?))
}

fn env_not_empty(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.is_empty())
}
