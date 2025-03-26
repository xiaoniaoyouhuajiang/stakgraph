use super::super::*;
use super::consts::*;
use anyhow::{Context, Result};
use tree_sitter::{Language, Node as TreeNode, Parser, Query, Tree};

pub struct Kotlin(Language);

impl Kotlin {
    pub fn new() -> Self {
        Kotlin(tree_sitter_kotlin_sg::LANGUAGE.into())
    }
}

impl Stack for Kotlin {
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
            r#"
            (call_expression
                (simple_identifier) @method_name

                )
            "#
        ))
    }
    fn imports_query(&self) -> Option<String> {
        Some(format!(
            r#"
                (package_header
                    (identifier) @{IMPORTS}
                )
                (import_header
                    (identifier) @{IMPORTS}
                )
            "#
        ))
    }

    fn class_definition_query(&self) -> String {
        format!(
            r#"
        (class_body
                (simple_identifier) @{CLASS_NAME}
        ) @{CLASS_DEFINITION}
        "#
        )
    }

    fn function_definition_query(&self) -> String {
        format!(
            r#"
            (function_declaration
                (simple_identifier) @{FUNCTION_NAME}
                    (function_value_parameters)
            )
            (function_declaration
                (simple_identifier) @function_name
                    (function_value_parameters
                        (parameter
                            (simple_identifier) @parameter_name
                                (user_type
                            (type_identifier) @parameter_type
                        )
                    )
                )
            )
            (function_declaration
                (modifiers
                    (member_modifier) @modifier
                    )
                (simple_identifier) @{FUNCTION_NAME}
            )
            "#
        )
    }

    fn function_call_query(&self) -> String {
        format!(
            r#"
        (call_expression
            (identifier) @method_name
                (value_arguments
                (value_argument
                    (navigation_expression
                        (identifier) @FUNCTION_NAME
                    )
                )
            )
        )
        (call_expression
            (simple_identifier) @FUNCTION_NAME
            (call_suffix
                (value_arguments)
            )
        )
        (call_expression
            function: (identifier) @{FUNCTION_NAME}
            )
        )
        (call_expression
            function: (identifier) @{FUNCTION_NAME}
            arguments: (argument_list) @{ARGUMENTS}
        )
        (call_expression
            function: (navigation_expression
                (identifier) @caller_name
                (identifier) @method_name
            )
            arguments: (argument_list) @{ARGUMENTS}
        )
        (call_expression
            function: (user_type
                (identifier) @CONSTRUCTOR_NAME
            )
            arguments: (argument_list) @{ARGUMENTS}
        )
        (lambda_literal
            parameters: (variable_declaration (identifier) @PARAMETER_NAME)
            body: (block) @BODY
        )
        "#
        )
    }

    fn find_function_parent(
        &self,
        node: TreeNode,
        code: &str,
        file: &str,
        func_name: &str,
        _graph: &Graph,
        _parent_type: Option<&str>,
    ) -> Result<Option<Operand>> {
        let mut parent = node.parent();
        while parent.is_some() && parent.unwrap().kind().to_string() != "class_declaration" {
            parent = parent.unwrap().parent();
        }
        let parent_of = match parent {
            Some(p) => {
                let query = self.q(&self.identifier_query(), &NodeType::Class);
                match query_to_ident(query, p, code)? {
                    Some(parent_name) => Some(Operand {
                        source: NodeKeys::new(&parent_name, file),
                        target: NodeKeys::new(func_name, file),
                    }),
                    None => None,
                }
            }
            None => None,
        };
        Ok(parent_of)
    }

    fn endpoint_finders(&self) -> Vec<String> {
        vec![format!(
            r#"(function_declaration
                    (simple_identifier) @{REQUEST_CALL}
                    (#match? @{REQUEST_CALL} "set|get|post|put|delete")
                )"#
        )]
    }

    fn data_model_query(&self) -> Option<String> {
        Some(format!(
            "(class_body
	            (property_declaration
		            (variable_declaration
			            (simple_identifier) @{STRUCT_NAME}
                    )
                )
            ) @{STRUCT}"
        ))
    }

    fn data_model_within_query(&self) -> Option<String> {
        Some(format!(
            r#"[
                (variable_declaration
                    (identifier) @{STRUCT_NAME} (#match? @{STRUCT_NAME} "^[A-Z].*")
                )
                (call_expression
                    function: (identifier) @{STRUCT_NAME} (#match? @{STRUCT_NAME} "^[A-Z].*")
                )
            ]"#
        ))
    }

    fn is_test(&self, func_name: &str, _func_file: &str) -> bool {
        func_name.starts_with("test")
    }
}
