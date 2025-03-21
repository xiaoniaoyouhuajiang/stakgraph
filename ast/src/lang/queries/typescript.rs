use super::super::*;
use super::consts::*;
use anyhow::{Context, Result};
use tree_sitter::{Language, Parser, Query, Tree};

pub struct TypeScript(Language);

impl TypeScript {
    pub fn new() -> Self {
        TypeScript(tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into())
    }
}

impl Stack for TypeScript {
    fn q(&self, q: &str, _nt: &NodeType) -> Query {
        Query::new(&self.0, q).unwrap()
    }
    fn parse(&self, code: &str, _nt: &NodeType) -> Result<Tree> {
        let mut parser = Parser::new();
        parser.set_language(&self.0)?;
        Ok(parser.parse(code, None).context("failed to parse")?)
    }
    fn lib_query(&self) -> Option<String> {
        Some(format!(
            r#"(pair
                key: (string (_) @dependency_type) (#match? @dependency_type "^(dependencies|devDependencies)$")
                value: (object
                    (pair
                    key: (string (_) @{LIBRARY_NAME}) (#match? @{LIBRARY_NAME} "^[@a-zA-Z]")
                    value: (string (_) @{LIBRARY_VERSION}) (#match? @{LIBRARY_VERSION} "^[\\^~]?\\d|\\*")
                    ) @{LIBRARY}
                )
                )"#
        ))
    }

    fn is_lib_file(&self, file_name: &str) -> bool {
        file_name.contains("node_modules/")
    }
    fn imports_query(&self) -> Option<String> {
        Some(format!(
            r#"(program
                (import_statement)+ @{IMPORTS}
            )"#,
        ))
    }

    fn class_definition_query(&self) -> String {
        format!(
            r#"
            (class_declaration
                name: (type_identifier) @{CLASS_NAME}
                (class_heritage
                    (implements_clause
                    (type_identifier) @{PARENT_NAME}
                    )?
                )?
            ) @{CLASS_DEFINITION}
            "#
        )
    }

    fn function_definition_query(&self) -> String {
        format!(
            r#"
           (class_declaration
                name: (type_identifier) @{CLASS_NAME}
                body: (class_body
                    (method_definition
                    name: (property_identifier) @{FUNCTION_NAME}
                    parameters: (formal_parameters
                        (required_parameter
                        (identifier) @{ARGUMENTS}
                        (type_annotation
                            (predefined_type) @{RETURN_TYPES}
                        )?
                        )*
                    ) @arguments
                    return_type: (type_annotation
                        (generic_type
                        name: (type_identifier) @{RETURN_TYPES}
                        (type_arguments
                            (type_identifier) @{RETURN_TYPES}
                        )?
                        )
                    )?
                    body: (statement_block) @{FUNCTION_DEFINITION}
                    )
                )
            ) @{CLASS_DEFINITION}

            "#
        )
    }

    fn function_call_query(&self) -> String {
        format!(
            r#"
            (call_expression
                function: (identifier) @{FUNCTION_NAME}
                arguments: (arguments) @{ARGUMENTS}
            )

            (call_expression
            function: (member_expression
                object: (identifier) @{CLASS_NAME}
                property: (property_identifier) @{FUNCTION_NAME}
            )
                arguments: (arguments) @{ARGUMENTS}
            )
            "#
        )
    }

    fn find_endpoint_parents(
        &self,
        node: TreeNode,
        code: &str,
        _file: &str,
        graph: &Graph,
    ) -> Result<Vec<HandlerItem>> {
        let mut parents = Vec::new();

        if let Some(func_node) = node.child_by_field_name("function") {
            if let Some(obj_node) = func_node.child_by_field_name("object") {
                let router_var = obj_node
                    .utf8_text(code.as_bytes())
                    .unwrap_or("")
                    .to_string();

                for node in &graph.nodes {
                    if let Node::Endpoint(endpoint) = node {
                        if endpoint.file.ends_with("index.ts") {
                            if let Some(endpoint_router_var) = endpoint.meta.get("router_var") {
                                if endpoint_router_var == &router_var {
                                    parents.push(HandlerItem {
                                        name: endpoint.name.clone(),
                                        item_type: HandlerItemType::Namespace,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(parents)
    }

    fn endpoint_finders(&self) -> Vec<String> {
        vec![
            format!(
                r#"(call_expression
                    function: (member_expression
                        object: (identifier) @router_object
                        property: (property_identifier) @{ENDPOINT_VERB}
                    )
                    arguments: (arguments
                        (string (string_fragment) @{ENDPOINT})
                        (_) @{HANDLER}
                    )
                ) @{ROUTE}"#
            ),
            format!(
                r#"(call_expression
                    function: (member_expression
                        object: (identifier) @app_object
                        property: (property_identifier) @use_method (#eq? @use_method "use")
                    )
                    arguments: (arguments
                        (string (string_fragment) @{ENDPOINT})
                        (identifier) @router_var
                    )
                ) @{ROUTE}"#
            ),
        ]
    }

    fn add_endpoint_verb(&self, inst: &mut NodeData, call: &Option<String>) {
        if let Some(c) = call {
            let verb = match c.as_str() {
                "get" => "GET".to_string(),
                "post" => "POST".to_string(),
                "put" => "PUT".to_string(),
                "delete" => "DELETE".to_string(),
                "use" => "USE".to_string(),
                _ => "".to_string(),
            };
            inst.meta.insert("verb".to_string(), verb);
        }

        if inst.meta.get("verb") == Some(&"USE".to_string()) {
            if let Some(router_var) = inst.meta.get("router_var") {
                inst.meta
                    .insert("router_var".to_string(), router_var.clone());
            }
        }
    }

    fn is_router_file(&self, file_name: &str, _code: &str) -> bool {
        file_name.ends_with("routes.ts")
            || file_name.contains("router")
            || file_name.contains("routes")
            || file_name.ends_with("index.ts")
    }

    fn data_model_query(&self) -> Option<String> {
        Some(format!(
            r#"
                ;; sequelize
                (class_declaration
                    name: (type_identifier) @{STRUCT_NAME}
                    (class_heritage
                        (extends_clause
                            value: (identifier) @model (#eq? @model "Model")
                        )
                    )
                ) @{STRUCT}
                ;; typeorm
                (
                    (decorator
                        (call_expression
                            function: (identifier) @entity (#eq? @entity "Entity")
                        )
                    )
                    (class_declaration
                        name: (type_identifier) @{STRUCT_NAME}
                    ) @{STRUCT}
                )
             "#
        ))
    }
    fn data_model_within_query(&self) -> Option<String> {
        Some(format!(
            r#"(
                (type_identifier) @{STRUCT_NAME} (#match? @{STRUCT_NAME} "^[A-Z].*")
            )"#
        ))
    }
}
