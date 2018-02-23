#!/usr/bin/env bash

## Will run a few conodes, create a new skipchain, store a file inside 
# and copy the public and genesis file in the current directoy. You can give an
# argument as the file to store. It will be stored under the key "test"
currDir=$(pwd)
ciscPath="$GOPATH/src/github.com/dedis/cothority/cisc"
file=$1
if [ -f "$file" ]; then
    file=$(realpath $file)
    echo "[+] recording the file $file"
fi
echo "[+] pkill any other potential instances"
ps x | grep start_test | cut -f1 -d" " | xargs kill
pkill conode
echo "[+] Chdir to the cisc directory"
cd "$ciscPath"
rm -r "$ciscPath/build"
echo "[+] Starting the local conodes in background (log > out.log)"
$ciscPath/start_test.sh $file -nt &
pid=$!
sleep 6

echo "[+] Copying public.toml & genesis.txt" 
cp "build/public.toml" "$currDir/public.toml"
cp "build/genesis.txt" "$currDir/genesis.txt"

echo "[+] Waiting endlessly ..."
wait $pid
