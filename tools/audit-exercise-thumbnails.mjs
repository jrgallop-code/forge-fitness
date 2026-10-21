import fs from 'node:fs';
import path from 'node:path';
globalThis.localStorage = { getItem: () => null };
globalThis.window = { __levelUpAnatomySexPreview: 'male' };
// Match the expansion module's URL: Node treats query strings as module identity.
const { getAllExercises } = await import('../js/workouts/exercise-library.js?v=exercise-library-catalogue-2');
await import('../js/workouts/exercise-library-expansion.js');
const { EXERCISE_THUMBNAILS } = await import('../js/workouts/exercise-thumbnail-manifest.js');
const { getFormGuideVideo } = await import('../js/workouts/exercise-guide-video-resolver.js');
export const inventory = [...new Map(getAllExercises().map(e => [e.id, e])).values()].map(exercise => {
  const variants = EXERCISE_THUMBNAILS[exercise.id] || {};
  const videos = {};
  for (const sex of ['male', 'female']) {
    window.__levelUpAnatomySexPreview = sex;
    videos[sex] = getFormGuideVideo(exercise.id)?.src || null;
  }
  return { id: exercise.id, name: exercise.name, variants, videos,
    valid: Object.keys(variants).length > 0 && Object.values(variants).every(file => {
      if (!fs.existsSync(file)) return false;
      const data = fs.readFileSync(file);
      return data.length > 100 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
    }) };
});
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('tools/audit-exercise-thumbnails.mjs')) {
  const missing = inventory.filter(e => !e.valid);
  console.log(`${inventory.length - missing.length}/${inventory.length} exercises have valid thumbnails`);
  if (process.argv.includes('--write')) {
    fs.mkdirSync('docs/thumbnail-audit', { recursive: true });
    fs.writeFileSync('docs/thumbnail-audit/inventory.json', JSON.stringify(inventory, null, 2) + '\n');
    const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
    const cards = inventory.map(e => `<article><h2>${escape(e.name)}</h2><code>${e.id}</code><div>${['male', 'female'].map(sex => {
      const src = e.variants[sex] || e.variants.male || e.variants.female;
      return `<figure><img src="../../${escape(src || '')}" width="160" height="160"><figcaption>${sex}${!e.variants[sex] ? ' (available variant)' : ''}</figcaption></figure>`;
    }).join('')}</div></article>`).join('\n');
    fs.writeFileSync('docs/thumbnail-audit/index.html', `<!doctype html><meta charset="utf-8"><title>Exercise thumbnail audit</title><style>body{font:14px system-ui;background:#eee;margin:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:12px}article{background:white;padding:16px}h2{font-size:16px}article div{display:flex}figure{margin:8px}img{object-fit:contain}code{font-size:11px}</style><h1>Exercise thumbnail audit: ${inventory.length - missing.length}/${inventory.length}</h1><main>${cards}</main>`);
  }
  if (missing.length) {
    console.error('Insufficient thumbnail coverage:', missing.map(e => e.id).join(', '));
    process.exitCode = 1;
  }
}
