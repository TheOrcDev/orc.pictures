/*
This oracle owns the picker's search promise: for every catalog and query,
`searchGifs(query, catalog)` returns the GIFs that match every word of the
query, best match first, the same rule the Omarchy shell uses. It owns
`lib/gifs.ts#searchGifs`, checked on the list it returns.

```ts
searchGifs("rage mad")  // → [Angry]: every word, in any order
searchGifs("eye roll")  // → [Annoyed]: "-" breaks words, so `eye-roll` is two
searchGifs("ok")        // → GIFs with a tag or word starting "ok", never Cooked
searchGifs("nod")       // → Nod (tag "nod") before Crazy Nod (title word "nod")
searchGifs(" - ")       // → the whole catalog, in catalog order
```

Angry is tagged `mad, rage`. A search that looks for the query as one phrase
finds it for "mad rage" and misses it for "rage mad", for "mad  rage" with a
double space, and for "eye roll" against the tag `eye-roll`. Every one of those
queries names words the GIF has.

Three parts decide the answer. The words: the query, lowercased, split at
whitespace and at the punctuation . , ! ? ; : " ' ( ) [ ] { } / \ | _ * # @ ~
` + = < > -. The word score: how well one word matches one GIF, by the best
tier it reaches, 6 a tag equal to the word, 5 a title or slug word equal to it,
4 a tag that starts with it, 3 a title or slug word that starts with it, 2 a
tag that contains it, 1 a slug or title that contains it. The two "contains"
tiers need a word of three or more characters, so "ok" does not reach Cooked.
The total: the sum of a GIF's word scores, or no match when any word scores 0.

Every word: for every catalog and query with at least one word, a GIF is in
the results exactly when every word scores above 0 against it, so word order,
repeated separators, and case never change which GIFs come back. Best first:
for every catalog and query, the results run from the highest total to the
lowest, and equal totals keep catalog order. No words: for every catalog, a
query with no words, empty, spaces, or punctuation only, returns the whole
catalog in catalog order. No throw: for every query string, lone surrogates
and astral characters included, and every catalog, `searchGifs` returns.

The model computes the words, the word scores, and the totals from the plan's
catalog and query alone, with no production code. The histories build
catalogs from real slugs, titles, and tags (hyphenated, capitalised, with
punctuation) and queries from whole words, prefixes, inner fragments, and odd
characters, joined by every kind of separator. The driver calls `searchGifs`
with `Gif` objects and records the catalog index of each result, or the
error it threw. Each law's check compares at the `results` checkpoint.

Limits: tags are matched whole, never split at "-", so "ro" does not match
`eye-roll` while "roll" does, from the inside. A word's length counts UTF-16
code units, so one astral character is two. Unicode punctuation outside the
list, such as "…" or "—", stays inside a word. Tags in the catalog carry no
surrounding spaces, as `scripts/import-gif.ts` writes them.
*/

import { differs, oracleProperty, pass, violation } from "@tanstack/oracles";
import type {
  Observation,
  OraclePropertyOptions,
  Verdict,
} from "@tanstack/oracles";
import { array, constantFrom, oneof, record, string } from "fast-check";
import type { Arbitrary } from "fast-check";

import type { Gif } from "@/lib/gifs";
import { searchGifs } from "@/lib/gifs";

const AUTHORITY =
  'Decision by OrcDev (GitHub TheOrcDev), 2026-11-24: the web picker follows the Omarchy shell\'s search, omarchy/OrcCatalog.js `tokens`, `wordScore`, and `search` ("GIFs matching every word of `query`, best first"), and omarchy/tests/catalog.test.mjs "search requires every word and ranks exact tags first".';
const SEED = 20_261_124;
const RUNS = 100;
const MAX_CATALOG = 8;

// ---------------------------------------------------------------------------
// The model: the words, the word score, and the total, from the plan alone.
// ---------------------------------------------------------------------------

interface GifText {
  slug: string;
  tags: string[];
  title: string;
}

interface SearchPlan {
  catalog: GifText[];
  query: string;
}

interface Expected {
  // Catalog indices of the matching GIFs, best first.
  results: number[];
  // Each catalog GIF's total; 0 for no match.
  totals: number[];
}

