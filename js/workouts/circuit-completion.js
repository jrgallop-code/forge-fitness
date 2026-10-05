import { renderSessionBadges } from '../goals/lifting-goals-ui.js';
import { CIRCUIT_PROGRESS_NOTE, circuitRoundsCompleted } from './circuit-history.js';
import { ensureCircuitStyles } from './circuit-styles.js';
export function showCircuitCompletion(session) {
 ensureCircuitStyles();document.getElementById('circuit-completion')?.remove();
 const overlay=document.createElement('div');overlay.id='circuit-completion';overlay.className='circuit-completion-overlay';
 const minutes=Math.max(0,Number(session.durationMs)||0)/60000;
 overlay.innerHTML=`<section class="circuit-completion-card" role="dialog" aria-modal="true" aria-labelledby="circuit-completion-title"><span class="eyebrow">CIRCUIT SAVED</span><h2 id="circuit-completion-title">Circuit complete</h2><p><strong>${circuitRoundsCompleted(session)} rounds</strong> · ${minutes.toFixed(1)} minutes</p><p>${CIRCUIT_PROGRESS_NOTE}</p>${renderSessionBadges(session.id)}<button class="primary-btn" type="button">Done</button></section>`;
 document.body.appendChild(overlay);const button=overlay.querySelector('.primary-btn');
 button.addEventListener('click',()=>{overlay.remove();document.querySelector('.nav-btn[data-page="workout"]')?.click();});
 overlay.addEventListener('keydown',event=>{if(event.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}}});button.focus();
}
