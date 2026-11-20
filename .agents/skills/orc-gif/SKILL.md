---
name: orc-gif
description: Make a new orc.pictures GIF end to end. Cozy Studio (the cozy-studio MCP tools) makes the base still and every edited keyframe; keyframe-animate.py animates them locally; import-gif.ts adds the GIF to the catalog. Use whenever someone asks for a new orc GIF, a redo of one, a Videorc version, or any orc image or keyframe for this repo.
---

# Orc GIF

Every image behind an orc GIF comes from **Cozy Studio**: the base still and every edited keyframe (one eye shut, jaw dropped, and so on). Animation runs locally. There is no video model.

```
Cozy Studio still ─► Cozy Studio edits (keyframes) ─► keyframe-animate.py ─► MP4 ─► import-gif.ts ─► GIF + poster + catalog
```

## Hard rules

- **Never use xAI.** No Grok Imagine, no `api.x.ai`, no `XAI_API_KEY`, no `scripts/imagine-video.ts` (gone), no Studio `grok` provider and no Cursor `grok-*` models. xAI burned about $137 and is banned for good.
- **Cozy Studio is the only image generator.** `scripts/cursor-image.sh` (Cursor GenerateImage) is a fallback only: use it when Studio is down **and** the user okays it.
- **Spending.** `studio_generate` and `studio_retry_batch` spend the owner's ChatGPT usage. A direct request for exactly those images is consent. Otherwise preview with `studio_plan_generation` and confirm provider, model, image count and workspace first.
- Never ask for, print or log the Studio agent token or any other secret.

## 1. Check Studio

1. `studio_status`: note `mcpAccessLabel`. Generating needs **Full control**. A 403 names the level a tool needs: tell the user (Studio Settings > Advanced & maintenance).
2. Read `studio_guide` topics `hosted`, `overview` and `generate-and-compare` once per session. Hosted Studio has no local file paths: images come back as signed `thumbnailUrl` / `publicUrl` links (24 h), and local files are imported as base64.
3. If a generate fails with `provider_runtime_blocked` or "Sign in with ChatGPT", the user signs in again in the hosted UI at Settings > Accounts & models. `studio_providers` shows when `chatgpt` is ready.
4. Look up the style ids every time; don't trust these notes:
   - Watercolor (orc.pictures default): `studio_find_styles {q: "Hugo Pratt"}` → "Hugo Pratt - Watercolor Ink Sea Adventure", `pack_26` / `SP26-153` as of 2026-11-20 (once `SP00-060`).
   - Videorc (dark photoreal cyber orc with red accents): no preset. Describe the look in the prompt and leave `styles` out.
   - If `studio_settings` shows `intentionalStylesV1: true`, use only presets with `hasIntentionalPolicy: true`.

## 2. Base still: `studio_generate`

```jsonc
{
  "requestId": "batch-orc-<slug>-still-1", // new per batch; repeat it unchanged after a timeout
  "task": "image_generate",
  "prompt": "<plain scene description: who, where, pose, expression, light>",
  "negativePrompt": "sea, ships, harbor, sailors, text, captions, lettering",
  "styles": [{ "packId": "pack_26", "presetId": "SP26-153" }], // watercolor; omit for Videorc
  "aspectRatio": "1:1",
  "count": 3, // a few takes to choose from
  "workspaceId": "default", // or workspaceName to find or create one
  "tags": ["orc-pictures", "<slug>", "watercolor"], // 2-5 lowercase; "videorc" for Videorc
  "collection": "orc.pictures",
}
```

Then poll `studio_batch {batchId}` about every 15 s (stop after about 10 min and report), list the images with `studio_catalog {workspace_id, batch_id, limit: 100}`, look at each `thumbnailUrl`, and download the pick from `publicUrl` (retry if it 404s in the first seconds) to `~/Downloads/ai images/<slug>.png`.

Recipe notes:

- Keep the watercolor prompt **plain**: no "Hugo Pratt", no "watercolor", no `styleMode`, default strength. Bright, airy settings on pale paper. A dim, inked dungeon was rejected as "not the same quality".
- `providerId` defaults to `chatgpt`; keep it. Use `codex` only when asked.
- Studio stills fill the frame (head about 20% from the top), so pick actions that stay at chest height.
- When the scene needs words (a sign, a plate), drop "lettering" from the negative prompt; ChatGPT renders short text cleanly.

## 3. Keyframes: Studio edits

Each extra pose is an `image_edit` of the base still.

1. Get a reference id. A still made in Studio already has a catalog id: use it. For a local file, `studio_import_reference {requestId: "reference-<slug>-base", name, mimeType, base64, sha256}` returns a catalog image id (it lands in the Default workspace, tagged "imported reference").
2. Edit:

```jsonc
{
  "requestId": "batch-orc-<slug>-wink-1",
  "task": "image_edit",
  "referenceIds": ["<base still catalog id>"],
  "prompt": "Edit of the reference image: the exact same orc, pixel-for-pixel identical except one change: his left eye is shut in a wink.",
  "styles": [{ "packId": "pack_26", "presetId": "SP26-153" }], // same style as the still
  "styleMode": "preserve", // keep the layout; "reinterpret" restages it
  "workspaceId": "default",
  "tags": ["orc-pictures", "<slug>", "keyframe"],
  "collection": "orc.pictures",
}
```

3. Edits drift: the model re-renders the whole frame. Use only a **small masked region** of each edit (an eye, a mouth, a hand) on top of the base, through `keys.<name>.mask` in the spec. Measure the offset between edit and base and set `shift`. Chain edits from a close key (a blink edited from the calm key aligned within 4 px). When a whole-frame change is unavoidable, use a hard cut, not a dissolve.
4. Big moves (a nod, a head shake, a sigh, an arm lift) work better as `warps` than as edited keys. An edit asking for "fingers lifted" deleted the hand.

## 4. Animate: `pnpm gif:keyframes spec.json`

(Same as `uv run --with numpy --with pillow scripts/keyframe-animate.py spec.json`, if pnpm refuses to run.) The spec, from the script header:

```jsonc
{
  "base": "base.png",                                 // the still (worked at 1024)
  "keys": { "wink": { "src": "edit.jpg", "shift": [dx, dy],
                      "mask": { "ellipse": [cx, cy, rx, ry], "feather": 25 } } },  // no mask = whole frame
  "glows": { "eye": { "at": [x, y], "radius": 14, "color": [255, 40, 30], "strength": 0.9 } },
  "warps": { "nod": { "ellipse": [cx, cy, rx, ry], "feather": 60, "offset": [dx, dy], "scale": 1.02 } },
  "shake": { "amp": 6, "freq": 9 },                   // strength = the "shake" timeline channel
  "timeline": [[0, { "wink": 0 }], [1.0, { "wink": 0 }], [1.12, { "wink": 1 }]],
  "duration": 4.2, "fps": 24,
  "zoom": [1.0, 1.06], "zoomCenter": [512, 420],
  "zoomChannel": true,                                // optional: a "zoom" channel drives it (crash zoom)
  "out": "anim.mp4", "size": 640
}
```

- Layers, then glows, then warps apply in spec order, so a warp carries the glows inside it.
- Timeline values ease (smoothstep) between points; a channel missing from a point keeps its last value.
- Glow radius about 14 at 1024 px, or eyes turn into blobs. A head shake reads as a turn with two nested horizontal warps, the face moving more than the head (16/23 px watercolor, 20/28 px Videorc).
- Avoid forward-and-reverse loops for gestures: the user sees them as repeating.

## 5. Import

```sh
pnpm gif:import --input anim.mp4 --slug <slug> --title "<Title>" --tags a,b
pnpm gif:import --input anim-videorc.mp4 --slug <slug> --style videorc   # orc entry must exist first
```

(`node --experimental-strip-types scripts/import-gif.ts ...` if pnpm refuses.) It writes `public/gifs/<slug>.gif`, the poster `public/gifs/<slug>.jpg` and the `content/gifs.json` entry (Videorc goes to `public/gifs/videorc/` and the entry's `videorc` field). Then, by hand:

- Share card: crop the still to 1200×630 JPEG at `public/cards/<slug>.jpg` (orc style only).
- Copy `content/gifs.json` to `raycast/src/fallback-catalog.json`; they stay identical.
- Record how it was animated in `scripts/motion-prompts.ts` (`PROMPTS`, or `VIDEORC_PROMPTS`).
- Never commit `raycast/raycast-env.d.ts` or the user's uncommitted `README.md`.

## Character and style

**Orc (watercolor):** a big, muscular, masculine orc with a massive jaw and tusks. Draw him **from scratch** for every GIF, with no character reference, so faces vary. Pick a setting that fits the scene; sea, ships and harbor only for beach or ship scenes, and put "sea, ships, harbor, sailors" in the negative prompt otherwise (the Pratt preset pushes the sea into everything). Keepers never regenerated: beach-lounge, approves, annoyed.

**Videorc:** a dangerous cyber orc, new for each GIF. Grey stone-skinned cyborg with segmented gunmetal plates over the skull, glowing red eyes, big tusks, steel ear rings and a black hoodie. Photoreal cinematic CGI, near-monochrome charcoal and black with red as the only color, always dark or night. In edits say "the glowing red cybernetic lens stays exactly the same": edits tend to turn the cyber eye normal or white.

## Fallback: Cursor

Only when Studio is down and the user okays it: `pnpm gif:cursor-image out.png "<description>" [reference.png ...]` (cursor-agent's GenerateImage, Auto model). Never pick a `grok-*` model.
