use crate::utils::create_node_key;
use anyhow::Result;
use lazy_static::lazy_static;
use neo4rs::{query, BoltMap, BoltType, ConfigBuilder, Graph as Neo4jConnection};
use std::sync::{Arc, Once};
use tracing::{debug, info};

use super::*;

lazy_static! {
    static ref CONNECTION: tokio::sync::Mutex<Option<Arc<Neo4jConnection>>> =
        tokio::sync::Mutex::new(None);
    static ref INIT: Once = Once::new();
}

const DATA_BANK: &str = "Data_Bank";

pub struct Neo4jConnectionManager;

impl Neo4jConnectionManager {
    pub async fn initialize(uri: &str, username: &str, password: &str) -> Result<()> {
        let mut conn_guard = CONNECTION.lock().await;
        if conn_guard.is_some() {
            return Ok(());
        }

        info!("Connecting to Neo4j at {}", uri);
        let config = ConfigBuilder::new()
            .uri(uri)
            .user(username)
            .password(password)
            .build()?;

        match Neo4jConnection::connect(config).await {
            Ok(connection) => {
                info!("Successfully connected to Neo4j");
                *conn_guard = Some(Arc::new(connection));
                Ok(())
            }
            Err(e) => Err(anyhow::anyhow!("Failed to connect to Neo4j: {}", e)),
        }
    }

    pub async fn get_connection() -> Option<Arc<Neo4jConnection>> {
        CONNECTION.lock().await.clone()
    }

    pub async fn clear_connection() {
        let mut conn = CONNECTION.lock().await;
        *conn = None;
    }
    pub async fn initialize_from_env() -> Result<()> {
        let uri =
            std::env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://localhost:7687".to_string());
        let username = std::env::var("NEO4J_USERNAME").unwrap_or_else(|_| "neo4j".to_string());
        let password = std::env::var("NEO4J_PASSWORD").unwrap_or_else(|_| "testtest".to_string());

        Self::initialize(&uri, &username, &password).await
    }
}

pub struct NodeQueryBuilder {
    node_type: NodeType,
    node_data: NodeData,
}

impl NodeQueryBuilder {
    pub fn new(node_type: &NodeType, node_data: &NodeData) -> Self {
        Self {
            node_type: node_type.clone(),
            node_data: node_data.clone(),
        }
    }

    pub fn build(&self) -> (String, BoltMap) {
        let mut bolt_map: BoltMap = (&self.node_data).into();

        let ref_id = if std::env::var("TEST_REF_ID").is_ok() {
            "test_ref_id".to_string()
        } else {
            uuid::Uuid::new_v4().to_string()
        };
        bolt_map.value.insert("ref_id".into(), ref_id.into());

        let node_key = create_node_key(&Node::new(self.node_type.clone(), self.node_data.clone()));
        bolt_map.value.insert("node_key".into(), node_key.into());

        let query = format!(
            "MERGE (node:{}:{} {{node_key: $node_key}})
            ON CREATE SET node += $bolt_map
            ON MATCH SET node += $bolt_map
            Return node",
            self.node_type.to_string(),
            DATA_BANK,
        );

        (query, bolt_map)
    }
}
pub struct EdgeQueryBuilder {
    edge: Edge,
}

impl EdgeQueryBuilder {
    pub fn new(edge: &Edge) -> Self {
        Self { edge: edge.clone() }
    }

    pub fn build_params(&self) -> BoltMap {
        let mut params = BoltMap::new();

        boltmap_insert_str(&mut params, "source_name", &self.edge.source.node_data.name);
        boltmap_insert_str(&mut params, "source_file", &self.edge.source.node_data.file);
        boltmap_insert_int(
            &mut params,
            "source_start",
            self.edge.source.node_data.start as i64,
        );

        if let Some(verb) = &self.edge.source.node_data.verb {
            boltmap_insert_str(&mut params, "source_verb", &verb);
        }

        boltmap_insert_str(&mut params, "target_name", &self.edge.target.node_data.name);
        boltmap_insert_str(&mut params, "target_file", &self.edge.target.node_data.file);
        boltmap_insert_int(
            &mut params,
            "target_start",
            self.edge.target.node_data.start as i64,
        );
        if let Some(verb) = &self.edge.target.node_data.verb {
            boltmap_insert_str(&mut params, "target_verb", &verb);
        }

        params
    }

