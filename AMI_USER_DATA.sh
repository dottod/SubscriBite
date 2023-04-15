#!/bin/bash

sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo setfacl --modify user:ec2-user:rw /var/run/docker.sock
docker info
sudo systemctl start docker
sudo yum install git -y