use tree_sitter::Language;

#[allow(dead_code)]
pub struct Bash(Language);

impl Bash {
    pub fn new() -> Self {
        Bash(tree_sitter_bash::LANGUAGE.into())
    }
}
