import { navigate } from "../core/router.js?v=deload-workout-preview-1";
import { presetPlans } from "../workouts/workout-plans.js?v=interactive-workout-tutorial-3";
import { openWorkoutLogger, ACTIVE_WORKOUT_STORAGE_KEY } from "../workouts/workout-session.js?v=workout-source-stats-1";

const STYLE_ID = "level-up-interactive-workout-tutorial-styles";
const CARD_ID = "interactive-workout-tutorial-card";
const COMPLETION_KEY = "level_up_interactive_workout_tutorial_v1";
const DEMO_PLAN = presetPlans.find(plan => plan.id === "upper-lower-balanced");
const BENCH_SELECTOR = '.session-exercise-card[data-exercise-id="barbell-bench-press"]';

const STEPS = [
    { target: "#begin-session-btn", title: "Begin the real workout", body: "This is Upper / Lower Balanced from the Level Up template library. Day 1 – Upper A starts with Barbell Bench Press. Tap Begin Workout." },
    { target: `${BENCH_SELECTOR} .logger-form-guide-btn`, title: "Open the Form Guide", body: "This is the same Form Guide button used in a normal workout. Open it, review the real guide, then return to the workout." },
    { target: `${BENCH_SELECTOR} .exercise-warmup-btn`, title: "Show warm-up sets", body: "Tap Warm-up to reveal Level Up’s real warm-up rows for the barbell bench press." },
    { target: `${BENCH_SELECTOR} .complete-warmup-btn`, title: "Complete a warm-up", body: "Mark the first real warm-up set complete. The normal workout behavior and rest-timer logic remain active in this sandbox." },
    { target: `${BENCH_SELECTOR} .plate-calculator-trigger`, title: "Use the actual plate calculator", body: "This is Level Up’s production plate calculator. Open it to see the real plate breakdown for the weight entered in the set." },
    { target: `${BENCH_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`, title: "Log a working set", body: "Weight and reps are entered in the actual set row. Tap Complete Set exactly as you would during a real workout." },
    { target: `${BENCH_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`, title: "Add a drop set", body: "Tap the set-number action. Level Up’s real drop-set runtime will add the drop row and suggested lighter load." },
    { target: `${BENCH_SELECTOR} .session-inline-swap`, title: "Open Smart Swap", body: "Use the actual Swap button to see Level Up’s real Smart Swap recommendations. Choose one or close the sheet to continue." },
    { target: "#save-session-btn", title: "Finish the tutorial", body: "This is the real Complete Workout button. In tutorial mode, this final tap completes only the lesson and is blocked from workout history." }
];

let active = false;
let stepIndex = 0;
let flow = null;
let queued = false;
let storageSandbox = null;
let sandboxActiveWorkout = null;

install();

function install() {
    ensureStyles();
    schedule();
    new MutationObserver(() => {
        schedule();
        reconcileFlow();
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
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
        if (active) positionGuide();
    });
}

function injectTutorialCard() {
    const shell = document.querySelector(".learn-shell");
    if (!shell || document.getElementById(CARD_ID) || !DEMO_PLAN) return;
    const completed = readCompleted();
    const section = document.createElement("section");
    section.className = "interactive-workout-tutorial-section";
    section.innerHTML = `
        <header><div><small>INTERACTIVE PRACTICE</small><h3>Learn by doing</h3></div><p>Practice the production workout logger using a real Level Up template.</p></header>
        <button id="${CARD_ID}" class="interactive-workout-tutorial-card${completed ? " is-complete" : ""}" type="button">
            <span class="interactive-workout-tutorial-icon" aria-hidden="true">☝️</span>
            <span class="interactive-workout-tutorial-copy"><strong>Interactive Workout Logger</strong><small>Uses Upper / Lower Balanced · Day 1 – Upper A with the actual workout controls and plate calculator.</small><span>Hands-on · ${STEPS.length} steps · about 3 min</span></span>
            <span class="interactive-workout-tutorial-state">${completed ? "Practice again →" : "Start →"}</span>
        </button>`;
    const appGuides = shell.querySelector(".learn-library-heading");
    if (appGuides) appGuides.insertAdjacentElement("beforebegin", section);
    else shell.appendChild(section);
}