// The words: whitespace and this punctuation separate them (OrcCatalog.js `tokens`).
const SEPARATORS = new Set("., !?;:\"'()[]{}/\\|_*#@~`+=<>-");
const WHITESPACE = /^\s$/u;
const isSeparator = (char: string): boolean =>
  SEPARATORS.has(char) || WHITESPACE.test(char);

const wordsOf = (text: string): string[] => {
  const words: string[] = [];
  let word = "";
  for (const char of text.toLowerCase()) {
    if (isSeparator(char)) {
      if (word !== "") {
        words.push(word);
      }
      word = "";
    } else {
      word += char;
    }
  }
  if (word !== "") {
    words.push(word);
  }
  return words;
};

// The "contains" tiers need a word this long, in UTF-16 code units.
const MIN_INSIDE_LENGTH = 3;

interface GifView {
  slug: string;
  tags: string[];
  title: string;
  words: string[];
}

const viewOf = (gif: GifText): GifView => ({
  slug: gif.slug.toLowerCase(),
  tags: gif.tags.map((tag) => tag.toLowerCase()),
  title: gif.title.toLowerCase(),
  words: [...wordsOf(gif.title), ...wordsOf(gif.slug)],
});

// The word score: the first tier, best first, that the word reaches.
const TIERS: readonly {
  reaches: (gif: GifView, word: string) => boolean;
  score: number;
}[] = [
  { reaches: (gif, word) => gif.tags.includes(word), score: 6 },
  { reaches: (gif, word) => gif.words.includes(word), score: 5 },
  {
    reaches: (gif, word) => gif.tags.some((tag) => tag.startsWith(word)),
    score: 4,
  },
  {
    reaches: (gif, word) => gif.words.some((each) => each.startsWith(word)),
    score: 3,
  },
  {
    reaches: (gif, word) =>
      word.length >= MIN_INSIDE_LENGTH &&
      gif.tags.some((tag) => tag.includes(word)),
    score: 2,
  },
  {
    reaches: (gif, word) =>
      word.length >= MIN_INSIDE_LENGTH &&
      (gif.slug.includes(word) || gif.title.includes(word)),
    score: 1,
  },
];

const wordScore = (gif: GifView, word: string): number =>
  TIERS.find((tier) => tier.reaches(gif, word))?.score ?? 0;

// The total: the sum of the word scores, or 0 when any word scores 0.
const totalOf = (gif: GifView, words: string[]): number => {
  const scores = words.map((word) => wordScore(gif, word));
  return scores.includes(0) ? 0 : scores.reduce((sum, score) => sum + score, 0);
};

const expectedSearch = (plan: SearchPlan): Expected => {
  const words = wordsOf(plan.query);
  const indices = plan.catalog.map((_, index) => index);
  if (words.length === 0) {
    return { results: indices, totals: indices.map(() => 0) };
  }
  const totals = plan.catalog.map((gif) => totalOf(viewOf(gif), words));
  const results = indices
    .filter((index) => totals[index] > 0)
    .toSorted((left, right) => totals[right] - totals[left] || left - right);
  return { results, totals };
};

// ---------------------------------------------------------------------------
// The driver: the real searchGifs over real Gif objects.
// ---------------------------------------------------------------------------

const toGif = (gif: GifText): Gif => ({
  file: `/gifs/${gif.slug}.gif`,
  height: 1,
  poster: `/gifs/${gif.slug}.jpg`,
  slug: gif.slug,
  tags: [...gif.tags],
  title: gif.title,
  width: 1,
});

// Records the catalog index of each result (-1 for an object not in the
// catalog), or the message of the error searchGifs threw.
const driver: OraclePropertyOptions<unknown, Expected, SearchPlan>["driver"] = (
  plan,
  observe
) => {
  const catalog = plan.catalog.map(toGif);
  try {
    const results = searchGifs(plan.query, catalog);
    observe(
      "results",
      results.map((gif) => catalog.indexOf(gif))
    );
  } catch (error) {
    observe("error", error instanceof Error ? error.message : String(error));
  }
};

