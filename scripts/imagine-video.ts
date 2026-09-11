import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface CatalogGif {
  slug: string;
  tags: string[];
  title: string;
}

interface VideoResult {
  error?: { message?: string };
  progress?: number;
  status?: string;
  video?: { respect_moderation?: boolean; url?: string };
}

const API_BASE = "https://api.x.ai/v1";
const MODEL = "grok-imagine-video-1.5";
const SOURCE_DIR = "/Users/orcdev/Downloads/ai images";
const VIDEO_DIR = "/tmp/orc-grok-videos";
const DURATION_SECONDS = 4;
const POLL_MS = 5000;
const SKIP_SLUGS = new Set(["orc-smile"]);

const PROMPTS: Record<string, string> = {
  angry:
    "The orc shouts in anger, a short roar, shoulders heaving, glare holding on the camera. Locked camera.",
  beach:
    "The orc lifts the skull cocktail and takes a sip, a relaxed beach grin, ocean behind him. Locked camera.",
  clap:
    "The orc claps his hands in applause, a warm approving grin holding, a few more claps. Locked camera.",
  cooked:
    "The orc slowly stirs the pot, steam rising. He looks exhausted and done, a tired blink, the word COOKED staying readable. Natural character motion, locked camera.",
  curious:
    "The orc leans in a little closer, tilts his head, eyes widening with curiosity, a small interested blink. Locked camera.",
  dance:
    "The orc dances, swaying and stepping, arms moving to the groove, joyful grin holding. Locked camera.",
  damn:
    "The orc leans back a little, impressed, a silent damn on his face, a small respectful nod. Locked camera.",
  doit:
    "The orc grins warmly, gives an encouraging thumbs-up, and a small you-got-this nod. Locked camera.",
  doubt:
    "The orc raises one eyebrow, tilts his head, and side-eyes the camera with a skeptical look. Subtle breathing. Locked camera, no zoom.",
  ew: "The orc recoils slightly, wrinkles his nose in disgust, and gives a small shake of the head. Locked camera.",
  flashback:
    "Stay on this exact close-up portrait only. No other figures, no overlays. One continuous look into the distance, a slow blink and breath. Locked camera, no zoom, no cut, no pan.",
  fire:
    "Flames flicker around the orc and in his palm, a confident fire grin holding, firelight moving on his face. Locked camera.",
  flex: "The orc flexes both biceps harder, a cocky grin holding, a small proud pump of the arms. Locked camera.",
  gold: "The orc sits on the treasure and grins richer as coins shift and glint. A small satisfied chuckle in the shoulders. Locked camera.",
  happy:
    "The orc laughs happily, a warm chuckle shaking his shoulders, eyes crinkling, grin holding. Locked camera.",
  heart:
    "The orc holds the heart-shaped hands toward the camera, a warm affectionate smile, a small fond blink. Locked camera.",
  hype:
    "The orc pumps both fists, bouncing with hype, wide excited grin holding. Locked camera.",
  "in-love":
    "The orc looks smitten, a dreamy sigh, hands over his heart, a warm in-love blink. Locked camera.",
  laugh:
    "The orc laughs hard, mouth open, shoulders shaking, head tipping back a little, joyful laugh holding. Locked camera.",
  morning:
    "The orc lifts the coffee mug slightly, steam rising from the cup, a warm morning blink. Locked camera.",
  nod: "The orc nods his head yes twice and holds the thumbs-up, a satisfied blink. Natural character animation, locked camera, no zoom or pan.",
  online:
    "The orc looks at the camera and gives a small hello wave, a friendly blink, available and here. Locked camera.",
  "orc-smile":
    "The orc holds a warm closed-mouth smile at the camera, a slight friendly blink, expression staying kind and still. Locked camera.",
  popcorn:
    "The orc eats popcorn from the bucket, chewing and watching something off-camera with amused eyes. Locked camera.",
  proud:
    "The orc puffs his chest, proud smile widening, hair and fur moving in a light breeze. Heroic but subtle. Locked camera.",
  ready:
    "The armored orc tightens his grip on the axe and shifts into a ready stance, determined breath. Locked camera.",
  sad: "The orc looks downcast, a slow sad blink, a tear welling, a small sniff and slump of the shoulders. Locked camera.",
  salute:
    "The orc holds a firm military salute, a slight blink, armor catching light. Respectful, locked camera.",
  seriously:
    "The orc stares unamused, slow blink, almost no expression change. Deadpan. Locked camera.",
  sir: "The orc stands at attention and gives a sharp yes-sir nod. Locked camera.",
  sleep:
    "The orc sleeps, chest rising and falling, a tiny sleepy sway. Soft breathing motion. Locked camera.",
  smash:
    "He starts staring at the intact laptop, fist raised, about to smash. Then he slams his fist through the laptop, keys and shards flying, fierce look holding. Locked camera.",
  spotted:
    "The orc's eyes widen as he realizes he has been seen, a small caught flinch toward the camera. Locked camera.",
  stars:
    "The orc looks amazed, eyes sparkling, a small wow lean forward. Locked camera.",
  sweat:
    "The orc looks nervously at the camera, sweat beading on his brow, a tense gulp, a small anxious blink. Locked camera.",
  tear: "A tear rolls down the orc's face. He blinks, emotional but still. Locked camera.",
  thankyou:
    "The orc gives a grateful nod and a warm smile, a slight bow of thanks. Locked camera.",
  thinking:
    "He starts staring at the camera deadpan, unamused, like 'seriously now'. Then he looks up and aside, raises one finger to his temple, and thinks. Locked camera.",
  toldyou:
    "The orc smirks I-told-you-so, a smug little nod and knowing glance. Locked camera.",
  victory:
    "The orc celebrates the win with a short victorious motion and a proud grin. Locked camera.",
  wave:
    "The orc waves hello with his raised hand, a warm friendly smile holding, a couple of waves. Locked camera.",
  wink:
    "Both eyes start open, a small smile. Then only one eyelid closes for a short wink while the other eye stays open. Then both eyes open and he holds a warm smile. Not a blink, not both eyes closing. Only one wink. Locked camera, no zoom.",
  working:
    "The orc types on the laptop, fingers moving, screen glow on his face, a focused blink. Locked camera.",
};

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

