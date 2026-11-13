import {presetPlans} from "./js/workouts/workout-plans.js";
/* Coach Program Library; persistent browser-local preview.
   Data schema mirrors Level Up plans: {name,days:[{name,exercises:[...]}]} */
const KEY="level_up_coach_program_library_v1";
const $=id=>document.getElementById(id);
const el=(tag,attrs={},children=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="className")n.className=v;else if(k==="text")n.textContent=v;else if(k==="onClick")n.addEventListener("click",v);else n.setAttribute(k,v)}n.append(...children);return n};
const btn=(text,fn,klass="btn light")=>el("button",{type:"button",className:klass,text,onClick:fn});
const load=()=>{try{const value=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}};
const write=value=>{try{localStorage.setItem(KEY,JSON.stringify(value));return true}catch{return false}};
const nav=$("nav"),old=[...nav.querySelectorAll("button")].find(x=>x.textContent.trim()==="Program library");
let navBtn=btn("Program library",()=>open());
navBtn.className="nav-sub";
navBtn.dataset.coachProgramLibrary="true";
if(old)old.replaceWith(navBtn);
const page=el("section",{className:"view",id:"programs"});
page.append(el("div",{className:"head"},[el("div",{},[el("span",{className:"eyebrow",text:"LIBRARY / PROGRAMS"}),el("h1",{text:"Program Library"}),el("p",{className:"muted",text:"Saved workouts with all training days and exercises. Reopen any program to continue editing."})]),btn("+ Create Program",()=>{document.dispatchEvent(new CustomEvent("levelup:coach-new-program"));showBuilder()},"btn")]));
page.append(el("div",{className:"hint",text:"Development preview: programs are stored in this browser only. They are not assigned to athlete accounts or synchronized across devices."}));
const search=el("input",{type:"search",placeholder:"Search plans, categories, workouts…",className:"coach-library-search","aria-label":"Search workout programs"});
const category=el("select",{className:"coach-library-filter","aria-label":"Program category"});for(const [label,value] of [["All programs","all"],["Coach-created","saved"],["Level Up templates","presets"]])category.append(el("option",{value,text:label}));
const toolbar=el("div",{className:"coach-library-toolbar"},[search,category,btn("Import program",()=>{showBuilder();document.dispatchEvent(new CustomEvent("levelup:coach-open-import"))}),btn("Manual builder",()=>{document.dispatchEvent(new CustomEvent("levelup:coach-new-program"));showBuilder()})]);
const entries=el("div",{className:"coach-library-results"}),msg=el("p",{className:"sub","aria-live":"polite"});
page.append(toolbar,entries,msg);
document.querySelector(".body")?.append(page);
function showBuilder(){document.querySelector('[data-view="builder"]')?.click();if(!$("builder")?.classList.contains("active"))activate("builder")}
function activate(id){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id||id==="programs"&&b===navBtn));$("crumb").textContent=id==="programs"?"Program Library":"Program Builder";window.scrollTo(0,0)}
function open(){activate("programs");render()}
function describe(entry){const p=entry.plan||{},days=Array.isArray(p.days)?p.days:[],count=days.reduce((n,d)=>n+(d.exercises?.length||0),0);return {days:days.length,count}}
function render(){entries.replaceChildren();const saved=load().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))),q=search.value.trim().toLowerCase(),show=category.value;
const results=[];
if(show!=="presets")for(const record of saved){const plan=record.plan||{};if([plan.name,plan.description,...(plan.days||[]).map(d=>d.name)].join(" ").toLowerCase().includes(q))results.push({kind:"saved",id:record.id,plan,record})}
if(show!=="saved")for(const plan of presetPlans){if([plan.name,plan.level,plan.description,plan.trainingType,...(plan.days||[]).map(d=>d.name)].join(" ").toLowerCase().includes(q))results.push({kind:"preset",id:plan.id,plan})}
if(!results.length){entries.append(el("div",{className:"card coach-library-empty"},[el("h2",{text:"No matching programs"}),el("p",{className:"muted",text:"Choose another category or create a program."}),btn("+ Create a program",()=>{document.dispatchEvent(new CustomEvent("levelup:coach-new-program"));showBuilder()},"btn")]));return}
const subtitle=el("p",{className:"sub",text:results.length+" available programs · "+presetPlans.length+" original Level Up templates · "+saved.length+" coach-created"});
entries.append(subtitle);
results.forEach(({kind,plan,record,id})=>{const counts=describe({plan}),row=el("article",{className:"card coach-library-entry"}),title=el("div",{className:"coach-library-entry-title"},[el("strong",{text:plan.name||"Untitled program"}),el("small",{className:"sub",text:counts.days+" workout days · "+counts.count+" exercises · "+(kind==="preset"?"Level Up template":"Coach-created")})]),actions=el("div",{className:"coach-library-entry-actions"});
const loadPlan=()=>{const copy=structuredClone(plan);document.dispatchEvent(new CustomEvent("levelup:coach-load-program",{detail:{plan:copy}}));showBuilder()};
actions.append(btn(kind==="preset"?"Use / Customize":"View / Edit",loadPlan,"btn"));
if(kind==="saved"){actions.append(btn("Duplicate",()=>{const copy=structuredClone(record);copy.id="coach-plan-"+Date.now()+"-"+Math.random().toString(36).slice(2);copy.plan.name+=" (Copy)";copy.createdAt=new Date().toISOString();copy.updatedAt=copy.createdAt;const data=load();data.push(copy);if(write(data))render()}),btn("Delete",()=>{if(!confirm("Delete this saved coaching program?"))return;const data=load().filter(x=>x.id!==record.id);if(write(data))render()}))}
else actions.append(btn("Save as coach copy",()=>{const data=load(),copy=structuredClone(plan);copy.name+=" (Coach Copy)";data.push({id:"coach-plan-"+Date.now(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),plan:copy});if(write(data))render()}));
const days=(plan.days||[]).map(d=>d.name+" ("+(d.exercises?.length||0)+")").join(" · ");row.append(title,el("p",{className:"sub",text:(plan.description||"")+" · "+days}),actions);entries.append(row)})}
search.addEventListener("input",render);category.addEventListener("change",render);
document.addEventListener("levelup:open-program-library",open);
document.addEventListener("levelup:coach-save-program",event=>{const p=event.detail?.plan;if(!p||!Array.isArray(p.days)||!p.days.length){msg.textContent="No valid program to save.";return}const total=describe({plan:p}).count;if(!total){msg.textContent="Add exercises before saving the program.";return}
const records=load(),existing=records.find(x=>x.plan?.name===p.name),now=new Date().toISOString();const record={id:existing?.id||"coach-plan-"+Date.now()+"-"+Math.random().toString(36).slice(2),createdAt:existing?.createdAt||now,updatedAt:now,plan:structuredClone(p)};
if(existing){const index=records.indexOf(existing);records[index]=record}else records.push(record);
if(write(records)){msg.textContent="Saved "+p.name+" ("+p.days.length+" days / "+total+" exercises) to your Program Library in this browser.";render();}else msg.textContent="Couldn't save. Browser storage may be full or unavailable.";
});
render();
