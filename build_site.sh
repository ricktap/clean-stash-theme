#!/usr/bin/env bash
# Builds a Stash plugin source: one zip per plugin plus index.yml.
# Usage: ./build_site.sh [output-dir]   (default: _site)
#
# Stash reads index.yml, downloads <path>, checks <sha256>, and offers an
# update whenever <date> is newer than the installed one. The date is the
# last commit that touched the plugin's folder, so every pushed change to a
# plugin becomes an update in Stash.
set -euo pipefail

cd "$(dirname "$0")"
OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"
INDEX="$OUT/index.yml"
: > "$INDEX"

for dir in plugins/*/; do
  dir="${dir%/}"
  id="$(basename "$dir")"
  manifest="$dir/$id.yml"
  if [[ ! -f "$manifest" ]]; then
    echo "skip $dir: no $id.yml" >&2
    continue
  fi

  name="$(sed -n 's/^name:[[:space:]]*//p' "$manifest" | head -1)"
  description="$(sed -n 's/^description:[[:space:]]*//p' "$manifest" | head -1)"
  base_version="$(sed -n 's/^version:[[:space:]]*//p' "$manifest" | head -1)"
  hash="$(git log -n 1 --pretty=format:%h -- "$dir")"
  date="$(TZ=UTC git log -n 1 --date='format-local:%Y-%m-%d %H:%M:%S' --pretty=format:%cd -- "$dir")"
  version="${base_version:-0}-${hash}"

  # files at the zip root: Stash unpacks them into plugins/<source>/<id>/
  zip_path="$OUT/$id.zip"
  (cd "$dir" && zip -q -r -X "../../$zip_path" . -x '.*')
  sha="$(sha256sum "$zip_path" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$zip_path" | cut -d' ' -f1)"

  cat >> "$INDEX" <<EOF
- id: $id
  name: $name
  metadata:
    description: $description
  version: $version
  date: $date
  path: $id.zip
  sha256: $sha

EOF
  echo "built $id $version ($date)"
done
