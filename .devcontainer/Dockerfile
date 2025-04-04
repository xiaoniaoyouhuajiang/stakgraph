# Use rust as the build environment
FROM rust:1.84.0 AS builder

# Create app directory
WORKDIR /app

# Copy Rust project files
COPY ./ast ast
COPY ./lsp lsp
COPY ./mcp mcp
COPY ./skill skill
COPY ./standalone standalone

# Build the projects
RUN cargo build --release --manifest-path skill/Cargo.toml
RUN cargo build --release --manifest-path standalone/Cargo.toml

# Final Image
FROM sphinxlightning/stakgraph-lsp

# Update base image package installation
RUN apt-get update && apt-get install -y \
    openssl \
    pkg-config \
    libssl-dev \
    clang \
    cmake \
    && rm -rf /var/lib/apt/lists/* && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    export PATH="$HOME/.cargo/bin:$PATH" && \
    rustup install 1.84.0 && \
    rustup default 1.84.0

# Copy the compiled app from builder
COPY --from=builder /app/standalone/target/release/stakgraph-standalone /root
COPY --from=builder /app/skill/target/release/stakgraph-skill /root

# Set working directory
WORKDIR /root
