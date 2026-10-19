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
export function exerciseThumbnail(exercise) {
 const paths = EXERCISE_THUMBNAILS[exercise?.id], sex = getAnatomySex();
 const src = paths?.[sex] || paths?.male || paths?.female || LOCAL_GUIDE_IMAGES[exercise?.id];
 return `<span class="routine-thumbnail" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/></svg>${src ? `<img src="${src}" alt="" width="44" height="44" loading="lazy" decoding="async">` : ''}</span>`;
}
if (typeof document !== 'undefined') document.addEventListener('error', event => {
 if (event.target.matches?.('.routine-thumbnail img')) event.target.remove();
}, true);
