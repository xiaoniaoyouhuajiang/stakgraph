use crate::lang::graph::{EdgeType, Node, NodeType};
use crate::{lang::Lang, repo::Repo};
use std::str::FromStr;

#[tokio::test]
async fn test_kotlin() {
    crate::utils::logger();


    let repo = Repo::new(
        "src/testing/kotlin",
        Lang::from_str("kotlin").unwrap(),
        false,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();


    let graph = repo.build_graph().await.unwrap();


    assert_eq!(graph.nodes.len(), 138);
    assert_eq!(graph.edges.len(), 137);


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
    assert_eq!(language_node.name, "kotlin");
    assert_eq!(normalize_path(&language_node.file), "src/testing/kotlin/");


    let build_gradle_nodes = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::File(_)) && n.into_data().name == "build.gradle.kts")
        .collect::<Vec<_>>();
    assert_eq!(build_gradle_nodes.len(), 4);
    let build_gradle_node = build_gradle_nodes[0].into_data();
    assert_eq!(build_gradle_node.name, "build.gradle.kts");


    let imports = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Library(_)))
        .collect::<Vec<_>>();
    assert_eq!(imports.len(), 88);

    let imports = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Import(_)))
        .collect::<Vec<_>>();
    assert_eq!(imports.len(), 9);


    let classes = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Class(_)))
        .collect::<Vec<_>>();
    assert_eq!(classes.len(), 6);

    let example_class = classes[0].into_data();
    assert_eq!(example_class.name, "ExampleInstrumentedTest");
    assert_eq!(
        normalize_path(&example_class.file),
        "src/testing/kotlin/app/src/androidTest/java/com/kotlintestapp/ExampleInstrumentedTest.kt"
    );


    let functions = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Function(_)))
        .collect::<Vec<_>>();
    assert_eq!(functions.len(), 0);

    // Example assertion for a specific function


    let requests = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Request(_)))
        .collect::<Vec<_>>();
    assert_eq!(requests.len(), 0);

    // Assertions for call edges
    let calls_edges = graph
        .edges
        .iter()
        .filter(|e| matches!(e.edge, EdgeType::Calls(_)))
        .collect::<Vec<_>>();
    assert_eq!(calls_edges.len(), 0);

    // Assertions for pages (if applicable)

}
