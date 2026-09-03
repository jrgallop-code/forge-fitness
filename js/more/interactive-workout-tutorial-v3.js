import { navigate } from "../core/router.js?v=deload-workout-preview-1";
import { presetPlans } from "../workouts/workout-plans.js?v=interactive-workout-tutorial-6";
import { openWorkoutLogger, ACTIVE_WORKOUT_STORAGE_KEY } from "../workouts/workout-session.js?v=workout-source-stats-1";

const STYLE_ID = "level-up-interactive-workout-tutorial-v3-styles";
const CARD_ID = "interactive-workout-tutorial-card";
const CARD_VERSION = "3";
const COMPLETION_KEY = "level_up_interactive_workout_tutorial_v3";
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
    {
        target: "#begin-session-btn",
        title: "Start logging the workout",
        body: "Normally, go to Workout → My Workouts, choose your plan, and tap Log a Workout. Confirm the Training Day and Workout Date here, then tap Begin Workout. This starts the workout timer and opens the exercise-by-exercise logger."
    },
    {
        target: `${PRIMARY_SELECTOR} .logger-form-guide-btn`,
        title: "Use the Form Guide",
        body: "Tap Form Guide whenever you want a technique refresher before or during an exercise. It opens the exercise guide with setup cues and the form video, then returns you to the same place in the workout when you are done."
    },
    {
        target: `${PRIMARY_SELECTOR} .exercise-warmup-btn`,
        title: "Show your warm-up sets",
        body: "Tap Warm-up to reveal the suggested warm-up sets for this lift. Warm-ups prepare you for the working weight and stay separate from the programmed working sets, so they do not replace Set 1, Set 2, or Set 3."
    },
    {
        target: `${PRIMARY_SELECTOR} .complete-warmup-btn`,
        title: "Complete a warm-up",
        body: "After performing the warm-up, tap the completion button on that row. Level Up marks it finished and can start the normal rest-timer flow so you know when to move to the next set."
    },
    {
        target: `${PRIMARY_SELECTOR} .plate-calculator-trigger`,
        title: "Use the plate calculator",
        body: "For barbell exercises, the plate calculator reads the weight entered in the active set and shows exactly what to load on each side of the bar. Use it whenever the target load changes and you want to avoid plate math."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`,
        title: "Log a working set",
        body: "Each working-set row shows previous performance, today’s Weight, today’s Reps, and the completion button. Enter what you actually lifted after the set, then tap Complete Set. Completed sets feed workout history, volume, strength trends, and progression guidance."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`,
        title: "Add a drop set",
        body: "Tap the set-number action when you want to continue immediately at a lighter load after a working set. Level Up adds a Drop Set row and suggests a practical lighter weight. Enter the weight and reps you perform, then mark the drop complete."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-inline-swap`,
        title: "Swap an exercise for today",
        body: "Tap Swap if equipment is busy or you need a different movement today. Smart Swap ranks alternatives with a similar training purpose. The change is for the active workout and does not rewrite the saved plan."
    },
    {
        target: `${FIRST_CARD_SELECTOR} .compact-add-set-btn`,
        title: "Add another working set",
        body: "Tap Add Set when you intentionally need one extra working set for this exercise. The new row follows the same Weight, Reps, and Complete workflow as the programmed sets."
    },
    {
        target: `${FIRST_CARD_SELECTOR} .session-add-exercise-btn`,
        title: "Add an exercise during the workout",
        body: "Tap Add Exercise to open the exercise library without leaving the session. Search by exercise name or browse by muscle, then choose the movement you want to add for today."
    },
    {
        target: "#save-session-btn",
        title: "Complete the workout",
        body: "When the session is finished, tap Complete Workout. In a normal workout this saves the session to Workout History and sends the completed set data into Progress, including volume and strength tracking."
    }
];

let active = false;
let stepIndex = 0;
let flow = null;
let queued = false;
let storageSnapshot = null;

install();

function install() {
    ensureStyles();
    recoverInterruptedTutorial();
    schedule();

    new MutationObserver(() => {
        schedule();
        reconcileFlow();
        suppressAdaptiveUI();
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "class"]
    });

    // Capture at window level so an older cached tutorial module cannot intercept
    // the card tap first. This is especially important for installed iOS PWAs.
    window.addEventListener("click", handleLaunchCapture, true);
    window.addEventListener("pointerup", handlePointerLaunch, true);
    document.addEventListener("click", handleTutorialClick, true);
    window.addEventListener("resize", positionGuide);
    window.addEventListener("scroll", positionGuide, true);
    window.addEventListener("pagehide", restoreProtectedStorage, true);
    window.addEventListener("beforeunload", restoreProtectedStorage, true);
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        injectTutorialCard();
        suppressAdaptiveUI();
        if (active) positionGuide();
    });
}

function injectTutorialCard() {
    const shell = document.querySelector(".learn-shell");
    if (!shell || !TUTORIAL_PLAN) return;

    const existing = document.getElementById(CARD_ID);
    if (existing && existing.dataset.tutorialVersion !== CARD_VERSION) {
        existing.closest(".interactive-workout-tutorial-section")?.remove();
    }
    if (document.getElementById(CARD_ID)) return;

    const completed = readCompleted();
    const section = document.createElement("section");
    section.className = "interactive-workout-tutorial-section";
    section.innerHTML = `
        <header>
            <div><small>INTERACTIVE TUTORIAL</small><h3>Learn the workout logger</h3></div>
            <p>Walk through a full workout using an existing Level Up template and learn what each control is for.</p>
        </header>
        <button id="${CARD_ID}" data-tutorial-version="${CARD_VERSION}" class="interactive-workout-tutorial-card${completed ? " is-complete" : ""}" type="button" aria-label="Start Interactive Workout Logger tutorial">
            <span class="interactive-workout-tutorial-icon" aria-hidden="true">☝️</span>
            <span class="interactive-workout-tutorial-copy">
                <strong>Interactive Workout Logger</strong>
                <small>Full Body Foundation · Day 1 – Full Body A · form guide, warm-ups, plate calculator, sets, drop sets, swaps, Add Set and Add Exercise.</small>
                <span>${STEPS.length} guided steps · about 4 min</span>
            </span>
            <span class="interactive-workout-tutorial-state">${completed ? "Practice again →" : "Start →"}</span>
        </button>`;

    const card = section.querySelector(`#${CARD_ID}`);
    card?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        startTutorial();
    });

    const appGuides = shell.querySelector(".learn-library-heading");
    if (appGuides) appGuides.insertAdjacentElement("beforebegin", section);
    else shell.appendChild(section);
}

