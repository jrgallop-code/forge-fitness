import { EXERCISE_THUMBNAILS } from './exercise-thumbnail-manifest.js';
import { getAnatomySex } from '../core/anatomy-profile.js?v=female-form-videos-1';
const LOCAL_GUIDE_IMAGES = Object.freeze({
 'barbell-bench-press':'assets/exercise-guides/performance/barbell-bench-press-guide.webp?v=1',
 'dumbbell-bench-press':'assets/exercise-guides/performance/dumbbell-bench-press.webp?v=2',
 'incline-barbell-press':'assets/exercise-guides/performance/incline-barbell-press.webp?v=1',
 'incline-dumbbell-press':'assets/exercise-guides/performance/incline-dumbbell-press.webp?v=1',
 'machine-chest-press':'assets/exercise-guides/performance/machine-chest-press.webp?v=1',
 'cable-fly':'assets/exercise-guides/performance/cable-fly.webp?v=1',
 'pec-deck':'assets/exercise-guides/performance/pec-deck.webp?v=1',
 'push-up':'assets/exercise-guides/performance/push-up.webp?v=1'
});
function fallbackArtwork(exercise) {
 const group = String(exercise?.muscleGroup || '').toLowerCase();
 const type = String(exercise?.trackingType || exercise?.type || '').toLowerCase();
 const id = String(exercise?.id || '').toLowerCase();
 const duration = type === 'duration' || /plank|hold|wall-sit|isometric/.test(id);
 const cardio = type === 'notes' || type === 'cardio' || group === 'cardio' || /run|cycling|bike|treadmill|elliptical|rower|walking/.test(id);
 // All symbols share a compact, accessible 24px viewBox and inherit the chosen theme colour.
 const paths = duration
  ? '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2M9 2h6M12 2v2"/>'
  : cardio
  ? '<circle cx="16.5" cy="4.5" r="2"/><path d="m10 10 4-3 3 3 3 1M14 7l-2 6-4 3M12 13l5 5 3 3M8 16l-4 5"/>'
  : /chest|pec/.test(group)
  ? '<path d="M12 6c-3-4-9-2-9 3v3c0 3 3 5 9 7 6-2 9-4 9-7V9c0-5-6-7-9-3Zm0 0v13"/>'
  : /back|lat|trap/.test(group)
  ? '<path d="M9 3 5 6 3 12l4 3 2 6h6l2-6 4-3-2-6-4-3-3 3-3-3ZM12 6v14M7 11l5 3 5-3"/>'
  : /leg|quad|hamstring|glute|calf|adductor/.test(group)
  ? '<path d="M7 3h10l-1 8-2 4-1 6h-3l-1-6-2-4-1-8M7 11h10M12 11v10"/>'
  : /shoulder|delt/.test(group)
  ? '<path d="m8 5 4-2 4 2 4 6-3 3-3-5v12h-4V9l-3 5-3-3 4-6Z"/>'
  : /core|ab|oblique/.test(group)
  ? '<path d="M8 3h8l2 4-2 14H8L6 7l2-4ZM8 9h8M8 14h8M12 9v12"/>'
  : /bicep|tricep|arm|forearm/.test(group)
  ? '<path d="M5 17c2 3 6 4 10 2l5-5-3-3-4 3-2-3V5H7v7l-2 5Zm2-12V3h4v2"/>'
  : '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>';
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" aria-hidden="true">' + paths + '</svg>';
}
export function exerciseThumbnail(exercise) {
 const paths = EXERCISE_THUMBNAILS[exercise?.id], sex = getAnatomySex();
 const src = paths?.[sex] || paths?.male || paths?.female || LOCAL_GUIDE_IMAGES[exercise?.id];
 return `<span class="routine-thumbnail" aria-hidden="true">${fallbackArtwork(exercise)}${src ? `<img src="${src}" alt="" width="44" height="44" loading="lazy" decoding="async">` : ''}</span>`;
}
if (typeof document !== 'undefined') document.addEventListener('error', event => {
 if (event.target.matches?.('.routine-thumbnail img')) event.target.remove();
}, true);
