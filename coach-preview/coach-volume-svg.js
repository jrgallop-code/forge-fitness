/* Shared Level Up coach volume renderer. Uses the exact Level Up exercise-volume
 * calculation, weighted primary/secondary credits, anatomy SVG assets, and
 * Arctic band colours. Client session volume stays demo until account syncing. */
import {getWeeklyPlanVolume,formatSetCredits} from "./js/workouts/plan-muscle-volume.js";

const MALE_FRONT = {
  Shoulders:["muscle_front_009","muscle_front_010"], Chest:["muscle_front_011","muscle_front_012"], Biceps:["muscle_front_015","muscle_front_016"], Triceps:["muscle_front_013","muscle_front_014"],
  Forearms:["muscle_front_033","muscle_front_034","muscle_front_037","muscle_front_038","muscle_front_041","muscle_front_042"], Back:["muscle_front_007","muscle_front_008"],
  Core:["muscle_front_017","muscle_front_018","muscle_front_019","muscle_front_020","muscle_front_021","muscle_front_022","muscle_front_023","muscle_front_024","muscle_front_025","muscle_front_026","muscle_front_027","muscle_front_028","muscle_front_029","muscle_front_030","muscle_front_031","muscle_front_032","muscle_front_035","muscle_front_036","muscle_front_039","muscle_front_040","muscle_front_043","muscle_front_044","muscle_front_045","muscle_front_046"],
  Adductors:["muscle_front_047","muscle_front_048","muscle_front_065","muscle_front_066"], Quads:["muscle_front_049","muscle_front_050","muscle_front_051","muscle_front_052","muscle_front_067","muscle_front_068","muscle_front_069","muscle_front_070"], Calves:["muscle_front_073","muscle_front_074","muscle_front_075","muscle_front_076","muscle_front_077","muscle_front_078","muscle_front_079","muscle_front_080"]
};
const MALE_BACK = {"Rear Delts":["muscle_back_016","muscle_back_017"],Back:["muscle_back_012","muscle_back_013","muscle_back_020","muscle_back_021","muscle_back_022","muscle_back_023","muscle_back_028","muscle_back_029","muscle_back_050","muscle_back_051","muscle_back_074","muscle_back_075"],Triceps:["muscle_back_024","muscle_back_025","muscle_back_034","muscle_back_035","muscle_back_040","muscle_back_041"],Forearms:["muscle_back_056","muscle_back_057","muscle_back_064","muscle_back_065","muscle_back_068","muscle_back_069","muscle_back_070","muscle_back_071"],Glutes:["muscle_back_078","muscle_back_079","muscle_back_080","muscle_back_081"],Hamstrings:["muscle_back_096","muscle_back_097","muscle_back_113","muscle_back_114","muscle_back_118","muscle_back_119","muscle_back_120","muscle_back_121","muscle_back_126","muscle_back_127"],Calves:["muscle_back_134","muscle_back_135","muscle_back_136","muscle_back_137","muscle_back_140","muscle_back_141","muscle_back_142","muscle_back_143","muscle_back_148","muscle_back_149"]};
// The traced female source labels the hand shapes as "forearms" and combines
// some upper-arm/forearm paths in the same groups. Use the individual arm
// paths here so recovery never paints the hands and each visible region has a
// single canonical recovery state, matching the male map.
const FEMALE_FRONT={
  Shoulders:["female_front_shoulders_l","female_front_shoulders_r"],
  Chest:["female_front_chest_l","female_front_chest_r"],
  Biceps:["muscle_female_front_013","muscle_female_front_014"],
  Triceps:["muscle_female_front_019","muscle_female_front_020"],
  Forearms:["muscle_female_front_027","muscle_female_front_028","female_front_triceps_l","female_front_triceps_r"],
  Back:[],
  Core:["female_front_core"],
  Adductors:["female_front_adductors_l","female_front_adductors_r"],
  Quads:["female_front_quads_l","female_front_quads_r"],
  Calves:["female_front_calves_l","female_front_calves_r"]
};
const FEMALE_BACK={
  "Rear Delts":["female_back_delts_l","female_back_delts_r"],
  Back:["female_back_back"],
  Triceps:["muscle_female_back_016","muscle_female_back_018","muscle_female_back_017","muscle_female_back_019"],
  Forearms:["muscle_female_back_022","muscle_female_back_029"],
  Glutes:["female_back_glutes_l","female_back_glutes_r"],
  Hamstrings:["female_back_hamstrings_l","female_back_hamstrings_r"],
  Calves:["female_back_calves_l","female_back_calves_r"]
};

