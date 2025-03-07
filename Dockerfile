
# Use rust as the build environment
FROM rust:1.84.0 as builder

# Create app directory
WORKDIR /app

# Copy the srcs and Cargo.tomls
COPY ast/src ast/src
COPY ast/Cargo.toml ast/Cargo.toml
COPY lsp/src lsp/src
COPY lsp/Cargo.toml lsp/Cargo.toml
COPY stackgraph/src stackgraph/src
COPY stackgraph/Cargo.toml stackgraph/Cargo.toml

# Build the release version of your application
RUN cargo build --release --manifest-path stackgraph/Cargo.toml

# debian final image
FROM debian:bookworm

# deps
RUN apt-get update
RUN apt-get install -y ca-certificates openssl
RUN apt-get install -y linux-headers-generic
RUN apt update
RUN apt install -y sed curl npm nodejs git

# js
RUN npm install -g typescript typescript-language-server

# go
RUN curl -O https://dl.google.com/go/go1.23.2.linux-amd64.tar.gz
RUN tar xvf go1.23.2.linux-amd64.tar.gz
RUN chown -R root:root ./go
RUN mv go /root
ENV GOPATH=/root/go
ENV PATH=$PATH:$GOROOT/bin:/root/go/bin
RUN go install -v golang.org/x/tools/gopls@v0.16.2

# ruby
RUN apt install -y ruby build-essential automake gcc g++
RUN apt install -y ruby ruby-dev libyaml-dev
RUN gem install ruby-lsp

# rust
RUN curl -LO "https://github.com/rust-lang/rust-analyzer/releases/download/2025-01-20/rust-analyzer-x86_64-unknown-linux-gnu.gz"
RUN gzip -cd rust-analyzer-x86_64-unknown-linux-gnu.gz > /bin/rust-analyzer
RUN chmod +x /bin/rust-analyzer

COPY --from=builder /app/stackgraph/target/release/stackgraph /root

CMD ["/root/stackgraph"]
