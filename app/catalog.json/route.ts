import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { gifs } from "@/lib/gifs";

export const dynamic = "force-static";

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
    gifs.map(async (gif) => ({
      ...gif,
      revision: await revisionFor(gif.file),
    }))
  );

  return Response.json(catalog);
};
