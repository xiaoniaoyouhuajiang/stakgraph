### openapi

redocly build-docs src/swagger.yaml

### dev

yarn dev

### run the graph

docker-compose -f neo4j.yaml up -d

docker-compose -f neo4j.yaml down

### upload files

curl -X POST \
 -F "nodes=@./ast/examples/urls-nodes.jsonl" \
 -F "edges=@./ast/examples/urls-edges.jsonl" \
 http://localhost:3000/upload

curl -X POST \
 -F "nodes=@./ast/examples/tribes-nodes.jsonl" \
 -F "edges=@./ast/examples/tribes-edges.jsonl" \
 http://localhost:3000/upload

curl -X POST \
 -F "nodes=@./ast/examples/stak-nodes.jsonl" \
 -F "edges=@./ast/examples/stak-edges.jsonl" \
 http://localhost:3000/upload

### set up in cursor

Cursor Settings -> Features -> MCP Servers -> Add New

sse, http://localhost:3000/sse

Composer -> Agent Mode will have access to the tool

### cypher

```
MATCH (page:Page)
    WHERE page.name = '/p/:uuid/assigned'
    OPTIONAL MATCH (page)-[:RENDERS]->(rendered_func:Function)
return page, rendered_func
```

##### feature

```cypher
MATCH (page:Page)
WHERE page.name = '/leaderboard'
OPTIONAL MATCH render_path = (page)-[:RENDERS]->(initial_func:Function)-[:CALLS*0..4]->(func:Function)
OPTIONAL MATCH (func)-[:CALLS]->(request:Request)
OPTIONAL MATCH (request)-[:CALLS]->(endpoint:Endpoint)
OPTIONAL MATCH handler_path = (endpoint)-[:HANDLER]->(handler_func:Function)-[:CALLS*0..4]->(handler_called_func:Function)
OPTIONAL MATCH (class:Class)-[:CONTAINS]->(func)
OPTIONAL MATCH (class:Class)-[:CONTAINS]->(handler_called_func)
OPTIONAL MATCH (func)-[:CONTAINS]->(data_model:Datamodel)
OPTIONAL MATCH (handler_called_func)-[:CONTAINS]->(handler_data_model:Datamodel)
OPTIONAL MATCH (test:Test)-[:CALLS]->(func)
OPTIONAL MATCH (test:Test)-[:CALLS]->(handler_called_func)
OPTIONAL MATCH (e2e:E2eTest)-[:CALLS]->(func)
OPTIONAL MATCH (e2e:E2eTest)-[:CALLS]->(handler_called_func)

RETURN DISTINCT
    page,
    collect(DISTINCT render_path) as render_paths,
    collect(DISTINCT handler_path) as handler_paths,
    collect(DISTINCT initial_func) as rendered_functions,
    collect(DISTINCT func) as all_called_functions,
    collect(DISTINCT request) as requests,
    collect(DISTINCT endpoint) as endpoints,
    collect(DISTINCT handler_func) as handler_functions,
    collect(DISTINCT handler_called_func) as handler_called_functions,
    collect(DISTINCT class) as classes,
    collect(DISTINCT data_model) as data_models,
    collect(DISTINCT handler_data_model) as handler_data_models,
    collect(DISTINCT test) as tests,
    collect(DISTINCT e2e) as e2e_tests
```

##### filter out empty functions

```cypher
MATCH (page:Page)
WHERE page.name = '/leaderboard'
OPTIONAL MATCH render_path = (page)-[:RENDERS]->(initial_func:Function)-[:CALLS*0..4]->(func:Function)-[:CALLS]->(request:Request)
WHERE ALL(f IN nodes(render_path) WHERE
    (f:Function AND f.body <> '') OR
    NOT f:Function)
OPTIONAL MATCH (request)-[:CALLS]->(endpoint:Endpoint)
OPTIONAL MATCH handler_path = (endpoint)-[:HANDLER]->(handler_func:Function)-[:CALLS*0..4]->(handler_called_func:Function)
WHERE ALL(f IN nodes(handler_path) WHERE
    (f:Function AND f.body <> '') OR
    NOT f:Function)
OPTIONAL MATCH (class:Class)-[:CONTAINS]->(func)
OPTIONAL MATCH (class:Class)-[:CONTAINS]->(handler_called_func)
OPTIONAL MATCH (func)-[:CONTAINS]->(data_model:Datamodel)
OPTIONAL MATCH (handler_called_func)-[:CONTAINS]->(handler_data_model:Datamodel)
OPTIONAL MATCH (test:Test)-[:CALLS]->(func)
OPTIONAL MATCH (test:Test)-[:CALLS]->(handler_called_func)
OPTIONAL MATCH (e2e:E2eTest)-[:CALLS]->(func)
OPTIONAL MATCH (e2e:E2eTest)-[:CALLS]->(handler_called_func)

RETURN DISTINCT
    page,
    collect(DISTINCT render_path) as render_paths,
    collect(DISTINCT handler_path) as handler_paths,
    collect(DISTINCT initial_func) as rendered_functions,
    collect(DISTINCT func) as all_called_functions,
    collect(DISTINCT request) as requests,
    collect(DISTINCT endpoint) as endpoints,
    collect(DISTINCT handler_func) as handler_functions,
    collect(DISTINCT handler_called_func) as handler_called_functions,
    collect(DISTINCT class) as classes,
    collect(DISTINCT data_model) as data_models,
    collect(DISTINCT handler_data_model) as handler_data_models,
    collect(DISTINCT test) as tests,
    collect(DISTINCT e2e) as e2e_tests
```

### stak

```cypher
MATCH (f1:Function {name: 'App'})-[:CALLS]->(r:Request)-[:CALLS]->(e:Endpoint)-[:HANDLER]->(f2:Function)-[:CONTAINS]->(d:Datamodel),
(c:Class)-[:OPERAND]->(f2)
RETURN f1, r, e, f2, d, c
```

```cypher
MATCH (r:Request)-[:CALLS]->(e:Endpoint)-[:HANDLER]->(f1:Function)-[:CONTAINS]->(d:Datamodel {name: 'tutorials'}),
(p:Page)-[:RENDERS]->(f1),
(c:Class)-[:OPERAND]->(f1)
RETURN f1, r, e, d, p, c
```

### docker

docker run --rm -p 3000:3000 -e NEO4J_HOST=host.docker.internal repo2graph

docker build -t repo2graph .

docker tag repo2graph sphinxlightning/repo2graph:latest

docker push sphinxlightning/repo2graph:latest

### build for swarm:

make sure you are in mcp dir

docker buildx build --platform linux/amd64 -t sphinxlightning/repo2graph:latest . --push

### get

curl "http://localhost:3000/feature_code?page_name=%2Fleaderboard"

[
'https://github.com/stakwork/sphinx-tribes/commit/22a866b12268a928d500530fc352fa26e4def1ff',
'https://github.com/stakwork/sphinx-tribes-frontend/commit/ecc64bd268df0b108fbef56f1eeb7c32a76d6717'
]

curl "https://mcp.repo2graph.sphinx.chat/feature_code?page_name=%2Fleaderboard"
