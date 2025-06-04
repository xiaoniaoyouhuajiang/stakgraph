use super::super::*;
use super::consts::*;
use anyhow::{Context, Result};
// use lsp::{Cmd as LspCmd, CmdSender, Position, Res as LspRes};
use tree_sitter::{Language, Parser, Query, Tree};

pub struct Cpp(Language);

impl Cpp {
    pub fn new() -> Self {
        Cpp(tree_sitter_cpp::LANGUAGE.into())
    }
}
impl Stack for Cpp {
    fn q(&self, q: &str, _nt: &NodeType) -> Query {
        Query::new(&self.0, q).unwrap()
    }

    fn parse(&self, code: &str, _nt: &NodeType) -> Result<Tree> {
        let mut parser = Parser::new();
        parser.set_language(&self.0)?;
        parser.parse(code, None).context("Failed to parse code")
    }

    fn lib_query(&self) -> Option<String> {
        Some(format!(
            r#"
            (translation_unit
                (preproc_include
                    path: (_)@{LIBRARY_NAME}
                )?@{LIBRARY}
                (preproc_ifdef
                    name: (identifier) @condition
                    (preproc_include
                        path: (_)@{LIBRARY_NAME}
                    )@{LIBRARY}
                )?
            )
            "#
        ))
    }

    fn imports_query(&self) -> Option<String> {
        Some(format!(
            r#"
                (translation_unit
                    (preproc_include
                        path: (_)@{IMPORTS_FROM} @{IMPORTS_NAME}
                    )?@{IMPORTS}
                    (preproc_ifdef
                        name: (identifier) @condition
                        (preproc_include
                            path: (_)@{IMPORTS_FROM} @{IMPORTS_NAME}
                        )@{IMPORTS}
                    )?
                    (declaration
                        type: (type_identifier)
                        declarator : (identifier)@{IMPORTS_FROM} @{IMPORTS_NAME}
                    )?@{IMPORTS}
                )
                "#
        ))
    }

    fn variables_query(&self) -> Option<String> {
        Some(format!(
            r#"
            (translation_unit
                (declaration
                    type: (_) @{VARIABLE_TYPE}
                    declarator : (identifier)? @{VARIABLE_NAME}
                    declarator : (init_declarator
                        declarator : (_)@{VARIABLE_NAME}
                        value: (_)?@{VARIABLE_VALUE}
                    )?
                )@{VARIABLE_DECLARATION}
            )
            "#
        ))
    }

    fn class_definition_query(&self) -> String {
        format!(
            r#"
            (translation_unit
                (class_specifier
                    name: (type_identifier)@{CLASS_NAME}
                    (base_class_clause
                        (type_identifier)@{CLASS_PARENT}
                    )?
                )@{CLASS_DEFINITION}
            )
            "#
        )
    }

    fn function_definition_query(&self) -> String {
        format!(
            r#"
            (
                [
                (class_specifier
                    name:(type_identifier)@{PARENT_TYPE}
                    body: (field_declaration_list
                        (function_definition
                                type : (_) @{RETURN_TYPES}
                                declarator: (function_declarator
                                    declarator : (field_identifier) @{FUNCTION_NAME}
                                    parameters: (parameter_list
                                        (parameter_declaration)@{ARGUMENTS}
                                    )?
                                )
                        )?@{FUNCTION_DEFINITION}
                    )
                )
                (struct_specifier
                    name: (type_identifier) @{PARENT_TYPE}
                    body: (field_declaration_list
                        (function_definition
                                type : (_) @{RETURN_TYPES}
                                declarator: (function_declarator
                                    declarator : (field_identifier) @{FUNCTION_NAME}
                                    parameters: (parameter_list
                                        (parameter_declaration)@{ARGUMENTS}
                                    )?
                                )
                        )?@{FUNCTION_DEFINITION}
                    )
                )?
                (function_definition
                                type : (_) @{RETURN_TYPES}
                                declarator: (function_declarator
                                    declarator : (identifier) @{FUNCTION_NAME}
                                    parameters: (parameter_list
                                        (parameter_declaration)@{ARGUMENTS}
                                    )?
                                )
                )@{FUNCTION_DEFINITION}
                ]
            )
            "#
        )
    }

    fn function_call_query(&self) -> String {
        format!(
            r#"
            (
            [
                (call_expression
                    function : (identifier)@{FUNCTION_NAME}
                    arguments: (argument_list)?@{ARGUMENTS}
                )@{FUNCTION_CALL}
                (expression_statement
                    (call_expression
                        function: (field_expression
                                argument: (identifier)@{OPERAND}
                                field : (field_identifier)@{FUNCTION_NAME}
                            )?
                        function: (qualified_identifier
                                scope: (namespace_identifier) @namespace
                                name: (identifier)@{FUNCTION_NAME}
                        )?
                        arguments: (argument_list)?@{ARGUMENTS}
                    )
                )@{FUNCTION_CALL}
            ]
            )
            "#
        )
    }

    fn data_model_query(&self) -> Option<String> {
        Some(format!(
            r#"
            (struct_specifier
                name: (type_identifier)@{STRUCT_NAME}
                body: (_)
            )@{STRUCT}
                
            "#
        ))
    }

    fn endpoint_finders(&self) -> Vec<String> {
        vec![format!(
            r#"[
                    (expression_statement
                        (call_expression
                        function: (call_expression
                            function: (identifier) @route_macro (#match? @route_macro "^CROW_(ROUTE|WEBSOCKET_ROUTE|BP_ROUTE)$")
                            arguments: (argument_list
                                (identifier) @{OPERAND}
                            (string_literal) @{ENDPOINT}
                            )
                        ) 
                    )@{ROUTE}
                    )
                    (call_expression
                    function: (call_expression
                        (field_expression
                            argument: (call_expression
                                function: (identifier) @route_macro (#match? @route_macro "^CROW_(ROUTE|WEBSOCKET_ROUTE|BP_ROUTE)$")
                                arguments: (argument_list
                                    (identifier) @{OPERAND}
                                    (string_literal) @{ENDPOINT}
                                )
                            ) 
                        )
                        arguments: (argument_list
                            (user_defined_literal)@{ENDPOINT_VERB}
                        )

                    )
                    )@{ROUTE}
                    ]
                "#
        )]
    }
}
