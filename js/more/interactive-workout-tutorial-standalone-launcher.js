import { navigate } from "../core/router.js?v=deload-workout-preview-1";
import { presetPlans } from "../workouts/workout-plans.js?v=interactive-workout-tutorial-6";
import { openWorkoutLogger, ACTIVE_WORKOUT_STORAGE_KEY } from "../workouts/workout-session.js?v=workout-source-stats-1";

const LAUNCHER_ID = "interactive-workout-tutorial-standalone";
const COMPLETION_KEY = "level_up_interactive_workout_tutorial_v4";
const ADAPTIVE_SETTINGS_KEY = "level_up_adaptive_guidance_settings";
const TUTORIAL_PLAN = presetPlans.find(plan => plan.id === "full-body-foundation");
const PRIMARY_SELECTOR = '.session-exercise-card[data-exercise-id="back-squat"]';
const FIRST_CARD_SELECTOR = '.session-exercise-card[data-exercise-index="0"]';
const PROTECTED_STORAGE_KEYS = [
    ACTIVE_WORKOUT_STORAGE_KEY,
    "forge_workout_sessions",
    ADAPTIVE_SETTINGS_KEY,
    "level_up_adaptive_guidance_state",
    "level_up_plate_calculator_settings"
];

const STEPS = [
    { target: "#begin-session-btn", title: "Start logging the workout", body: "Confirm the Training Day and Workout Date, then tap Begin Workout. This starts the timer and opens the exercise-by-exercise logger." },
    { target: `${PRIMARY_SELECTOR} .logger-form-guide-btn`, title: "Use the Form Guide", body: "Tap Form Guide whenever you want a technique refresher. It opens the exercise guide and returns you to the same workout when you are done." },
    { target: `${PRIMARY_SELECTOR} .exercise-warmup-btn`, title: "Show your warm-up sets", body: "Tap Warm-up to reveal the suggested warm-up sets. They stay separate from your programmed working sets." },
    { target: `${PRIMARY_SELECTOR} .complete-warmup-btn`, title: "Complete a warm-up", body: "After the warm-up, tap the completion control on that row. Level Up marks it complete and continues the normal rest flow." },
    { target: `${PRIMARY_SELECTOR} .plate-calculator-trigger`, title: "Use the plate calculator", body: "The plate calculator reads the active barbell weight and shows what to load on each side of the bar." },
    { target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`, title: "Log a working set", body: "Enter the weight and reps you performed, then tap Complete Set. Completed sets feed history, volume, strength trends and progression guidance." },
    { target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`, title: "Add a drop set", body: "Tap the set action to add a lighter Drop Set row, then enter the weight and reps you perform." },
    { target: `${PRIMARY_SELECTOR} .session-inline-swap`, title: "Swap an exercise for today", body: "Tap Swap when equipment is busy or you need another movement. Smart Swap ranks alternatives with a similar training purpose." },
    { target: `${FIRST_CARD_SELECTOR} .compact-add-set-btn`, title: "Add another working set", body: "Tap Add Set when you intentionally need one additional working set. The new row uses the same Weight, Reps and Complete workflow." },
    { target: `${FIRST_CARD_SELECTOR} .session-add-exercise-btn`, title: "Add an exercise", body: "Tap Add Exercise to open the exercise library without leaving the session, then choose the movement you want to add." },
    { target: "#save-session-btn", title: "Complete the workout", body: "At the end of a normal workout, Complete Workout saves the session to history and updates Progress. In this tutorial, tapping it finishes practice without saving a fake workout." }
];

let active = false;
let launching = false;
let stepIndex = 0;
let flow = null;
let queued = false;
let storageSnapshot = null;
let lastLaunchAt = 0;

install();

function install() {
    ensureStyles();
    recoverInterruptedTutorial();
    queueSync();

    new MutationObserver(() => {
        queueSync();
        reconcileFlow();
        suppressAdaptiveUI();
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });

    document.addEventListener("pointerup", handleLaunchCapture, true);
    document.addEventListener("click", handleClickCapture, true);
    document.addEventListener("keydown", handleKeydown, true);
    window.addEventListener("resize", positionGuide);
    window.addEventListener("scroll", positionGuide, true);
    window.addEventListener("pagehide", restoreProtectedStorage, true);
    window.addEventListener("beforeunload", restoreProtectedStorage, true);
}