const apiKey = (): string => {
  const key = process.env.XAI_API_KEY;

  if (!key) {
    throw new Error("XAI_API_KEY is not set");
  }

  return key;
};

const aspectRatio = (width: number, height: number): string => {
  const ratio = width / height;
  const options: [number, string][] = [
    [1, "1:1"],
    [16 / 9, "16:9"],
    [9 / 16, "9:16"],
    [4 / 3, "4:3"],
    [3 / 4, "3:4"],
    [3 / 2, "3:2"],
    [2 / 3, "2:3"],
  ];
  const [closest] = [...options].sort(
    (left, right) => Math.abs(left[0] - ratio) - Math.abs(right[0] - ratio)
  );

  return closest?.[1] ?? "1:1";
};

const prepareStill = async (input: string, slug: string): Promise<string> => {
  const jpeg = path.join(VIDEO_DIR, `${slug}.still.jpg`);
  await run("ffmpeg", [
    "-y",
    "-i",
    input,
    "-vf",
    "scale='min(1280,iw)':-2:flags=lanczos",
    "-q:v",
    "3",
    jpeg,
  ]);

  return jpeg;
};

const probeSize = async (
  filePath: string
): Promise<{ height: number; width: number }> => {
  const output = await run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
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
  const width =
    typeof stream === "object" && stream !== null && "width" in stream
      ? Number(stream.width)
      : Number.NaN;
  const height =
    typeof stream === "object" && stream !== null && "height" in stream
      ? Number(stream.height)
      : Number.NaN;

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Missing dimensions in ${filePath}`);
  }

  return { height, width };
};

const startGeneration = async (
  imageDataUrl: string,
  prompt: string,
  ratio: string
): Promise<string> => {
  const response = await fetch(`${API_BASE}/videos/generations`, {
    body: JSON.stringify({
      aspect_ratio: ratio,
      duration: DURATION_SECONDS,
      image: { url: imageDataUrl },
      model: MODEL,
      prompt,
      resolution: "480p",
    }),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(`Video start failed (${response.status}): ${JSON.stringify(body)}`);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("request_id" in body) ||
    typeof body.request_id !== "string"
  ) {
    throw new Error(`Missing request_id: ${JSON.stringify(body)}`);
  }

  return body.request_id;
};

const pollVideo = async (requestId: string): Promise<string> => {
  for (;;) {
    const response = await fetch(`${API_BASE}/videos/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    const body = (await response.json()) as VideoResult;

    if (!response.ok) {
      throw new Error(`Poll failed (${response.status}): ${JSON.stringify(body)}`);
    }

    if (body.status === "failed" || body.status === "expired") {
      throw new Error(`Video ${body.status}: ${body.error?.message ?? requestId}`);
    }

    if (body.status === "done") {
      const url = body.video?.url;

      if (!url || body.video?.respect_moderation === false) {
        throw new Error(`Video finished without a usable url (${requestId})`);
      }

      return url;
    }

    process.stdout.write(`  ${requestId} ${body.status ?? "pending"} ${body.progress ?? 0}%\n`);
    await new Promise((resolve) => {
      setTimeout(resolve, POLL_MS);
    });
  }
};