function isLaunchTarget(target) {
    return Boolean(target?.closest?.(`#${CARD_ID}[data-tutorial-version="${CARD_VERSION}"]`));
}

function handleLaunchCapture(event) {
    if (!isLaunchTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    startTutorial();
}

function handlePointerLaunch(event) {
    if (!isLaunchTarget(event.target) || active) return;
    if (event.pointerType && event.pointerType !== "touch" && event.pointerType !== "pen") return;
    startTutorial();
}

function handleTutorialClick(event) {
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

function startTutorial() {
    if (active || !TUTORIAL_PLAN) return;
    active = true;
    stepIndex = 0;
    flow = null;

    try {
        protectStorage();
        document.documentElement.classList.add("interactive-workout-tutorial-active");
        navigate("workout");

        waitFor(".workout-page", () => {
            openWorkoutLogger(TUTORIAL_PLAN);
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
            });
        });
    }
    catch (error) {
        console.error("Interactive tutorial failed to open", error);
        active = false;
        document.documentElement.classList.remove("interactive-workout-tutorial-active");
        restoreProtectedStorage();
        showLaunchError();
    }
}

function protectStorage() {
    if (storageSnapshot) return;
    storageSnapshot = new Map(PROTECTED_STORAGE_KEYS.map(key => [key, localStorage.getItem(key)]));
    sessionStorage.setItem("level_up_tutorial_storage_restore_v1", JSON.stringify([...storageSnapshot]));
    document.documentElement.dataset.localDataSandbox = "true";

    // Start from a clean temporary workout while preserving the user's original
    // active session for restoration when the tutorial exits.
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
    sessionStorage.removeItem("level_up_tutorial_storage_restore_v1");
    delete document.documentElement.dataset.localDataSandbox;
}

function recoverInterruptedTutorial() {
    try {
        const raw = sessionStorage.getItem("level_up_tutorial_storage_restore_v1");
        if (!raw) return;
        const entries = JSON.parse(raw);
        if (!Array.isArray(entries)) return;
        entries.forEach(([key, value]) => {
            if (!PROTECTED_STORAGE_KEYS.includes(key)) return;
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        });
        sessionStorage.removeItem("level_up_tutorial_storage_restore_v1");
        delete document.documentElement.dataset.localDataSandbox;
    }
    catch {
        sessionStorage.removeItem("level_up_tutorial_storage_restore_v1");
    }
}

