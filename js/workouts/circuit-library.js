import { renderRoutineSourceLabel, renderRoutineSourcePreview } from "./routine-video-links.js";
import { ensureCircuitStyles } from './circuit-styles.js';
export { ensureCircuitStyles } from './circuit-styles.js';
import { circuitTemplates } from './circuit-templates.js';
import { CIRCUIT_PROGRESS_NOTE, readCircuitSessions, circuitRoundsCompleted } from './circuit-history.js';
import { getExerciseById } from './exercise-library.js?v=exercise-library-catalogue-2';
import { openWorkoutLogger } from './workout-session.js?v=native-navigation-stability-1';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCircuitLibraryRow(plan) {
 const isSaved=Boolean(plan.isSavedPlan);
 const attr=isSaved?'data-workout-live-saved-plan':'data-workout-live-catalogue-plan';
 const duration=Number(plan.durationMinutes)>0?`<b>~${escape(plan.durationMinutes)} min</b>`:'';
 const preview=plan.days[0].exercises.map(exercise=>getExerciseById(exercise.id)?.name || exercise.name).join(' · ');
 return `<article class="workout-live-plan-row circuit-library-row${isSaved?' is-saved':''}"><button class="workout-live-row-main" type="button" ${attr}="${escape(plan.id)}"><span class="circuit-library-icon" aria-hidden="true">↻</span><span class="workout-live-row-copy"><small>${isSaved?'SAVED CIRCUIT':'LEVEL UP CIRCUIT'}</small><strong>${escape(plan.name)}</strong>${renderRoutineSourceLabel(plan)}<em>${escape(preview)}</em><span class="workout-live-row-meta"><b>${plan.rounds} rounds</b>${duration}${plan.equipment?`<b>${escape(plan.equipment)}</b>`:''}</span><em>Separate circuit progress</em></span></button><button class="workout-live-row-action" type="button" ${attr}="${escape(plan.id)}">View</button></article>`;
}
export function openCircuitTemplate(planId, landing, savedPlan = null) {
 const template=savedPlan || circuitTemplates.find(plan=>plan.id===planId);if(!template)return false;
 ensureCircuitStyles();const plan=JSON.parse(JSON.stringify(template));
 const page=landing.closest('.workout-page');if(!page)return false;
 page.querySelector('#workout-plan-detail-screen')?.remove();
 const screen=document.createElement('section');screen.id='workout-plan-detail-screen';screen.className='section-card circuit-template-detail';
 const previous=readCircuitSessions().filter(session=>session.circuitId===plan.id).sort((a,b)=>String(b.completedAt||b.date).localeCompare(String(a.completedAt||a.date)))[0];
 screen.innerHTML=`<button class="secondary-btn plan-detail-back" type="button">‹ ${savedPlan?'My Routines':'Circuits'}</button><span class="eyebrow">${savedPlan?'SAVED CIRCUIT':'LEVEL UP CIRCUIT'}</span><h2>${escape(plan.name)}</h2>${renderRoutineSourcePreview(plan)}<p>${escape(plan.description)}</p><div class="circuit-template-chips"><span>${plan.rounds} rounds</span>${Number(plan.durationMinutes)>0?`<span>~${escape(plan.durationMinutes)} min</span>`:''}${plan.equipment?`<span>${escape(plan.equipment)}</span>`:''}</div><div class="circuit-progress-note">${escape(CIRCUIT_PROGRESS_NOTE)}</div><h3>One round</h3><ol class="circuit-template-exercises">${plan.days[0].exercises.map(exercise=>`<li><strong>${escape(getExerciseById(exercise.id)?.name||exercise.name)}</strong><span>${exercise.reps?escape(exercise.reps)+(/sec|minute/i.test(exercise.reps)?'':' reps'):'Reps optional'}</span></li>`).join('')}</ol><p>Complete each exercise in order, then rest. Repeat for ${plan.rounds} rounds. Log actual reps and weights; targets are not saved as results.</p><label class="circuit-rest-control">Rest between rounds<select data-circuit-template-rest>${[...new Set([0,30,60,90,120,180,Number(plan.circuitRestSeconds)||0])].sort((a,b)=>a-b).map(seconds=>`<option value="${seconds}" ${seconds===plan.circuitRestSeconds?'selected':''}>${seconds?seconds+' sec':'Off'}</option>`).join('')}</select></label><p>For dumbbell movements, use the same weight convention as regular workouts. Choose a suitable load for each exercise.</p>${previous?`<div class="circuit-last-session"><h3>Your last circuit</h3><strong>${circuitRoundsCompleted(previous)} rounds · ${(Number(previous.durationMs||previous.durationMinutes*60000)/60000).toFixed(1)} min</strong><p>${escape(previous.date)}</p></div>`:''}<button class="primary-btn" data-start-circuit type="button">Start Circuit</button>`;
 landing.hidden=true;page.classList.add("showing-plan-details");page.appendChild(screen);
 screen.querySelector('.plan-detail-back').addEventListener('click',()=>{screen.remove();page.classList.remove("showing-plan-details");landing.hidden=false;});
 screen.querySelector('[data-start-circuit]').addEventListener('click',()=>{plan.circuitRestSeconds=Number(screen.querySelector('[data-circuit-template-rest]').value);openWorkoutLogger(plan);screen.remove();page.classList.remove("showing-plan-details");});
 screen.scrollIntoView({block:'start',behavior:'auto'});return true;
}
