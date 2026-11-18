#!/bin/sh
# Send a notification to everyone subscribed: push/announce.sh "Title" "Body" [url]
# The token lives outside the repo, in ~/.config/jailbreakme/announce-token (the Worker's ANNOUNCE_TOKEN secret).
set -eu
W=https://jailbreakme-push.ry-ha.workers.dev
TOKEN=$(cat ~/.config/jailbreakme/announce-token)
BODY=$(python3 -c 'import json,sys; print(json.dumps({"title":sys.argv[1],"body":sys.argv[2],"url":sys.argv[3]}))' "$1" "$2" "${3:-https://jailbreakme.dev/}")
cursor=""
while :; do
  out=$(curl -sf -XPOST "$W/announce${cursor:+?cursor=$cursor}" -H "Authorization: Bearer $TOKEN" -d "$BODY")
  echo "$out"
  cursor=$(printf %s "$out" | python3 -c 'import json,sys; print(json.load(sys.stdin)["cursor"] or "")')
  [ -n "$cursor" ] || break
done
