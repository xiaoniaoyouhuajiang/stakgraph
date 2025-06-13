use super::{neo4j_utils::*, *};
use crate::utils::sync_fn;
use crate::{
    lang::{Function, FunctionCall},
    Lang,
};
use anyhow::Result;
use neo4rs::{query, BoltType, Graph as Neo4jConnection};
use std::str::FromStr;
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
    time::Duration,
};
use tiktoken_rs::get_bpe_from_model;
use tracing::{debug, info};

use super::neo4j_utils::Neo4jConnectionManager;

#[derive(Clone, Debug)]
pub struct Neo4jConfig {
    pub uri: String,
    pub username: String,
    pub password: String,
    pub connection_timeout: Duration,
    pub max_connections: usize,
}

impl Default for Neo4jConfig {
    fn default() -> Self {
        Neo4jConfig {
            uri: std::env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://localhost:7687".to_string()),
            username: std::env::var("NEO4J_USERNAME").unwrap_or_else(|_| "neo4j".to_string()),
            password: std::env::var("NEO4J_PASSWORD").unwrap_or_else(|_| "testtest".to_string()),
            connection_timeout: Duration::from_secs(30),
            max_connections: 10,
        }
    }
}

#[derive(Clone)]
pub struct Neo4jGraph {
    connection: Option<Arc<Neo4jConnection>>,
    config: Neo4jConfig,
    connected: Arc<Mutex<bool>>,
}

