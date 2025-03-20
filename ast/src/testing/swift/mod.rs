use crate::lang::graph::{EdgeType, Node};
use crate::{lang::Lang, repo::Repo};
use std::str::FromStr;
use test_log::test;

#[test(tokio::test)]
async fn test_swift() {
    let repo = Repo::new(
        "src/testing/swift",
        Lang::from_str("swift").unwrap(),
        false,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();


    let graph = repo.build_graph().await.unwrap();


    assert_eq!(graph.nodes.len(), 528);
    assert_eq!(graph.edges.len(), 527);


    fn normalize_path(path: &str) -> String {
        path.replace("\\", "/")
    }


    let language_nodes = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Language(_)))
        .collect::<Vec<_>>();
    assert_eq!(language_nodes.len(), 1);
    let language_node = language_nodes[0].into_data();
    assert_eq!(language_node.name, "swift");
    assert_eq!(normalize_path(&language_node.file), "src/testing/swift/");


    let podfile_nodes = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::File(_)) && n.into_data().name == "Podfile")
        .collect::<Vec<_>>();
    assert_eq!(podfile_nodes.len(), 2);
    let podfile_node = podfile_nodes[0].into_data();
    assert_eq!(podfile_node.name, "Podfile");


    let imports = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Library(_)))
        .collect::<Vec<_>>();
    assert_eq!(imports.len(), 0);


    let imports = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Import(_)))
        .collect::<Vec<_>>();
    assert_eq!(imports.len(), 67);


    let classes = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Class(_)))
        .collect::<Vec<_>>();
    assert_eq!(classes.len(), 184);

    // Ensure the first class node is what you expect
    let example_class = classes[0].into_data();
    assert_eq!(example_class.name, "AFInfo");
    assert_eq!(
        normalize_path(&example_class.file),
        "src/testing/swift/Pods/Alamofire/Source/Alamofire.swift"
    );


    let functions = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Function(_)))
        .collect::<Vec<_>>();
    assert_eq!(functions.len(), 0);


    let requests = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Request(_)))
        .collect::<Vec<_>>();
    assert_eq!(requests.len(), 0);


    let calls_edges = graph
        .edges
        .iter()
        .filter(|e| matches!(e.edge, EdgeType::Calls(_)))
        .collect::<Vec<_>>();
    assert_eq!(calls_edges.len(), 0);

    // Optionally, assertions for other types of edges or relationships
}
