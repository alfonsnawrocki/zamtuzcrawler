#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

npm install webtorrent-cli -g
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install bt1337xearch
