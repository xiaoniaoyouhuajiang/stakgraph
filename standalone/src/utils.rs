use ast::lang::asg::NodeData;
use ast::lang::NodeType;
use shared::Result;
use std::str::FromStr;

use crate::types::{UncoveredNode, UncoveredNodeConcise, UncoveredResponse, UncoveredResponseItem};

pub fn parse_node_type(node_type: &str) -> Result<NodeType> {
    let mut chars: Vec<char> = node_type.chars().collect();
    if !chars.is_empty() {
        chars[0] = chars[0].to_uppercase().next().unwrap_or(chars[0]);
    }
    let titled_case = chars.into_iter().collect::<String>();
    NodeType::from_str(&titled_case)
}

pub fn extract_ref_id(node_data: &NodeData) -> String {
    node_data
        .meta
        .get("ref_id")
        .cloned()
        .unwrap_or_else(|| "placeholder".to_string())
}

pub fn format_node_snippet(
    node_type_str: &str,
    name: &str,
    ref_id: &str,
    weight: usize,
    file: &str,
    start: usize,
    end: usize,
    body: &str,
) -> String {
    format!(
        "<snippet>\nname: {}: {}\nref_id: {}\nweight: {}\nfile: {}\nstart: {}, end: {}\n\n{}\n</snippet>\n\n",
        node_type_str, name, ref_id, weight, file, start, end, body
    )
}

pub fn format_node_concise(node_type_str: &str, name: &str, weight: usize, file: &str) -> String {
    format!(
        "{}: {} (weight: {})\nFile: {}\n\n",
        node_type_str, name, weight, file
    )
}

pub fn create_uncovered_response_items(
    nodes: Vec<(NodeData, usize)>,
    node_type: &NodeType,
    concise: bool,
) -> Vec<UncoveredResponseItem> {
    nodes
        .into_iter()
        .map(|(node_data, weight)| {
            if concise {
                UncoveredResponseItem::Concise(UncoveredNodeConcise {
                    name: node_data.name,
                    file: node_data.file,
                    weight,
                })
            } else {
                let ref_id = extract_ref_id(&node_data);
                UncoveredResponseItem::Full(UncoveredNode {
                    node_type: node_type.to_string(),
                    ref_id,
                    weight,
                    properties: node_data,
                })
            }
        })
        .collect()
}

pub fn format_uncovered_response_as_snippet(response: &UncoveredResponse) -> String {
    let mut text = String::new();

    if let Some(ref functions) = response.functions {
        for item in functions {
            match item {
                UncoveredResponseItem::Full(node) => {
                    text.push_str(&format_node_snippet(
                        &node.node_type,
                        &node.properties.name,
                        &node.ref_id,
                        node.weight,
                        &node.properties.file,
                        node.properties.start,
                        node.properties.end,
                        &node.properties.body,
                    ));
                }
                UncoveredResponseItem::Concise(node) => {
                    text.push_str(&format_node_concise(
                        "Function",
                        &node.name,
                        node.weight,
                        &node.file,
                    ));
                }
            }
        }
    }

    if let Some(ref endpoints) = response.endpoints {
        for item in endpoints {
            match item {
                UncoveredResponseItem::Full(node) => {
                    text.push_str(&format_node_snippet(
                        &node.node_type,
                        &node.properties.name,
                        &node.ref_id,
                        node.weight,
                        &node.properties.file,
                        node.properties.start,
                        node.properties.end,
                        &node.properties.body,
                    ));
                }
                UncoveredResponseItem::Concise(node) => {
                    text.push_str(&format_node_concise(
                        "Endpoint",
                        &node.name,
                        node.weight,
                        &node.file,
                    ));
                }
            }
        }
    }

    text
}
