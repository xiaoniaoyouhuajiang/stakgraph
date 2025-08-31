#![cfg(feature = "neo4j")]
use crate::lang::graphs::{neo4j_utils::*, Neo4jGraph};
use crate::lang::graphs::EdgeType;
use crate::lang::{NodeType, NodeData, Edge};
use crate::lang::graphs::Node as GraphNode;
use neo4rs::BoltMap;
use std::collections::HashSet;
use shared::Result;
use tracing::{info, debug};

pub struct GraphStreamingUploader {
    uploaded_nodes: HashSet<String>,
    uploaded_edges: HashSet<(String, String, EdgeType)>,
}

impl GraphStreamingUploader {
    pub fn new() -> Self {
        Self { uploaded_nodes: HashSet::new(), uploaded_edges: HashSet::new() }
    }

    pub async fn flush_stage(
        &mut self,
        neo: &Neo4jGraph,
        stage: &str,
        delta_nodes: &[(NodeType, NodeData)],
        delta_edges: &[Edge],
    ) -> Result<()> {
        let mut node_queries: Vec<(String, BoltMap)> = Vec::new();
        let mut new_nodes_cnt = 0usize;

        for (nt, nd) in delta_nodes.iter() {
            let key = crate::utils::create_node_key(&GraphNode::new(nt.clone(), nd.clone()));
            if self.uploaded_nodes.insert(key) {
                node_queries.push(add_node_query(nt, nd));
                new_nodes_cnt += 1;
            }
        }

        if new_nodes_cnt > 0 {
            debug!(stage = stage, count = new_nodes_cnt, "stream_upload_nodes");
            neo.execute_batch(node_queries).await?;
        }

        let mut edge_specs: Vec<(String, String, EdgeType)> = Vec::new();
        let mut new_edges_cnt = 0usize;
        for e in delta_edges.iter() {
            let s = crate::utils::create_node_key_from_ref(&e.source);
            let t = crate::utils::create_node_key_from_ref(&e.target);
            let triple = (s, t, e.edge.clone());
            if self.uploaded_edges.insert(triple.clone()) {
                edge_specs.push(triple);
                new_edges_cnt += 1;
            }
        }

        if new_edges_cnt > 0 {
            let edge_queries = build_batch_edge_queries(edge_specs.into_iter(), 256);
            debug!(stage = stage, count = new_edges_cnt, "stream_upload_edges");
            neo.execute_simple(edge_queries).await?;
        }

        if new_nodes_cnt > 0 || new_edges_cnt > 0 {
            info!(stage = stage, nodes = new_nodes_cnt, edges = new_edges_cnt, "stream_stage_flush");
        }
        Ok(())
    }
}

pub struct StreamingUploadContext {
    pub neo: Neo4jGraph,
    pub uploader: GraphStreamingUploader,
}

impl StreamingUploadContext {
    pub fn new(neo: Neo4jGraph) -> Self { Self { neo, uploader: GraphStreamingUploader::new() } }
}

use lazy_static::lazy_static;
use std::sync::Mutex;

lazy_static! {
    static ref DELTA_NODES: Mutex<Vec<(NodeType, NodeData)>> = Mutex::new(Vec::new());
    static ref DELTA_EDGES: Mutex<Vec<Edge>> = Mutex::new(Vec::new());
}

pub fn record_node(nt: &NodeType, nd: &NodeData) {
    if std::env::var("STREAM_UPLOAD").is_err() { return; }
    if let Ok(mut g) = DELTA_NODES.lock() { g.push((nt.clone(), nd.clone())); }
}
pub fn record_edge(e: &Edge) {
    if std::env::var("STREAM_UPLOAD").is_err() { return; }
    if let Ok(mut g) = DELTA_EDGES.lock() { g.push(e.clone()); }
}
pub fn drain_deltas() -> (Vec<(NodeType, NodeData)>, Vec<Edge>) {
    let mut n = DELTA_NODES.lock().unwrap();
    let mut e = DELTA_EDGES.lock().unwrap();
    (std::mem::take(&mut *n), std::mem::take(&mut *e))
}
