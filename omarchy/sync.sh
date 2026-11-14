#!/bin/bash

# Refreshes the orc.pictures catalog and the poster stills the overlay draws.
#
#   <cache>/catalog.json                          the live catalog, once it validates
#   <cache>/posters/{orc,videorc}/{slug}.{rev}.jpg one still per GIF and style
#
# Only https://orc.pictures is contacted. Every path comes from the catalog and
# is checked against a fixed pattern before it reaches curl; nothing from the
# network is ever run. Posters already on disk are not downloaded again.
#
# Usage: sync.sh <cache-dir> [<fallback-catalog.json>]

set -uo pipefail

ORIGIN="https://orc.pictures"
cache=${1:-}
fallback=${2:-}
[[ $cache == /* ]] || { echo "sync.sh: cache dir must be absolute" >&2; exit 1; }
command -v curl >/dev/null && command -v jq >/dev/null || exit 0

mkdir -p "$cache/posters/orc" "$cache/posters/videorc"
# Leftovers of a sync that was killed mid-download.
rm -f "$cache"/posters/orc/*.part "$cache"/posters/videorc/*.part

curl_safe() {
  curl --proto '=https' --proto-redir '=https' --fail --silent --show-error \
    --location --max-redirs 3 --connect-timeout 10 "$@"
}

catalog="$cache/catalog.json"
tmp="$cache/.catalog.$$.json"
if curl_safe --max-time 20 --max-filesize 2000000 -o "$tmp" "$ORIGIN/catalog.json" &&
  jq -e 'type == "array" and length > 0' "$tmp" >/dev/null 2>&1; then
  mv -f "$tmp" "$catalog"
else
  rm -f "$tmp"
fi

source_catalog=$catalog
[[ -s $source_catalog ]] || source_catalog=$fallback
[[ -s $source_catalog ]] || exit 0

slug_re='^[a-z0-9]+(-[a-z0-9]+)*$'
rev_re='^[a-f0-9]{8,64}$'
orc_re='^/gifs/[a-z0-9]+(-[a-z0-9]+)*\.jpg$'
videorc_re='^/gifs/videorc/[a-z0-9]+(-[a-z0-9]+)*\.jpg$'

args=()
parts=()
declare -A wanted=()
while IFS=$'\t' read -r style slug poster rev; do
  [[ $slug =~ $slug_re && ${#slug} -le 80 ]] || continue
  case $style in
    orc) [[ $poster =~ $orc_re ]] || continue ;;
    videorc) [[ $poster =~ $videorc_re ]] || continue ;;
    *) continue ;;
  esac
  [[ $rev =~ $rev_re ]] || rev=""
  dest="$cache/posters/$style/$slug.${rev:-current}.jpg"
  wanted[$dest]=1
  wanted["$cache/gifs/$style/$slug.${rev:-current}.gif"]=1
  [[ -s $dest ]] && continue
  args+=(-o "$dest.part" "$ORIGIN$poster")
  parts+=("$dest")
done < <(jq -r '
  .[:2000][] | select(type == "object") |
  (["orc", .slug, .poster, .revision] | map(tostring) | join("\t")),
  (select(.videorc | type == "object") |
    ["videorc", .slug, .videorc.poster, (.videorc.revision // "")] | map(tostring) | join("\t"))
' "$source_catalog" 2>/dev/null)

if ((${#args[@]} > 0)); then
  nice -n 10 curl --proto '=https' --proto-redir '=https' --fail --silent \
    --location --max-redirs 3 --connect-timeout 10 --max-time 120 \
    --max-filesize 3000000 --remove-on-error --parallel --parallel-max 6 \
    "${args[@]}" || true
  # Keep only complete JPEGs (FFD8 ... FFD9), so a cut-off download is retried next time.
  for dest in "${parts[@]}"; do
    part="$dest.part"
    if [[ -s $part && $(head -c 2 "$part" | od -An -tx1 | tr -d ' \n') == ffd8 &&
      $(tail -c 2 "$part" | od -An -tx1 | tr -d ' \n') == ffd9 ]]; then
      mv -f "$part" "$dest"
    else
      rm -f "$part"
    fi
  done
fi

# Drop posters and downloaded GIFs for GIFs or revisions the catalog no longer lists.
if ((${#wanted[@]} > 0)); then
  shopt -s nullglob
  for file in "$cache"/posters/{orc,videorc}/*.jpg "$cache"/gifs/{orc,videorc}/*.gif; do
    [[ -n ${wanted[$file]:-} ]] || rm -f -- "$file"
  done
fi

echo synced