const PALETTE=['#6558A6','#427BC4','#23A7BE','#62B86C','#E6CC55','#E99A43','#DC655D'];
const BANDS=['0','0.5–2','2.5–4','4.5–6','6.5–8','8.5–10','10.5–12','12.5+'];
const SRC="/assets/recovery/";
const el=(tag,a={},children=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(a)){if(k==="className")n.className=v;else if(k==="text")n.textContent=v;else n.setAttribute(k,v)}n.append(...children);return n};
function color(value){const index=Math.min(7,Math.ceil(Number(value||0)/2));return index?PALETTE[index-1]:"#e3e7ec"}
const format=n=>formatSetCredits(n).replace(/ sets?$/,"");
function anatomy(side,sex,volume){const back=side==="back",female=sex==="female",regions=female?(back?FEMALE_BACK:FEMALE_FRONT):(back?MALE_BACK:MALE_FRONT),filename=(female?"female-":"")+(back?"back":"front")+"-view.svg",asset=SRC+filename,ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
const viewBox=back&&!female?"960 0 960 1920":"0 0 960 1920";svg.setAttribute("viewBox",viewBox);svg.setAttribute("class","coach-volume-anatomy");svg.setAttribute("role","img");svg.setAttribute("aria-label",(back?"Back":"Front")+" anatomy, planned muscle set distribution");const image=document.createElementNS(ns,"image");image.setAttribute("href",asset);image.setAttribute("x",back&&!female?"960":"0");image.setAttribute("y","0");image.setAttribute("width","960");image.setAttribute("height","1920");svg.append(image);
for(const [muscle,ids] of Object.entries(regions)){const count=volume.get(muscle)||0;for(const id of ids){const shape=document.createElementNS(ns,"use");shape.setAttribute("href",asset+"#"+id);shape.setAttribute("class","coach-volume-region");shape.setAttribute("data-muscle",muscle);shape.setAttribute("data-set-credits",String(count));shape.style.setProperty("fill",color(count));shape.style.setProperty("fill-opacity",count>0?".82":"0");shape.style.setProperty("stroke","#ffffff");shape.style.setProperty("stroke-opacity",count>0?".6":"0");shape.style.setProperty("stroke-width","1.4");svg.append(shape)}}return svg}
export function renderCoachVolume(target,input,{title="Weekly planned set distribution",sex="male",demo=false}={}){
const volume=input instanceof Map?input:getWeeklyPlanVolume(input||{days:[]}),root=el("section",{className:"coach-volume-visual"});const active=[...volume.entries()].filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));const total=[...volume.values()].reduce((a,b)=>a+b,0);root.append(el("div",{className:"coach-volume-visual-head"},[el("h3",{text:title}),el("p",{className:"sub",text:format(total)+" effective set credits · primary 1.0 / secondary 0.5"+(demo?" · demo data":"")})]));
const controls=el("div",{className:"coach-volume-controls"}),sexSelect=el("select",{"aria-label":"Anatomy model"});[["Male anatomy","male"],["Female anatomy","female"]].forEach(([label,v])=>{const opt=el("option",{value:v,text:label});sexSelect.append(opt)});sexSelect.value=sex;controls.append(el("label",{text:"Anatomy: "}),sexSelect);root.append(controls);
const maps=el("div",{className:"coach-volume-maps"});
function draw(){maps.replaceChildren();for(const side of ["front","back"]){const card=el("div",{className:"coach-volume-map"},[el("strong",{text:side==="front"?"Front":"Back"}),anatomy(side,sexSelect.value,volume)]);maps.append(card)}}sexSelect.onchange=draw;draw();root.append(maps);
const legend=el("div",{className:"coach-volume-legend"});BANDS.forEach((label,i)=>legend.append(el("div",{},[el("i"),el("small",{text:label})])));[...legend.children].forEach((item,i)=>item.querySelector("i").style.background=i?PALETTE[i-1]:"#e3e7ec");root.append(legend);
const rows=el("div",{className:"coach-volume-breakdown"});if(!active.length)rows.append(el("p",{className:"sub",text:"No weighted working sets in this program."}));active.forEach(([muscle,sets])=>{const row=el("div",{className:"coach-volume-breakdown-row"},[el("strong",{text:muscle}),el("div",{className:"coach-volume-meter"},[el("div")]),el("span",{text:format(sets)+" sets"})]);row.querySelector(".coach-volume-meter>div").style.width=Math.min(100,sets/12*100)+"%";row.querySelector(".coach-volume-meter>div").style.background=color(sets);rows.append(row)});root.append(el("h3",{text:"Sets per muscle group"}),rows);target.replaceChildren(root);return root;
}
const DEMO={
"Sarah Carter":[["Chest",12],["Back",14],["Shoulders",8],["Biceps",6],["Triceps",6],["Quads",10],["Hamstrings",8],["Glutes",8],["Calves",4],["Core",6]],
"Mike Johnson":[["Chest",10],["Back",12],["Shoulders",8],["Biceps",4],["Triceps",6],["Quads",12],["Hamstrings",8],["Glutes",10],["Calves",5],["Core",4]],
"Katie Lee":[["Chest",6],["Back",8],["Shoulders",6],["Biceps",3],["Triceps",3],["Quads",8],["Hamstrings",6],["Glutes",6],["Calves",3],["Core",5]]
};
document.addEventListener("levelup:coach-client-profile-rendered",event=>{const {name,tab,container}=event.detail||{};if(tab!=="training"||!container)return;const host=el("div",{className:"card coach-volume-host"});container.append(host);renderCoachVolume(host,new Map(DEMO[name]||[]),{title:"Client weekly training volume",demo:true});});
document.addEventListener("levelup:coach-program-rendered",event=>{const plan=event.detail?.plan,root=document.getElementById("coach-full-builder-volume");if(!root||!plan)return;renderCoachVolume(root,plan,{title:"Workout program · Weekly volume"})});
try{const draft=JSON.parse(localStorage.getItem("levelup_coach_full_editor_v1")||"null");const root=document.getElementById("coach-full-builder-volume");if(draft?.days&&root)renderCoachVolume(root,draft,{title:"Workout program · Weekly volume"})}catch{}
