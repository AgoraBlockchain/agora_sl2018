#!/usr/bin/env bash

set -x

# This script deploys a given csv file to 
# - the skipchain using a locally installed cisc
# - the ethereum blockchain using the cli application from geens

csv="$1"
key="$2"

# push to skipchain first
cisc kv file "$csv" --key "$key"

# add to ethereum
cd geens/cli
node index ../../"$csv"
cp data.json ../../data/data.json

# go back and upload git
cd ../../
git add data
git commit -am "deployement"
git push agora wss

ssh agora571@77.104.141.14 -p18765 << EOF
cd agora_sl2018
git pull agora wss
EOF
