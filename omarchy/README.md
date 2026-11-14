# orc.pictures for Omarchy

Search [orc.pictures](https://orc.pictures) reaction GIFs from an [Omarchy](https://omarchy.org) shell overlay and paste the GIF file straight into the app in front.

The GIF goes on the clipboard as a file, the way a file manager copies one, so pasting into X, Discord or a chat app keeps the animation.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/TheOrcDev/orc.pictures/main/omarchy/install.sh | bash
```

This fetches only the `omarchy/` folder (the repo is mostly GIFs) and installs it into `~/.config/omarchy/plugins/orc-pictures`. Run it again to update. From a checkout, `omarchy/install.sh` installs that copy.

Open the overlay:

```bash
omarchy-shell shell toggle orc-pictures
```

Or bind it in `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + CTRL + G", "Orc GIFs", "omarchy-shell shell toggle orc-pictures")
```

Needs `curl`, `jq`, `wl-copy` and `wtype`, which Omarchy ships.

## Use

Type to search. `Tab` switches between **Orc** (the watercolor orcs) and **Videorc** (the dark cyber orc).

| Key | Action |
| --- | --- |
| `Enter` / click | Paste the GIF into the app in front |
| `Shift+Enter` / `Ctrl+C` | Copy the GIF file |
| `Ctrl+1`–`9` | Paste the GIF at that position |
| `Ctrl+L` | Copy the GIF URL |
| `Ctrl+O` | Open the permalink on orc.pictures |
| `Space` (empty search) | Preview: download and play the selected GIF |
| `Tab` | Switch style |
| `Esc` | Clear the search, then close |

## Network and cache

The plugin talks only to `https://orc.pictures`, and only while you use it:

- Opening the overlay refreshes `catalog.json` and downloads any poster stills it does not have yet (about 10 MB the first time, nothing after that).
- A GIF (around 5 MB) is downloaded when you paste, copy or preview it, then kept.

Everything lives in `~/.cache/orc-pictures`. Delete that folder to clear it. Until the first sync finishes, the overlay uses the catalog bundled in `fallback-catalog.json`.

## Develop

```bash
node --test omarchy/tests    # catalog parsing and search
omarchy plugin validate omarchy
omarchy/install.sh           # install this checkout, then reopen the overlay
```

`OrcCatalog.js` validates every catalog field (slugs, asset paths, revisions) the same way the Raycast extension does, and `sync.sh` and `gif.sh` check them again before anything reaches `curl`.
