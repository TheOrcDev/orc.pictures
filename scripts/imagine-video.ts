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
  "ship-it": 6,
  nope: 5,
  shrug: 5,
  morning: 5,
  please: 5,
  "mic-drop": 5,
  oops: 5,
  noted: 5,
  "mind-blown": 5,
  handshake: 5,
  "push-to-main": 5,
  searching: 6,
  sailing: 6,
  santa: 6,
  "orcish-salute": 5,
  "strong-orc": 6,
  "power-up": 6,
  "proud-of-you": 6,
};
const POLL_MS = 5000;
const SKIP_SLUGS = new Set(["orc-smile"]);
const STYLES = new Set(["orc", "videorc"]);

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
    "The orc keeps his eyes open the whole time, looking proudly at the person just out of frame to the right. He lifts his hand off their shoulder and brings it down in one single hearty slap, then grips the shoulder firmly and gives it a warm, proud little shake, and nods once approvingly with a big proud grin. Only that shoulder is ever visible; no other face or body enters the frame. He does not close his eyes, does not turn to the camera, does not clap and does not pat repeatedly. No talking. No text, no captions. His hair, scar, earring, tusks, face and clothes stay exactly the same. Locked camera, no zoom, no cut.",
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
  handshake:
    "A normal, firm business handshake: the clasped hands move straight up and down in a short vertical line, three quick pumps, up, down, up, down, up, down, and then stop and stay still. The hands never move sideways, forward, backward or in circles, and his elbow stays in place. Then, still holding the grip without moving it, he gives one confident nod with a pleased grin, his eyes open, looking at the person just out of frame to the right. Only that hand and forearm are ever visible; no other face or body enters the frame. He does not turn to the camera and does not let go. No talking. No text, no captions. His hair, beard, tusks, face and clothes stay exactly the same. Locked camera: the framing stays exactly the same, the camera does not move back, no zoom, no cut.",
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
  "mic-drop":
    "He holds the war horn out in front of him at chest height and looks at the viewer with total confidence. Then his fingers spring open and the horn falls, tumbling straight down out of the bottom of the frame, while his empty open hand stays up in the air for a moment, fingers spread. Then he slowly folds his arms across his chest, raises his chin and gives a smug, satisfied half-smile, and holds that pose. Mouth stays closed, no talking. No text, no captions. His mohawk, braided beard, tusks, face, cloak and chainmail stay exactly the same. Locked camera on a tripod: the framing stays exactly the same, the camera does not move back, no zoom, no cut.",
  "mind-blown":
    "He reads the scroll, then suddenly his eyes go wide and his jaw drops in amazement. He lets the scroll fall onto the workbench, raises both hands and touches his fingertips to his temples, then flings his hands outward away from his head with his fingers spread wide in a mind-blown gesture, and holds that pose, staring at the viewer in stunned awe. No smoke, no sparks, no explosion effects, no text, no captions, only the gesture. His bald head, eyebrows, braided goatee, tusks, face and clothes stay exactly the same. Locked camera on a tripod: the framing stays exactly the same, the camera does not move back, no zoom, no cut.",
  morning:
    "He raises the steaming mug to his lips, tilts it and takes a real, slow sip of hot coffee, his lips touching the rim between his tusks, his eyes closed. Then he lowers the mug back to chest height, swallows, lets out a contented sigh with a warm, satisfied closed-mouth smile, and opens his eyes to the viewer with a sleepy good-morning look. Steam keeps rising from the coffee. One hand holds the mug the whole time. Mouth stays closed except for the sip, no talking. His hair, tusks, face and shirt stay exactly the same. Locked camera, no zoom, no cut.",
  nod: "The orc nods his head yes twice and holds the thumbs-up, a satisfied blink. His hair, face and outfit stay exactly the same throughout. Natural character animation, locked camera, no zoom or pan.",
  nope:
    "He slowly shakes his head no, side to side, two or three slow deliberate shakes, keeping his arms firmly crossed and his flat, unimpressed look, then stares back at the viewer. Absolutely not. Mouth stays closed, no talking. His helmet, beard, tusks, face and armor stay exactly the same. The banners flutter softly in the courtyard. Locked camera, no zoom, no cut.",
  noted:
    "He looks down, dips the quill into the inkwell and quickly writes a short note on the parchment ledger, then looks up at the viewer and gives one firm, decisive nod: noted. He holds a calm, businesslike look at the end. Mouth stays closed, no talking. His spectacles, hair, beard, tusks, face and clothes stay exactly the same. The banners flutter softly. Locked camera, no zoom, no cut.",
  online:
    "The orc looks at the camera and gives a small hello wave, a friendly blink, available and here. Locked camera.",
  // Orc smile repaints the pre-restyle topknot orc. It's rendered at 720p with a locked camera, and the zoom to his face (1.75x, eased) is added afterwards with zoompan; Grok's own push-ins warp his face.
  oops:
    "He leans a little more weight on the crate stack and it starts to wobble. The top crates tip over and tumble away out of the right side of the frame. He flinches and grimaces with his teeth clenched, glances after the fallen crates, then turns back to the viewer, rubs the back of his head with one hand and gives a sheepish, apologetic grin. No text, no captions, no lettering anywhere. His hair, pencil, tusks, face and clothes stay exactly the same. Locked camera on a tripod: the framing and the background stay exactly the same the whole time, the camera does not pan, does not move back, no zoom, no cut.",
  "orc-smile":
    "The orc keeps eye contact with the viewer the whole time. Subtle and slow, like a real actor: his slight knowing smirk gradually widens into a warm, pleased closed-mouth smile, his cheeks lifting and his eyes crinkling and narrowing kindly, with a very slight tilt of his head. He holds the warm smile at the end. He does not nod and does not blink. Mouth stays closed, his tusks stay in place. His topknot, beard, face, fur and armor stay exactly the same. The fire and torches flicker softly. Locked camera, no zoom, no cut.",
  "orcish-salute":
    "He draws a breath and lifts his right fist, bringing it across his body, and strikes it firmly against the left side of his chest, over his heart, with one solid thump, his chest plate and fur mantle jolting from the blow. He keeps his fist pressed over his heart, raises his chin a little and gives one slow, solemn, respectful nod, his head dipping down and coming back up, his eyes open and steady on the viewer. Then he holds the salute perfectly still with a proud, honorable look. The war banners keep fluttering in the wind behind him. No talking. No text, no captions. His shaved head, war paint, scar, tusks, face, fur mantle and armor stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  phew:
    "He wipes his wrist across his brow and lowers that arm, lets out a happy relieved breath with his shoulders dropping, then opens his eyes and beams a big cheerful grin at the camera with a small happy chuckle. His other hand keeps the axe resting on his shoulder. No sweat, no smoke, no breath cloud. No talking. His hair, scars, tusks, face, fur and armor stay exactly the same. The grass and banners sway gently in the breeze. Locked camera, no zoom, no cut.",
  pickaxe:
    "The orc swings the pickaxe into the rock wall, stone chips and dust flying, then hauls it back for another strike. Focused work grimace. Mouth stays closed, no talking. Locked camera.",
  please:
    "Keeping his palms pressed together in front of his chest, he gives his hands two small hopeful shakes, tilts his head a little to one side, raises his eyebrows a bit higher and widens his warm, charming, hopeful smile, politely asking a friendly favor. Then he holds that hopeful look at the viewer. Friendly and good-natured, not sad and not desperate. Mouth stays closed, no talking. No text, no captions. His hair, earring, tusks, face and clothes stay exactly the same. Locked camera: the framing stays exactly the same, the camera does not move back, no zoom, no cut.",
  popcorn:
    "The orc eats popcorn from the bucket, chewing and watching something off-camera with amused eyes. Locked camera.",
  "power-up":
    "He pulls the cork out with his thumb, tips his head back and gulps down the glowing green potion in one go, then tosses the empty flask away over his shoulder. He clenches both fists at his sides, plants his feet and tenses his whole body. A bright glowing green aura bursts up around him like flames, crackling with little green sparks, his eyes glow bright green, his muscles swell bigger, and the wind from the burst whips the leaves and grass around him. He ends in a powerful stance, fists clenched, grinning fiercely at the viewer with the green aura still blazing around him. No talking. No text, no captions. His face, bald tattooed head, tusks, nose ring, vest and bracer stay the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  proud:
    "The orc puffs his chest, proud smile widening, hair and fur moving in a light breeze. Heroic but subtle. Locked camera.",
  "proud-of-you":
    "His stern look slowly softens. His eyes grow a little misty and shine, and a warm, proud smile spreads across his face, his tusks showing. He gives one small, slow nod of approval, his head dipping only slightly and coming back up, his eyes open and fixed warmly on the viewer. Then he lifts one hand from his crossed arms and wipes the corner of one eye with his thumb, trying to hide that he is moved, and lets out a small proud chuckle, his chest swelling. He keeps smiling at the viewer with his eyes open. No talking. No text, no captions. His face, shaved head, grey beard, scars, tusks and outfit stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "push-to-main":
    "He presses the big red button firmly with his index finger: the button clicks down into its brass ring and springs back up as he lifts his finger. Right after the click, the big gears on the wall behind him start turning. He straightens up, looks at the viewer with a proud, satisfied, confident grin, his eyes open, and gives one small nod. Job done. His finger is the only thing that touches the button. The brass plate and its engraved words stay exactly the same and never change. No talking. No new text, no captions. His head, goggles, tusks, face, shirt and apron stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  ready:
    "The armored orc tightens his grip on the axe and shifts into a ready stance, determined breath. Locked camera.",
  sad: "The warrior looks downcast, a slow sad blink, a small sniff and a heavy slump of his shoulders. Mouth stays closed. Locked camera.",
  sailing:
    "The ship sails steadily forward across the sparkling sea under full sail. The deck gently rises and falls with the swell, the huge white sails billow and ripple in the strong wind, the rigging sways, waves and white spray rush past the hull, and seagulls glide by overhead. The captain stands firm at the wheel with both hands on it, turns the wheel a little to steer, and gazes out ahead over the sea with a calm, content, confident smile, his eyes open, the wind tugging at his coat and the tails of his bandana. No talking. No text, no captions. His bandana, beard, tusks, earring, face and coat stay exactly the same. The camera rides along with the ship: the framing stays the same, no zoom, no cut.",
  salute:
    "The orc holds a firm military salute, a slight blink, armor catching light. Respectful, locked camera.",
  santa:
    "He holds the red present out toward the viewer and offers it with a small friendly push forward, as if handing it over. Then, keeping his face turned toward the viewer the whole time, he reaches up over his shoulder into the sack without looking at it, pulls out a second wrapped present, a green box with a red bow, and holds both presents out toward the viewer with a warm, jolly, closed-mouth grin, his eyes open and twinkling, looking at the viewer. Soft snowflakes drift down. His face is always visible: he never turns his head away, and his two big white tusks stay clearly visible the whole time. No talking. No text, no captions. His Santa hat, white beard, tusks, green orc face, red coat and mittens stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  searching:
    "He glances at the rolled scroll in his hand, shakes his head, and tosses it over his shoulder. Then he digs into the chest with both hands, pushing the odds and ends aside and peering in, and pulls out an old boot, frowns at it and drops it back in. He looks up and glances left, then right, around the attic with a puzzled, searching frown and a raised eyebrow, then goes back to rummaging in the chest. His eyes stay open. No talking. No text, no captions. His mohawk, scar, tusks, face, vest and bracers stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  seriously:
    "The orc stares unamused, slow blink, almost no expression change. Deadpan. Locked camera.",
  "ship-it":
    "He gives the ship one mighty shove. The ship slides down the wooden slipway away from him, splashes into the bay and glides out onto the water with its sail filling in the breeze. He straightens up, plants both fists on his hips and watches it sail away, then turns to the viewer with a proud, satisfied nod: job done. He does not clap, and his hands stay on his hips. Mouth stays closed, no talking. His hair, goggles, face and apron stay exactly the same. Locked camera, no zoom, no cut.",
  shrug:
    "A classic shrug. His elbows stay tucked at his sides while his forearms lift off the counter and turn his palms up at waist height, and at the same time he raises his shoulders up toward his ears, tilts his head slightly, raises his eyebrows and gives a lopsided clueless half-smile: no idea. His hands never rise above his chest. He holds the shrug for a moment, then drops his shoulders and rests his hands back on the counter. Mouth stays closed, no talking. His hair, earring, face and clothes stay exactly the same. Locked camera: the framing stays exactly the same, the camera does not move back, no zoom, no cut.",
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
  "strong-orc":
    "He draws in a deep breath, his huge shoulders rising, then tightens his grip and squeezes the huge boulder between his hands and arms with all his might, his muscles bulging. Cracks race across the boulder, then it bursts apart into chunks of rock and a puff of dust that tumble down to the ground. He brushes the dust off his hands and grins proudly at the viewer with his eyes open. No talking. No text, no captions. His face, tusks, topknot, belt and wrist wraps stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
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