const observedResults = (
  observations: readonly Observation[]
): number[] | undefined => {
  const found = observations.find((each) => each.checkpoint === "results");
  if (!(found && Array.isArray(found.value))) {
    return undefined;
  }
  const indices: number[] = found.value.filter((index) =>
    Number.isInteger(index)
  );
  return indices.length === found.value.length ? indices : undefined;
};

// A copy of the trace with its results replaced, for calibrations.
const withResults = (
  trace: readonly Observation[],
  change: (results: number[]) => number[]
): readonly Observation[] | undefined => {
  const results = observedResults(trace);
  if (!results) {
    return undefined;
  }
  return trace.map((each) =>
    each.checkpoint === "results" ? { ...each, value: change(results) } : each
  );
};

const threw = (law: string): Verdict =>
  violation("results", "searchGifs threw instead of returning", law);

const numeric = (left: number, right: number): number => left - right;

// ---------------------------------------------------------------------------
// The histories: catalogs of real slugs, titles, and tags, and queries of
// words, fragments, and odd characters joined by every kind of separator.
// ---------------------------------------------------------------------------

const SLUGS = [
  "nod",
  "crazy-nod",
  "angry",
  "annoyed",
  "my-man",
  "clap",
  "cooked",
  "fishing",
  "working",
  "in-love",
  "hi-five",
] as const;
const TITLES = [
  "Nod",
  "Crazy Nod",
  "Angry",
  "Annoyed",
  "My man",
  "Clap",
  "Cooked!",
  "Fishing",
  "Working",
  "In Love",
  "Hi-five",
  "Well, done",
] as const;
const TAGS = [
  "nod",
  "Nod",
  "yes",
  "agree",
  "mad",
  "rage",
  "angry",
  "eye-roll",
  "annoyed",
  "well-done",
  "clap",
  "ok",
  "cooked",
  "fishing",
  "typing",
  "laptop",
  "in-love",
  "hi",
] as const;
const PIECES = [
  "nod",
  "no",
  "yes",
  "ye",
  "agree",
  "mad",
  "ma",
  "rage",
  "angry",
  "ang",
  "gry",
  "eye",
  "roll",
  "rol",
  "ro",
  "eye-roll",
  "well",
  "done",
  "one",
  "ok",
  "oo",
  "cook",
  "fish",
  "ish",
  "is",
  "in",
  "love",
  "man",
  "an",
  "my",
  "hi",
  "i",
  "craz",
  "work",
  "typing",
  "laptop",
  "ing",
  "NOD",
  "Eye",
  "Rage",
  "é",
  "İ",
  "😀",
  "\uD800",
] as const;
// Separators, and two Unicode marks ("…", "—") that are not separators.
const SEPS = [
  "",
  " ",
  "  ",
  "\t",
  " ",
  "-",
  ", ",
  "!",
  "_",
  "/",
  "...",
  "…",
  "—",
] as const;
const WORDLESS = [
  " ",
  "  ",
  "\t",
  " ",
  "-",
  "!",
  ",",
  ".",
  "_",
  "/",
  "?",
] as const;

interface GifHistory {
  slug: string;
  tags: string[];
  title: string;
}
interface QueryPart {
  piece: string;
  sep: string;
}
interface SearchHistory {
  catalog: GifHistory[];
  lead: string;
  parts: QueryPart[];
}

const gifArbitrary: Arbitrary<GifHistory> = record({
  slug: constantFrom(...SLUGS),
  tags: array(constantFrom(...TAGS), { maxLength: 5 }),
  title: constantFrom(...TITLES),
});
const catalogArbitrary = array(gifArbitrary, { maxLength: MAX_CATALOG });

const searchArbitrary: Arbitrary<SearchHistory> = record({
  catalog: catalogArbitrary,
  lead: constantFrom(...SEPS),
  parts: array(
    record({
      piece: constantFrom(...PIECES),
      sep: constantFrom(...SEPS),
    }),
    { maxLength: 4 }
  ),
});

const resolveSearch = (history: SearchHistory): SearchPlan => ({
  catalog: history.catalog,
  query:
    history.lead + history.parts.map((part) => part.piece + part.sep).join(""),
});

