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

export const searchGifs = (
  query: string,
  catalogItems: Gif[] = gifs
): Gif[] => {
  const normalized = query.trim().toLowerCase();

  if (normalized === "") {
    return catalogItems;
  }

  return catalogItems.filter((gif) => {
    const haystack = [gif.slug, gif.title, ...gif.tags].join(" ").toLowerCase();

    return haystack.includes(normalized);
  });
};
