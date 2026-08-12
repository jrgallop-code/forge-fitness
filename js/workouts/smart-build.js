import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const MUSCLES = ["Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves"];
const GOALS = {
  muscle:{label:"Build Muscle",copy:"Optimize weekly hypertrophy volume and distribute it across the week."},
  strength:{label:"Build Strength",copy:"Prioritize compound practice, lower rep ranges and manageable accessory volume."},
  hybrid:{label:"Strength + Muscle",copy:"Blend strength-focused compounds with enough volume for hypertrophy."},
  maintain:{label:"Maintain",copy:"Use the minimum effective dose needed to maintain muscle and strength."}
};
const SPLITS = {
  2:[{name:"Full Body A",muscles:MUSCLES},{name:"Full Body B",muscles:MUSCLES}],
  3:[{name:"Upper",muscles:["Chest","Back","Shoulders","Biceps","Triceps"]},{name:"Lower",muscles:["Quads","Hamstrings","Glutes","Calves"]},{name:"Full Body",muscles:MUSCLES}],
  4:[{name:"Upper A",muscles:["Chest","Back","Shoulders","Biceps","Triceps"]},{name:"Lower A",muscles:["Quads","Hamstrings","Glutes","Calves"]},{name:"Upper B",muscles:["Chest","Back","Shoulders","Biceps","Triceps"]},{name:"Lower B",muscles:["Quads","Hamstrings","Glutes","Calves"]}],
  5:[{name:"Push",muscles:["Chest","Shoulders","Triceps"]},{name:"Pull",muscles:["Back","Biceps"]},{name:"Legs",muscles:["Quads","Hamstrings","Glutes","Calves"]},{name:"Upper",muscles:["Chest","Back","Shoulders","Biceps","Triceps"]},{name:"Lower",muscles:["Quads","Hamstrings","Glutes","Calves"]}],
  6:[{name:"Push A",muscles:["Chest","Shoulders","Triceps"]},{name:"Pull A",muscles:["Back","Biceps"]},{name:"Legs A",muscles:["Quads","Hamstrings","Glutes","Calves"]},{name:"Push B",muscles:["Chest","Shoulders","Triceps"]},{name:"Pull B",muscles:["Back","Biceps"]},{name:"Legs B",muscles:["Quads","Hamstrings","Glutes","Calves"]}]
};
const NEVER_SUPERSET=[/\bsquat\b/i,/\bdeadlift\b/i,/\brdl\b/i,/\bleg press\b/i,/\bhack squat\b/i,/\bbarbell row\b/i,/\bpendlay row\b/i,/\bbench press\b/i,/\boverhead press\b/i,/\bmilitary press\b/i];
const INTERFERENCE=new Set(["Chest|Triceps","Chest|Shoulders","Back|Biceps","Shoulders|Triceps","Quads|Glutes","Hamstrings|Glutes","Quads|Hamstrings"].flatMap(x=>[x,x.split("|").reverse().join("|")]));
const state=freshState();