    pub fn build(&self) -> (String, BoltMap) {
        let params = self.build_params();

        let rel_type = self.edge.edge.to_string();
        let source_type = self.edge.source.node_type.to_string();
        let target_type = self.edge.target.node_type.to_string();

        let query = format!(
            "MATCH (source:{} {{name: $source_name, file: $source_file}}), \
                       (target:{} {{name: $target_name, file: $target_file}}) \
                 MERGE (source)-[r:{}]->(target)",
            source_type, target_type, rel_type
        );
        (query, params)
    }
}
pub async fn execute_batch(conn: &Neo4jConnection, queries: Vec<(String, BoltMap)>) -> Result<()> {
    let mut txn = conn.start_txn().await?;

    for (i, (query_str, params)) in queries.iter().enumerate() {
        let mut query_obj = query(&query_str);
        for (k, v) in params.value.iter() {
            query_obj = query_obj.param(k.value.as_str(), v.clone());
        }

        if let Err(e) = txn.run(query_obj).await {
            println!("Neo4j query #{} {} failed: {}", i, query_str, e);
            txn.rollback().await?;
            return Err(anyhow::anyhow!("Neo4j batch query error: {}", e));
        }
    }

    txn.commit().await?;
    Ok(())
}
pub struct TransactionManager<'a> {
    conn: &'a Neo4jConnection,
    queries: Vec<(String, BoltMap)>,
}

impl<'a> TransactionManager<'a> {
    pub fn new(conn: &'a Neo4jConnection) -> Self {
        Self {
            conn,
            queries: Vec::new(),
        }
    }

    pub fn add_query(&mut self, query: (String, BoltMap)) -> &mut Self {
        self.queries.push(query);
        self
    }

    pub fn add_node(&mut self, node_type: &NodeType, node_data: &NodeData) -> &mut Self {
        self.queries.push(add_node_query(node_type, node_data));
        self
    }

    pub fn add_edge(&mut self, edge: &Edge) -> &mut Self {
        self.queries.push(add_edge_query(edge));
        self
    }

    pub async fn execute(self) -> Result<()> {
        let mut txn = self.conn.start_txn().await?;
        for (query_str, bolt_map) in self.queries {
            let mut query_obj = query(&query_str);
            for (k, v) in bolt_map.value {
                query_obj = query_obj.param(k.value.as_str(), v);
            }
            txn.run(query_obj).await?;
        }
        txn.commit().await?;
        Ok(())
    }
}

pub fn add_node_query(node_type: &NodeType, node_data: &NodeData) -> (String, BoltMap) {
    NodeQueryBuilder::new(node_type, node_data).build()
}

pub fn add_edge_query(edge: &Edge) -> (String, BoltMap) {
    EdgeQueryBuilder::new(edge).build()
}

pub async fn execute_node_query(
    conn: &Neo4jConnection,
    query_str: String,
    params: BoltMap,
) -> Result<Vec<NodeData>> {
    let mut query_obj = query(&query_str);
    for (key, value) in params.value.iter() {
        query_obj = query_obj.param(key.value.as_str(), value.clone());
    }
    match conn.execute(query_obj).await {
        Ok(mut result) => {
            let mut nodes = Vec::new();
            while let Some(row) = result.next().await? {
                if let Ok(node) = row.get::<neo4rs::Node>("n") {
                    if let Ok(node_data) = NodeData::try_from(&node) {
                        nodes.push(node_data);
                    }
                }
            }
            Ok(nodes)
        }
        Err(e) => {
            debug!("Error executing query: {}", e);
            Ok(vec![])
        }
    }
}

pub fn count_nodes_edges_query() -> String {
    "MATCH (n) 
     WITH COUNT(n) as nodes
     MATCH ()-[r]->() 
     RETURN nodes, COUNT(r) as edges"
        .to_string()
}
pub fn graph_node_analysis_query() -> String {
    "MATCH (n) 
     RETURN labels(n)[0] as node_type, n.name as name, n.file as file, n.start as start, 
            n.end as end, n.body as body, n.data_type as data_type, n.docs as docs, 
            n.hash as hash, n.meta as meta
     ORDER BY node_type, name"
        .to_string()
}
pub fn graph_edges_analysis_query() -> String {
    "MATCH (source)-[r]->(target) 
     RETURN labels(source)[0] as source_type, source.name as source_name, source.file as source_file, source.start as source_start,
            type(r) as edge_type, labels(target)[0] as target_type, 
            target.name as target_name, target.file as target_file, target.start as target_start
     ORDER BY source_type, source_name, edge_type, target_type, target_name"
        .to_string()
}
pub fn count_edges_by_type_query(edge_type: &EdgeType) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    boltmap_insert_str(&mut params, "edge_type", &edge_type.to_string());

    let query = "MATCH ()-[r]->() 
                WHERE type(r) = $edge_type 
                RETURN COUNT(r) as count";

    (query.to_string(), params)
}

pub fn find_nodes_by_type_query(node_type: &NodeType) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    boltmap_insert_str(&mut params, "node_type", &node_type.to_string());

    let query = format!(
        "MATCH (n:{}) 
         RETURN n",
        node_type.to_string()
    );

    (query, params)
}
pub fn find_nodes_by_name_query(node_type: &NodeType, name: &str) -> (String, BoltMap) {
    let mut param = BoltMap::new();
    param
        .value
        .insert("name".into(), BoltType::String(name.into()));

    let query = format!(
        "MATCH (n:{}) 
                       WHERE n.name = $name 
                       RETURN n",
        node_type.to_string()
    );

    (query, param)
}

