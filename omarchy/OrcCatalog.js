// Catalog reading and search for the orc.pictures Omarchy plugin. Pure
// functions, no QML, so the same file runs in the shell and in the tests
// (via module.exports at the bottom).
//
// The catalog comes from https://orc.pictures/catalog.json (or the bundled
// fallback-catalog.json). The shell is unsandboxed and long-lived, so every
// field is checked and bounded here, the same way the Raycast extension does.

var STYLES = ["orc", "videorc"]
var SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Files are GIFs and posters are JPEG stills; sync.sh downloads only .jpg posters.
var ORC_PATHS = { file: /^\/gifs\/[a-z0-9]+(?:-[a-z0-9]+)*\.gif$/, poster: /^\/gifs\/[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/ }
var VIDEORC_PATHS = {
  file: /^\/gifs\/videorc\/[a-z0-9]+(?:-[a-z0-9]+)*\.gif$/,
  poster: /^\/gifs\/videorc\/[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/
}
var SAFE_REVISION = /^[a-f0-9]{8,64}$/
var MAX_GIFS = 2000
var MAX_SLUG = 80
var MAX_TITLE = 120
var MAX_TAGS = 30
var MAX_TAG = 40

function isStyle(value) {
  return STYLES.indexOf(value) !== -1
}

function isSafeSlug(value) {
  return typeof value === "string" && value.length <= MAX_SLUG && SAFE_SLUG.test(value)
}

function revisionOf(value) {
  return typeof value === "string" && SAFE_REVISION.test(value) ? value : ""
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function assetOf(value, paths, fallbackRevision) {
  if (!isRecord(value)) return null
  if (typeof value.file !== "string" || !paths.file.test(value.file)) return null
  if (typeof value.poster !== "string" || !paths.poster.test(value.poster)) return null
  return {
    file: value.file,
    poster: value.poster,
    revision: revisionOf(value.revision) || fallbackRevision || ""
  }
}

function cleanGif(value) {
  if (!isRecord(value) || !isSafeSlug(value.slug)) return null
  if (typeof value.title !== "string" || !Array.isArray(value.tags)) return null
  var orc = assetOf(value, ORC_PATHS, "")
  if (!orc) return null
  var tags = []
  for (var i = 0; i < value.tags.length && tags.length < MAX_TAGS; i++) {
    if (typeof value.tags[i] !== "string") continue
    var tag = value.tags[i].slice(0, MAX_TAG).trim().toLowerCase()
    if (tag) tags.push(tag)
  }
  return {
    slug: value.slug,
    title: value.title.slice(0, MAX_TITLE).trim() || value.slug,
    tags: tags,
    orc: orc,
    // A missing or malformed Videorc asset drops only the Videorc version.
    videorc: assetOf(value.videorc, VIDEORC_PATHS, "")
  }
}

// The GIFs in a catalog.json text. Throws on anything that is not a catalog,
// so the caller can fall back to the bundled one.
function parseCatalog(raw) {
  var data = JSON.parse(String(raw))
  if (!Array.isArray(data)) throw new Error("Catalog must be an array")
  var out = []
  var seen = {}
  for (var i = 0; i < data.length && out.length < MAX_GIFS; i++) {
    var gif = cleanGif(data[i])
    if (!gif || seen[gif.slug]) continue
    seen[gif.slug] = true
    out.push(gif)
  }
  if (out.length === 0) throw new Error("Catalog is empty")
  return out
}

// One row per GIF in one style. Videorc lists only GIFs that have a Videorc version.
function gifsForStyle(gifs, style) {
  var out = []
  for (var i = 0; i < gifs.length; i++) {
    var asset = style === "videorc" ? gifs[i].videorc : gifs[i].orc
    if (!asset) continue
    out.push({
      slug: gifs[i].slug,
      title: gifs[i].title,
      tags: gifs[i].tags,
      style: style,
      file: asset.file,
      poster: asset.poster,
      revision: asset.revision
    })
  }
  return out
}

function tokens(text) {
  // No \p{...} classes: the shell's JS engine does not support them.
  return String(text || "").toLowerCase().split(/[\s.,!?;:"'()\[\]{}\/\\|_*#@~`+=<>-]+/).filter(Boolean)
}

// How well one query word matches a GIF: 0 (no match) up to 6.
function wordScore(gif, word) {
  var best = 0
  for (var i = 0; i < gif.tags.length; i++) {
    var tag = gif.tags[i]
    if (tag === word) return 6
    if (tag.indexOf(word) === 0) best = Math.max(best, 4)
    else if (word.length >= 3 && tag.indexOf(word) !== -1) best = Math.max(best, 2)
  }
  var titleWords = tokens(gif.title).concat(tokens(gif.slug))
  for (var j = 0; j < titleWords.length; j++) {
    if (titleWords[j] === word) best = Math.max(best, 5)
    else if (titleWords[j].indexOf(word) === 0) best = Math.max(best, 3)
  }
  if (best === 0 && word.length >= 3) {
    var haystack = (gif.slug + " " + gif.title).toLowerCase()
    if (haystack.indexOf(word) !== -1) best = 1
  }
  return best
}

// GIFs matching every word of `query`, best first. No query keeps catalog order.
function search(gifs, query) {
  var words = tokens(query)
  if (words.length === 0) return gifs.slice()
  var scored = []
  for (var i = 0; i < gifs.length; i++) {
    var total = 0
    var all = true
    for (var w = 0; w < words.length; w++) {
      var score = wordScore(gifs[i], words[w])
      if (score === 0) {
        all = false
        break
      }
      total += score
    }
    if (all) scored.push({ gif: gifs[i], total: total, order: i })
  }
  scored.sort(function(a, b) { return b.total - a.total || a.order - b.order })
  var out = []
  for (var k = 0; k < scored.length; k++) out.push(scored[k].gif)
  return out
}

// Cache file name for one GIF's asset. Shared with gif.sh and sync.sh:
// {slug}.{revision or "current"}.{ext}, inside a folder per style.
function cacheName(row, ext) {
  return row.style + "/" + row.slug + "." + (row.revision || "current") + "." + ext
}

if (typeof module !== "undefined") {
  module.exports = {
    isStyle: isStyle,
    isSafeSlug: isSafeSlug,
    parseCatalog: parseCatalog,
    gifsForStyle: gifsForStyle,
    tokens: tokens,
    search: search,
    cacheName: cacheName
  }
}
