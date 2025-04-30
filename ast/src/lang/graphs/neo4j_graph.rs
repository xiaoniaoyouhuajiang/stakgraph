use super::{graph::Graph, *};
use anyhow::{Context, Result};
use neo4rs::{query, ConfigBuilder, Graph as Neo4jConnection};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tracing::{debug, info};

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
            uri: std::env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://neo4j:7687".to_string()),
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
    pub fn default() -> Self {
        Neo4jGraph {
            connection: None,
            config: Neo4jConfig::default(),
            connected: Arc::new(Mutex::new(false)),
        }
    }
    pub fn with_config(config: Neo4jConfig) -> Self {
        Neo4jGraph {
            connection: None,
            config,
            connected: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn connect(&mut self) -> Result<()> {
        if let Ok(conn_status) = self.connected.lock() {
            if *conn_status && self.connection.is_some() {
                debug!("Already connected to Neo4j database");
                return Ok(());
            }
        }

        info!("Connecting to Neo4j database at {}", self.config.uri);

        let config = ConfigBuilder::new()
            .uri(&self.config.uri)
            .user(&self.config.username)
            .password(&self.config.password)
            .max_connections(self.config.max_connections)
            .build()
            .context("Failed to build Neo4j configurations")?;

        match Neo4jConnection::connect(config).await {
            Ok(graph) => {
                info!("Successfully connected to Neo4j database");
                self.connection = Some(Arc::new(graph));

                if let Ok(mut conn_status) = self.connected.lock() {
                    *conn_status = true;
                };

                //TODO: initialize schema
                Ok(())
            }
            Err(e) => {
                let error_message = format!("Failed to connect to Neo4j database: {}", e);
                debug!("{}", error_message);
                Err(anyhow::anyhow!(error_message))
            }
        }
    }

    pub fn disconnect(&mut self) -> Result<()> {
        if self.connection.is_none() {
            debug!("Not connnected to Neo4j database");
            return Ok(());
        }

        self.connection = None;

        if let Ok(mut conn_status) = self.connected.lock() {
            *conn_status = false;
        };

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
        match &self.connection {
            Some(conn) => Ok(conn.clone()),
            None => {
                self.connect().await?;
                match &self.connection {
                    Some(conn) => Ok(conn.clone()),
                    None => {
                        debug!("Failed to connect to Neo4j database");
                        Err(anyhow::anyhow!("Failed to connect to Neo4j database"))
                    }
                }
            }
        }
    }
}

impl Graph for Neo4jGraph {
    fn new() -> Self {
        Neo4jGraph {
            connection: None,
            config: Neo4jConfig::default(),
            connected: Arc::new(Mutex::new(false)),
        }
    }

    fn with_capacity(_nodes: usize, _edges: usize) -> Self {
        Neo4jGraph::default()
    }
}

//to handle async code in blocking context - sync
fn block_in_place<F, T>(future: F) -> T
where
    F: std::future::Future<Output = T>,
{
    match Handle::try_current() {
        Ok(handle) => tokio::task::block_in_place(|| handle.block_on(future)),
        Err(_) => {
            let r = tokio::runtime::Runtime::new().expect("Failed to create runtime");
            r.block_on(future)
        }
    }
}
