# try it out

### install LSP

##### typescript

`npm install -g typescript-language-server`

##### go

`go install golang.org/x/tools/gopls@latest`

### generate graph data (in stakgraph top level dir)

export REPO_URL="https://github.com/stakwork/sphinx-tribes.git,https://github.com/stakwork/sphinx-tribes-frontend.git"
export OUTPUT_FORMAT=jsonl
cargo run --bin urls

### load data into neo4j (in this dir)

docker-compose -f neo4j.yaml up -d
