import catalog from "@/content/gifs.json";

export const GIF_STYLES = ["orc", "videorc"] as const;

export type GifStyle = (typeof GIF_STYLES)[number];

export const DEFAULT_GIF_STYLE: GifStyle = "orc";

export interface GifAsset {
  file: string;
  height: number;
  poster: string;
  width: number;
}

export interface Gif extends GifAsset {
  videorc?: GifAsset;
  slug: string;
  tags: string[];
  title: string;
}

// SAFETY: content/gifs.json is authored by scripts/import-gif.ts in the Gif shape.
export const gifs: Gif[] = catalog;

export const isGifStyle = (value: unknown): value is GifStyle =>
  GIF_STYLES.some((style) => style === value);

// A GIF without a Videorc version yet falls back to its orc files.
export const gifAsset = (gif: Gif, style: GifStyle): GifAsset =>
  style === "videorc" && gif.videorc ? gif.videorc : gif;

// The Videorc tab lists only the GIFs that already have a Videorc version.
export const gifsForStyle = (
  style: GifStyle,
  catalogItems: Gif[] = gifs
): Gif[] =>
  style === "videorc"
    ? catalogItems.filter((gif) => gif.videorc !== undefined)
    : catalogItems;

export const getGifBySlug = (
  slug: string,
  catalogItems: Gif[] = gifs
): Gif | undefined => catalogItems.find((gif) => gif.slug === slug);

// Search follows the Omarchy shell (omarchy/OrcCatalog.js): every query word
// must match, in any order, and the best matches come first.
const WORD_SEPARATORS = /[\s.,!?;:"'()[\]{}/\\|_*#@~`+=<>-]+/u;
// Shorter words only match at the start of a tag or word, so "ok" skips "cooked".
const MIN_INNER_MATCH = 3;

const wordsOf = (text: string): string[] =>
  text.toLowerCase().split(WORD_SEPARATORS).filter(Boolean);

interface SearchableGif {
  tags: string[];
  text: string;
  words: string[];
}

const searchable = (gif: Gif): SearchableGif => ({
  tags: gif.tags.map((tag) => tag.toLowerCase()),
  text: `${gif.slug} ${gif.title}`.toLowerCase(),
  words: [...wordsOf(gif.title), ...wordsOf(gif.slug)],
});

// 6 exact tag, 5 exact title or slug word, 4 tag prefix, 3 word prefix,
// 2 inside a tag, 1 inside the slug or title, 0 no match.
const wordScore = (gif: SearchableGif, word: string): number => {
  const inner = word.length >= MIN_INNER_MATCH;
  let best = 0;

  for (const tag of gif.tags) {
    if (tag === word) {
      return 6;
    }
    if (tag.startsWith(word)) {
      best = Math.max(best, 4);
    } else if (inner && tag.includes(word)) {
      best = Math.max(best, 2);
    }
  }

  for (const each of gif.words) {
    if (each === word) {
      best = Math.max(best, 5);
    } else if (each.startsWith(word)) {
      best = Math.max(best, 3);
    }
  }

  if (best === 0 && inner && gif.text.includes(word)) {
    return 1;
  }

  return best;
};

export const searchGifs = (
  query: string,
  catalogItems: Gif[] = gifs
): Gif[] => {
  const words = wordsOf(query);

  if (words.length === 0) {
    return catalogItems;
  }

  const ranked: { gif: Gif; total: number }[] = [];

  for (const gif of catalogItems) {
    const view = searchable(gif);
    let total = 0;
    const matchesEveryWord = words.every((word) => {
      const score = wordScore(view, word);
      total += score;
      return score > 0;
    });

    if (matchesEveryWord) {
      ranked.push({ gif, total });
    }
  }

  // toSorted is stable, so equal totals keep catalog order.
  return ranked
    .toSorted((left, right) => right.total - left.total)
    .map(({ gif }) => gif);
};
