import { exercises } from './exercise-library.js?v=exercise-library-catalogue-2';
import './exercise-library-expansion.js';
import { EXERCISE_THUMBNAILS } from './exercise-thumbnail-manifest.js';

const normalize = value => String(value || '').normalize('NFKD').toLowerCase()
 .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Saved sessions use exerciseId; imported/custom copies may have a new ID but
// retain the exact catalogue name. Never use substring or fuzzy muscle matches.
export function resolveExerciseThumbnailId(exercise = {}) {
 if (!exercise || typeof exercise !== 'object') return null;
 for (const id of [exercise.exerciseId, exercise.id, exercise.canonicalExerciseId]) {
  if (id && EXERCISE_THUMBNAILS[id]) return id;
 }
 const name = normalize(exercise.name || exercise.exerciseName);
 if (!name) return null;
 const matches = exercises.filter(item => EXERCISE_THUMBNAILS[item.id] && normalize(item.name) === name);
 const ids = [...new Set(matches.map(item => item.id))];
 return ids.length === 1 ? ids[0] : null;
}