impl Neo4jGraph {
    pub fn with_config(config: Neo4jConfig) -> Self {
        Neo4jGraph {
            connection: None,
            config,
            connected: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn connect(&mut self) -> Result<()> {
        if let Some(conn) = Neo4jConnectionManager::get_connection().await {
            self.connection = Some(conn);
            if let Ok(mut conn_status) = self.connected.lock() {
                *conn_status = true;
            };
            debug!("Using existing connection from connection manager");
            return Ok(());
        }
        if let Ok(conn_status) = self.connected.lock() {
            if *conn_status && self.connection.is_some() {
                debug!("Already connected to Neo4j database");
                return Ok(());
            }
        }

        info!("Connecting to Neo4j database at {}", self.config.uri);

        // Initialize the connection manager with our config
        match Neo4jConnectionManager::initialize(
            &self.config.uri,
            &self.config.username,
            &self.config.password,
        )
        .await
        {
            Ok(_) => {
                if let Some(conn) = Neo4jConnectionManager::get_connection().await {
                    self.connection = Some(conn);

                    if let Ok(mut conn_status) = self.connected.lock() {
                        *conn_status = true;
                    };

                    info!("Successfully connected to Neo4j database");
                    Ok(())
                } else {
                    let error_message =
                        "Failed to get Neo4j connection after initialization".to_string();
                    debug!("{}", error_message);
                    Err(anyhow::anyhow!(error_message))
                }
            }
            Err(e) => {
                let error_message = format!("Failed to connect to Neo4j database: {}", e);
                debug!("{}", error_message);
                Err(anyhow::anyhow!(error_message))
            }
        }
    }

    pub async fn disconnect(&mut self) -> Result<()> {
        if self.connection.is_none() {
            debug!("Not connected to Neo4j database");
            return Ok(());
        }

        self.connection = None;

        if let Ok(mut conn_status) = self.connected.lock() {
            *conn_status = false;
        };

        Neo4jConnectionManager::clear_connection().await;

        info!("Disconnected from Neo4j database");
        Ok(())
    }

    pub fn is_connected(&self) -> bool {
        if let Ok(conn_status) = self.connected.lock() {
            *conn_status
        } else {
            false
        }
    }

    pub async fn ensure_connected(&mut self) -> Result<Arc<Neo4jConnection>> {
        if let Some(conn) = &self.connection {
            return Ok(conn.clone());
        }

        // if let Some(conn) = Neo4jConnectionManager::get_connection().await {
        //     self.connection = Some(conn.clone());
        //     if let Ok(mut conn_status) = self.connected.lock() {
        //         *conn_status = true;
        //     }
        //     return Ok(conn);
        // }

        // self.connect().await?;

        match &self.connection {
            Some(conn) => Ok(conn.clone()),
            None => Err(anyhow::anyhow!("Failed to connect to Neo4j")),
        }
    }

    pub fn get_connection(&self) -> Arc<Neo4jConnection> {
        match &self.connection {
            Some(conn) => conn.clone(),
            None => panic!("No Neo4j connection available. Make sure Neo4j is running and connect() was called."),
        }
    }

    pub async fn create_indexes(&mut self) -> anyhow::Result<()> {
        let connection = self.ensure_connected().await?;
        let queries = vec![
            "CREATE INDEX node_key_index IF NOT EXISTS FOR (n) ON (n.node_key)",
            "CREATE FULLTEXT INDEX body_fulltext_index IF NOT EXISTS FOR (n) ON EACH [n.body]",
            "CREATE FULLTEXT INDEX name_fulltext_index IF NOT EXISTS FOR (n) ON EACH [n.name]", 
            "CREATE FULLTEXT INDEX composite_fulltext_index IF NOT EXISTS FOR (n) ON EACH [n.name, n.body, n.file]",
            "CREATE VECTOR INDEX vector_index IF NOT EXISTS FOR (n) ON (n.embeddings) OPTIONS {indexConfig: {`vector.dimensions`: 384, `vector.similarity_function`: 'cosine'}}"
        ];
        for q in queries {
            let _ = connection.run(neo4rs::query(q)).await;
        }
        Ok(())
    }

    pub async fn update_all_token_counts(&mut self) -> anyhow::Result<()> {
        self.execute_query(|conn| {
            Box::pin(async move {
                let query_str = data_bank_bodies_query_no_token_count();
                let mut result = conn.execute(neo4rs::query(&query_str)).await?;
                let mut updates: Vec<(String, String)> = Vec::new();

                while let Some(row) = result.next().await? {
                    if let (Ok(node_key), Ok(body)) =
                        (row.get::<String>("node_key"), row.get::<String>("body"))
                    {
                        updates.push((node_key, body));
                    }
                }

                let bpe = get_bpe_from_model("gpt-4")?;
                for (node_key, body) in &updates {
                    let token_count = bpe.encode_with_special_tokens(&body).len() as i64;
                    let update_query = update_token_count_query();
                    let query_obj = neo4rs::query(&update_query)
                        .param("node_key", node_key.to_string())
                        .param("token_count".into(), BoltType::Integer(token_count.into()));
                    conn.run(query_obj).await?;
                }
                Ok(())
            })
        })
        .await
    }

    pub async fn clear(&mut self) -> Result<()> {
        let connection = self.ensure_connected().await?;
        let mut txn = connection.start_txn().await?;

        let clear_rels = query("MATCH ()-[r]-() DELETE r");
        if let Err(e) = txn.run(clear_rels).await {
            debug!("Error clearing relationships: {:?}", e);
            txn.rollback().await?;
            return Err(anyhow::anyhow!("Neo4j relationship deletion error: {}", e));
        }

        let clear_nodes = query("MATCH (n) DELETE n");
        if let Err(e) = txn.run(clear_nodes).await {
            debug!("Error clearing nodes: {:?}", e);
            txn.rollback().await?;
            return Err(anyhow::anyhow!("Neo4j node deletion error: {}", e));
        }

        txn.commit().await?;
        Ok(())
    }

    async fn execute_query<T, Fut>(
        &mut self,
        operation: impl FnOnce(Arc<Neo4jConnection>) -> Fut,
    ) -> anyhow::Result<T>
    where
        Fut: std::future::Future<Output = anyhow::Result<T>>,
    {
        let connection = self.ensure_connected().await?;
        operation(connection).await
    }

    async fn execute_with_transaction<F, T>(&mut self, operation: F) -> Result<T>
    where
        F: FnOnce(&mut TransactionManager) -> Result<T>,
    {
        let connection = self.ensure_connected().await?;
        let mut txn_manager = TransactionManager::new(&connection);

        let result = operation(&mut txn_manager);

        if result.is_ok() {
            match txn_manager.execute().await {
                Ok(_) => result,
                Err(e) => Err(e),
            }
        } else {
            result
        }
    }

    pub async fn get_repository_hash(&mut self, repo_url: &str) -> Result<String> {
        let connection = self.ensure_connected().await?;
        let (query_str, params) = get_repository_hash_query(repo_url);
        let mut query_obj = query(&query_str);
        for (key, value) in params.value.iter() {
            query_obj = query_obj.param(key.value.as_str(), value.clone());
        }
        let mut result = connection.execute(query_obj).await?;
        if let Some(row) = result.next().await? {
            Ok(row.get::<String>("hash").unwrap_or_default())
        } else {
            Err(anyhow::anyhow!("No hash found for repo"))
        }
    }

    pub async fn remove_nodes_by_file(&mut self, file_path: &str) -> Result<u32> {
        let connection = self.ensure_connected().await?;
        let (query_str, params) = remove_nodes_by_file_query(file_path);
        let mut query_obj = query(&query_str);
        for (k, v) in params.value.iter() {
            query_obj = query_obj.param(k.value.as_str(), v.clone());
        }
        let mut result = connection.execute(query_obj).await?;
        if let Some(row) = result.next().await? {
            Ok(row.get::<u32>("count").unwrap_or(0))
        } else {
            Ok(0)
        }
    }

    pub async fn update_repository_hash(&mut self, repo_name: &str, new_hash: &str) -> Result<()> {
        self.execute_with_transaction(|txn_manager| {
            let (query, params) = update_repository_hash_query(repo_name, new_hash);
            txn_manager.add_query((query, params));
            Ok(())
        })
        .await
    }

    pub async fn get_incoming_edges_for_file(
        &mut self,
        file: &str,
    ) -> Result<Vec<(Edge, NodeData)>> {
        let connection = self.ensure_connected().await?;
        let query_str = r#"
                MATCH (source)-[r]->(target)
                WHERE target.file = $file AND source.file <> $file
                RETURN source, r, target, labels(source)[0] as source_type, labels(target)[0] as target_type, type(r) as edge_type
            "#;
        let query_obj = query(query_str).param("file", file);
        let mut incoming = Vec::new();
        let mut result = connection.execute(query_obj).await?;
        while let Some(row) = result.next().await? {
            if let (
                Ok(source_node),
                Ok(target_node),
                Ok(source_type),
                Ok(target_type),
                Ok(edge_type),
            ) = (
                row.get::<neo4rs::Node>("source"),
                row.get::<neo4rs::Node>("target"),
                row.get::<String>("source_type"),
                row.get::<String>("target_type"),
                row.get::<String>("edge_type"),
            ) {
                if let (Ok(source_type), Ok(target_type), Ok(edge_type)) = (
                    NodeType::from_str(&source_type),
                    NodeType::from_str(&target_type),
                    EdgeType::from_str(&edge_type),
                ) {
                    let source_data = NodeData::try_from(&source_node).unwrap();
                    let target_data = NodeData::try_from(&target_node).unwrap();
                    let source_ref = NodeRef::from(NodeKeys::from(&source_data), source_type);
                    let target_ref = NodeRef::from(NodeKeys::from(&target_data), target_type);
                    let edge = Edge::new(edge_type, source_ref, target_ref);
                    incoming.push((edge, target_data));
                }
            }
        }
        Ok(incoming)
    }
}

impl Default for Neo4jGraph {
    fn default() -> Self {
        Neo4jGraph {
            connection: None,
            config: Neo4jConfig::default(),
            connected: Arc::new(Mutex::new(false)),
        }
    }
}

impl std::fmt::Debug for Neo4jGraph {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Neo4jGraph")
            .field("config", &self.config)
            .field("connected", &self.connected)
            .field("connection", &"<Neo4jConnection>")
            .finish()
    }
}

impl Neo4jGraph {
    pub async fn add_node_async(&mut self, node_type: NodeType, node_data: NodeData) -> Result<()> {
        self.execute_with_transaction(|txn_manager| {
            txn_manager.add_node(&node_type, &node_data);
            Ok(())
        })
        .await
    }