// Keeps room for the GIFs a constructed history adds.
const roomFor = (catalog: GifHistory[], added: number): GifHistory[] =>
  catalog.slice(0, MAX_CATALOG - added);

const ANGRY: GifHistory = {
  slug: "angry",
  tags: ["mad", "rage"],
  title: "Angry",
};
const ANNOYED: GifHistory = {
  slug: "annoyed",
  tags: ["eye-roll", "annoyed"],
  title: "Annoyed",
};
const NOD: GifHistory = { slug: "nod", tags: ["nod", "yes"], title: "Nod" };
const CLAP: GifHistory = { slug: "clap", tags: ["clap"], title: "Clap" };

const query = (
  ...parts: [string, string][]
): Pick<SearchHistory, "lead" | "parts"> => ({
  lead: "",
  parts: parts.map(([piece, sep]) => ({ piece, sep })),
});

// ---------------------------------------------------------------------------
// Reach: predicates over the plan, in the terms of the laws.
// ---------------------------------------------------------------------------

const matching = (plan: SearchPlan): GifView[] =>
  expectedSearch(plan).results.map((index) => viewOf(plan.catalog[index]));

// Two or more separators in a row, with a word on each side.
const hasRepeatedSeparators = (text: string): boolean => {
  const runs = [...text]
    .map((char) => (isSeparator(char) ? "s" : "w"))
    .join("");
  return /ws{2,}w/u.test(runs);
};

const everyWordStates = (plan: SearchPlan): string[] => {
  const words = wordsOf(plan.query);
  const states: string[] = [];
  const matched = matching(plan);
  const reversed = matched.some((gif) =>
    words.some((word, index) =>
      words
        .slice(index + 1)
        .some(
          (later) =>
            gif.tags.includes(word) &&
            gif.tags.includes(later) &&
            gif.tags.indexOf(later) < gif.tags.indexOf(word)
        )
    )
  );
  if (reversed) {
    states.push("words out of stored order");
  }
  const hyphenated = matched.some((gif) =>
    words.some((word, index) =>
      gif.tags.includes(`${word}-${words[index + 1]}`)
    )
  );
  if (hyphenated) {
    states.push("hyphenated tag typed as words");
  }
  const shortInside = plan.catalog
    .map(viewOf)
    .some((gif) =>
      words.some(
        (word) =>
          word.length < MIN_INSIDE_LENGTH &&
          wordScore(gif, word) === 0 &&
          [gif.slug, gif.title, ...gif.tags].some((text) => text.includes(word))
      )
    );
  if (shortInside) {
    states.push("short word only inside a word");
  }
  if (matched.some((gif) => words.some((word) => wordScore(gif, word) === 2))) {
    states.push("word inside a tag");
  }
  if (hasRepeatedSeparators(plan.query)) {
    states.push("repeated separators");
  }
  const shortStart = matched.some((gif) =>
    words.some(
      (word) => word.length < MIN_INSIDE_LENGTH && wordScore(gif, word) === 3
    )
  );
  if (shortStart) {
    states.push("short word starts a title word");
  }
  return states;
};

// ---------------------------------------------------------------------------
// Law: every word.
// ---------------------------------------------------------------------------

const EVERY_WORD = "every word";

