docker stop neo4j.sphinx

docker rm neo4j.sphinx

sudo rm -rf .neo4j

mkdir .neo4j

mkdir .neo4j/data

mkdir .neo4j/logs

mkdir .neo4j/plugins

mkdir .neo4j/tmp

mkdir .neo4j/tmp/import

docker-compose up -d

docker logs neo4j.sphinx -f
