use crate::lang::graphs::{EdgeType, NodeType};
use crate::lang::{Graph, Node};
use crate::utils::get_use_lsp;
use crate::{lang::Lang, repo::Repo};
use anyhow::Result;
use std::str::FromStr;

pub async fn test_nextjs_generic<G: Graph>() -> Result<(), anyhow::Error> {
    let use_lsp = get_use_lsp();
    let repo = Repo::new(
        "src/testing/nextjs",
        Lang::from_str("tsx").unwrap(),
        use_lsp,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();

    let graph = repo.build_graph_inner::<G>().await?;

    graph.analysis();

    let (num_nodes, num_edges) = graph.get_graph_size();
    println!(
        "Next.js graph: nodes = {}, edges = {}",
        num_nodes, num_edges
    );

    let endpoints = graph.find_nodes_by_type(NodeType::Endpoint);
    assert!(
        !endpoints.is_empty(),
        "Expected at least one Endpoint node (API route) in Next.js"
    );
    println!("Endpoints found: {}", endpoints.len());

    let requests = graph.find_nodes_by_type(NodeType::Request);
    assert!(
        !requests.is_empty(),
        "Expected at least one Request node in Next.js"
    );
    println!("Requests found: {}", requests.len());

    let mut calls_count = 0;
    for req in &requests {
        for ep in &endpoints {
            if graph.has_edge(
                &Node::new(NodeType::Request, req.clone()),
                &Node::new(NodeType::Endpoint, ep.clone()),
                EdgeType::Calls,
            ) {
                calls_count += 1;
            }
        }
    }
    assert!(
        calls_count > 0,
        "Expected at least one Calls edge between Request and Endpoint"
    );
    println!("Calls edges between Request and Endpoint: {}", calls_count);

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_nextjs() {
    use crate::lang::graphs::{ArrayGraph, BTreeMapGraph};
    test_nextjs_generic::<ArrayGraph>().await.unwrap();
    test_nextjs_generic::<BTreeMapGraph>().await.unwrap();
}
