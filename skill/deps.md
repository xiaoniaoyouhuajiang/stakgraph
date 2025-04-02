### container deps

`docker run --rm -it -v ./bin:/var/task --entrypoint "/bin/bash" fedora:42`

```sh
dnf install -y git sed npm
npm install -g typescript typescript-language-server
dnf install -y make automake gcc gcc-c++ kernel-devel
dnf install -y ruby ruby-devel libyaml-devel
gem install ruby-lsp
dnf install -y golang
go install -v golang.org/x/tools/gopls@v0.16.2
export GOPATH=$HOME/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin
dnf install -y rust cargo
curl -LO "https://github.com/rust-lang/rust-analyzer/releases/download/2025-01-20/rust-analyzer-x86_64-unknown-linux-gnu.gz"
gzip -cd rust-analyzer-x86_64-unknown-linux-gnu.gz > /bin/rust-analyzer
chmod +x /bin/rust-analyzer
```

### test

docker run --rm -it --entrypoint "/bin/bash" stakgraph-skill

export RUST_LOG=debug
export REPO_URL=https://github.com/stakwork/sphinx-tribes.git
export WEBHOOK_URL=http://localhost:3000
export LANGUAGE=go
export USE_LSP=true

/root/stakgraph-skill

### test

docker run --rm -it --entrypoint "/bin/bash" public.ecr.aws/amazonlinux/amazonlinux:2023

docker run --rm -it --entrypoint "/bin/bash" stakgraph-skill

docker run --rm -e WEBHOOK_URL=http://localhost:3000 -e REPO_URL=https://github.com/stakwork/sphinx-tribes.git -e RUST_LOG=debug stakgraph-skill

or

export WEBHOOK_URL=http://localhost:3000
export REPO_URL=https://github.com/stakwork/sphinx-tribes.git
export RUST_LOG=debug
cargo run --bin stakgraph-skill

### test w debian

docker run --rm -it --entrypoint "/bin/bash" debian:bookworm

apt-get update
apt-get install -y ca-certificates openssl
apt-get install -y linux-headers-generic

apt update
apt install -y sed curl npm nodejs git

npm install -g typescript typescript-language-server

curl -O https://dl.google.com/go/go1.23.2.linux-amd64.tar.gz
tar xvf go1.23.2.linux-amd64.tar.gz
chown -R root:root ./go
mv go /root
export PATH=$PATH:$GOROOT/bin:/root/go/bin
go version
go install -v golang.org/x/tools/gopls@v0.16.2

apt install -y ruby build-essential automake gcc g++
apt install -y ruby ruby-dev libyaml-dev
gem install ruby-lsp

<!-- apt install -y golang-go -->

export GOPATH=/root/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

apt-get install linux-headers-generic
apt install -y ruby build-essential automake gcc g++

### lsp image

docker run --rm -it --entrypoint "/bin/bash" stakgraph-lsp