function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        injectLauncher();
        suppressAdaptiveUI();
        if (active) positionGuide();
    });
}

function injectLauncher() {
    const shell = document.querySelector(".learn-shell");
    if (!shell || document.getElementById(LAUNCHER_ID)) return;

    const section = document.createElement("section");
    section.id = LAUNCHER_ID;
    section.className = "interactive-workout-direct-section";
    section.innerHTML = `
        <header class="interactive-workout-direct-heading">
            <div><small>INTERACTIVE PRACTICE</small><h3>Learn by doing</h3></div>
            <p>Practice the actual workout logger with a real Level Up plan and follow the controls on screen.</p>
        </header>
        <div class="interactive-workout-direct-card" role="button" tabindex="0" data-interactive-workout-direct-start aria-label="Start Interactive Workout Logger tutorial">
            <span class="interactive-workout-direct-copy">
                <strong>Interactive Workout Logger</strong>
                <small>Full Body Foundation · Day 1 – Full Body A</small>
                <span>Form guide · warm-ups · plate calculator · working sets · drop sets · Smart Swap · Add Set · Add Exercise</span>
            </span>
            <span class="interactive-workout-direct-action">${readCompleted() ? "Practice again →" : "Start →"}</span>
        </div>`;

    const libraryHeading = shell.querySelector(".learn-library-heading");
    if (libraryHeading) libraryHeading.insertAdjacentElement("beforebegin", section);
    else shell.appendChild(section);
}

function handleLaunchCapture(event) {
    const launcher = event.target.closest?.("[data-interactive-workout-direct-start]");
    if (!launcher) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    const now = Date.now();
    if (now - lastLaunchAt < 700) return;
    lastLaunchAt = now;
    startTutorial();
}

