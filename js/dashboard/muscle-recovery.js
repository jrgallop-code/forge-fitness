import { getExerciseById } from "../workouts/exercise-library.js";

const SESSION_KEY = "forge_workout_sessions";
const MUSCLE_ORDER = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves"];

export function renderMuscleRecoveryDashboard() {
    const recovery = getMuscleRecovery();
    const ready = recovery.filter(item => item.status === "Ready").length;
    return `<section class="section-card muscle-recovery-card"><div class="dashboard-card-heading"><div><span class="eyebrow">TRAINING RECOVERY</span><h2>Muscle Recovery</h2></div><span class="recovery-summary">${recovery.length ? `${ready}/${recovery.length} ready` : "No data"}</span></div><p class="recovery-intro">Estimated from when each muscle group was last trained. This is a training guide, not a direct measure of biological recovery.</p>${recovery.length ? `<div class="recovery-list">${recovery.map(renderRecoveryRow).join("")}</div><button class="secondary-btn recovery-details-toggle" type="button" data-recovery-details>View Recovery Details</button><div class="recovery-details" data-recovery-details-panel hidden><strong>How Level Up estimates recovery</strong><p>Less than 48 hours is shown as Recovering, 48–72 hours as Nearly Ready, and 72+ hours as Ready. Future versions can personalize this using volume and performance.</p></div>` : `<div class="empty-state"><strong>No recovery history yet</strong><p>Complete workouts and Level Up will estimate recovery for the muscle groups you train.</p></div>`}</section>`;
}

export function initializeMuscleRecoveryDashboard() {
    const button = document.querySelector("[data-recovery-details]");
    const panel = document.querySelector("[data-recovery-details-panel]");
    if (!button || !panel) return;
    button.addEventListener("click", () => { panel.hidden = !panel.hidden; button.textContent = panel.hidden ? "View Recovery Details" : "Hide Recovery Details"; });
}

function getMuscleRecovery() {
    const latest = new Map();
    getSessions().forEach(session => {
        const time = getSessionTime(session); if (!time) return;
        (session.exercises || []).forEach(exercise => {
            if (!hasPerformedSet(exercise)) return;
            const definition = getExerciseById(exercise.exerciseId);
            const muscle = normalizeMuscle(definition?.muscleGroup || exercise.muscleGroup); if (!muscle) return;
            if (time > (latest.get(muscle) || 0)) latest.set(muscle, time);
        });
    });
    return [...latest.entries()].map(([muscle, time]) => { const hours = Math.max(0, (Date.now() - time) / 3600000); return { muscle, hours, status: getStatus(hours) }; }).sort((a,b) => sortMuscles(a.muscle,b.muscle));
}
function renderRecoveryRow(item) { return `<div class="recovery-row"><div><strong>${escapeHtml(item.muscle)}</strong><span>${formatElapsed(item.hours)}</span></div><span class="recovery-status recovery-${item.status.toLowerCase().replace(/\s+/g,"-")}">${item.status}</span></div>`; }
function getStatus(hours) { if (hours < 48) return "Recovering"; if (hours < 72) return "Nearly Ready"; return "Ready"; }
function formatElapsed(hours) { if (hours < 1) return "Trained recently"; if (hours < 24) return `${Math.floor(hours)}h ago`; const days=Math.floor(hours/24); return days===1?"Yesterday":`${days} days ago`; }
function hasPerformedSet(exercise) { return (exercise?.sets || []).some(set => Number(set?.reps)>0 || Number(set?.weight)>0 || Number(set?.duration)>0); }
function getSessions() { try { const value=JSON.parse(localStorage.getItem(SESSION_KEY)||"[]"); return Array.isArray(value)?value:[]; } catch { return []; } }
function getSessionTime(session) { const raw=session?.completedAt||session?.endTime||session?.date; if(!raw)return 0; const time=new Date(raw).getTime(); return Number.isFinite(time)?time:0; }
function normalizeMuscle(value) { const text=String(value||"").trim(); if(!text||/cardio|other/i.test(text))return ""; const aliases={Quadriceps:"Quads",Hamstring:"Hamstrings",Shoulder:"Shoulders",Glute:"Glutes",Calf:"Calves"}; return aliases[text]||text; }
function sortMuscles(a,b) { const ai=MUSCLE_ORDER.indexOf(a),bi=MUSCLE_ORDER.indexOf(b); if(ai<0&&bi<0)return a.localeCompare(b); if(ai<0)return 1;if(bi<0)return -1;return ai-bi; }
function escapeHtml(value) { return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