oracleProperty({
  calibrations: [
    {
      corrupt: (trace) => withResults(trace, (results) => results.slice(1)),
      history: { constructed: "tags typed in reverse" },
      law: EVERY_WORD,
      name: "drops a matching GIF",
    },
  ],
  check: (_plan, observations, expected: Expected) => {
    const results = observedResults(observations);
    if (!results) {
      return threw(EVERY_WORD);
    }
    return (
      differs(
        "results",
        EVERY_WORD,
        results.toSorted(numeric),
        expected.results.toSorted(numeric),
        "the results are not the GIFs that match every word"
      ) ?? pass
    );
  },
  driver,
  histories: {
    arbitrary: searchArbitrary,
    constructed: [
      {
        build: (base): SearchHistory => ({
          catalog: [...roomFor(base.catalog, 1), ANGRY],
          ...query(["rage", " "], ["mad", ""]),
        }),
        enters: ["words out of stored order"],
        name: "tags typed in reverse",
      },
      {
        build: (base): SearchHistory => ({
          catalog: [...roomFor(base.catalog, 1), ANNOYED],
          ...query(["eye", " "], ["roll", ""]),
        }),
        enters: ["hyphenated tag typed as words"],
        name: "hyphen typed as a space",
      },
      {
        build: (base): SearchHistory => ({
          catalog: [
            ...roomFor(base.catalog, 1),
            { slug: "cooked", tags: ["cooked"], title: "Cooked!" },
          ],
          ...query(["ok", ""]),
        }),
        enters: ["short word only inside a word"],
        name: "two letters inside a word",
      },
      {
        build: (base): SearchHistory => ({
          catalog: [
            ...roomFor(base.catalog, 1),
            { slug: "fishing", tags: ["fishing"], title: "Fishing" },
          ],
          ...query(["ish", ""]),
        }),
        enters: ["word inside a tag"],
        name: "three letters inside a tag",
      },
      {
        build: (base): SearchHistory => ({
          catalog: [...roomFor(base.catalog, 1), NOD],
          ...query(["nod", "  "], ["yes", ""]),
        }),
        enters: ["repeated separators"],
        name: "double space between words",
      },
      {
        build: (base): SearchHistory => ({
          catalog: [
            ...roomFor(base.catalog, 1),
            { slug: "my-man", tags: ["clap"], title: "My man" },
          ],
          ...query(["ma", ""]),
        }),
        enters: ["short word starts a title word"],
        name: "two letters starting a title word",
      },
    ],
    fixedSeeds: [SEED],
    runs: RUNS,
    states: [
      "words out of stored order",
      "hyphenated tag typed as words",
      "short word only inside a word",
      "word inside a tag",
      "repeated separators",
      "short word starts a title word",
    ],
  },
  id: "search-gifs/every-word",
  law: {
    authority: AUTHORITY,
    limits:
      'Tags are matched whole, never split at "-". Word length counts UTF-16 code units. Unicode punctuation outside the separator list stays inside a word. Catalog tags carry no surrounding spaces.',
    statement:
      "For every catalog and every query with at least one word, a GIF is in the results exactly when every word of the query scores above 0 against it: a word scores when a tag, or a word of the title or slug, equals it or starts with it, or, for a word of three or more characters, when a tag, the slug, or the title contains it.",
  },
  model: (plan) => expectedSearch(plan),
  owns: ["lib/gifs.ts#searchGifs"],
  reached: (plan) => everyWordStates(plan),
  resolve: resolveSearch,
});

// ---------------------------------------------------------------------------
// Law: best first.
// ---------------------------------------------------------------------------

const BEST_FIRST = "best first";

const bestFirstStates = (plan: SearchPlan): string[] => {
  const { results, totals } = expectedSearch(plan);
  const states: string[] = [];
  const pairs = results.flatMap((left, index) =>
    results.slice(index + 1).map((right) => [left, right] as const)
  );
  if (pairs.some(([first, second]) => second < first)) {
    states.push("better match later in catalog");
  }
  if (pairs.some(([first, second]) => totals[first] === totals[second])) {
    states.push("equal totals");
  }
  const views = plan.catalog.map(viewOf);
  const words = wordsOf(plan.query);
  const tierIn = (tier: number): boolean =>
    results.some((index) =>
      words.some((word) => wordScore(views[index], word) === tier)
    );
  if (tierIn(5) && tierIn(4)) {
    states.push("title word against tag prefix");
  }
  return states;
};

