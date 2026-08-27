import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { calculateWorkoutVolume } from "./volume-calculator.js?v=two-dumbbells-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const ARM_HERO_URL = "assets/workout-complete-arm.webp?v=2";

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
    if (!completed) return;
    renderRecap(completed, sessions.filter(session => session.id !== completed.id));
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
  const trained = getTrainedMuscles(session);
  const dayName = session.trainingDayName || session.planName || "Workout";
  const overlay = document.createElement("section");
  overlay.className = "workout-complete-recap";
  overlay.dataset.workoutCompleteRecap = "true";
  overlay.dataset.recapSessionId = session.id;
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

      ${renderCoachSummary(session)}

      <section class="workout-complete-recap__hero">
        <div class="workout-complete-recap__crushing"><small>YOU ARE</small><strong>CRUSHING IT</strong><small>TODAY!</small></div>
        <div class="workout-complete-recap__body-glow is-arm-hero" data-arm-hero-installed="true">
          <img class="workout-complete-recap__arm-hero" src="${ARM_HERO_URL}" alt="Muscular arm holding a dumbbell" decoding="sync" fetchpriority="high">
        </div>
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

function renderCoachSummary(session) {
  const recommendations = session?.adaptiveGuidance?.recommendations || [];
  if (!recommendations.length) return "";
  const hasPlanChange = recommendations.some(item => item.type === "volume" || item.type === "deload");
  return `
    <section class="adaptive-coach-summary" data-adaptive-session-id="${escapeHtml(session.id)}">
      <div class="adaptive-coach-heading">
        <span class="adaptive-coach-kicker">ADAPTIVE COACH <em>BETA</em></span>
        <h3>Coach Summary</h3>
        <p>${hasPlanChange ? "Suggestions only—nothing changes unless you apply it." : "Based on this workout and your feedback."}</p>
      </div>
      <div class="adaptive-recommendation-list">
        ${recommendations.map(renderCoachRecommendation).join("")}
      </div>
    </section>`;
}

function renderCoachRecommendation(recommendation) {
  const presentation = coachRecommendationPresentation(recommendation);
  if (recommendation.status) {
    const status = recommendation.status === "applied" ? "Applied" : recommendation.type === "hold" ? "Acknowledged" : "Kept current";
    return `<article class="adaptive-recommendation adaptive-recommendation--${presentation.tone}"><span class="adaptive-recommendation-kicker">${presentation.label}</span><strong>${escapeHtml(recommendation.title)}</strong><p class="adaptive-recommendation-status">${escapeHtml(status)}</p></article>`;
  }
  if (recommendation.type === "status") {
    return `<article class="adaptive-recommendation adaptive-recommendation--${presentation.tone}"><span class="adaptive-recommendation-kicker">${presentation.label}</span><strong>${escapeHtml(recommendation.title)}</strong><p>${escapeHtml(recommendation.reason)}</p></article>`;
  }
  const primaryAction = recommendation.type === "volume"
    ? `<button class="primary-btn" type="button" data-adaptive-action="apply-volume" data-recommendation-id="${escapeHtml(recommendation.id)}">Apply</button>`
    : recommendation.type === "deload"
      ? `<button class="primary-btn" type="button" data-adaptive-action="start-deload" data-recommendation-id="${escapeHtml(recommendation.id)}">Start deload</button>`
      : "";
  return `
    <article class="adaptive-recommendation adaptive-recommendation--${presentation.tone}">
      <span class="adaptive-recommendation-kicker">${presentation.label}</span>
      <strong>${escapeHtml(recommendation.title)}</strong>
      <p>${escapeHtml(recommendation.reason)}</p>
      <div class="adaptive-recommendation-actions">
        ${primaryAction}
        <button class="secondary-btn" type="button" data-adaptive-action="dismiss" data-recommendation-id="${escapeHtml(recommendation.id)}">${recommendation.type === "hold" ? "Got it" : "Keep current"}</button>
      </div>
    </article>`;
}

