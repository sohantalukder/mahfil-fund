#!/usr/bin/env bash

set -euo pipefail

# Usage:
# 1. Fill in imageUrl/codeUrl values in manifest.json for each Stitch screen.
# 2. From the repo root, run:
#      bash design/stitch/dashboard/download-assets.sh
#
# Assets will be saved into:
#   - design/stitch/dashboard/images/
#   - design/stitch/dashboard/code/

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
MANIFEST="$ROOT_DIR/design/stitch/dashboard/manifest.json"
IMAGES_DIR="$ROOT_DIR/design/stitch/dashboard/images"
CODE_DIR="$ROOT_DIR/design/stitch/dashboard/code"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required to parse manifest.json. Install jq and re-run." >&2
  exit 1
fi

echo "Reading Stitch dashboard manifest from: $MANIFEST"

count=$(jq 'length' "$MANIFEST")
echo "Found $count entries in manifest."

for row in $(jq -c '.[]' "$MANIFEST"); do
  id=$(echo "$row" | jq -r '.id')
  name=$(echo "$row" | jq -r '.name')
  slug=$(echo "$row" | jq -r '.slug')
  imageFile=$(echo "$row" | jq -r '.imageFile')
  codeFile=$(echo "$row" | jq -r '.codeFile')
  imageUrl=$(echo "$row" | jq -r '.imageUrl')
  codeUrl=$(echo "$row" | jq -r '.codeUrl')

  echo ""
  echo "=== $name ($id) ==="

  if [ -n "$imageUrl" ] && [ "$imageUrl" != "null" ]; then
    imagePath="$IMAGES_DIR/$imageFile"
    echo "Downloading image -> $imagePath"
    curl -L "$imageUrl" -o "$imagePath"
  else
    echo "Skipping image download (imageUrl is empty)."
  fi

  if [ -n "$codeUrl" ] && [ "$codeUrl" != "null" ]; then
    codePath="$CODE_DIR/$codeFile"
    echo "Downloading code -> $codePath"
    curl -L "$codeUrl" -o "$codePath"
  else
    echo "Skipping code download (codeUrl is empty)."
  fi
done

echo ""
echo "Done. Check $IMAGES_DIR and $CODE_DIR for downloaded assets."

