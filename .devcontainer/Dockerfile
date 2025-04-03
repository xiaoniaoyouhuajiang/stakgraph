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

# Build Rust projects
RUN cargo build --release --manifest-path standalone/Cargo.toml
RUN cargo build --release --manifest-path skill/Cargo.toml

# LSP Final Image for the standalone app
FROM debian:bookworm

# Install dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    libssl-dev \
    pkg-config \
    linux-headers-generic \
    sed \
    curl \
    npm \
    yarn \
    nodejs \
    git \
    python3-full \
    python3-pip \
    ruby \
    ruby-dev \
    libyaml-dev \
    build-essential \
    automake \
    gcc \
    clang \
    cmake \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Install Docker Compose
RUN curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Rust Analyzer
RUN curl -LO "https://github.com/rust-lang/rust-analyzer/releases/download/2025-01-20/rust-analyzer-x86_64-unknown-linux-gnu.gz"
RUN gzip -cd rust-analyzer-x86_64-unknown-linux-gnu.gz > /bin/rust-analyzer
RUN chmod +x /bin/rust-analyzer

# Copy the compiled app from builder
COPY --from=builder /app/standalone/target/release/stakgraph-standalone /root
COPY --from=builder /app/skill/target/release/stakgraph-skill /root

# Set working directory
WORKDIR /root
