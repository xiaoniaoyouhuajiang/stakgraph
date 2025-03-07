// NOTE: find_trait_operand uses GotoDeclaration for rust-analyzer

fn lib_query_lang(&self) -> Option<lsp::Language> {
    Some(lsp::Language::Toml)
}
fn lib_query() -> String {
    format!(
        r#"(table
    (bare_key) @deps (#match? @deps "^(dependencies|devDependencies)$")
    (pair
        (bare_key) @name
        (string) @version
    )
)"#
    )
}
