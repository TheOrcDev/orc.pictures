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
const DURATIONS: Record<string, number> = {
  annoyed: 6,
  celebrate: 6,
  congratulations: 6,
  "crazy-nod": 5,
  "beach-lounge": 6,
  approves: 6,
  damn: 6,
  fishing: 6,
  flashback: 8,
  phew: 5,
  "something-good": 6,
  "start-camera": 6,
  "touch-grass": 6,
  wink: 4,
  facepalm: 5,
  "im-out": 6,
};
const POLL_MS = 5000;
const SKIP_SLUGS = new Set(["orc-smile"]);

const PROMPTS: Record<string, string> = {
  angry:
    "The orc shouts in anger, a short roar, shoulders heaving, glare holding on the camera. Locked camera.",
  approves:
    "He lines the stamp up, drops his shoulder, and slams it onto the parchment. The red mark is the same width and height as the stamp face. He lifts the stamp, looks down at the mark, and gives a small proud nod. Then the camera zooms in until APPROVED fills the frame. Closed-mouth grin. Mouth stays closed, no talking.",
  annoyed:
    "The orc watches, eyes narrowing, a small exasperated blink and a tiny head tilt. He stays annoyed. His hands never rise. He does not touch his face or nose. He does not shout. Mouth stays closed, no talking. Locked camera.",
  beach:
    "The orc lifts the skull cocktail and takes a sip, a relaxed beach grin, ocean behind him. Locked camera.",
  "beach-lounge":
    "He is already lying in the hammock, which sways gently. He lifts the coconut, takes one small sip through the straw, then lowers it and settles back with a content grin. Only one hand holds the coconut; the other stays behind his head. He does not sit up. Mouth stays closed after the sip. Palm fronds and waves move softly. Locked camera.",
  "burn-it-with-fire":
    "The orc thrusts both hands forward and blasts a roaring jet of fire at the cursed book and papers, flames growing as they catch. Determined burn-it glare holding. Mouth stays closed, no talking. Locked camera.",
  celebrate:
    "The orc pumps his fist in celebration, balloons bobbing beside him and confetti drifting down. His joyful grin holds. No talking. Locked camera.",
  champagne:
    "The orc toasts with the champagne flute, a knowing smirk, a small raise of the glass and a point. Locked camera.",
  clap:
    "The orc claps his hands in applause, a warm approving grin holding, a few more claps. Locked camera.",
  congratulations:
    "The orc looks at someone just out of frame and pats the shoulder at the edge of the frame with his open hand in a warm congratulations. His proud smile grows, clearly congratulating them. Only that shoulder is ever visible; no other face or body enters the frame. He does not turn to the camera. He does not clap. No talking. Locked camera.",
  cooked:
    "The orc stirs the pot with gusto, steam rising, then lifts his chin with a proud, happy grin and a small satisfied nod, clearly enjoying his cooking. The word COOKED stays readable. Natural character motion, locked camera.",
  "crazy-nod":
    "Slow zoom in on his face. Small quick yes nods the whole time: chin dips a little, then pops back up, over and over. Closed-mouth smirk stays. Eyes stay open. He does not bow, lean, or open his mouth. Hands stay down.",
  curious:
    "The orc leans in a little closer, tilts his head, eyes widening with curiosity, a small interested blink. Locked camera.",
  dance:
    "The orc dances, swaying and stepping, arms moving to the groove, joyful grin holding. Locked camera.",
  damn:
    "He starts looking aside. Then he leans back, one eyebrow lifts, and his mouth shapes a silent damn. A small impressed nod follows. No shouting. Locked camera.",
  doit:
    "The orc grins warmly, gives an encouraging thumbs-up, and a small you-got-this nod. Locked camera.",
  doubt:
    "The orc raises one eyebrow, tilts his head, and side-eyes the camera with a skeptical look. Subtle breathing. Locked camera, no zoom.",
  ew: "The orc recoils hard from something gross just off-frame, face scrunching into an exaggerated EWWW grimace, lips pulled back over clenched teeth, turning his head away and raising one hand as if he can't bear to look. His tongue stays inside his mouth. Nothing gross ever appears in frame. No talking. Locked camera.",
  // Flashback is a composite: this take, three animated memories under a faint overlay of his face, then the take reversed.
  facepalm:
    "The sergeant lets out a long weary sigh, then slowly lifts his open hand and presses his palm flat over his eyes and brow in a facepalm, his head tipping down into his hand. He holds the facepalm and gives a small slow disappointed head shake inside his palm. Mouth stays closed, no talking. His braided beard, scar, face and armor stay exactly the same. Locked camera, no zoom, no cut.",
  flashback:
    "He gazes into the distance by the campfire, then slowly closes his eyes within the first second and keeps them closed for the rest of the shot, breathing slowly and deeply as old battles return to him. Mouth stays closed, no talking. Firelight flickers on his face. Locked camera, no zoom, no cut.",
  fire:
    "Flames flicker around the orc and in his palm, a confident fire grin holding, firelight moving on his face. Locked camera.",
  fishing:
    "The fishing line tugs. He leans back a little and lifts the rod, a small splash in the water, then settles with a satisfied closed-mouth grin. Mouth stays closed, no talking. Locked camera.",
  flex: "The orc flexes both biceps harder, a cocky grin holding, a small proud pump of the arms. Locked camera.",
  "for-the-horde":
    "The orc charges forward with the army, ranks running behind him, then bellows a rallying war cry, fist raised. Keep the wide shot and the army in frame. Locked camera, no zoom to a close-up.",
  gold: "The orc sits on the treasure and grins richer as coins shift and glint. A small satisfied chuckle in the shoulders. Locked camera.",
  happy:
    "The orc laughs happily, a warm chuckle shaking his shoulders, eyes crinkling, grin holding. Locked camera.",
  heart:
    "The orc holds the heart-shaped hands toward the camera, a warm affectionate smile, a small fond blink. Locked camera.",
  hype:
    "The orc pumps both fists, bouncing with hype, wide excited grin holding. Locked camera.",
  icecream:
    "The orc lifts the vanilla ice cream cone to his mouth and takes one quick, small lick, then lowers it a little and smiles with his mouth closed, a happy yum blink. The tongue shows only briefly during the lick. The ice cream keeps its shape. Locked camera.",
  "im-out":
    "He pushes the swinging door open and walks out of the tavern into the bright sunny street, away from the camera, never turning around. As he steps through the doorway he lazily raises one hand over his shoulder in a casual goodbye wave without looking back, then keeps walking down the street. The swinging doors swing back behind him. His axe stays strapped on his back. Locked camera, no zoom, no cut.",
  "in-love":
    "The orc looks smitten, a dreamy sigh, hands over his heart, a warm in-love blink. Locked camera.",
  laugh:
    "The orc laughs hard, mouth open, shoulders shaking, head tipping back a little, joyful laugh holding. Locked camera.",
  livestream:
    "The orc looks at the camera and holds still, mouth closed, one small blink. No talking, no nodding, no waving. Locked camera.",
  morning:
    "The orc lifts the coffee mug slightly, steam rising from the cup, a warm morning blink. Locked camera.",
  nod: "The orc nods his head yes twice and holds the thumbs-up, a satisfied blink. His hair, face and outfit stay exactly the same throughout. Natural character animation, locked camera, no zoom or pan.",
  online:
    "The orc looks at the camera and gives a small hello wave, a friendly blink, available and here. Locked camera.",
  // Orc smile repaints the pre-restyle topknot orc. It's rendered at 720p with a locked camera, and the zoom to his face (1.75x, eased) is added afterwards with zoompan; Grok's own push-ins warp his face.
  "orc-smile":
    "The orc keeps eye contact with the viewer the whole time. Subtle and slow, like a real actor: his slight knowing smirk gradually widens into a warm, pleased closed-mouth smile, his cheeks lifting and his eyes crinkling and narrowing kindly, with a very slight tilt of his head. He holds the warm smile at the end. He does not nod and does not blink. Mouth stays closed, his tusks stay in place. His topknot, beard, face, fur and armor stay exactly the same. The fire and torches flicker softly. Locked camera, no zoom, no cut.",
  phew:
    "He wipes his wrist across his brow and lowers that arm, lets out a happy relieved breath with his shoulders dropping, then opens his eyes and beams a big cheerful grin at the camera with a small happy chuckle. His other hand keeps the axe resting on his shoulder. No sweat, no smoke, no breath cloud. No talking. His hair, scars, tusks, face, fur and armor stay exactly the same. The grass and banners sway gently in the breeze. Locked camera, no zoom, no cut.",
  pickaxe:
    "The orc swings the pickaxe into the rock wall, stone chips and dust flying, then hauls it back for another strike. Focused work grimace. Mouth stays closed, no talking. Locked camera.",
  popcorn:
    "The orc eats popcorn from the bucket, chewing and watching something off-camera with amused eyes. Locked camera.",
  proud:
    "The orc puffs his chest, proud smile widening, hair and fur moving in a light breeze. Heroic but subtle. Locked camera.",
  ready:
    "The armored orc tightens his grip on the axe and shifts into a ready stance, determined breath. Locked camera.",
  sad: "The warrior looks downcast, a slow sad blink, a small sniff and a heavy slump of his shoulders. Mouth stays closed. Locked camera.",
  salute:
    "The orc holds a firm military salute, a slight blink, armor catching light. Respectful, locked camera.",
  seriously:
    "The orc stares unamused, slow blink, almost no expression change. Deadpan. Locked camera.",
  sir: "The orc stands at attention and gives a sharp yes-sir nod. Locked camera.",
  sleep:
    "The orc sleeps, chest rising and falling, a tiny sleepy sway. Soft breathing motion. Locked camera.",
  smash:
    "He starts staring at the intact laptop, fist raised, about to smash. Then he slams his fist through the laptop, keys and shards flying, fierce look holding. Locked camera.",
  smell:
    "The orc lifts his head, closes his eyes, and inhales a pleasant smell, a quiet content sniff. Mouth stays closed, no talking. Locked camera.",
  "something-good":
    "The orc rubs his hands together over the feast, a small finishing gesture with both hands. His knowing smile grows wider, like something good is coming, and he looks at the camera. No talking. Locked camera.",
  spotted:
    "The orc's eyes widen as he realizes he has been seen, a small caught flinch toward the camera. Locked camera.",
  "start-camera":
    "The orc presses the button on the small camera with his index finger. The camera's red record light clicks on. He pulls his hand back and looks into the lens, starting the livestream, a small ready blink. Mouth stays closed, no talking. Locked camera.",
  stars:
    "The orc looks amazed, eyes sparkling, a small wow lean forward. Locked camera.",
  surprise:
    "A small surprise jolt. Eyes stay wide. His mouth stays in a small gasp and does not open wider. He leans back a little, then holds the shocked face. He does not shout. Hands stay down. One continuous close shot: locked camera, no cut, no zoom out.",
  sweat:
    "The orc looks nervously at the camera, sweat beading on his brow, a tense gulp, a small anxious blink. Locked camera.",
  tear: "A single tear rolls slowly down the warrior's scarred cheek. He blinks once, jaw tight, emotional but holding still. Mouth stays closed. Locked camera.",
  thankyou:
    "The orc gives a grateful nod and a warm smile, a slight bow of thanks, his hand staying on his chest. His hair, face and outfit stay exactly the same throughout. Locked camera.",
  thinking:
    "The orc looks up and to the side, deep in thought, eyes slowly drifting as he ponders, a slow blink, a small thoughtful purse of the lips. His hands stay down and never touch his head or face. Mouth stays closed. Locked camera.",
  toldyou:
    "The orc smirks I-told-you-so, a smug little nod and knowing glance. Locked camera.",
  "touch-grass":
    "Wide locked shot of the forest. He stays small in the distance and walks farther down the path, away from the camera. The trees stay large. The camera does not zoom in or move closer.",
  velocity:
    "The orc sprints toward the glowing gateway, pumping his arms, dust kicking up, high velocity. Keep the goal ahead in frame. Locked camera, no zoom.",
  victory:
    "The orc celebrates the win with a short victorious motion and a proud grin. Locked camera.",
  waiting:
    "The orc waits with arms crossed, glances aside, a small impatient shift, then looks back. Mouth stays closed. Locked camera.",
  wave:
    "The orc waves hello with his raised hand beside his head, a warm friendly smile holding, a couple of side-to-side waves. His hand never passes in front of his face. Locked camera.",
  wink:
    "Both eyes start open. He winks once with his left eye only: the left eye closes, then opens again. His right eye stays wide open the whole time and never blinks. One single wink. Closed-mouth sly smile. Mouth stays closed. Locked camera, no zoom.",
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
  ratio: string,
  duration: number
): Promise<string> => {
  const response = await fetch(`${API_BASE}/videos/generations`, {
    body: JSON.stringify({
      aspect_ratio: ratio,
      duration,
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
    aspectRatio(size.width, size.height),
    DURATIONS[gif.slug] ?? DURATION_SECONDS
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
