import { getExerciseById } from "../workouts/exercise-library.js?v=recovery-map-1";

const SESSION_KEY = "forge_workout_sessions";
const MUSCLE_ORDER = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves"];
const FULL_RECOVERY_HOURS = 72;

export function initializeMuscleRecoveryMap() {
    const tabs = document.querySelector(".training-progress-tabs");
    if (!tabs || document.querySelector('[data-view="recovery"]')) return;

    const historyTab = tabs.querySelector('[data-view="history"]');
    const button = document.createElement("button");
    button.className = "training-progress-tab";
    button.type = "button";
    button.dataset.view = "recovery";
    button.textContent = "Recovery";
    historyTab ? tabs.insertBefore(button, historyTab) : tabs.appendChild(button);

    const lifting = document.getElementById("lifting-progress");
    if (!lifting) return;
    const section = document.createElement("section");
    section.className = "training-progress-view muscle-recovery-map-view";
    section.dataset.view = "recovery";
    section.hidden = true;
    section.innerHTML = renderRecoveryShell();
    lifting.appendChild(section);

    button.addEventListener("click", showRecoveryView);
    section.querySelectorAll("[data-recovery-facing]").forEach(control => control.addEventListener("click", () => setFacing(control.dataset.recoveryFacing)));
    section.querySelector("[data-recovery-details-button]")?.addEventListener("click", showDetails);
    section.querySelector("[data-recovery-map-button]")?.addEventListener("click", showMap);
    renderRecoveryData();
}

