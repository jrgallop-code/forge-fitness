/* Coach strength/ exercise analytics, driven only by authorized session snapshots.
 * Reuse the athlete app's exact overall strength-index algorithm and renderer.
 * No sessions? Display "not connected" instead of fabricated client scores.
 */
import {buildStrengthIndexPoints} from "./js/progress/overall-strength-index.js";
import {drawStrengthIndexChart,renderStrengthIndexSummary} from "./js/progress/strength-index-chart-renderer.js";
import {getExerciseById} from "./js/workouts/exercise-library.js";
const KEY="levelup_coach_session_snapshots_v1";
const E=(tag,attrs={},kids=[])=>{const node=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="className")node.className=v;else if(k==="text")node.textContent=v;else if(k==="onClick")node.addEventListener("click",v);else node.setAttribute(k,v)}node.append(...kids);return node};
function read(){try{const o=JSON.parse(localStorage.getItem(KEY)||"{}");return o&&typeof o==="object"?o:{}}catch{return {}}}
function getSessions(name){return (read()[name]||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x?.date)&&Array.isArray(x.exercises)).sort((a,b)=>a.date.localeCompare(b.date))}
function showProfile(ev){const {name,clientId,tab,container}=ev.detail||{};if(!name||!container||!["training","progress"].includes(tab))return;
const panel=E("section",{className:"card coach-strength-panel"}),intro=E("p",{className:"sub",text:"Overall strength uses Level Up's original scoring model. Exercise history includes estimated 1RM (Epley), best set, tonnage and set volume from completed sessions."});
const head=E("div",{className:"row between"},[E("h3",{text:"Strength & Exercise Analytics"}),E("span",{className:"sub",text:"Level Up calculation"})]);panel.append(head,intro);
const cloudData=clientId?window.levelupCoachLiveData?.get(clientId):null;
const sessions=clientId?(Array.isArray(cloudData?.sessions)?cloudData.sessions:[]):[];
const connectionInfo=E("p",{className:"sub",text:clientId?(cloudData?"Connected Level Up workout history · last cloud sync "+(cloudData.cloudUpdatedAt||"unknown"):"Waiting for authorized client cloud data."): "This is a demonstration client. Connect a real Level Up account to view strength scores and exercise analytics without importing files."});panel.append(connectionInfo);
const result=buildStrengthIndexPoints(sessions);
const strength=E("div",{className:"coach-strength-summary"}),canvas=E("canvas",{className:"coach-strength-chart"});
canvas.style.width="100%";canvas.style.height="245px";panel.append(strength);
if(result.points.length){const latest=result.points.at(-1);renderStrengthIndexSummary(strength,latest);panel.append(canvas);requestAnimationFrame(()=>drawStrengthIndexChart(canvas,result.points))}
else strength.append(E("strong",{text:"Strength Score — Not available"}),E("p",{className:"sub",text:"Requires valid performances on at least two dates for two core movement categories in the client's logged workout history."}));
const byExercise=new Map();sessions.forEach(session=>(session.exercises||[]).forEach(ex=>{const id=String(ex.exerciseId||ex.id||"");if(!id)return;const valid=(ex.sets||[]).filter(s=>Number(s.weight)>0&&Number(s.reps)>0);if(!valid.length)return;const record=byExercise.get(id)||{id,sessions:0,totalSets:0,volume:0,bestWeight:0,bestE1rm:0,bestReps:0,history:[]};record.sessions++;record.totalSets+=valid.length;valid.forEach(s=>{const w=Number(s.weight),r=Number(s.reps);record.volume+=w*r;record.bestWeight=Math.max(record.bestWeight,w);record.bestReps=Math.max(record.bestReps,r);record.bestE1rm=Math.max(record.bestE1rm,w*(1+r/30))});record.history.push([session.date,Math.round(Math.max(...valid.map(s=>Number(s.weight)*(1+Number(s.reps)/30)))*10)/10]);byExercise.set(id,record)}));
const list=E("div",{className:"coach-strength-exercises"});list.append(E("h3",{text:"Exercise analytics · "+byExercise.size+" exercises"}));
const q=E("input",{type:"search",placeholder:"Search exercise analytics…"}),filter=E("select"),results=E("div");
for(const [label,value] of [["All exercises","all"],["Most recently trained","recent"],["Highest tonnage","volume"]])filter.append(E("option",{value,text:label}));
const redraw=()=>{results.replaceChildren();let items=[...byExercise.values()].filter(x=>(getExerciseById(x.id)?.name||x.id).toLowerCase().includes(q.value.toLowerCase()));if(filter.value==="volume")items.sort((a,b)=>b.volume-a.volume);else if(filter.value==="recent")items.sort((a,b)=>b.history.at(-1)[0].localeCompare(a.history.at(-1)[0]));else items.sort((a,b)=>(getExerciseById(a.id)?.name||a.id).localeCompare(getExerciseById(b.id)?.name||b.id));for(const record of items){const card=E("details",{className:"coach-strength-exercise"});card.append(E("summary",{text:(getExerciseById(record.id)?.name||record.id)+" · "+record.sessions+" workouts"}));const stats=E("div",{className:"coach-strength-stats"});for(const [k,v] of [["Best e1RM",record.bestE1rm.toFixed(1)+" lb"],["Best load",record.bestWeight+" lb"],["Highest reps",String(record.bestReps)],["Working sets",String(record.totalSets)],["Logged tonnage",Math.round(record.volume).toLocaleString()+" lb"]])stats.append(E("div",{},[E("small",{text:k}),E("strong",{text:v})]));card.append(stats);record.history.slice(-12).forEach(([date,val])=>card.append(E("p",{className:"sub",text:date+" · Estimated 1RM "+val+" lb"})));results.append(card)}};q.oninput=redraw;filter.onchange=redraw;list.append(q,filter,results);redraw();panel.append(list);container.append(panel)}
document.addEventListener("levelup:coach-client-profile-rendered",showProfile);

document.addEventListener("levelup:coach-live-data-updated",ev=>{const id=ev.detail?.clientId;const current=document.querySelector("#clients .coach-client-tabs button.active");if(id&&current&&["Training","Progress"].includes(current.textContent.trim()))current.click()});
