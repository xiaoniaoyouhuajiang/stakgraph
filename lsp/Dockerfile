FROM debian:bookworm

# deps
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    libssl-dev \
    pkg-config \
    curl \
    git \
    npm \
    nodejs \
    python3-full \
    python3-pip \
    ruby \
    ruby-dev \
    libyaml-dev \
    # ruby build dependencies for compiling arbitrary ruby versions
    libreadline-dev \
    zlib1g-dev \
    libffi-dev \
    libgdbm-dev \
    libncurses5-dev \
    libxml2-dev \
    libxslt1-dev \
    liblzma-dev \
    default-jdk \
    openjdk-17-jre-headless \
    unzip \
    build-essential \
    automake \
    gcc \
    g++ \
    sed \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME for Kotlin LSP
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o rustup.sh \
    && chmod +x rustup.sh \
    && ./rustup.sh -y

# python
RUN pip install python-lsp-server --break-system-packages

# js
RUN npm install -g typescript typescript-language-server

# go
WORKDIR /tmp
RUN curl -O https://dl.google.com/go/go1.23.2.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.23.2.linux-amd64.tar.gz \
    && rm go1.23.2.linux-amd64.tar.gz

ENV GOROOT=/usr/local/go
ENV GOPATH=/root/go
ENV PATH=$PATH:$GOROOT/bin:$GOPATH/bin

# Install gopls without CGO
RUN mkdir -p $GOPATH/bin \
    && CGO_ENABLED=0 go install -v golang.org/x/tools/gopls@v0.16.2

# ruby
# Install ruby language servers (global) and provide asdf for per-project Rubies
RUN gem install --no-document ruby-lsp solargraph bundler || true

# Install asdf to allow installing arbitrary Ruby versions per-project
SHELL ["/bin/bash", "-lc"]
RUN set -eux; \
    ASDF_DIR=/root/.asdf; \
    git clone https://github.com/asdf-vm/asdf.git "$ASDF_DIR" --branch v0.12.0; \
    echo ". $ASDF_DIR/asdf.sh" > /etc/profile.d/asdf.sh; \
    # Use bash to source asdf and run its commands
    . $ASDF_DIR/asdf.sh; \
    asdf plugin-add ruby https://github.com/asdf-vm/asdf-ruby.git || true; \
    # Provide a default ruby so tools can run if needed
    ASDF_DEFAULT_RUBY=3.2.2; \
    if ! asdf list ruby | grep -q "$ASDF_DEFAULT_RUBY" 2>/dev/null; then \
        asdf install ruby "$ASDF_DEFAULT_RUBY" || true; \
        asdf global ruby "$ASDF_DEFAULT_RUBY" || true; \
    fi; \
    # ensure bundler and LSP gems are available for the asdf-installed ruby as well
    . $ASDF_DIR/asdf.sh; \
    gem install --no-document bundler ruby-lsp solargraph || true
SHELL ["/bin/sh", "-c"]

# rust-analyzer
RUN curl -LO "https://github.com/rust-lang/rust-analyzer/releases/download/2025-01-20/rust-analyzer-x86_64-unknown-linux-gnu.gz" \
    && gzip -cd rust-analyzer-x86_64-unknown-linux-gnu.gz > /bin/rust-analyzer \
    && chmod +x /bin/rust-analyzer

# kotlin-language-server (robust)

RUN set -eux; \
    mkdir -p /opt/kotlin-language-server /tmp/kls; \
    echo "Downloading kotlin-language-server..."; \
    curl -fSL --create-dirs -o /tmp/kls/kls.zip "https://github.com/fwcd/kotlin-language-server/releases/latest/download/server.zip"; \
    unzip /tmp/kls/kls.zip -d /tmp/kls; \
    # Copy the contents
    if [ -d /tmp/kls/server ]; then \
        cp -r /tmp/kls/server/* /opt/kotlin-language-server/; \
    else \
        echo "ERROR: /tmp/kls/server directory not found after unzip"; \
        ls -la /tmp/kls; \
        exit 1; \
    fi; \
    # create a symlink for the expected executable name; fail if not found
    if [ -f /opt/kotlin-language-server/bin/kotlin-language-server ]; then \
        ln -sf /opt/kotlin-language-server/bin/kotlin-language-server /usr/local/bin/kotlin-language-server; \
    elif [ -f /opt/kotlin-language-server/kotlin-language-server ]; then \
        ln -sf /opt/kotlin-language-server/kotlin-language-server /usr/local/bin/kotlin-language-server; \
    else \
        echo "ERROR: kotlin-language-server executable not found in /opt/kotlin-language-server"; \
        echo "Listing /opt and /tmp/kls for debugging:"; ls -la /opt/kotlin-language-server || true; ls -la /tmp/kls || true; \
        exit 1; \
    fi; \
    chmod +x /usr/local/bin/kotlin-language-server; \
    rm -rf /tmp/kls