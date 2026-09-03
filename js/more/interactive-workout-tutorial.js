import { getFormGuideVideo } from "../workouts/exercise-guide-video-manifest.js?v=form-videos-1";
import { presetPlans } from "../workouts/workout-plans.js?v=interactive-workout-tutorial-2";

const STYLE_ID = "level-up-interactive-workout-tutorial-styles";
const CARD_ID = "interactive-workout-tutorial-card";
const COMPLETION_KEY = "level_up_interactive_workout_tutorial_v1";
const DEMO_PLAN = presetPlans.find(plan => plan.id === "upper-lower-balanced") || presetPlans[0];
const DEMO_DAY = DEMO_PLAN?.days?.[0] || { name: "Day 1 - Upper A", exercises: [{ id: "barbell-bench-press", sets: 3, reps: "6-10" }] };
const DEMO_EXERCISE = DEMO_DAY.exercises?.find(item => item.id === "barbell-bench-press") || DEMO_DAY.exercises?.[0] || { id: "barbell-bench-press", sets: 3, reps: "6-10" };

const STEPS = [
    { target: "[data-demo-start]", title: "Start a workout", body: "This demo uses a real Level Up preset. Tap Begin Workout to open the same logger layout you use for an actual training session." },
    { target: "[data-demo-form]", title: "Open the Form Guide", body: "Form Guide lives in the same exercise tool row as the real logger. Use it for a quick technique reference without losing your place." },
    { target: "[data-demo-warmup-toggle]", title: "Show warm-up sets", body: "Warm-up is in the exercise header. Tap it to reveal the same warm-up rows used in a normal workout." },
    { target: "[data-demo-plate]", title: "Use the plate calculator", body: "The plate calculator sits immediately below the active barbell set and shows the plates needed on each side." },
    { target: "[data-demo-set-complete]", title: "Log a working set", body: "The set row uses the real Previous, Weight, Reps and Complete layout. The demo is prefilled so you can practice completing a set." },
    { target: "[data-demo-drop]", title: "Add a drop set", body: "The three-dot set action is where drop sets live. Tap it to add a lighter follow-up set using the real drop-set layout." },
    { target: "[data-demo-swap]", title: "Smart Swap an exercise", body: "Swap is beside Form Guide in the real logger. Use it when equipment is busy or you need a similar movement for today." },
    { target: "[data-demo-finish]", title: "Finish the workout", body: "A real Complete Workout saves history and updates Progress. This tutorial completes only the lesson and never writes workout data." }
];

let queued = false;
let active = false;
let stepIndex = 0;
let sheetOpen = false;
let observer = null;

install();

function install() {
    ensureStyles();
    schedule();
    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
    window.addEventListener("resize", positionGuide);
    window.addEventListener("scroll", positionGuide, true);
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        injectTutorialCard();
        if (active && !document.querySelector("[data-interactive-workout-demo]")) cleanupDemo();
    });
}

function injectTutorialCard() {
    const shell = document.querySelector(".learn-shell");
    if (!shell || document.getElementById(CARD_ID)) return;
    const completed = readCompleted();
    const section = document.createElement("section");
    section.className = "interactive-workout-tutorial-section";
    section.innerHTML = `
        <header><div><small>INTERACTIVE PRACTICE</small><h3>Learn by doing</h3></div><p>Practice the actual Level Up workout layout without changing your training data.</p></header>
        <button id="${CARD_ID}" class="interactive-workout-tutorial-card${completed ? " is-complete" : ""}" type="button">
            <span class="interactive-workout-tutorial-icon" aria-hidden="true">☝️</span>
            <span class="interactive-workout-tutorial-copy"><strong>Interactive Workout Logger</strong><small>Practice the real logger layout using ${escapeHtml(DEMO_PLAN?.name || "Upper / Lower Balanced")}.</small><span>Hands-on · ${STEPS.length} steps · about 3 min</span></span>
            <span class="interactive-workout-tutorial-state">${completed ? "Practice again →" : "Start →"}</span>
        </button>`;
    const appGuides = shell.querySelector(".learn-library-heading");
    if (appGuides) appGuides.insertAdjacentElement("beforebegin", section);
    else shell.appendChild(section);
}

