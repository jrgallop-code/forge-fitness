import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.localStorage={getItem:()=>null};
globalThis.window={__levelUpAnatomySexPreview:'female'};
const {getFormGuideMuscleVisual}=await import('../js/workouts/form-guide-anatomy.js');
const {getFormGuideVideo}=await import('../js/workouts/exercise-guide-video-resolver.js');

test('female row targets isolate upper back, lats and rear delts without painting arms or hips',()=>{
 const upper=getFormGuideMuscleVisual('Upper Back');
 const lats=getFormGuideMuscleVisual('Lats');
 const delts=getFormGuideMuscleVisual('Rear Delts');
 const erectors=getFormGuideMuscleVisual('Spinal Erectors');
 const groups=[upper,lats,delts,erectors].map(x=>x.ids);
 assert.equal(new Set(groups.flat()).size,groups.flat().length);
 assert.ok(groups.every(ids=>ids.every(id=>/^muscle_female_back_/.test(id))));
 assert.ok(!lats.ids.includes('female_back_back'));
 for(const region of ['Chest','Front Delts','Side Delts','Biceps','Triceps','Forearms','Rectus Abdominis','Obliques']){
  const cfg=getFormGuideMuscleVisual(region);
  const svg=readFileSync(cfg.anatomy.asset.split('?')[0],'utf8');
  for(const id of cfg.ids)assert.ok(svg.includes(`id="${id}"`),`${region}: ${id}`);
 }
 assert.deepEqual(getFormGuideMuscleVisual('Chest').ids,['muscle_female_front_011','muscle_female_front_012']);
 assert.ok(!getFormGuideMuscleVisual('Triceps').ids.includes('muscle_female_back_022'));
});

test('uploaded live-action demonstrations retain accessible source and adaptation credits',()=>{
 for(const id of ['face-pull','hip-thrust']){
  const v=getFormGuideVideo(id);
  assert.equal(v.src,`https://media.leveluphypertrophy.com/form-videos/${id}.mp4`);
  assert.equal(v.credits.author,'Goulart');
  assert.equal(v.credits.license,'CC BY-SA 4.0');
  assert.ok(v.credits.sourcePage.startsWith('https://wger.de/'));
 }
 const renderer=readFileSync('js/workouts/exercise-guide-videos.js','utf8');
 assert.match(renderer,/credit.append\(source, " · ", license/);
});