pub fn find_node_by_name_file_query(
    node_type: &NodeType,
    name: &str,
    file: &str,
) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    boltmap_insert_str(&mut params, "node_type", &node_type.to_string());
    boltmap_insert_str(&mut params, "name", name);
    boltmap_insert_str(&mut params, "file", file);

    let query = format!(
        "MATCH (n:{}) 
                       WHERE n.name = $name AND n.file = $file 
                       RETURN n",
        node_type.to_string()
    );

    (query, params)
}

pub fn find_nodes_by_file_pattern_query(
    node_type: &NodeType,
    file_pattern: &str,
) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    boltmap_insert_str(&mut params, "node_type", &node_type.to_string());
    boltmap_insert_str(&mut params, "file_pattern", file_pattern);
    let query = format!(
        "MATCH (n:{}) 
                       WHERE n.file CONTAINS $file_pattern 
                       RETURN n",
        node_type.to_string()
    );

    (query, params)
}

pub fn find_nodes_by_name_contains_query(
    node_type: &NodeType,
    name_part: &str,
) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    boltmap_insert_str(&mut params, "node_type", &node_type.to_string());
    boltmap_insert_str(&mut params, "name_part", name_part);

    let query = format!(
        "MATCH (n:{}) 
         WHERE n.name CONTAINS $name_part 
         RETURN n",
        node_type.to_string()
    );

    (query, params)
}

pub fn find_nodes_with_edge_type_query(
    source_type: &NodeType,
    target_type: &NodeType,
    edge_type: &EdgeType,
) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    boltmap_insert_str(&mut params, "source_type", &source_type.to_string());
    boltmap_insert_str(&mut params, "target_type", &target_type.to_string());
    boltmap_insert_str(&mut params, "edge_type", &edge_type.to_string());
    let query = format!(
        "MATCH (source:{})-[r:{}]->(target:{})
         RETURN source.name as source_name, source.file as source_file, source.start as source_start, \
                target.name as target_name, target.file as target_file, target.start as target_start",
        source_type.to_string(),
        edge_type.to_string(),
        target_type.to_string()
    );

    (query, params)
}

pub fn get_repository_hash_query(repo_url: &str) -> (String, BoltMap) {
    let mut params = BoltMap::new();

    let repo_name = if repo_url.contains('/') {
        let parts: Vec<&str> = repo_url.split('/').collect();
        let name = parts.last().unwrap_or(&repo_url);
        name.trim_end_matches(".git")
    } else {
        repo_url
    };

    boltmap_insert_str(&mut params, "repo_name", repo_name);
    let query = "MATCH (r:Repository) 
                 WHERE r.name CONTAINS $repo_name 
                 RETURN r.hash as hash";

    (query.to_string(), params)
}

pub fn remove_nodes_by_file_query(file_path: &str) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    let file_name = file_path.split('/').last().unwrap_or(file_path);
    boltmap_insert_str(&mut params, "file_name", file_name);

    let query = "
        MATCH (n)
        WHERE n.file = $file_name OR n.file ENDS WITH $file_name
        WITH DISTINCT n
        OPTIONAL MATCH (n)-[r]-() 
        DELETE r
        WITH n
        DETACH DELETE n
        RETURN count(n) as deleted
    ";

    (query.to_string(), params)
}

pub fn update_repository_hash_query(repo_name: &str, new_hash: &str) -> (String, BoltMap) {
    let mut params = BoltMap::new();
    boltmap_insert_str(&mut params, "repo_name", repo_name);
    boltmap_insert_str(&mut params, "new_hash", new_hash);

    let query = "MATCH (r:Repository) 
                 WHERE r.name CONTAINS $repo_name 
                 SET r.hash = $new_hash";

    (query.to_string(), params)
}

pub fn data_bank_bodies_query_no_token_count() -> String {
    "MATCH (n:Data_Bank) 
     WHERE n.token_count IS NULL AND n.body IS NOT NULL
     RETURN n.node_key as node_key, n.body as body"
        .to_string()
}

pub fn update_token_count_query() -> String {
    "MATCH (n {node_key: $node_key})
     SET n.token_count = $token_count"
        .to_string()
}

pub fn boltmap_insert_str(map: &mut BoltMap, key: &str, value: &str) {
    map.value.insert(key.into(), BoltType::String(value.into()));
}
pub fn boltmap_insert_int(map: &mut BoltMap, key: &str, value: i64) {
    map.value
        .insert(key.into(), BoltType::Integer(value.into()));
}