    pub async fn add_edge_async(&mut self, edge: Edge) -> Result<()> {
        self.execute_with_transaction(|txn_manager| {
            txn_manager.add_edge(&edge);
            Ok(())
        })
        .await
    }

    pub async fn find_nodes_by_name_async(&self, node_type: NodeType, name: &str) -> Vec<NodeData> {
        let connection = self.get_connection();

        let (query_str, params_map) = find_nodes_by_name_query(&node_type, name);
        match execute_node_query(&connection, query_str, params_map).await {
            Ok(nodes) => nodes,
            Err(e) => {
                debug!("Error finding nodes by name: {}", e);
                Vec::new()
            }
        }
    }

    pub async fn find_node_by_name_in_file_async(
        &self,
        node_type: NodeType,
        name: &str,
        file: &str,
    ) -> Option<NodeData> {
        let connection = self.get_connection();

        let (query, params) = find_node_by_name_file_query(&node_type, name, file);

        match execute_node_query(&connection, query, params).await {
            Ok(nodes) => nodes.into_iter().next(),
            Err(e) => {
                debug!("Error finding node by name and file: {}", e);
                None
            }
        }
    }

    pub async fn get_graph_size_async(&self) -> Result<(u32, u32)> {
        let connection = self.get_connection();
        let query_str = count_nodes_edges_query();
        let mut result = connection.execute(query(&query_str)).await?;
        if let Some(row) = result.next().await? {
            let nodes = row.get::<u32>("nodes").unwrap_or(0);
            let edges = row.get::<u32>("edges").unwrap_or(0);
            Ok((nodes, edges))
        } else {
            Ok((0, 0))
        }
    }
    pub async fn analysis_async(&self) -> Result<()> {
        let connection = self.get_connection();
        let (nodes, edges) = self.get_graph_size();
        println!("Graph contains {} nodes and {} edges", nodes, edges);

        let query_str = graph_node_analysis_query();
        match connection.execute(query(&query_str)).await {
            Ok(mut result) => {
                while let Some(row) = result.next().await? {
                    if let (Ok(node_type), Ok(name), Ok(file), Ok(start)) = (
                        row.get::<String>("node_type"),
                        row.get::<String>("name"),
                        row.get::<String>("file"),
                        row.get::<String>("start"),
                    ) {
                        println!("Node: \"{}\"-{}-{}-{}", node_type, name, file, start);
                    }
                }
            }
            Err(e) => {
                debug!("Error retrieving node details: {}", e);
            }
        }

        let query_str = graph_edges_analysis_query();
        match connection.execute(query(&query_str)).await {
            Ok(mut result) => {
                while let Some(row) = result.next().await? {
                    if let (
                        Ok(source_type),
                        Ok(source_name),
                        Ok(source_file),
                        Ok(source_start),
                        Ok(edge_type),
                        Ok(target_type),
                        Ok(target_name),
                        Ok(target_file),
                        Ok(target_start),
                    ) = (
                        row.get::<String>("source_type"),
                        row.get::<String>("source_name"),
                        row.get::<String>("source_file"),
                        row.get::<String>("source_start"),
                        row.get::<String>("edge_type"),
                        row.get::<String>("target_type"),
                        row.get::<String>("target_name"),
                        row.get::<String>("target_file"),
                        row.get::<String>("target_start"),
                    ) {
                        println!(
                            "From {}-{}-{}-{} to {}-{}-{}-{} : {}",
                            source_type,
                            source_name,
                            source_file,
                            source_start,
                            target_type,
                            target_name,
                            target_file,
                            target_start,
                            edge_type,
                        );
                    }
                }
            }
            Err(e) => {
                debug!("Error retrieving edge details: {}", e);
            }
        }
        Ok(())
    }
    pub async fn count_edges_of_type_async(&self, edge_type: EdgeType) -> usize {
        let connection = self.get_connection();

        let (query_str, params) = count_edges_by_type_query(&edge_type);
        let mut query_obj = query(&query_str);
        for (key, value) in params.value.iter() {
            query_obj = query_obj.param(key.value.as_str(), value.clone());
        }
        match connection.execute(query_obj).await {
            Ok(mut result) => {
                if let Ok(Some(row)) = result.next().await {
                    row.get::<usize>("count").unwrap_or(0)
                } else {
                    0
                }
            }
            Err(e) => {
                debug!("Error counting edges by type: {}", e);
                0
            }
        }
    }

