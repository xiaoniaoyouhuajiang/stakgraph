# stakgraph

A source code parser using treesitter, LSP, and neo4j. Powering software knowledge graphs for AI agents.

![img](./mcp/docs/sg.png)

### parse a repo

Example of parsing [sphinx-tribes](https://github.com/stakwork/sphinx-tribes) and [sphinx-tribes-frontend](https://github.com/stakwork/sphinx-tribes-frontend). Endpoints, Requests, and E2E tests are linked between the two repos.

```bash
export REPO_URLS="https://github.com/stakwork/sphinx-tribes.git,https://github.com/stakwork/sphinx-tribes-frontend.git"
cargo run --bin urls
```

### language support

- [x] Golang
- [x] React
- [x] Ruby on Rails
- [x] Typescript
