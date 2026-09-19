import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { calculateWorkoutVolume } from "./volume-calculator.js?v=two-dumbbells-1";
import { repairWorkoutSessionList, resolveSessionExerciseIdentity } from "./session-exercise-identity.js?v=repair-generic-exercise-1";
import { UNIT_KINDS, formatMass as formatUnitMass } from "../core/unit-system.js?v=granular-units-1";
import { getAnatomyConfig } from "../core/anatomy-profile.js?v=female-recovery-parity-1";
import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=profile-appearance-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const ARM_HERO_URL = "assets/workout-complete-arm.webp?v=2";
const APP_URL = "https://leveluphypertrophy.com";
let completionClickAt = 0;

document.addEventListener("click", event => {
  const button = event.target.closest?.("#save-session-btn");
  if (!button) return;
  const logger = button.closest("#workout-session-logger");
  if (!logger || logger.dataset.editingSessionId) return;
  completionClickAt = Date.now();
  window.setTimeout(showLatestCompletedWorkout, 160);
}, true);

window.addEventListener("levelup:workout-completed", event => {
  const sessionId = event.detail?.sessionId;
  window.setTimeout(() => {
    const sessions = readSessions();
    const completed = sessions.find(session => session.id === sessionId);
    if (completed) renderRecap(completed, sessions.filter(session => session.id !== completed.id));
  }, 0);
});

function showLatestCompletedWorkout() {
  const sessions = readSessions();
  const latest = [...sessions].filter(s => s?.completedAt).sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
  if (!latest) return;
  const completedAt = new Date(latest.completedAt).getTime();
  if (!Number.isFinite(completedAt) || Math.abs(completedAt - completionClickAt) > 6000) return;
  renderRecap(latest, sessions.filter(session => session.id !== latest.id));
}