function handleClick(event) {
    if (event.target.closest?.(`#${CARD_ID}`)) {
        event.preventDefault();
        openDemo();
        return;
    }
    if (!active) return;

    const demoAction = event.target.closest?.("[data-demo-back],[data-demo-exit],[data-demo-start],[data-demo-form],[data-demo-form-done],[data-demo-warmup-toggle],[data-demo-warmup-complete],[data-demo-plate],[data-demo-plate-done],[data-demo-set-complete],[data-demo-drop],[data-demo-swap],[data-demo-swap-choice],[data-demo-sheet-close],[data-demo-finish]");
    if (demoAction) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    if (demoAction?.matches("[data-demo-back],[data-demo-exit]")) return returnToTutorials();
    if (demoAction?.matches("[data-demo-start]")) { renderLogger(); setStep(1); return; }
    if (demoAction?.matches("[data-demo-form]")) { openFormVideo(); return; }
    if (demoAction?.matches("[data-demo-form-done]")) { closeSheet(); setStep(2); return; }
    if (demoAction?.matches("[data-demo-warmup-toggle]")) { toggleWarmups(); setStep(3); return; }
    if (demoAction?.matches("[data-demo-warmup-complete]")) { completeWarmup(demoAction); return; }
    if (demoAction?.matches("[data-demo-plate]")) { openPlateCalculator(); return; }
    if (demoAction?.matches("[data-demo-plate-done]")) { closeSheet(); setStep(4); return; }
    if (demoAction?.matches("[data-demo-set-complete]")) { completeWorkingSet(demoAction); setStep(5); return; }
    if (demoAction?.matches("[data-demo-drop]")) { addDropSet(demoAction); setStep(6); return; }
    if (demoAction?.matches("[data-demo-swap]")) { openSwapSheet(); return; }
    if (demoAction?.matches("[data-demo-swap-choice]")) { applyDemoSwap(demoAction); closeSheet(); setStep(7); return; }
    if (demoAction?.matches("[data-demo-sheet-close]")) { closeSheet(); positionGuide(); return; }
    if (demoAction?.matches("[data-demo-finish]")) completeTutorial();
}

