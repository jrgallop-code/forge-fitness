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
const search=el("input",{type:"search",placeholder:"Search saved programs…",className:"coach-library-search","aria-label":"Search saved programs"});
const toolbar=el("div",{className:"coach-library-toolbar"},[search,btn("Import program",()=>{showBuilder();document.dispatchEvent(new CustomEvent("levelup:coach-open-import"))}),btn("Manual builder",()=>{document.dispatchEvent(new CustomEvent("levelup:coach-new-program"));showBuilder()})]);
const entries=el("div",{className:"coach-library-results"}),msg=el("p",{className:"sub","aria-live":"polite"});
page.append(toolbar,entries,msg);
document.querySelector(".body")?.append(page);
function showBuilder(){document.querySelector('[data-view="builder"]')?.click();if(!$("builder")?.classList.contains("active"))activate("builder")}
function activate(id){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id||id==="programs"&&b===navBtn));$("crumb").textContent=id==="programs"?"Program Library":"Program Builder";window.scrollTo(0,0)}
function open(){activate("programs");render()}
function describe(entry){const p=entry.plan||{},days=Array.isArray(p.days)?p.days:[],count=days.reduce((n,d)=>n+(d.exercises?.length||0),0);return {days:days.length,count}}
function render(){entries.replaceChildren();const saved=load().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))),q=search.value.trim().toLowerCase();const filtered=saved.filter(x=>String(x.plan?.name||"").toLowerCase().includes(q));
if(!filtered.length){entries.append(el("div",{className:"card coach-library-empty"},[el("h2",{text:saved.length?"No matching programs":"No saved programs yet"}),el("p",{className:"muted",text:saved.length?"Try a different search.":"Create a manual program, import a routine, or generate one with Smart Coach. Then choose Save to library."}),btn("+ Create your first program",()=>{document.dispatchEvent(new CustomEvent("levelup:coach-new-program"));showBuilder()},"btn")]));return}
filtered.forEach(record=>{const m=describe(record),row=el("article",{className:"card coach-library-entry"}),header=el("div",{className:"coach-library-entry-title"},[el("strong",{text:record.plan.name||"Untitled program"}),el("small",{className:"sub",text:m.days+" workout days · "+m.count+" exercises"})]),actions=el("div",{className:"coach-library-entry-actions"});
actions.append(btn("View / Edit",()=>{document.dispatchEvent(new CustomEvent("levelup:coach-load-program",{detail:{plan:record.plan}}));showBuilder()},"btn"),btn("Duplicate",()=>{const copy=structuredClone(record);copy.id="coach-plan-"+Date.now()+"-"+Math.random().toString(36).slice(2);copy.plan.name+=" (Copy)";copy.createdAt=new Date().toISOString();copy.updatedAt=copy.createdAt;const data=load();data.push(copy);if(write(data))render()}),btn("Delete",()=>{if(!confirm("Delete this saved coaching program?"))return;const data=load().filter(x=>x.id!==record.id);if(write(data))render()}));
row.append(header,el("p",{className:"sub",text:"Days: "+(record.plan.days||[]).map(d=>d.name+" ("+(d.exercises?.length||0)+")").join(" · ")}),actions);entries.append(row)})}
search.addEventListener("input",render);
document.addEventListener("levelup:coach-save-program",event=>{const p=event.detail?.plan;if(!p||!Array.isArray(p.days)||!p.days.length){msg.textContent="No valid program to save.";return}const total=describe({plan:p}).count;if(!total){msg.textContent="Add exercises before saving the program.";return}
const records=load(),existing=records.find(x=>x.plan?.name===p.name),now=new Date().toISOString();const record={id:existing?.id||"coach-plan-"+Date.now()+"-"+Math.random().toString(36).slice(2),createdAt:existing?.createdAt||now,updatedAt:now,plan:structuredClone(p)};
if(existing){const index=records.indexOf(existing);records[index]=record}else records.push(record);
if(write(records)){msg.textContent="Saved "+p.name+" ("+p.days.length+" days / "+total+" exercises) to your Program Library in this browser.";render();}else msg.textContent="Couldn't save. Browser storage may be full or unavailable.";
});
render();
