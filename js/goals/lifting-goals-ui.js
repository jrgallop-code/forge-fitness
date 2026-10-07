import { BADGES, availableBadges, BADGE_METRIC_LABELS, BADGES_KEY, GOALS_KEY, readJson, readGoals, reconcileBadges, goalProgress, startingGoalSet, goalBaseline, saveGoal, deleteGoal } from './lifting-goals-engine.js';
import { badgeArt } from './training-badge-art.js';
import { getAllExercises } from '../workouts/exercise-library.js?v=exercise-library-catalogue-2';
import '../workouts/exercise-library-expansion.js?v=exercise-library-expansion-1';
import { getEquipmentProfiles, supportsEquipmentProfiles } from '../workouts/equipment-profiles.js?v=equipment-profiles-1';
import { UNIT_KINDS, formatMass, displayMass, canonicalMass, massUnit } from '../core/unit-system.js?v=granular-units-1';

const regularSessions = () => readJson('forge_workout_sessions', []).filter?.(s => s) || [];
const allSessions = () => [...regularSessions(), ...(readJson('level_up_circuit_sessions_v1', []).filter?.(s => s) || [])];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mass = weight => formatMass(weight, 1, UNIT_KINDS.LIFTING_WEIGHT);
const targetText = goal => `${mass(goal.targetWeight)}${goal.targetReps ? ` × ${goal.targetReps} reps` : ''}`;
let queued = false, modal = null, previousFocus = null;
let badgeFilter='All';
const artOptions=(badge,earned)=>({locked:!earned,milestone:badge.threshold,metric:badge.metric,customArt:badge.customArt,showMilestone:badge.showMilestone!==false});