// Videorc versions: the dark, photoreal cyber orc. Each still is generated from scratch, so its motion prompt is its own.
const VIDEORC_DURATIONS: Record<string, number> = {
  angry: 5,
  annoyed: 6,
  approves: 6,
  beach: 5,
  "beach-lounge": 6,
  "burn-it-with-fire": 6,
  celebrate: 6,
  champagne: 5,
  clap: 5,
  congratulations: 6,
  cooked: 6,
  "crazy-nod": 5,
  curious: 5,
  damn: 6,
  dance: 5,
  doit: 5,
  doubt: 5,
  ew: 5,
  facepalm: 5,
  fire: 5,
  fishing: 6,
  flashback: 6,
  flex: 5,
  "for-the-horde": 6,
  gold: 5,
  "orc-smile": 6,
  "orcish-salute": 5,
  phew: 5,
  pickaxe: 5,
  please: 5,
  popcorn: 5,
  "power-up": 6,
  proud: 5,
  "proud-of-you": 6,
  "push-to-main": 5,
  ready: 5,
};

const VIDEORC_PROMPTS: Record<string, string> = {
  // Orc smile (Videorc): rendered at 720p; the static opening stare is played at 2x afterwards, then a 0.6 s hold.
  angry:
    "He glares at the viewer, then his fury breaks: he leans forward a little and lets out one short furious roar, mouth wide open, tusks bared, shoulders heaving, his red eyes flaring blazing bright. Then he closes his mouth and holds the furious glare at the viewer, breathing hard. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  annoyed:
    "He watches the viewer with an irritated stare, then rolls his eyes slowly up and to the side in an exaggerated, exasperated eye-roll, lets out a long, heavy, annoyed sigh through his nose with his big shoulders rising and dropping, and gives a tiny, irritated head shake. Then he looks back at the viewer with flat, narrowed, unimpressed eyes. His eyes keep their dim red glow the whole time and never turn white. His arms stay crossed and his hands never rise. He does not touch his face. He does not shout. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  approves:
    "He lines the stamp up and slams it down hard onto the paper. He lifts the stamp away: a bold red APPROVED mark is left on the paper, the same width and height as the stamp face. He looks down at the mark, gives a small satisfied nod, then looks up at the viewer with a cold, approving smirk, mouth closed. No talking. No captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  beach:
    "He lifts the skull cocktail, takes one sip through the straw, lowers it and gives the viewer a relaxed, satisfied grin, mouth closed after the sip. The dark waves roll in behind him and the palm fronds sway. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "beach-lounge":
    "He is already lying in the hammock, which sways gently. He lifts the coconut, takes one small sip through the straw, then lowers it and settles back with a content, smug grin. Only one hand holds the coconut; the other stays behind his head. He does not sit up. Mouth stays closed after the sip. The palm fronds and the waves move softly. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "burn-it-with-fire":
    "He thrusts both palms forward and a roaring jet of fire blasts from the vents in his steel gauntlets onto the cursed book and papers, the flames catching and growing. He keeps blasting with a cold, determined glare, his red eyes glowing, mouth closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  celebrate:
    "He pumps his raised fist in celebration two times with a wide, fierce grin, his red eyes flaring brighter, while the black and red balloons bob beside him and silver and red confetti drifts down. His joyful grin holds. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  champagne:
    "He raises the champagne flute toward the viewer in a toast with a knowing smirk, gives it a small lift, then points at the viewer with one finger of the hand holding the glass. He holds the smug toast, mouth closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  clap:
    "He claps his hands together four times in applause with a warm, approving grin, then gives one small nod. His hands stay in front of his chest. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  congratulations:
    "He keeps his eyes open the whole time, looking proudly at the person just out of frame to the right. He lifts his hand off their shoulder and brings it down in one single hearty slap, then grips the shoulder firmly, gives it a warm proud little shake, and nods once approvingly with a big proud grin. Only that shoulder is ever visible; no other face or body enters the frame. He does not close his eyes, does not turn to the camera, does not clap and does not pat repeatedly. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  cooked:
    "He stirs the pot with gusto, steam rising, then lifts his chin with a proud, happy grin and a small satisfied nod, clearly enjoying his cooking. The word COOKED on the red neon sign stays readable and unchanged. No talking. No captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "crazy-nod":
    "Small quick yes nods the whole time: his chin dips a little, then pops back up, over and over, faster and faster, with a manic closed-mouth smirk and wide intense eyes, his red eyes glowing. Eyes stay open. He does not bow, lean or open his mouth. Hands stay down. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  curious:
    "He leans in a little closer toward the viewer, tilts his head to one side, his eyes widening with curiosity and his red eyes glowing a little brighter, then gives a small, interested blink. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  damn:
    "He starts looking off to the side. Then he turns his eyes to the viewer, leans back a little, one eyebrow lifts high, and his mouth shapes a silent, impressed damn. A small impressed nod follows. No shouting, no talking sound. The rain keeps falling. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  dance:
    "He dances to the beat, swaying his shoulders and bobbing his head, his arms moving to the groove, a joyful, fierce grin holding, the red laser beams sweeping through the haze behind him. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  doit:
    "He grins warmly at the viewer, pushes his thumbs-up a little toward the viewer and gives a firm, encouraging you-got-this nod. His red eyes glow a little brighter. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  doubt:
    "He raises one eyebrow higher, tilts his head a little and side-eyes the viewer with a skeptical look, his lips pressing together. Subtle breathing. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  ew:
    "He recoils hard from something gross just off-frame to his right, his face scrunching into an exaggerated EWWW grimace, lips pulled back over clenched teeth, turning his head away and raising one hand as if he can't bear to look. His tongue stays inside his mouth. Nothing gross ever appears in frame. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  facepalm:
    "He lets out a long weary sigh, then slowly lifts his open steel hand and presses his palm flat over his eyes and brow in a facepalm, his head tipping down into his hand. He holds the facepalm and gives a small, slow, disappointed head shake inside his palm. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  fire:
    "The flames flicker and roar around him and in his open palm, embers swirling up into the dark. He grins confidently with a dangerous look, his red eyes glowing, the firelight moving on his face and his metal plates. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  fishing:
    "The fishing line tugs hard. He leans back a little and lifts the rod, a small splash in the water, then settles back with a satisfied closed-mouth grin. Mouth stays closed. The red lantern flickers. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  flashback:
    "He gazes into the distance by the campfire, then slowly closes his eyes within the first second and keeps them closed for the rest of the shot, breathing slowly and deeply as old battles return to him. The red holographic memories of charging warriors and clashing axes flicker and drift in the smoke behind him. Mouth stays closed. Firelight flickers on his face. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  flex:
    "He flexes both biceps harder, his muscles bulging, a cocky grin holding, then gives a small proud pump of the arms. His red eyes flare a little brighter. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "for-the-horde":
    "He charges forward with the army, the ranks running behind him, then bellows a rallying war cry with his fist raised, his red eyes blazing. Keep the wide shot and the army in frame. Locked camera, no zoom to a close-up. No text, no captions. His face, tusks, metal skull plates and armor stay exactly the same.",
  gold:
    "He sits on the treasure and his grin grows richer as the coins shift and glint around him. A small satisfied chuckle moves his shoulders. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "orc-smile":
    "He keeps eye contact with the viewer the whole time. Slow and controlled, like a real actor: his cold, still stare holds for a moment, then a slow, confident, menacing smile spreads across his face, the corners of his mouth pulling up and his lips parting just enough to show his teeth between his big tusks, his cheeks lifting and his eyes narrowing a little. His red eyes flare brighter for a moment as he smiles. He holds the dangerous smile at the end. He does not nod and does not blink, and his eyes stay open. No talking. No text, no captions. His metal skull plates, bolts, cables, tusks, ears, ear rings, face and jacket stay exactly the same. The monitors behind him flicker softly and the red LIVE light glows. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "orcish-salute":
    "He draws a breath and lifts his right fist, bringing it across his body, and strikes it firmly against the left side of his chest, over his heart, with one solid thump. He keeps his fist pressed over his heart, raises his chin a little and gives one slow, solemn, respectful nod, his eyes open and steady on the viewer, his red eyes glowing brighter. Then he holds the salute perfectly still with a proud, honorable look. The banners sway softly. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  phew:
    "He wipes his forearm across his brow and lowers that arm, lets out a big relieved breath with his shoulders dropping, then beams a big cheerful grin at the viewer with a small happy chuckle. No sweat, no smoke from his mouth, no breath cloud. Eyes open at the end. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  pickaxe:
    "He swings the pickaxe into the rock wall, stone chips and red crystal shards flying, then hauls it back for another strike. Focused work grimace. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  please:
    "Keeping his palms pressed together in front of his chest, he gives his hands two small hopeful shakes, tilts his head a little to one side, raises his eyebrows a bit higher and widens his warm, charming, hopeful smile, politely asking a friendly favor. Then he holds that hopeful look at the viewer. Friendly and good-natured, not sad and not desperate. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  popcorn:
    "He eats popcorn from the bucket, tossing a few pieces into his mouth and chewing, watching something off-camera with amused eyes and a growing smirk. The screen light flickers on his face. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "power-up":
    "He pulls the cork out with his thumb, tips his head back and gulps down the glowing red potion in one go, then tosses the empty flask away over his shoulder. He clenches both fists at his sides and tenses his whole body. A blazing red aura bursts up around him like flames, crackling with red sparks, his red eyes blaze brighter and his muscles swell. He ends in a powerful stance, fists clenched, grinning fiercely at the viewer with the red aura still blazing around him. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  proud:
    "He puffs his chest out, his proud smile widening, his coat and the flag moving in the night wind. Heroic but subtle. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "proud-of-you":
    "His stern look slowly softens. His eyes grow a little misty and shine, and a warm, proud smile spreads across his face, his tusks showing. He gives one small, slow nod of approval, his eyes open and fixed warmly on the viewer. Then he lifts one hand from his crossed arms and wipes the corner of one eye with his thumb, trying to hide that he is moved, and lets out a small proud chuckle. He keeps smiling at the viewer with his eyes open. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  "push-to-main":
    "He presses the big red button firmly with his index finger: the button clicks down into its steel ring and springs back up as he lifts his finger. Right after the click, all the server lights behind him flash red and start blinking fast. He straightens up, looks at the viewer with a proud, confident grin, his eyes open, and gives one small nod. Job done. His finger is the only thing that touches the button. The steel plate and its engraved words stay exactly the same and never change. No talking. No new text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
  ready:
    "He tightens his grip on the axe and shifts into a ready combat stance, takes a determined breath, his red eyes flaring brighter. Mouth stays closed. No talking. No text, no captions. His face, tusks, metal skull plates, ear rings and clothes stay exactly the same. Locked camera: the framing stays exactly the same, no zoom, no pan, no cut.",
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
  duration: number,
  resolution: string
): Promise<string> => {
  const response = await fetch(`${API_BASE}/videos/generations`, {
    body: JSON.stringify({
      aspect_ratio: ratio,
      duration,
      image: { url: imageDataUrl },
      model: MODEL,
      prompt,
      resolution,
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

const importGif = async (
  slug: string,
  videoPath: string,
  gif: CatalogGif,
  style: string
): Promise<void> => {
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
        "--style",
        style,
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

// Videorc stills live in their own folder, and their videos get a `-videorc` suffix so both styles can sit side by side.
const sourcePath = (style: string, slug: string): string =>
  style === "videorc"
    ? path.join(SOURCE_DIR, "videorc", `${slug}.png`)
    : path.join(SOURCE_DIR, `${slug}.png`);

const generateOne = async (
  gif: CatalogGif,
  input: string,
  style: string
): Promise<void> => {
  const isVideorc = style === "videorc";
  const prompt = (isVideorc ? VIDEORC_PROMPTS : PROMPTS)[gif.slug];

  if (!prompt) {
    throw new Error(`No ${style} motion prompt for ${gif.slug}`);
  }

  const name = isVideorc ? `${gif.slug}-videorc` : gif.slug;
  process.stdout.write(`Generating ${gif.slug} ${style}\n`);
  const jpeg = await prepareStill(input, name);
  const size = await probeSize(jpeg);
  const imageDataUrl = `data:image/jpeg;base64,${(await readFile(jpeg)).toString("base64")}`;
  const requestId = await startGeneration(
    imageDataUrl,
    prompt,
    aspectRatio(size.width, size.height),
    (isVideorc ? VIDEORC_DURATIONS : DURATIONS)[gif.slug] ?? DURATION_SECONDS,
    isVideorc ? "720p" : "480p"
  );
  process.stdout.write(`  request ${requestId}\n`);
  const videoUrl = await pollVideo(requestId);
  const videoPath = path.join(VIDEO_DIR, `${name}.mp4`);
  await downloadFile(videoUrl, videoPath);
  await importGif(gif.slug, videoPath, gif, style);
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const style = args.style ?? "orc";

  if (!STYLES.has(style)) {
    throw new Error(`Invalid style: ${style}`);
  }

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
      : sourcePath(style, gif.slug);
    await generateOne(gif, input, style);
  }
};

await main();