function handleClickCapture(event) {
    const launcher = event.target.closest?.("[data-interactive-workout-direct-start]");
    if (launcher) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        const now = Date.now();
        if (now - lastLaunchAt >= 700) {
            lastLaunchAt = now;
            startTutorial();
        }
        return;
    }

    if (!active) return;

    if (event.target.closest?.("[data-interactive-tutorial-exit]")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        exitTutorial(false);
        return;
    }

    if (event.target.closest?.("#save-session-btn")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        finishTutorial();
        return;
    }

    if (event.target.closest?.("#begin-session-btn")) {
        window.setTimeout(() => {
            preparePrimarySet();
            setStep(1);
        }, 180);
        return;
    }
    if (event.target.closest?.(`${PRIMARY_SELECTOR} .logger-form-guide-btn`)) {
        flow = "form-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 100);
        return;
    }
    if (event.target.closest?.(`${PRIMARY_SELECTOR} .exercise-warmup-btn`)) {
        window.setTimeout(() => setStep(3), 160);
        return;
    }
    if (event.target.closest?.(`${PRIMARY_SELECTOR} .complete-warmup-btn`)) {
        window.setTimeout(() => {
            preparePrimarySet();
            setStep(4);
        }, 160);
        return;
    }
    if (event.target.closest?.(`${PRIMARY_SELECTOR} .plate-calculator-trigger`)) {
        flow = "plate-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 100);
        return;
    }
    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`)) {
        window.setTimeout(() => setStep(6), 180);
        return;
    }
    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`)) {
        window.setTimeout(() => setStep(7), 180);
        return;
    }
    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-inline-swap`)) {
        flow = "swap-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 100);
        return;
    }
    if (event.target.closest?.(`${FIRST_CARD_SELECTOR} .compact-add-set-btn`)) {
        window.setTimeout(() => setStep(9), 200);
        return;
    }
    if (event.target.closest?.(`${FIRST_CARD_SELECTOR} .session-add-exercise-btn`)) {
        flow = "add-opening";
        hideGuide();
        window.setTimeout(reconcileFlow, 100);
    }
}

function handleKeydown(event) {
    const launcher = event.target.closest?.("[data-interactive-workout-direct-start]");
    if (!launcher || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.stopPropagation();
    startTutorial();
}

function startTutorial() {
    if (active || launching) return;
    if (!TUTORIAL_PLAN) {
        setLauncherAction("Tutorial unavailable");
        return;
    }

    launching = true;
    active = true;
    stepIndex = 0;
    flow = null;
    setLauncherAction("Opening…");

    try {
        protectStorage();
        document.documentElement.classList.add("interactive-workout-tutorial-active");
        navigate("workout");

        waitFor(".workout-page", () => {
            try {
                openWorkoutLogger(TUTORIAL_PLAN);
            } catch (error) {
                failLaunch(error);
                return;
            }

            waitFor("#workout-session-logger", logger => {
                logger.dataset.interactiveTutorial = "true";
                const day = logger.querySelector("#session-day-select");
                if (day) {
                    day.value = "0";
                    day.dispatchEvent(new Event("change", { bubbles: true }));
                }
                suppressAdaptiveUI();
                ensureGuide();
                setStep(0);
                launching = false;
            });
        });
    } catch (error) {
        failLaunch(error);
    }
}

function protectStorage() {
    if (storageSnapshot) return;
    storageSnapshot = new Map(PROTECTED_STORAGE_KEYS.map(key => [key, localStorage.getItem(key)]));
    sessionStorage.setItem("level_up_tutorial_storage_restore_v2", JSON.stringify([...storageSnapshot]));
    document.documentElement.dataset.localDataSandbox = "true";
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
    localStorage.setItem(ADAPTIVE_SETTINGS_KEY, JSON.stringify({ enabled: false }));
}

function restoreProtectedStorage() {
    if (!storageSnapshot) return;
    for (const [key, value] of storageSnapshot.entries()) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    }
    storageSnapshot = null;
    sessionStorage.removeItem("level_up_tutorial_storage_restore_v2");
    delete document.documentElement.dataset.localDataSandbox;
}

function recoverInterruptedTutorial() {
    try {
        const raw = sessionStorage.getItem("level_up_tutorial_storage_restore_v2");
        if (!raw) return;
        const entries = JSON.parse(raw);
        if (Array.isArray(entries)) {
            entries.forEach(([key, value]) => {
                if (!PROTECTED_STORAGE_KEYS.includes(key)) return;
                if (value === null) localStorage.removeItem(key);
                else localStorage.setItem(key, value);
            });
        }
    } catch (error) {
        console.warn("Tutorial recovery failed", error);
    } finally {
        sessionStorage.removeItem("level_up_tutorial_storage_restore_v2");
        delete document.documentElement.dataset.localDataSandbox;
    }
}

function preparePrimarySet() {
    const card = document.querySelector(PRIMARY_SELECTOR);
    const row = card?.querySelector('.session-set-row[data-set-index="0"]');
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

function suppressAdaptiveUI() {
    if (!active) return;
    document.querySelectorAll(".adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner").forEach(node => node.remove());
    document.getElementById("workout-session-logger")?.classList.remove("adaptive-guidance-on", "adaptive-deload-active", "adaptive-deload-preview-active");
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
    if (flow === "swap-open") {
        if (!swap || swap.hidden) {
            flow = null;
            setStep(8);
        }
        return;
    }

    const addSheet = document.querySelector("#session-add-exercise-sheet");
    if (flow === "add-opening") {
        if (addSheet && !addSheet.hidden) flow = "add-open";
        return;
    }
    if (flow === "add-open" && (!addSheet || addSheet.hidden)) {
        flow = null;
        setStep(10);
    }
}

function ensureGuide() {
    if (document.querySelector("[data-interactive-tutorial-guide]")) return;
    document.body.insertAdjacentHTML("beforeend", `
        <div class="interactive-tutorial-plan-badge" data-interactive-tutorial-badge><span>TUTORIAL</span><strong>Full Body Foundation · Day 1 – Full Body A</strong></div>
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
    if (guide) guide.hidden = false;
    window.setTimeout(positionGuide, 80);
}