function renderRecap(session, history) {
  const existing = document.querySelector("[data-workout-complete-recap]");
  if (existing?.dataset.recapSessionId === session.id) return;
  existing?.remove();
  const stats = summarizeSession(session);
  const wins = findWins(session, history, stats);
  const muscleStats = getMuscleSetStats(session);
  const trained = muscleStats.map(item => item.muscle);
  const topSets = getTopSets(session);
  const dayName = session.trainingDayName || session.planName || "Workout";
  const workoutNumber = history.filter(item => item?.completedAt).length + 1;
  const profileName = String(getNutritionProfile()?.displayName || "").trim();
  const payload = { session, stats, wins, muscleStats, trained, topSets, dayName, workoutNumber, profileName };
  const overlay = document.createElement("section");
  overlay.className = "workout-complete-recap";
  overlay.dataset.workoutCompleteRecap = "true";
  overlay.dataset.recapSessionId = session.id;
  overlay.innerHTML = `
    <div class="workout-complete-recap__confetti" aria-hidden="true">${renderConfetti()}</div>
    <div class="workout-complete-recap__sheet" role="dialog" aria-modal="true" aria-label="Workout complete celebration">
      <header class="workout-complete-recap__header">
        <button type="button" class="workout-complete-recap__close" data-recap-done aria-label="Close">×</button>
        <div class="workout-complete-recap__title-wrap"><span class="workout-complete-recap__kicker">WORKOUT</span><h2>COMPLETE!</h2><p>⚡ ${escapeHtml(dayName)} <span>•</span> ${formatDurationShort(session.durationMs)}</p></div>
      </header>
      <div class="workout-complete-recap__carousel" data-recap-carousel>
        ${renderCelebrationSlide(payload)}${renderMuscleSlide(payload)}${renderTotalsSlide(payload)}${renderAchievementsSlide(payload)}${renderTopSetsSlide(payload)}
      </div>
      <div class="workout-complete-recap__dots" role="tablist" aria-label="Workout recap cards">${["Celebration","Muscles","Totals","Achievements","Top sets"].map((label,index) => `<button type="button" class="${index === 0 ? "is-active" : ""}" data-recap-dot="${index}" aria-label="Show ${label} card" aria-selected="${index === 0}"></button>`).join("")}</div>
      <p class="workout-complete-recap__swipe-hint">Swipe for more workout highlights</p>
      <section class="workout-complete-recap__share-panel">
        <div><strong>SHARE YOUR WORKOUT</strong><small>Share the card on screen · Tag @leveluphypertrophy</small></div>
        <div class="workout-complete-recap__share-actions">
          <button type="button" data-recap-share="instagram"><span>◎</span><small>Instagram</small></button>
          <button type="button" data-recap-share="share"><span>↗</span><small>Share</small></button>
          <button type="button" data-recap-share="download"><span>↓</span><small>Download</small></button>
          <button type="button" data-recap-share="copy"><span>⧉</span><small>Copy summary</small></button>
        </div><p class="workout-complete-recap__share-status" data-recap-share-status role="status" aria-live="polite"></p>
      </section>
      <button type="button" class="primary-btn workout-complete-recap__done" data-recap-done>DONE</button>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add("workout-recap-open");
  overlay.querySelectorAll("[data-recap-done]").forEach(button => button.addEventListener("click", closeRecap));
  initializeCarousel(overlay);
  initializeShareActions(overlay, payload);
}

function slideFrame(kind, eyebrow, title, content, profileName) {
  return `<article class="workout-complete-recap__slide is-${kind}" data-recap-slide="${kind}"><div class="workout-complete-recap__card-head"><span>${escapeHtml(eyebrow)}</span><b>${escapeHtml(title)}</b></div>${content}<footer><strong>LEVEL UP</strong><span>${profileName ? `@${escapeHtml(profileName.replace(/^@/, ""))}` : "LEVELUPHYPERTROPHY.COM"}</span></footer></article>`;
}
function renderCelebrationSlide(data) { return slideFrame("celebration", `Workout #${data.workoutNumber}`, "YOU CRUSHED IT", `<div class="workout-complete-recap__celebration-copy"><small>YOU ARE</small><strong>CRUSHING IT</strong><span>TODAY!</span></div><div class="workout-complete-recap__body-glow is-arm-hero" data-arm-hero-installed="true"><img class="workout-complete-recap__arm-hero" src="${ARM_HERO_URL}" alt="Muscular arm holding a dumbbell" decoding="sync" fetchpriority="high"></div><p class="workout-complete-recap__card-caption">${escapeHtml(data.dayName)} · ${formatDurationShort(data.session.durationMs)} · ${data.wins.length} ${data.wins.length === 1 ? "win" : "wins"}</p>`, data.profileName); }
function renderMuscleSlide(data) { const top=data.muscleStats.slice(0,5), total=top.reduce((sum,item)=>sum+item.sets,0); return slideFrame("muscles", "Muscles trained", "TODAY'S WORK", `<div class="workout-complete-recap__anatomy-pair">${renderAnatomy("front",data.trained)}${renderAnatomy("back",data.trained)}</div><div class="workout-complete-recap__muscle-summary"><strong>${data.trained.length} MUSCLE GROUPS</strong><span>${total||data.stats.workingSets} working sets</span></div><div class="workout-complete-recap__muscle-chips">${top.length?top.map(item=>`<span>${escapeHtml(item.muscle)} <b>${item.sets}</b></span>`).join(""):"<span>Workout logged</span>"}</div>`, data.profileName); }
function renderTotalsSlide(data) { return slideFrame("totals", "Training totals", "THE WORK ADDS UP", `<div class="workout-complete-recap__volume"><small>YOU LIFTED A TOTAL OF</small><strong>${formatUnitMass(data.stats.volume,0,UNIT_KINDS.LIFTING_WEIGHT)}</strong><span>${volumeComparison(data.stats.volume)}</span></div><div class="workout-complete-recap__metric-grid"><div><b>${data.stats.workingSets}</b><span>Working sets</span></div><div><b>${data.stats.totalReps}</b><span>Total reps</span></div><div><b>${data.stats.exerciseCount}</b><span>Exercises</span></div><div><b>${formatDurationShort(data.session.durationMs)}</b><span>Duration</span></div></div>`, data.profileName); }
function renderAchievementsSlide(data) { return slideFrame("achievements", "Session wins", "LEVEL UP!", `<div class="workout-complete-recap__achievement-count"><span>🏆</span><strong>${data.wins.filter(win=>/PR/.test(win.type)).length}</strong><small>PERSONAL RECORDS</small></div><div class="workout-complete-recap__achievement-list">${data.wins.slice(0,3).map(win=>`<div><span>${win.icon}</span><p><small>${escapeHtml(win.type)}</small><strong>${escapeHtml(win.title)}</strong></p><b>${escapeHtml(win.value)}</b></div>`).join("")}</div><p class="workout-complete-recap__card-caption">${escapeHtml(buildInsight(data.wins,data.stats,data.trained))}</p>`, data.profileName); }
function renderTopSetsSlide(data) { const rows=data.topSets.length?data.topSets.slice(0,3).map((item,index)=>`<div><span>${index+1}</span><p><strong>${escapeHtml(item.name)}</strong><small>${formatUnitMass(item.weight,1,UNIT_KINDS.LIFTING_WEIGHT)} × ${item.reps} reps</small></p><b>${formatUnitMass(item.estimatedOneRepMax,0,UNIT_KINDS.LIFTING_WEIGHT)}<small>EST. 1RM</small></b></div>`).join(""):`<p class="workout-complete-recap__empty">Complete weighted sets to build your top-set recap.</p>`; return slideFrame("top-sets", "Strongest sets", "TOP PERFORMANCES", `<div class="workout-complete-recap__top-sets">${rows}</div><p class="workout-complete-recap__card-caption">Built from this workout's heaviest estimated one-rep maxes.</p>`, data.profileName); }

function renderAnatomy(side, trained) { const {asset,regions,viewBox,imageX}=getAnatomyConfig(side), trainedSet=new Set(trained.map(normalizeMuscle)); const paths=Object.entries(regions).flatMap(([muscle,ids])=>ids.map(id=>{const href=`${asset}#${id}`;return `<use href="${href}" xlink:href="${href}" class="workout-complete-recap__anatomy-muscle ${trainedSet.has(normalizeMuscle(muscle))?"is-trained":""}"/>`;})).join(""); return `<figure><svg viewBox="${viewBox}" role="img" aria-label="${side} view of muscles trained" xmlns:xlink="http://www.w3.org/1999/xlink"><image href="${asset}" xlink:href="${asset}" x="${imageX}" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>${paths}</svg><figcaption>${side}</figcaption></figure>`; }

function initializeCarousel(overlay) { const carousel=overlay.querySelector("[data-recap-carousel]"),slides=[...carousel.children],dots=[...overlay.querySelectorAll("[data-recap-dot]")];let frame=0;const update=()=>{frame=0;const index=Math.max(0,Math.min(slides.length-1,Math.round(carousel.scrollLeft/Math.max(1,carousel.clientWidth))));overlay.dataset.activeRecapSlide=String(index);dots.forEach((dot,i)=>{dot.classList.toggle("is-active",i===index);dot.setAttribute("aria-selected",String(i===index));});};carousel.addEventListener("scroll",()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);},{passive:true});dots.forEach((dot,index)=>dot.addEventListener("click",()=>slides[index].scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})));overlay.dataset.activeRecapSlide="0"; }
function initializeShareActions(overlay,payload) { overlay.querySelectorAll("[data-recap-share]").forEach(button=>button.addEventListener("click",async()=>{const action=button.dataset.recapShare,status=overlay.querySelector("[data-recap-share-status]");button.disabled=true;status.textContent=action==="copy"?"Copying…":"Preparing your workout card…";try{if(action==="copy"){await copySummary(payload);status.textContent="Workout summary copied.";return;}const index=Number(overlay.dataset.activeRecapSlide||0),blob=await createShareImage(payload,index),file=new File([blob],`level-up-${slug(payload.dayName)}.png`,{type:"image/png"});if(action==="download"){downloadBlob(blob,file.name);status.textContent="Workout card downloaded.";return;}if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:`${payload.dayName} · Level Up`,text:shareText(payload),files:[file]});status.textContent=action==="instagram"?"Choose Instagram or Stories in the share sheet.":"Workout shared.";}else{downloadBlob(blob,file.name);status.textContent=action==="instagram"?"Image downloaded—open Instagram to add it to a post or Story.":"Image downloaded for sharing.";}}catch(error){status.textContent=error?.name==="AbortError"?"Sharing cancelled.":"Couldn't create that share card. Try Download instead.";}finally{button.disabled=false;}})); }