function handleClick(event) {
    const launch = event.target.closest?.(`#${CARD_ID}`);
    if (launch) {
        event.preventDefault();
        startTutorial();
        return;
    }
    if (!active) return;

    if (event.target.closest?.("[data-interactive-tutorial-exit]")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        exitTutorial(false);
        return;
    }

    const finish = event.target.closest?.("#save-session-btn");
    if (finish) {
        event.preventDefault();
        event.stopImmediatePropagation();
        finishTutorial();
        return;
    }

    if (event.target.closest?.("#begin-session-btn")) {
        window.setTimeout(() => {
            prepareBenchSet();
            setStep(1);
        }, 120);
        return;
    }

    if (event.target.closest?.(`${BENCH_SELECTOR} .logger-form-guide-btn`)) {
        flow = "form-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 80);
        return;
    }

    if (event.target.closest?.(`${BENCH_SELECTOR} .exercise-warmup-btn`)) {
        window.setTimeout(() => setStep(3), 120);
        return;
    }

    if (event.target.closest?.(`${BENCH_SELECTOR} .complete-warmup-btn`)) {
        window.setTimeout(() => {
            prepareBenchSet();
            setStep(4);
        }, 120);
        return;
    }

    if (event.target.closest?.(`${BENCH_SELECTOR} .plate-calculator-trigger`)) {
        flow = "plate-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 80);
        return;
    }

    if (event.target.closest?.(`${BENCH_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`)) {
        window.setTimeout(() => setStep(6), 160);
        return;
    }

    if (event.target.closest?.(`${BENCH_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`)) {
        window.setTimeout(() => setStep(7), 160);
        return;
    }

    if (event.target.closest?.(`${BENCH_SELECTOR} .session-inline-swap`)) {
        flow = "swap-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 80);
    }
}

function startTutorial() {
    if (active || !DEMO_PLAN) return;
    active = true;
    stepIndex = 0;
    flow = null;
    installStorageSandbox();
    document.documentElement.dataset.localDataSandbox = "true";
    document.documentElement.classList.add("interactive-workout-tutorial-active");
    navigate("workout");
    waitFor(".workout-page", () => {
        openWorkoutLogger(DEMO_PLAN);
        waitFor("#workout-session-logger", logger => {
            logger.dataset.interactiveTutorial = "true";
            const day = logger.querySelector("#session-day-select");
            if (day) {
                day.value = "0";
                day.dispatchEvent(new Event("change", { bubbles: true }));
            }
            ensureGuide();
            setStep(0);
        });
    });
}

function installStorageSandbox() {
    if (storageSandbox) return;
    const prototype = Storage.prototype;
    const originalGetItem = prototype.getItem;
    const originalSetItem = prototype.setItem;
    const originalRemoveItem = prototype.removeItem;
    storageSandbox = { prototype, originalGetItem, originalSetItem, originalRemoveItem };
    sandboxActiveWorkout = null;

    prototype.getItem = function(key) {
        if (active && this === localStorage && String(key) === ACTIVE_WORKOUT_STORAGE_KEY) return sandboxActiveWorkout;
        return originalGetItem.call(this, key);
    };
    prototype.setItem = function(key, value) {
        if (active && this === localStorage && String(key) === ACTIVE_WORKOUT_STORAGE_KEY) {
            sandboxActiveWorkout = String(value);
            return;
        }
        return originalSetItem.call(this, key, value);
    };
    prototype.removeItem = function(key) {
        if (active && this === localStorage && String(key) === ACTIVE_WORKOUT_STORAGE_KEY) {
            sandboxActiveWorkout = null;
            return;
        }
        return originalRemoveItem.call(this, key);
    };
}

function restoreStorageSandbox() {
    if (!storageSandbox) return;
    const { prototype, originalGetItem, originalSetItem, originalRemoveItem } = storageSandbox;
    prototype.getItem = originalGetItem;
    prototype.setItem = originalSetItem;
    prototype.removeItem = originalRemoveItem;
    storageSandbox = null;
    sandboxActiveWorkout = null;
}