function positionGuide() {
    if (!active || flow) return;
    document.querySelectorAll(".interactive-tutorial-focus").forEach(node => node.classList.remove("interactive-tutorial-focus"));
    const step = STEPS[stepIndex];
    const target = step ? document.querySelector(step.target) : null;
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    if (!target || !finger || !guide) {
        if (finger) finger.hidden = true;
        return;
    }
    target.classList.add("interactive-tutorial-focus");
    const rect = target.getBoundingClientRect();
    const guideHeight = Math.max(140, guide.getBoundingClientRect().height || 0);
    const bottomClearance = guideHeight + 40;
    if (rect.top < 88 || rect.bottom > window.innerHeight - bottomClearance) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        window.setTimeout(positionGuide, 320);
        return;
    }
    finger.style.left = `${Math.max(16, Math.min(window.innerWidth - 54, rect.left + rect.width / 2 - 18))}px`;
    finger.style.top = `${Math.max(54, rect.top - 42)}px`;
    finger.hidden = false;
}

function hideGuide() {
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    if (guide) guide.hidden = true;
    if (finger) finger.hidden = true;
    document.querySelectorAll(".interactive-tutorial-focus").forEach(node => node.classList.remove("interactive-tutorial-focus"));
}

function finishTutorial() {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
    exitTutorial(true);
}

