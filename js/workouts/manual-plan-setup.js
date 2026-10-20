import {getExerciseById} from './exercise-library.js?v=exercise-library-catalogue-2';
const exerciseThumbnail = exercise => '<span class="routine-thumbnail" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/></svg></span>';
import {normalizeTargets, syncTargets, exerciseKind, moveRoutineExercise, groupRoutineExercises, ungroupExercise} from './routine-builder-model.js';
import {effectiveRestSetting, restOptions, restLabel} from './exercise-rest-settings.js';
import {getEquipmentProfiles, supportsEquipmentProfiles, addEquipmentProfile} from './equipment-profiles.js?v=equipment-profiles-1';
import {massUnit, UNIT_KINDS, canonicalMass, displayMass} from '../core/unit-system.js?v=granular-units-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let context, selectedDay = 0;
const root = () => document.getElementById('plan-builder');
const definition = p => getExerciseById(p.id);
const cards = () => [...document.querySelectorAll('#workout-days > .workout-day-card')];
function guide(id) { document.dispatchEvent(new CustomEvent('levelup:open-exercise-guide',{detail:{exerciseId:id,sourceSelector:'#plan-builder',manualBuilderGuide:true,backLabel:'Close'}})); }
function update(render = false) { context.changed(); if (render) context.render(); }
export function initializeRoutineEditor(next) {
 context = next;
 const builder=root(); if (!builder) return;
 builder.classList.add('manual-catalogue','routine-builder');
 if (!document.querySelector('link[data-routine-builder]')) {
  const link=document.createElement('link');link.rel='stylesheet';link.href='css/routine-builder.css?v=ios-routine-1';link.dataset.routineBuilder='';document.head.append(link);
 }
 const heading=builder.querySelector('.builder-heading h3');if(heading)heading.textContent=builder.dataset.editingPlan==='true'?'Edit Routine':'Build Routine';
 builder.querySelector('.builder-heading p')?.setAttribute('hidden','');
 builder.querySelector('#close-plan-builder-btn')?.replaceChildren(document.createTextNode('Close'));
 builder.querySelector('#save-plan-btn')?.replaceChildren(document.createTextNode('Save Routine'));
 selectedDay=Math.min(selectedDay,Math.max(0,next.plan.days.length-1));
 let tabs=builder.querySelector('[data-routine-days]');if(!tabs){tabs=document.createElement('div');tabs.dataset.routineDays='';document.getElementById('workout-days').before(tabs);}
 tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Routine days');
 tabs.innerHTML=next.plan.days.map((d,i)=>`<button type="button" role="tab" aria-selected="${i===selectedDay}" data-routine-day="${i}">${esc(d.name||`Day ${i+1}`)}</button>`).join('');
 tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedDay=Number(b.dataset.routineDay);initializeRoutineEditor(context);});
 cards().forEach((card,di)=>{
  card.hidden=di!==selectedDay;
  const day=next.plan.days[di];
  [...card.querySelectorAll('.exercise-builder-row')].forEach((row,ei)=>decorateRow(row,day.exercises[ei],di,ei));
 });
 let toolbar=builder.querySelector('[data-routine-toolbar]');if(!toolbar){toolbar=document.createElement('div');toolbar.dataset.routineToolbar='';tabs.after(toolbar);}
 const day=next.plan.days[selectedDay];toolbar.innerHTML=`<small>${day?.exercises?.length||0} exercises</small><button type="button" data-routine-reorder>Reorder</button>`;
 toolbar.querySelector('button').onclick=()=>openReorder(selectedDay);
 if (!builder.dataset.routineBound) {
  builder.addEventListener('click',e=>{const repeat=e.target.closest('[data-repeat-workout-day]');if(repeat){e.preventDefault();e.stopImmediatePropagation();context.duplicate(Number(repeat.dataset.dayIndex));}},true);
  builder.dataset.routineBound='1';
  builder.addEventListener('input',e=>{if(e.target.id==='plan-name')context.plan.name=e.target.value;});
 }
}
function decorateRow(row,p,di,ei) {
 const ex=definition(p);if(!ex)return;
 row.routinePlanned=p;row.classList.add('routine-exercise');row.dataset.routineIndex=String(ei);
 const kind=exerciseKind(ex,p), timed=kind==='duration',cardio=kind==='cardio';
 row.querySelector('.routine-exercise-content')?.remove();
 const content=document.createElement('div');content.className='routine-exercise-content';
 const rest=p.restSetting||effectiveRestSetting(p.id);
 const group=p.supersetGroup?`<span class="routine-group-label">${p.groupType==='circuit'?'Circuit':'Superset'} ${esc(String.fromCharCode(65+[...new Set(context.plan.days[di].exercises.map(x=>x.supersetGroup).filter(Boolean))].indexOf(p.supersetGroup)))}</span>`:'';
 content.innerHTML=`${group}<header class="routine-exercise-head"><button type="button" class="routine-guide" aria-label="Form guide for ${esc(ex.name)}">${exerciseThumbnail(ex)}</button><div><strong>${esc(ex.name)}</strong><small>${esc(ex.muscleGroup)} · ${esc(ex.equipment)}${cardio?' · Cardio':''}</small></div><button type="button" class="routine-more" aria-label="Options for ${esc(ex.name)}">•••</button></header><div class="routine-tools"><button type="button" data-routine-rest>◷ Rest: ${rest.enabled?restLabel(rest.seconds):'Off'}</button><button type="button" data-routine-note>▤ ${p.notes?'Edit note':'Note'}</button></div>${p.notes?`<details class="routine-note-preview"><summary>${esc(p.notes)}</summary><p>${esc(p.notes)}</p></details>`:''}<div data-routine-targets></div>`;
 row.append(content);
 content.querySelector('.routine-guide').classList.add('manual-pick-guide');content.querySelector('.routine-guide').dataset.exerciseId=p.id;
 content.querySelector('.routine-more').onclick=()=>openOptions(di,ei);
 content.querySelector('[data-routine-note]').onclick=()=>openNote(p);
 content.querySelector('[data-routine-rest]').onclick=()=>openRest(p);
 const host=content.querySelector('[data-routine-targets]');
 if(cardio)renderCardio(host,p);else renderSets(host,p,ex);
}
function renderSets(host,p,ex) {
 const timed=exerciseKind(ex,p)==='duration',targets=normalizeTargets(p,ex);syncTargets(p,targets);
 host.innerHTML=`<div class="routine-set-heading"><span>SET</span><span>${esc(massUnit(UNIT_KINDS.LIFTING_WEIGHT).toUpperCase())} <small>optional</small></span><button type="button" data-target-mode>${timed?'TIME (SEC)':targets.some(t=>/[-–]/.test(t.reps))?'REP RANGE ▾':'REPS ▾'}</button><span></span></div><div data-routine-set-rows>${targets.map((t,i)=>`<div class="routine-set-row"><span>${i+1}</span><input aria-label="Set ${i+1} target weight" data-target-weight="${i}" data-unit-input-ignore type="number" inputmode="decimal" min="0" step="any" placeholder="—" value="${t.weight==null?'':esc(displayMass(t.weight,2,UNIT_KINDS.LIFTING_WEIGHT))}"><input aria-label="Set ${i+1} target ${timed?'seconds':'reps'}" data-target-reps="${i}" type="text" inputmode="${timed?'numeric':'text'}" maxlength="30" value="${esc(t.reps)}"><button type="button" data-target-remove="${i}" aria-label="Remove set ${i+1}" ${targets.length===1?'disabled':''}>−</button></div>${t.dropSets.length?`<small class="routine-set-extra">${t.dropSets.length} drop ${t.dropSets.length===1?'set':'sets'} planned</small>`:''}`).join('')}</div><button class="routine-add-set" type="button">＋ Add set</button>`;
 host.querySelector('[data-target-mode]').onclick=()=>{if(!timed)openRepMode(p);};
 host.querySelectorAll('[data-target-weight]').forEach(input=>input.oninput=()=>{const t=p.setTargets[Number(input.dataset.targetWeight)];t.weight=input.value===''?null:canonicalMass(input.value,UNIT_KINDS.LIFTING_WEIGHT);});
 host.querySelectorAll('[data-target-reps]').forEach(input=>input.oninput=()=>{p.setTargets[Number(input.dataset.targetReps)].reps=timed&&!/sec|min|:/.test(input.value)?`${input.value} sec`:input.value;p.reps=p.setTargets[0].reps;});
 host.querySelectorAll('[data-target-remove]').forEach(b=>b.onclick=()=>{p.setTargets.splice(Number(b.dataset.targetRemove),1);p.sets=p.setTargets.length;update(true);});
 host.querySelector('.routine-add-set').onclick=()=>{if(p.setTargets.length>=20)return;p.setTargets.push({...p.setTargets.at(-1),dropSets:[]});p.sets=p.setTargets.length;update(true);};
}
function renderCardio(host,p) {
 p.cardioTarget ||= {};
 host.innerHTML=`<div class="routine-cardio-targets"><label>Time (minutes)<input data-cardio-time type="number" inputmode="decimal" min="0" max="1440" step="0.5" placeholder="20" value="${esc(p.cardioTarget.durationMinutes??'')}"></label><label>Distance (optional)<input data-cardio-distance type="text" maxlength="40" placeholder="5 km, 3 mi…" value="${esc(p.cardioTarget.distance||'')}"></label></div><details class="routine-cardio-details"><summary>Additional targets</summary><label>Effort (RPE)<input type="number" min="1" max="10" step="0.5" data-cardio-rpe value="${esc(p.cardioTarget.rpe??'')}" placeholder="1–10"></label><label>Speed / incline / resistance<input data-cardio-details type="text" maxlength="160" value="${esc(p.cardioTarget.details||'')}" placeholder="Optional equipment settings"></label></details>`;
 for(const [selector,key] of [['time','durationMinutes'],['distance','distance'],['rpe','rpe'],['details','details']])host.querySelector(`[data-cardio-${selector}]`).oninput=e=>{p.cardioTarget[key]=['time','rpe'].includes(selector)?e.target.value===''?null:Number(e.target.value):e.target.value;};
}
function sheet(title,html,onSave) {
 const previous=document.querySelector('.routine-sheet');if(previous){previous.close();previous.remove();}
 const dialog=document.createElement('dialog');dialog.className='routine-sheet';dialog.innerHTML=`<header><h3>${esc(title)}</h3><button type="button" aria-label="Close ${esc(title)}">×</button></header><div class="routine-sheet-body">${html}</div>${onSave?'<button type="button" class="primary-btn" data-sheet-save>Done</button>':''}`;
 document.body.append(dialog);dialog.querySelector('header button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 if(onSave)dialog.querySelector('[data-sheet-save]').onclick=()=>{if(onSave(dialog)!==false)dialog.close();};
 dialog.showModal();return dialog;
}
function openNote(p) {
 sheet('Routine note',`<label>Instructions for every workout<textarea maxlength="500" data-note placeholder="Technique, setup, cues…">${esc(p.notes||'')}</textarea></label><small>Session notes remain separate from these routine instructions.</small>`,d=>{p.notes=d.querySelector('[data-note]').value.trim();update(true);});
}
function openRest(p) {
 const setting=p.restSetting||effectiveRestSetting(p.id);
 const d=sheet('Rest timer',`<label class="routine-switch">Rest timer<input data-rest-enabled type="checkbox" ${setting.enabled?'checked':''}></label><label>Rest period<select data-rest-period>${restOptions(setting.seconds)}</select></label><small>Uses the same timer and intervals as your workout.</small>`,d=>{p.restSetting={enabled:d.querySelector('[data-rest-enabled]').checked,seconds:Number(d.querySelector('[data-rest-period]').value)};update(true);});
 d.querySelector('[data-rest-period]').disabled=!setting.enabled;d.querySelector('[data-rest-enabled]').onchange=e=>d.querySelector('[data-rest-period]').disabled=!e.target.checked;
}
function openRepMode(p) {
 sheet('Repetition targets','<label>Target format<select data-mode><option value="reps">Reps</option><option value="range">Rep range</option></select></label>',d=>{const range=d.querySelector('select').value==='range';p.setTargets.forEach(t=>{const number=String(t.reps).match(/\d+/)?.[0]||'8';t.reps=range?`${number}-${Number(number)+2}`:number;});p.reps=p.setTargets[0].reps;update(true);});
}
function openMachine(p) {
 const profiles=getEquipmentProfiles(p.id);
 sheet('Machine',`<label>Saved machine<select data-machine>${profiles.map(x=>`<option value="${esc(x.id)}" ${x.id===p.equipmentProfileId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>Or add a machine<input data-new-machine maxlength="80" placeholder="Gym / machine name"></label>`,d=>{const name=d.querySelector('[data-new-machine]').value.trim();const profile=name?addEquipmentProfile(p.id,name):profiles.find(x=>x.id===d.querySelector('select').value);if(profile){p.equipmentProfileId=profile.id;p.equipmentProfileName=profile.name;}update(true);});
}
function openOptions(di,ei) {
 const p=context.plan.days[di].exercises[ei],ex=definition(p),kind=exerciseKind(ex,p);
 const actions=[['swap','Swap exercise'],['reorder','Reorder exercises'],...(kind!=='cardio'?[['superset','Add to superset'],['circuit','Add to circuit'],...(p.supersetGroup?[['ungroup','Remove grouping']]:[]),['warmups','Warm-up sets'],['drops','Drop sets']]:[]),...(supportsEquipmentProfiles(ex)?[['machine','Machine']]:[]),['rest','Rest timer'],['note','Routine note'],['guide','Form Guide'],['remove','Remove exercise']];
 const d=sheet(ex.name,actions.map(([key,label])=>`<button type="button" class="routine-action ${key==='remove'?'is-danger':''}" data-action="${key}">${label}<span>›</span></button>`).join(''));
 d.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{d.close();switch(b.dataset.action){
 case 'swap': {const row=cards()[di].querySelectorAll('.exercise-builder-row')[ei];row.querySelector('[data-manual-replace]')?.click();break;}
 case 'reorder':openReorder(di);break;
 case 'superset':case 'circuit':openGrouping(di,ei,b.dataset.action);break;
 case 'ungroup':ungroupExercise(context.plan.days[di],ei);update(true);break;
 case 'warmups':openWarmups(p);break;
 case 'drops':openDrops(p);break;

 case 'machine':openMachine(p);break;
 case 'rest':openRest(p);break;
 case 'note':openNote(p);break;
 case 'guide':cards()[di].querySelectorAll('.exercise-builder-row')[ei].querySelector('.manual-pick-guide')?.click();break;
 case 'remove':context.remove(di,ei);break;
 }});
}
function openGrouping(di,ei,type) {
 const day=context.plan.days[di],eligible=day.exercises.map((p,i)=>({p,i})).filter(x=>x.i!==ei&&exerciseKind(definition(x.p),x.p)!=='cardio');
 if(!eligible.length){sheet('Add another exercise','<p>Add another strength exercise before grouping.</p>');return;}
 const d=sheet(type==='circuit'?'Create circuit':'Create superset',`<p>${type==='circuit'?'Choose the exercises in this circuit.':'Choose a partner exercise.'} ${type==='circuit'?'Group every exercise in a single-day routine to use the template-style circuit logger. Rest occurs between rounds.':'Rest follows the final exercise.'}</p>${eligible.map(({p,i})=>`<label class="routine-choice"><input type="${type==='circuit'?'checkbox':'radio'}" name="partner" value="${i}">${esc(definition(p)?.name)}</label>`).join('')}<p data-group-error role="alert"></p>`,dialog=>{const indices=[ei,...[...dialog.querySelectorAll('input:checked')].map(x=>Number(x.value))].sort((a,b)=>a-b);if(indices.length<2){dialog.querySelector('[data-group-error]').textContent='Choose at least one other exercise.';return false;}groupRoutineExercises(day,indices,type);update(true);});
}
function openReorder(di) {
 const day=context.plan.days[di];
 const d=sheet('Reorder exercises','<p>Drag a handle, or use the arrows. Groups move together.</p><label class="routine-choice"><input type="checkbox" data-within> Reorder within a group</label><div data-order-list></div>');
 let dragIndex=null;
 const render=()=>{const host=d.querySelector('[data-order-list]');host.innerHTML=day.exercises.map((p,i)=>`<div class="routine-order-row" data-order="${i}"><span>${i+1}</span><strong>${esc(definition(p)?.name)}${p.supersetGroup?`<small>${p.groupType==='circuit'?'Circuit':'Superset'}</small>`:''}</strong><button type="button" data-up="${i}" aria-label="Move ${esc(definition(p)?.name)} up" ${i===0?'disabled':''}>↑</button><button type="button" data-down="${i}" aria-label="Move ${esc(definition(p)?.name)} down" ${i===day.exercises.length-1?'disabled':''}>↓</button><span class="routine-drag" tabindex="0" role="button" aria-label="Drag ${esc(definition(p)?.name)}">☰</span></div>`).join('');
 const move=(a,b)=>{if(moveRoutineExercise(day,a,b,d.querySelector('[data-within]').checked)){update(true);render();}};
 host.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{let i=Number(b.dataset.up),to=i-1;if(!d.querySelector('[data-within]').checked)while(to>=0&&day.exercises[to].supersetGroup&&day.exercises[to].supersetGroup===day.exercises[i].supersetGroup)to--;move(i,to);});
 host.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>{let i=Number(b.dataset.down),to=i+1;if(!d.querySelector('[data-within]').checked)while(to<day.exercises.length&&day.exercises[to].supersetGroup&&day.exercises[to].supersetGroup===day.exercises[i].supersetGroup)to++;move(i,to);});
 host.querySelectorAll('.routine-drag').forEach(grip=>{
 grip.onpointerdown=e=>{dragIndex=Number(grip.closest('[data-order]').dataset.order);grip.setPointerCapture(e.pointerId);grip.closest('[data-order]').classList.add('is-dragging');};
 grip.onpointerup=e=>{if(dragIndex==null)return;grip.releasePointerCapture(e.pointerId);const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-order]');if(target)move(dragIndex,Number(target.dataset.order));dragIndex=null;host.querySelectorAll('.is-dragging').forEach(x=>x.classList.remove('is-dragging'));};
 grip.onpointermove=e=>{if(dragIndex!=null){e.preventDefault();if(e.clientY>d.getBoundingClientRect().bottom-90)d.scrollTop+=12;else if(e.clientY<d.getBoundingClientRect().top+90)d.scrollTop-=12;}};
 grip.onpointercancel=()=>{dragIndex=null;host.querySelectorAll('.is-dragging').forEach(x=>x.classList.remove('is-dragging'));};
 });};render();
}
function openWarmups(p) {
 const targets=structuredClone(p.warmupTargets||[]);
 const d=sheet('Warm-up sets','<p>Optional preparation, separate from working sets.</p><div data-warmups></div><button type="button" data-add-warmup>＋ Add warm-up</button>',()=>{p.warmupTargets=targets;update(true);});
 const render=()=>{d.querySelector('[data-warmups]').innerHTML=targets.map((t,i)=>`<div class="routine-set-row"><span>W${i+1}</span><input data-warm-weight="${i}" data-unit-input-ignore aria-label="Warm-up ${i+1} weight (${esc(massUnit(UNIT_KINDS.LIFTING_WEIGHT))})" type="number" inputmode="decimal" min="0" step="any" placeholder="${esc(massUnit(UNIT_KINDS.LIFTING_WEIGHT))}" value="${t.weight==null?'':esc(displayMass(t.weight,2,UNIT_KINDS.LIFTING_WEIGHT))}"><input data-warm-reps="${i}" aria-label="Warm-up ${i+1} reps" type="number" inputmode="numeric" min="1" placeholder="Reps" value="${esc(t.reps||'')}"><button type="button" data-warm-remove="${i}" aria-label="Remove warm-up ${i+1}">−</button></div>`).join('');
 d.querySelectorAll('[data-warm-weight]').forEach(input=>input.oninput=()=>targets[Number(input.dataset.warmWeight)].weight=input.value===''?null:canonicalMass(input.value,UNIT_KINDS.LIFTING_WEIGHT));d.querySelectorAll('[data-warm-reps]').forEach(input=>input.oninput=()=>targets[Number(input.dataset.warmReps)].reps=input.value);d.querySelectorAll('[data-warm-remove]').forEach(b=>b.onclick=()=>{targets.splice(Number(b.dataset.warmRemove),1);render();});};
 d.querySelector('[data-add-warmup]').onclick=()=>{if(targets.length<5){targets.push({weight:null,reps:5});render();}};render();
}
function openDrops(p) {
 const d=sheet('Drop sets',`<p>Plan drops after a working set. Targets stay separate from logged results.</p><label>After set<select data-after-set>${p.setTargets.map((t,i)=>`<option value="${i}">Set ${i+1}</option>`).join('')}</select></label><div data-drops></div><button type="button" data-add-drop>＋ Add drop set</button>`,()=>{update(true);});
 const draft=structuredClone(p.setTargets.map(t=>t.dropSets||[]));
 const render=()=>{const index=Number(d.querySelector('[data-after-set]').value);d.querySelector('[data-drops]').innerHTML=draft[index].map((t,i)=>`<div class="routine-set-row"><span>D${i+1}</span><input data-drop-weight="${i}" data-unit-input-ignore aria-label="Drop ${i+1} target weight" type="number" inputmode="decimal" min="0" step="any" value="${t.weight==null?'':esc(displayMass(t.weight,2,UNIT_KINDS.LIFTING_WEIGHT))}" placeholder="${esc(massUnit(UNIT_KINDS.LIFTING_WEIGHT))}"><input data-drop-reps="${i}" aria-label="Drop ${i+1} reps" value="${esc(t.reps||'')}" placeholder="Reps"><button type="button" data-drop-remove="${i}" aria-label="Remove drop ${i+1}">−</button></div>`).join('');
 d.querySelectorAll('[data-drop-weight]').forEach(input=>input.oninput=()=>draft[index][Number(input.dataset.dropWeight)].weight=input.value===''?null:canonicalMass(input.value,UNIT_KINDS.LIFTING_WEIGHT));d.querySelectorAll('[data-drop-reps]').forEach(input=>input.oninput=()=>draft[index][Number(input.dataset.dropReps)].reps=input.value);d.querySelectorAll('[data-drop-remove]').forEach(b=>b.onclick=()=>{draft[index].splice(Number(b.dataset.dropRemove),1);render();});};
 d.querySelector('[data-after-set]').onchange=render;d.querySelector('[data-add-drop]').onclick=()=>{const i=Number(d.querySelector('[data-after-set]').value);if(draft[i].length<5){draft[i].push({weight:null,reps:''});render();}};
 d.querySelector('[data-sheet-save]').onclick=()=>{p.setTargets.forEach((t,i)=>t.dropSets=draft[i]);update(true);d.close();};render();
}
document.addEventListener('levelup:plan-builder-opened',()=>{selectedDay=0;if(context)initializeRoutineEditor(context);});
document.addEventListener('levelup:routine-day-selected',e=>{selectedDay=Number(e.detail.dayIndex)||0;if(context)initializeRoutineEditor(context);});
