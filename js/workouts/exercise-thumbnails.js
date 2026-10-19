import { EXERCISE_THUMBNAILS } from './exercise-thumbnail-manifest.js';
import { getAnatomySex } from '../core/anatomy-profile.js?v=female-form-videos-1';
export function exerciseThumbnail(exercise) {
 const paths = EXERCISE_THUMBNAILS[exercise?.id], sex = getAnatomySex();
 const src = paths?.[sex] || paths?.male || paths?.female;
 return `<span class="routine-thumbnail" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/></svg>${src ? `<img src="${src}" alt="" width="44" height="44" loading="lazy" decoding="async">` : ''}</span>`;
}
if (typeof document !== 'undefined') document.addEventListener('error', event => {
 if (event.target.matches?.('.routine-thumbnail img')) event.target.remove();
}, true);
