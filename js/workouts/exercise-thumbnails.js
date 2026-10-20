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
 // Cardio uses a heart; every other missing thumbnail keeps the original dumbbell.
 const group = String(exercise?.muscleGroup || '').trim().toLowerCase();
 const type = String(exercise?.type || exercise?.trackingType || '').trim().toLowerCase();
 const isCardio = group === 'cardio' || type === 'cardio';
 const paths = isCardio
  ? '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'
  : '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>';
 return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" aria-hidden="true">' + paths + '</svg>';
}

export function exerciseThumbnail(exercise) {
 const paths = EXERCISE_THUMBNAILS[exercise?.id], sex = getAnatomySex();
 const src = paths?.[sex] || paths?.male || paths?.female || LOCAL_GUIDE_IMAGES[exercise?.id];
 // The Capacitor app can render this component from nested routes. Resolve packaged
 // thumbnail assets at the app root instead of against the current page's path.
 const resolvedSrc = src && !/^(?:https?:|data:|blob:)/i.test(src) ? new URL(String(src).replace(/^\/+/, ''), new URL('./', import.meta.url).href.replace(/js\/workouts\/$/, '')).href : src;
 return `<span class="routine-thumbnail" aria-hidden="true" style="position:relative;display:inline-grid;place-items:center;width:44px;height:44px;overflow:hidden">${fallbackArtwork(exercise)}${resolvedSrc ? `<img src="${resolvedSrc}" alt="" width="44" height="44" loading="eager" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;visibility:visible;opacity:0" onload="this.style.opacity=1" onerror="this.remove()" data-thumb-exercise="${String(exercise?.id || '')}">` : ''}</span>`;
}
// Keep the original SVG visible until a valid image has loaded; unavailable
// thumbnails (including assets still awaiting generation) never create blank cards.
if (typeof document !== 'undefined') document.addEventListener('load', event => {
 if (event.target.matches?.('.routine-thumbnail img') && event.target.naturalWidth > 0) {
   event.target.style.opacity = '1';
 }
}, true);
if (typeof document !== 'undefined') document.addEventListener('error', event => {
 if (event.target.matches?.('.routine-thumbnail img')) {
   console.warn('[Exercise thumbnail] Image unavailable:', event.target.dataset.thumbExercise, event.target.src);
   event.target.remove();
 }
}, true);
