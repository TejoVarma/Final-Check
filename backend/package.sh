#!/usr/bin/env bash
# Builds an Elastic Beanstalk source bundle: dist/backend-<git-sha>.zip
# Upload it in the EB console (Upload and deploy) or with `eb deploy`.
set -euo pipefail
cd "$(dirname "$0")"

files=(Procfile requirements.txt app)

version=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)
# Mark the bundle dirty only if something that goes into it differs from the commit.
if [ -n "$(git status --porcelain -- "${files[@]}" 2>/dev/null)" ]; then
  version="$version-dirty"
fi
out="dist/backend-$version.zip"

mkdir -p dist
rm -f "$out"
# Procfile and requirements.txt must sit at the zip root for Beanstalk.
zip -rq "$out" "${files[@]}" -x '*/__pycache__/*' '*.pyc' '.DS_Store'

echo "Created backend/$out"
unzip -l "$out" | tail -n +4 | sed '$d' | sed '$d' | awk '{print "  " $4}'
