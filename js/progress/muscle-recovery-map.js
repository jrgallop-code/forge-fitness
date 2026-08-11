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
        <div class="recovery-map-header"><div><span class="eyebrow">TRAINING RECOVERY</span><h4>Muscle Recovery</h4><p>Muscle highlight intensity shows estimated recovery from your completed workouts.</p></div><button class="secondary-btn recovery-detail-open" type="button" data-recovery-details-button>View Details</button></div>
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
            <div class="recovery-body-wrap recovery-traced-wrap" data-recovery-body-front>${frontBodySvg()}</div>
            <div class="recovery-body-wrap recovery-traced-wrap" data-recovery-body-back hidden>${backBodySvg()}</div>
            <div class="recovery-map-note">0% means recently trained and shows the strongest red highlight. As recovery rises, the red overlay becomes more transparent until the neutral gray body is visible at 100%. Recovery timing still uses Level Up's current 72-hour model.</div>
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
        const percent = item?.percent ?? 100;
        shape.style.setProperty("--recovery-opacity", recoveryOpacity(percent));
        shape.style.setProperty("--recovery-fill", colorForPercent(percent));
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
function recoveryOpacity(percent) { const p = Math.max(0, Math.min(100, Number(percent) || 0)); return String(Math.max(0.04, 0.96 * (1 - p / 100))); }
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

function musclePath(muscle, d) { return `<path class="recovery-muscle-overlay" data-recovery-muscle="${muscle}" d="${d}"/>`; }

function frontBodySvg() {
    const outline = "M 222,10 L 203,11 L 185,28 L 178,60 L 189,81 L 187,108 L 112,148 L 95,236 L 75,265 L 57,336 L 26,368 L 37,373 L 34,399 L 44,408 L 69,399 L 81,344 L 121,282 L 129,246 L 148,228 L 160,266 L 135,401 L 145,482 L 133,545 L 143,658 L 114,689 L 129,702 L 153,701 L 175,678 L 184,517 L 211,410 L 220,411 L 245,517 L 254,682 L 279,703 L 314,695 L 285,658 L 296,548 L 285,505 L 294,393 L 270,269 L 281,228 L 300,246 L 309,285 L 345,340 L 359,400 L 384,408 L 393,400 L 391,373 L 402,370 L 370,334 L 355,269 L 332,230 L 316,146 L 240,106 L 250,54 L 241,23 Z";
    return `<svg class="recovery-body-svg recovery-traced-anatomy" viewBox="0 0 430 735" role="img" aria-label="Front muscle recovery map">
        <path class="recovery-master-silhouette" d="${outline}"/>
        <g class="recovery-muscle-boundaries">
            ${musclePath("Shoulders", "M111 149 C94 154 89 174 94 200 C101 214 113 222 128 217 C140 203 147 182 146 163 C137 153 125 147 111 149 Z")}
            ${musclePath("Shoulders", "M319 149 C336 154 341 174 336 200 C329 214 317 222 302 217 C290 203 283 182 284 163 C293 153 305 147 319 149 Z")}
            ${musclePath("Chest", "M129 161 C151 149 177 146 210 154 L210 225 C180 231 151 226 129 207 C121 192 120 175 129 161 Z")}
            ${musclePath("Chest", "M301 161 C279 149 253 146 220 154 L220 225 C250 231 279 226 301 207 C309 192 310 175 301 161 Z")}
            ${musclePath("Biceps", "M101 205 C88 224 84 253 91 280 C97 295 108 300 119 292 C130 274 136 247 132 222 C125 209 114 202 101 205 Z")}
            ${musclePath("Biceps", "M329 205 C342 224 346 253 339 280 C333 295 322 300 311 292 C300 274 294 247 298 222 C305 209 316 202 329 205 Z")}
            ${musclePath("Quads", "M149 397 C136 425 134 470 140 514 C144 548 154 571 168 584 C181 566 186 534 184 492 L179 414 C169 404 159 398 149 397 Z")}
            ${musclePath("Quads", "M281 397 C294 425 296 470 290 514 C286 548 276 571 262 584 C249 566 244 534 246 492 L251 414 C261 404 271 398 281 397 Z")}
            ${musclePath("Quads", "M180 405 C193 400 204 402 212 413 L205 515 C198 548 191 571 183 588 C176 560 174 532 177 495 Z")}
            ${musclePath("Quads", "M250 405 C237 400 226 402 218 413 L225 515 C232 548 239 571 247 588 C254 560 256 532 253 495 Z")}
            ${musclePath("Calves", "M143 548 C134 577 136 620 146 655 C151 670 158 676 164 669 C172 644 176 611 172 575 C163 557 154 548 143 548 Z")}
            ${musclePath("Calves", "M287 548 C296 577 294 620 284 655 C279 670 272 676 266 669 C258 644 254 611 258 575 C267 557 276 548 287 548 Z")}
        </g>
    </svg>`;
}

