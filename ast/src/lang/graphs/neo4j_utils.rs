use anyhow::Result;
use noe4rs::{query, Graph as Neo4jConnection};
use std::collections::{BTreeMap, HashMap};
use tracing::debug;

use crate::{
    lang::{
        asg::NodeData,
        graphs::{Edge, EdgeType, Node, NodeType},
    },
    utils::create_node_key,
};

pub fn row_to_node_data(
    name: String,
    file: String,
    start: i32,
    props: HashMap<String, String>,
) -> NodeData {
    let mut node_data = NodeData {
        name,
        file,
        start: start as usize,
        end: props.get("end").map_or(0, |s| s.parse().unwrap_or(0)),
        body: props.get("body").map_or(String::new(), |s| s.to_string()),
        data_type: props.get("data_type").cloned(),
        docs: props.get("docs").cloned(),
        hash: props.get("hash").cloned(),
        meta: BTreeMap::new(),
    };

    for (key, value) in props {
        match key.as_str() {
            "name" | "file" | "start" | "end" | "body" | "data_type" | "docs" | "hash" | "key" => {}
            _ => {
                node_data.meta.insert(key, value);
            }
        }
    }

    node_data
}

pub fn add_node_query(
    node_type: &NodeType,
    node_data: &NodeData,
) -> (String, HashMap<String, String>) {
    let mut params = HashMap::new();

    params.insert("name".to_string(), node_data.name.clone());
    params.insert("file".to_string(), node_data.file.clone());
    params.insert("start".to_string(), node_data.start.to_string());
    params.insert("end".to_string(), node_data.end.to_string());
    params.insert("body".to_string(), node_data.body.clone());

    if let Some(data_type) = &node_data.data_type {
        params.insert("data_type".to_string(), data_type.clone());
    }
    if let Some(docs) = &node_data.docs {
        params.insert("docs".to_string(), docs.clone());
    }
    if let Some(hash) = &node_data.hash {
        params.insert("hash".to_string(), hash.clone());
    }

    for (key, value) in &node_data.meta {
        params.insert(key.clone(), value.clone());
    }
    let node_key = create_node_key(&Node::new(node_type.clone(), node_data.clone()));
    params.insert("key".to_string(), node_key.clone());
    let property_list = params
        .keys()
        .filter(|k| k != &"key")
        .map(|k| format!("n.{} = ${}", k, k))
        .collect::<Vec<_>>()
        .join(", ");

    let query = format!(
        "MERGE (n:{} {{key: $key}})
        ON CREATE SET {}
        ON MATCH SET {}",
        node_type.to_string(),
        property_list,
        property_list
    );

    (query, params)
}

pub fn add_edge_query(edge: &Edge) -> (String, HashMap<String, String>) {
    let mut params = HashMap::new();

    params.insert(
        "source_name".to_string(),
        edge.source.node_data.name.clone(),
    );
    params.insert(
        "source_file".to_string(),
        edge.source.node_data.file.clone(),
    );
    params.insert(
        "source_start".to_string(),
        edge.source.node_data.start.to_string(),
    );

    if let Some(verb) = &edge.source.node_data.verb {
        params.insert("source_verb".to_string(), verb.clone());
    }

    params.insert(
        "target_name".to_string(),
        edge.target.node_data.name.clone(),
    );
    params.insert(
        "target_file".to_string(),
        edge.target.node_data.file.clone(),
    );
    params.insert(
        "target_start".to_string(),
        edge.target.node_data.start.to_string(),
    );

    if let Some(verb) = &edge.target.node_data.verb {
        params.insert("target_verb".to_string(), verb.clone());
    }

    let rel_type = edge.edge.to_string();

    let props_clause = match &edge.edge {
        EdgeType::Calls(meta) => {
            params.insert("call_start".to_string(), meta.call_start.to_string());
            params.insert("call_end".to_string(), meta.call_end.to_string());

            if let Some(operand) = &meta.operand {
                params.insert("operand".to_string(), operand.clone());
                "{call_start: $call_start, call_end: $call_end, operand: $operand}"
            } else {
                "{call_start: $call_start, call_end: $call_end}"
            }
        }
        _ => "",
    };

    let query = format!(
        "MATCH (source: {} {{name: $source_name, file: $source_file, start: $source_start, verb: $source_verb}}), (target: {} {{name: $target_name, file: $target_file, start: $target_start, verb: $target_verb}})
        MERGE (source)-[r:{} {}]->(target)
        ON CREATE SET r = {}
        ON MATCH SET r = {}",
        edge.source.node_type.to_string(),
        edge.target.node_type.to_string(),
        rel_type,
        props_clause,
        props_clause,
        props_clause
    );

    (query, params)
}

pub async fn execute_node_query(
    connection: &Neo4jConnection,
    query_str: String,
    params: HashMap<String, String>,
) -> Result<Vec<NodeData>> {
    match connection
        .execute(query(query_str).with_parameters(params))
        .await
    {
        Ok(mut result) => {
            let mut nodes = Vec::new();

            while let Some(row) = result.next().await? {
                if let (Ok(name), Ok(file), Ok(start)) = (
                    row.get::<String>("n.name"),
                    row.get::<String>("n.file"),
                    row.get::<i32>("n.start"),
                ) {
                    let end = row.get::<i32>("n.end").unwrap_or(0);
                    let body = row.get::<String>("n.body").unwrap_or_default();
                    let data_type = row.get::<String>("n.data_type").ok();
                    let docs = row.get::<String>("n.docs").ok();
                    let hash = row.get::<String>("n.hash").ok();

                    let props = match row.get::<HashMap<String, String>>("props") {
                        Ok(p) => p,
                        Err(_) => HashMap::new(),
                    };

                    let mut node_data = NodeData {
                        name,
                        file,
                        body,
                        start: start as usize,
                        end: end as usize,
                        data_type,
                        docs,
                        hash,
                        meta: BTreeMap::new(),
                    };

                    for (key, value) in props {
                        match key.as_str() {
                            "name" | "file" | "start" | "end" | "body" | "data_type" | "docs"
                            | "hash" | "key" => {}
                            _ => {
                                node_data.meta.insert(key, value);
                            }
                        }
                    }

                    nodes.push(node_data);
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

pub fn find_node_by_key_query(node_key: &str) -> (String, HashMap<String, String>) {
    let mut params = HashMap::new();
    params.insert("key".to_string(), node_key.to_string());

    let query = "MATCH (n {key: $key}) 
                       RETURN n";

    (query.to_string(), params)
}

pub async fn execute_query(
    conn: &Neo4jConnection,
    query_str: String,
    params: HashMap<String, String>,
) -> Result<()> {
    match conn.execute(query(query_str).with_parameters(params)).await {
        Ok(_) => Ok(()),
        Err(e) => {
            debug!("Neo4j query error: {}", e);
            Err(anyhow::anyhow!("Neo4j query error: {}", e))
        }
    }
}
