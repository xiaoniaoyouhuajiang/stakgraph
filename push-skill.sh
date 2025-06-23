# docker build -t stakgraph-skill --platform linux/amd64 --provenance=false .

aws ecr get-login-password --region us-east-1 --profile AdministratorAccess-745666712914 | docker login --username AWS --password-stdin 745666712914.dkr.ecr.us-east-1.amazonaws.com
docker buildx build --load --platform linux/amd64 -t stakgraph-skill -f Dockerfile.skill .
docker tag stakgraph-skill:latest 745666712914.dkr.ecr.us-east-1.amazonaws.com/stackgraph-engine:latest
docker push 745666712914.dkr.ecr.us-east-1.amazonaws.com/stackgraph-engine:latest