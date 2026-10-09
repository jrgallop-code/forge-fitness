import test from 'node:test';import assert from 'node:assert/strict';
import {videoLibraryExercises} from '../js/workouts/video-library-exercises.js';
import {videoLibraryMedia} from '../js/workouts/video-library-media.js';
import {createGeneratedExerciseGuide} from '../js/workouts/exercise-guide-generator.js';
globalThis.localStorage={getItem:()=>null};
test('all new exercise entries are unique and available in every catalogue module instance',async()=>{
 await import('../js/workouts/exercise-library-expansion.js');
 const {getAllExercises}=await import('../js/workouts/exercise-library.js?v=exercise-library-catalogue-2');
 const unversioned=await import('../js/workouts/exercise-library.js');
 const all=getAllExercises();assert.equal(new Set(all.map(e=>e.id)).size,all.length);
 assert.equal(videoLibraryExercises.length,187);
 for(const e of videoLibraryExercises){assert.ok(all.some(x=>x.id===e.id));assert.ok(unversioned.getExerciseById(e.id));}
});
test('every new guide includes primary targets and all normal instruction sections',()=>{
 for(const exercise of videoLibraryExercises){
 const guide=createGeneratedExerciseGuide(exercise);
 assert.ok(guide.primary.length,exercise.id);
 assert.ok(Array.isArray(guide.secondary),exercise.id);
 for(const field of ['setup','execution','cues','mistakes'])assert.ok(guide[field]?.length>=3,exercise.id+' '+field);
 assert.ok(exercise.equipment);assert.ok(exercise.defaultSets>0);
 }
 assert.deepEqual(createGeneratedExerciseGuide(videoLibraryExercises.find(e=>e.id==='kettlebell-deadlift')).primary,['Hamstrings','Glutes']);
 assert.deepEqual(createGeneratedExerciseGuide(videoLibraryExercises.find(e=>e.id==='dumbbell-concentration-curl')).primary,['Biceps']);
});
test('new video guides resolve to the exact male/female Drive files instead of invented media paths',async()=>{
 const {getFormGuideVideo}=await import('../js/workouts/exercise-guide-video-resolver.js');
 for(const e of videoLibraryExercises){
 for(const sex of ['male','female']){
 globalThis.window={__levelUpAnatomySexPreview:sex};
 const video=getFormGuideVideo(e.id),source=videoLibraryMedia[e.id];
 const expected=source.driveVideos[sex]||source.driveVideos.male||source.driveVideos.female;
 assert.equal(video.provider,'google-drive');assert.equal(video.src,`https://drive.google.com/file/d/${expected}/preview`);
 assert.ok(video.sourceUrl.endsWith('/view'));
 }
 }
});
