use crate::lang::graphs::{BTreeMapGraph, Node, NodeType};
use crate::lang::{array_graph, ArrayGraph, EdgeType, Graph, Lang};
use crate::repo::Repo;
use anyhow::Result;
use std::str::FromStr;
use tracing::{debug, info};

#[derive(Clone, Debug)]
pub struct NodeCheck {
    pub node_type: NodeType,
    pub names: Vec<&'static str>,
    pub count: u32,
    pub attributes: Vec<(&'static str, &'static str)>,
}

#[derive(Clone, Debug)]
pub struct EdgeCheck {
    pub edge_type: EdgeType,
    pub source_type: NodeType,
    pub target_type: NodeType,
    pub count: u32,
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
    //graph_a.analysis();
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
    //graph_b.analysis();

    let nodes_a = graph_a.nodes;
    let nodes_b: Vec<Node> = graph_b.nodes.values().cloned().collect();

    if use_lsp_to_test {
        assert_eq!(
            nodes_a.len() as u32,
            expectations.expected_lsp_nodes.unwrap(),
            "ArrayGraph node count mismatch"
        );
        assert_eq!(
            nodes_b.len() as u32,
            expectations.expected_lsp_nodes.unwrap(),
            "BTreeMapGraph node count mismatch"
        );
    } else {
        assert_eq!(
            nodes_a.len() as u32,
            expectations.expected_nodes,
            "ArrayGraph node count mismatch"
        );
        assert_eq!(
            nodes_b.len() as u32,
            expectations.expected_nodes,
            "BTreeMapGraph node count mismatch"
        );
    }

    let edges_a = graph_a.edges;

    let edges_b = graph_b.edges;

    if use_lsp_to_test {
        assert_eq!(
            edges_a.len() as u32,
            expectations.expected_lsp_edges.unwrap(),
            "ArrayGraph edge count mismatch"
        );
        assert_eq!(
            edges_b.len() as u32,
            expectations.expected_lsp_edges.unwrap(),
            "BTreeMapGraph edge count mismatch"
        );
    } else {
        assert_eq!(
            edges_a.len() as u32,
            expectations.expected_edges,
            "ArrayGraph edge count mismatch"
        );
        assert_eq!(
            edges_b.len() as u32,
            expectations.expected_edges,
            "BTreeMapGraph edge count mismatch"
        );
    }

    let nodes = if use_lsp_to_test && expectations.lsp_nodes.is_some() {
        expectations.lsp_nodes.as_ref().unwrap()
    } else {
        &expectations.nodes
    };

    for NodeCheck {
        node_type,
        names,
        count: _,
        attributes: _,
    } in nodes
    {
        for name in names {
            let found_in_array_graph = array_graph.find_nodes_by_name(node_type.clone(), name);
            assert!(
                found_in_array_graph[0].name == name.to_string(),
                "ArrayGraph: Node {} of type {:?} not found",
                name,
                node_type
            );
            let found_in_btree_map_graph =
                btree_map_graph.find_nodes_by_name(node_type.clone(), name);
            assert!(
                found_in_btree_map_graph[0].name == name.to_string(),
                "BTreeMapGraph: Node {} of type {:?} not found",
                name,
                node_type
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
        specific_pairs,
    } in edges
    {
        let array_edges_count = array_graph.count_edges_of_type(edge_type.clone());

        let btree_edges_count = btree_map_graph.count_edges_of_type(edge_type.clone());

        assert_eq!(
            array_edges_count as u32, *count,
            "ArrayGraph: Expected {} edges of type {:?}, found {}",
            count, edge_type, array_edges_count
        );

        assert_eq!(
            btree_edges_count as u32, *count,
            "BTreeMapGraph: Expected {} edges of type {:?}, found {}",
            count, edge_type, btree_edges_count
        );

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
                "ArrayGraph: edge {} -> {} of type {:?} not found",
                source_name,
                target_name,
                edge_type
            );
            let found_in_btree_map_graph = btree_map_graph.find_nodes_with_edge_type(
                source_type.clone(),
                target_type.clone(),
                edge_type.clone(),
            );
            assert!(
                found_in_btree_map_graph.iter().any(|edge| {
                    println!(
                        "{:?} -> {:?} vs {:?} -> {:?}",
                        edge.0.name, edge.1.name, source_name, target_name
                    );
                    edge.0.name == source_name.to_string() && edge.1.name == target_name.to_string()
                }),
                "BTreeMapGraph:  edge {} -> {} of type {:?} not found",
                source_name,
                target_name,
                edge_type
            );
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
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["go.mod"],
                    count: 1,
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Class,
                    names: vec!["database"],
                    count: 1,
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::DataModel,
                    names: vec!["Person"],
                    count: 1,
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Endpoint,
                    names: vec!["/person", "/person/{id}"],
                    count: 2,
                    attributes: vec![],
                },
            ],
            edges: vec![EdgeCheck {
                edge_type: EdgeType::Handler,
                source_type: NodeType::Endpoint,
                target_type: NodeType::Function,
                count: 2,
                specific_pairs: vec![], //TODO: Add Enpoints and Handler
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
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::File,
                    names: vec!["package.json"],
                    count: 1,
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Function,
                    names: vec!["App", "FormContainer", "FormTitle"],
                    count: 11,
                    attributes: vec![],
                },
                NodeCheck {
                    node_type: NodeType::Page,
                    names: vec!["/people", "/new-person"],
                    count: 2,
                    attributes: vec![("renders", "App")],
                },
            ],
            edges: vec![EdgeCheck {
                edge_type: EdgeType::Renders,
                source_type: NodeType::Page,
                target_type: NodeType::Function,
                count: 2,
                specific_pairs: vec![("/people", "People"), ("/new-person", "NewPerson")],
            }],
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "angular",
            repo_path: "src/testing/angular",
            expected_nodes: 76,
            expected_edges: 78,
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "kotlin",
            repo_path: "src/testing/kotlin",
            expected_nodes: 115,
            expected_edges: 125,
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "swift",
            repo_path: "src/testing/swift",
            expected_nodes: 55,
            expected_edges: 81,
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "python",
            repo_path: "src/testing/python",
            expected_nodes: 61,
            expected_edges: 78,
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "svelte",
            repo_path: "src/testing/svelte",
            expected_nodes: 43,
            expected_edges: 42,
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "ruby",
            repo_path: "src/testing/ruby",
            expected_nodes: 55,
            expected_edges: 79,
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "java",
            repo_path: "src/testing/java",
            expected_nodes: 37,
            expected_edges: 42,
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "typescript",
            repo_path: "src/testing/typescript",
            expected_nodes: 42,
            expected_edges: 47,
            expected_lsp_nodes: Some(45),
            expected_lsp_edges: Some(52),
            ..Default::default()
        },
        GraphTestExpectations {
            lang_id: "rust",
            repo_path: "src/testing/rust",
            expected_nodes: 44,
            expected_edges: 56,
            ..Default::default()
        },
    ]
}
