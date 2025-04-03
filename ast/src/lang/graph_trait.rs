use crate::lang::{Edge, Node, NodeType};

pub trait GraphTrait {
    fn find_node<F>(&self, node_type: Option<NodeType>, predicate: F) -> Option<Node>
    where
        F: Fn(&Node) -> bool;
    fn find_nodes<F>(&self, node_type: Option<NodeType>, predicate: F) -> Vec<Node>
    where
        F: Fn(&Node) -> bool;
    fn extend_node(&mut self, node: Node, parent_file: Option<&str>);
    fn extend_edge(&mut self, edge: Edge, parent_file: Option<&str>);
}