function openDemo() {
    const content = document.getElementById("content");
    if (!content) return;
    active = true;
    stepIndex = 0;
    sheetOpen = false;
    document.documentElement.classList.add("interactive-workout-tutorial-active");
    content.innerHTML = `
        <section class="interactive-workout-demo" data-interactive-workout-demo>
            <header class="interactive-workout-demo-header"><button type="button" class="nutrition-planner-back" data-demo-back>← Tutorials</button><span class="eyebrow">INTERACTIVE TUTORIAL</span><h2>Level Up Demo Workout</h2><p>This uses a real Level Up preset and the real logger layout. Sandbox actions never change your workout history, active workout, PRs, progression or analytics.</p></header>
            <div class="interactive-demo-safe-banner"><span aria-hidden="true">✓</span><div><strong>Sandbox mode</strong><small>Actual interface · no workout data is saved.</small></div></div>
            <div data-demo-stage></div>
        </section>
        <div class="interactive-demo-finger" data-demo-finger aria-hidden="true">👇</div>
        <aside class="interactive-demo-guide" data-demo-guide role="status" aria-live="polite"><div><small data-demo-step-label></small><strong data-demo-step-title></strong><p data-demo-step-body></p></div><button type="button" data-demo-exit>Exit tutorial</button></aside>`;
    renderPlanPreview();
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPlanPreview() {
    const stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    stage.innerHTML = `
        <section class="plan-builder workout-session-logger interactive-demo-prestart">
            <div class="builder-heading"><div><span class="eyebrow">START WORKOUT</span><h3>${escapeHtml(DEMO_PLAN?.name || "Upper / Lower Balanced")}</h3><p>Demo uses the real ${escapeHtml(DEMO_DAY.name)} preset day.</p></div></div>
            <div class="workout-session-status"><div><span>Workout duration</span><strong>00:00:00</strong></div><div class="workout-timer-actions"><button class="secondary-btn" type="button" disabled>Pause</button></div></div>
            <div class="workout-start-fields"><label>Training Day<select disabled><option>${escapeHtml(DEMO_DAY.name)}</option></select></label><label>Workout Date<input type="date" value="${todayKey()}" disabled></label></div>
            <button class="primary-btn" type="button" data-demo-start>Begin Workout</button>
        </section>`;
}

function renderLogger() {
    const stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    const setCount = Math.max(1, Number(DEMO_EXERCISE.sets) || 3);
    stage.innerHTML = `
        <section class="plan-builder workout-session-logger compact-workout-logger logger-compact-session-header interactive-demo-real-logger" id="interactive-demo-workout-session-logger">
            <div class="builder-heading"><div><span class="eyebrow">ACTIVE WORKOUT · DEMO</span><h3>${escapeHtml(DEMO_PLAN?.name || "Upper / Lower Balanced")}</h3></div></div>
            <div class="workout-session-status"><div><span>Workout duration</span><strong>00:00:00</strong></div><div class="workout-timer-actions"><button class="secondary-btn" type="button" disabled>Pause</button></div></div>
            <div class="workout-start-fields"><label>Training Day<select disabled><option>${escapeHtml(DEMO_DAY.name)}</option></select></label><label>Workout Date<input type="date" value="${todayKey()}" disabled></label></div>
            <div class="exercise-carousel-controls swipe-only-carousel-controls"><div class="logger-exercise-strip"><span class="active">Exercise 1 of ${DEMO_DAY.exercises?.length || 1}</span></div></div>
            <div class="session-exercises">
                <article class="session-exercise-card" data-exercise-index="0" data-exercise-id="${escapeHtml(DEMO_EXERCISE.id)}" data-tracking-type="reps">
                    <div class="compact-exercise-header">
                        <h4 data-demo-exercise-name>Barbell Bench Press</h4>
                        <div class="compact-exercise-actions"><button class="exercise-warmup-btn" type="button" data-demo-warmup-toggle aria-expanded="false">Warm-up</button><button class="exercise-more-btn" type="button" disabled aria-label="More exercise options">•••</button></div>
                    </div>
                    <div class="logger-exercise-tools"><button class="logger-form-guide-btn" type="button" data-demo-form>Form Guide</button><button class="session-inline-swap" type="button" data-demo-swap>Swap</button><button class="session-superset-button" type="button" disabled>Superset</button></div>
                    <p class="session-target">Target: ${setCount} sets × ${escapeHtml(DEMO_EXERCISE.reps || "6-10")} reps</p>
                    <div class="previous-performance"><strong>Previous workout</strong><span>Hasn't started</span></div>
                    <div class="demo-real-warmups" data-demo-warmups hidden>
                        <div class="session-set-header"><span>Set</span><span>Previous</span><span>Weight</span><span>Reps</span><span>Done</span><span></span></div>
                        <div class="session-warmup-row" data-warmup-index="0"><strong>W1</strong><span class="previous-set-value">Warm-up</span><input class="session-warmup-weight" type="number" value="65" aria-label="Warm-up set 1 weight"><input class="session-warmup-reps" type="number" value="8" aria-label="Warm-up set 1 reps"><button class="complete-warmup-btn secondary-btn" type="button" data-demo-warmup-complete aria-label="Complete warm-up set"></button><span></span></div>
                        <div class="session-warmup-row" data-warmup-index="1"><strong>W2</strong><span class="previous-set-value">Warm-up</span><input class="session-warmup-weight" type="number" value="100" aria-label="Warm-up set 2 weight"><input class="session-warmup-reps" type="number" value="5" aria-label="Warm-up set 2 reps"><button class="complete-warmup-btn secondary-btn" type="button" aria-label="Example warm-up set"></button><span></span></div>
                    </div>
                    <div class="session-set-header"><span>Set</span><span>Previous</span><span>Weight</span><span>Reps</span><span>Done</span><span></span></div>
                    <div class="session-set-row" data-set-index="0"><strong>1</strong><span class="previous-set-value">Hasn't started</span><input class="session-weight" type="number" value="135" inputmode="decimal" aria-label="Set 1 weight"><input class="session-reps" type="number" value="8" inputmode="numeric" aria-label="Set 1 reps"><button class="complete-set-btn secondary-btn" type="button" data-demo-set-complete aria-label="Complete set 1">Complete Set</button><button class="drop-set-menu-trigger" type="button" data-demo-drop aria-label="Set 1 options">1</button></div>
                    <button class="plate-calculator-trigger" type="button" data-demo-plate aria-label="Open plate calculator. Per side: 45 lb"><span class="plate-calculator-trigger-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4 9v6M7 7v10M10 9v6M14 9v6M17 7v10M20 9v6M2.5 12h19"/></svg></span><span class="plate-calculator-trigger-copy"><strong>Per side</strong><span>45 lb</span></span><span class="plate-calculator-chevron" aria-hidden="true">›</span></button>
                    <div data-demo-drop-host></div>
                    <div class="session-set-row" data-set-index="1"><strong>2</strong><span class="previous-set-value">Hasn't started</span><input class="session-weight" type="number" placeholder="Weight" aria-label="Set 2 weight"><input class="session-reps" type="number" placeholder="Reps" aria-label="Set 2 reps"><button class="complete-set-btn secondary-btn" type="button" disabled>Complete Set</button><button class="drop-set-menu-trigger" type="button" disabled>2</button></div>
                    <div class="session-set-row" data-set-index="2"><strong>3</strong><span class="previous-set-value">Hasn't started</span><input class="session-weight" type="number" placeholder="Weight" aria-label="Set 3 weight"><input class="session-reps" type="number" placeholder="Reps" aria-label="Set 3 reps"><button class="complete-set-btn secondary-btn" type="button" disabled>Complete Set</button><button class="drop-set-menu-trigger" type="button" disabled>3</button></div>
                    <div class="session-exercise-add-actions"><button class="secondary-btn" type="button" disabled>+ Add Set</button><button class="secondary-btn" type="button" disabled>+ Add Exercise</button></div>
                </article>
            </div>
            <button class="primary-btn interactive-demo-complete-workout" type="button" data-demo-finish>Complete Workout</button>
            <div class="workout-message">Sandbox tutorial · no workout data is saved.</div>
        </section>`;
}

function toggleWarmups() {
    const block = document.querySelector("[data-demo-warmups]");
    const button = document.querySelector("[data-demo-warmup-toggle]");
    if (!block || !button) return;
    block.hidden = !block.hidden;
    button.setAttribute("aria-expanded", String(!block.hidden));
}

function completeWarmup(button) {
    const row = button.closest(".session-warmup-row");
    row?.classList.add("completed");
    button.textContent = "✓ Completed";
}

function completeWorkingSet(button) {
    const row = button.closest(".session-set-row");
    row?.classList.add("completed");
    button.textContent = "✓ Completed";
}

function addDropSet(trigger) {
    const host = document.querySelector("[data-demo-drop-host]");
    const row = trigger.closest(".session-set-row");
    if (!host || host.children.length) return;
    row?.classList.add("has-drop-set");
    host.innerHTML = `<div class="drop-set-menu"><div class="drop-set-row" data-drop-index="0"><span class="drop-set-label">↳ Drop 1</span><input class="drop-set-weight" value="95" inputmode="decimal" aria-label="Drop set weight"><input class="drop-set-reps" value="10" inputmode="numeric" aria-label="Drop set reps"><button class="drop-set-complete" type="button" aria-label="Complete drop 1">○</button><button class="drop-set-remove" type="button" disabled aria-label="Remove drop 1">×</button></div></div>`;
}

function openFormVideo() {
    const video = getFormGuideVideo("barbell-bench-press");
    sheetOpen = true;
    hideGuideFocus();
    const sheet = createGenericSheet("Form Guide", `<div class="demo-form-video-wrap">${video?.src ? `<video src="${video.src}" autoplay muted loop playsinline preload="metadata" aria-label="Barbell Bench Press form demonstration"></video>` : `<div class="demo-video-fallback">Form demonstration</div>`}</div><div class="demo-sheet-copy"><strong>Barbell Bench Press</strong><p>This uses the same form-video asset available from the real logger.</p></div><button class="primary-btn" type="button" data-demo-form-done>Back to Workout</button>`);
    document.body.appendChild(sheet);
}

function openPlateCalculator() {
    sheetOpen = true;
    hideGuideFocus();
    const overlay = document.createElement("div");
    overlay.className = "plate-calculator-overlay";
    overlay.dataset.demoSheet = "1";
    overlay.innerHTML = `<section class="plate-calculator-sheet" role="dialog" aria-modal="true" aria-labelledby="demo-plate-title"><div class="plate-calculator-handle" aria-hidden="true"></div><header class="plate-calculator-header"><h3 id="demo-plate-title">Plate calculator</h3><button type="button" class="plate-calculator-done" data-demo-plate-done>Done</button></header><div class="plate-calculator-body"><div class="plate-calculator-summary"><span>Entered load</span><strong>135 lb</strong></div><div class="plate-calculator-visual" aria-label="One 45 pound plate per side"><div class="plate-calculator-sleeve" aria-hidden="true"></div><div class="plate-calculator-plates"><span class="plate-calculator-plate" style="--plate-scale:1"><b>45 lb</b></span><span class="plate-calculator-stop" aria-hidden="true"></span></div></div><div class="demo-sheet-copy"><strong>Per side: 45 lb</strong><p>45 lb bar + one 45 lb plate on each side = 135 lb.</p></div></div></section>`;
    document.body.appendChild(overlay);
}

function openSwapSheet() {
    sheetOpen = true;
    hideGuideFocus();
    const sheet = document.createElement("div");
    sheet.className = "session-exercise-swap-sheet";
    sheet.dataset.demoSheet = "1";
    sheet.innerHTML = `<div class="session-exercise-swap-panel" role="dialog" aria-modal="true" aria-labelledby="demo-swap-title"><div class="session-swap-heading"><div><span class="eyebrow">TODAY ONLY · DEMO</span><h4 id="demo-swap-title">Swap Barbell Bench Press</h4></div><button class="session-swap-close" type="button" data-demo-sheet-close aria-label="Close swap exercise">×</button></div><p class="session-swap-note">Smart Swap keeps the saved plan untouched while finding a similar movement.</p><section class="session-smart-swap"><div class="session-smart-header"><div><span class="session-smart-kicker">SMART SWAP</span><h5>Best alternatives</h5></div><small>Same training goal</small></div><div class="session-smart-options"><button class="session-smart-option" type="button" data-demo-swap-choice="Dumbbell Bench Press"><span class="session-smart-option-main"><strong>Dumbbell Bench Press</strong><small>Dumbbell</small></span><span class="session-smart-option-score"><b>93%</b><small>Best match</small></span><span class="session-smart-option-reasons"><em>Same primary muscles</em><em>Similar movement</em></span></button><button class="session-smart-option" type="button" data-demo-swap-choice="Machine Chest Press"><span class="session-smart-option-main"><strong>Machine Chest Press</strong><small>Machine</small></span><span class="session-smart-option-score"><b>88%</b><small>Strong match</small></span><span class="session-smart-option-reasons"><em>Same primary muscles</em><em>Different equipment</em></span></button></div></section><button class="session-swap-cancel" type="button" data-demo-sheet-close>Cancel</button></div>`;
    document.body.appendChild(sheet);
}

function applyDemoSwap(button) {
    const heading = document.querySelector("[data-demo-exercise-name]");
    if (heading) heading.textContent = button.dataset.demoSwapChoice || "Dumbbell Bench Press";
}

function createGenericSheet(title, body) {
    const backdrop = document.createElement("div");
    backdrop.className = "interactive-demo-sheet-backdrop";
    backdrop.dataset.demoSheet = "1";
    backdrop.innerHTML = `<section class="interactive-demo-sheet" role="dialog" aria-modal="true"><header><h3>${escapeHtml(title)}</h3><button type="button" data-demo-sheet-close aria-label="Close">×</button></header>${body}</section>`;
    return backdrop;
}

function closeSheet() {
    document.querySelector("[data-demo-sheet]")?.remove();
    sheetOpen = false;
    requestAnimationFrame(positionGuide);
}

function setStep(index) {
    stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
    const step = STEPS[stepIndex];
    const guide = document.querySelector("[data-demo-guide]");
    if (guide) {
        setText(guide.querySelector("[data-demo-step-label]"), `STEP ${stepIndex + 1} OF ${STEPS.length}`);
        setText(guide.querySelector("[data-demo-step-title]"), step.title);
        setText(guide.querySelector("[data-demo-step-body]"), step.body);
    }
    requestAnimationFrame(() => focusStep(step));
}

function focusStep(step = STEPS[stepIndex]) {
    document.querySelectorAll(".interactive-demo-focus").forEach(node => node.classList.remove("interactive-demo-focus"));
    if (!active || sheetOpen) return;
    const target = document.querySelector(step.target);
    if (!target) return;
    target.classList.add("interactive-demo-focus");
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    window.setTimeout(positionGuide, 320);
}

function positionGuide() {
    if (!active || sheetOpen) return;
    const target = document.querySelector(STEPS[stepIndex]?.target || "");
    const finger = document.querySelector("[data-demo-finger]");
    if (!target || !finger) return;
    const rect = target.getBoundingClientRect();
    finger.style.left = `${Math.max(18, Math.min(window.innerWidth - 56, rect.left + rect.width / 2 - 18))}px`;
    finger.style.top = `${Math.max(12, rect.top - 43)}px`;
    finger.hidden = false;
}

function hideGuideFocus() {
    document.querySelectorAll(".interactive-demo-focus").forEach(node => node.classList.remove("interactive-demo-focus"));
    const finger = document.querySelector("[data-demo-finger]");
    if (finger) finger.hidden = true;
}

function completeTutorial() {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
    hideGuideFocus();
    document.querySelector("[data-demo-guide]")?.remove();
    const stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    stage.innerHTML = `<article class="demo-tutorial-complete"><div class="demo-complete-mark">✓</div><span class="eyebrow">TUTORIAL COMPLETE</span><h3>You know the workout logger.</h3><p>You practiced the same Level Up logger layout without changing any training data.</p><button class="primary-btn" type="button" data-demo-back>Back to Tutorials</button></article>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnToTutorials() {
    cleanupDemo();
    const more = document.querySelector('.bottom-nav .nav-btn[data-page="more"]');
    if (more) {
        more.click();
        window.setTimeout(() => document.querySelector('[data-more-page="learn"]')?.click(), 100);
        return;
    }
    window.history.back();
}

function cleanupDemo() {
    active = false;
    sheetOpen = false;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    document.querySelector("[data-demo-sheet]")?.remove();
    document.querySelectorAll(".interactive-demo-focus").forEach(node => node.classList.remove("interactive-demo-focus"));
}

function readCompleted() {
    try { return JSON.parse(localStorage.getItem(COMPLETION_KEY) || "null")?.completed === true; }
    catch { return false; }
}

function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function setText(node, value) { if (node && node.textContent !== value) node.textContent = value; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .interactive-workout-tutorial-section{margin:18px 0}.interactive-workout-tutorial-section>header{margin-bottom:9px}.interactive-workout-tutorial-section>header small{color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.08em}.interactive-workout-tutorial-section>header h3{margin:2px 0}.interactive-workout-tutorial-section>header p{margin:0;color:var(--muted);font-size:11px}.interactive-workout-tutorial-card{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;width:100%;padding:13px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--card-border,#333));border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--card)),var(--card));color:var(--text);text-align:left}.interactive-workout-tutorial-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:color-mix(in srgb,var(--accent) 15%,transparent);font-size:24px}.interactive-workout-tutorial-copy strong,.interactive-workout-tutorial-copy small,.interactive-workout-tutorial-copy span{display:block}.interactive-workout-tutorial-copy strong{font-size:13px}.interactive-workout-tutorial-copy small{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}.interactive-workout-tutorial-copy span{margin-top:5px;color:var(--accent);font-size:9px;font-weight:850}.interactive-workout-tutorial-state{font-size:10px;font-weight:900;white-space:nowrap}
        html.interactive-workout-tutorial-active .bottom-nav{display:none!important}html.interactive-workout-tutorial-active #content{padding-bottom:max(210px,calc(190px + env(safe-area-inset-bottom)))!important}.interactive-workout-demo{padding-bottom:190px}.interactive-workout-demo-header{margin-bottom:12px}.interactive-workout-demo-header h2{margin:5px 0}.interactive-workout-demo-header p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}.interactive-demo-safe-banner{display:flex;gap:9px;align-items:center;margin:10px 0 14px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);border-radius:14px;background:color-mix(in srgb,var(--accent) 7%,var(--card))}.interactive-demo-safe-banner>span{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:var(--accent);color:#fff;font-weight:900}.interactive-demo-safe-banner strong,.interactive-demo-safe-banner small{display:block}.interactive-demo-safe-banner small{color:var(--muted);font-size:9px}
        .interactive-demo-prestart,.interactive-demo-real-logger{margin:0!important}.interactive-demo-real-logger .session-exercises{display:block}.interactive-demo-real-logger .logger-exercise-strip{padding:3px 0 7px;color:var(--muted);font-size:9px;font-weight:850}.interactive-demo-real-logger .logger-exercise-strip .active{color:var(--accent)}.interactive-demo-real-logger .session-exercise-card{display:block!important}.interactive-demo-real-logger .session-inline-swap,.interactive-demo-real-logger .session-superset-button{min-height:30px;padding:6px 10px}.interactive-demo-real-logger .demo-real-warmups[hidden]{display:none!important}.interactive-demo-real-logger .session-set-header span:nth-child(6){visibility:hidden}.interactive-demo-real-logger .drop-set-menu{margin-top:3px}.interactive-demo-complete-workout{width:100%;margin-top:12px}.interactive-demo-real-logger input:disabled,.interactive-demo-real-logger button:disabled{opacity:.45}
        .interactive-demo-guide{position:fixed;z-index:10003;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));display:flex;align-items:flex-start;justify-content:space-between;gap:12px;max-width:640px;margin:0 auto;padding:13px 14px;border:1px solid color-mix(in srgb,var(--accent) 38%,var(--card-border,#333));border-radius:17px;background:color-mix(in srgb,var(--card) 96%,transparent);box-shadow:0 18px 55px rgba(0,0,0,.42);backdrop-filter:blur(18px)}.interactive-demo-guide>div{min-width:0}.interactive-demo-guide small,.interactive-demo-guide strong,.interactive-demo-guide p{display:block}.interactive-demo-guide small{color:var(--accent);font-size:8px;font-weight:900;letter-spacing:.08em}.interactive-demo-guide strong{margin-top:2px;font-size:13px}.interactive-demo-guide p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.4}.interactive-demo-guide>button{flex:0 0 auto;border:0;background:transparent;color:var(--muted);font-size:9px;font-weight:850;padding:4px}.interactive-demo-finger{position:fixed;z-index:10004;font-size:30px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4));animation:interactiveFingerBounce .8s ease-in-out infinite alternate;pointer-events:none}.interactive-demo-focus{position:relative!important;z-index:10002!important;outline:3px solid var(--accent)!important;outline-offset:3px!important;box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 14%,transparent)!important}
        .interactive-demo-sheet-backdrop{position:fixed;z-index:10005;inset:0;display:grid;align-items:end;padding:12px;background:rgba(0,0,0,.65)}.interactive-demo-sheet{width:min(100%,620px);max-height:min(82vh,720px);overflow:auto;margin:0 auto;padding:14px;border:1px solid color-mix(in srgb,var(--text) 12%,transparent);border-radius:20px;background:var(--card);color:var(--text)}.interactive-demo-sheet>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.interactive-demo-sheet>header h3{margin:0}.interactive-demo-sheet>header button{width:34px;height:34px;border:0;border-radius:50%;background:color-mix(in srgb,var(--text) 6%,transparent);color:var(--text);font-size:19px}.demo-form-video-wrap{overflow:hidden;border-radius:14px;background:#000;aspect-ratio:16/9}.demo-form-video-wrap video{width:100%;height:100%;object-fit:cover}.demo-sheet-copy{padding:10px 0}.demo-sheet-copy strong{display:block;font-size:12px}.demo-sheet-copy p{margin:4px 0;color:var(--muted);font-size:10px;line-height:1.4}.session-exercise-swap-sheet[data-demo-sheet]{display:grid!important;position:fixed!important;z-index:10005!important;inset:0!important;background:rgba(0,0,0,.68)!important}.plate-calculator-overlay[data-demo-sheet]{display:flex!important;z-index:10005!important}.demo-tutorial-complete{padding:28px 18px;text-align:center;border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);border-radius:18px;background:var(--card)}.demo-complete-mark{display:grid;place-items:center;width:54px;height:54px;margin:0 auto 10px;border-radius:50%;background:var(--accent);color:#fff;font-size:27px;font-weight:900}.demo-tutorial-complete h3{margin:6px 0}.demo-tutorial-complete p{color:var(--muted);font-size:11px;line-height:1.45}.demo-tutorial-complete .primary-btn{margin-top:8px;width:100%}
        @keyframes interactiveFingerBounce{from{transform:translateY(0)}to{transform:translateY(8px)}}@media(max-width:520px){.interactive-workout-tutorial-card{grid-template-columns:40px minmax(0,1fr)}.interactive-workout-tutorial-state{grid-column:2}.interactive-demo-guide{left:8px;right:8px;padding:11px 12px}.interactive-demo-guide p{font-size:9.5px}.interactive-demo-real-logger .session-set-header,.interactive-demo-real-logger .session-set-row,.interactive-demo-real-logger .session-warmup-row{font-size:9px}.interactive-demo-real-logger .complete-set-btn,.interactive-demo-real-logger .complete-warmup-btn{font-size:0!important}}
    `;
    document.head.appendChild(style);
}
