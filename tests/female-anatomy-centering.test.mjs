import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage={getItem:()=>null};
globalThis.window={__levelUpAnatomySexPreview:'female'};
const {getFormGuideMuscleVisual,getFormGuideMuscleViewBox}=await import('../js/workouts/form-guide-anatomy.js');
const {renderMuscleCarousel}=await import('../js/workouts/exercise-browser.js');

test('female muscle crops consistently center on each trace midline',()=>{
 for(const muscle of ['Chest','Shoulders','Front Delts','Side Delts','Rear Delts','Biceps','Triceps','Forearms','Lats','Upper Back','Spinal Erectors','Back','Rectus Abdominis','Obliques','Deep Core','Core','Quads','Adductors','Glutes','Hamstrings','Calves']){
  const c=getFormGuideMuscleVisual(muscle);
  const [x,y,w,h]=getFormGuideMuscleViewBox(c).split(' ').map(Number);
  assert.equal(x+w/2,c.view==='back'?540:420,muscle);
  assert.ok(w>0&&h>0&&y>=0,muscle);
 }
 const core=['Core','Deep Core','Rectus Abdominis','Obliques'].map(n=>getFormGuideMuscleViewBox(getFormGuideMuscleVisual(n)));
 assert.equal(new Set(core).size,1,'adjacent core cards retain identical framing');
});

test('exercise picker uses centered female framing, including its full-body All card',()=>{
 const html=renderMuscleCarousel();
 assert.ok(html.includes('viewBox="-60 0 960 1920"'));
 assert.ok(html.includes('viewBox="240 425 360 450"'));
});

test('male form-guide framing is preserved',()=>{
 window.__levelUpAnatomySexPreview='male';
 assert.equal(getFormGuideMuscleViewBox(getFormGuideMuscleVisual('Core')),'320 500 320 400');
 assert.equal(getFormGuideMuscleViewBox(getFormGuideMuscleVisual('Lats')),'1236 430 400 500');
 window.__levelUpAnatomySexPreview='female';
});
