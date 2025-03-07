use tree_sitter::{Language, Parser, Query, Tree};

pub struct Toml(Language);

impl Toml {
    pub fn new() -> Self {
        Toml(tree_sitter_toml_ng::LANGUAGE.into())
    }
}
