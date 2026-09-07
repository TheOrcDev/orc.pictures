export interface Gif {
  file: string;
  height: number;
  slug: string;
  tags: string[];
  title: string;
  width: number;
}

export const gifs: Gif[] = [];

export const searchGifs = (query: string, catalog: Gif[] = gifs): Gif[] => {
  const normalized = query.trim().toLowerCase();

  if (normalized === "") {
    return catalog;
  }

  return catalog.filter((gif) => {
    const haystack = [gif.slug, gif.title, ...gif.tags].join(" ").toLowerCase();

    return haystack.includes(normalized);
  });
};
