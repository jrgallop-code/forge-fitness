import {getAllExercises} from "./js/workouts/exercise-library.js";
import "./js/workouts/exercise-library-expansion.js";
import {parseRoutineText} from "./js/workouts/routine-import-parser.js";
import {normalizeTargets,syncTargets,moveRoutineExercise,groupRoutineExercises,ungroupExercise,replaceRoutineExercise,exerciseKind} from "./js/workouts/routine-builder-model.js";
const $=id=>document.getElementById(id), ALL=getAllExercises(), BY_ID=new Map(ALL.map(x=>[x.id,x]));
const KEY="levelup_coach_full_editor_v1";
const el=(tag,props={},kids=[])=>{const node=document.createElement(tag);Object.entries(props).forEach(([k,v])=>{if(k==="text")node.textContent=v;else if(k==="className")node.className=v;else if(k==="onClick")node.addEventListener("click",v);else node.setAttribute(k,v)});node.append(...kids);return node};
const button=(txt,fn)=>el("button",{className:"btn light",type:"button",text:txt,onClick:fn});
const field=(text,node)=>el("label",{className:"coach-editor-field"},[el("small",{text}),node]);
const box=(type,val)=>{const n=el("input",{type});if(val!=null)n.value=val;return n};
let plan={name:"New Coaching Program",days:[{name:"Workout A",exercises:[]}]},dayIndex=0,selected=new Set(),storedDraft=null;
try{const parsed=JSON.parse(localStorage.getItem(KEY)||"null");if(parsed&&Array.isArray(parsed.days)&&parsed.days.length)storedDraft=parsed}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(plan))}catch{};document.dispatchEvent(new CustomEvent("levelup:coach-program-rendered",{detail:{plan:structuredClone(plan),dayIndex}}))};
const root=$("builder"),old=$("coach-build-extension"),oldPanel=$("builder-panel"),legacyModes=root?.querySelector(".mode-grid");
if(!root)throw Error("Builder view unavailable");
if(old)old.hidden=true;if(oldPanel)oldPanel.hidden=true;if(legacyModes)legacyModes.hidden=true;
const shell=el("div",{className:"coach-editor-shell"}),top=el("div",{className:"card"}),tabs=el("div",{className:"coach-editor-tabs"}),summary=el("div"),volume=el("div",{id:"coach-full-builder-volume",className:"card coach-volume-host"}),work=el("div"),notice=el("p",{className:"sub",text:"Draft only — not assigned to any athlete."});
(legacyModes||root.querySelector(".head")||root).after(shell);shell.append(top,tabs,summary,work,volume,notice);
const veil=el("div",{className:"coach-editor-overlay"});document.body.append(veil);
function close(){veil.classList.remove("active");veil.replaceChildren()}
veil.addEventListener("click",event=>{if(event.target===veil)close()});
function dialog(title){veil.replaceChildren();const card=el("div",{className:"coach-editor-modal"},[el("div",{className:"row between"},[el("h2",{text:title}),button("Close",close)])]);veil.append(card);veil.classList.add("active");return card}
function notify(s){notice.textContent=s}
function allCount(){return plan.days.reduce((n,d)=>n+(d.exercises||[]).length,0)}
function render(){
document.dispatchEvent(new CustomEvent("levelup:coach-program-rendered",{detail:{plan:structuredClone(plan),dayIndex}}));
top.replaceChildren();const title=box("text",plan.name);title.maxLength=110;title.oninput=()=>{plan.name=title.value;save()};
const makeNew=()=>{if(allCount()>0&&!confirm("Create a blank program? Unsaved changes to this working draft will be discarded; saved client plans and Library programs are retained."))return;document.dispatchEvent(new Event("levelup:coach-new-program"));notify("Blank program created. Add exercises to Workout A.")};
const actions=el("div",{className:"coach-editor-actions"},[button("+ New Program",makeNew),button("Smart Coach",()=>document.getElementById("coach-smart-panel")?.scrollIntoView({behavior:"smooth",block:"center"})),button("Import a Program",importPlan),button("Add Exercises",()=>pickExercise(def=>addExercise(def),{multiple:true})),button("Save to Program Library",()=>document.dispatchEvent(new CustomEvent("levelup:coach-save-program",{detail:{plan:structuredClone(plan)}}))),button("Delete Working Program",()=>{if(!confirm("Delete this working program? Saved client plans and library templates will be kept."))return;document.dispatchEvent(new Event("levelup:coach-new-program"));notify("Working program cleared. Saved client plans are unchanged.")}),button("Open Program Library",()=>document.dispatchEvent(new Event("levelup:open-program-library"))),button("Export JSON",exportJson)]);
if(storedDraft&&allCount()===0){actions.prepend(button("Resume Previous Draft",()=>{plan=structuredClone(storedDraft);dayIndex=0;selected.clear();render();notify("Recovered draft. Use Save to Program Library to keep it.")}));actions.append(button("Delete Previous Draft",()=>{storedDraft=null;localStorage.removeItem(KEY);render();notify("Previous unsaved draft cleared.")}))}
top.append(el("div",{},[el("span",{className:"eyebrow",text:"Level Up Coach · Manual / Smart / Import"}),el("h2",{text:plan.days.length+" workout day(s) · "+allCount()+" exercises"})]),field("Program title",title),actions);
tabs.replaceChildren();tabs.append(button("All days",()=>{dayIndex=-1;render()}));
plan.days.forEach((d,i)=>{const b=button((i+1)+". "+d.name+" ("+d.exercises.length+")",()=>{dayIndex=i;selected.clear();render()});if(i===dayIndex)b.classList.add("active");tabs.append(b)});
tabs.append(button("+ Workout day",()=>{plan.days.push({name:"Workout "+(plan.days.length+1),exercises:[]});dayIndex=plan.days.length-1;save();render()}));
summary.replaceChildren();work.replaceChildren();
if(dayIndex<0){summary.append(el("h3",{text:"Full plan overview — every exercise in every day"}));plan.days.forEach((d,i)=>{const card=el("div",{className:"card coach-editor-day"});card.append(el("div",{className:"row between"},[el("h3",{text:d.name+" · "+d.exercises.length+" exercises"}),button("Edit day",()=>{dayIndex=i;render()})]));d.exercises.forEach((x,j)=>card.append(el("div",{className:"coach-editor-overview-line",text:(j+1)+". "+(BY_ID.get(x.id)?.name||x.id)+" — "+x.sets+" sets × "+(x.reps||"duration")+(x.supersetGroup?" · "+(x.groupType||"superset"):"")})));summary.append(card)});return}
const d=plan.days[dayIndex],name=box("text",d.name);name.maxLength=90;name.oninput=()=>{d.name=name.value;save()};
summary.append(el("div",{className:"card coach-editor-toolbar"},[field("Workout name",name),button("Duplicate day",()=>{plan.days.splice(dayIndex+1,0,structuredClone(d));plan.days[dayIndex+1].name+=" (Copy)";dayIndex++;save();render()}),button("Remove day",()=>{if(plan.days.length===1){if(!confirm("Clear the only workout day and all its exercises?"))return;plan.days[0]={name:"Workout A",exercises:[]};dayIndex=0;selected.clear();save();render();notify("Workout day cleared.");return}if(!confirm("Remove this workout day and its exercises?"))return;plan.days.splice(dayIndex,1);dayIndex=Math.min(dayIndex,plan.days.length-1);save();render()})]));
summary.append(el("p",{className:"sub",text:d.exercises.length+" exercises · "+d.exercises.reduce((n,x)=>n+(Number(x.sets)||0),0)+" planned sets"}));
summary.append(el("div",{className:"coach-editor-actions"},[button("Superset selected",()=>group("superset")),button("Circuit selected",()=>group("circuit")),button("Ungroup selected",()=>{[...selected].forEach(i=>ungroupExercise(d,i));selected.clear();save();render()})]));
if(!d.exercises.length)work.append(el("div",{className:"card",text:"No exercises. Add an exercise, import a program, or use Smart Coach."}));
d.exercises.forEach((x,i)=>renderExercise(d,x,i));
}
function group(type){const d=plan.days[dayIndex],indices=[...selected].sort((a,b)=>a-b);if(indices.length<2){notify("Choose at least two exercise checkboxes.");return}groupRoutineExercises(d,indices,type);selected.clear();save();render()}
function renderExercise(d,item,i){
const def=BY_ID.get(item.id),card=el("article",{className:"card coach-editor-exercise"}),head=el("div",{className:"row between"});
const label=el("div"),checkbox=box("checkbox");checkbox.checked=selected.has(i);checkbox.onchange=()=>checkbox.checked?selected.add(i):selected.delete(i);
label.append(el("div",{className:"row"},[checkbox,el("strong",{text:(i+1)+". "+(def?.name||item.id)})]),el("p",{className:"sub",text:(def?.muscleGroup||"Other")+" · "+(def?.equipment||"Other")+(item.supersetGroup?" · "+(item.groupType||"superset"):"")}));
head.append(label,el("div",{className:"coach-editor-actions"},[button("Swap",()=>pickExercise(next=>{d.exercises[i]=replaceRoutineExercise(item,next);save();render();notify("Swapped exercise using Level Up routine model; review target values.")})),button("↑",()=>move(i,i-1)),button("↓",()=>move(i,i+1)),button("Remove",()=>{d.exercises.splice(i,1);selected.clear();save();render()})]));card.append(head);
const kind=exerciseKind(def,item),fields=el("div",{className:"coach-editor-fields"});
const sets=box("number",item.sets||3);sets.min=1;sets.max=20;sets.onchange=()=>{item.sets=Math.max(1,Math.min(20,Math.round(Number(sets.value)||3)));syncTargets(item,normalizeTargets(item,def));save();render()};
const reps=box("text",item.reps||def?.recommendedReps||"8-12");reps.onchange=()=>{item.reps=reps.value;const targets=normalizeTargets(item,def);targets.forEach(t=>t.reps=reps.value);syncTargets(item,targets);save();render()};
const rest=box("number",item.restSetting?.enabled?item.restSetting.seconds:120);rest.min=0;rest.max=600;rest.onchange=()=>{item.restSetting={enabled:Number(rest.value)>0,seconds:[60,90,120,180].includes(Number(rest.value))?Number(rest.value):120};save()};
fields.append(field("Sets",sets),field(kind==="duration"?"Duration":"Reps",reps),field("Rest (seconds)",rest));
const notes=el("textarea",{rows:"2"});notes.value=item.notes||"";notes.onchange=()=>{item.notes=notes.value;save()};fields.append(field("Coach notes",notes));card.append(fields);
const targets=normalizeTargets(item,def);
if(targets.length){const targetBox=el("div",{className:"coach-editor-targets"},[el("h3",{text:"Per-set targets"})]);
targets.forEach((target,j)=>{const line=el("div",{className:"coach-editor-set-row"},[el("strong",{text:"Set "+(j+1)})]);for(const [key,label,type] of [["reps",kind==="duration"?"Seconds":"Reps","text"],["weight","Weight (lb)","number"],["rir","RIR","number"]]){const control=box(type,target[key]??"");control.onchange=()=>{const values=normalizeTargets(item,def);values[j][key]=key==="reps"?control.value:control.value===""?null:Number(control.value);syncTargets(item,values);save()};line.append(field(label,control))}targetBox.append(line);
if(kind==="strength"){const drops=Array.isArray(target.dropSets)?target.dropSets:[];drops.forEach((drop,di)=>{const dropRow=el("div",{className:"coach-editor-set-row"},[el("span",{text:"↳ Drop "+(di+1)})]);for(const [key,label] of [["weight","Weight (lb)"],["reps","Reps"]]){const inp=box("number",drop[key]??"");inp.min=0;inp.onchange=()=>{const values=normalizeTargets(item,def);values[j].dropSets[di][key]=inp.value===""?null:Number(inp.value);syncTargets(item,values);save()};dropRow.append(field(label,inp))}dropRow.append(button("Remove",()=>{const values=normalizeTargets(item,def);values[j].dropSets.splice(di,1);syncTargets(item,values);save();render()}));targetBox.append(dropRow)});
targetBox.append(button("+ Drop set for set "+(j+1),()=>{const values=normalizeTargets(item,def);values[j].dropSets.push({weight:null,reps:null});syncTargets(item,values);save();render()}))}
});card.append(targetBox)}
if(kind==="strength"){const warm=el("div",{className:"coach-editor-targets"},[el("div",{className:"row between"},[el("h3",{text:"Warm-up sets"}),button("+ Warm-up",()=>{item.warmupTargets ||= [];item.warmupTargets.push({weight:null,reps:8});save();render()})])]);(item.warmupTargets||[]).forEach((w,wi)=>{const row=el("div",{className:"coach-editor-set-row"},[el("span",{text:"Warm-up "+(wi+1)})]);for(const [key,label] of [["weight","Weight (lb)"],["reps","Reps"]]){const ctrl=box("number",w[key]??"");ctrl.min=0;ctrl.onchange=()=>{item.warmupTargets[wi][key]=ctrl.value===""?null:Number(ctrl.value);save()};row.append(field(label,ctrl))}row.append(button("Remove",()=>{item.warmupTargets.splice(wi,1);save();render()}));warm.append(row)});card.append(warm)}
if(kind==="cardio"){const cardio=el("div",{className:"coach-editor-fields"});item.cardioTarget ||= {};for(const [key,label] of [["durationMinutes","Duration (minutes)"],["distance","Distance"],["pace","Pace"]]){const entry=box("text",item.cardioTarget[key]||"");entry.onchange=()=>{item.cardioTarget[key]=entry.value;save()};cardio.append(field(label,entry))}card.append(cardio)}
work.append(card)}
function move(i,j){const d=plan.days[dayIndex];if(j<0||j>=d.exercises.length)return;moveRoutineExercise(d,i,j);selected.clear();save();render()}
function addExercise(def){const d=plan.days[Math.max(0,dayIndex)];const item={id:def.id,sets:def.defaultSets||3,reps:def.recommendedReps||"8-12",notes:""};item.setTargets=normalizeTargets(item,def);d.exercises.push(item);dayIndex=Math.max(0,dayIndex);save();render()}
function pickExercise(choose,{multiple=false}={}) {
 const dialogBox=dialog(multiple?"Add multiple exercises to "+plan.days[Math.max(0,dayIndex)].name:"Swap exercise");
 const search=box("search"),equipment=el("select"),results=el("div",{className:"coach-editor-picks"}),muscleRow=el("div",{className:"coach-editor-muscles"}),selectedItems=new Map(),preview=el("div",{className:"coach-editor-muscle-preview"});
 let muscle="";
 search.placeholder="Search exercises by name, muscle or equipment";
 for(const kind of ["All equipment",...new Set(ALL.map(ex=>ex.equipment||"Other"))]){equipment.append(el("option",{value:kind==="All equipment"?"":kind,text:kind}))}
 const muscleNames=["All","Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves","Core","Rear Delts","Forearms"];
 const targetFigure=el("img",{src:"./assets/recovery/front-view.svg",alt:"Level Up muscle anatomy reference"});
 const caption=el("p",{className:"sub",text:"Choose a muscle group or search all exercises. Select several movements, then add them together."});
 preview.append(targetFigure,caption);
 for(const name of muscleNames)muscleRow.append(el("button",{className:"btn light",type:"button",text:name,onClick:()=>{muscle=name==="All"?"":name;targetFigure.src="./assets/recovery/"+(["Back","Glutes","Hamstrings","Rear Delts","Triceps"].includes(muscle)?"back":"front")+"-view.svg";draw()}}));
 const bar=el("div",{className:"coach-editor-actions"}),confirmButton=button("Add selected (0)",()=>{if(!selectedItems.size)return;for(const def of selectedItems.values())choose(def);close()});
 dialogBox.append(preview,muscleRow,bar,results);bar.append(search,equipment,confirmButton);confirmButton.hidden=!multiple;equipment.onchange=draw;search.oninput=draw;
 function draw(){
  results.replaceChildren();
  for(const button of muscleRow.querySelectorAll("button"))button.classList.toggle("active",button.textContent===(muscle||"All"));
  const term=search.value.toLowerCase(),items=ALL.filter(def=>(!muscle||def.muscleGroup===muscle)&&(!equipment.value||def.equipment===equipment.value)&&[def.name,def.equipment,def.muscleGroup].join(" ").toLowerCase().includes(term)).slice(0,240);
  for(const def of items){const row=el("button",{className:"coach-editor-pick",type:"button",text:(multiple?(selectedItems.has(def.id)?"☑ ":"☐ "):"")+def.name+" · "+(def.equipment||"Other"),onClick:()=>{if(!multiple){choose(def);close();return}if(selectedItems.has(def.id))selectedItems.delete(def.id);else selectedItems.set(def.id,def);confirmButton.textContent="Add selected ("+selectedItems.size+")";draw()}});if(selectedItems.has(def.id))row.classList.add("selected");results.append(row)}
  if(!items.length)results.append(el("p",{className:"sub",text:"No exercises match this filter."}))
 }draw();search.focus();
}
function importPlan(){const modalBox=dialog("Import complete workout program"),area=el("textarea",{rows:"10"});area.placeholder="Upper Body A\nBench Press 3x8\nLat Pulldown 3x10\n\nLower Body A\nLeg Press 4x10";modalBox.append(area,button("Import all workout days",()=>{const parsed=parseRoutineText(area.value);if(!parsed.days.length){modalBox.append(el("p",{text:"No workout days recognized. Use headings and exercise lines with sets x reps."}));return}let missed=0;plan.days=parsed.days.map(d=>({name:d.name,exercises:d.exercises.map(x=>{const id=x.match?.confirmed?x.match.exerciseId:ALL.find(y=>y.name.toLowerCase()===x.name.toLowerCase())?.id;if(!id){missed++;return null}const item={id,sets:x.sets,reps:x.reps,notes:x.notes||""};item.setTargets=normalizeTargets(item,BY_ID.get(id));return item}).filter(Boolean)}));plan.name="Imported Coaching Program";dayIndex=0;selected.clear();save();render();close();notify("Imported "+plan.days.length+" days, "+allCount()+" matching exercises. "+missed+" unmatched exercises require review.")}))}
function exportJson(){const payload={schema:"level-up-coach-draft-v1",plan,warning:"Not yet assigned to a real Level Up athlete account"};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));const a=el("a",{href:url,download:"level-up-coach-program.json"});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.addEventListener("levelup:coach-load-program",event=>{storedDraft=null;const incoming=event.detail?.plan;if(!incoming||!Array.isArray(incoming.days)||!incoming.days.length)return;plan=structuredClone(incoming);dayIndex=0;selected.clear();save();render();notify("Loaded "+plan.name+" from your saved Program Library. Changes are a draft until saved again.")});
document.addEventListener("levelup:coach-new-program",()=>{plan={name:"New Coaching Program",days:[{name:"Workout A",exercises:[]}]};dayIndex=0;storedDraft=null;selected.clear();save();render();notify("New manual program. Add exercises to start.")});
document.addEventListener("levelup:coach-rename-program",event=>{const name=String(event.detail?.name||"").trim();if(!name||name===plan.name)return;plan.name=name;save();render()});
document.addEventListener("levelup:coach-select-day",event=>{const idx=Number(event.detail?.index);if(Number.isInteger(idx)&&idx>=0&&idx<plan.days.length){dayIndex=idx;selected.clear();render()}});
document.addEventListener("levelup:coach-open-import",()=>importPlan());
document.addEventListener("levelup:coach-smart-generated",event=>{storedDraft=null;const source=event.detail;if(!source?.days?.length)return;plan={name:source.name,days:source.days.map(d=>({name:d.name,exercises:(d.exercises||[]).map(x=>({...x,setTargets:normalizeTargets(x,BY_ID.get(x.id))}))}))};dayIndex=0;selected.clear();save();render();notify("Complete Smart Coach result loaded: "+plan.days.length+" days and "+allCount()+" exercises. All days are shown above.")});
render();
