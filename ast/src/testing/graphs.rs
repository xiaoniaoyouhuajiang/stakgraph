use crate::lang::graphs::{BTreeMapGraph, NodeType};
use crate::lang::{ArrayGraph, EdgeType, Graph, Lang};
use crate::repo::Repo;
use crate::testing::test_backend::normalize_path;
use anyhow::Result;
use std::collections::HashSet;
use std::str::FromStr;
use std::vec;
use tracing::{debug, info};

#[derive(Clone, Debug)]
pub struct NodeCheck {
    pub node_type: NodeType,
    pub names: Vec<&'static str>,
    pub count: u32,
    pub lsp_count: Option<u32>,
    pub attributes: Vec<(&'static str, &'static str)>,
}

#[derive(Clone, Debug)]
pub struct EdgeCheck {
    pub edge_type: EdgeType,
    pub source_type: NodeType,
    pub target_type: NodeType,
    pub count: u32,
    pub lsp_count: Option<u32>,
    pub specific_pairs: Vec<(&'static str, &'static str)>, // for specific edges
}

pub struct GraphTestExpectations {
    pub lang_id: &'static str,
    pub repo_path: &'static str,
    pub expected_nodes: u32,
    pub expected_edges: u32,
    pub expected_lsp_nodes: Option<u32>,
    pub expected_lsp_edges: Option<u32>,
    pub edges: Vec<EdgeCheck>,
    pub lsp_edges: Option<Vec<EdgeCheck>>,
    pub nodes: Vec<NodeCheck>,
    pub lsp_nodes: Option<Vec<NodeCheck>>,
}

