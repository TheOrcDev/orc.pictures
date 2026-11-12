import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { gifs } from "@/lib/gifs";
import type { Gif, GifAsset } from "@/lib/gifs";

export const dynamic = "force-static";

interface CatalogEntry extends Gif {
  revision: string;
  videorc?: GifAsset & { revision?: string };
}

const revisionFor = async (assetPath: string): Promise<string> => {
  const publicRoot = path.join(process.cwd(), "public");
  const filePath = path.resolve(publicRoot, assetPath.replace(/^\//u, ""));
  const relativePath = path.relative(publicRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Catalog asset escaped public");
  }

  const bytes = await readFile(filePath);

  return createHash("sha256").update(bytes).digest("hex").slice(0, 12);
};

export const GET = async (): Promise<Response> => {
  const catalog = await Promise.all(
    gifs.map(async (gif) => {
      const entry: CatalogEntry = {
        ...gif,
        revision: await revisionFor(gif.file),
      };

      // Raycast caches each GIF by revision, so a redone Videorc GIF needs its own.
      if (gif.videorc) {
        entry.videorc = {
          ...gif.videorc,
          revision: await revisionFor(gif.videorc.file),
        };
      }

      return entry;
    })
  );

  return Response.json(catalog);
};
