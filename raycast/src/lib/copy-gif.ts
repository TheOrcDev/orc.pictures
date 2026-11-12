import { existsSync } from "node:fs";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { environment } from "@raycast/api";

import { assetUrl, isSafeSlug, type GifStyle, type StyledGif } from "./catalog";

const gifFileName = (slug: string): string => {
  if (!isSafeSlug(slug)) {
    throw new Error("Invalid GIF slug");
  }

  return `${slug}.gif`;
};

const pathInside = (root: string, fileName: string): string => {
  const resolvedRoot = resolve(root);
  const resolved = resolve(resolvedRoot, fileName);
  const rel = relative(resolvedRoot, resolved);

  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("GIF path escaped directory");
  }

  return resolved;
};

// Videorc GIFs share slugs with the orc ones, so each style keeps its own folder.
const styleFolder = (root: string, style: GifStyle): string =>
  style === "videorc" ? pathInside(root, "videorc") : resolve(root);

const cacheDirectory = (style: GifStyle): string =>
  styleFolder(resolve(environment.supportPath, "gifs"), style);

const cachedGifName = (slug: string, revision?: string): string => {
  if (!revision) {
    return gifFileName(slug);
  }

  return `${slug}.${revision}.gif`;
};

const cachedGifPath = (
  style: GifStyle,
  slug: string,
  revision?: string
): string => pathInside(cacheDirectory(style), cachedGifName(slug, revision));

const belongsToSlug = (fileName: string, slug: string): boolean =>
  fileName === `${slug}.gif` || fileName.startsWith(`${slug}.`);

const localGifPath = (
  style: GifStyle,
  slug: string,
  localGifsDirectory: string | undefined
): string | undefined => {
  if (!localGifsDirectory) {
    return undefined;
  }

  const path = pathInside(
    styleFolder(localGifsDirectory, style),
    gifFileName(slug)
  );

  if (!existsSync(path)) {
    return undefined;
  }

  return path;
};

const fileSize = async (filePath: string): Promise<number | undefined> => {
  try {
    const info = await stat(filePath);

    if (info.size > 0) {
      return info.size;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const remoteSize = async (url: string): Promise<number | undefined> => {
  const response = await fetch(url, { method: "HEAD" });

  if (!response.ok) {
    return undefined;
  }

  const length = Number(response.headers.get("content-length"));

  if (!Number.isFinite(length) || length <= 0) {
    return undefined;
  }

  return length;
};

const cachedGifIfReady = async (
  style: GifStyle,
  slug: string,
  remoteUrl: string,
  revision?: string
): Promise<string | undefined> => {
  const path = cachedGifPath(style, slug, revision);
  const size = await fileSize(path);

  if (size === undefined) {
    return undefined;
  }

  if (revision) {
    return path;
  }

  const latestSize = await remoteSize(remoteUrl);

  if (latestSize === undefined || latestSize === size) {
    return path;
  }

  return undefined;
};

const removeStaleCopies = async (
  style: GifStyle,
  slug: string,
  keep: string
): Promise<void> => {
  const directory = cacheDirectory(style);
  const names = await readdir(directory).catch(() => []);

  await Promise.all(
    names.map(async (name) => {
      if (!belongsToSlug(name, slug) || name === keep) {
        return;
      }

      await unlink(pathInside(directory, name)).catch(() => undefined);
    })
  );
};

export const ensureLocalGif = async (
  gif: StyledGif,
  origin: string,
  localGifsDirectory?: string
): Promise<string> => {
  const localPath = localGifPath(gif.style, gif.slug, localGifsDirectory);

  if (localPath) {
    return localPath;
  }

  const remoteUrl = assetUrl(gif.file, origin, gif.revision);
  const cachedPath = await cachedGifIfReady(
    gif.style,
    gif.slug,
    remoteUrl,
    gif.revision
  );

  if (cachedPath) {
    return cachedPath;
  }

  const response = await fetch(remoteUrl);

  if (!response.ok) {
    throw new Error(`Could not download ${gif.slug}.gif`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const dest = cachedGifPath(gif.style, gif.slug, gif.revision);

  await mkdir(cacheDirectory(gif.style), { recursive: true });
  await writeFile(dest, bytes);
  await removeStaleCopies(
    gif.style,
    gif.slug,
    cachedGifName(gif.slug, gif.revision)
  );

  return dest;
};