    pub async fn find_nodes_by_type_async(&self, node_type: NodeType) -> Result<Vec<NodeData>> {
        let connection = self.get_connection();
        let (query, params) = find_nodes_by_type_query(&node_type);
        execute_node_query(&connection, query, params).await
    }

    pub async fn find_nodes_by_name_contains_async(
        &self,
        node_type: NodeType,
        name_part: &str,
    ) -> Result<Vec<NodeData>> {
        let connection = self.get_connection();
        let (query, params) = find_nodes_by_name_contains_query(&node_type, name_part);
        execute_node_query(&connection, query, params).await
    }

    pub async fn find_nodes_by_file_ends_with_async(
        &self,
        node_type: NodeType,
        file: &str,
    ) -> Result<Vec<NodeData>> {
        let connection = self.get_connection();
        let (query, params) = find_nodes_by_file_pattern_query(&node_type, file);
        execute_node_query(&connection, query, params).await
    }

    pub async fn find_nodes_with_edge_type_async(
        &self,
        source_type: NodeType,
        target_type: NodeType,
        edge_type: EdgeType,
    ) -> Result<Vec<(NodeData, NodeData)>> {
        let connection = self.get_connection();
        let (query_str, params) =
            find_nodes_with_edge_type_query(&source_type, &target_type, &edge_type);

        let mut query_obj = query(&query_str);
        for (key, value) in params.value.iter() {
            query_obj = query_obj.param(key.value.as_str(), value.clone());
        }
        let mut node_pairs = Vec::new();
        let mut result = connection.execute(query_obj).await?;
        while let Some(row) = result.next().await? {
            let source_name: String = row.get("source_name").unwrap_or_default();
            let source_file: String = row.get("source_file").unwrap_or_default();
            let source_start: i64 = row.get("source_start").unwrap_or_default();
            let target_name: String = row.get("target_name").unwrap_or_default();
            let target_file: String = row.get("target_file").unwrap_or_default();
            let target_start: i64 = row.get("target_start").unwrap_or_default();

            let source_node = NodeData {
                name: source_name,
                file: source_file,
                start: source_start as usize,
                ..Default::default()
            };
            let target_node = NodeData {
                name: target_name,
                file: target_file,
                start: target_start as usize,
                ..Default::default()
            };
            node_pairs.push((source_node, target_node));
        }
        Ok(node_pairs)
    }
}

impl Graph for Neo4jGraph {
    fn new() -> Self
    where
        Self: Sized,
    {
        Self::default()
    }
    fn with_capacity(_nodes: usize, _edges: usize) -> Self
    where
        Self: Sized,
    {
        Self::default()
    }
    fn analysis(&self) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn create_filtered_graph(&self, final_filter: &[String]) -> Self
    where
        Self: Sized,
    {
        todo!("To be implemented in Neo4jGraph");
    }

