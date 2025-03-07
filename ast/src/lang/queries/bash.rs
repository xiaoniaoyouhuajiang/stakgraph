use tree_sitter::{Language, Parser, Query, Tree};

pub struct Bash(Language);

impl Bash {
    pub fn new() -> Self {
        Bash(tree_sitter_bash::LANGUAGE.into())
    }
}
