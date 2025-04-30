#[cfg(feature = "neo4j")]
use crate::lang::graphs::{neo4j_graph::Neo4jConfig, Neo4jGraph};
use anyhow::Result;

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore]
pub async fn test_neo4j() -> Result<()> {
    let mut graph = Neo4jGraph::default();
    graph.connect().await?;

    assert!(graph.is_connected(), "Neo4j graph should be connected");

    graph.disconnect()?;
    assert!(!graph.is_connected(), "Neo4j graph should be disconnected");

    Ok(())
}