const downloadFile = async (url: string, dest: string): Promise<void> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(dest, bytes);
};

const importGif = async (slug: string, videoPath: string, gif: CatalogGif): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "node",
      [
        "--experimental-strip-types",
        path.join(process.cwd(), "scripts/import-gif.ts"),
        "--input",
        videoPath,
        "--slug",
        slug,
        "--title",
        gif.title,
        "--tags",
        gif.tags.join(","),
      ],
      { stdio: "inherit" }
    );
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`import failed for ${slug} (${code})`));
    });
  });
};

const generateOne = async (gif: CatalogGif, input: string): Promise<void> => {
  const prompt = PROMPTS[gif.slug];

  if (!prompt) {
    throw new Error(`No motion prompt for ${gif.slug}`);
  }

  process.stdout.write(`Generating ${gif.slug}\n`);
  const jpeg = await prepareStill(input, gif.slug);
  const size = await probeSize(jpeg);
  const imageDataUrl = `data:image/jpeg;base64,${(await readFile(jpeg)).toString("base64")}`;
  const requestId = await startGeneration(
    imageDataUrl,
    prompt,
    aspectRatio(size.width, size.height)
  );
  process.stdout.write(`  request ${requestId}\n`);
  const videoUrl = await pollVideo(requestId);
  const videoPath = path.join(VIDEO_DIR, `${gif.slug}.mp4`);
  await downloadFile(videoUrl, videoPath);
  await importGif(gif.slug, videoPath, gif);
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const catalog = JSON.parse(
    await readFile(path.join(process.cwd(), "content/gifs.json"), "utf8")
  ) as CatalogGif[];

  await mkdir(VIDEO_DIR, { recursive: true });

  const wanted = args.slug
    ? catalog.filter((gif) => gif.slug === args.slug)
    : catalog.filter((gif) => !SKIP_SLUGS.has(gif.slug));

  if (wanted.length === 0) {
    throw new Error("No matching catalog entries");
  }

  for (const gif of wanted) {
    const input = args.input
      ? path.resolve(args.input)
      : path.join(SOURCE_DIR, `${gif.slug}.png`);
    await generateOne(gif, input);
  }
};

await main();
