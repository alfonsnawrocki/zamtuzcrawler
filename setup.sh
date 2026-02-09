#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

npm install webtorrent-cli -g
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install bt1337xearch

mkdir downloads
cd downloads/

# search: 
echo "bt1337xearch -n "nicollubin" 
echo  "webtorrent download $(MAGNETLNK)"  

# to share: 
go run github.com/eliben/static-server@latest
