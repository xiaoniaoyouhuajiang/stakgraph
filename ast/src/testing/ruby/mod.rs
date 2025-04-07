use crate::lang::graph::{EdgeType, NodeType};
use crate::{lang::Lang, repo::Repo};
use std::str::FromStr;
use test_log::test;

#[test(tokio::test)]
async fn test_ruby() {
    let repo = Repo::new(
        "src/testing/ruby",
        Lang::from_str("ruby").unwrap(),
        false,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();
    let graph = repo.build_graph().await.unwrap();

    assert!(graph.nodes.len() == 54);
    assert!(graph.edges.len() == 78);

    let lang = graph
        .nodes
        .iter()
        .filter(|n| matches!(n.node_type, NodeType::Language))
        .collect::<Vec<_>>();
    assert_eq!(lang.len(), 1);
    let l = lang[0].into_data();
    assert_eq!(l.name, "ruby");
    assert_eq!(l.file, "src/testing/ruby/");

    let pkg_file = graph
        .nodes
        .iter()
        .filter(|n| matches!(n.node_type, NodeType::File) && n.into_data().name == "Gemfile")
        .collect::<Vec<_>>();
    assert_eq!(pkg_file.len(), 1);
    let pkg_file = pkg_file[0].into_data();
    assert_eq!(pkg_file.name, "Gemfile");

    let endpoints = graph
        .nodes
        .iter()
        .filter(|n| matches!(n.node_type, NodeType::Endpoint))
        .collect::<Vec<_>>();
    println!("My endpoints:{:#?}", endpoints);
    assert_eq!(endpoints.len(), 6);

    let endpoint = endpoints[0].into_data();
    assert_eq!(endpoint.name, "person/:id");
    assert_eq!(endpoint.file, "src/testing/ruby/config/routes.rb");
    assert_eq!(endpoint.meta.get("verb").unwrap(), "GET");

    let endpoint = endpoints[1].into_data();
    assert_eq!(endpoint.name, "person");
    assert_eq!(endpoint.file, "src/testing/ruby/config/routes.rb");
    assert_eq!(endpoint.meta.get("verb").unwrap(), "POST");

    let endpoint = endpoints[2].into_data();
    assert_eq!(endpoint.name, "/people/:id");
    assert_eq!(endpoint.file, "src/testing/ruby/config/routes.rb");
    assert_eq!(endpoint.meta.get("verb").unwrap(), "DELETE");

    let endpoint = endpoints[3].into_data();
    assert_eq!(endpoint.name, "/people/articles");
    assert_eq!(endpoint.file, "src/testing/ruby/config/routes.rb");
    assert_eq!(endpoint.meta.get("verb").unwrap(), "GET");

    let endpoint = endpoints[4].into_data();
    assert_eq!(endpoint.name, "/people/articles");
    assert_eq!(endpoint.file, "src/testing/ruby/config/routes.rb");
    assert_eq!(endpoint.meta.get("verb").unwrap(), "POST");

    let endpoint = endpoints[5].into_data();
    assert_eq!(endpoint.name, "/countries/:country_id/process");
    assert_eq!(endpoint.file, "src/testing/ruby/config/routes.rb");
    assert_eq!(endpoint.meta.get("verb").unwrap(), "POST");

    let edges = graph
        .edges
        .iter()
        .filter(|e| matches!(e.edge, EdgeType::Handler))
        .collect::<Vec<_>>();
    assert_eq!(edges.len(), 6);
}
