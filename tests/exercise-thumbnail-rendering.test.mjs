import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync('js/workouts/exercise-thumbnails.js', 'utf8');
const workflow = readFileSync('.github/workflows/ios-app-store.yml', 'utf8');

test('Exercise thumbnails preserve the default SVG until the image is loaded', () => {
 assert.doesNotMatch(readFileSync('css/routine-builder.css', 'utf8'), /\.routine-thumbnail:has\(img\)>svg\{visibility:hidden\}/);
 assert.match(component, /fallbackArtwork\(exercise\)/);
 assert.match(component, /visibility:hidden/);
 assert.match(component, /event\.target\.naturalWidth > 0|event\.target\.naturalWidth > 0|event\.target\.naturalWidth/);
 assert.match(component, /style\.visibility = 'visible'/);
 assert.match(component, /event\.target\.remove\(\)/);
});
test("Exercise thumbnails use the user's anatomy sex when matching imagery exists", () => {
 assert.match(component, /getAnatomySex\(\)/);
 assert.match(component, /paths\?\.\[sex\]/);
});
test('Bundled thumbnail assets resolve at the native app root', () => {
 assert.match(component, /const resolvedSrc =/);
 assert.match(component, /String\(src\)\.replace/);
});
test('Video thumbnail release retains its minimum-coverage gate', () => {
 assert.match(workflow, /Insufficient thumbnail coverage/);
});
