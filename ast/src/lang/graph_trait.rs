use crate::lang::{Edge, Node, NodeType};

use super::asg::NodeData;

pub trait Graph {
    fn find_nodes_by_name(&self, node_type: NodeType, name: &str) -> Vec<NodeData>;
    fn find_nodes_in_range(&self, node_type: NodeType, row: u32, file: &str) -> Option<NodeData>;
    fn find_node_at(&self, node_type: NodeType, file: &str, line: u32) -> Option<NodeData>;
    fn find_exact_node(&self, node_type: NodeType, name: &str, file: &str) -> Option<NodeData>;
    fn find_node_in_controller(
        &self,
        node_type: NodeType,
        name: &str,
        controller: &str,
    ) -> Option<NodeData>; // this method is used only in ruby (so far)

    // fn extend_node(&mut self, node: Node, parent_file: Option<&str>);
    // fn extend_edge(&mut self, edge: Edge, parent_file: Option<&str>);
}