    fn extend_graph(&mut self, other: Self)
    where
        Self: Sized,
    {
        todo!("To be implemented in Neo4jGraph");
    }

    fn get_graph_size(&self) -> (u32, u32) {
        sync_fn(|| async { self.get_graph_size_async().await.unwrap_or_default() }).unwrap()
    }

    fn find_nodes_by_name(&self, node_type: NodeType, name: &str) -> Vec<NodeData> {
        sync_fn(|| async { self.find_nodes_by_name_async(node_type, name).await }).unwrap()
    }
    fn add_node_with_parent(
        &mut self,
        node_type: NodeType,
        node_data: NodeData,
        parent_type: NodeType,
        parent_file: &str,
    ) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_edge(&mut self, edge: Edge) {
        sync_fn(|| async { self.add_edge_async(edge).await.unwrap_or_default() }).unwrap();
    }
    fn add_node(&mut self, node_type: NodeType, node_data: NodeData) {
        sync_fn(|| async {
            self.add_node_async(node_type, node_data)
                .await
                .unwrap_or_default()
        })
        .unwrap();
    }
    fn get_graph_keys(&self) -> (HashSet<String>, HashSet<String>) {
        todo!("To be implemented in Neo4jGraph");
    }

    fn find_source_edge_by_name_and_file(
        &self,
        edge_type: EdgeType,
        target_name: &str,
        target_file: &str,
    ) -> Option<NodeKeys> {
        todo!("To be implemented in Neo4jGraph");
    }
    fn process_endpoint_groups(&mut self, eg: Vec<NodeData>, lang: &Lang) -> Result<()> {
        todo!("To be implemented in Neo4jGraph");
    }
    fn class_inherits(&mut self) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn class_includes(&mut self) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_instances(&mut self, nodes: Vec<NodeData>) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_functions(&mut self, functions: Vec<Function>) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_page(&mut self, page: (NodeData, Option<Edge>)) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_pages(&mut self, pages: Vec<(NodeData, Vec<Edge>)>) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_endpoints(&mut self, endpoints: Vec<(NodeData, Option<Edge>)>) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_test_node(&mut self, test_data: NodeData, test_type: NodeType, test_edge: Option<Edge>) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn add_calls(&mut self, calls: (Vec<FunctionCall>, Vec<FunctionCall>, Vec<Edge>, Vec<Edge>)) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn filter_out_nodes_without_children(
        &mut self,
        parent_type: NodeType,
        child_type: NodeType,
        child_meta_key: &str,
    ) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn get_data_models_within(&mut self, lang: &Lang) {
        todo!("To be implemented in Neo4jGraph");
    }
    fn prefix_paths(&mut self, root: &str) {
        todo!("To be implemented in Neo4jGraph");
    }