oracleProperty({
  calibrations: [
    {
      corrupt: (trace) => withResults(trace, (results) => results.toReversed()),
      history: { constructed: "exact tag after a title word" },
      law: BEST_FIRST,
      name: "reverses the results",
    },
  ],
  // Judges the order of what came back; which GIFs came back is every word's.
  check: (_plan, observations, expected: Expected) => {
    const results = observedResults(observations);
    if (!results) {
      return threw(BEST_FIRST);
    }
    const totalAt = (index: number): number => expected.totals[index] ?? 0;
    const owed = results.toSorted(
      (left, right) => totalAt(right) - totalAt(left) || left - right
    );
    return (
      differs(
        "results",
        BEST_FIRST,
        results,
        owed,
        "the results are not ordered by total, then catalog order"
      ) ?? pass
    );
  },
  driver,
  histories: {
    arbitrary: searchArbitrary,
    constructed: [
      {
        build: (base): SearchHistory => ({
          catalog: [
            { slug: "crazy-nod", tags: ["agree"], title: "Crazy Nod" },
            { slug: "nod", tags: ["nod"], title: "Nod" },
            ...roomFor(base.catalog, 2),
          ],
          ...query(["nod", ""]),
        }),
        enters: ["better match later in catalog"],
        name: "exact tag after a title word",
      },
      {
        build: (base): SearchHistory => ({
          catalog: [
            { slug: "nod", tags: ["nod"], title: "Nod" },
            { slug: "crazy-nod", tags: ["nod"], title: "Crazy Nod" },
            ...roomFor(base.catalog, 2),
          ],
          ...query(["nod", ""]),
        }),
        enters: ["equal totals"],
        name: "two exact tags",
      },
      {
        build: (base): SearchHistory => ({
          catalog: [
            { slug: "clap", tags: ["in-love"], title: "Clap" },
            { slug: "in-love", tags: [], title: "In Love" },
            ...roomFor(base.catalog, 2),
          ],
          ...query(["in", ""]),
        }),
        enters: [
          "better match later in catalog",
          "title word against tag prefix",
        ],
        name: "title word after a tag prefix",
      },
    ],
    fixedSeeds: [SEED],
    runs: RUNS,
    states: [
      "better match later in catalog",
      "equal totals",
      "title word against tag prefix",
    ],
  },
  id: "search-gifs/best-first",
  law: {
    authority: AUTHORITY,
    limits:
      "Judges only the order of the GIFs returned; which GIFs come back is the every-word law's.",
    statement:
      "For every catalog and query, the results run from the highest total to the lowest, and equal totals keep catalog order. A word scores its best tier: 6 a tag equal to it, 5 a title or slug word equal to it, 4 a tag that starts with it, 3 a title or slug word that starts with it, 2 a tag that contains it, 1 the slug or title containing it; a GIF's total is the sum over the query's words.",
  },
  model: (plan) => expectedSearch(plan),
  owns: ["lib/gifs.ts#searchGifs"],
  reached: (plan) => bestFirstStates(plan),
  resolve: resolveSearch,
});

// ---------------------------------------------------------------------------
// Law: no words, whole catalog.
// ---------------------------------------------------------------------------

const NO_WORDS = "no words";

interface WordlessHistory {
  catalog: GifHistory[];
  marks: string[];
}

const wordlessStates = (plan: SearchPlan): string[] => {
  if (plan.query === "") {
    return ["empty query"];
  }
  return /^\s+$/u.test(plan.query) ? ["whitespace only"] : ["punctuation only"];
};

oracleProperty({
  calibrations: [
    {
      corrupt: (trace) => withResults(trace, (results) => results.slice(0, -1)),
      history: { constructed: "a lone hyphen" },
      law: NO_WORDS,
      name: "drops the last GIF",
    },
  ],
  check: (_plan, observations, expected: Expected) => {
    const results = observedResults(observations);
    if (!results) {
      return threw(NO_WORDS);
    }
    return (
      differs(
        "results",
        NO_WORDS,
        results,
        expected.results,
        "a query with no words did not return the whole catalog in order"
      ) ?? pass
    );
  },
  driver,
  histories: {
    arbitrary: record({
      catalog: catalogArbitrary,
      marks: array(constantFrom(...WORDLESS), { maxLength: 5 }),
    }),
    constructed: [
      {
        build: (base): WordlessHistory => ({
          catalog: base.catalog,
          marks: [],
        }),
        enters: ["empty query"],
        name: "empty",
      },
      {
        build: (base): WordlessHistory => ({
          catalog: base.catalog,
          marks: [" ", "\t"],
        }),
        enters: ["whitespace only"],
        name: "a space and a tab",
      },
      {
        build: (base): WordlessHistory => ({
          catalog: [...roomFor(base.catalog, 2), ANNOYED, CLAP],
          marks: ["-"],
        }),
        enters: ["punctuation only"],
        name: "a lone hyphen",
      },
    ],
    fixedSeeds: [SEED],
    runs: RUNS,
    states: ["empty query", "whitespace only", "punctuation only"],
  },
  id: "search-gifs/no-words",
  law: {
    authority: AUTHORITY,
    limits: "Unicode punctuation outside the separator list counts as a word.",
    statement:
      "For every catalog, a query with no words (empty, whitespace, or separator punctuation only) returns the whole catalog in catalog order.",
  },
  model: (plan) => expectedSearch(plan),
  owns: ["lib/gifs.ts#searchGifs"],
  reached: (plan) => wordlessStates(plan),
  resolve: (history: WordlessHistory): SearchPlan => ({
    catalog: history.catalog,
    query: history.marks.join(""),
  }),
  // A query with no words returns the catalog without scoring a single GIF.
  work: { ratio: 1.5 },
});