function prepareBenchSet() {
    const card = document.querySelector(BENCH_SELECTOR);
    if (!card) return;
    const row = card.querySelector('.session-set-row[data-set-index="0"]');
    const weight = row?.querySelector(".session-weight");
    const reps = row?.querySelector(".session-reps");
    if (weight && !Number(weight.value)) {
        weight.value = "135";
        weight.dispatchEvent(new Event("input", { bubbles: true }));
        weight.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (reps && !Number(reps.value)) {
        reps.value = "8";
        reps.dispatchEvent(new Event("input", { bubbles: true }));
        reps.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

function reconcileFlow() {
    if (!active || !flow) return;
    if (flow === "form-opening") {
        if (document.querySelector(".exercise-guide-screen")) flow = "form-open";
        return;
    }
    if (flow === "form-open") {
        if (!document.querySelector(".exercise-guide-screen")) {
            flow = null;
            setStep(2);
        }
        return;
    }
    const plate = document.querySelector(".plate-calculator-overlay");
    if (flow === "plate-opening") {
        if (plate && !plate.hidden) flow = "plate-open";
        return;
    }
    if (flow === "plate-open") {
        if (!plate || plate.hidden) {
            flow = null;
            setStep(5);
        }
        return;
    }
    const swap = document.querySelector("#session-exercise-swap-sheet");
    if (flow === "swap-opening") {
        if (swap && !swap.hidden) flow = "swap-open";
        return;
    }
    if (flow === "swap-open" && (!swap || swap.hidden)) {
        flow = null;
        setStep(8);
    }
}

function ensureGuide() {
    if (document.querySelector("[data-interactive-tutorial-guide]")) return;
    document.body.insertAdjacentHTML("beforeend", `
        <div class="interactive-tutorial-sandbox-badge" data-interactive-tutorial-badge><span>DEMO</span><strong>Upper / Lower Balanced · Day 1 – Upper A</strong></div>
        <div class="interactive-tutorial-finger" data-interactive-tutorial-finger aria-hidden="true">👇</div>
        <aside class="interactive-tutorial-guide" data-interactive-tutorial-guide role="status" aria-live="polite">
            <div><small data-interactive-step-label></small><strong data-interactive-step-title></strong><p data-interactive-step-body></p></div>
            <button type="button" data-interactive-tutorial-exit>Exit tutorial</button>
        </aside>`);
}

function setStep(index) {
    if (!active) return;
    stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
    ensureGuide();
    const step = STEPS[stepIndex];
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    setText(guide?.querySelector("[data-interactive-step-label]"), `STEP ${stepIndex + 1} OF ${STEPS.length}`);
    setText(guide?.querySelector("[data-interactive-step-title]"), step.title);
    setText(guide?.querySelector("[data-interactive-step-body]"), step.body);
    showGuide();
    window.setTimeout(positionGuide, 50);
}

function positionGuide() {
    if (!active || flow) return;
    document.querySelectorAll(".interactive-tutorial-focus").forEach(node => node.classList.remove("interactive-tutorial-focus"));
    const step = STEPS[stepIndex];
    const target = step ? document.querySelector(step.target) : null;
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    if (!target || !finger) {
        if (finger) finger.hidden = true;
        return;
    }
    target.classList.add("interactive-tutorial-focus");
    const rect = target.getBoundingClientRect();
    if (rect.top < 90 || rect.bottom > window.innerHeight - 190) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        window.setTimeout(positionGuide, 280);
        return;
    }
    const nextLeft = Math.max(16, Math.min(window.innerWidth - 54, rect.left + rect.width / 2 - 18));
    const nextTop = Math.max(55, rect.top - 42);
    finger.style.left = `${nextLeft}px`;
    finger.style.top = `${nextTop}px`;
    finger.hidden = false;
}

function hideGuide() {
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    if (guide) guide.hidden = true;
    if (finger) finger.hidden = true;
    document.querySelectorAll(".interactive-tutorial-focus").forEach(node => node.classList.remove("interactive-tutorial-focus"));
}

function showGuide() {
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    if (guide) guide.hidden = false;
}

function finishTutorial() {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
    exitTutorial(true);
}

function exitTutorial(completed) {
    if (!active) return;
    hideGuide();
    document.querySelector("[data-interactive-tutorial-guide]")?.remove();
    document.querySelector("[data-interactive-tutorial-finger]")?.remove();
    document.querySelector("[data-interactive-tutorial-badge]")?.remove();
    document.querySelector(".plate-calculator-overlay")?.remove();
    active = false;
    flow = null;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    delete document.documentElement.dataset.localDataSandbox;
    restoreStorageSandbox();
    navigate("more");
    waitFor('[data-more-page="learn"]', button => {
        button.click();
        if (completed) window.setTimeout(() => document.getElementById(CARD_ID)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    });
}

function waitFor(selector, callback, attempts = 0) {
    const node = document.querySelector(selector);
    if (node) {
        callback(node);
        return;
    }
    if (attempts >= 60) {
        if (active) exitTutorial(false);
        return;
    }
    window.setTimeout(() => waitFor(selector, callback, attempts + 1), 50);
}

function readCompleted() {
    try { return JSON.parse(localStorage.getItem(COMPLETION_KEY) || "null")?.completed === true; }
    catch { return false; }
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .interactive-workout-tutorial-section{margin:18px 0}.interactive-workout-tutorial-section>header{margin-bottom:9px}.interactive-workout-tutorial-section>header>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.interactive-workout-tutorial-section>header small{color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.08em}.interactive-workout-tutorial-section>header h3{margin:2px 0;color:var(--text)}.interactive-workout-tutorial-section>header p{margin:0;color:var(--muted);font-size:11px}.interactive-workout-tutorial-card{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;width:100%;padding:13px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--card-border,#333));border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--card)),var(--card));color:var(--text);text-align:left}.interactive-workout-tutorial-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:color-mix(in srgb,var(--accent) 15%,transparent);font-size:24px}.interactive-workout-tutorial-copy strong,.interactive-workout-tutorial-copy small,.interactive-workout-tutorial-copy span{display:block}.interactive-workout-tutorial-copy strong{font-size:13px}.interactive-workout-tutorial-copy small{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}.interactive-workout-tutorial-copy span{margin-top:5px;color:var(--accent);font-size:9px;font-weight:850}.interactive-workout-tutorial-state{font-size:10px;font-weight:900;white-space:nowrap}
        html.interactive-workout-tutorial-active .bottom-nav{display:none!important}html.interactive-workout-tutorial-active #content{padding-bottom:230px!important}
        .interactive-tutorial-sandbox-badge{position:fixed;z-index:10030;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;max-width:calc(100vw - 24px);padding:6px 9px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--card-border,#333));border-radius:999px;background:color-mix(in srgb,var(--card) 94%,transparent);box-shadow:0 6px 22px rgba(0,0,0,.24);white-space:nowrap}.interactive-tutorial-sandbox-badge span{padding:3px 5px;border-radius:999px;background:var(--accent);color:var(--accent-text,#fff);font-size:8px;font-weight:950}.interactive-tutorial-sandbox-badge strong{overflow:hidden;text-overflow:ellipsis;color:var(--text);font-size:9px}
        .interactive-tutorial-guide{position:fixed;z-index:10040;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;gap:11px;padding:11px 12px;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333));border-radius:16px;background:color-mix(in srgb,var(--card) 97%,transparent);box-shadow:0 12px 36px rgba(0,0,0,.38);color:var(--text);backdrop-filter:blur(16px)}.interactive-tutorial-guide[hidden]{display:none!important}.interactive-tutorial-guide div{min-width:0}.interactive-tutorial-guide small,.interactive-tutorial-guide strong,.interactive-tutorial-guide p{display:block}.interactive-tutorial-guide small{color:var(--accent);font-size:8px;font-weight:950;letter-spacing:.08em}.interactive-tutorial-guide strong{margin-top:2px;font-size:12px}.interactive-tutorial-guide p{margin:3px 0 0;color:var(--muted);font-size:9px;line-height:1.35}.interactive-tutorial-guide>button{flex:0 0 auto;padding:7px 8px;border:0;background:transparent;color:var(--muted);font-size:9px;font-weight:850}
        .interactive-tutorial-finger{position:fixed;z-index:10045;width:38px;height:38px;font-size:28px;line-height:38px;text-align:center;pointer-events:none;filter:drop-shadow(0 4px 7px rgba(0,0,0,.45));animation:interactive-tutorial-point .85s ease-in-out infinite alternate}.interactive-tutorial-finger[hidden]{display:none!important}.interactive-tutorial-focus{position:relative!important;z-index:10032!important;outline:3px solid var(--accent)!important;outline-offset:3px!important;box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 18%,transparent),0 8px 28px rgba(0,0,0,.32)!important}
        @keyframes interactive-tutorial-point{from{transform:translateY(-3px)}to{transform:translateY(6px)}}
        @media(max-width:430px){.interactive-workout-tutorial-card{grid-template-columns:40px minmax(0,1fr);}.interactive-workout-tutorial-state{grid-column:2}.interactive-tutorial-guide{align-items:flex-start}.interactive-tutorial-guide>button{padding-top:2px}.interactive-tutorial-sandbox-badge strong{max-width:255px}}
    `;
    document.head.appendChild(style);
}
