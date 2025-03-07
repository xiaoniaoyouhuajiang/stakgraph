### cypher queries

Endpoints and Handlers

MATCH (e:Endpoint)-[r:HANDLER]->(n) RETURN e, r, n;

MATCH (repo:Repository name: stakwork/sphinx-tribes) RETURN repo;

MATCH (repo:Repository {{name: $repo_name}})-[:HAS]->(commit:Commit) RETURN repo as r, commit as n LIMIT 1