// ---------------------------------------------------------------------------
// Law: no throw on any query.
// ---------------------------------------------------------------------------

const NO_THROW = "no throw";

interface AnyQueryHistory {
  catalog: GifHistory[];
  characters: string[];
}

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const ASTRAL = /[\u{10000}-\u{10FFFF}]/u;

// One code point, or one lone surrogate; a query maps back to its characters.
// Lone surrogates at the ends of both halves, and the two halves of an emoji.
const LONE_SURROGATES = [
  "\uD800",
  "\uDBFF",
  "\uDC00",
  "\uDFFF",
  "\uD83D",
  "\uDE00",
] as const;
// One code point, or one lone surrogate.
const characterArbitrary = oneof(
  string({ maxLength: 1, minLength: 1, unit: "binary" }),
  constantFrom(...LONE_SURROGATES)
);
const anyGifArbitrary: Arbitrary<GifHistory> = record({
  slug: string({ maxLength: 8, unit: "binary" }),
  tags: array(string({ maxLength: 8, unit: "binary" }), { maxLength: 4 }),
  title: string({ maxLength: 8, unit: "binary" }),
});

oracleProperty({
  calibrations: [
    {
      corrupt: (trace) =>
        trace.map((each) =>
          each.checkpoint === "results"
            ? { checkpoint: "error", value: "URI malformed" }
            : each
        ),
      history: { constructed: "a lone surrogate before a word" },
      law: NO_THROW,
      name: "throws",
    },
  ],
  check: (_plan, observations) =>
    observedResults(observations) ? pass : threw(NO_THROW),
  driver,
  histories: {
    arbitrary: record({
      catalog: array(oneof(gifArbitrary, anyGifArbitrary), {
        maxLength: MAX_CATALOG,
      }),
      characters: array(characterArbitrary, { maxLength: 10 }),
    }),
    constructed: [
      {
        build: (base): AnyQueryHistory => ({
          catalog: base.catalog,
          characters: ["\uD800", "n", "o", "d"],
        }),
        enters: ["lone surrogate in query"],
        name: "a lone surrogate before a word",
      },
      {
        build: (base): AnyQueryHistory => ({
          catalog: base.catalog,
          characters: ["😀", " ", "n", "o", "d"],
        }),
        enters: ["astral character in query"],
        name: "an emoji before a word",
      },
    ],
    fixedSeeds: [SEED],
    runs: RUNS,
    states: ["lone surrogate in query", "astral character in query"],
  },
  id: "search-gifs/no-throw",
  law: {
    authority: `${AUTHORITY} No throw on valid input: searchGifs is called on every keystroke with whatever the search box holds.`,
    limits: "Catalog strings are at most 8 characters, queries at most 10.",
    statement:
      "For every query string, lone surrogates and astral characters included, and every catalog of GIFs, searchGifs returns a list instead of throwing.",
  },
  model: (plan) => expectedSearch(plan),
  owns: ["lib/gifs.ts#searchGifs"],
  reached: (plan) => [
    ...(LONE_SURROGATE.test(plan.query) ? ["lone surrogate in query"] : []),
    ...(ASTRAL.test(plan.query) ? ["astral character in query"] : []),
  ],
  resolve: (history: AnyQueryHistory): SearchPlan => ({
    catalog: history.catalog,
    query: history.characters.join(""),
  }),
});
