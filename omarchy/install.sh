#!/bin/bash

# Installs (or updates) the orc.pictures Omarchy plugin into
# ~/.config/omarchy/plugins/orc-pictures.
#
# The orc.pictures repo carries every GIF, so instead of cloning all of it this
# fetches only the omarchy/ folder with a sparse, blobless checkout. Run from a
# checkout (omarchy/install.sh) it installs that copy instead.
#
#   curl -fsSL https://raw.githubusercontent.com/TheOrcDev/orc.pictures/main/omarchy/install.sh | bash
#
# ORC_PICTURES_REPO and ORC_PICTURES_REF pick another repo or branch.

set -euo pipefail

REPO=${ORC_PICTURES_REPO:-https://github.com/TheOrcDev/orc.pictures.git}
REF=${ORC_PICTURES_REF:-main}
ID="orc-pictures"
TARGET="$HOME/.config/omarchy/plugins/$ID"

for cmd in curl jq wl-copy wtype; do
  command -v "$cmd" >/dev/null || echo "install.sh: warning: '$cmd' is missing; the plugin needs it" >&2
done

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

script_dir=""
if [[ -n ${BASH_SOURCE[0]:-} && -f ${BASH_SOURCE[0]} ]]; then
  script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
fi

if [[ -n $script_dir && -f $script_dir/manifest.json && -f $script_dir/OrcPictures.qml ]]; then
  source_dir=$script_dir
else
  echo "Fetching the omarchy/ folder of $REPO ($REF)…"
  git clone --quiet --depth 1 --filter=blob:none --sparse --branch "$REF" -- "$REPO" "$work/repo"
  git -C "$work/repo" sparse-checkout set --no-cone /omarchy/
  source_dir="$work/repo/omarchy"
fi

stage="$work/$ID"
mkdir -p "$stage"
# Everything but the tests and this installer goes into the plugin folder.
(cd "$source_dir" && tar --exclude=./tests --exclude=./install.sh -cf - .) | (cd "$stage" && tar -xf -)
chmod +x "$stage/sync.sh" "$stage/gif.sh"

if command -v omarchy >/dev/null; then
  omarchy plugin validate "$stage" >/dev/null
fi

mkdir -p "$(dirname "$TARGET")"
rm -rf "$TARGET.old"
[[ -e $TARGET ]] && mv "$TARGET" "$TARGET.old"
mv "$stage" "$TARGET"
rm -rf "$TARGET.old"

if command -v omarchy-shell >/dev/null; then
  omarchy-shell shell rescanPlugins >/dev/null 2>&1 || true
fi

# Third-party plugins start disabled; turn this one on unless it already is.
if command -v omarchy >/dev/null &&
  ! omarchy plugin list 2>/dev/null | grep -qE "^$ID[[:space:]]+enabled"; then
  omarchy plugin enable "$ID" >/dev/null || echo "Enable it with: omarchy plugin enable $ID" >&2
fi

cat <<EOF
Installed $ID into $TARGET

Open it with:
  omarchy-shell shell toggle $ID

Bind it to a key in ~/.config/hypr/bindings.lua, for example:
  o.bind("SUPER + CTRL + G", "Orc GIFs", "omarchy-shell shell toggle $ID")
EOF
