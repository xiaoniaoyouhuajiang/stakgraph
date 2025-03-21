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

    fn endpoint_finders(&self) -> Vec<String> {
        vec![format!(
            r#"(call_expression
                function: (member_expression
                    object: (identifier) @app_object
                    property: (property_identifier) @endpoint-verb (#match? @endpoint-verb "^get$|^post$|^put$|^delete$")
                )
                arguments: (arguments
                    (string (string_fragment) @endpoint)
                    [
                    (arrow_function) @handler
                    (function_expression) @handler
                    (identifier) @handler
                    ]
                )
                ) @route
            "#
        )]
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