function showRecoveryView() {
    document.querySelectorAll(".training-progress-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === "recovery"));
    document.querySelectorAll(".training-progress-view").forEach(view => { view.hidden = view.dataset.view !== "recovery"; });
    renderRecoveryData();
}

function renderRecoveryShell() {
    return `<div class="recovery-map-shell">
        <div class="recovery-map-header"><div><span class="eyebrow">TRAINING RECOVERY</span><h4>Muscle Recovery</h4><p>Based on the same recovery rules Level Up already uses for completed workouts.</p></div><button class="secondary-btn recovery-detail-open" type="button" data-recovery-details-button>View Details</button></div>
        <div data-recovery-map-panel>
            <div class="recovery-summary-strip"><div><strong id="recovery-fresh-count">0</strong><span>Ready muscle groups</span></div><div><strong id="recovery-last-workout">—</strong><span>Last workout</span></div></div>
            <div class="recovery-facing-toggle" role="group" aria-label="Muscle map view"><button class="active" type="button" data-recovery-facing="front">Front</button><button type="button" data-recovery-facing="back">Back</button></div>
            <div class="recovery-scale" aria-label="Recovery scale from fatigued to recovered">
                <div class="recovery-scale-bar"></div>
                <div class="recovery-scale-points">
                    <span><b>0%</b><small>Fatigued</small></span>
                    <span><b>25%</b></span>
                    <span><b>50%</b><small>Recovering</small></span>
                    <span><b>75%</b></span>
                    <span><b>100%</b><small>Recovered</small></span>
                </div>
            </div>
            <div class="recovery-body-wrap" data-recovery-body-front>${frontBodySvg()}</div>
            <div class="recovery-body-wrap" data-recovery-body-back hidden>${backBodySvg()}</div>
            <div class="recovery-map-note">0% represents a recently trained/fatigued muscle. Recovery rises with time and reaches 100% at 72+ hours, matching Level Up's existing thresholds: under 48h Recovering, 48–72h Nearly Ready, and 72+h Ready.</div>
        </div>
        <div data-recovery-details-panel hidden>
            <div class="recovery-detail-top"><button class="secondary-btn" type="button" data-recovery-map-button>← Body Map</button><div><span class="eyebrow">RECOVERY DETAILS</span><h4>Muscle Groups</h4></div></div>
            <div class="recovery-detail-list" data-recovery-detail-list></div>
        </div>
    </div>`;
}

function renderRecoveryData() {
    const recovery = getMuscleRecovery();
    const byMuscle = new Map(recovery.map(item => [item.muscle, item]));
    const ready = recovery.filter(item => item.status === "Ready").length;
    const fresh = document.getElementById("recovery-fresh-count");
    if (fresh) fresh.textContent = String(ready);
    const lastWorkout = document.getElementById("recovery-last-workout");
    if (lastWorkout) lastWorkout.textContent = formatLastWorkout(getLatestWorkoutTime());

    document.querySelectorAll("[data-recovery-muscle]").forEach(shape => {
        const item = byMuscle.get(shape.dataset.recoveryMuscle);
        shape.style.setProperty("--recovery-fill", item ? colorForPercent(item.percent) : "#3b3c46");
        shape.classList.toggle("no-data", !item);
    });

    const list = document.querySelector("[data-recovery-detail-list]");
    if (list) list.innerHTML = MUSCLE_ORDER.map(muscle => renderDetailRow(byMuscle.get(muscle), muscle)).join("");
}

function getMuscleRecovery() {
    const latest = new Map();
    getSessions().forEach(session => {
        const time = getSessionTime(session);
        if (!time) return;
        (session.exercises || []).forEach(exercise => {
            if (!hasPerformedSet(exercise)) return;
            const definition = getExerciseById(exercise.exerciseId);
            const muscle = normalizeMuscle(definition?.muscleGroup || exercise.muscleGroup);
            if (!muscle) return;
            const current = latest.get(muscle);
            const name = definition?.name || exercise.name || "Exercise";
            if (!current || time > current.time) latest.set(muscle, { time, exerciseNames: [name] });
            else if (time === current.time && !current.exerciseNames.includes(name)) current.exerciseNames.push(name);
        });
    });
    return [...latest.entries()].map(([muscle, info]) => {
        const hours = Math.max(0, (Date.now() - info.time) / 3600000);
        return { muscle, hours, percent: Math.min(100, Math.round((hours / FULL_RECOVERY_HOURS) * 100)), status: getStatus(hours), exerciseNames: info.exerciseNames };
    }).sort((a, b) => MUSCLE_ORDER.indexOf(a.muscle) - MUSCLE_ORDER.indexOf(b.muscle));
}

function renderDetailRow(item, muscle) {
    if (!item) return `<article class="recovery-detail-row no-data"><div class="recovery-mini"></div><div><strong>${escapeHtml(muscle)}</strong><span>No recent exercises</span></div><b>—</b></article>`;
    return `<article class="recovery-detail-row"><div class="recovery-mini" style="--recovery-fill:${colorForPercent(item.percent)}"></div><div><strong>${escapeHtml(muscle)}</strong><span>${escapeHtml(item.exerciseNames.join(", "))} · ${formatElapsed(item.hours)}</span><small>${escapeHtml(item.status)}</small></div><b>${item.percent}%</b></article>`;
}

function setFacing(facing) {
    document.querySelectorAll("[data-recovery-facing]").forEach(button => button.classList.toggle("active", button.dataset.recoveryFacing === facing));
    const front = document.querySelector("[data-recovery-body-front]");
    const back = document.querySelector("[data-recovery-body-back]");
    if (front) front.hidden = facing !== "front";
    if (back) back.hidden = facing !== "back";
}
function showDetails() { document.querySelector("[data-recovery-map-panel]")?.setAttribute("hidden", ""); document.querySelector("[data-recovery-details-panel]")?.removeAttribute("hidden"); renderRecoveryData(); }
function showMap() { document.querySelector("[data-recovery-details-panel]")?.setAttribute("hidden", ""); document.querySelector("[data-recovery-map-panel]")?.removeAttribute("hidden"); }
function getStatus(hours) { if (hours < 48) return "Recovering"; if (hours < 72) return "Nearly Ready"; return "Ready"; }
function colorForPercent(percent) { const p = Math.max(0, Math.min(100, Number(percent) || 0)); if (p < 50) return `hsl(${Math.round(p * .8)},88%,55%)`; if (p < 85) return `hsl(${Math.round(40 + (p - 50) * 1.25)},82%,50%)`; return `hsl(${Math.round(84 + (p - 85) * 1.6)},68%,48%)`; }
function formatElapsed(hours) { if (hours < 1) return "trained recently"; if (hours < 24) return `${Math.floor(hours)}h ago`; const days = Math.floor(hours / 24); return days === 1 ? "yesterday" : `${days} days ago`; }
function formatLastWorkout(time) { if (!time) return "No data"; const hours = Math.max(0, (Date.now() - time) / 3600000); return hours < 24 ? `${Math.max(0, Math.floor(hours))}h ago` : formatElapsed(hours); }
function getLatestWorkoutTime() { return Math.max(0, ...getSessions().map(getSessionTime)); }
function hasPerformedSet(exercise) { return (exercise?.sets || []).some(set => Number(set?.reps) > 0 || Number(set?.weight) > 0 || Number(set?.duration) > 0 || Number(set?.durationMinutes) > 0); }
function getSessions() { try { const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function getSessionTime(session) { const raw = session?.completedAt || session?.endTime || session?.date; if (!raw) return 0; const time = new Date(raw).getTime(); return Number.isFinite(time) ? time : 0; }
function normalizeMuscle(value) { const text = String(value || "").trim(); if (!text || /cardio|other/i.test(text)) return ""; const aliases = { Quadriceps: "Quads", Hamstring: "Hamstrings", Shoulder: "Shoulders", Glute: "Glutes", Calf: "Calves" }; return aliases[text] || text; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }

function frontBodySvg() { return `<svg class="recovery-body-svg" viewBox="0 0 300 620" role="img" aria-label="Front muscle recovery map"><g class="body-outline"><circle cx="150" cy="48" r="31"/><path d="M121 78 96 103 72 119 57 163 48 229 34 302 48 309 65 241 78 184 94 168 104 226 95 307 103 396 112 493 128 579 144 579 141 489 139 407 150 322 161 407 159 489 156 579 172 579 188 493 197 396 205 307 196 226 206 168 222 184 235 241 252 309 266 302 252 229 243 163 228 119 204 103 179 78Z"/></g><g class="muscles"><path data-recovery-muscle="Shoulders" d="M98 111Q73 114 66 143l20 24 18-47Z"/><path data-recovery-muscle="Shoulders" d="M202 111Q227 114 234 143l-20 24-18-47Z"/><path data-recovery-muscle="Chest" d="M105 118Q128 104 147 118v67q-32 2-47-22Z"/><path data-recovery-muscle="Chest" d="M195 118Q172 104 153 118v67q32 2 47-22Z"/><path data-recovery-muscle="Biceps" d="M74 168q-15 30-13 71 18 13 31-13l8-51Z"/><path data-recovery-muscle="Biceps" d="M226 168q15 30 13 71-18 13-31-13l-8-51Z"/><path data-recovery-muscle="Quads" d="M110 322q-17 76 2 145 23-7 28-78l5-63Z"/><path data-recovery-muscle="Quads" d="M190 322q17 76-2 145-23-7-28-78l-5-63Z"/><path data-recovery-muscle="Calves" d="M116 462q-12 52 5 98l13-25 4-65Z"/><path data-recovery-muscle="Calves" d="M184 462q12 52-5 98l-13-25-4-65Z"/></g></svg>`; }
function backBodySvg() { return `<svg class="recovery-body-svg" viewBox="0 0 300 620" role="img" aria-label="Back muscle recovery map"><g class="body-outline"><circle cx="150" cy="48" r="31"/><path d="M121 78 96 103 72 119 57 163 48 229 34 302 48 309 65 241 78 184 94 168 104 226 95 307 103 396 112 493 128 579 144 579 141 489 139 407 150 322 161 407 159 489 156 579 172 579 188 493 197 396 205 307 196 226 206 168 222 184 235 241 252 309 266 302 252 229 243 163 228 119 204 103 179 78Z"/></g><g class="muscles"><path data-recovery-muscle="Shoulders" d="M98 111Q73 114 66 143l20 24 18-47Z"/><path data-recovery-muscle="Shoulders" d="M202 111Q227 114 234 143l-20 24-18-47Z"/><path data-recovery-muscle="Back" d="M108 112q42-23 84 0l17 67-31 82-28 33-28-33-31-82Z"/><path data-recovery-muscle="Triceps" d="M72 164q-13 39-8 78 18 8 29-17l7-53Z"/><path data-recovery-muscle="Triceps" d="M228 164q13 39 8 78-18 8-29-17l-7-53Z"/><path data-recovery-muscle="Glutes" d="M104 292q21-18 45 7v55q-39 12-51-19Z"/><path data-recovery-muscle="Glutes" d="M196 292q-21-18-45 7v55q39 12 51-19Z"/><path data-recovery-muscle="Hamstrings" d="M108 354q-8 70 8 119 21-12 25-76l4-40Z"/><path data-recovery-muscle="Hamstrings" d="M192 354q8 70-8 119-21-12-25-76l-4-40Z"/><path data-recovery-muscle="Calves" d="M116 464q-12 52 5 98l13-25 4-65Z"/><path data-recovery-muscle="Calves" d="M184 464q12 52-5 98l-13-25-4-65Z"/></g></svg>`; }
