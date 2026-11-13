/* Coach progress/food preview. Uses athlete measurement field names and Level Up set-band palette.
 * All profiles are demo fixtures. No private athlete data is available. */
const MEAS_FIELDS=[["neck","Neck"],["shoulders","Shoulders"],["chest","Chest"],["waist","Waist"],["hips","Hips"],["upperArm","Upper arm"],["forearm","Forearm"],["thigh","Thigh"],["calf","Calf"]];
const MEM_KEY="levelup_coach_measurement_drafts_v1",PHOTO_URLS=new Map();
const COLORS=["#6558A6","#427BC4","#23A7BE","#62B86C","#E6CC55","#E99A43","#DC655D"];
const safe=(tag,props={},kids=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==="text")n.textContent=v;else if(k==="className")n.className=v;else if(k==="onClick")n.addEventListener("click",v);else n.setAttribute(k,v)}n.append(...kids);return n};
const load=()=>{try{return JSON.parse(localStorage.getItem(MEM_KEY)||"{}")||{}}catch{return{}}};
const save=x=>{try{localStorage.setItem(MEM_KEY,JSON.stringify(x));return true}catch{return false}};
const today=()=>new Date().toLocaleDateString("en-CA");
const foods={
"Sarah Carter":[["Breakfast","Greek yogurt",160,20,12,3],["Lunch","Chicken with rice",610,48,72,13],["Dinner","Salmon and potatoes",570,40,45,24]],
"Mike Johnson":[["Breakfast","Oats and milk",420,20,60,12],["Lunch","Beef and rice",740,47,70,29]],
"Katie Lee":[["Breakfast","Eggs and toast",370,23,29,18],["Dinner","Chicken salad",440,42,24,17]]
};
const volume={
"Sarah Carter":[["Chest",12],["Back",14],["Shoulders",8],["Biceps",6],["Triceps",6],["Quads",10],["Hamstrings",8],["Glutes",8],["Calves",4],["Core",6]],
"Mike Johnson":[["Chest",10],["Back",12],["Shoulders",8],["Biceps",4],["Triceps",6],["Quads",12],["Hamstrings",8],["Glutes",10],["Calves",5],["Core",4]],
"Katie Lee":[["Chest",6],["Back",8],["Shoulders",6],["Biceps",3],["Triceps",3],["Quads",8],["Hamstrings",6],["Glutes",6],["Calves",3],["Core",5]]
};
function renderMeasurement(name,root){
root.append(safe("h3",{text:"Body measurements"}),safe("p",{className:"sub",text:"Uses the same nine measurement fields and inches as Level Up. Values entered here are coach-demo drafts, not athlete-app logs."}));
const form=safe("form"),grid=safe("div",{className:"coach-progress-grid"}),date=safe("input",{type:"date"}),fields={};date.value=today();
grid.append(safe("label",{},[safe("span",{text:"Measurement date"}),date]));
for(const [key,label] of MEAS_FIELDS){const input=safe("input",{type:"number",min:"0",max:"300",step:"0.1",placeholder:"—"});fields[key]=input;grid.append(safe("label",{},[safe("span",{text:label+" (in)"}),input]))}
const msg=safe("p",{className:"sub","aria-live":"polite"}),history=safe("div");form.append(grid,safe("button",{type:"submit",className:"btn",text:"Save check-in"}),msg);root.append(form,history);
function redraw(){const entries=load()[name]||[];history.replaceChildren(safe("h3",{text:"Measurement history · "+entries.length+" entries"}));for(const entry of [...entries].reverse())history.append(safe("div",{className:"coach-progress-history"},[safe("strong",{text:entry.date}),safe("span",{className:"sub",text:MEAS_FIELDS.filter(([key])=>Number.isFinite(entry[key])).map(([key,label])=>label+": "+entry[key]+" in").join(" · ")})]))}
form.onsubmit=e=>{e.preventDefault();if(!date.value){msg.textContent="Choose a valid date.";return}const entry={date:date.value};for(const [key] of MEAS_FIELDS){const value=fields[key].value;if(value==="")continue;const num=Number(value);if(num<=0||num>300){msg.textContent="Measurements must be positive and at most 300 inches.";return}entry[key]=num}if(Object.keys(entry).length===1){msg.textContent="Enter at least one measurement.";return}const all=load(),items=(all[name]||[]).filter(x=>x.date!==entry.date);items.push(entry);items.sort((a,b)=>a.date.localeCompare(b.date));all[name]=items;msg.textContent=save(all)?"Saved check-in to this browser preview.":"Couldn't save locally.";redraw()};
redraw();
}
function renderPhotos(name,root){root.append(safe("h3",{text:"Progress photos"}),safe("p",{className:"sub",text:"Local preview only: selected images remain in your browser session; no photos are uploaded, saved to the cloud, or shared."}));
const picker=safe("input",{type:"file",accept:"image/*",multiple:"multiple"}),gallery=safe("div",{className:"coach-photo-gallery"});root.append(picker,gallery);
function draw(){gallery.replaceChildren();const items=PHOTO_URLS.get(name)||[];if(!items.length){gallery.append(safe("p",{className:"sub",text:"No preview photos selected."}));return}items.forEach((item,i)=>gallery.append(safe("figure",{},[safe("img",{src:item.url,alt:"Local progress photo "+(i+1)}),safe("figcaption",{text:item.name}),safe("button",{className:"btn light",text:"Remove",onClick:()=>{URL.revokeObjectURL(item.url);items.splice(i,1);draw()}})])))}
picker.onchange=()=>{const items=PHOTO_URLS.get(name)||[];for(const file of picker.files||[]){if(!file.type.startsWith("image/")||file.size>10*1024*1024)continue;items.push({name:file.name,url:URL.createObjectURL(file)})}PHOTO_URLS.set(name,items);picker.value="";draw()};draw();
}
function renderFood(name,root){root.append(safe("h3",{text:"Daily food diary · Example meals"}),safe("p",{className:"sub",text:"Read-only preview of the meal/food review layout. These foods are fabricated examples; the client app food log is not linked."}));
const groups=new Map();for(const f of foods[name]||[]){if(!groups.has(f[0]))groups.set(f[0],[]);groups.get(f[0]).push(f)}
let totals=[0,0,0,0];for(const [meal,entries] of groups){const card=safe("div",{className:"coach-food-meal"},[safe("h3",{text:meal})]);for(const f of entries){for(let i=2;i<6;i++)totals[i-2]+=f[i];card.append(safe("div",{className:"coach-food-row"},[safe("strong",{text:f[1]}),safe("span",{text:f[2]+" kcal · P "+f[3]+"g · C "+f[4]+"g · F "+f[5]+"g"})]))}root.append(card)}
root.prepend(safe("div",{className:"coach-food-totals",text:"Logged foods shown: "+totals[0]+" kcal · Protein "+totals[1]+"g · Carbs "+totals[2]+"g · Fat "+totals[3]+"g"}));
}
function renderVolume(name,root){root.append(safe("h3",{text:"Weekly muscle volume · Level Up-style set distribution"}),safe("p",{className:"sub",text:"Illustrative weekly effective sets, using Level Up's Arctic set colour bands. Live metrics will be calculated from authorized athlete workout sessions."}));
const grid=safe("div",{className:"coach-volume-grid"});for(const [muscle,sets] of volume[name]||[]){const index=Math.max(0,Math.min(COLORS.length-1,Math.ceil(sets/2)-1));const color=sets>0?COLORS[index]:"#e2e8f0";const line=safe("div",{className:"coach-volume-row"},[safe("strong",{text:muscle}),safe("div",{className:"coach-volume-track"},[safe("div",{className:"coach-volume-fill"})]),safe("span",{text:sets+" sets"})]);line.querySelector(".coach-volume-fill").style.width=Math.min(100,sets/16*100)+"%";line.querySelector(".coach-volume-fill").style.background=color;grid.append(line)}root.append(grid,safe("p",{className:"sub",text:"Based on the app's set-range palette; actual secondary-muscle credit and recorded-set calculations must come from Level Up's shared training analytics."}))}
function update(event){const {name,tab,container}=event.detail||{};if(!name||!container)return;
if(tab==="progress"){const sec=safe("section",{className:"card coach-profile-extra"});renderMeasurement(name,sec);container.append(sec)}
if(tab==="photos"){const sec=safe("section",{className:"card coach-profile-extra"});renderPhotos(name,sec);container.append(sec)}
// The shared volume SVG module mounts the full anatomy and exact set-band breakdown on the training tab.
if(tab==="nutrition"){const sec=safe("section",{className:"card coach-profile-extra"});renderFood(name,sec);container.append(sec)}}
document.addEventListener("levelup:coach-client-profile-rendered",update);
