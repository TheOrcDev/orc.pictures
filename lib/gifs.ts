import catalog from "@/content/gifs.json";

export interface Gif {
  file: string;
  height: number;
  slug: string;
  tags: string[];
  title: string;
  width: number;
}

// SAFETY: content/gifs.json is authored by scripts/import-gif.ts in the Gif shape.
export const gifs: Gif[] = catalog;

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