    //Specific
    fn find_endpoint(&self, name: &str, file: &str, verb: &str) -> Option<NodeData> {
        todo!("To be implemented in Neo4jGraph");
    }

    fn find_resource_nodes(&self, node_type: NodeType, verb: &str, path: &str) -> Vec<NodeData> {
        todo!("To be implemented in Neo4jGraph");
    }
    fn find_handlers_for_endpoint(&self, endpoint: &NodeData) -> Vec<NodeData> {
        todo!("To be implemented in Neo4jGraph");
    }
    fn check_direct_data_model_usage(&self, function_name: &str, data_model: &str) -> bool {
        todo!("To be implemented in Neo4jGraph");
    }
    fn find_functions_called_by(&self, function: &NodeData) -> Vec<NodeData> {
        todo!("To be implemented in Neo4jGraph");
    }
    fn find_nodes_by_type(&self, node_type: NodeType) -> Vec<NodeData> {
        sync_fn(|| async {
            self.find_nodes_by_type_async(node_type)
                .await
                .unwrap_or_default()
        })
        .unwrap()
    }
    fn find_nodes_with_edge_type(
        &self,
        source_type: NodeType,
        target_type: NodeType,
        edge_type: EdgeType,
    ) -> Vec<(NodeData, NodeData)> {
        sync_fn(|| async {
            self.find_nodes_with_edge_type_async(source_type, target_type, edge_type)
                .await
                .unwrap_or_default()
        })
        .unwrap()
    }
    fn count_edges_of_type(&self, edge_type: EdgeType) -> usize {
        sync_fn(|| async { self.count_edges_of_type_async(edge_type).await }).unwrap()
    }
    fn find_nodes_by_name_contains(&self, node_type: NodeType, name: &str) -> Vec<NodeData> {
        sync_fn(|| async {
            self.find_nodes_by_name_contains_async(node_type, name)
                .await
                .unwrap_or_default()
        })
        .unwrap()
    }

    fn find_node_by_name_in_file(
        &self,
        node_type: NodeType,
        name: &str,
        file: &str,
    ) -> Option<NodeData> {
        Some(
            sync_fn(|| async {
                self.find_node_by_name_in_file_async(node_type, name, file)
                    .await
                    .unwrap_or_default()
            })
            .unwrap(),
        )
    }

    fn find_nodes_by_file_ends_with(&self, node_type: NodeType, file: &str) -> Vec<NodeData> {
        sync_fn(|| async {
            self.find_nodes_by_file_ends_with_async(node_type, file)
                .await
                .unwrap_or_default()
        })
        .unwrap()
    }

    fn find_node_by_name_and_file_end_with(
        &self,
        node_type: NodeType,
        name: &str,
        suffix: &str,
    ) -> Option<NodeData> {
        todo!("To be implemented in Neo4jGraph");
    }

    fn find_node_in_range(&self, node_type: NodeType, row: u32, file: &str) -> Option<NodeData> {
        todo!("To be implemented in Neo4jGraph");
    }

    fn find_node_at(&self, node_type: NodeType, file: &str, line: u32) -> Option<NodeData> {
        todo!("To be implemented in Neo4jGraph");
    }
}