function ring(percent) {
  return `<span class="lifting-goal-ring" role="img" aria-label="${percent}% of goal progress"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="goal-ring-track" cx="50" cy="50" r="42"/><circle class="goal-ring-progress" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="${percent} 100"/></svg><strong>${percent}%</strong></span>`;
}
function badgeButton(badge, earned, action = 'badge') {
  return `<button type="button" class="training-badge-button${earned ? '' : ' is-locked'}" data-${action}="${badge.id}">${badgeArt(badge.art, artOptions(badge,earned))}<span>${escape(badge.name)}</span>${action === 'badge' ? `<small>${earned ? 'Earned' : 'Not earned · View requirements'}</small>` : ''}</button>`;
}
function dashboardMarkup() {
  const sessions = regularSessions(), goals = readGoals();
  const state = reconcileBadges(allSessions());
  const recent = availableBadges().filter(b => state.earned[b.id]).sort((a,b) => String(state.earned[b.id].earnedAt).localeCompare(String(state.earned[a.id].earnedAt))).slice(0,3);
  return `<section class="section-card lifting-goals-dashboard"><header><h2>Lifting Goals</h2><button type="button" data-goal-add aria-label="Add lifting goal">+ Add</button></header><div class="lifting-goals-grid">${goals.length ? goals.map(goal => `<button class="lifting-goal-summary" type="button" data-goal-detail="${escape(goal.id)}">${ring(goalProgress(goal,sessions).percent)}<strong>${escape(goal.name)}</strong></button>`).join('') : '<button type="button" class="lifting-goal-empty" data-goal-add>Set your first lifting goal</button>'}</div></section><section class="section-card training-badges-dashboard"><header><h2>Recent Badges</h2><button type="button" data-badges-open>View all</button></header><div class="training-badges-recent">${(recent.length ? recent : availableBadges().slice(0,3)).map(b => badgeButton(b,state.earned[b.id],'dashboard-badge')).join('')}</div>${recent.length ? '' : '<p class="training-goal-muted">Your first badges are waiting to be earned.</p>'}</section>`;
}
function renderDashboard() {
  const content = document.getElementById('content');
  if (!content?.querySelector(':scope > .dashboard-welcome') || !content.querySelector(':scope > .dashboard')) return;
  const anchor = content.querySelector('[data-dashboard-muscle-snapshot]');
  if (!anchor) return;
  let root = document.getElementById('lifting-goals-dashboard');
  if (!root || !content.contains(root)) { root = document.createElement('div'); root.id = 'lifting-goals-dashboard'; root.setAttribute('data-unit-text-ignore',''); }
  const html = dashboardMarkup();
  // Compare the source signature, not browser-normalized innerHTML (which adds
  // empty attribute values and could otherwise keep the observer running).
  if (root.__goalsMarkup !== html) { root.__goalsMarkup=html;root.innerHTML=html; }
  if (anchor.nextElementSibling !== root) anchor.insertAdjacentElement('afterend',root);
}
function queueRender() { if (queued) return; queued = true; requestAnimationFrame(() => { queued=false; renderDashboard(); }); }
function closeModal() { modal?.remove(); modal=null; document.body.classList.remove('training-goals-open'); previousFocus?.isConnected && previousFocus.focus(); }
function openModal(title, html, back = null) {
  if (!modal) previousFocus = document.activeElement;
  modal?.remove(); modal=document.createElement('div'); modal.className='training-goals-overlay'; modal.setAttribute('data-unit-text-ignore','');
  modal.innerHTML=`<section class="training-goals-sheet" role="dialog" aria-modal="true" aria-labelledby="training-goals-title"><header><button type="button" data-training-back aria-label="${back ? 'Back' : 'Close'}">${back ? '‹ Back' : 'Close'}</button><h2 id="training-goals-title" tabindex="-1">${escape(title)}</h2></header>${html}</section>`;
  document.body.appendChild(modal); document.body.classList.add('training-goals-open');
  modal.querySelector('[data-training-back]').addEventListener('click',back || closeModal);
  modal.querySelector('h2').focus({preventScroll:true});
  modal.addEventListener('keydown',event => {
    if (event.key==='Escape') { event.preventDefault(); (back || closeModal)(); }
    if (event.key==='Tab') {
      const items=[...modal.querySelectorAll('button,input,select,[tabindex="0"]')].filter(e => !e.disabled && e.getClientRects().length);
      if (!items.length) return;
      if (event.shiftKey && (document.activeElement===items[0] || document.activeElement.tagName==='H2')) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement===items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
  });
}
export function openBadgeCollection() {
  const state=reconcileBadges(allSessions());
  if(!['All','Earned','Locked',...availableBadges().map(b=>b.category)].includes(badgeFilter)) badgeFilter='All';
  const filters=['All','Earned','Locked',...new Set(availableBadges().map(b=>b.category))];
  const visible=availableBadges().filter(b=>badgeFilter==='All' || badgeFilter==='Earned' && state.earned[b.id] || badgeFilter==='Locked' && !state.earned[b.id] || b.category===badgeFilter);
  openModal('Your Badges',`<p class="training-goal-muted">${availableBadges().filter(b=>state.earned[b.id]).length} of ${availableBadges().length} earned · ${state.metrics.currentWeeks} week${state.metrics.currentWeeks===1?'':'s'} in your current streak</p><div class="training-badge-filters" role="group" aria-label="Filter badges">${filters.map(filter=>`<button type="button" data-badge-filter="${escape(filter)}" aria-pressed="${filter===badgeFilter}">${escape(filter)}</button>`).join('')}</div><div class="training-badge-grid">${visible.map(b=>badgeButton(b,state.earned[b.id])).join('')}</div>${visible.length?'':'<p class="training-goal-muted">No badges in this filter yet.</p>'}`);
}
function openBadgeDetail(id) {
  const badge=availableBadges().find(b=>b.id===id); if (!badge) return;
  const returnScroll=modal?.scrollTop || 0;
  const state=reconcileBadges(allSessions()), earned=state.earned[id];
  openModal(badge.name,`<div class="training-badge-detail">${badgeArt(badge.art,artOptions(badge,earned))}<strong>${earned ? 'Earned' : 'Not earned yet'}</strong><p>${escape(badge.description)}</p>${earned ? `<p class="training-goal-muted">Earned ${escape(new Date(earned.earnedAt).toLocaleDateString())}</p>` : `<p class="training-goal-muted">${Math.min(state.metrics[badge.metric]||0,badge.threshold)} / ${badge.threshold} ${escape(BADGE_METRIC_LABELS[badge.metric]||'achievements')}</p>`}</div>`,()=>{openBadgeCollection();modal.scrollTop=returnScroll;});
}
function openGoalDetail(id) {
  const goal=readGoals().find(g=>g.id===id); if (!goal) return;
  const progress=goalProgress(goal,regularSessions());
  openModal(goal.name,`<div class="lifting-goal-detail">${ring(progress.percent)}<h3>${progress.reached ? 'Goal reached!' : 'Your lifting goal'}</h3><dl><div><dt>Target</dt><dd>${escape(targetText(goal))}</dd></div><div><dt>Starting best</dt><dd>${escape(mass(progress.baseline.weight))} × ${progress.baseline.reps} reps</dd></div><div><dt>Best progress set</dt><dd>${escape(mass(progress.best))} × ${progress.bestSet?.reps || progress.baseline.reps} reps</dd></div>${goal.equipmentProfileId!=='default'?`<div><dt>Machine</dt><dd>${escape(goal.equipmentProfileName)}</dd></div>`:''}</dl><p class="training-goal-muted">${progress.legacy ? 'This older goal tracks weight only. Edit it to add a rep target and enable weight-and-rep scoring.' : `Goal progress gives 50% credit for moving toward your target weight and 50% for improving estimated strength through weight and reps. Lower-rep sets can earn credit. Complete at least ${targetText(goal)} in one set to reach 100%. This score is a progress indicator, not a measured percentage of strength gained.`} Warm-ups and circuits are excluded. Your best set determines progress.</p><button type="button" class="primary-btn" data-goal-edit="${escape(goal.id)}">Edit goal</button><button type="button" class="secondary-btn" data-goal-add>Add another goal</button><button type="button" class="training-goal-delete" data-goal-delete="${escape(goal.id)}">Delete goal</button></div>`);
}
function openGoalForm(id=null) {
  const existing=readGoals().find(g=>g.id===id);
  const exercises=getAllExercises().filter(e=>!e.trackingType || e.trackingType==='reps').sort((a,b)=>a.name.localeCompare(b.name));
  const initial=existing?.exerciseId || exercises.find(e=>e.id==='dumbbell-bench-press')?.id || exercises[0]?.id;
  openModal(existing?'Edit Lifting Goal':'Add Lifting Goal',`<form class="lifting-goal-form"><label>Find an exercise<input type="search" data-goal-search placeholder="Search exercises" ${existing?'disabled':''}></label><label>Exercise<select name="exercise" ${existing?'disabled':''}>${exercises.map(e=>`<option value="${escape(e.id)}" ${e.id===initial?'selected':''}>${escape(e.name)}</option>`).join('')}</select></label><label data-machine-label>Machine<select name="machine" ${existing?'disabled':''}></select></label><label>Goal weight (${massUnit(UNIT_KINDS.LIFTING_WEIGHT)})<input name="weight" data-unit-input-ignore type="number" min="0.1" step="any" inputmode="decimal" value="${existing ? displayMass(existing.targetWeight,2,UNIT_KINDS.LIFTING_WEIGHT) : ''}" required></label><label>Goal reps<input name="reps" type="number" min="1" max="100" step="1" inputmode="numeric" value="${existing?.targetReps || ''}" placeholder="e.g. 8" required ${existing?.targetReps?'disabled':''}></label><label>Starting weight (${massUnit(UNIT_KINDS.LIFTING_WEIGHT)})<input name="baselineWeight" data-unit-input-ignore type="number" min="0" step="any" inputmode="decimal" required ${existing?'disabled':''}></label><label>Starting reps<input name="baselineReps" type="number" min="1" max="100" step="1" inputmode="numeric" required ${existing?.targetReps?'disabled':''}></label><p class="training-goal-muted" data-goal-baseline></p><p class="training-goal-muted">Use the same weight convention as the workout logger, including per-dumbbell loads.</p><p role="alert" data-goal-error></p><button type="submit" class="primary-btn">Save Goal</button></form>`,existing?()=>openGoalDetail(existing.id):null);
  const form=modal.querySelector('form'), exerciseSelect=form.elements.exercise, machineSelect=form.elements.machine;
  const refreshBaseline=()=>{
    const reps=Number(form.elements.reps.value)||8;
    const selected=exerciseSelect.value;
    const reference=existing ? goalBaseline(existing,regularSessions()) : startingGoalSet(regularSessions(),selected,machineSelect.value||'default',reps);
    form.elements.baselineWeight.value=displayMass(reference.weight,2,UNIT_KINDS.LIFTING_WEIGHT);
    form.elements.baselineReps.value=reference.reps;
    form.querySelector('[data-goal-baseline]').textContent=existing ? 'Your original starting performance stays fixed.' : 'Starting performance is filled from your history. Adjust it if needed before saving.';
  };
  const refreshMachine=()=>{
    const exercise=exercises.find(e=>e.id===exerciseSelect.value);
    const profiles=getEquipmentProfiles(exerciseSelect.value);
    machineSelect.innerHTML=profiles.map(p=>`<option value="${escape(p.id)}" ${p.id===(existing?.equipmentProfileId||'default')?'selected':''}>${escape(p.name)}</option>`).join('');
    form.querySelector('[data-machine-label]').hidden=!supportsEquipmentProfiles(exercise); refreshBaseline();
  };
  form.querySelector('[data-goal-search]').addEventListener('input',event=>{
    const term=event.target.value.toLowerCase(), selected=exerciseSelect.value;
    const matches=exercises.filter(e=>e.name.toLowerCase().includes(term));
    exerciseSelect.innerHTML=matches.map(e=>`<option value="${escape(e.id)}" ${e.id===selected?'selected':''}>${escape(e.name)}</option>`).join(''); refreshMachine();
  });
  exerciseSelect.addEventListener('change',refreshMachine); machineSelect.addEventListener('change',refreshBaseline); form.elements.reps.addEventListener('input',refreshBaseline); refreshMachine();
  form.addEventListener('submit',event=>{
    event.preventDefault();
    try {
      const exercise=exercises.find(e=>e.id===exerciseSelect.value);
      const profile=getEquipmentProfiles(exerciseSelect.value).find(p=>p.id===machineSelect.value);
      const goal=saveGoal({id:existing?.id,exerciseId:exercise?.id,name:exercise?.name,equipmentProfileId:profile?.id,equipmentProfileName:profile?.name,targetWeight:canonicalMass(form.elements.weight.value,UNIT_KINDS.LIFTING_WEIGHT),targetReps:existing?.targetReps ?? form.elements.reps.value,baselineWeight:canonicalMass(form.elements.baselineWeight.value,UNIT_KINDS.LIFTING_WEIGHT),baselineReps:form.elements.baselineReps.value},regularSessions());
      queueRender();openGoalDetail(goal.id);
    } catch(error) { form.querySelector('[data-goal-error]').textContent=error.message; }
  });
}
export function renderSessionBadges(sessionId) {
  const state=readJson(BADGES_KEY,{}), earned=state.earned || {};
  const badges=availableBadges().filter(b=>earned[b.id]?.sessionId===sessionId && !earned[b.id]?.notifiedAt);
  if (badges.length) { for(const badge of badges) earned[badge.id].notifiedAt=new Date().toISOString();localStorage.setItem(BADGES_KEY,JSON.stringify({...state,earned})); }
  return badges.length ? `<section class="training-badges-earned" data-unit-text-ignore aria-label="New badges"><h3>Badges earned</h3><div>${badges.map(b=>badgeButton(b,true)).join('')}</div></section>` : '';
}

document.addEventListener('click',event=>{
  const button=event.target.closest?.('button'); if (!button) return;
  if(button.dataset.badgeFilter) {
    if (badgeFilter === button.dataset.badgeFilter) return;
    const scroll = modal?.scrollTop || 0;
    const horizontal = modal?.querySelector('.training-badge-filters')?.scrollLeft || 0;
    badgeFilter=button.dataset.badgeFilter;openBadgeCollection();
    modal.scrollTop=scroll;
    modal.querySelector('.training-badge-filters').scrollLeft=horizontal;
    [...modal.querySelectorAll('[data-badge-filter]')].find(item=>item.dataset.badgeFilter===badgeFilter)?.focus({preventScroll:true});
  }
  else if (button.hasAttribute('data-badges-open') || button.hasAttribute('data-dashboard-badge')) {badgeFilter='All';openBadgeCollection();}
  else if (button.dataset.badge) openBadgeDetail(button.dataset.badge);
  else if (button.dataset.goalDetail) openGoalDetail(button.dataset.goalDetail);
  else if (button.hasAttribute('data-goal-add')) openGoalForm();
  else if (button.dataset.goalEdit) openGoalForm(button.dataset.goalEdit);
  else if (button.dataset.goalDelete) {
    const id=button.dataset.goalDelete;
    openModal('Delete lifting goal?',`<p>This removes this goal. Your workout history stays saved.</p><button type="button" class="primary-btn" data-goal-confirm-delete="${escape(id)}">Delete goal</button>`,()=>openGoalDetail(id));
  } else if (button.dataset.goalConfirmDelete) { deleteGoal(button.dataset.goalConfirmDelete);closeModal();queueRender(); }
});
window.addEventListener('levelup:workout-completed',event=>{
  reconcileBadges(allSessions(),{notify:true,sessionId:event.detail?.sessionId});queueRender();
});
window.addEventListener('levelup:monthly-report-reviewed',()=>{
  const result=reconcileBadges(allSessions(),{notify:true});queueRender();
  if(!result.newlyEarned.includes('first-chapter')) return;
  const badge=BADGES.find(b=>b.id==='first-chapter');
  document.getElementById('training-badge-notice')?.remove();
  const notice=document.createElement('div');notice.id='training-badge-notice';notice.setAttribute('role','status');
  notice.innerHTML=`<span>Badge earned: ${escape(badge.name)}</span><button type="button" data-badge="${badge.id}">View badge</button><button type="button" data-badge-notice-close aria-label="Dismiss badge notification">×</button>`;
  document.body.appendChild(notice);
  notice.querySelector('[data-badge]').addEventListener('click',()=>notice.remove());
  notice.querySelector('[data-badge-notice-close]').addEventListener('click',()=>notice.remove());
});

function handleNutritionBadgeEvent(event) {
 const result=reconcileBadges(allSessions(),{notify:true,nutritionEvent:event.detail});queueRender();
 const badges=availableBadges().filter(b=>b.nutrition && result.newlyEarned.includes(b.id));
 if(!badges.length)return;
 const state=readJson(BADGES_KEY,{});for(const badge of badges)state.earned[badge.id].notifiedAt=new Date().toISOString();localStorage.setItem(BADGES_KEY,JSON.stringify(state));
 document.getElementById('training-badge-notice')?.remove();
 const notice=document.createElement('div');notice.id='training-badge-notice';notice.setAttribute('role','status');
 notice.innerHTML=`<span>Badge${badges.length>1?'s':''} earned: ${badges.map(b=>escape(b.name)).join(', ')}</span><button type="button" data-badges-open>View badges</button><button type="button" aria-label="Dismiss badge notification">×</button>`;
 document.body.appendChild(notice);notice.querySelector('[data-badges-open]').addEventListener('click',()=>notice.remove());notice.querySelector('[aria-label]').addEventListener('click',()=>notice.remove());
}
for(const name of ['levelup:food-log-updated','levelup:nutrition-updated','levelup:maintenance-check-in-updated','levelup:nutrition-badge-event','levelup:weight-updated'])window.addEventListener(name,handleNutritionBadgeEvent);
window.addEventListener('levelup:app-features-updated',()=>{document.getElementById('training-badge-notice')?.remove();closeModal();queueRender();});
window.addEventListener('levelup:units-changed',()=>{closeModal();queueRender();});
for (const name of ['storage','levelup:appearance-change','levelup:workout-resumed']) window.addEventListener(name,queueRender);
document.querySelectorAll('.nav-btn').forEach(button=>button.addEventListener('click',closeModal));
const content=document.getElementById('content');
if (content) new MutationObserver(queueRender).observe(content,{childList:true,subtree:true});
reconcileBadges(allSessions());queueRender();
