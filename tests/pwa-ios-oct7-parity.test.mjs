import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('web Progress has no Photo Log tab, placeholder, or native journal initializer',()=>{
 const progress=fs.readFileSync('js/progress/progress-ui.js','utf8');
 assert.doesNotMatch(progress,/photo-log-tab|photo-log-progress|renderPhotoJournal|Photo Log Coming Soon/);
 assert.doesNotMatch(fs.readFileSync('js/core/router.js','utf8'),/initializePhotoJournal/);
});
