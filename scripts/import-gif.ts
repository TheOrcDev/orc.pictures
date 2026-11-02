import { spawn } from "node:child_process";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

interface GifAsset {
  file: string;
  height: number;
  poster: string;
  width: number;
}

interface Gif extends GifAsset {
  oil?: GifAsset;
  slug: string;
  tags: string[];
  title: string;
}

type GifStyle = "oil" | "watercolor";

const MAX_WIDTH = 640;
const STILL_FPS = 8;
const STILL_FRAMES = 8;
const STILL_WORK_WIDTH = 800;
const STILL_CROP = 0.9;
const STILL_COLORS = 48;
const CATALOG_PATH = path.join(process.cwd(), "content/gifs.json");
const DEFAULT_OUT_DIR = path.join(process.cwd(), "public/gifs");
const OIL_OUT_DIR = path.join(DEFAULT_OUT_DIR, "oil");
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface ImportOptions {
  input: string;
  outDir: string;
  slug: string;
  style: GifStyle;
  tags: string[];
  title: string;
}

interface Probe {
  codecName: string;
  frameCount: number;
  height: number;
  width: number;
}

const parseArgs = (argv: string[]): Record<string, string> => {
  const result: Record<string, string> = {};
  const tokens = argv[Symbol.iterator]();
  let step = tokens.next();

  while (!step.done) {
    const token = step.value;

    if (!token.startsWith("--")) {
      step = tokens.next();
      continue;
    }

    const key = token.slice(2);
    const next = tokens.next();

    if (next.done || next.value.startsWith("--")) {
      result[key] = "true";
      step = next;
      continue;
    }

    result[key] = next.value;
    step = tokens.next();
  }

  return result;
};

const titleFromSlug = (slug: string): string => {
  const [first = "", ...rest] = slug.split("-");

  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
};

const uniqueTags = (tags: string[]): string[] => {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
};

const run = async (command: string, args: string[]): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(`${command} exited with ${code}\n${stderr}`));
    });
  });
};

const probeVideo = async (filePath: string): Promise<Probe> => {
  const output = await run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,nb_frames,codec_name",
    "-of",
    "json",
    filePath,
  ]);
  const parsed: unknown = JSON.parse(output);

  if (typeof parsed !== "object" || parsed === null || !("streams" in parsed)) {
    throw new Error(`Could not probe ${filePath}`);
  }

  const streams = parsed.streams;

  if (!Array.isArray(streams) || streams.length === 0) {
    throw new Error(`No video stream in ${filePath}`);
  }

  const stream = streams[0];

  if (typeof stream !== "object" || stream === null) {
    throw new Error(`Invalid stream data in ${filePath}`);
  }

  const width = "width" in stream ? Number(stream.width) : Number.NaN;
  const height = "height" in stream ? Number(stream.height) : Number.NaN;
  const codecName =
    "codec_name" in stream && typeof stream.codec_name === "string"
      ? stream.codec_name
      : "unknown";
  const frameCount =
    "nb_frames" in stream && stream.nb_frames !== "N/A"
      ? Number(stream.nb_frames)
      : 1;

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Missing dimensions in ${filePath}`);
  }

  return {
    codecName,
    frameCount: Number.isFinite(frameCount) ? frameCount : 1,
    height,
    width,
  };
};

const scaleFilter = `scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos`;

const convertStill = async (input: string, output: string): Promise<void> => {
  const scaled = `${output}.scaled.png`;
  const motion = `${output}.motion.mkv`;
  const poster = output.replace(/\.gif$/u, ".jpg");
  const pan = [
    `crop=iw*${STILL_CROP}:ih*${STILL_CROP}`,
    `'(iw-ow)/2+((iw-ow)/2)*sin(2*PI*n/${STILL_FRAMES})'`,
    `'(ih-oh)/2+((ih-oh)/2)*sin(2*PI*n/${STILL_FRAMES}+PI/2)'`,
  ].join(":");

  await run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    `scale='min(${STILL_WORK_WIDTH},iw)':-2:flags=lanczos`,
    "-frames:v",
    "1",
    "-update",
    "1",
    scaled,
  ]);

  try {
    await run("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-framerate",
      String(STILL_FPS),
      "-i",
      scaled,
      "-frames:v",
      String(STILL_FRAMES),
      "-vf",
      `${pan},${scaleFilter}`,
      "-c:v",
      "png",
      motion,
    ]);
    await run("ffmpeg", [
      "-y",
      "-i",
      motion,
      "-gifflags",
      "+transdiff",
      "-vf",
      `split[s0][s1];[s0]palettegen=max_colors=${STILL_COLORS}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      output,
    ]);
    await run("gifsicle", [
      "-O3",
      "--lossy=80",
      `--colors=${STILL_COLORS}`,
      output,
      "-o",
      output,
    ]);
    await writePoster(output, poster);
  } finally {
    await unlink(scaled).catch(() => undefined);
    await unlink(motion).catch(() => undefined);
  }
};

