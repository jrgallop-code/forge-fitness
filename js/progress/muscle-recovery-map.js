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
    section.querySelectorAll("[data-recovery-facing]").forEach(control => control.addEventListener("click", () => setFacing(control.dataset.recoveryFacing, section)));
    section.querySelector("[data-recovery-details-button]")?.addEventListener("click", showDetails);
    section.querySelector("[data-recovery-map-button]")?.addEventListener("click", showMap);
    setFacing("front", section);
    renderRecoveryData();
}

function showRecoveryView() {
    document.querySelectorAll(".training-progress-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === "recovery"));
    document.querySelectorAll(".training-progress-view").forEach(view => { view.hidden = view.dataset.view !== "recovery"; });
    renderRecoveryData();
}

function renderRecoveryShell() {
    return `<div class="recovery-map-shell">
        <div class="recovery-map-header"><div><span class="eyebrow">TRAINING RECOVERY</span><h4>Muscle Recovery</h4><p>Muscle color shows estimated recovery from your completed workouts.</p></div><button class="secondary-btn recovery-detail-open" type="button" data-recovery-details-button>View Details</button></div>
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
            <div class="recovery-map-note">Bright red means more fatigued. As a muscle recovers, its highlight fades toward the neutral body color. 0% = recently trained; 100% = fully recovered under Level Up's current 72-hour recovery model.</div>
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
        shape.style.setProperty("--recovery-fill", item ? colorForPercent(item.percent) : "#555663");
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

function setFacing(facing, root = document) {
    root.querySelectorAll("[data-recovery-facing]").forEach(button => button.classList.toggle("active", button.dataset.recoveryFacing === facing));
    const front = root.querySelector("[data-recovery-body-front]");
    const back = root.querySelector("[data-recovery-body-back]");
    if (front) { front.hidden = facing !== "front"; front.style.display = facing === "front" ? "grid" : "none"; }
    if (back) { back.hidden = facing !== "back"; back.style.display = facing === "back" ? "grid" : "none"; }
}
function showDetails() { document.querySelector("[data-recovery-map-panel]")?.setAttribute("hidden", ""); document.querySelector("[data-recovery-details-panel]")?.removeAttribute("hidden"); renderRecoveryData(); }
function showMap() { document.querySelector("[data-recovery-details-panel]")?.setAttribute("hidden", ""); document.querySelector("[data-recovery-map-panel]")?.removeAttribute("hidden"); }
function getStatus(hours) { if (hours < 48) return "Recovering"; if (hours < 72) return "Nearly Ready"; return "Ready"; }
function colorForPercent(percent) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    const fatigued = [255, 49, 95];
    const recovered = [118, 119, 132];
    const rgb = fatigued.map((start, i) => Math.round(start + (recovered[i] - start) * p));
    return `rgb(${rgb.join(",")})`;
}
function formatElapsed(hours) { if (hours < 1) return "trained recently"; if (hours < 24) return `${Math.floor(hours)}h ago`; const days = Math.floor(hours / 24); return days === 1 ? "yesterday" : `${days} days ago`; }
function formatLastWorkout(time) { if (!time) return "No data"; const hours = Math.max(0, (Date.now() - time) / 3600000); return hours < 24 ? `${Math.max(0, Math.floor(hours))}h ago` : formatElapsed(hours); }
function getLatestWorkoutTime() { return Math.max(0, ...getSessions().map(getSessionTime)); }
function hasPerformedSet(exercise) { return (exercise?.sets || []).some(set => Number(set?.reps) > 0 || Number(set?.weight) > 0 || Number(set?.duration) > 0 || Number(set?.durationMinutes) > 0); }
function getSessions() { try { const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function getSessionTime(session) { const raw = session?.completedAt || session?.endTime || session?.date; if (!raw) return 0; const time = new Date(raw).getTime(); return Number.isFinite(time) ? time : 0; }
function normalizeMuscle(value) { const text = String(value || "").trim(); if (!text || /cardio|other/i.test(text)) return ""; const aliases = { Quadriceps: "Quads", Hamstring: "Hamstrings", Shoulder: "Shoulders", Glute: "Glutes", Calf: "Calves" }; return aliases[text] || text; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }

function frontBodySvg() {
    return `<svg class="recovery-body-svg recovery-vector-anatomy" viewBox="0 0 360 720" role="img" aria-label="Front muscle recovery map">
      <g class="body-base">
        <path d="M180 25c-29 0-43 20-43 48 0 25 8 47 25 57l-4 20-36 17-38 16-22 41-13 73-19 91 17 5 30-91 15-47 13 24-11 74-20 88 18 6 35-84 10-60 8 69-12 89-8 103 10 107 14 86 18 0 3-91 10-89 1 0 10 89 3 91 18 0 14-86 10-107-8-103-12-89 8-69 10 60 35 84 18-6-20-88-11-74 13-24 15 47 30 91 17-5-19-91-13-73-22-41-38-16-36-17-4-20c17-10 25-32 25-57 0-28-14-48-43-48z"/>
      </g>
      <g class="body-detail neutral-detail">
        <path d="M158 145l22 24 22-24 15 31-37 18-37-18z"/>
        <path d="M146 269l18-19 16 14-3 35-19 1zM214 269l-18-19-16 14 3 35 19 1z"/>
        <path d="M160 303h18v39h-21zM182 303h18l3 39h-21zM157 346h21v39h-25zM182 346h21l4 39h-25z"/>
        <path d="M139 295l18 8-4 82-16-24zM221 295l-18 8 4 82 16-24z"/>
        <path d="M83 326l18 5-20 81-17-6zM277 326l-18 5 20 81 17-6z"/>
      </g>
      <g class="muscles">
        <path data-recovery-muscle="Shoulders" d="M117 183c-28 4-44 19-46 48l13 29 31-18 14-46z"/>
        <path data-recovery-muscle="Shoulders" d="M243 183c28 4 44 19 46 48l-13 29-31-18-14-46z"/>
        <path data-recovery-muscle="Chest" d="M128 197c17-12 33-17 50-13v70c-24 5-44 1-59-14l-4-29z"/>
        <path data-recovery-muscle="Chest" d="M232 197c-17-12-33-17-50-13v70c24 5 44 1 59-14l4-29z"/>
        <path data-recovery-muscle="Biceps" d="M99 252c-14 18-20 45-18 76 5 15 14 21 25 18 12-13 17-31 18-54l-8-37z"/>
        <path data-recovery-muscle="Biceps" d="M261 252c14 18 20 45 18 76-5 15-14 21-25 18-12-13-17-31-18-54l8-37z"/>
        <path data-recovery-muscle="Quads" d="M132 414c-15 38-20 83-14 133 4 34 13 56 28 65 17-10 24-38 24-82l-3-107z"/>
        <path data-recovery-muscle="Quads" d="M228 414c15 38 20 83 14 133-4 34-13 56-28 65-17-10-24-38-24-82l3-107z"/>
        <path data-recovery-muscle="Quads" d="M150 424l28-9-2 119-18 61-10-62z"/>
        <path data-recovery-muscle="Quads" d="M210 424l-28-9 2 119 18 61 10-62z"/>
        <path data-recovery-muscle="Calves" d="M137 580c-12 31-11 72 2 116l17-43 7-61-8-18z"/>
        <path data-recovery-muscle="Calves" d="M223 580c12 31 11 72-2 116l-17-43-7-61 8-18z"/>
      </g>
    </svg>`;
}

function backBodySvg() {
    return `<svg class="recovery-body-svg recovery-vector-anatomy" viewBox="0 0 360 720" role="img" aria-label="Back muscle recovery map">
      <g class="body-base">
        <path d="M180 25c-29 0-43 20-43 48 0 25 8 47 25 57l-4 20-36 17-38 16-22 41-13 73-19 91 17 5 30-91 15-47 13 24-11 74-20 88 18 6 35-84 10-60 8 69-12 89-8 103 10 107 14 86 18 0 3-91 10-89 1 0 10 89 3 91 18 0 14-86 10-107-8-103-12-89 8-69 10 60 35 84 18-6-20-88-11-74 13-24 15 47 30 91 17-5-19-91-13-73-22-41-38-16-36-17-4-20c17-10 25-32 25-57 0-28-14-48-43-48z"/>
      </g>
      <g class="body-detail neutral-detail">
        <path d="M85 326l17 4-20 83-17-6zM275 326l-17 4 20 83 17-6z"/>
        <path d="M164 382l16 24 16-24 10 31-26 25-26-25z"/>
      </g>
      <g class="muscles">
        <path data-recovery-muscle="Shoulders" d="M118 183c-28 4-45 20-47 48l14 29 31-17 14-47z"/>
        <path data-recovery-muscle="Shoulders" d="M242 183c28 4 45 20 47 48l-14 29-31-17-14-47z"/>
        <path data-recovery-muscle="Back" d="M159 145l21 26 21-26 22 34-8 70-35 96-35-96-8-70z"/>
        <path data-recovery-muscle="Back" d="M133 209l43 25-13 115-31 45-24-95 10-54z"/>
        <path data-recovery-muscle="Back" d="M227 209l-43 25 13 115 31 45 24-95-10-54z"/>
        <path data-recovery-muscle="Triceps" d="M99 253c-12 17-18 44-17 76 5 16 13 23 24 20 13-16 18-35 18-57l-8-37z"/>
        <path data-recovery-muscle="Triceps" d="M261 253c12 17 18 44 17 76-5 16-13 23-24 20-13-16-18-35-18-57l8-37z"/>
        <path data-recovery-muscle="Glutes" d="M126 390c16-20 34-22 52-7v72c-22 13-42 9-57-14z"/>
        <path data-recovery-muscle="Glutes" d="M234 390c-16-20-34-22-52-7v72c22 13 42 9 57-14z"/>
        <path data-recovery-muscle="Hamstrings" d="M130 457c-10 45-10 93 1 145 5 22 13 37 24 44 15-18 20-49 18-92l-7-91z"/>
        <path data-recovery-muscle="Hamstrings" d="M230 457c10 45 10 93-1 145-5 22-13 37-24 44-15-18-20-49-18-92l7-91z"/>
        <path data-recovery-muscle="Hamstrings" d="M157 462l19 5-3 92-17 73-9-45z"/>
        <path data-recovery-muscle="Hamstrings" d="M203 462l-19 5 3 92 17 73 9-45z"/>
        <path data-recovery-muscle="Calves" d="M137 580c-12 31-11 72 2 116l17-43 7-61-8-18z"/>
        <path data-recovery-muscle="Calves" d="M223 580c12 31 11 72-2 116l-17-43-7-61 8-18z"/>
      </g>
    </svg>`;
}
