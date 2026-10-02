#!/bin/sh
# Prints a fingerprint of a live page's <main> (nonces and tokens stripped). Usage: scripts/fingerprint.sh <path>
curl -s "https://www.ecoveritas.com/$1" | tr -d '\n' | grep -o '<main.*</main>' | sed 's/nonce="[^"]*"//g; s/value="[A-Za-z0-9_-]\{30,\}"//g' | md5sum | cut -c1-12
