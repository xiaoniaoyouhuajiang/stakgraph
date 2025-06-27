use crate::lang::graphs::Graph;
use crate::lang::Node;
use crate::lang::{asg::NodeData, graphs::NodeType};
use crate::repo::{check_revs_files, Repo};
use crate::utils::create_node_key;
use anyhow::Result;
use lsp::strip_root;
use std::collections::HashSet;
use std::path::PathBuf;
use tracing::debug;

pub const MAX_FILE_SIZE: u64 = 100_000;

pub fn filter_by_revs<G: Graph>(root: &str, revs: Vec<String>, graph: G) -> G {
    if revs.is_empty() {
        return graph;
    }
    match check_revs_files(root, revs) {
        Some(final_filter) => graph.create_filtered_graph(&final_filter),
        None => graph,
    }
}

// (file, code)
pub fn fileys(files: &Vec<PathBuf>, root: &PathBuf) -> Result<Vec<(String, String)>> {
    let mut ret = Vec::new();
    for f in files {
        let filename = strip_root(&f, root).display().to_string();
        match std::fs::read_to_string(&f) {
            Ok(code) => {
                ret.push((filename, code));
            }
            Err(_) => {
                debug!("Skipping non-text file during parsing: {}", filename);
            }
        }
    }
    Ok(ret)
}

pub fn _filenamey(f: &PathBuf) -> String {
    let full = f.display().to_string();
    if !f.starts_with("/tmp/") {
        return full;
    }
    let mut parts = full.split("/").collect::<Vec<&str>>();
    parts.drain(0..4);
    parts.join("/")
}

pub fn get_page_name(path: &str) -> Option<String> {
    let parts = path.split("/").collect::<Vec<&str>>();
    if parts.last().is_none() {
        return None;
    }
    Some(parts.last().unwrap().to_string())
}

pub fn combine_imports(nodes: Vec<NodeData>) -> Vec<NodeData> {
    if nodes.is_empty() {
        return Vec::new();
    }
    let import_name = create_node_key(&Node::new(NodeType::Import, nodes[0].clone()));

    let mut seen_starts = HashSet::new();
    let mut unique_nodes = Vec::new();
    for node in nodes {
        if !seen_starts.contains(&node.start) {
            seen_starts.insert(node.start);
            unique_nodes.push(node);
        }
    }

    let mut combined_body = String::new();
    let mut current_position = unique_nodes[0].start;
    for (i, node) in unique_nodes.iter().enumerate() {
        // Add extra newlines if there's a gap between this node and the previous position
        if node.start > current_position {
            let extra_newlines = node.start - current_position;
            combined_body.push_str(&"\n".repeat(extra_newlines));
        }
        // Add the node body
        combined_body.push_str(&node.body);
        // Add a newline separator between nodes (except after the last one)
        if i < unique_nodes.len() - 1 {
            combined_body.push('\n');
            current_position = node.end + 1; // +1 for the newline we just added
        } else {
            current_position = node.end;
        }
    }
    // Use the file from the first node
    let file = if !unique_nodes.is_empty() {
        unique_nodes[0].file.clone()
    } else {
        String::new()
    };

    vec![NodeData {
        name: import_name,
        file,
        body: combined_body,
        start: unique_nodes[0].start,
        end: unique_nodes.last().unwrap().end,
        ..Default::default()
    }]
}

impl Repo {
    pub fn root_less_tmp(&self) -> String {
        let mut ret = self.root.display().to_string();
        if ret.starts_with("/tmp/") {
            ret.drain(0..5);
            ret
        } else {
            ret
        }
    }
    pub fn prepare_file_data(&self, path: &str, code: &str) -> NodeData {
        let mut file_data = NodeData::in_file(path);
        let filename = path.split('/').last().unwrap_or(path);
        file_data.name = filename.to_string();

        let skip_file_content = std::env::var("DEV_SKIP_FILE_CONTENT").is_ok();
        if !skip_file_content {
            file_data.body = code.to_string();
        }
        file_data.hash = Some(sha256::digest(&file_data.body));
        file_data
    }
    pub fn get_parent_info(&self, path: &str) -> (NodeType, String) {
        if path.contains('/') {
            let mut paths: Vec<&str> = path.split('/').collect();
            paths.pop();
            (NodeType::Directory, paths.join("/"))
        } else {
            (NodeType::Repository, "main".to_string())
        }
    }
}