async function createShareImage(data,index) { const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext("2d"),styles=getComputedStyle(document.documentElement),accent=styles.getPropertyValue("--accent").trim()||styles.getPropertyValue("--red").trim()||"#ef1728",bg=styles.getPropertyValue("--bg").trim()||"#070708";ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);const glow=ctx.createRadialGradient(540,430,20,540,430,620);glow.addColorStop(0,hexWithAlpha(accent,"3f"));glow.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,1080,1100);roundRect(ctx,70,70,940,1160,58);ctx.fillStyle="#111116";ctx.fill();ctx.strokeStyle=hexWithAlpha(accent,"88");ctx.lineWidth=3;ctx.stroke();drawText(ctx,"LEVEL UP",540,142,34,900,"#fff");const titles=["YOU CRUSHED IT","TODAY'S WORK","THE WORK ADDS UP","LEVEL UP!","TOP PERFORMANCES"],brows=[`WORKOUT #${data.workoutNumber}`,"MUSCLES TRAINED","TRAINING TOTALS","SESSION WINS","STRONGEST SETS"];drawText(ctx,brows[index]||brows[0],540,205,24,800,accent);drawText(ctx,titles[index]||titles[0],540,268,53,950,"#fff");if(index===1)await drawMuscleShareCard(ctx,data,accent);else if(index===2)drawTotalsShareCard(ctx,data,accent);else if(index===3)drawAchievementShareCard(ctx,data,accent);else if(index===4)drawTopSetsShareCard(ctx,data,accent);else drawCelebrationShareCard(ctx,data,accent);drawText(ctx,data.profileName?`@${data.profileName.replace(/^@/,"")}`:"LEVELUPHYPERTROPHY.COM",540,1178,24,700,"#b7b7bf");drawText(ctx,"leveluphypertrophy.com",540,1300,23,700,accent);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Image export failed")),"image/png",.95)); }
function drawCelebrationShareCard(ctx,data,accent){drawText(ctx,"YOU ARE",540,390,35,900,"#fff");drawText(ctx,"CRUSHING IT",540,505,94,950,accent);drawText(ctx,"TODAY!",540,570,42,900,"#fff");drawStatPill(ctx,150,720,240,170,String(data.stats.workingSets),"WORKING SETS",accent);drawStatPill(ctx,420,720,240,170,String(data.stats.totalReps),"TOTAL REPS",accent);drawStatPill(ctx,690,720,240,170,formatDurationShort(data.session.durationMs),"DURATION",accent);drawText(ctx,data.dayName,540,1005,42,850,"#fff");drawText(ctx,`${data.wins.length} ${data.wins.length===1?"WIN":"WINS"} THIS WORKOUT`,540,1060,24,800,accent);}
function drawTotalsShareCard(ctx,data,accent){drawText(ctx,"YOU LIFTED A TOTAL OF",540,410,28,800,"#d5d5db");drawText(ctx,formatUnitMass(data.stats.volume,0,UNIT_KINDS.LIFTING_WEIGHT),540,545,90,950,"#fff");drawText(ctx,volumeComparison(data.stats.volume),540,610,28,700,accent);drawStatPill(ctx,155,760,350,190,String(data.stats.workingSets),"WORKING SETS",accent);drawStatPill(ctx,575,760,350,190,String(data.stats.totalReps),"TOTAL REPS",accent);drawText(ctx,`${data.stats.exerciseCount} exercises · ${formatDurationShort(data.session.durationMs)}`,540,1050,30,750,"#fff");}
function drawAchievementShareCard(ctx,data,accent){const prs=data.wins.filter(w=>/PR/.test(w.type)).length;drawText(ctx,"🏆",540,430,100,900,"#fff");drawText(ctx,String(prs),540,585,130,950,accent);drawText(ctx,"PERSONAL RECORDS",540,640,30,850,"#fff");data.wins.slice(0,3).forEach((win,i)=>{const y=750+i*115;drawText(ctx,win.type,245,y,22,800,accent,"left");drawText(ctx,win.title,245,y+35,25,750,"#fff","left");drawText(ctx,win.value,830,y+20,28,900,"#fff","right");});}
function drawTopSetsShareCard(ctx,data,accent){data.topSets.slice(0,3).forEach((item,i)=>{const y=395+i*210;ctx.fillStyle="#19191f";roundRect(ctx,135,y,810,165,28);ctx.fill();drawText(ctx,String(i+1),190,y+95,52,950,accent);drawText(ctx,item.name,255,y+65,30,850,"#fff","left");drawText(ctx,`${formatUnitMass(item.weight,1,UNIT_KINDS.LIFTING_WEIGHT)} × ${item.reps} reps`,255,y+112,25,650,"#b7b7bf","left");drawText(ctx,`${formatUnitMass(item.estimatedOneRepMax,0,UNIT_KINDS.LIFTING_WEIGHT)} e1RM`,885,y+92,25,850,accent,"right");});if(!data.topSets.length)drawText(ctx,"Weighted top sets will appear here.",540,650,32,700,"#b7b7bf");}
async function drawMuscleShareCard(ctx,data,accent){try{const [front,back]=await Promise.all([makeAnatomyImage("front",data.trained,accent),makeAnatomyImage("back",data.trained,accent)]);ctx.drawImage(front,210,335,260,650);ctx.drawImage(back,610,335,260,650);}catch{drawText(ctx,data.trained.join(" · ")||"Workout complete",540,620,35,800,accent);}drawText(ctx,`${data.trained.length} MUSCLE GROUPS · ${data.stats.workingSets} WORKING SETS`,540,1050,28,850,"#fff");}
async function makeAnatomyImage(side,trained,accent){const config=getAnatomyConfig(side),response=await fetch(config.asset);if(!response.ok)throw new Error("Anatomy unavailable");const source=await response.text(),doc=new DOMParser().parseFromString(source,"image/svg+xml"),ids=Object.entries(config.regions).filter(([muscle])=>trained.some(item=>normalizeMuscle(item)===normalizeMuscle(muscle))).flatMap(([,values])=>values),uses=ids.map(id=>`<use href="#${id}" style="fill:${accent}!important;stroke:${accent}!important;opacity:1;filter:drop-shadow(0 0 10px ${accent})"/>`).join(""),svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${config.viewBox}">${doc.documentElement.innerHTML}<g>${uses}</g></svg>`,blob=new Blob([svg],{type:"image/svg+xml"}),url=URL.createObjectURL(blob);try{return await loadImage(url);}finally{URL.revokeObjectURL(url);}}
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});}
function drawStatPill(ctx,x,y,w,h,value,label,accent){ctx.fillStyle="#19191f";roundRect(ctx,x,y,w,h,26);ctx.fill();drawText(ctx,value,x+w/2,y+78,42,950,"#fff");drawText(ctx,label,x+w/2,y+125,18,800,accent);}
function drawText(ctx,text,x,y,size,weight,color,align="center"){ctx.save();ctx.fillStyle=color;ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillText(String(text),x,y);ctx.restore();}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function hexWithAlpha(color,alpha){return /^#[0-9a-f]{6}$/i.test(color)?`${color}${alpha}`:"rgba(225,6,0,.25)";}

function renderConfetti(){return Array.from({length:18},(_,i)=>`<i style="--i:${i};--x:${(i*37)%96}%;--d:${(i%7)*.12}s"></i>`).join("");}
function isCompletedSet(set){return Boolean(set?.completed||(Number(set?.reps)>0&&set?.weight!==null));}
function isWorkingSet(set){return isCompletedSet(set)&&!set?.isWarmup&&set?.type!=="warmup";}
function summarizeSession(session){let workingSets=0,exerciseCount=0,totalReps=0;(session.exercises||[]).forEach(item=>{if(item.trackingType==="notes"){if(Number(item.durationMinutes)>0)exerciseCount+=1;return;}const sets=(item.sets||[]).filter(isWorkingSet);if(sets.length)exerciseCount+=1;workingSets+=sets.length;totalReps+=sets.reduce((sum,set)=>sum+(Number(set.reps)||0),0);});return{workingSets,totalReps,volume:calculateWorkoutVolume(session),exerciseCount};}
function getMuscleSetStats(session){const totals=new Map();(session.exercises||[]).forEach(item=>{const count=item.trackingType==="notes"?0:(item.sets||[]).filter(isWorkingSet).length;if(!count)return;const raw=item.muscleGroup||getExerciseById(item.exerciseId)?.muscleGroup;if(!raw)return;String(raw).split(/[,/&]/).map(value=>value.trim()).filter(Boolean).forEach(muscle=>totals.set(muscle,(totals.get(muscle)||0)+count));});return[...totals].map(([muscle,sets])=>({muscle,sets})).sort((a,b)=>b.sets-a.sets);}
function getTopSets(session){const best=new Map();(session.exercises||[]).forEach(item=>{if(item.trackingType==="notes")return;const name=resolveSessionExerciseIdentity(item).name;(item.sets||[]).filter(isWorkingSet).forEach(set=>{const weight=Number(set.weight)||0,reps=Number(set.reps)||0;if(!weight||!reps)return;const estimatedOneRepMax=weight*(1+reps/30);if(!best.has(name)||estimatedOneRepMax>best.get(name).estimatedOneRepMax)best.set(name,{name,weight,reps,estimatedOneRepMax});});});return[...best.values()].sort((a,b)=>b.estimatedOneRepMax-a.estimatedOneRepMax);}
function findWins(session,history,stats){const wins=[],priorByExercise=new Map();history.forEach(old=>(old.exercises||[]).forEach(item=>{if(!priorByExercise.has(item.exerciseId))priorByExercise.set(item.exerciseId,[]);priorByExercise.get(item.exerciseId).push(item);}));(session.exercises||[]).forEach(item=>{if(item.trackingType==="notes")return;const current=(item.sets||[]).filter(isWorkingSet),prior=(priorByExercise.get(item.exerciseId)||[]).flatMap(old=>old.sets||[]).filter(isWorkingSet);if(!current.length||!prior.length)return;const currentWeight=Math.max(...current.map(s=>Number(s.weight)||0)),priorWeight=Math.max(...prior.map(s=>Number(s.weight)||0)),exerciseName=resolveSessionExerciseIdentity(item).name;if(currentWeight>priorWeight)wins.push({type:"WEIGHT PR",icon:"🏆",title:exerciseName,value:formatUnitMass(currentWeight,1,UNIT_KINDS.LIFTING_WEIGHT),detail:"NEW RECORD!",isNew:true});const currentReps=Math.max(...current.map(s=>Number(s.reps)||0)),priorReps=Math.max(...prior.map(s=>Number(s.reps)||0));if(currentReps>priorReps)wins.push({type:"REPS PR",icon:"★",title:exerciseName,value:`${currentReps} REPS`,detail:"NEW RECORD!",isNew:true});});const priorVolumes=history.map(s=>summarizeSession(s).volume).filter(v=>v>0),bestPrior=priorVolumes.length?Math.max(...priorVolumes):0;if(stats.volume>bestPrior&&bestPrior>0)wins.unshift({type:"VOLUME PR",icon:"🏆",title:"Total Workout Volume",value:formatUnitMass(stats.volume,0,UNIT_KINDS.LIFTING_WEIGHT),detail:"NEW RECORD!",isNew:true});const sevenDayCount=countWorkoutsLast7Days(session,history);if(sevenDayCount>=2)wins.push({type:"CONSISTENCY",icon:"🔥",title:`${sevenDayCount} workouts in the last 7 days`,value:sevenDayCount>=4?"STRONG RUN":"KEEP ROLLING",detail:"Momentum matters."});const unique=wins.filter((win,index,array)=>array.findIndex(x=>`${x.type}|${x.title}`===`${win.type}|${win.title}`)===index).slice(0,5);return unique.length?unique:[{type:"SESSION WIN",icon:"⚡",title:"Workout completed",value:`${stats.workingSets} SETS`,detail:"YOU SHOWED UP."}];}
function countWorkoutsLast7Days(session,history){const anchorValue=session?.date?`${String(session.date).slice(0,10)}T12:00:00`:(session?.completedAt||Date.now()),anchor=new Date(anchorValue);if(!Number.isFinite(anchor.getTime()))return 1;const start=new Date(anchor);start.setHours(0,0,0,0);start.setDate(start.getDate()-6);const end=new Date(anchor);end.setHours(0,0,0,0);end.setDate(end.getDate()+1);return[session,...history].filter(s=>{const value=s?.date?`${String(s.date).slice(0,10)}T12:00:00`:(s?.completedAt||0),d=new Date(value);return Number.isFinite(d.getTime())&&d>=start&&d<end;}).length;}
function buildInsight(wins,stats,muscles){const muscleText=muscles.length?muscles.slice(0,3).join(", "):"Your target muscles",pr=wins.find(win=>/PR/.test(win.type));return pr?`${muscleText} got strong work today. You set a ${pr.type.toLowerCase()} — excellent session.`:`${muscleText} got strong work today. ${stats.workingSets} working sets banked.`;}
function volumeComparison(volume){const value=Number(volume)||0;if(value>=10000)return"That's more than a small car.";if(value>=5000)return"That's serious work moved.";if(value>=2000)return"Every rep added up.";return"A strong session in the bank.";}
function shareText(data){return`${data.dayName} complete: ${data.stats.workingSets} working sets, ${data.stats.totalReps} reps, ${formatUnitMass(data.stats.volume,0,UNIT_KINDS.LIFTING_WEIGHT)} total volume. ${APP_URL}`;}
async function copySummary(data){const text=shareText(data);if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
function slug(value){return String(value||"workout").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"workout";}
function normalizeMuscle(value){const key=String(value||"").trim().toLowerCase();if(["abs","abdominals","obliques"].includes(key))return"core";if(["lats","upper back","lower back","traps"].includes(key))return"back";if(["delts","deltoids"].includes(key))return"shoulders";if(key==="rear deltoids")return"rear delts";if(key==="quadriceps")return"quads";return key;}
function closeRecap(){document.querySelector("[data-workout-complete-recap]")?.remove();document.body.classList.remove("workout-recap-open");document.querySelector("#workout-session-logger")?.remove();document.querySelector('.nav-btn[data-page="workout"]')?.click();}
function readSessions(){try{const parsed=JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)||"[]");if(!Array.isArray(parsed))return[];const repaired=repairWorkoutSessionList(parsed);if(repaired.changed)localStorage.setItem(SESSION_STORAGE_KEY,JSON.stringify(repaired.sessions));return repaired.sessions;}catch{return[];}}
function formatDurationShort(ms){const total=Math.max(0,Math.round((Number(ms)||0)/60000));return`${total} min`;}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
