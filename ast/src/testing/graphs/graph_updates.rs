use crate::lang::graphs::graph_ops::GraphOps;
use lsp::git::{checkout_commit, get_changed_files_between, git_pull_or_clone};

#[cfg(feature = "neo4j")]
fn clear_neo4j() {
    let mut graph_ops = GraphOps::new();
    graph_ops.connect().unwrap();
    graph_ops.clear().unwrap();
}

#[cfg(feature = "neo4j")]
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_graph_update() {
    let repo_url = "https://github.com/fayekelmith/demo.git";
    let repo_path = "/tmp/demo_repo";
    let before_commit = "6eb7f3a2e279f54af922164872263001c00ff1cc";
    let after_commit = "e462eb7b78ede0796fad30a91bec3edd580fd289";

    git_pull_or_clone(repo_url, repo_path, None, None)
        .await
        .unwrap();
    clear_neo4j();

    checkout_commit(repo_path, before_commit).await.unwrap();

    let mut graph_ops = GraphOps::new();
    graph_ops.connect().unwrap();
    graph_ops.clear().unwrap();

    let (nodes_before, edges_before) = graph_ops
        .update_full(repo_url, repo_path, before_commit)
        .unwrap();

    // --- Assert initial state ---

    checkout_commit(repo_path, after_commit).await.unwrap();

    let changed_files = get_changed_files_between(repo_path, before_commit, after_commit)
        .await
        .unwrap();

    let (nodes_after, edges_after) = graph_ops
        .update_incremental(repo_url, repo_path, after_commit, before_commit)
        .unwrap();

    // --- Assert updated state ---
}
