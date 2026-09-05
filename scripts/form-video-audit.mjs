import '../js/workouts/exercise-library-expansion.js';
import { exercises } from '../js/workouts/exercise-library.js';
import { FORM_GUIDE_VIDEOS } from '../js/workouts/exercise-guide-video-manifest.js';

const rows = exercises
  .filter(exercise => !FORM_GUIDE_VIDEOS[exercise.id])
  .map(exercise => ({ id: exercise.id, name: exercise.name, muscleGroup: exercise.muscleGroup, trackingType: exercise.trackingType }));

console.log(`FORM_VIDEO_AUDIT_TOTAL_EXERCISES=${exercises.length}`);
console.log(`FORM_VIDEO_AUDIT_WITH_VIDEO=${Object.keys(FORM_GUIDE_VIDEOS).length}`);
console.log(`FORM_VIDEO_AUDIT_MISSING=${rows.length}`);
console.log('FORM_VIDEO_AUDIT_BEGIN');
for (const row of rows) console.log(`${row.muscleGroup}\t${row.name}\t${row.id}\t${row.trackingType}`);
console.log('FORM_VIDEO_AUDIT_END');