function backBodySvg() {
    const outline = "M 258,10 L 237,25 L 228,58 L 239,103 L 157,150 L 140,238 L 120,269 L 105,336 L 72,374 L 85,377 L 81,402 L 93,414 L 118,404 L 129,346 L 163,292 L 183,232 L 192,231 L 208,276 L 183,409 L 186,513 L 174,555 L 187,653 L 162,686 L 196,702 L 218,694 L 216,634 L 234,571 L 231,526 L 260,415 L 269,414 L 297,524 L 309,693 L 331,702 L 365,685 L 340,653 L 354,550 L 342,507 L 347,403 L 325,281 L 340,231 L 362,255 L 369,290 L 404,347 L 413,401 L 427,413 L 444,413 L 444,347 L 429,340 L 414,272 L 393,240 L 375,149 L 293,102 L 303,64 L 297,29 L 280,12 Z";
    return `<svg class="recovery-body-svg recovery-traced-anatomy" viewBox="0 0 445 735" role="img" aria-label="Back muscle recovery map">
        <path class="recovery-master-silhouette" d="${outline}"/>
        <g class="recovery-muscle-boundaries">
            ${musclePath("Shoulders", "M154 151 C137 160 132 181 139 205 C148 217 161 223 176 217 C187 204 192 186 190 166 C181 154 168 149 154 151 Z")}
            ${musclePath("Shoulders", "M376 151 C393 160 398 181 391 205 C382 217 369 223 354 217 C343 204 338 186 340 166 C349 154 362 149 376 151 Z")}
            ${musclePath("Back", "M198 142 C220 120 243 111 265 111 L265 306 C241 289 218 261 201 225 C188 194 187 164 198 142 Z")}
            ${musclePath("Back", "M332 142 C310 120 287 111 265 111 L265 306 C289 289 312 261 329 225 C342 194 343 164 332 142 Z")}
            ${musclePath("Triceps", "M143 208 C132 230 130 259 137 286 C143 299 153 303 164 295 C175 276 180 251 177 227 C169 214 157 207 143 208 Z")}
            ${musclePath("Triceps", "M387 208 C398 230 400 259 393 286 C387 299 377 303 366 295 C355 276 350 251 353 227 C361 214 373 207 387 208 Z")}
            ${musclePath("Glutes", "M205 345 C224 329 245 329 263 343 L263 406 C247 422 226 424 207 410 C195 392 194 367 205 345 Z")}
            ${musclePath("Glutes", "M325 345 C306 329 285 329 267 343 L267 406 C283 422 304 424 323 410 C335 392 336 367 325 345 Z")}
            ${musclePath("Hamstrings", "M198 413 C185 445 184 493 191 535 C197 566 208 585 221 590 C233 572 238 541 236 502 L231 424 C220 414 209 410 198 413 Z")}
            ${musclePath("Hamstrings", "M332 413 C345 445 346 493 339 535 C333 566 322 585 309 590 C297 572 292 541 294 502 L299 424 C310 414 321 410 332 413 Z")}
            ${musclePath("Calves", "M187 548 C177 579 179 622 190 655 C196 670 203 676 210 668 C218 642 221 611 216 576 C207 557 197 548 187 548 Z")}
            ${musclePath("Calves", "M343 548 C353 579 351 622 340 655 C334 670 327 676 320 668 C312 642 309 611 314 576 C323 557 333 548 343 548 Z")}
        </g>
    </svg>`;
}
