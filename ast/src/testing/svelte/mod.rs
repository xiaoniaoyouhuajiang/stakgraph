use crate::lang::graph::{EdgeType, Node, NodeType};
use crate::{lang::Lang, repo::Repo};
use std::str::FromStr;
use test_log::test;
use tracing::{debug, error, info};
use tracing_subscriber::{EnvFilter, FmtSubscriber};


#[test(tokio::test)]
async fn test_svelte() {
    let repo = Repo::new(
        "src/testing/svelte",
        Lang::from_str("svelte").unwrap(),
        false,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();



    let graph = repo.build_graph().await.unwrap();
    assert_eq!(graph.nodes.len(), 37);
    assert_eq!(graph.edges.len(), 36);

    let languages = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Language(_)))
        .collect::<Vec<_>>();
    assert_eq!(languages.len(), 1);

    let language = languages[0].into_data();
    assert_eq!(language.name, "svelte");
    assert_eq!(language.file, "src/testing/svelte/");

    let files = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::File(_)))
        .collect::<Vec<_>>();

    assert_eq!(files.len(), 4, "wrong file count");

    let imports = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Import(_)))
        .collect::<Vec<_>>();

    assert_eq!(imports.len(), 2, "wrong import count");

    let classes = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Class(_)))
        .collect::<Vec<_>>();

    assert_eq!(classes.len(), 6);

    let class = classes[0].into_data();
    assert_eq!(class.name, "<script>");

    let functions = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Function(_)))
        .collect::<Vec<_>>();
    assert_eq!(functions.len(), 22);
    let func = functions[0].into_data();
    assert_eq!(func.name, "");
    let data_models = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::DataModel(_)))
        .collect::<Vec<_>>();

    assert_eq!(data_models.len(), 0);

    let totalRequests = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Endpoint))
        .collect::<Vec<_>>();
    let request = totalRequests[0].into_data();
    assert_eq!(request.name, "/Svelte");

    assert_eq!(totalRequests.len(), 37, "wrong endpoint count");
}
