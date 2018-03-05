#!/usr/bin/env bash

# This script deploys a given csv file to 
# - the skipchain using a locally installed cisc
# - the ethereum blockchain using the cli application from geens

if [ ! -f "$1" ];
    echo "CSV file is needed in argument. exit"
    exit 1
fi

csv=$1
key="sl2018-1"

# push to skipchain first
cisc kv file "$csv" --key "$key"

# add to ethereum
cd geens/cli
node index "$csv"
cp data.json ../../data.json
#ssh agora571@77.104.141.14 -p18765
