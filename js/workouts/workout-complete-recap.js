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
  window.setTimeout(showLatestCompletedWorkout, 120);
}, true);

function showLatestCompletedWorkout() {
  const sessions = readSessions();
  const latest = [...sessions]
    .filter(session => session?.completedAt)
    .sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  if (!latest) return;
  const completedAt = new Date(latest.completedAt).getTime();
  if (!Number.isFinite(completedAt) || Math.abs(completedAt - completionClickAt) > 5000) return;
  renderRecap(latest, sessions.filter(session => session.id !== latest.id));
}

function renderRecap(session, history) {
  document.querySelector("[data-workout-complete-recap]")?.remove();
  const stats = summarizeSession(session);
  const wins = findWins(session, history, stats);
  const trained = getTrainedMuscles(session);
  const overlay = document.createElement("section");
  overlay.className = "workout-complete-recap";
  overlay.dataset.workoutCompleteRecap = "true";
  overlay.innerHTML = `
    <div class="workout-complete-recap__sheet" role="dialog" aria-modal="true" aria-label="Workout complete summary">
      <header class="workout-complete-recap__header">
        <button type="button" class="workout-complete-recap__close" data-recap-done aria-label="Close">×</button>
        <div><span class="eyebrow">LEVEL UP</span><h2>Workout Complete 🎉</h2><p>${escapeHtml(session.trainingDayName || session.planName || "Workout")} complete. Nice work.</p></div>
      </header>
      <section class="workout-complete-recap__body-map">
        <span class="workout-complete-recap__label">MUSCLES TRAINED</span>
        ${renderFrontBody(trained)}
        <div class="workout-complete-recap__muscle-list">${trained.length ? trained.map(m => `<span>${escapeHtml(m)}</span>`).join("") : "<span>Workout recorded</span>"}</div>
      </section>
      <section class="workout-complete-recap__section">
        <div class="workout-complete-recap__section-head"><span class="workout-complete-recap__label">TODAY'S WINS</span>${wins.length > 1 ? "<small>Swipe →</small>" : ""}</div>
        <div class="workout-complete-recap__wins">${wins.map(renderWinCard).join("")}</div>
      </section>
      <section class="workout-complete-recap__stats">
        <div><strong>${formatDuration(session.durationMs)}</strong><span>Duration</span></div>
        <div><strong>${stats.workingSets}</strong><span>Working Sets</span></div>
        <div><strong>${formatNumber(stats.volume)} lb</strong><span>Total Volume</span></div>
        <div><strong>${stats.exerciseCount}</strong><span>Exercises</span></div>
      </section>
      <section class="workout-complete-recap__insight">
        <span class="workout-complete-recap__label">LEVEL UP INSIGHT</span>
        <p>${escapeHtml(buildInsight(wins, stats, trained))}</p>
      </section>
      <button type="button" class="primary-btn workout-complete-recap__done" data-recap-done>Done</button>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add("workout-recap-open");
  overlay.querySelectorAll("[data-recap-done]").forEach(button => button.addEventListener("click", closeRecap));
}

function renderFrontBody(trainedMuscles) {
  const trained = new Set(trainedMuscles);
  return `<svg class="workout-complete-recap__anatomy" viewBox="0 0 500 900" role="img" aria-label="Front view of muscles trained">
    <use href="${FRONT_ASSET}#front-base" class="workout-complete-recap__body-base"/>
    ${FRONT_PARTS.map(([id,muscle]) => `<use href="${FRONT_ASSET}#${id}" class="workout-complete-recap__muscle ${trained.has(muscle) ? "is-trained" : ""}" data-muscle="${escapeHtml(muscle)}"/>`).join("")}
  </svg>`;
}

function summarizeSession(session) {
  let workingSets = 0;
  let volume = 0;
  let exerciseCount = 0;
  (session.exercises || []).forEach(item => {
    if (item.trackingType === "notes") {
      if (Number(item.durationMinutes) > 0) exerciseCount += 1;
      return;
    }
    const completedSets = (item.sets || []).filter(set => set.completed || (Number(set.reps) > 0 && set.weight !== null));
    if (completedSets.length) exerciseCount += 1;
    workingSets += completedSets.length;
    completedSets.forEach(set => { volume += (Number(set.weight) || 0) * (Number(set.reps) || 0); });
  });
  return { workingSets, volume, exerciseCount };
}

function getTrainedMuscles(session) {
  const muscles = new Set();
  (session.exercises || []).forEach(item => {
    const active = item.trackingType === "notes"
      ? Number(item.durationMinutes) > 0
      : (item.sets || []).some(set => set.completed || Number(set.reps) > 0);
    if (!active) return;
    const muscle = getExerciseById(item.exerciseId)?.muscleGroup;
    if (muscle) muscles.add(muscle);
  });
  return [...muscles];
}

function findWins(session, history, stats) {
  const wins = [];
  const priorByExercise = new Map();
  history.forEach(old => (old.exercises || []).forEach(item => {
    if (!priorByExercise.has(item.exerciseId)) priorByExercise.set(item.exerciseId, []);
    priorByExercise.get(item.exerciseId).push(item);
  }));
  (session.exercises || []).forEach(item => {
    if (item.trackingType === "notes") return;
    const exercise = getExerciseById(item.exerciseId);
    const currentSets = (item.sets || []).filter(set => set.completed || Number(set.reps) > 0);
    if (!currentSets.length) return;
    const priorItems = priorByExercise.get(item.exerciseId) || [];
    const priorSets = priorItems.flatMap(old => old.sets || []).filter(set => set.completed || Number(set.reps) > 0);
    if (!priorSets.length) return;
    const currentWeight = Math.max(...currentSets.map(set => Number(set.weight) || 0));
    const priorWeight = Math.max(...priorSets.map(set => Number(set.weight) || 0));
    if (currentWeight > priorWeight) wins.push({type:"Weight PR",icon:"🏆",title:exercise?.name || "Exercise",value:`${formatNumber(currentWeight)} lb`,detail:`Previous ${formatNumber(priorWeight)} lb`});
    const currentReps = Math.max(...currentSets.map(set => Number(set.reps) || 0));
    const priorReps = Math.max(...priorSets.map(set => Number(set.reps) || 0));
    if (currentReps > priorReps) wins.push({type:"Rep PR",icon:"★",title:exercise?.name || "Exercise",value:`${currentReps} reps`,detail:`Previous ${priorReps} reps`});
  });
  const priorVolumes = history.map(s => summarizeSession(s).volume).filter(v => v > 0);
  const bestPriorVolume = priorVolumes.length ? Math.max(...priorVolumes) : 0;
  if (stats.volume > bestPriorVolume && bestPriorVolume > 0) wins.unshift({type:"Volume PR",icon:"↗",title:"Total Workout Volume",value:`${formatNumber(stats.volume)} lb`,detail:`Previous best ${formatNumber(bestPriorVolume)} lb`});
  const unique = wins.filter((win,index,array) => array.findIndex(x => `${x.type}|${x.title}` === `${win.type}|${win.title}`) === index).slice(0,4);
  if (unique.length) return unique;
  return [{type:"Session Complete",icon:"✓",title:"You showed up",value:`${stats.workingSets} working sets`,detail:"Every session moves the trend forward."}];
}

function renderWinCard(win) {
  return `<article class="workout-complete-recap__win"><span class="workout-complete-recap__win-icon">${win.icon}</span><small>${escapeHtml(win.type)}</small><strong>${escapeHtml(win.title)}</strong><b>${escapeHtml(win.value)}</b><span>${escapeHtml(win.detail)}</span></article>`;
}

function buildInsight(wins, stats, muscles) {
  const pr = wins.find(win => /PR/.test(win.type));
  if (pr) return `Strong session. You earned a ${pr.type.toLowerCase()} on ${pr.title} and completed ${stats.workingSets} working sets${muscles.length ? ` across ${muscles.join(", ")}` : ""}.`;
  return `Workout banked: ${stats.workingSets} working sets across ${stats.exerciseCount} exercises. Consistency is progress, even when today isn't a record day.`;
}

function closeRecap() {
  document.querySelector("[data-workout-complete-recap]")?.remove();
  document.body.classList.remove("workout-recap-open");
  document.querySelector("#workout-session-logger")?.remove();
  document.querySelector('.nav-btn[data-page="workout"]')?.click();
}

function readSessions() {
  try { const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}` : `${minutes}:${String(seconds).padStart(2,"0")}`;
}
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
