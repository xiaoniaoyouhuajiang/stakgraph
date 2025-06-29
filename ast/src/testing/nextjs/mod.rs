use crate::lang::graphs::{EdgeType, NodeType};
use crate::lang::{Graph, Node};
use crate::utils::get_use_lsp;
use crate::{lang::Lang, repo::Repo};
use anyhow::Result;
use std::str::FromStr;

pub async fn test_nextjs_generic<G: Graph>() -> Result<(), anyhow::Error> {
    let use_lsp = get_use_lsp() && false; // To activete LSP_SKIP_CLONE = true, helps with tsx issues
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
    assert_eq!(num_nodes, 99, "Expected 99 nodes in Next.js");
    assert_eq!(num_edges, 135, "Expected 135 edges in Next.js");

    let language_nodes = graph.find_nodes_by_type(NodeType::Language);
    assert_eq!(language_nodes.len(), 1, "Expected 1 language node");
    assert_eq!(
        language_nodes[0].name, "react",
        "Language node name should be 'tsx'"
    );

    let endpoints = graph.find_nodes_by_type(NodeType::Endpoint);
    assert_eq!(endpoints.len(), 4, "Expected 4 Endpoint nodes");

    let requests = graph.find_nodes_by_type(NodeType::Request);
    assert_eq!(requests.len(), 6, "Expected 6 Request nodes");

    let functions = graph.find_nodes_by_type(NodeType::Function);
    assert_eq!(functions.len(), 20, "Expected 20 Function nodes");

    let items_page_func = functions
        .iter()
        .find(|f| f.name == "ItemsPage")
        .map(|n| Node::new(NodeType::Function, n.clone()))
        .expect("Function 'ItemsPage' not found");

    let get_items_endpoint = endpoints
        .iter()
        .find(|e| e.name == "/api/items" && e.meta.get("verb") == Some(&"GET".to_string()))
        .map(|n| Node::new(NodeType::Endpoint, n.clone()))
        .expect("GET /api/items endpoint not found");

    let post_items_endpoint = endpoints
        .iter()
        .find(|e| e.name == "/api/items" && e.meta.get("verb") == Some(&"POST".to_string()))
        .map(|n| Node::new(NodeType::Endpoint, n.clone()))
        .expect("POST /api/items endpoint not found");

    let get_items_handler_func = functions
        .iter()
        .find(|f| f.name == "GET" && f.file.ends_with("app/api/items/route.ts"))
        .map(|n| Node::new(NodeType::Function, n.clone()))
        .expect("GET handler function for items not found");

    let post_items_handler_func = functions
        .iter()
        .find(|f| f.name == "POST" && f.file.ends_with("app/api/items/route.ts"))
        .map(|n| Node::new(NodeType::Function, n.clone()))
        .expect("POST handler function for items not found");

    let get_items_request = requests
        .iter()
        .find(|r| {
            r.name == "/api/items"
                && r.meta.get("verb") == Some(&"GET".to_string())
                && r.file.ends_with("app/items/page.tsx")
        })
        .map(|n| Node::new(NodeType::Request, n.clone()))
        .expect("GET request to /api/items not found");

    let post_items_request = requests
        .iter()
        .find(|r| {
            r.name == "/api/items"
                && r.meta.get("verb") == Some(&"POST".to_string())
                && r.file.ends_with("app/items/page.tsx")
        })
        .map(|n| Node::new(NodeType::Request, n.clone()))
        .expect("POST request to /api/items not found");

    assert!(
        graph.has_edge(
            &get_items_endpoint,
            &get_items_handler_func,
            EdgeType::Handler
        ),
        "Expected GET /api/items endpoint to be handled by GET function"
    );
    assert!(
        graph.has_edge(
            &post_items_endpoint,
            &post_items_handler_func,
            EdgeType::Handler
        ),
        "Expected POST /api/items endpoint to be handled by POST function"
    );

    assert!(
        graph.has_edge(&items_page_func, &get_items_request, EdgeType::Calls),
        "Expected ItemsPage to call the GET /api/items request"
    );
    assert!(
        graph.has_edge(&items_page_func, &post_items_request, EdgeType::Calls),
        "Expected ItemsPage to call the POST /api/items request"
    );

    assert!(
        graph.has_edge(&get_items_request, &get_items_endpoint, EdgeType::Calls),
        "Expected GET request to call the GET /api/items endpoint"
    );
    assert!(
        graph.has_edge(&post_items_request, &post_items_endpoint, EdgeType::Calls),
        "Expected POST request to call the POST /api/items endpoint"
    );
    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_nextjs() {
    use crate::lang::graphs::{ArrayGraph, BTreeMapGraph};
    test_nextjs_generic::<ArrayGraph>().await.unwrap();
    test_nextjs_generic::<BTreeMapGraph>().await.unwrap();
}
