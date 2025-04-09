use crate::lang::graphs::{ArrayGraph, Node};
use anyhow::Result;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::EnvFilter;

pub fn print_json(graph: &ArrayGraph, name: &str) -> Result<()> {
    use serde_jsonlines::write_json_lines;
    match std::env::var("OUTPUT_FORMAT")
        .unwrap_or_else(|_| "json".to_string())
        .as_str()
    {
        "jsonl" => {
            let nodepath = format!("ast/examples/{}-nodes.jsonl", name);
            write_json_lines(nodepath, &graph.nodes)?;
            let edgepath = format!("ast/examples/{}-edges.jsonl", name);
            write_json_lines(edgepath, &graph.edges)?;
        }
        _ => {
            let pretty = serde_json::to_string_pretty(&graph)?;
            let path = format!("ast/examples/{}.json", name);
            std::fs::write(path, pretty)?;
        }
    }
    Ok(())
}

pub fn logger() {
    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();
    tracing_subscriber::fmt()
        .with_target(false)
        .with_env_filter(filter)
        .init();
}

pub fn create_node_key(node: Node) -> String {
    let node_type = node.node_type.to_string();
    let node_data = node.node_data;
    let name = node_data.name;
    let file = node_data.file;
    let start = node_data.start.to_string();
    let meta = node_data.meta;

    let mut parts = vec![node_type, name, file, start];
    if let Some(v) = meta.get("verb") {
        parts.push(v.clone());
    }

    let sanitized_parts: Vec<String> = parts
        .into_iter()
        .map(|part| {
            part.to_lowercase()
                .trim()
                .replace(char::is_whitespace, "")
                .replace(|c: char| !c.is_alphanumeric(), "")
        })
        .collect();

    sanitized_parts.join("-")
}
