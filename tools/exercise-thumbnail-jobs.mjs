import fs from 'node:fs';
globalThis.localStorage={getItem:()=>null};globalThis.window={__levelUpAnatomySexPreview:'male'};
const {getAllExercises}=await import('../js/workouts/exercise-library.js');
await import('../js/workouts/exercise-library-expansion.js');
const {getFormGuideVideo}=await import('../js/workouts/exercise-guide-video-resolver.js');
const jobs=[];
for(const sex of ['male','female']){window.__levelUpAnatomySexPreview=sex;for(const ex of getAllExercises()){const video=getFormGuideVideo(ex.id);if(video)jobs.push({id:ex.id,sex,src:video.src,fallbackSrc:video.fallbackSrc});}}
fs.writeFileSync('thumbnail-jobs.json',JSON.stringify(jobs));console.log(`${jobs.length} exercise thumbnail mappings`);