impl Default for GraphTestExpectations {
    fn default() -> Self {
        GraphTestExpectations {
            lang_id: "",
            repo_path: "",
            expected_nodes: 0,
            expected_edges: 0,
            expected_lsp_nodes: None,
            expected_lsp_edges: None,
            edges: Vec::new(),
            lsp_edges: None,
            nodes: Vec::new(),
            lsp_nodes: None,
        }
    }
}
pub async fn run_graph_similarity_test(
    expectations: &GraphTestExpectations,
    use_lsp: bool,
) -> Result<()> {
    let use_lsp_to_test = use_lsp
        && expectations.expected_lsp_edges.is_some()
        && expectations.expected_lsp_nodes.is_some();

    let lang = Lang::from_str(expectations.lang_id).unwrap();
    let repo_a = Repo::new(
        expectations.repo_path,
        lang,
        use_lsp_to_test,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();
    let graph_a = repo_a.build_graph_inner::<ArrayGraph>().await?;
    info!("ArrayGraph Analysis for {}", expectations.lang_id);
    let array_graph = graph_a.clone();

    let lang = Lang::from_str(expectations.lang_id).unwrap();
    let repo_b = Repo::new(
        expectations.repo_path,
        lang,
        use_lsp_to_test,
        Vec::new(),
        Vec::new(),
    )
    .unwrap();
    let graph_b = repo_b.build_graph_inner::<BTreeMapGraph>().await?;
    let btree_map_graph = graph_b.clone();

    info!("BTreeMapGraph Analysis for {}", expectations.lang_id);

    if use_lsp_to_test {
        assert_eq!(
            array_graph.nodes.len() as u32,
            expectations.expected_lsp_nodes.unwrap(),
            "ArrayGraph node count mismatch"
        );
        assert_eq!(
            btree_map_graph.nodes.len() as u32,
            expectations.expected_lsp_nodes.unwrap(),
            "BTreeMapGraph node count mismatch"
        );
        assert_eq!(
            array_graph.edges.len() as u32,
            expectations.expected_lsp_edges.unwrap(),
            "ArrayGraph edge count mismatch"
        );
        assert_eq!(
            btree_map_graph.edges.len() as u32,
            expectations.expected_lsp_edges.unwrap(),
            "BTreeMapGraph edge count mismatch"
        );
    } else {
        assert_eq!(
            array_graph.nodes.len() as u32,
            expectations.expected_nodes,
            "ArrayGraph node count mismatch"
        );
        assert_eq!(
            array_graph.nodes.len() as u32,
            expectations.expected_nodes,
            "BTreeMapGraph node count mismatch"
        );
        assert_eq!(
            array_graph.edges.len() as u32,
            expectations.expected_edges,
            "ArrayGraph edge count mismatch"
        );

        assert_eq!(
            array_graph.edges.len() as u32,
            expectations.expected_edges,
            "BTreeMapGraph edge count mismatch"
        );
    }

    //Graph difference
    let (array_graph_nodes, array_graph_edges) = array_graph.get_graph_keys();
    let (btree_map_graph_nodes, btree_map_graph_edges) = btree_map_graph.get_graph_keys();

    let nodes_only_in_array_graph: HashSet<_> = array_graph_nodes
        .difference(&btree_map_graph_nodes)
        .collect();
    let nodes_only_in_btree_map_graph: HashSet<_> = btree_map_graph_nodes
        .difference(&array_graph_nodes)
        .collect();

    let edges_only_in_array_graph: HashSet<_> = array_graph_edges
        .difference(&btree_map_graph_edges)
        .collect();
    let edges_only_in_btree_map_graph: HashSet<_> = btree_map_graph_edges
        .difference(&array_graph_edges)
        .collect();

    if !nodes_only_in_array_graph.is_empty() {
        debug!("Nodes only in ArrayGraph: {:#?}", nodes_only_in_array_graph);
        debug!(
            "Nodes only in BTreeMapGraph: {:#?}",
            nodes_only_in_btree_map_graph
        );
    }
    if !edges_only_in_array_graph.is_empty() {
        debug!("Edges only in ArrayGraph: {:#?}", edges_only_in_array_graph);
        debug!(
            "Edges only in BTreeMapGraph: {:#?}",
            edges_only_in_btree_map_graph
        );
    }

    if use_lsp_to_test {
        assert_eq!(
            array_graph.edges.len() as u32,
            expectations.expected_lsp_edges.unwrap(),
            "ArrayGraph edge count mismatch"
        );
        assert_eq!(
            btree_map_graph.edges.len() as u32,
            expectations.expected_lsp_edges.unwrap(),
            "BTreeMapGraph edge count mismatch"
        );
    } else {
        assert_eq!(
            array_graph.edges.len() as u32,
            expectations.expected_edges,
            "ArrayGraph edge count mismatch"
        );
        assert_eq!(
            array_graph.edges.len() as u32,
            expectations.expected_edges,
            "BTreeMapGraph edge count mismatch"
        );
    }

    let nodes = if use_lsp_to_test && expectations.lsp_nodes.is_some() {
        expectations.lsp_nodes.as_ref().unwrap()
    } else {
        &expectations.nodes
    };
    //array_graph.analysis();
    //btree_map_graph.analysis();
    for NodeCheck {
        node_type,
        names,
        count,
        lsp_count,
        attributes: _,
    } in nodes
    {
        let nodes_count_array_graph = array_graph.find_nodes_by_type(node_type.clone()).len();
        let nodes_count_btree_map_graph =
            btree_map_graph.find_nodes_by_type(node_type.clone()).len();

        if use_lsp_to_test {
            assert_eq!(
                nodes_count_array_graph as u32,
                lsp_count.unwrap() as u32,
                "ArrayGraph: Expected {} nodes of type {:?}, found {} for {}",
                lsp_count.unwrap(),
                node_type,
                nodes_count_array_graph,
                expectations.lang_id
            );
            assert_eq!(
                nodes_count_btree_map_graph as u32,
                lsp_count.unwrap() as u32,
                "BTreeMapGraph: Expected {} nodes of type {:?}, found {} for {}",
                lsp_count.unwrap(),
                node_type,
                nodes_count_btree_map_graph,
                expectations.lang_id
            );
        } else {
            assert_eq!(
                nodes_count_array_graph as u32, *count,
                "ArrayGraph: Expected {} nodes of type {:?}, found {} for {}",
                count, node_type, nodes_count_array_graph, expectations.lang_id
            );
            assert_eq!(
                nodes_count_btree_map_graph as u32, *count,
                "BTreeMapGraph: Expected {} nodes of type {:?}, found {} for {}",
                count, node_type, nodes_count_btree_map_graph, expectations.lang_id
            );
        }

        for name in names {
            let found_in_array_graph = array_graph.find_nodes_by_name(node_type.clone(), name);
            assert!(
                found_in_array_graph[0].name == name.to_string(),
                "ArrayGraph: Node {} of type {:?} not found for {}",
                name,
                node_type,
                expectations.lang_id
            );
            let found_in_btree_map_graph =
                btree_map_graph.find_nodes_by_name(node_type.clone(), name);
            assert!(
                found_in_btree_map_graph[0].name == name.to_string(),
                "BTreeMapGraph: Node {} of type {:?} not found for {}",
                name,
                node_type,
                expectations.lang_id
            );
        }
    }

    let edges = if use_lsp_to_test && expectations.lsp_edges.is_some() {
        expectations.lsp_edges.as_ref().unwrap()
    } else {
        &expectations.edges
    };

    for EdgeCheck {
        edge_type,
        source_type,
        target_type,
        count,
        lsp_count,
        specific_pairs,
    } in edges
    {
        let array_edges_count = array_graph.count_edges_of_type(edge_type.clone());

        let btree_edges_count = btree_map_graph.count_edges_of_type(edge_type.clone());

        if use_lsp_to_test {
            assert_eq!(
                array_edges_count as u32,
                lsp_count.unwrap() as u32,
                "ArrayGraph: Expected {} edges of type {:?}, found {} for {}",
                lsp_count.unwrap(),
                edge_type,
                array_edges_count,
                expectations.lang_id
            );
            assert_eq!(
                btree_edges_count as u32,
                lsp_count.unwrap() as u32,
                "BTreeMapGraph: Expected {} edges of type {:?}, found {} for {}",
                lsp_count.unwrap(),
                edge_type,
                btree_edges_count,
                expectations.lang_id
            );
        } else {
            assert_eq!(
                array_edges_count as u32, *count,
                "ArrayGraph: Expected {} edges of type {:?}, found {} for {}",
                count, edge_type, array_edges_count, expectations.lang_id
            );
            assert_eq!(
                btree_edges_count as u32, *count,
                "BTreeMapGraph: Expected {} edges of type {:?}, found {} for {}",
                count, edge_type, btree_edges_count, expectations.lang_id
            );
        }

        if !use_lsp_to_test {
            for (source_name, target_name) in specific_pairs {
                let found_in_array_graph = array_graph.find_nodes_with_edge_type(
                    source_type.clone(),
                    target_type.clone(),
                    edge_type.clone(),
                );

                assert!(
                    found_in_array_graph
                        .iter()
                        .any(|edge| edge.0.name == source_name.to_string()
                            && edge.1.name == target_name.to_string()),
                    "ArrayGraph: edge {} -> {} of type {:?} not found for {}",
                    source_name,
                    target_name,
                    edge_type,
                    expectations.lang_id
                );
                let found_in_btree_map_graph = btree_map_graph.find_nodes_with_edge_type(
                    source_type.clone(),
                    target_type.clone(),
                    edge_type.clone(),
                );
                assert!(
                    found_in_btree_map_graph.iter().any(|(source, target)| {
                        let src_matches = if *source_type == NodeType::Endpoint {
                            normalize_path(&source.name) == normalize_path(source_name)
                        } else {
                            source.name == source_name.to_string()
                        };
                        src_matches && target.name == target_name.to_string()
                    }),
                    "BTreeMapGraph:  edge {} -> {} of type {:?} not found for {}",
                    source_name,
                    target_name,
                    edge_type,
                    expectations.lang_id
                );
            }
        }
    }

    Ok(())
}

pub fn get_test_expectations() -> Vec<GraphTestExpectations> {
    vec![
        GraphTestExpectations {
            lang_id: "go",
            repo_path: "src/testing/go",
            expected_nodes: 30,
            expected_edges: 48,
            expected_lsp_nodes: Some(64),
            expected_lsp_edges: Some(108),
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["go"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["go.mod"],
                    count: 4,
                    lsp_count: Some(4),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec!["database"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Endpoint,
                    names: vec!["/person", "/person/{id}"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![],
                },
            ],
            edges: vec![EdgeCheck {
                edge_type: EdgeType::Handler,
                source_type: NodeType::Endpoint,
                target_type: NodeType::Function,
                count: 2,
                lsp_count: Some(2),
                specific_pairs: vec![("/person/{id}", "GetPerson"), ("/person", "CreatePerson")],
            }],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "react",
            repo_path: "src/testing/react",
            expected_nodes: 56,
            expected_edges: 68,
            expected_lsp_nodes: Some(62),
            expected_lsp_edges: Some(84),
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["react"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["package.json"],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["App", "FormContainer", "FormTitle"],
                    count: 11,
                    lsp_count: Some(17),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Page,
                    names: vec!["/people", "/new-person"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![("renders", "App")],
                },
            ],
            edges: vec![EdgeCheck {
                edge_type: EdgeType::Renders,
                source_type: NodeType::Page,
                target_type: NodeType::Function,
                count: 2,
                lsp_count: Some(2),
                specific_pairs: vec![("/people", "People"), ("/new-person", "NewPerson")],
            }],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "angular",
            repo_path: "src/testing/angular",
            expected_nodes: 76,
            expected_edges: 78,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["angular"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["package.json"],
                    count: 12,
                    lsp_count: Some(12),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec![],
                    count: 5,
                    lsp_count: Some(5),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["constructor"],
                    count: 8,
                    lsp_count: Some(8),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Request,
                    names: vec![],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![("verb", "GET")],
                },
            ],
            edges: vec![EdgeCheck {
                edge_type: EdgeType::Calls(Default::default()),
                source_type: NodeType::Function,
                target_type: NodeType::Function,
                count: 8,
                lsp_count: Some(8),
                specific_pairs: vec![],
            }],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "kotlin",
            repo_path: "src/testing/kotlin",
            expected_nodes: 115,
            expected_edges: 125,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["kotlin"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["build.gradle.kts"],
                    count: 13,
                    lsp_count: Some(13),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Library,
                    names: vec![],
                    count: 44,
                    lsp_count: Some(44),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Import,
                    names: vec![],
                    count: 9,
                    lsp_count: Some(9),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec!["MainActivity", "ExampleInstrumentedTest"],
                    count: 6,
                    lsp_count: Some(6),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["onCreate", "useAppContext"],
                    count: 19,
                    lsp_count: Some(19),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Request,
                    names: vec!["/people", "/person"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![("verb", "GET")],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Class,
                    count: 112,
                    lsp_count: Some(112),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Calls(Default::default()),
                    source_type: NodeType::Function,
                    target_type: NodeType::Function,
                    count: 13,
                    lsp_count: Some(13),
                    specific_pairs: vec![],
                },
            ],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "swift",
            repo_path: "src/testing/swift",
            expected_nodes: 55,
            expected_edges: 81,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["swift"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["Podfile"],
                    count: 8,
                    lsp_count: Some(8),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec![],
                    count: 8,
                    lsp_count: Some(8),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Import,
                    names: vec![],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec!["API"],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["application"],
                    count: 26,
                    lsp_count: Some(26),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Request,
                    names: vec!["/people"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![("verb", "GET")],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Class,
                    count: 53,
                    lsp_count: Some(53),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Calls(Default::default()),
                    source_type: NodeType::Function,
                    target_type: NodeType::Function,
                    count: 2,
                    lsp_count: Some(2),
                    specific_pairs: vec![],
                },
            ],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "python",
            repo_path: "src/testing/python",
            expected_nodes: 61,
            expected_edges: 78,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["python"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["requirements.txt"],
                    count: 16,
                    lsp_count: Some(16),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec!["Person"],
                    count: 3,
                    lsp_count: Some(3),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec![],
                    count: 16,
                    lsp_count: Some(16),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 3,
                    lsp_count: Some(3),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Endpoint,
                    names: vec![],
                    count: 6,
                    lsp_count: Some(6),
                    attributes: vec![("verb", "GET")],
                },
                NodeCheck {
                    node_type: NodeType::Import,
                    names: vec![],
                    count: 12,
                    lsp_count: Some(12),
                    attributes: vec![],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Class,
                    count: 60,
                    lsp_count: Some(60),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Calls(Default::default()),
                    source_type: NodeType::Function,
                    target_type: NodeType::Function,
                    count: 12,
                    lsp_count: Some(12),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Handler,
                    source_type: NodeType::Endpoint,
                    target_type: NodeType::Function,
                    count: 4,
                    lsp_count: Some(4),
                    specific_pairs: vec![("/person/<int:id>", "get_person")],
                },
            ],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "svelte",
            repo_path: "src/testing/svelte",
            expected_nodes: 43,
            expected_edges: 42,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["svelte"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["package.json"],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Import,
                    names: vec![],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec![],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["addPerson"],
                    count: 6,
                    lsp_count: Some(6),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 13,
                    lsp_count: Some(13),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Request,
                    names: vec!["fetchPeople"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Function,
                    count: 41,
                    lsp_count: Some(41),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Calls(Default::default()),
                    source_type: NodeType::Function,
                    target_type: NodeType::Function,
                    count: 1,
                    lsp_count: Some(1),
                    specific_pairs: vec![],
                },
            ],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "ruby",
            repo_path: "src/testing/ruby",
            expected_nodes: 55,
            expected_edges: 79,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["ruby"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["Gemfile", "routes.rb"],
                    count: 15,
                    lsp_count: Some(15),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec![],
                    count: 12,
                    lsp_count: Some(12),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec![],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Endpoint,
                    names: vec![
                        "person/:id",
                        "person",
                        "/people/:id",
                        "/people/articles",
                        "/people/:id/articles",
                        "/countries/:country_id/process",
                    ],
                    count: 6,
                    lsp_count: Some(6),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["people"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Class,
                    count: 55,
                    lsp_count: Some(55),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::Class,
                    target_type: NodeType::Function,
                    count: 55,
                    lsp_count: Some(55),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Handler,
                    source_type: NodeType::Endpoint,
                    target_type: NodeType::Function,
                    count: 6,
                    lsp_count: Some(6),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Calls(Default::default()),
                    source_type: NodeType::Function,
                    target_type: NodeType::Function,
                    count: 4,
                    lsp_count: Some(4),
                    specific_pairs: vec![],
                },
            ],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "java",
            repo_path: "src/testing/java",
            expected_nodes: 37,
            expected_edges: 42,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["java"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["pom.xml"],
                    count: 5,
                    lsp_count: Some(5),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec!["PersonController", "Person"],
                    count: 3,
                    lsp_count: Some(3),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["getPerson", "createPerson", "main"],
                    count: 11,
                    lsp_count: Some(11),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Import,
                    names: vec![],
                    count: 4,
                    lsp_count: Some(4),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Endpoint,
                    names: vec!["/person", "/person/{id}"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![("verb", "GET")],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Class,
                    count: 38,
                    lsp_count: Some(38),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::Class,
                    target_type: NodeType::Function,
                    count: 38,
                    lsp_count: Some(38),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Calls(Default::default()),
                    source_type: NodeType::Function,
                    target_type: NodeType::Function,
                    count: 2,
                    lsp_count: Some(2),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Handler,
                    source_type: NodeType::Endpoint,
                    target_type: NodeType::Function,
                    count: 2,
                    lsp_count: Some(2),
                    specific_pairs: vec![
                        ("/person", "createPerson"),
                        ("/person/{id}", "getPerson"),
                    ],
                },
            ],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "typescript",
            repo_path: "src/testing/typescript",
            expected_nodes: 42,
            expected_edges: 47,
            expected_lsp_nodes: Some(45),
            expected_lsp_edges: Some(52),
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["typescript"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["package.json"],
                    count: 6,
                    lsp_count: Some(6),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Import,
                    names: vec![],
                    count: 5,
                    lsp_count: Some(5),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec![],
                    count: 6,
                    lsp_count: Some(9),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec!["SequelizePerson"],
                    count: 5,
                    lsp_count: Some(5),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["SequelizePerson", "TypeORMPerson"],
                    count: 4,
                    lsp_count: Some(4),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Endpoint,
                    names: vec!["/person", "/person/:id"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![("verb", "GET")],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Function,
                    count: 43,
                    lsp_count: Some(43),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Calls(Default::default()),
                    source_type: NodeType::Function,
                    target_type: NodeType::Function,
                    count: 2,
                    lsp_count: Some(2),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::Class,
                    target_type: NodeType::Function,
                    count: 43,
                    lsp_count: Some(43),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Handler,
                    source_type: NodeType::Endpoint,
                    target_type: NodeType::Function,
                    count: 2,
                    lsp_count: Some(2),
                    specific_pairs: vec![("/person", "createPerson"), ("/person/:id", "getPerson")],
                },
            ],
            lsp_nodes: Some(vec![]),
            lsp_edges: Some(vec![]),
        },
        GraphTestExpectations {
            lang_id: "rust",
            repo_path: "src/testing/rust",
            expected_nodes: 44,
            expected_edges: 56,
            nodes: vec![
                NodeCheck {
                    node_type: NodeType::Language,
                    names: vec!["rust"],
                    count: 1,
                    lsp_count: Some(1),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["Cargo.toml"],
                    count: 7,
                    lsp_count: Some(7),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Import,
                    names: vec![],
                    count: 5,
                    lsp_count: Some(5),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["main"],
                    count: 19,
                    lsp_count: Some(19),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 2,
                    lsp_count: Some(2),
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Endpoint,
                    names: vec!["/person", "/person/{id}"],
                    count: 6,
                    lsp_count: Some(6),
                    attributes: vec![("verb", "GET")],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec![],
                    count: 0,
                    lsp_count: Some(0),
                    attributes: vec![],
                },
            ],
            edges: vec![
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::Function,
                    count: 50,
                    lsp_count: Some(50),
                    specific_pairs: vec![],
                },
                EdgeCheck {
                    edge_type: EdgeType::Handler,
                    source_type: NodeType::Endpoint,
                    target_type: NodeType::Function,
                    count: 6,
                    lsp_count: Some(6),
                    specific_pairs: vec![
                        ("/person", "create_person"),
                        ("/person/{id}", "get_person"),
                    ],
                },
                EdgeCheck {
                    edge_type: EdgeType::Contains,
                    source_type: NodeType::File,
                    target_type: NodeType::DataModel,
                    count: 50,
                    lsp_count: Some(50),
                    specific_pairs: vec![],
                },
            ],
            ..Default::default()
        },
    ]
}
