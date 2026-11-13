// media-doc.mjs: write docs/MEDIA.md from the image registry and the fal job records (never typed by hand).
//   node tools/media-doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/images.json'), 'utf8')).img;
const OUT = path.join(ROOT, 'private/gen/out');
const rec = (name) => { const f = path.join(OUT, name + '.result.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const srcJob = (s) => (String(s || '').match(/out\/([\w-]+)\.result\.json/) || [])[1];
const rows = Object.entries(reg).filter(([, v]) => v.ai);
const gen = rows.filter(([, v]) => v.ai === 'generated');
const edited = rows.filter(([, v]) => v.ai === 'edited');
const client = Object.values(reg).filter((v) => !v.ai).length;
const line = ([id, v]) => {
  const job = srcJob(v.source); const r = job ? rec(job) : null;
  const model = r ? r.endpoint : '';
  const prompt = r && r.input && r.input.prompt ? r.input.prompt.replace(/\s+/g, ' ').slice(0, 260) + (r.input.prompt.length > 260 ? '…' : '') : (r && r.input && r.input.image_url ? 'cut-out / edit of ' + String(r.input.image_url).replace(/^result:/, '') : '');
  return `| \`${id}\` | ${v.w} x ${v.h} | \`${model}\` | ${r ? '`' + r.request_id + '`' : ''} | ${prompt.replace(/\|/g, '/')} |`;
};
const md = `# Media

Written by \`tools/media-doc.mjs\` from \`src/content/images.json\` and the fal job records.

- **${client} client images** from the live site (photos, flyers, logos), resized to WebP only.
- **${edited.length} client photos enlarged** with fal Topaz High Fidelity V2 (no content change): IPTC
  "compositeWithTrainedAlgorithmicMedia" in each file, \`data-ai="edited"\` on the page.
- **${gen.length} generated images** (mood and category illustration only; never the stores, staff, customers, products or
  a real place): IPTC "trainedAlgorithmicMedia" in each file, \`data-ai="generated"\` on the page.
- **2 generated loops** (\`assets/video/turntable-*.mp4\`, \`mural-*.mp4\`): fal Kling 2.5 Turbo Pro image-to-video with the
  first and last frame set to the same still, folded with a short crossfade and encoded with macOS VideoToolbox H.264.
  Higgsfield (Kling 3.0 Pro, Kling 2.5 Turbo) was tried first and refused both jobs for low credit; nothing was charged.

Rules used on every generated still: no people, hands or faces; no text, numbers, logos or labels; blank packaging;
one hard key light from the upper left and a thin lime rim light; shot on black so it composites onto the dark bands.
Each render was reviewed at full size; the first pre-roll render read as cigarettes and was regenerated.

## Generated

| id | size | model | request | prompt |
|---|---|---|---|---|
${gen.map(line).join('\n')}

## Enlarged client photos

| id | size | model | request | source |
|---|---|---|---|---|
${edited.map(line).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'docs/MEDIA.md'), md);
console.log('docs/MEDIA.md:', gen.length, 'generated,', edited.length, 'edited,', client, 'client');
