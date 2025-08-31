#![cfg(feature = "neo4j")]
use crate::lang::graphs::{neo4j_utils::*, Neo4jGraph};
use crate::lang::graphs::{Graph, EdgeType};
use neo4rs::BoltMap;
use std::collections::HashSet;
use shared::Result;
use tracing::{info, debug};
use std::fmt::Debug;

pub struct GraphStreamingUploader {
    uploaded_nodes: HashSet<String>,
    uploaded_edges: HashSet<(String, String, EdgeType)>,
}

impl GraphStreamingUploader {
    pub fn new() -> Self {
        Self { uploaded_nodes: HashSet::new(), uploaded_edges: HashSet::new() }
    }

    pub async fn flush_stage<G: Graph + Debug>(
        &mut self,
        graph: &G,
        neo: &Neo4jGraph,
        stage: &str,
    ) -> Result<()> {
        let mut node_queries: Vec<(String, BoltMap)> = Vec::new();
        let mut new_nodes_cnt = 0usize;
        for (key, node_type, node_data) in graph.get_nodes() {
            if self.uploaded_nodes.insert(key) {
                node_queries.push(add_node_query(&node_type, &node_data));
                new_nodes_cnt += 1;
            }
        }

        if new_nodes_cnt > 0 {
            debug!(stage = stage, count = new_nodes_cnt, "stream_upload_nodes");
            neo.execute_batch(node_queries).await?;
        }

        let mut edge_specs: Vec<(String, String, EdgeType)> = Vec::new();
        let mut new_edges_cnt = 0usize;
        for triple in graph.get_edges() {
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