function coachRecommendationPresentation(recommendation) {
  if (recommendation?.type === "deload") return { tone: "recovery", label: "RECOVERY RECOMMENDATION" };
  if (recommendation?.type === "hold") return { tone: "caution", label: "TRAINING CAUTION" };
  if (recommendation?.type === "volume" && Number(recommendation.delta) > 0) return { tone: "progress", label: "PROGRESS OPTION" };
  if (recommendation?.type === "volume") return { tone: "caution", label: "RECOVERY OPTION" };
  return { tone: "steady", label: "NEXT WORKOUT" };
}

function renderConfetti() {
  return Array.from({length:18}, (_,i) => `<i style="--i:${i};--x:${(i*37)%96}%;--d:${(i%7)*.12}s"></i>`).join("");
}

function summarizeSession(session) {
  let workingSets=0, exerciseCount=0;
  (session.exercises || []).forEach(item => {
    if (item.trackingType === "notes") { if (Number(item.durationMinutes)>0) exerciseCount += 1; return; }
    const sets=(item.sets||[]).filter(set => set.completed || (Number(set.reps)>0 && set.weight !== null));
    if (sets.length) exerciseCount += 1;
    workingSets += sets.length;
  });
  return {workingSets,volume:calculateWorkoutVolume(session),exerciseCount};
}

function getTrainedMuscles(session) {
  const muscles=new Set();
  (session.exercises||[]).forEach(item => {
    const active=item.trackingType === "notes" ? Number(item.durationMinutes)>0 : (item.sets||[]).some(set => set.completed || Number(set.reps)>0);
    if (!active) return;
    const muscle=item.muscleGroup||getExerciseById(item.exerciseId)?.muscleGroup;
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
    const exerciseName=item.name||item.exerciseName||exercise?.name||"Exercise";
    if (currentWeight>priorWeight) wins.push({type:"WEIGHT PR",icon:"🏆",title:exerciseName,value:`${formatNumber(currentWeight)} lb`,detail:"NEW RECORD!",isNew:true});
    const currentReps=Math.max(...current.map(s=>Number(s.reps)||0));
    const priorReps=Math.max(...prior.map(s=>Number(s.reps)||0));
    if (currentReps>priorReps) wins.push({type:"REPS PR",icon:"★",title:exerciseName,value:`${currentReps} REPS`,detail:"NEW RECORD!",isNew:true});
  });
  const priorVolumes=history.map(s=>summarizeSession(s).volume).filter(v=>v>0);
  const bestPrior=priorVolumes.length?Math.max(...priorVolumes):0;
  if (stats.volume>bestPrior && bestPrior>0) wins.unshift({type:"VOLUME PR",icon:"🏆",title:"Total Workout Volume",value:`${formatNumber(stats.volume)} lb`,detail:"NEW RECORD!",isNew:true});

  const sevenDayCount=countWorkoutsLast7Days(session,history);
  if (sevenDayCount>=2) wins.push({type:"CONSISTENCY",icon:"🔥",title:`${sevenDayCount} workouts in the last 7 days`,value:sevenDayCount>=4?"STRONG RUN":"KEEP ROLLING",detail:"Momentum matters."});

  const unique=wins.filter((win,index,array)=>array.findIndex(x=>`${x.type}|${x.title}`===`${win.type}|${win.title}`)===index).slice(0,5);
  if (unique.length) return unique;
  return [{type:"SESSION WIN",icon:"⚡",title:"Workout completed",value:`${stats.workingSets} SETS`,detail:"YOU SHOWED UP."}];
}

function countWorkoutsLast7Days(session, history) {
  const anchorValue = session?.date
    ? `${String(session.date).slice(0,10)}T12:00:00`
    : (session?.completedAt || Date.now());
  const anchor = new Date(anchorValue);
  if (!Number.isFinite(anchor.getTime())) return 1;
  const start = new Date(anchor);
  start.setHours(0,0,0,0);
  start.setDate(start.getDate()-6);
  const end = new Date(anchor);
  end.setHours(0,0,0,0);
  end.setDate(end.getDate()+1);
  return [session,...history].filter(s => {
    const value = s?.date
      ? `${String(s.date).slice(0,10)}T12:00:00`
      : (s?.completedAt || 0);
    const d = new Date(value);
    return Number.isFinite(d.getTime()) && d>=start && d<end;
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
