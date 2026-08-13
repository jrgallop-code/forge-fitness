import { getExerciseById } from "./exercise-library.js";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const FRONT_ASSET = "assets/recovery/front-body-map.svg";

const FRONT_PARTS = [
  ["front-shoulder-left","Shoulders"],["front-shoulder-right","Shoulders"],
  ["front-chest-left","Chest"],["front-chest-right","Chest"],
  ["front-biceps-left","Biceps"],["front-biceps-right","Biceps"],
  ["front-forearm-left-outer","Forearms"],["front-forearm-left-inner","Forearms"],
  ["front-forearm-right-outer","Forearms"],["front-forearm-right-inner","Forearms"],
  ["front-abs-upper-left","Core"],["front-abs-upper-right","Core"],
  ["front-abs-mid-left","Core"],["front-abs-mid-right","Core"],
  ["front-abs-lower-left","Core"],["front-abs-lower-right","Core"],
  ["front-oblique-left","Core"],["front-oblique-right","Core"],
  ["front-quad-left-outer","Quads"],["front-quad-left-inner","Quads"],
  ["front-quad-right-inner","Quads"],["front-quad-right-outer","Quads"],
  ["front-calf-left","Calves"],["front-calf-right","Calves"]
];

let completionClickAt = 0;

document.addEventListener("click", event => {
  const button = event.target.closest?.("#save-session-btn");
  if (!button) return;
  const logger = button.closest("#workout-session-logger");
  if (!logger || logger.dataset.editingSessionId) return;
  completionClickAt = Date.now();
  window.setTimeout(showLatestCompletedWorkout, 160);
}, true);

function showLatestCompletedWorkout() {
  const sessions = readSessions();
  const latest = [...sessions].filter(s => s?.completedAt).sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
  if (!latest) return;
  const completedAt = new Date(latest.completedAt).getTime();
  if (!Number.isFinite(completedAt) || Math.abs(completedAt - completionClickAt) > 6000) return;
  renderRecap(latest, sessions.filter(session => session.id !== latest.id));
}

