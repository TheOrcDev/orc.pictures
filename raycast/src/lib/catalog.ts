import fallbackCatalog from "../fallback-catalog.json";

export const GIF_STYLES = ["orc", "videorc"] as const;

export type GifStyle = (typeof GIF_STYLES)[number];

export const isGifStyle = (value: unknown): value is GifStyle =>
  GIF_STYLES.some((style) => style === value);

export interface GifAsset {
  file: string;
  poster: string;
  revision?: string;
}

export interface CatalogGif extends GifAsset {
  slug: string;
  tags: string[];
  title: string;
  videorc?: GifAsset;
}

// One GIF in one style, ready to show and copy.
export interface StyledGif extends GifAsset {
  slug: string;
  style: GifStyle;
  tags: string[];
  title: string;
}

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_ASSET_PATH = /^\/gifs\/[a-z0-9]+(?:-[a-z0-9]+)*\.(gif|jpg)$/;
const SAFE_VIDEORC_ASSET_PATH =
  /^\/gifs\/videorc\/[a-z0-9]+(?:-[a-z0-9]+)*\.(gif|jpg)$/;
const SAFE_REVISION = /^[a-f0-9]{8,64}$/;

export const isSafeSlug = (slug: unknown): slug is string =>
  typeof slug === "string" && SAFE_SLUG.test(slug);

const isSafeAssetPath = (path: unknown): path is string =>
  typeof path === "string" && SAFE_ASSET_PATH.test(path);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  value !== undefined &&
  !Array.isArray(value) &&
  value.constructor === Object;

const isCatalogGif = (value: unknown): value is CatalogGif => {
  if (!isRecord(value)) {
    return false;
  }

  if (!isSafeSlug(value.slug)) {
    return false;
  }

  if (!isSafeAssetPath(value.file) || !isSafeAssetPath(value.poster)) {
    return false;
  }

  if (typeof value.title !== "string") {
    return false;
  }

  return (
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  );
};

const revisionOf = (value: unknown): string | undefined =>
  typeof value === "string" && SAFE_REVISION.test(value) ? value : undefined;

const isSafeVideorcAssetPath = (path: unknown): path is string =>
  typeof path === "string" && SAFE_VIDEORC_ASSET_PATH.test(path);

// A missing or malformed Videorc asset drops only the Videorc version, not the GIF.
const videorcAssetOf = (value: unknown): GifAsset | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  if (!isSafeVideorcAssetPath(value.file)) {
    return undefined;
  }

  if (!isSafeVideorcAssetPath(value.poster)) {
    return undefined;
  }

  return {
    file: value.file,
    poster: value.poster,
    revision: revisionOf(value.revision),
  };
};

export const parseCatalog = (value: unknown): CatalogGif[] => {
  if (!Array.isArray(value)) {
    throw new Error("Catalog must be an array");
  }

  const gifs = value.filter(isCatalogGif).map((gif) => ({
    file: gif.file,
    poster: gif.poster,
    revision: revisionOf(gif.revision),
    slug: gif.slug,
    tags: gif.tags,
    title: gif.title,
    videorc: videorcAssetOf(gif.videorc),
  }));

  if (gifs.length === 0) {
    throw new Error("Catalog is empty");
  }

  return gifs;
};

export const bundledCatalog: CatalogGif[] = parseCatalog(fallbackCatalog);

// The Videorc style lists only the GIFs that already have a Videorc version.
export const gifsForStyle = (
  gifs: CatalogGif[],
  style: GifStyle
): StyledGif[] =>
  gifs.flatMap((gif) => {
    const asset = style === "videorc" ? gif.videorc : gif;

    if (!asset) {
      return [];
    }

    return [
      {
        file: asset.file,
        poster: asset.poster,
        revision: asset.revision,
        slug: gif.slug,
        style,
        tags: gif.tags,
        title: gif.title,
      },
    ];
  });

export const absoluteUrl = (path: string, origin: string): string => {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    throw new Error("Catalog path must be root-relative");
  }

  const base = new URL(origin);

  if (base.protocol !== "https:" && base.protocol !== "http:") {
    throw new Error("Site origin must be HTTP or HTTPS");
  }

  const url = new URL(path, base);

  if (url.origin !== base.origin) {
    throw new Error("Catalog URL must stay on the site origin");
  }

  return url.href;
};

export const assetUrl = (
  assetPath: string,
  origin: string,
  revision?: string
): string => {
  const href = absoluteUrl(assetPath, origin);

  if (!revision) {
    return href;
  }

  const url = new URL(href);
  url.searchParams.set("v", revision);

  return url.href;
};