function exitTutorial(completed) {
    if (!active && !launching) return;
    hideGuide();
    document.querySelector("[data-interactive-tutorial-guide]")?.remove();
    document.querySelector("[data-interactive-tutorial-finger]")?.remove();
    document.querySelector("[data-interactive-tutorial-badge]")?.remove();
    document.querySelector(".plate-calculator-overlay")?.remove();
    document.querySelector("#session-exercise-swap-sheet")?.remove();
    document.querySelector("#session-add-exercise-sheet")?.remove();
    active = false;
    launching = false;
    flow = null;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    restoreProtectedStorage();
    navigate("more");
    waitFor('[data-more-page="learn"]', button => {
        button.click();
        if (completed) window.setTimeout(() => document.getElementById(LAUNCHER_ID)?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    }, 0, false);
}

function failLaunch(error) {
    console.error("Interactive workout tutorial failed to open", error);
    active = false;
    launching = false;
    flow = null;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    restoreProtectedStorage();
    const launcher = document.getElementById(LAUNCHER_ID);
    if (launcher) {
        setLauncherAction("Try again →");
        return;
    }
    navigate("more");
    waitFor('[data-more-page="learn"]', button => {
        button.click();
        window.setTimeout(() => setLauncherAction("Try again →"), 120);
    }, 0, false);
}

function waitFor(selector, callback, attempts = 0, failOnTimeout = true) {
    const node = document.querySelector(selector);
    if (node) {
        callback(node);
        return;
    }
    if (attempts >= 160) {
        if (failOnTimeout) failLaunch(new Error(`Timed out waiting for ${selector}`));
        return;
    }
    window.setTimeout(() => waitFor(selector, callback, attempts + 1, failOnTimeout), 50);
}

function setLauncherAction(value) {
    setText(document.querySelector(`#${LAUNCHER_ID} .interactive-workout-direct-action`), value);
}

function readCompleted() {
    try { return JSON.parse(localStorage.getItem(COMPLETION_KEY) || "null")?.completed === true; }
    catch { return false; }
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyles() {
    if (document.getElementById("interactive-workout-direct-styles")) return;
    const style = document.createElement("style");
    style.id = "interactive-workout-direct-styles";
    style.textContent = `
        .interactive-workout-tutorial-section,#interactive-workout-tutorial-entry,.interactive-workout-native-launch{display:none!important}
        #${LAUNCHER_ID}{box-sizing:border-box;position:relative;isolation:isolate;z-index:40;display:grid;gap:9px;margin:10px 0 4px;min-width:0;pointer-events:auto!important}
        #${LAUNCHER_ID}::before,#${LAUNCHER_ID}::after,#${LAUNCHER_ID} *::before,#${LAUNCHER_ID} *::after{content:none!important;display:none!important;background:none!important;background-image:none!important;mask:none!important;-webkit-mask:none!important}
        #${LAUNCHER_ID} svg{display:none!important}
        .interactive-workout-direct-heading{display:grid;gap:3px;padding:0 2px}
        .interactive-workout-direct-heading>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
        .interactive-workout-direct-heading small{color:var(--accent-text,var(--accent));font-size:9px;font-weight:900;letter-spacing:.1em}
        .interactive-workout-direct-heading h3{margin:0;color:var(--text);font-size:18px;line-height:1.2}
        .interactive-workout-direct-heading p{margin:0;color:var(--muted);font-size:11px;line-height:1.4}
        .interactive-workout-direct-card{box-sizing:border-box;position:relative;z-index:41;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;width:100%;min-width:0;margin:0;padding:15px 16px;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 11%,var(--card)),var(--card));color:var(--text);box-shadow:var(--shadow);cursor:pointer;pointer-events:auto!important;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none}
        .interactive-workout-direct-card:active{transform:scale(.995)}
        .interactive-workout-direct-card:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
        .interactive-workout-direct-copy{display:grid;gap:3px;min-width:0}
        .interactive-workout-direct-copy strong{display:block;color:var(--text);font-size:14px;line-height:1.22}
        .interactive-workout-direct-copy small{display:block;color:var(--muted);font-size:10px;line-height:1.35}
        .interactive-workout-direct-copy span{display:block;color:var(--muted);font-size:9px;line-height:1.4}
        .interactive-workout-direct-action{color:var(--accent-text,var(--accent));font-size:10px;font-weight:900;white-space:nowrap}
        html.interactive-workout-tutorial-active .bottom-nav{display:none!important}
        html.interactive-workout-tutorial-active #content{padding-bottom:285px!important}
        html.interactive-workout-tutorial-active :is(.adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner){display:none!important}
        .interactive-tutorial-plan-badge{position:fixed;z-index:10030;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;max-width:calc(100vw - 24px);padding:6px 9px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--card-border,#333));border-radius:999px;background:color-mix(in srgb,var(--card) 96%,transparent);box-shadow:0 6px 22px rgba(0,0,0,.24);white-space:nowrap}
        .interactive-tutorial-plan-badge span{padding:3px 5px;border-radius:999px;background:var(--accent);color:var(--accent-text,#fff);font-size:8px;font-weight:950}
        .interactive-tutorial-plan-badge strong{overflow:hidden;text-overflow:ellipsis;color:var(--text);font-size:9px}
        .interactive-tutorial-guide{position:fixed;z-index:10040;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:flex-start;justify-content:space-between;gap:11px;max-height:min(240px,44vh);overflow:auto;padding:12px;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333));border-radius:16px;background:color-mix(in srgb,var(--card) 98%,transparent);box-shadow:0 12px 36px rgba(0,0,0,.38);color:var(--text);backdrop-filter:blur(16px)}
        .interactive-tutorial-guide[hidden]{display:none!important}
        .interactive-tutorial-guide div{min-width:0}
        .interactive-tutorial-guide small,.interactive-tutorial-guide strong,.interactive-tutorial-guide p{display:block}
        .interactive-tutorial-guide small{color:var(--accent);font-size:8px;font-weight:950;letter-spacing:.08em}
        .interactive-tutorial-guide strong{margin-top:2px;font-size:13px;line-height:1.2}
        .interactive-tutorial-guide p{margin:5px 0 0;color:var(--text-secondary,var(--muted));font-size:10px;line-height:1.48}
        .interactive-tutorial-guide>button{flex:0 0 auto;padding:5px 6px;border:0;background:transparent;color:var(--muted);font-size:9px;font-weight:850}
        .interactive-tutorial-finger{position:fixed;z-index:10045;width:38px;height:38px;font-size:28px;line-height:38px;text-align:center;pointer-events:none;filter:drop-shadow(0 4px 7px rgba(0,0,0,.45));animation:interactive-tutorial-point .85s ease-in-out infinite alternate}
        .interactive-tutorial-finger[hidden]{display:none!important}
        .interactive-tutorial-focus{position:relative!important;z-index:10032!important;outline:3px solid var(--accent)!important;outline-offset:3px!important;box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 18%,transparent),0 8px 28px rgba(0,0,0,.32)!important}
        @keyframes interactive-tutorial-point{from{transform:translateY(-3px)}to{transform:translateY(6px)}}
        @media(max-width:430px){
            .interactive-workout-direct-card{grid-template-columns:minmax(0,1fr);gap:8px;padding:14px}
            .interactive-workout-direct-action{justify-self:start}
            .interactive-tutorial-guide{left:10px;right:10px}
            .interactive-tutorial-plan-badge strong{max-width:250px}
        }
    `;
    document.head.appendChild(style);
}
