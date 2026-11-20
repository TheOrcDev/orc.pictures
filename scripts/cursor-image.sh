#!/bin/zsh
# FALLBACK ONLY: orc GIF stills and keyframes come from Cozy Studio (see .agents/skills/orc-gif/SKILL.md).
# Use this only when Studio is down and the user okays it. Never pick a Cursor grok-* model; never use xAI.
# Generates one image with Cursor's built-in GenerateImage tool (cursor-agent, Auto model).
# Pass reference images to edit or vary an existing still, e.g. a keyframe with one eye closed.
# Usage: scripts/cursor-image.sh <out.png> "<description>" [reference image ...]
# Needs a logged-in cursor-agent.
set -euo pipefail

if (( $# < 2 )); then
  print -u2 'Usage: scripts/cursor-image.sh <out.png> "<description>" [reference image ...]'
  exit 1
fi

out=${1:A}
# The description goes inside a single-quoted string in the agent prompt.
description=${2//\'/’}
shift 2

work=$(mktemp -d /tmp/cursor-image.XXXXXX)
refs=()
for ref in "$@"; do
  cp "$ref" "$work/${ref:t}"
  refs+=("\"$work/${ref:t}\"")
done
# The temp dir suffix keeps the name unique, so parallel runs with the same output name can't pick up each other's image.
name="gen-${out:t:r}-${work:t:e}"
marker="$work/.start"
touch "$marker"

cd "$work"
cursor-agent -p --trust --model auto --output-format text \
  "Call the GenerateImage tool exactly once, with aspect_ratio \"1:1\", filename \"$name.png\", reference_image_paths [${(j:, :)refs}] and this description: '$description'. Do not call any other tool. Then print only the absolute path of the saved image." >/dev/null

result=$(find "$HOME/.cursor/projects" -path '*/assets/*' -name "$name.*" -newer "$marker" -type f | head -1)
if [[ -z "$result" ]]; then
  print -u2 "cursor-image: no image was generated"
  exit 1
fi

ffmpeg -v error -y -i "$result" "$out"
print "$out"
