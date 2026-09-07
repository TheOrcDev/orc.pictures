<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/glow.svg?title=orc.pictures&subtitle=Search+and+copy+orc+reaction+gifs&logo=lu:Film&theme=green&size=banner&mode=dark" />
    <img alt="orc.pictures" src="https://shieldcn.dev/header/glow.svg?title=orc.pictures&subtitle=Search+and+copy+orc+reaction+gifs&logo=lu:Film&theme=green&size=banner&mode=light" />
  </picture>
</p>

<p align="center">
  <a href="https://orc.pictures"><img src="https://shieldcn.dev/badge/site-orc.pictures-green.svg?logo=lu:Globe&variant=secondary&size=sm" alt="orc.pictures" /></a>
  <a href="https://github.com/TheOrcDev/orc.pictures/stargazers"><img src="https://shieldcn.dev/github/stars/TheOrcDev/orc.pictures.svg?variant=secondary&size=sm" alt="GitHub stars" /></a>
  <a href="https://github.com/TheOrcDev/orc.pictures/commits/main"><img src="https://shieldcn.dev/github/last-commit/TheOrcDev/orc.pictures.svg?variant=secondary&size=sm" alt="last commit" /></a>
  <img src="https://shieldcn.dev/badge/Next.js-16-000000.svg?logo=nextdotjs&logoColor=ffffff&variant=secondary&size=sm" alt="Next.js 16" />
  <img src="https://shieldcn.dev/badge/video-Grok+Imagine-green.svg?logo=x&variant=secondary&size=sm" alt="Grok Imagine" />
</p>

Personal [Giphy](https://orc.pictures) for orc reaction GIFs. Search, hover to play, click to copy the URL or markdown.

## Use the picker

1. Open [orc.pictures](https://orc.pictures)
2. Type something like `nod`, `salute`, or `popcorn`
3. Hover a tile to play it
4. Click to copy the GIF URL — the toast can copy markdown too
5. Share a permalink like [`orc.pictures/nod`](https://orc.pictures/nod)

Press `d` to toggle dark mode.

## Develop

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `pnpm dev` | Next.js app |
| `pnpm check` / `pnpm fix` | Ultracite lint and format |
| `pnpm typecheck` | TypeScript |
| `pnpm gif:import` | Convert a still or video into a catalog GIF |
| `pnpm gif:imagine` | Animate a still with Grok Imagine Video, then import |

## Add a reaction

Grok Imagine turns a still into a short clip. The import pipeline writes `public/gifs/{slug}.gif`, a JPEG poster, and an entry in `content/gifs.json`.

```bash
# Animate a catalog still with grok-imagine-video-1.5
pnpm gif:imagine -- --slug nod

# Import an existing video or GIF
pnpm gif:import -- --input ./clip.mp4 --slug nod --title Nod --tags nod,yes
```

`gif:imagine` needs `XAI_API_KEY`. Both commands need `ffmpeg`. GIF optimize uses `gifsicle` when it is installed.

## Stack

- Next.js 16 App Router and React 19
- Tailwind 4 and shadcn (base-sera)
- Grok Imagine Video 1.5 for still → motion
- Ultracite (Oxlint + Oxfmt)
