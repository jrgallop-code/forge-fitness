/* Coach anatomy volume maps. Uses the same front/back SVG assets, region IDs,
 * set bands, and completed set credits as the Level Up athlete app.
 * Rendering is scoped to the selected athlete's synced data.
 */
import {getSetBandColor,renderSetRangeLegend} from "./js/core/muscle-map-colors.js";
import {getExerciseImpacts} from "./js/workouts/plan-muscle-volume.js";
import "./js/workouts/exercise-library-expansion.js";
const MALE_FRONT={
  Shoulders:["muscle_front_009","muscle_front_010"], Chest:["muscle_front_011","muscle_front_012"], Biceps:["muscle_front_015","muscle_front_016"], Triceps:["muscle_front_013","muscle_front_014"],
  Forearms:["muscle_front_033","muscle_front_034","muscle_front_037","muscle_front_038","muscle_front_041","muscle_front_042"], Back:["muscle_front_007","muscle_front_008"],
  Core:["muscle_front_017","muscle_front_018","muscle_front_019","muscle_front_020","muscle_front_021","muscle_front_022","muscle_front_023","muscle_front_024","muscle_front_025","muscle_front_026","muscle_front_027","muscle_front_028","muscle_front_029","muscle_front_030","muscle_front_031","muscle_front_032","muscle_front_035","muscle_front_036","muscle_front_039","muscle_front_040","muscle_front_043","muscle_front_044","muscle_front_045","muscle_front_046"],
  Adductors:["muscle_front_047","muscle_front_048","muscle_front_065","muscle_front_066"], Quads:["muscle_front_049","muscle_front_050","muscle_front_051","muscle_front_052","muscle_front_067","muscle_front_068","muscle_front_069","muscle_front_070"], Calves:["muscle_front_073","muscle_front_074","muscle_front_075","muscle_front_076","muscle_front_077","muscle_front_078","muscle_front_079","muscle_front_080"]
};
const MALE_BACK={"Rear Delts":["muscle_back_016","muscle_back_017"],Back:["muscle_back_012","muscle_back_013","muscle_back_020","muscle_back_021","muscle_back_022","muscle_back_023","muscle_back_028","muscle_back_029","muscle_back_050","muscle_back_051","muscle_back_074","muscle_back_075"],Triceps:["muscle_back_024","muscle_back_025","muscle_back_034","muscle_back_035","muscle_back_040","muscle_back_041"],Forearms:["muscle_back_056","muscle_back_057","muscle_back_064","muscle_back_065","muscle_back_068","muscle_back_069","muscle_back_070","muscle_back_071"],Glutes:["muscle_back_078","muscle_back_079","muscle_back_080","muscle_back_081"],Hamstrings:["muscle_back_096","muscle_back_097","muscle_back_113","muscle_back_114","muscle_back_118","muscle_back_119","muscle_back_120","muscle_back_121","muscle_back_126","muscle_back_127"],Calves:["muscle_back_134","muscle_back_135","muscle_back_136","muscle_back_137","muscle_back_140","muscle_back_141","muscle_back_142","muscle_back_143","muscle_back_148","muscle_back_149"]};
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

