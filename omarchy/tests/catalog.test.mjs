// Run with: node --test omarchy/tests
// OrcCatalog.js is QML JavaScript (no import/export), so it is loaded into a
// sandbox with a CommonJS-style `module` object, the way the shell sees it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../OrcCatalog.js", import.meta.url), "utf8");
const sandbox = { module: { exports: {} } };
vm.runInNewContext(source, sandbox);
const Catalog = sandbox.module.exports;

// Arrays built inside the sandbox have its prototypes; copy for deepEqual.
const slugs = (gifs) => Array.from(gifs, (gif) => gif.slug);

const fallback = readFileSync(new URL("../fallback-catalog.json", import.meta.url), "utf8");

const entry = (overrides = {}) => ({
  file: "/gifs/nod.gif",
  poster: "/gifs/nod.jpg",
  revision: "abcdef123456",
  slug: "nod",
  tags: ["nod", "yes", "agree"],
  title: "Nod",
  ...overrides,
});

test("parses the bundled fallback catalog", () => {
  const gifs = Catalog.parseCatalog(fallback);
  assert.ok(gifs.length > 0);
  for (const gif of gifs) {
    assert.ok(Catalog.isSafeSlug(gif.slug));
    assert.match(gif.orc.file, /^\/gifs\/[a-z0-9-]+\.gif$/);
  }
});

test("drops entries with unsafe slugs or asset paths", () => {
  const gifs = Catalog.parseCatalog(
    JSON.stringify([
      entry(),
      entry({ slug: "../etc" }),
      entry({ slug: "bad", file: "https://evil.example/x.gif" }),
      entry({ slug: "worse", poster: "/gifs/../../x.jpg" }),
      entry({ slug: "nod" }),
    ])
  );
  assert.deepEqual(
    slugs(gifs),
    ["nod"]
  );
});

test("keeps the orc GIF when its Videorc version is malformed", () => {
  const [gif] = Catalog.parseCatalog(
    JSON.stringify([entry({ videorc: { file: "/gifs/nod.gif", poster: "/gifs/nod.jpg" } })])
  );
  assert.equal(gif.videorc, null);
  assert.equal(Catalog.gifsForStyle([gif], "videorc").length, 0);
  assert.equal(Catalog.gifsForStyle([gif], "orc").length, 1);
});

test("ignores unsafe revisions", () => {
  const [gif] = Catalog.parseCatalog(JSON.stringify([entry({ revision: "$(id)" })]));
  assert.equal(gif.orc.revision, "");
  assert.equal(
    Catalog.cacheName(Catalog.gifsForStyle([gif], "orc")[0], "gif"),
    "orc/nod.current.gif"
  );
});

test("bounds titles and tags and keeps markup as plain data", () => {
  const [gif] = Catalog.parseCatalog(
    JSON.stringify([
      entry({
        tags: Array.from({ length: 100 }, (_, index) => `tag${index}`),
        title: `<img src="https://example.invalid/t">${"x".repeat(500)}`,
      }),
    ])
  );
  assert.equal(gif.tags.length, 30);
  assert.ok(gif.title.length <= 120);
});

test("rejects things that are not catalogs", () => {
  assert.throws(() => Catalog.parseCatalog("{}"));
  assert.throws(() => Catalog.parseCatalog("[]"));
  assert.throws(() => Catalog.parseCatalog("not json"));
});

test("search requires every word and ranks exact tags first", () => {
  const gifs = Catalog.gifsForStyle(
    Catalog.parseCatalog(
      JSON.stringify([
        entry({ slug: "nodding-off", tags: ["sleepy"], title: "Nodding Off" }),
        entry(),
        entry({ slug: "salute", tags: ["salute", "respect"], title: "Salute" }),
      ])
    ),
    "orc"
  );
  assert.deepEqual(
    slugs(Catalog.search(gifs, "nod")),
    ["nod", "nodding-off"]
  );
  assert.deepEqual(
    slugs(Catalog.search(gifs, "nod yes")),
    ["nod"]
  );
  assert.equal(Catalog.search(gifs, "").length, 3);
  assert.equal(Catalog.search(gifs, "zzz").length, 0);
});

test("finds real catalog GIFs by tag", () => {
  const gifs = Catalog.gifsForStyle(Catalog.parseCatalog(fallback), "orc");
  assert.ok(Catalog.search(gifs, "angry").some((gif) => gif.slug === "angry"));
});

test("requires .gif files and .jpg posters", () => {
  assert.throws(() => Catalog.parseCatalog(JSON.stringify([entry({ poster: "/gifs/nod.gif" })])));
  assert.throws(() => Catalog.parseCatalog(JSON.stringify([entry({ file: "/gifs/nod.jpg" })])));
});
