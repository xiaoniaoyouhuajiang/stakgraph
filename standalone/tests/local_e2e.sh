#!/bin/bash
# filepath: /Users/fayekelmith/Kelmith/Projects/stakgraph/standalone/tests/local_e2e.sh

REPO_URL="https://github.com/fayekelmith/demo-repo.git"
EXPECTED_MAP="./standalone/tests/map.html"
ACTUAL_MAP="./standalone/tests/actual-map-response.html"

# 1. Start Neo4j 
docker compose -f ./mcp/neo4j.yaml up -d

echo "Waiting for Neo4j to be healthy..."
until docker inspect --format "{{json .State.Health.Status }}" neo4j.sphinx | grep -q "healthy"; do
  echo "Neo4j is not ready yet..."
  sleep 5
done
echo "Neo4j is healthy!"

# 2. Start the Rust Server (background)
export USE_LSP=false
cargo run --bin standalone --features neo4j > standalone.log 2>&1 &
RUST_PID=$!
sleep 10

# 3. Start the Nodejs Server 
cd mcp
yarn install 
yarn run dev > server.log 2>&1 &
NODE_PID=$!
cd ..
sleep 10

# 4. INGEST repo data
echo "Ingesting data from $REPO_URL"
curl -X POST -H "Content-Type: application/json" -d "{\"repo_url\": \"$REPO_URL\"}" http://localhost:7799/ingest

echo "Ingested data from $REPO_URL"

# 5. Query /map endpoint
curl "http://localhost:3000/map?name=App&node_type=Function" -o "$ACTUAL_MAP"


# 7. Compare output
# SORTED_ACTUAL="/tmp/sorted_actual.html"
# SORTED_EXPECTED="/tmp/sorted_expected.html"
# sed '1d;$d' "$ACTUAL_MAP" | sed 's/^[[:space:]]*[├└│┬─][├└│┬─[:space:]]*//' | sort > "$SORTED_ACTUAL"
# sed '1d;$d' "$EXPECTED_MAP" | sed 's/^[[:space:]]*[├└│┬─][├└│┬─[:space:]]*//' | sort > "$SORTED_EXPECTED"

# if diff --color=always -u "$SORTED_EXPECTED" "$SORTED_ACTUAL"; then
#   echo "✅ Output matches expected"
# else
#   echo "❌ Output does not match expected"
#   kill $RUST_PID $NODE_PID
#   exit 1
# fi

# 8. Cleanup
# kill $RUST_PID $NODE_PID
