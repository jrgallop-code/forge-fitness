import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync('js/workouts/exercise-thumbnails.js', 'utf8');
const workflow = readFileSync('.github/workflows/ios-app-store.yml', 'utf8');

test('Exercise images overlay the fallback SVG instead of being clipped beneath it', () => {
  assert.match(component, /position:relative;display:inline-grid;place-items:center;width:44px;height:44px;overflow:hidden/);
  assert.match(component, /style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1"/);
  assert.match(component, /src="\$\{resolvedSrc\}"/);
});

test('Bundled image URLs resolve from Capacitor app root and failed images remain fallback-safe', () => {
  assert.match(component, /const resolvedSrc =/);
  assert.match(component, /String\(src\)\.replace/);
  assert.match(component, /event\.target\.remove\(\)/);
});

test('App Store workflow audits missing mapped thumbnails instead of relying only on total counts', () => {
  assert.match(workflow, /unmappedExerciseIds/);
  assert.match(workflow, /Incomplete exercise thumbnail coverage/);
  assert.match(workflow, /thumbnail-report\.json/);
});
