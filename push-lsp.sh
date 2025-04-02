docker buildx build --platform linux/amd64 -t stakgraph-lsp -f lsp/Dockerfile .

docker tag stakgraph-lsp sphinxlightning/stakgraph-lsp:latest

docker push sphinxlightning/stakgraph-lsp:latest
