### language server protocol

The Dockerfile in this directory builds LSP binaries for a variety of lanuages. Use this docker image (`sphinxlightning/stakgraph-lsp`) as a base for other images.

### run

docker run --rm -it --entrypoint "/bin/bash" debian:bookworm

docker run --rm -it --entrypoint "/bin/bash" sphinxlightning/stakgraph-lsp

### run ast tests

in top level dir of this repo:

docker run --rm -it --entrypoint "/bin/bash" -v .:/root/stakgraph stakgraph-lsp
