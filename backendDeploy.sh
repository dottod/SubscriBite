#!/bin/bash

cd /home/ec2-user/subscribite/backendServices;
docker build -t edevgan/backend .;
if docker ps --format '{{.Names}}' | grep -q '^backend$'; then docker stop backend; docker rm backend; fi
docker run -d --name backend -p 80:4000 edevgan/backend;