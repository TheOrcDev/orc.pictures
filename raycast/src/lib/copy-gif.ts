import { existsSync } from "node:fs";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { environment } from "@raycast/api";

import { assetUrl, isSafeSlug, type CatalogGif } from "./catalog";

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

const cacheDirectory = (): string => resolve(environment.supportPath, "gifs");

const cachedGifName = (slug: string, revision?: string): string => {
  if (!revision) {
    return gifFileName(slug);
  }

  return `${slug}.${revision}.gif`;
};

const cachedGifPath = (slug: string, revision?: string): string =>
  pathInside(cacheDirectory(), cachedGifName(slug, revision));

const belongsToSlug = (fileName: string, slug: string): boolean =>
  fileName === `${slug}.gif` || fileName.startsWith(`${slug}.`);

const localGifPath = (
  slug: string,
  localGifsDirectory: string | undefined
): string | undefined => {
  if (!localGifsDirectory) {
    return undefined;
  }

  const path = pathInside(localGifsDirectory, gifFileName(slug));

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
  slug: string,
  remoteUrl: string,
  revision?: string
): Promise<string | undefined> => {
  const path = cachedGifPath(slug, revision);
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

const removeStaleCopies = async (slug: string, keep: string): Promise<void> => {
  const names = await readdir(cacheDirectory()).catch(() => []);

  await Promise.all(
    names.map(async (name) => {
      if (!belongsToSlug(name, slug) || name === keep) {
        return;
      }

      await unlink(pathInside(cacheDirectory(), name)).catch(() => undefined);
    })
  );
};

export const ensureLocalGif = async (
  gif: CatalogGif,
  origin: string,
  localGifsDirectory?: string
): Promise<string> => {
  const localPath = localGifPath(gif.slug, localGifsDirectory);

  if (localPath) {
    return localPath;
  }

  const remoteUrl = assetUrl(gif.file, origin, gif.revision);
  const cachedPath = await cachedGifIfReady(gif.slug, remoteUrl, gif.revision);

  if (cachedPath) {
    return cachedPath;
  }

  const response = await fetch(remoteUrl);

  if (!response.ok) {
    throw new Error(`Could not download ${gif.slug}.gif`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const dest = cachedGifPath(gif.slug, gif.revision);

  await mkdir(cacheDirectory(), { recursive: true });
  await writeFile(dest, bytes);
  await removeStaleCopies(gif.slug, cachedGifName(gif.slug, gif.revision));

  return dest;
};
