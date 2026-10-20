import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

function readManifest() {
  const text = readFileSync('js/workouts/exercise-thumbnail-manifest.js', 'utf8');
  const match = text.match(/EXERCISE_THUMBNAILS\\s*=\\s*(\\{.*\\})\\s*;/s);
  assert.ok(match, 'thumbnail manifest must export an object');
  return JSON.parse(match[1]);
}

test('all exercise thumbnail paths point to real, nonempty images', () => {
  const entries = readManifest();
  assert.ok(Object.keys(entries).length >= 249);
  for (const [id, versions] of Object.entries(entries)) {
    assert.ok(versions.male || versions.female, `no usable variant for ${id}`);
    for (const [sex, path] of Object.entries(versions)) {
      assert.match(path, /^assets\\/exercise-thumbnails\\/[a-z0-9-]+\\.webp$/i, `unsafe image path for ${id} ${sex}`);
      const bytes = statSync(path).size;
      assert.ok(bytes > 100, `empty thumbnail ${path}`);
      assert.equal(readFileSync(path).toString('ascii', 0, 4), 'RIFF', `invalid WebP: ${path}`);
    }
  }
});
