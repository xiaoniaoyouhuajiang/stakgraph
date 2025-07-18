#!/bin/bash
# filepath: /Users/fayekelmith/Kelmith/Projects/stakgraph/standalone/tests/local_e2e.sh

REPO_URL="https://github.com/fayekelmith/demo-repo.git"
EXPECTED_MAP="./standalone/tests/maps/actual-map-response.html"
ACTUAL_MAP="./standalone/tests/maps/map-response.html"

# Cleanup database first
rm -rf ./mcp/.neo4j

#  Start Neo4j 
docker compose -f ./mcp/neo4j.yaml up -d

echo "Waiting for Neo4j to be healthy..."
until docker inspect --format "{{json .State.Health.Status }}" neo4j.sphinx | grep -q "healthy"; do
  echo "Neo4j is not ready yet..."
  sleep 5
done
echo "Neo4j is healthy!"

# Start the Rust Server (background)
export USE_LSP=false
cargo run --bin standalone --features neo4j > standalone.log 2>&1 &
RUST_PID=$!


# Wait for Rust server to be ready
echo "Waiting for Rust server on :7799..."
until curl -s http://localhost:7799/fetch-repos > /dev/null; do
  sleep 2
done
echo "Rust server is ready!"

# 3. Start the Nodejs Server 
cd mcp
yarn install 
yarn run dev > server.log 2>&1 &
NODE_PID=$!
cd ..


# Wait for Node server to be ready
echo "Waiting for Node server on :3000..."
until curl -s http://localhost:3000 > /dev/null; do
  sleep 2
done
echo "Node server is ready!"

# 4. INGEST repo data asynchronously
echo "Ingesting data from $REPO_URL"
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"repo_url\": \"$REPO_URL\"}" http://localhost:7799/ingest_async)
REQUEST_ID=$(echo "$RESPONSE" | grep -o '"request_id":"[^"]*' | grep -o '[^"]*$')

if [ -z "$REQUEST_ID" ]; then
  echo "Failed to get request_id from /ingest_async response: $RESPONSE"
  kill $RUST_PID $NODE_PID
  exit 1
fi

echo "Polling status for request_id: $REQUEST_ID"
while true; do
  STATUS_JSON=$(curl -s http://localhost:7799/status/$REQUEST_ID)
  STATUS=$(echo "$STATUS_JSON" | grep -o '"status":"[^"]*' | grep -o '[^"]*$')
  if [ "$STATUS" = "Complete" ]; then
    echo "Ingest complete!"
    break
  elif [[ "$STATUS" == Failed* ]]; then
    echo "Ingest failed: $STATUS_JSON"
    kill $RUST_PID $NODE_PID
    exit 1
  else
    echo "Still processing... ($STATUS)"
    sleep 3
  fi
done

# 5. Query /map endpoint
curl "http://localhost:3000/map?name=App&node_type=Function" -o "$ACTUAL_MAP"


# Remove <pre> tags and sort the content before comparing
grep -v '^<pre>' "$ACTUAL_MAP" | grep -v '^</pre>' | grep -v 'Total tokens:' | sort > /tmp/sorted_actual.html
grep -v '^<pre>' "$EXPECTED_MAP" | grep -v '^</pre>' | grep -v 'Total tokens:' | sort > /tmp/sorted_expected.html

if diff --color=always -u /tmp/sorted_expected.html /tmp/sorted_actual.html; then
  echo "✅ Output matches expected (order-insensitive)"
else
  echo "❌ Output does not match expected"
  kill $RUST_PID $NODE_PID
  exit 1
fi


# 7. Compare output
# if diff --color=always -u "$EXPECTED_MAP" "$ACTUAL_MAP"; then
#   echo "✅ Output matches expected"
# else
#   echo "❌ Output does not match expected"
#   kill $RUST_PID $NODE_PID
#   exit 1
# fi

#  Cleanup
kill $RUST_PID $NODE_PID