export function initializeSmartBuild(root=document){
  const home=root.querySelector?.("[data-workout-home]"); if(!home)return;
  home.querySelector("[data-smart-build-launcher]")?.remove(); root.querySelector("[data-smart-build-wizard]")?.remove();
  home.insertAdjacentHTML("afterbegin",renderLauncher()); home.insertAdjacentHTML("afterend",renderWizardShell());
  if(root.dataset.smartBuildCleanBound!=="true"){
    root.dataset.smartBuildCleanBound="true";
    root.addEventListener("click",e=>handleClick(root,e)); root.addEventListener("change",e=>handleChange(root,e)); root.addEventListener("input",e=>handleInput(root,e));
  }
}
function freshState(){return{step:0,goal:"muscle",days:4,duration:60,priorities:[],experience:"intermediate",equipment:["Full Gym"],preferredIds:[],excludedIds:[],supersets:true,variation:0,generated:null};}
function resetState(){Object.assign(state,freshState());}
function handleClick(root,event){
  const button=event.target.closest?.("button"); if(!button||!root.contains(button))return;
  if(button.matches("[data-manual-build]")){root.querySelector("#new-plan-btn")?.click();return;}
  if(button.matches("[data-template-build]")){const d=root.querySelector(".workout-catalogue-details");if(d){d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"});}return;}
  if(button.matches("[data-smart-build]")){resetState();openWizard(root);return;}
  if(button.matches("[data-smart-close]")){closeWizard(root);return;}
  if(button.matches("[data-smart-back]")){state.step=Math.max(0,state.step-1);renderStep(root);return;}
  if(button.matches("[data-smart-next]")){if(state.step===4){state.generated=generateProgram();state.step=5;}else state.step+=1;renderStep(root);return;}
  if(button.dataset.goal)state.goal=button.dataset.goal;
  else if(button.dataset.days)state.days=Number(button.dataset.days);
  else if(button.dataset.duration)state.duration=Number(button.dataset.duration);
  else if(button.dataset.experience)state.experience=button.dataset.experience;
  else if(button.dataset.priority)togglePriority(button.dataset.priority);
  else if(button.dataset.equipment)toggleEquipment(button.dataset.equipment);
  else if(button.dataset.preferId)chooseExercise(button.dataset.preferId,"prefer");
  else if(button.dataset.excludeId)chooseExercise(button.dataset.excludeId,"exclude");
  else if(button.dataset.removePreferred)state.preferredIds=state.preferredIds.filter(id=>id!==button.dataset.removePreferred);
  else if(button.dataset.removeExcluded)state.excludedIds=state.excludedIds.filter(id=>id!==button.dataset.removeExcluded);
  else if(button.matches("[data-preferred-toggle]")){const p=root.querySelector("[data-preferred-panel]");if(p){p.hidden=!p.hidden;if(!p.hidden)renderExerciseResults(root,root.querySelector("[data-preferred-search]")?.value||"","prefer");}return;}
  else if(button.matches("[data-avoid-toggle]")){const p=root.querySelector("[data-avoid-panel]");if(p){p.hidden=!p.hidden;if(!p.hidden)renderExerciseResults(root,root.querySelector("[data-avoid-search]")?.value||"","avoid");}return;}
  else if(button.matches("[data-smart-regenerate]")){state.variation+=1;state.generated=generateProgram();}
  else if(button.matches("[data-smart-edit]"))state.step=0;
  else if(button.matches("[data-smart-save]")){saveGeneratedPlan(root);return;}
  else if(button.dataset.adjustSet)adjustSets(Number(button.dataset.dayIndex),Number(button.dataset.exerciseIndex),Number(button.dataset.adjustSet));
  else if(button.matches("[data-replace-exercise]"))replaceExercise(Number(button.dataset.dayIndex),Number(button.dataset.exerciseIndex));
  else return;
  renderStep(root);
}
function handleChange(root,event){if(event.target.matches?.("[data-supersets]"))state.supersets=event.target.checked;}
function handleInput(root,event){
  if(event.target.matches?.("[data-preferred-search]"))renderExerciseResults(root,event.target.value,"prefer");
  if(event.target.matches?.("[data-avoid-search]"))renderExerciseResults(root,event.target.value,"avoid");
}
function renderLauncher(){return `<section class="smart-build-launcher" data-smart-build-launcher><div class="smart-build-launcher-head"><span class="eyebrow">BUILD A PROGRAM</span><p>Choose how you want to create your training plan.</p></div><div class="smart-build-choice-grid"><button class="smart-build-choice" type="button" data-manual-build><span class="smart-build-choice-title">Manual Build</span><small>Build it yourself</small></button><button class="smart-build-choice" type="button" data-template-build><span class="smart-build-choice-title">Templates</span><small>Start from a proven split</small></button><button class="smart-build-choice smart-build-choice-primary" type="button" data-smart-build><span class="smart-build-badge">GUIDED</span><span class="smart-build-choice-title">Smart Build</span><small>Goal-driven personalized programming</small></button></div></section>`;}
function renderWizardShell(){return `<section class="smart-build-wizard" data-smart-build-wizard hidden><div class="smart-build-topbar"><div><span class="eyebrow">SMART BUILD</span><h3 data-smart-heading>Program Builder</h3></div><button class="secondary-btn smart-build-close" type="button" data-smart-close>Close</button></div><div class="smart-build-progress"><span data-smart-progress></span></div><div data-smart-step></div></section>`;}
function openWizard(root){root.querySelector("[data-workout-home]")?.setAttribute("hidden","");const w=root.querySelector("[data-smart-build-wizard]");if(!w)return;w.hidden=false;renderStep(root);w.scrollIntoView({behavior:"smooth",block:"start"});}
function closeWizard(root){const w=root.querySelector("[data-smart-build-wizard]"),h=root.querySelector("[data-workout-home]");if(w)w.hidden=true;if(h)h.hidden=false;}
function renderStep(root){const host=root.querySelector("[data-smart-step]"),progress=root.querySelector("[data-smart-progress]"),heading=root.querySelector("[data-smart-heading]");if(!host||!progress)return;const steps=[renderGoalStep,renderScheduleStep,renderPriorityExperienceStep,renderEquipmentStep,renderProgrammingStep,renderResultStep];progress.style.width=`${((state.step+1)/steps.length)*100}%`;if(heading)heading.textContent=`${GOALS[state.goal].label} Program`;host.innerHTML=steps[state.step]();}
function renderGoalStep(){return questionCard("1","Primary goal","What should this program optimize for?",Object.entries(GOALS).map(([v,g])=>`<button class="smart-option ${state.goal===v?"selected":""}" type="button" data-goal="${v}"><strong>${g.label}</strong><small>${g.copy}</small></button>`).join(""),false);}
function renderScheduleStep(){return questionCard("2","Schedule","Choose your weekly frequency and typical session length.",`<strong class="smart-field-label">Days per week</strong>${chipRow([2,3,4,5,6],state.days,"days")}<strong class="smart-field-label">Session length</strong>${chipRow([30,45,60,75,90],state.duration,"duration",v=>v===90?"90+ min":`${v} min`)}`);}
function renderPriorityExperienceStep(){const exp=[["beginner","Beginner — ~0–1 year","Still developing technique and consistent progression."],["intermediate","Intermediate — ~1–3 years","Solid technique and comfortable with progressive overload."],["advanced","Advanced — ~3+ years","Highly experienced; progress requires more precise programming."]];return questionCard("3","Priorities & experience","Choose up to 3 muscles to emphasize. Priority muscles receive a larger weekly set target.",`<div class="smart-chip-grid">${MUSCLES.map(m=>`<button type="button" class="smart-chip ${state.priorities.includes(m)?"selected":""}" data-priority="${m}">${m}</button>`).join("")}</div><p class="smart-helper">${state.priorities.length}/3 selected</p><div class="smart-option-stack">${exp.map(([v,l,c])=>`<button class="smart-option ${state.experience===v?"selected":""}" type="button" data-experience="${v}"><strong>${l}</strong><small>${c}</small></button>`).join("")}</div><p class="smart-helper">Years are only a guide. Not sure? Choose Intermediate.</p>`);}
function renderEquipmentStep(){
  const presets=["Full Gym","Barbell","Dumbbells","Machines & Cables","Bodyweight"];
  return questionCard("4","Choose your equipment","Select everything you have access to. Full Gym includes all equipment types.",`<strong class="smart-field-label">Available equipment</strong><div class="smart-chip-grid">${presets.map(x=>`<button type="button" class="smart-chip ${state.equipment.includes(x)?"selected":""}" data-equipment="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}</div><p class="smart-helper">Selected: ${state.equipment.join(", ")}</p><div class="smart-picker-block"><button class="smart-picker-toggle" type="button" data-preferred-toggle>Preferred exercises ▾</button><div class="smart-picker-panel" data-preferred-panel hidden><input type="search" data-preferred-search placeholder="Search exercises to prefer"><div class="smart-search-results" data-preferred-results></div></div></div><div class="smart-selected-list">${renderSelectedExercises(state.preferredIds,"preferred")}</div><div class="smart-picker-block"><button class="smart-picker-toggle" type="button" data-avoid-toggle>Avoid / discomfort ▾</button><div class="smart-picker-panel" data-avoid-panel hidden><input type="search" data-avoid-search placeholder="Search exercises to avoid"><div class="smart-search-results" data-avoid-results></div></div></div><div class="smart-selected-list">${renderSelectedExercises(state.excludedIds,"excluded")}</div>`);
}
function renderProgrammingStep(){const t=getVolumeTargets(),range=sessionExerciseRange();return questionCard("5","Programming approach","Weekly volume is the priority. Smart Build distributes it across your available days while keeping sessions practical.",`<div class="smart-volume-summary">${MUSCLES.map(m=>`<div><span>${m}${state.priorities.includes(m)?" ★":""}</span><strong>${t[m]} sets/wk</strong></div>`).join("")}</div><p class="smart-helper">For ${state.duration===90?"90+":state.duration}-minute sessions, Smart Build generally aims for ${range.min}–${range.max} exercises. Extra weekly volume is distributed across days or added to existing movements before adding unnecessary exercises.</p><label class="smart-superset-toggle"><input type="checkbox" data-supersets ${state.supersets?"checked":""}><span><strong>Allow time-saving supersets</strong><small>Accessory-focused. High-fatigue compounds stay standalone.</small></span></label><p class="smart-helper">Volume targets remain the programming priority. Exercise count is a practical session constraint, not the goal.</p>`,true,"Build Program");}
function renderResultStep(){if(!state.generated)return `<p class="smart-helper">Program could not be generated.</p>`;const t=getVolumeTargets(),a=calculateWeeklySets(state.generated);return `<div class="smart-question-card"><div class="smart-question-number">✓</div><h4>${escapeHtml(GOALS[state.goal].label)} — ${state.days} days</h4><p>${escapeHtml(state.generated.summary)}</p><div class="smart-volume-summary">${MUSCLES.map(m=>`<div><span>${m}${state.priorities.includes(m)?" ★":""}</span><strong>${a[m]||0}/${t[m]} sets</strong></div>`).join("")}</div><div class="smart-review-grid">${state.generated.days.map((d,di)=>`<article class="smart-review-day"><h5>${escapeHtml(d.name)}</h5>${d.exercises.map((x,ei)=>renderExerciseRow(x,di,ei)).join("")}</article>`).join("")}</div><div class="smart-question-actions smart-result-actions"><button class="secondary-btn" type="button" data-smart-edit>Edit Inputs</button><button class="secondary-btn" type="button" data-smart-regenerate>Regenerate</button><button class="primary-btn" type="button" data-smart-save>Save Plan</button></div></div>`;}
function renderExerciseRow(item,di,ei){const def=exerciseMap().get(item.id),ss=item.supersetGroup?`<em>Superset ${item.supersetGroup}</em>`:"";return `<div class="smart-review-exercise ${item.supersetGroup?"is-superset":""}"><div><strong>${escapeHtml(def?.name||item.name||item.id)}</strong><small>${item.sets} × ${escapeHtml(item.reps)} · ${escapeHtml(def?.muscleGroup||"")}</small>${ss}</div><div class="smart-review-controls"><button type="button" data-adjust-set="-1" data-day-index="${di}" data-exercise-index="${ei}" aria-label="Remove set">−</button><button type="button" data-adjust-set="1" data-day-index="${di}" data-exercise-index="${ei}" aria-label="Add set">+</button><button type="button" data-replace-exercise data-day-index="${di}" data-exercise-index="${ei}">Replace</button></div></div>`;}
function questionCard(n,t,c,b,back=true,next="Continue"){return `<div class="smart-question-card"><div class="smart-question-number">${n}</div><h4>${t}</h4><p>${c}</p><div class="smart-question-body">${b}</div><div class="smart-question-actions">${back?'<button class="secondary-btn" type="button" data-smart-back>Back</button>':'<span></span>'}<button class="primary-btn" type="button" data-smart-next>${next}</button></div></div>`;}
function chipRow(values,selected,key,labeler=String){return `<div class="smart-chip-grid">${values.map(v=>`<button type="button" class="smart-chip ${selected===v?"selected":""}" data-${key}="${v}">${labeler(v)}</button>`).join("")}</div>`;}
function togglePriority(m){if(state.priorities.includes(m))state.priorities=state.priorities.filter(x=>x!==m);else if(state.priorities.length<3)state.priorities.push(m);}
function toggleEquipment(v){if(v==="Full Gym"){state.equipment=["Full Gym"];return;}state.equipment=state.equipment.filter(x=>x!=="Full Gym");state.equipment=state.equipment.includes(v)?state.equipment.filter(x=>x!==v):[...state.equipment,v];if(!state.equipment.length)state.equipment=["Full Gym"];}
function chooseExercise(id,mode){if(mode==="prefer"){state.excludedIds=state.excludedIds.filter(x=>x!==id);if(!state.preferredIds.includes(id))state.preferredIds.push(id);}else{state.preferredIds=state.preferredIds.filter(x=>x!==id);if(!state.excludedIds.includes(id))state.excludedIds.push(id);}}
function renderExerciseResults(root,q,mode){const host=root.querySelector(mode==="prefer"?"[data-preferred-results]":"[data-avoid-results]");if(!host)return;const term=String(q||"").trim().toLowerCase();const results=getAllExercises().filter(e=>e.trackingType!=="notes").filter(e=>!term||[e.name,e.muscleGroup,e.equipment].some(v=>String(v||"").toLowerCase().includes(term))).sort((a,b)=>String(a.muscleGroup).localeCompare(String(b.muscleGroup))||String(a.name).localeCompare(String(b.name))).slice(0,40);host.innerHTML=results.length?results.map(e=>`<div class="smart-search-row"><div><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.muscleGroup)} · ${escapeHtml(e.equipment)}</small></div><button type="button" ${mode==="prefer"?`data-prefer-id="${escapeHtml(e.id)}"`:`data-exclude-id="${escapeHtml(e.id)}"`}>${mode==="prefer"?"Prefer":"Avoid"}</button></div>`).join(""):`<p class="smart-helper">No matching exercises.</p>`;}
function renderSelectedExercises(ids,type){const map=exerciseMap();return ids.length?ids.map(id=>`<button type="button" class="smart-selected-chip" data-remove-${type}="${escapeHtml(id)}">${escapeHtml(map.get(id)?.name||id)} ×</button>`).join(""):`<small>None selected</small>`;}
function getVolumeTargets(){const exp={beginner:0,intermediate:1,advanced:2}[state.experience]??1,base={muscle:[8,10,12],strength:[5,6,7],hybrid:[7,9,10],maintain:[4,5,6]}[state.goal][exp],boost={muscle:[3,4,4],strength:[2,2,3],hybrid:[3,3,4],maintain:[1,1,2]}[state.goal][exp];return Object.fromEntries(MUSCLES.map(m=>[m,Math.min(18,base+(state.priorities.includes(m)?boost:0))]));}
function sessionExerciseRange(){if(state.duration<=30)return{min:3,max:5};if(state.duration<=45)return{min:4,max:6};if(state.duration<=60)return{min:5,max:7};return{min:6,max:8};}
function sessionHardCap(){return Math.min(10,sessionExerciseRange().max+1);}
function maxDirectSetsPerMuscleSession(){return 8;}

function generateProgram(){
  const targets=getVolumeTargets(),days=SPLITS[state.days].map(d=>({name:d.name,muscles:[...d.muscles],exercises:[]})),preferred=new Set(state.preferredIds),usedByMuscle=new Map(MUSCLES.map(m=>[m,[]]));
  const order=[...MUSCLES].sort((a,b)=>Number(state.priorities.includes(b))-Number(state.priorities.includes(a))||targets[b]-targets[a]);
  order.forEach(muscle=>{
    const eligible=days.map((d,i)=>d.muscles.includes(muscle)?i:-1).filter(i=>i>=0);if(!eligible.length)return;
    let remaining=targets[muscle],cursor=state.variation%eligible.length,safety=0;
    while(remaining>0&&safety++<30){
      const ranked=[...eligible].sort((a,b)=>dayMuscleSets(days[a],muscle)-dayMuscleSets(days[b],muscle)||days[a].exercises.length-days[b].exercises.length);
      const dayIndex=ranked[cursor%ranked.length],day=days[dayIndex],muscleSets=dayMuscleSets(day,muscle);
      if(muscleSets>=maxDirectSetsPerMuscleSession()){cursor+=1;if(eligible.every(i=>dayMuscleSets(days[i],muscle)>=maxDirectSetsPerMuscleSession()))break;continue;}
      const existingForMuscle=day.exercises.filter(x=>x.muscleGroup===muscle).sort((a,b)=>a.sets-b.sets)[0];
      if(existingForMuscle&&existingForMuscle.sets<4){const add=Math.min(4-existingForMuscle.sets,maxDirectSetsPerMuscleSession()-muscleSets,remaining);existingForMuscle.sets+=add;remaining-=add;cursor+=1;continue;}
      const normalCap=sessionExerciseRange().max,hardCap=sessionHardCap();
      const canAdd=day.exercises.length<normalCap||(state.priorities.includes(muscle)&&day.exercises.length<hardCap);
      if(!canAdd){cursor+=1;if(eligible.every(i=>days[i].exercises.length>=normalCap))break;continue;}
      const def=chooseExerciseForMuscle(muscle,usedByMuscle.get(muscle),preferred,dayIndex);if(!def)break;
      const room=maxDirectSetsPerMuscleSession()-muscleSets;
      const chunk=Math.min(3,remaining,room);
      if(chunk<2){
        const receiver=day.exercises.find(x=>x.muscleGroup===muscle&&x.sets<6);
        if(receiver){receiver.sets=Math.min(6,receiver.sets+chunk);remaining-=chunk;}
        break;
      }
      day.exercises.push({id:def.id,name:def.name,sets:chunk,reps:repRangeFor(def),muscleGroup:muscle});usedByMuscle.get(muscle).push(def.id);remaining-=chunk;cursor+=1;
    }
  });
  days.forEach(day=>{consolidateSession(day);day.exercises=sortExercises(day.exercises);fitSessionTime(day);});
  validateGeneratedProgram(days,preferred);
  days.forEach(day=>{day.exercises=sortExercises(day.exercises);if(state.supersets)assignSupersets(day);});
  return{days,summary:buildSummary(days)};
}
function dayMuscleSets(day,muscle){return day.exercises.filter(x=>x.muscleGroup===muscle).reduce((s,x)=>s+(Number(x.sets)||0),0);}
function consolidateSession(day){
  const max=sessionExerciseRange().max;
  while(day.exercises.length>max){
    const candidates=day.exercises.map((x,i)=>({x,i})).filter(({x})=>!state.priorities.includes(x.muscleGroup)).sort((a,b)=>a.x.sets-b.x.sets);
    const remove=candidates[0];if(!remove)break;
    const same=day.exercises.find((x,i)=>i!==remove.i&&x.muscleGroup===remove.x.muscleGroup&&x.sets<6);
    if(same){same.sets=Math.min(6,same.sets+remove.x.sets);day.exercises.splice(remove.i,1);}else break;
  }
}
function validateGeneratedProgram(days,preferred){
  days.forEach((day,dayIndex)=>{
    day.exercises.forEach(item=>{item.sets=Math.max(2,Number(item.sets)||2);});
    if(/full body/i.test(day.name)){
      ensureDayCategory(day,["Chest","Shoulders"],preferred,dayIndex);
      ensureDayCategory(day,["Back"],preferred,dayIndex);
      ensureDayCategory(day,["Quads","Hamstrings","Glutes"],preferred,dayIndex);
    }else if(/^upper/i.test(day.name)){
      ensureDayCategory(day,["Chest","Shoulders"],preferred,dayIndex);
      ensureDayCategory(day,["Back"],preferred,dayIndex);
    }else if(/^(lower|legs)/i.test(day.name)){
      ensureDayCategory(day,["Quads","Glutes"],preferred,dayIndex);
      ensureDayCategory(day,["Hamstrings","Glutes"],preferred,dayIndex);
    }
  });
}
function ensureDayCategory(day,muscles,preferred,dayIndex){
  if(day.exercises.some(x=>muscles.includes(x.muscleGroup)))return;
  const candidates=muscles.map(m=>chooseExerciseForMuscle(m,day.exercises.map(x=>x.id),preferred,dayIndex)).filter(Boolean);
  const def=candidates[0];if(!def)return;
  const newItem={id:def.id,name:def.name,sets:def.type==="compound"?3:2,reps:repRangeFor(def),muscleGroup:def.muscleGroup};
  if(day.exercises.length<sessionHardCap()){day.exercises.push(newItem);return;}
  const counts=day.exercises.reduce((map,x)=>(map[x.muscleGroup]=(map[x.muscleGroup]||0)+1,map),{});
  const replaceIndex=day.exercises.findIndex(x=>!state.priorities.includes(x.muscleGroup)&&(counts[x.muscleGroup]||0)>1&&!belongsToProtectedCompound(exerciseMap().get(x.id)));
  if(replaceIndex>=0)day.exercises.splice(replaceIndex,1,newItem);
}
function chooseExerciseForMuscle(muscle,used,preferred,dayIndex){const pool=availableExercises().filter(e=>e.muscleGroup===muscle);if(!pool.length)return null;return pool.map(e=>{let score=0;if(preferred.has(e.id))score+=100;if(!used.includes(e.id))score+=20;if(state.goal==="strength"&&e.type==="compound")score+=12;if(state.goal==="muscle"&&e.type==="isolation")score+=2;score+=deterministicNoise(e.id,dayIndex+state.variation);return{e,score};}).sort((a,b)=>b.score-a.score)[0]?.e||null;}
function availableExercises(){const excluded=new Set(state.excludedIds);return getAllExercises().filter(e=>e.trackingType!=="notes"&&MUSCLES.includes(e.muscleGroup)&&!excluded.has(e.id)&&equipmentAllowed(e));}
function equipmentAllowed(exercise){if(state.equipment.includes("Full Gym"))return true;const eq=String(exercise.equipment||"").toLowerCase(),selected=state.equipment.map(x=>x.toLowerCase());return selected.some(x=>{if(x==="dumbbells")return eq.includes("dumbbell");if(x==="machines & cables")return eq.includes("machine")||eq.includes("cable");if(x==="bodyweight")return eq.includes("bodyweight")||eq.includes("body weight");return eq===x||eq.includes(x.replace(/s$/,""));});}
function repRangeFor(def){if(state.goal==="strength"&&def.type==="compound")return"4-8";if(state.goal==="hybrid"&&def.type==="compound")return"5-10";return def.recommendedReps||(def.type==="compound"?"6-12":"10-15");}
function sortExercises(items){return[...items].sort((a,b)=>Number(belongsToProtectedCompound(exerciseMap().get(b.id)))-Number(belongsToProtectedCompound(exerciseMap().get(a.id)))||Number(exerciseMap().get(b.id)?.type==="compound")-Number(exerciseMap().get(a.id)?.type==="compound")||Number(state.priorities.includes(b.muscleGroup))-Number(state.priorities.includes(a.muscleGroup)));}
function fitSessionTime(day){const cap=state.duration;let estimate=estimateMinutes(day.exercises,false);while(estimate>cap){const candidate=day.exercises.map((x,i)=>({x,i})).filter(({x})=>!state.priorities.includes(x.muscleGroup)&&x.sets>2).sort((a,b)=>Number(exerciseMap().get(a.x.id)?.type==="compound")-Number(exerciseMap().get(b.x.id)?.type==="compound"))[0];if(!candidate)break;candidate.x.sets-=1;estimate=estimateMinutes(day.exercises,state.supersets);}day.exercises=day.exercises.filter(x=>x.sets>=2);}
function estimateMinutes(items,withSupersets){let total=5;items.forEach(item=>{const def=exerciseMap().get(item.id),perSet=belongsToProtectedCompound(def)?3.2:def?.type==="compound"?2.5:1.7;total+=item.sets*perSet;});if(withSupersets)total*=.88;return total;}
function assignSupersets(day){let n=1;day.exercises.forEach(x=>delete x.supersetGroup);for(let i=0;i<day.exercises.length-1;i++){const a=day.exercises[i],b=day.exercises[i+1];if(a.supersetGroup||b.supersetGroup)continue;const ad=exerciseMap().get(a.id),bd=exerciseMap().get(b.id);if(!canSuperset(ad,bd))continue;const g=`S${n++}`;a.supersetGroup=g;b.supersetGroup=g;i+=1;}}
function canSuperset(a,b){if(!a||!b||belongsToProtectedCompound(a)||belongsToProtectedCompound(b)||a.muscleGroup===b.muscleGroup||INTERFERENCE.has(`${a.muscleGroup}|${b.muscleGroup}`))return false;return a.type==="isolation"||b.type==="isolation";}
function belongsToProtectedCompound(def){if(!def)return false;const lowerBody=["Quads","Hamstrings","Glutes"].includes(def.muscleGroup)&&def.type==="compound";return lowerBody||NEVER_SUPERSET.some(p=>p.test(def.name||""));}
function replaceExercise(di,ei){const item=state.generated?.days?.[di]?.exercises?.[ei];if(!item)return;const pool=availableExercises().filter(e=>e.muscleGroup===item.muscleGroup&&e.id!==item.id);if(!pool.length)return;const next=pool[(state.variation+ei+di+1)%pool.length];item.id=next.id;item.name=next.name;item.reps=repRangeFor(next);if(state.supersets)assignSupersets(state.generated.days[di]);}
function adjustSets(di,ei,delta){const item=state.generated?.days?.[di]?.exercises?.[ei];if(!item)return;item.sets=Math.max(2,Math.min(6,item.sets+delta));}
function calculateWeeklySets(program){const totals=Object.fromEntries(MUSCLES.map(m=>[m,0]));program.days.forEach(d=>d.exercises.forEach(x=>{if(totals[x.muscleGroup]!==undefined)totals[x.muscleGroup]+=Number(x.sets)||0;}));return totals;}
function buildSummary(days){const totalSets=days.reduce((sum,d)=>sum+d.exercises.reduce((s,e)=>s+e.sets,0),0),counts=days.map(d=>d.exercises.length),priority=state.priorities.length?` Priority: ${state.priorities.join(", ")}.`:"",ss=state.supersets?" Accessory supersets are used only when pairings are low-interference.":"";return`${totalSets} working sets across ${days.length} days; ${Math.min(...counts)}–${Math.max(...counts)} exercises per session.${priority}${ss}`;}
function saveGeneratedPlan(root){if(!state.generated)return;const plans=readPlans(),plan={id:`smart-${Date.now()}`,name:`Smart Build — ${GOALS[state.goal].label}`,days:state.generated.days.map(d=>({name:d.name,exercises:d.exercises.map(item=>{const out={id:item.id,sets:item.sets,reps:item.reps};if(item.supersetGroup)out.supersetGroup=item.supersetGroup;return out;})})),smartBuild:{version:7,goal:state.goal,days:state.days,duration:state.duration,priorities:[...state.priorities],experience:state.experience,equipment:[...state.equipment],supersets:state.supersets,createdAt:new Date().toISOString()}};plans.push(plan);localStorage.setItem(PLAN_STORAGE_KEY,JSON.stringify(plans));const button=root.querySelector("[data-smart-save]");if(button){button.disabled=true;button.textContent="Saved ✓";}window.setTimeout(()=>document.querySelector('.nav-btn[data-page="workout"]')?.click(),150);}
function readPlans(){try{const v=JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
function exerciseMap(){return new Map(getAllExercises().map(e=>[e.id,e]));}
function deterministicNoise(text,seed){let h=2166136261^Number(seed||0);for(const ch of String(text||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return Math.abs(h%17);}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}