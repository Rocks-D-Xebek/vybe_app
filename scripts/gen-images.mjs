// Generates VYBE artwork with Cloudflare Workers AI and saves it to assets/images/.
// Runs on your PC only. Credentials come from env vars CF_ACCOUNT_ID and CF_AI_TOKEN
// (never stored in the repo or the app).
//
//   node scripts/gen-images.mjs                 -> all images that don't exist yet
//   node scripts/gen-images.mjs mrvyb race-hero -> only these (overwrites)
//   node scripts/gen-images.mjs --model=flux2 mrvyb   -> try another model
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const ACCOUNT = process.env.CF_ACCOUNT_ID;
const TOKEN = process.env.CF_AI_TOKEN;
if (!ACCOUNT || !TOKEN) {
  console.error('Set CF_ACCOUNT_ID and CF_AI_TOKEN environment variables first.');
  process.exit(1);
}

const OUT = path.resolve('assets/images');
const MODELS = {
  lucid: '@cf/leonardo/lucid-origin',
  flux2: '@cf/black-forest-labs/flux-2-dev',
  schnell: '@cf/black-forest-labs/flux-1-schnell',
};

// One shared look so every image feels like the same brand.
const STYLE =
  'Gen-Z streetwear graffiti illustration, bold comic ink outlines, deep black background, ' +
  'electric neon lime green (#C8FF00), vivid purple and hot magenta accents, spray-paint splashes, ' +
  'small doodled crowns and lightning bolts, high contrast, energetic, premium mobile app artwork';
const NO_TEXT = 'absolutely no text, no letters, no words, no logos, no watermark';

export const IMAGES = [
  { name: 'mrvyb', w: 1024, h: 1024,
    prompt: `Friendly AI fitness coach mascot: a cute robot with a smooth black visor face showing two glowing lime-green happy eyes and a smile, wearing a black hoodie with neon lime trim and headphones, giving a thumbs up, centered character portrait, ${STYLE}, ${NO_TEXT}` },
  { name: 'home-hero', w: 1200, h: 800,
    prompt: `Confident young South Asian Gen-Z guy with curly hair wearing big headphones and a black hoodie, looking up with determination, upper body, placed on the right side of the frame, empty dark space on the left, ${STYLE}, ${NO_TEXT}` },
  { name: 'welcome-hero', w: 1080, h: 1440,
    prompt: `Group of three diverse Gen-Z friends in athleisure streetwear mid-workout, one running, one stretching, one holding a smoothie, dynamic low angle, ${STYLE}, ${NO_TEXT}` },
  { name: 'race-hero', w: 1200, h: 720,
    prompt: `Athletic young woman sprinting in a black sports top, ponytail flying, motion speed lines, glowing planet Earth curve below her, placed on the right side of the frame, empty dark space on the left, ${STYLE}, ${NO_TEXT}` },
  { name: 'scan-hero', w: 1200, h: 800,
    prompt: `Top-down view of a colourful healthy bowl with grilled chicken, brown rice, broccoli, avocado slices and cherry tomatoes on a dark table, neon lime scanner corner brackets around it, glossy food photography mixed with graffiti doodles, ${NO_TEXT}` },
  { name: 'fridge-hero', w: 1200, h: 700,
    prompt: `Open refrigerator glowing from inside, shelves with fresh vegetables, paneer, eggs, yogurt and fruits, a small cute robot with glowing lime eyes peeking from the side, ${STYLE}, ${NO_TEXT}` },
  { name: 'community-hero', w: 1200, h: 700,
    prompt: `Gen-Z friends high-fiving after a group workout at an outdoor street basketball court at night, phones out taking a selfie, ${STYLE}, ${NO_TEXT}` },
  { name: 'empty-meals', w: 800, h: 800,
    prompt: `Cute empty plate with a fork and spoon and a tiny sleepy robot with glowing lime eyes sitting next to it, minimal composition, centered, ${STYLE}, ${NO_TEXT}` },
  // Avatars for Race / Community previews: illustrated characters, not real people.
  ...[
    ['avatar-1', 'young Indian woman with long dark hair and gold earrings'],
    ['avatar-2', 'young Japanese man with spiky blue-tinted hair'],
    ['avatar-3', 'young Latina woman with curly brown hair'],
    ['avatar-4', 'young Black man with short twists and a headband'],
    ['avatar-5', 'young Indian man with a short beard and a cap'],
    ['avatar-6', 'young East Asian woman with a bob haircut'],
    ['avatar-7', 'young British man with ginger hair and freckles'],
    ['avatar-8', 'young Brazilian woman with braids'],
  ].map(([name, who]) => ({
    name, w: 512, h: 512,
    prompt: `Stylized illustrated profile avatar of a ${who}, friendly confident smile, head and shoulders, centered, neon purple and lime rim light, solid dark background, Gen-Z comic illustration style, ${NO_TEXT}`,
  })),
];

async function generate(img, modelKey) {
  const model = MODELS[modelKey];
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${model}`;
  let res;
  if (modelKey === 'flux2') {
    const form = new FormData();
    form.append('prompt', img.prompt);
    form.append('width', String(img.w));
    form.append('height', String(img.h));
    res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
  } else {
    const body = modelKey === 'schnell'
      ? { prompt: img.prompt, steps: 8 }
      : { prompt: img.prompt, width: img.w, height: img.h, steps: 30 };
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  const json = await res.json().catch(() => ({}));
  const b64 = json?.result?.image;
  if (!res.ok || !b64) {
    throw new Error(`${res.status} ${JSON.stringify(json?.errors ?? json).slice(0, 300)}`);
  }
  return Buffer.from(b64, 'base64');
}

const args = process.argv.slice(2);
const modelKey = (args.find(a => a.startsWith('--model=')) ?? '--model=flux2').split('=')[1];
const suffix = args.includes('--suffix') ? `-${modelKey}` : '';
const only = args.filter(a => !a.startsWith('--'));
const list = only.length ? IMAGES.filter(i => only.includes(i.name)) : IMAGES;

await mkdir(OUT, { recursive: true });
let ok = 0, failed = 0;
for (const img of list) {
  const file = path.join(OUT, `${img.name}${suffix}.jpg`);
  if (!only.length) {
    try { await access(file); console.log(`skip  ${img.name} (exists)`); continue; } catch {}
  }
  try {
    const t = Date.now();
    const buf = await generate(img, modelKey);
    await writeFile(file, buf);
    console.log(`done  ${img.name}${suffix}  ${(buf.length / 1024).toFixed(0)} KB  ${((Date.now() - t) / 1000).toFixed(1)}s`);
    ok++;
  } catch (e) {
    console.log(`FAIL  ${img.name}: ${e.message}`);
    failed++;
  }
}
console.log(`\n${ok} generated, ${failed} failed`);
if (failed) process.exitCode = 1;
