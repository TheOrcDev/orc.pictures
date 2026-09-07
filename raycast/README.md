# orc.pictures Raycast extension

Search the orc reaction catalog and copy the **GIF file** to the macOS clipboard. Paste into X and it animates.

The website cannot do this. Browsers refuse `image/gif` on `clipboard.write`. Raycast can write a real file.

## Install

1. Open a terminal in this folder.
2. Run `npm install && npm run dev`.
3. In Raycast, search for **Search Orc GIFs**.
4. Stop the watcher with Ctrl+C. The command stays installed.

Optional: in Raycast Preferences → Extensions → orc.pictures, set **Local GIFs folder** to `public/gifs` in this repo so the first copy does not download 3–5 MB.

## Actions

- Return: copy the GIF file
- ⌘⇧V: paste the GIF into the frontmost app
- ⌘⇧C: copy the GIF URL
- ⌘O: open the permalink
