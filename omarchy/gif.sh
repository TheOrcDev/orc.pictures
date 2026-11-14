#!/bin/bash

# Does something with one orc.pictures GIF:
#
#   paste  put the GIF file on the clipboard and paste it into the window in front
#   copy   put the GIF file on the clipboard
#   fetch  download the GIF into the cache only (used for the in-overlay preview)
#   link   copy the GIF URL as text
#   open   open the permalink page in the browser
#
# The file goes on the clipboard as text/uri-list, the way a file manager
# copies a file: pasted into X, Discord or a chat app it stays animated, where
# image data would be a still. Downloads are cached by revision, so each GIF
# is fetched once.
#
# Usage: gif.sh <paste|copy|fetch|link|open> <orc|videorc> <slug> <revision|""> <cache-dir>

set -euo pipefail

ORIGIN="https://orc.pictures"
mode=${1:-}
style=${2:-}
slug=${3:-}
rev=${4:-}
cache=${5:-}

fail() {
  echo "gif.sh: $*" >&2
  command -v notify-send >/dev/null && notify-send -a "orc.pictures" "Could not $mode GIF" "$*" 2>/dev/null || true
  exit 1
}

case $mode in paste | copy | fetch | link | open) ;; *) fail "unknown mode '$mode'" ;; esac
case $style in orc | videorc) ;; *) fail "unknown style" ;; esac
[[ $slug =~ ^[a-z0-9]+(-[a-z0-9]+)*$ && ${#slug} -le 80 ]] || fail "invalid slug"
[[ -z $rev || $rev =~ ^[a-f0-9]{8,64}$ ]] || fail "invalid revision"
[[ $cache == /* ]] || fail "cache dir must be absolute"

if [[ $style == videorc ]]; then
  remote_path="/gifs/videorc/$slug.gif"
  page="$ORIGIN/$slug?style=videorc"
else
  remote_path="/gifs/$slug.gif"
  page="$ORIGIN/$slug"
fi
url="$ORIGIN$remote_path"
[[ -n $rev ]] && url+="?v=$rev"

case $mode in
  link)
    printf '%s' "$ORIGIN$remote_path" | wl-copy
    exit 0
    ;;
  open)
    exec xdg-open "$page"
    ;;
esac

dir="$cache/gifs/$style"
dest="$dir/$slug.${rev:-current}.gif"
mkdir -p "$dir"

if [[ ! -s $dest ]]; then
  tmp="$dir/.$slug.$$.gif"
  trap 'rm -f "$tmp"' EXIT
  curl --proto '=https' --proto-redir '=https' --fail --silent --show-error \
    --location --max-redirs 3 --connect-timeout 10 --max-time 90 \
    --max-filesize 50000000 -o "$tmp" "$url" || fail "download failed for $slug"
  # Only keep something that is really a GIF.
  [[ $(head -c 6 "$tmp") == GIF8[79]a ]] || fail "$slug is not a GIF"
  mv -f "$tmp" "$dest"
  # Older revisions of the same GIF are dead weight now.
  for old in "$dir/$slug".*.gif; do
    [[ $old == "$dest" ]] || rm -f -- "$old"
  done
fi

[[ $mode == fetch ]] && exit 0

# file:// URL with every byte outside the unreserved set percent-encoded.
file_url() {
  local LC_ALL=C s=$1 out="" c i
  for ((i = 0; i < ${#s}; i++)); do
    c=${s:i:1}
    case $c in
      [A-Za-z0-9/._~-]) out+=$c ;;
      *) printf -v c '%%%02X' "'$c"; out+=$c ;;
    esac
  done
  printf 'file://%s\r\n' "$out"
}

file_url "$dest" | wl-copy --type text/uri-list

[[ $mode == copy ]] && exit 0

# Same keystroke the Omarchy clipboard manager sends: Shift+Insert pastes in
# terminals and GUI apps alike. Give the overlay a moment to hand focus back.
sleep 0.15
wtype -M shift -k Insert -m shift 2>/dev/null || true
