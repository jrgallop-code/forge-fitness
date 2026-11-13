/* Unified coaching program builder: demo storage only. */
const $=id=>document.getElementById(id);
const el=(tag,props={},children=[])=>{const n=document.createElement(tag);for(const [key,val] of Object.entries(props)){if(key==="className")n.className=val;else if(key==="text")n.textContent=val;else if(key==="onClick")n.addEventListener("click",val);else n.setAttribute(key,val)}n.append(...children);return n};
const button=(name,fn)=>el("button",{type:"button",className:"btn",text:name,onClick:fn});
const load=key=>{try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}};
const WORKING="levelup_coach_full_editor_v1",CAL="levelup_coach_calorie_plan_drafts_v1",MACRO="levelup_coach_macro_drafts_v1",SAVED="levelup_coach_combined_plans_v2";
const page=$("builder");if(!page)throw Error("Builder not found");
const section=el("section",{id:"coach-unified-nutrition",className:"card coach-unified-section"}),title=el("div",{},[el("span",{className:"eyebrow",text:"COMPLETE CLIENT PLAN"}),el("h2",{text:"Nutrition · Calories · Macros · Meals"}),el("p",{className:"sub",text:"Nutrition is part of Program Builder. Workouts and nutrition save as one package."})]);
const choices=el("select",{"aria-label":"Client for complete plan"});
for(const name of ["Sarah Carter","Mike Johnson","Katie Lee"])choices.append(el("option",{value:name,text:name}));
const guidance=el("textarea",{rows:"5",placeholder:"Planned meals, nutrition guidance, timing and food preferences…"});
const field=(label,input)=>el("label",{className:"coach-complete-field"},[el("span",{text:label}),input]);
section.append(title,field("Client",choices));
const original=$("nutrition"),calorie=original?.querySelector(".coach-calorie-plan"),macro=$("coach-macro-editor");
if(calorie)section.append(calorie);
if(macro)section.append(macro);
section.append(field("Meal plan and nutrition notes",guidance));
const details=el("div",{className:"coach-complete-summary"}),notice=el("p",{className:"sub",text:"This is a browser-local draft; no athlete has received it."}),actions=el("div",{className:"coach-editor-actions"});
section.append(details,actions,notice);
const volume=$("coach-full-builder-volume");
if(volume)volume.after(section);else page.append(section);
function plan(){const training=load(WORKING),cal=load(CAL)[choices.value]||null,macro=load(MACRO)[choices.value]||null;return {schema:"levelup.coach.complete-plan.v2",recipient:choices.value,training:Array.isArray(training.days)?training:null,nutrition:{calories:cal,macros:macro,mealGuidance:guidance.value.trim()},deliveryStatus:"not_sent",savedAt:new Date().toISOString()}}
function render(){const p=plan();details.replaceChildren();const dayCount=p.training?.days?.length||0,exerciseCount=p.training?.days?.reduce((total,day)=>total+(day.exercises?.length||0),0)||0;for(const [key,value] of [["Workouts",dayCount+" days, "+exerciseCount+" exercises"],["Calories",p.nutrition.calories?.calories?String(p.nutrition.calories.calories)+" kcal":"Not saved"],["Macros",p.nutrition.macros?.value?String(p.nutrition.macros.value.protein)+"g P · "+String(p.nutrition.macros.value.carbs)+"g C · "+String(p.nutrition.macros.value.fat)+"g F":"Not saved"],["Goal weight",p.nutrition.calories?.goalWeightLb?String(p.nutrition.calories.goalWeightLb)+" lb":"Not set"]])details.append(el("div",{},[el("small",{text:key}),el("strong",{text:value})]))}
function save(){const p=plan();if(!p.training?.days?.some(day=>day.exercises?.length)){notice.textContent="Add exercises to a workout day before saving the complete plan.";return}const data=load(SAVED);data[choices.value]=p;try{localStorage.setItem(SAVED,JSON.stringify(data));notice.textContent="Complete program saved locally for "+choices.value+". This has not been sent to the client.";render()}catch{notice.textContent="Unable to save combined plan in browser storage."}}
function exportFile(){const p=load(SAVED)[choices.value]||plan(),url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:"application/json"}));el("a",{href:url,download:"level-up-complete-client-plan.json"}).click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
const saveButton=button("Save Complete Plan",save),exportButton=button("Export Complete Plan",exportFile),send=button("Send to Client App",()=>{notice.textContent="Not sent. Secure client authorization and the shared assignment API are required before sending."});
send.title="Client synchronization is not available in this prototype.";
actions.append(saveButton,exportButton,send);
choices.onchange=()=>{const name=choices.value;for(const selector of [".coach-calorie-plan select","#coach-macro-editor select"]){const input=section.querySelector(selector);if(input&&[...input.options].some(x=>x.value===name)){input.value=name;input.dispatchEvent(new Event("change",{bubbles:true}))}}guidance.value=load(SAVED)[name]?.nutrition?.mealGuidance||"";render()};
document.addEventListener("levelup:coach-program-rendered",render);
section.addEventListener("change",()=>requestAnimationFrame(render));render();