function renderRecap(session, history) {
  document.querySelector("[data-workout-complete-recap]")?.remove();
  const stats = summarizeSession(session);
  const wins = findWins(session, history, stats);
  const trained = getTrainedMuscles(session);
  const dayName = session.trainingDayName || session.planName || "Workout";
  const overlay = document.createElement("section");
  overlay.className = "workout-complete-recap";
  overlay.dataset.workoutCompleteRecap = "true";
  overlay.innerHTML = `
    <div class="workout-complete-recap__confetti" aria-hidden="true">${renderConfetti()}</div>
    <div class="workout-complete-recap__sheet" role="dialog" aria-modal="true" aria-label="Workout complete celebration">
      <header class="workout-complete-recap__header">
        <button type="button" class="workout-complete-recap__close" data-recap-done aria-label="Close">×</button>
        <div class="workout-complete-recap__title-wrap">
          <span class="workout-complete-recap__kicker">WORKOUT</span>
          <h2>COMPLETE!</h2>
          <p>⚡ ${escapeHtml(dayName)} <span>•</span> ${formatDurationShort(session.durationMs)}</p>
        </div>
      </header>

      <section class="workout-complete-recap__hero">
        <div class="workout-complete-recap__crushing"><small>YOU ARE</small><strong>CRUSHING IT</strong><small>TODAY!</small></div>
        <div class="workout-complete-recap__body-glow">${renderFrontBody(trained)}</div>
      </section>

      <section class="workout-complete-recap__levelup">
        <div class="workout-complete-recap__levelup-title"><span>⚡</span><div><strong>LEVEL UP!</strong><small>${wins.length} ${wins.length === 1 ? "WIN" : "WINS"} THIS WORKOUT</small></div><span>⚡</span></div>
        <div class="workout-complete-recap__wins">${wins.map(renderWinCard).join("")}</div>
        ${wins.length > 1 ? `<div class="workout-complete-recap__swipe-note">Swipe achievements →</div>` : ""}
      </section>

      <section class="workout-complete-recap__details-card">
        <h3>WORKOUT DETAILS</h3>
        <div class="workout-complete-recap__stats">
          <div><span class="workout-complete-recap__stat-icon">◷</span><strong>${formatDuration(session.durationMs)}</strong><span>Duration</span></div>
          <div><span class="workout-complete-recap__stat-icon">▥</span><strong>${stats.workingSets}</strong><span>Working Sets</span></div>
          <div><span class="workout-complete-recap__stat-icon">◆</span><strong>${formatNumber(stats.volume)} lb</strong><span>Total Volume</span></div>
          <div><span class="workout-complete-recap__stat-icon">☷</span><strong>${stats.exerciseCount}</strong><span>Exercises</span></div>
        </div>
      </section>

      <section class="workout-complete-recap__insight">
        <span class="workout-complete-recap__insight-icon">💪</span>
        <p>${escapeHtml(buildInsight(wins, stats, trained))}</p>
      </section>
      <button type="button" class="primary-btn workout-complete-recap__done" data-recap-done>DONE</button>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add("workout-recap-open");
  overlay.querySelectorAll("[data-recap-done]").forEach(button => button.addEventListener("click", closeRecap));
}

function renderConfetti() {
  return Array.from({length:18}, (_,i) => `<i style="--i:${i};--x:${(i*37)%96}%;--d:${(i%7)*.12}s"></i>`).join("");
}

function renderFrontBody(trainedMuscles) {
  const trained = new Set(trainedMuscles);
  return `<svg class="workout-complete-recap__anatomy" viewBox="0 0 500 900" role="img" aria-label="Front view of muscles trained">
    <use href="${FRONT_ASSET}#front-base" class="workout-complete-recap__body-base"/>
    ${FRONT_PARTS.map(([id,muscle]) => `<use href="${FRONT_ASSET}#${id}" class="workout-complete-recap__muscle ${trained.has(muscle) ? "is-trained" : ""}"/>`).join("")}
  </svg>`;
}

function summarizeSession(session) {
  let workingSets=0, volume=0, exerciseCount=0;
  (session.exercises || []).forEach(item => {
    if (item.trackingType === "notes") { if (Number(item.durationMinutes)>0) exerciseCount += 1; return; }
    const sets=(item.sets||[]).filter(set => set.completed || (Number(set.reps)>0 && set.weight !== null));
    if (sets.length) exerciseCount += 1;
    workingSets += sets.length;
    sets.forEach(set => { volume += (Number(set.weight)||0)*(Number(set.reps)||0); });
  });
  return {workingSets,volume,exerciseCount};
}

function getTrainedMuscles(session) {
  const muscles=new Set();
  (session.exercises||[]).forEach(item => {
    const active=item.trackingType === "notes" ? Number(item.durationMinutes)>0 : (item.sets||[]).some(set => set.completed || Number(set.reps)>0);
    if (!active) return;
    const muscle=getExerciseById(item.exerciseId)?.muscleGroup;
    if (muscle) muscles.add(muscle);
  });
  return [...muscles];
}

function findWins(session, history, stats) {
  const wins=[];
  const priorByExercise=new Map();
  history.forEach(old => (old.exercises||[]).forEach(item => {
    if (!priorByExercise.has(item.exerciseId)) priorByExercise.set(item.exerciseId,[]);
    priorByExercise.get(item.exerciseId).push(item);
  }));
  (session.exercises||[]).forEach(item => {
    if (item.trackingType === "notes") return;
    const exercise=getExerciseById(item.exerciseId);
    const current=(item.sets||[]).filter(set => set.completed || Number(set.reps)>0);
    const prior=(priorByExercise.get(item.exerciseId)||[]).flatMap(old => old.sets||[]).filter(set => set.completed || Number(set.reps)>0);
    if (!current.length || !prior.length) return;
    const currentWeight=Math.max(...current.map(s=>Number(s.weight)||0));
    const priorWeight=Math.max(...prior.map(s=>Number(s.weight)||0));
    if (currentWeight>priorWeight) wins.push({type:"WEIGHT PR",icon:"🏆",title:exercise?.name||"Exercise",value:`${formatNumber(currentWeight)} lb`,detail:"NEW RECORD!",isNew:true});
    const currentReps=Math.max(...current.map(s=>Number(s.reps)||0));
    const priorReps=Math.max(...prior.map(s=>Number(s.reps)||0));
    if (currentReps>priorReps) wins.push({type:"REPS PR",icon:"★",title:exercise?.name||"Exercise",value:`${currentReps} REPS`,detail:"NEW RECORD!",isNew:true});
  });
  const priorVolumes=history.map(s=>summarizeSession(s).volume).filter(v=>v>0);
  const bestPrior=priorVolumes.length?Math.max(...priorVolumes):0;
  if (stats.volume>bestPrior && bestPrior>0) wins.unshift({type:"VOLUME PR",icon:"🏆",title:"Total Workout Volume",value:`${formatNumber(stats.volume)} lb`,detail:"NEW RECORD!",isNew:true});

  const weekCount=countWorkoutsThisWeek(session,history);
  if (weekCount>=2) wins.push({type:"CONSISTENCY",icon:"🔥",title:`${weekCount} workouts this week`,value:weekCount>=4?"STRONG WEEK":"KEEP ROLLING",detail:"Momentum matters."});

  const unique=wins.filter((win,index,array)=>array.findIndex(x=>`${x.type}|${x.title}`===`${win.type}|${win.title}`)===index).slice(0,5);
  if (unique.length) return unique;
  return [{type:"SESSION WIN",icon:"⚡",title:"Workout completed",value:`${stats.workingSets} SETS`,detail:"YOU SHOWED UP."}];
}

function countWorkoutsThisWeek(session, history) {
  const anchor=new Date(session.completedAt || session.date || Date.now());
  const start=new Date(anchor); start.setHours(0,0,0,0); start.setDate(start.getDate()-((start.getDay()+6)%7));
  const end=new Date(start); end.setDate(end.getDate()+7);
  return [session,...history].filter(s => {
    const d=new Date(s.completedAt || s.date || 0);
    return d>=start && d<end;
  }).length;
}

function renderWinCard(win) {
  return `<article class="workout-complete-recap__win">
    ${win.isNew ? '<span class="workout-complete-recap__new">NEW!</span>' : ""}
    <span class="workout-complete-recap__win-icon">${win.icon}</span>
    <small>${escapeHtml(win.type)}</small>
    <strong>${escapeHtml(win.title)}</strong>
    <b>${escapeHtml(win.value)}</b>
    <span>${escapeHtml(win.detail)}</span>
  </article>`;
}

function buildInsight(wins, stats, muscles) {
  const muscleText=muscles.length ? muscles.slice(0,3).join(", ") : "your target muscles";
  const pr=wins.find(win=>/PR/.test(win.type));
  if (pr) return `${muscleText} got strong work today. You set a ${pr.type.toLowerCase()} — excellent session. Keep building!`;
  return `${muscleText} got strong work today. ${stats.workingSets} working sets banked — excellent session. Keep building!`;
}

function closeRecap() {
  document.querySelector("[data-workout-complete-recap]")?.remove();
  document.body.classList.remove("workout-recap-open");
  document.querySelector("#workout-session-logger")?.remove();
  document.querySelector('.nav-btn[data-page="workout"]')?.click();
}

function readSessions(){try{const parsed=JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)||"[]");return Array.isArray(parsed)?parsed:[];}catch{return[];}}
function formatDuration(ms){const total=Math.max(0,Math.round((Number(ms)||0)/1000));const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return h?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;}
function formatDurationShort(ms){const total=Math.max(0,Math.round((Number(ms)||0)/60000));return `${total} min`;}
function formatNumber(value){return Math.round(Number(value)||0).toLocaleString();}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