const create=(tag,parent,props={})=>{const node=document.createElement(tag);for(const[k,v]of Object.entries(props)){if(k==="text")node.textContent=v;else node.setAttribute(k,v)}parent?.append(node);return node};
function volume(profile,days){
 const cutoff=new Date();cutoff.setUTCDate(cutoff.getUTCDate()-(days-1));const start=cutoff.toISOString().slice(0,10);
 const totals=new Map();let records=0;
 for(const entry of (profile?.training?.recentExerciseSets||[])){
  if(!entry?.date||entry.date<start||!(Number(entry.sets)>0))continue;
  records++;
  for(const [muscle,credit] of getExerciseImpacts({id:entry.exerciseId})){
   if(!muscle||muscle==="Other")continue;
   totals.set(muscle,(totals.get(muscle)||0)+credit*Number(entry.sets));
  }
 }
 return{totals,records};
}
function anatomyFigure(parent,sex,side,totals){
 const female=sex==="female",back=side==="back";
 const asset="assets/recovery/"+(female?"female-":"")+(back?"back":"front")+"-view.svg";
 const regions=female?(back?FEMALE_BACK:FEMALE_FRONT):(back?MALE_BACK:MALE_FRONT);
 const wrapper=create("figure",parent,{"class":"cf-anatomy-figure"});
 const xmlns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(xmlns,"svg");svg.setAttribute("viewBox",female?"0 0 960 1920":back?"960 0 960 1920":"0 0 960 1920");svg.setAttribute("role","img");svg.setAttribute("aria-label",(back?"Back":"Front")+" muscle set heat map");svg.setAttribute("class","cf-volume-anatomy");
 const image=document.createElementNS(xmlns,"image");image.setAttribute("href",asset);image.setAttribute("x",back&&!female?"960":"0");image.setAttribute("y","0");image.setAttribute("width","960");image.setAttribute("height","1920");image.setAttribute("preserveAspectRatio","xMidYMid meet");svg.append(image);
 for(const [muscle,ids]of Object.entries(regions)){
  const sets=Math.round((totals.get(muscle)||0)*10)/10;
  for(const id of ids){
   const use=document.createElementNS(xmlns,"use");use.setAttribute("href",asset+"#"+id);use.setAttribute("xlink:href",asset+"#"+id);use.style.setProperty("fill",getSetBandColor(sets),"important");use.style.setProperty("opacity","0.95");use.setAttribute("data-muscle",muscle);const title=document.createElementNS(xmlns,"title");title.textContent=muscle+" · "+sets+" credited sets";use.append(title);svg.append(use);
  }
 }
 wrapper.append(svg);create("figcaption",wrapper,{text:back?"Back":"Front"});
}
export function renderCoachMuscleMaps(host,profile){
 const card=create("section",host,{"class":"cf-card cf-anatomy-card"}),header=create("header",card);
 create("strong",header,{text:"Muscle Volume Heat Maps"});create("small",header,{text:"Level Up anatomical view"});
 const body=create("div",card,{"class":"cf-body"});
 const row=create("div",body,{"class":"cf-anatomy-controls"});create("span",row,{text:"Completed training volume"});
 const range=create("select",row,{"aria-label":"Muscle volume timeframe"});for(const [days,label]of [[7,"Last 7 days"],[28,"Last 28 days"]])create("option",range,{value:String(days),text:label});range.value="7";
 const figureArea=create("div",body,{"class":"cf-anatomy-bodies"}),detail=create("div",body,{"class":"cf-muted"});
 function redraw(){
  figureArea.replaceChildren();detail.replaceChildren();
  const result=volume(profile,Number(range.value));
  if(!result.records){create("p",detail,{text:"No completed exercise sets available for this period in the athlete's synced backup."});return}
  const sex=profile?.profile?.sex==="female"?"female":"male";
  anatomyFigure(figureArea,sex,"front",result.totals);anatomyFigure(figureArea,sex,"back",result.totals);
  const legend=document.createElement("div");legend.className="cf-anatomy-legend";legend.innerHTML=renderSetRangeLegend();for(let i=0;i<8;i++){const swatch=legend.querySelectorAll(".set-range-legend b")[i];if(swatch)swatch.style.background=getSetBandColor(i===0?0:i*2)}detail.append(legend);
  create("p",detail,{text:"Primary muscles receive 1 set credit, secondary muscles 0.5. Based on completed logged sets; missing sync history is not treated as zero."});
 }
 range.onchange=redraw;redraw();
}
export function injectCoachMuscleStyles(){
 if(document.getElementById("cf-anatomy-style"))return;
 const css=create("style",document.head,{id:"cf-anatomy-style"});
 css.textContent="#coach-functional-profile .cf-anatomy-card .cf-anatomy-controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between}#coach-functional-profile .cf-anatomy-bodies{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start;margin-top:12px}#coach-functional-profile .cf-anatomy-figure{margin:0;background:#f6f8fc;border:1px solid #dae4ee;border-radius:12px;padding:10px;min-width:0;display:grid;justify-items:center}#coach-functional-profile .cf-volume-anatomy{width:100%;height:320px;max-width:230px;object-fit:contain}#coach-functional-profile .cf-anatomy-figure figcaption{margin-top:4px;color:#657d95;font-size:12px;font-weight:700}#coach-functional-profile .cf-anatomy-legend{overflow-x:auto;margin-top:12px}#coach-functional-profile .cf-anatomy-legend .set-range-legend{display:grid;gap:5px;font-size:11px}#coach-functional-profile .cf-anatomy-legend .set-range-legend>div{display:flex;flex-wrap:wrap;gap:8px}#coach-functional-profile .cf-anatomy-legend .set-range-legend span{display:flex;align-items:center;gap:4px}#coach-functional-profile .cf-anatomy-legend .set-range-legend b{width:12px;height:12px;display:inline-block;border-radius:2px}#coach-functional-profile .cf-anatomy-legend .set-range-legend small{color:#70829c}@media(max-width:550px){#coach-functional-profile .cf-volume-anatomy{height:260px}}";
}
