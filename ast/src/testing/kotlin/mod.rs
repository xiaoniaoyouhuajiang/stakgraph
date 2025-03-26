use crate::lang::graph::{EdgeType, Node};
use crate::{lang::Lang, repo::Repo};
use std::str::FromStr;
use test_log::test;

#[test(tokio::test)]
async fn test_kotlin() {
    let repo = Repo::new(
        "src/testing/kotlin",
        Lang::from_str("kotlin").unwrap(),
        false,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();

    let graph = repo.build_graph().await.unwrap();

    assert_eq!(graph.nodes.len(), 134);
    assert_eq!(graph.edges.len(), 133);

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
    assert_eq!(build_gradle_nodes.len(), 2);
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

    let mut classes = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::Class(_)))
        .collect::<Vec<_>>();
    assert_eq!(classes.len(), 7);

    classes.sort_by(|a, b| a.into_data().name.cmp(&b.into_data().name));

    //TODO: Remove debug print
    for c in &classes {
        println!("Classes{:?}\n\n", c);
    }

    let example_class = classes[1].into_data();
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

    let data_models = graph
        .nodes
        .iter()
        .filter(|n| matches!(n, Node::DataModel(_)))
        .collect::<Vec<_>>();
    println!("{:?}", data_models);
    assert_eq!(data_models.len(), 1);

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
