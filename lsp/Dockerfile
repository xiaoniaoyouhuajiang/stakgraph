FROM debian:bookworm

# deps
RUN apt-get update
RUN apt-get install -y ca-certificates openssl
RUN apt-get install -y linux-headers-generic
RUN apt update
RUN apt-get update
RUN apt install -y sed curl
RUN apt install -y git
RUN apt install -y npm nodejs
RUN apt install -y python3-full python3-pip

# rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o rustup.sh
RUN chmod +x rustup.sh
RUN ./rustup.sh -y

# python
RUN pip install python-lsp-server --break-system-packages

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