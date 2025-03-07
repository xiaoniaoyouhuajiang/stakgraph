### treesitter cli

cd into this dir (treesitter)

cargo install --locked tree-sitter-cli

--grammar-path tree-sitter-typescript/tsx

### typescript

git clone https://github.com/tree-sitter/tree-sitter-typescript.git

cd tree-sitter-typescript/tsx

tree-sitter build --wasm

tree-sitter playground 

### haml

git clone https://github.com/vitallium/tree-sitter-haml.git

cd tree-sitter-haml

tree-sitter build --wasm

tree-sitter playground

### erb

git clone https://github.com/tree-sitter/tree-sitter-embedded-template.git

cd tree-sitter-embedded-template

tree-sitter build --wasm

tree-sitter playground
