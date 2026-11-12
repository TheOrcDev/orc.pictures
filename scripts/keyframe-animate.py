# Animate a still from Cursor keyframes: masked keyframe layers + glow pulses + eased push-in -> MP4.
# Usage: pnpm gif:keyframes spec.json   (uv run --with numpy --with pillow scripts/keyframe-animate.py spec.json)
# Keyframes come from Cursor GenerateImage (scripts/cursor-image.sh); the MP4 goes through scripts/import-gif.ts.
#
# spec = {
#   "base": "base.png",                      # the still (any size; worked at 1024)
#   "keys": {"wink": {"src": "edit.jpg", "shift": [dx, dy],
#                     "mask": {"ellipse": [cx, cy, rx, ry], "feather": 25}}},   # omit mask = whole frame
#   "glows": {"eye": {"at": [x, y], "radius": 40, "color": [255, 40, 30], "strength": 0.9}},
#   "timeline": [[0, {"wink": 0, "eye": 0}], [1.0, {"wink": 0}], [1.12, {"wink": 1}], ...],
#   "duration": 4.2, "fps": 24,
#   "zoom": [1.0, 1.06], "zoomCenter": [512, 420],
#   "out": "anim.mp4", "size": 640
# }
# Timeline values are eased (smoothstep) between the listed points; a layer missing from a point keeps its last value.
import json, subprocess, sys, tempfile, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

spec = json.loads(pathlib.Path(sys.argv[1]).read_text())
W = 1024
def load(path):
    return np.asarray(Image.open(path).convert("RGB").resize((W, W), Image.LANCZOS), dtype=np.float32)

base = load(spec["base"])
layers = {}
for name, k in spec.get("keys", {}).items():
    img = load(k["src"])
    dx, dy = k.get("shift", [0, 0])
    img = np.roll(img, shift=(-dy, -dx), axis=(0, 1))  # edit pixel at (x+dx, y+dy) lands on (x, y)
    m = k.get("mask")
    if m:
        mask = Image.new("L", (W, W), 0)
        cx, cy, rx, ry = m["ellipse"]
        ImageDraw.Draw(mask).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(m.get("feather", 20)))
        alpha = np.asarray(mask, dtype=np.float32)[..., None] / 255.0
    else:
        alpha = np.ones((W, W, 1), dtype=np.float32)
    layers[name] = (img, alpha)

glows = {}
yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
for name, g in spec.get("glows", {}).items():
    x, y = g["at"]; r = g.get("radius", 40)
    falloff = np.exp(-(((xx - x) ** 2 + (yy - y) ** 2) / (2 * r * r)))[..., None]
    color = np.array(g.get("color", [255, 40, 30]), dtype=np.float32)
    glows[name] = (falloff * color * g.get("strength", 0.9))

names = list(layers) + list(glows)
points = []
last = {n: 0.0 for n in names}
for t, vals in spec["timeline"]:
    last = {**last, **vals}
    points.append((float(t), dict(last)))

def smooth(u):
    u = min(max(u, 0.0), 1.0)
    return u * u * (3 - 2 * u)

def value(name, t):
    if t <= points[0][0]:
        return points[0][1][name]
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t0 <= t <= t1:
            return v0[name] + (v1[name] - v0[name]) * smooth((t - t0) / max(t1 - t0, 1e-6))
    return points[-1][1][name]

fps = spec.get("fps", 24)
dur = spec["duration"]
z0, z1 = spec.get("zoom", [1.0, 1.0])
zcx, zcy = spec.get("zoomCenter", [W / 2, W / 2])
size = spec.get("size", 640)
n = int(round(dur * fps))
tmp = pathlib.Path(tempfile.mkdtemp(prefix="keyanim-"))
for i in range(n):
    t = i / fps
    frame = base.copy()
    for name, (img, alpha) in layers.items():
        w = value(name, t)
        if w > 0:
            frame = frame * (1 - alpha * w) + img * (alpha * w)
    for name, glow in glows.items():
        w = value(name, t)
        if w > 0:
            frame = 255 - (255 - frame) * (1 - glow * w / 255.0)  # screen blend
    u = t / dur
    u = u * u * u * (u * (u * 6 - 15) + 10)  # smootherstep
    z = z0 + (z1 - z0) * u
    side = W / z
    x0 = min(max(zcx - side / 2, 0), W - side)
    y0 = min(max(zcy - side / 2, 0), W - side)
    im = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8))
    im = im.resize((size, size), Image.LANCZOS, box=(x0, y0, x0 + side, y0 + side))
    im.save(tmp / f"f{i:04d}.png")
subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", str(tmp / "f%04d.png"),
                       "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", spec["out"]])
print("wrote", spec["out"], f"{n} frames, {dur}s")