function preparePrimarySet() {
    const card = document.querySelector(PRIMARY_SELECTOR);
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

function suppressAdaptiveUI() {
    if (!active) return;
    document.querySelectorAll(".adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner").forEach(node => node.remove());
    const logger = document.getElementById("workout-session-logger");
    logger?.classList.remove("adaptive-guidance-on", "adaptive-deload-active", "adaptive-deload-preview-active");
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
            <div>
                <small data-interactive-step-label></small>
                <strong data-interactive-step-title></strong>
                <p data-interactive-step-body></p>
            </div>
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
    document.querySelector("#session-exercise-swap-sheet")?.remove();
    document.querySelector("#session-add-exercise-sheet")?.remove();

    active = false;
    flow = null;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    restoreProtectedStorage();

    navigate("more");
    waitFor('[data-more-page="learn"]', button => {
        button.click();
        if (completed) {
            window.setTimeout(() => document.getElementById(CARD_ID)?.scrollIntoView({ behavior: "smooth", block: "center" }), 160);
        }
    });
}

function waitFor(selector, callback, attempts = 0) {
    const node = document.querySelector(selector);
    if (node) {
        callback(node);
        return;
    }
    if (attempts >= 80) {
        if (active) exitTutorial(false);
        return;
    }
    window.setTimeout(() => waitFor(selector, callback, attempts + 1), 50);
}

function showLaunchError() {
    const card = document.getElementById(CARD_ID);
    const state = card?.querySelector(".interactive-workout-tutorial-state");
    if (state) state.textContent = "Tap to try again →";
}

function readCompleted() {
    try {
        return JSON.parse(localStorage.getItem(COMPLETION_KEY) || "null")?.completed === true;
    }
    catch {
        return false;
    }
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .interactive-workout-tutorial-section{position:relative;z-index:2;margin:18px 0;pointer-events:auto!important}.interactive-workout-tutorial-section>header{margin-bottom:9px}.interactive-workout-tutorial-section>header>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.interactive-workout-tutorial-section>header small{color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.08em}.interactive-workout-tutorial-section>header h3{margin:2px 0;color:var(--text)}.interactive-workout-tutorial-section>header p{margin:0;color:var(--muted);font-size:11px;line-height:1.4}.interactive-workout-tutorial-card{position:relative;z-index:3;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;width:100%;min-height:76px;padding:13px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--card-border,#333));border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--card)),var(--card));color:var(--text);text-align:left;pointer-events:auto!important;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}.interactive-workout-tutorial-card>*{pointer-events:none}.interactive-workout-tutorial-card:active{transform:scale(.995)}.interactive-workout-tutorial-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:color-mix(in srgb,var(--accent) 15%,transparent);font-size:24px}.interactive-workout-tutorial-copy strong,.interactive-workout-tutorial-copy small,.interactive-workout-tutorial-copy span{display:block}.interactive-workout-tutorial-copy strong{font-size:13px}.interactive-workout-tutorial-copy small{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.4}.interactive-workout-tutorial-copy span{margin-top:5px;color:var(--accent);font-size:9px;font-weight:850}.interactive-workout-tutorial-state{font-size:10px;font-weight:900;white-space:nowrap}
        html.interactive-workout-tutorial-active .bottom-nav{display:none!important}html.interactive-workout-tutorial-active #content{padding-bottom:285px!important}html.interactive-workout-tutorial-active :is(.adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner){display:none!important}
        .interactive-tutorial-plan-badge{position:fixed;z-index:10030;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;max-width:calc(100vw - 24px);padding:6px 9px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--card-border,#333));border-radius:999px;background:color-mix(in srgb,var(--card) 96%,transparent);box-shadow:0 6px 22px rgba(0,0,0,.24);white-space:nowrap}.interactive-tutorial-plan-badge span{padding:3px 5px;border-radius:999px;background:var(--accent);color:var(--accent-text,#fff);font-size:8px;font-weight:950}.interactive-tutorial-plan-badge strong{overflow:hidden;text-overflow:ellipsis;color:var(--text);font-size:9px}
        .interactive-tutorial-guide{position:fixed;z-index:10040;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:flex-start;justify-content:space-between;gap:11px;max-height:min(240px,44vh);overflow:auto;padding:12px;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333));border-radius:16px;background:color-mix(in srgb,var(--card) 98%,transparent);box-shadow:0 12px 36px rgba(0,0,0,.38);color:var(--text);backdrop-filter:blur(16px)}.interactive-tutorial-guide[hidden]{display:none!important}.interactive-tutorial-guide div{min-width:0}.interactive-tutorial-guide small,.interactive-tutorial-guide strong,.interactive-tutorial-guide p{display:block}.interactive-tutorial-guide small{color:var(--accent);font-size:8px;font-weight:950;letter-spacing:.08em}.interactive-tutorial-guide strong{margin-top:2px;font-size:13px;line-height:1.2}.interactive-tutorial-guide p{margin:5px 0 0;color:var(--text-secondary,var(--muted));font-size:10px;line-height:1.48}.interactive-tutorial-guide>button{flex:0 0 auto;padding:5px 6px;border:0;background:transparent;color:var(--muted);font-size:9px;font-weight:850}
        .interactive-tutorial-finger{position:fixed;z-index:10045;width:38px;height:38px;font-size:28px;line-height:38px;text-align:center;pointer-events:none;filter:drop-shadow(0 4px 7px rgba(0,0,0,.45));animation:interactive-tutorial-point .85s ease-in-out infinite alternate}.interactive-tutorial-finger[hidden]{display:none!important}.interactive-tutorial-focus{position:relative!important;z-index:10032!important;outline:3px solid var(--accent)!important;outline-offset:3px!important;box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 18%,transparent),0 8px 28px rgba(0,0,0,.32)!important}
        @keyframes interactive-tutorial-point{from{transform:translateY(-3px)}to{transform:translateY(6px)}}
        @media(max-width:430px){.interactive-workout-tutorial-card{grid-template-columns:40px minmax(0,1fr)}.interactive-workout-tutorial-state{grid-column:2}.interactive-tutorial-guide{left:10px;right:10px}.interactive-tutorial-guide>button{padding-top:1px}.interactive-tutorial-plan-badge strong{max-width:250px}}
    `;
    document.head.appendChild(style);
}
