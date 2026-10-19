import { normalizeRest, REST_INTERVALS, restLabel } from './routine-builder-model.js';
export { REST_INTERVALS, restLabel };
export const REST_SETTINGS_KEY = 'level_up_exercise_rest_settings';
export function effectiveRestSetting(exerciseId, active, exerciseIndex) {
 let stored = {};
 try { stored = JSON.parse(localStorage.getItem(REST_SETTINGS_KEY) || '{}'); } catch {}
 const index = Number.isInteger(exerciseIndex) ? exerciseIndex : active?.exercises?.findIndex(x => x.exerciseId === exerciseId);
 const planned = active?.planSnapshot?.days?.[active?.trainingDayIndex ?? 0]?.exercises?.[index];
 return normalizeRest(planned?.id === exerciseId && planned.restSetting ? planned.restSetting : stored?.[exerciseId]);
}
export function restOptions(current = 120) {
 return REST_INTERVALS.map(seconds => `<option value="${seconds}" ${seconds === Number(current) ? 'selected' : ''}>${restLabel(seconds)}${seconds === 180 ? ' (optimal for hypertrophy)' : ''}</option>`).join('');
}