const writePoster = async (gifPath: string, posterPath: string): Promise<void> => {
  await run("ffmpeg", [
    "-y",
    "-i",
    gifPath,
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "5",
    posterPath,
  ]);
};

const convertAnimated = async (input: string, output: string): Promise<void> => {
  await run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    `fps=12,${scaleFilter},split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    output,
  ]);
  await run("gifsicle", [
    "-O3",
    "--lossy=60",
    "--colors=64",
    output,
    "-o",
    output,
  ]).catch(() => undefined);
  await writePoster(output, output.replace(/\.gif$/u, ".jpg"));
};

const readCatalog = async (): Promise<Gif[]> => {
  const raw = await readFile(CATALOG_PATH, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Catalog must be a JSON array");
  }

  // SAFETY: the import script is the only writer and always persists Gif objects.
  return parsed as Gif[];
};

const writeCatalog = async (catalog: Gif[]): Promise<void> => {
  const sorted = [...catalog].sort((left, right) =>
    left.slug.localeCompare(right.slug)
  );
  await writeFile(CATALOG_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
};

const isGifStyle = (value: string): value is GifStyle =>
  value === "oil" || value === "watercolor";

const outDirFor = (style: GifStyle): string =>
  style === "oil" ? OIL_OUT_DIR : DEFAULT_OUT_DIR;

const resolveOptions = (args: Record<string, string>): ImportOptions => {
  const input = args.input;
  const slug = args.slug;
  const style = args.style ?? "watercolor";

  if (!input || !slug) {
    throw new Error(
      "Usage: node --experimental-strip-types scripts/import-gif.ts --input <file> --slug <slug> [--style watercolor|oil] [--title <title>] [--tags a,b] [--out-dir <dir>]"
    );
  }

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }

  if (!isGifStyle(style)) {
    throw new Error(`Invalid style: ${style}`);
  }

  return {
    input: path.resolve(input),
    outDir: path.resolve(args["out-dir"] ?? outDirFor(style)),
    slug,
    style,
    tags: uniqueTags([slug, ...(args.tags ?? "").split(",")]),
    title: args.title ?? titleFromSlug(slug),
  };
};

// The watercolor import owns the main entry; the oil import only fills in `oil`.
const updateCatalog = (
  catalog: Gif[],
  options: ImportOptions,
  asset: GifAsset
): Gif[] => {
  const existing = catalog.find((gif) => gif.slug === options.slug);
  const others = catalog.filter((gif) => gif.slug !== options.slug);

  if (options.style === "oil") {
    if (!existing) {
      throw new Error(
        `Import the watercolor ${options.slug} before its oil version`
      );
    }

    return [...others, { ...existing, oil: asset }];
  }

  return [
    ...others,
    {
      file: asset.file,
      height: asset.height,
      ...(existing?.oil ? { oil: existing.oil } : {}),
      poster: asset.poster,
      slug: options.slug,
      tags: options.tags,
      title: options.title,
      width: asset.width,
    },
  ];
};

const importGif = async (options: ImportOptions): Promise<GifAsset> => {
  await mkdir(options.outDir, { recursive: true });

  const output = path.join(options.outDir, `${options.slug}.gif`);
  const source = await probeVideo(options.input);
  const stillCodecs = new Set(["bmp", "mjpeg", "png", "webp"]);
  const isAnimated = source.frameCount > 1 || !stillCodecs.has(source.codecName);

  if (isAnimated) {
    await convertAnimated(options.input, output);
  } else {
    await convertStill(options.input, output);
  }

  const result = await probeVideo(output);
  const fileStat = await stat(output);
  const publicDir = options.style === "oil" ? "/gifs/oil" : "/gifs";
  const asset: GifAsset = {
    file: `${publicDir}/${options.slug}.gif`,
    height: result.height,
    poster: `${publicDir}/${options.slug}.jpg`,
    width: result.width,
  };

  if (options.outDir === outDirFor(options.style)) {
    const catalog = await readCatalog();
    await writeCatalog(updateCatalog(catalog, options, asset));
  }

  process.stdout.write(
    `Imported ${options.slug} ${options.style} (${asset.width}x${asset.height}, ${Math.round(fileStat.size / 1024)}kb)\n`
  );

  return asset;
};

const main = async (): Promise<void> => {
  const options = resolveOptions(parseArgs(process.argv.slice(2)));
  await importGif(options);
};

await main();
