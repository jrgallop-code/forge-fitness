import { navigate } from "../core/router.js?v=deload-workout-preview-1";
import { presetPlans } from "../workouts/workout-plans.js?v=interactive-workout-tutorial-6";
import { openWorkoutLogger, ACTIVE_WORKOUT_STORAGE_KEY } from "../workouts/workout-session.js?v=workout-source-stats-1";

const STYLE_ID = "level-up-interactive-workout-tutorial-v5-styles";
const CARD_ID = "interactive-workout-tutorial-card";
const COMPLETION_KEY = "level_up_interactive_workout_tutorial_v5";
const RESTORE_KEY = "level_up_interactive_workout_tutorial_restore_v5";
const ADAPTIVE_SETTINGS_KEY = "level_up_adaptive_guidance_settings";
const TUTORIAL_PLAN = presetPlans.find(plan => plan.id === "full-body-foundation");
const PRIMARY_SELECTOR = '.session-exercise-card[data-exercise-id="back-squat"]';
const FIRST_CARD_SELECTOR = '.session-exercise-card[data-exercise-index="0"]';
const PROTECTED_STORAGE_KEYS = [
    ACTIVE_WORKOUT_STORAGE_KEY,
    ADAPTIVE_SETTINGS_KEY,
    "level_up_adaptive_guidance_state",
    "level_up_plate_calculator_settings"
];

const STEPS = [
    {
        target: "#begin-session-btn",
        title: "Start logging the workout",
        body: "Confirm the Training Day and Workout Date, then tap Begin Workout. This starts the timer and opens the exercise-by-exercise logger."
    },
    {
        target: `${PRIMARY_SELECTOR} .logger-form-guide-btn`,
        title: "Use the Form Guide",
        body: "Tap Form Guide whenever you want a technique refresher. Close the guide when you are ready to continue."
    },
    {
        target: `${PRIMARY_SELECTOR} .exercise-warmup-btn`,
        title: "Show your warm-up sets",
        body: "Tap Warm-up to reveal the suggested warm-up sets. They stay separate from your programmed working sets."
    },
    {
        target: `${PRIMARY_SELECTOR} .complete-warmup-btn`,
        title: "Complete a warm-up",
        body: "After the warm-up, tap the completion control on that row. Level Up marks it complete and continues the normal rest flow."
    },
    {
        target: `${PRIMARY_SELECTOR} .plate-calculator-trigger`,
        title: "Use the plate calculator",
        body: "The plate calculator reads the active barbell weight and shows what to load on each side of the bar. Close it when you are done."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`,
        title: "Log a working set",
        body: "Enter the weight and reps you performed, then tap Complete Set. Completed sets feed history, volume, strength trends and progression guidance."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`,
        title: "Add a drop set",
        body: "Tap the set action to add a lighter Drop Set row, then enter the weight and reps you perform."
    },
    {
        target: `${PRIMARY_SELECTOR} .session-inline-swap`,
        title: "Swap an exercise for today",
        body: "Tap Swap when equipment is busy or you need another movement. Smart Swap ranks alternatives with a similar training purpose."
    },
    {
        target: `${FIRST_CARD_SELECTOR} .compact-add-set-btn`,
        title: "Add another working set",
        body: "Tap Add Set when you intentionally need one additional working set. The new row uses the same Weight, Reps and Complete workflow."
    },
    {
        target: `${FIRST_CARD_SELECTOR} .session-add-exercise-btn`,
        title: "Add an exercise",
        body: "Tap Add Exercise to open the exercise library without leaving the session, then close it when you are ready to continue."
    },
    {
        target: "#save-session-btn",
        title: "Complete the workout",
        body: "In a normal workout, Complete Workout saves the session to history and updates Progress. Here it finishes practice without saving a fake workout."
    }
];

let active = false;
let launching = false;
let stepIndex = 0;
let flow = null;
let flowOpened = false;
let storageSnapshot = null;
let focusedTarget = null;
let scrollStep = -1;
let launchTimer = null;

install();

function install() {
    ensureStyles();
    recoverInterruptedTutorial();
    injectCard();

    // Only observe DOM additions/removals and hidden-state changes. The previous
    // tutorial also observed class mutations while its own focus class changed,
    // creating a feedback loop that could lock Safari/iOS at 60fps.
    new MutationObserver(() => {
        injectCard();
        reconcileFlow();
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden"]
    });

    document.addEventListener("click", handleClick, true);
    window.addEventListener("resize", schedulePosition);
    window.addEventListener("orientationchange", schedulePosition);
    window.addEventListener("pagehide", restoreProtectedStorage, true);
    window.addEventListener("beforeunload", restoreProtectedStorage, true);
}

function injectCard() {
    const shell = document.querySelector(".learn-shell");
    if (!shell) return;

    // Remove every older workout-tutorial launcher so only one implementation
    // can receive the tap.
    shell.querySelectorAll(
        ".interactive-workout-tutorial-section,#interactive-workout-tutorial-standalone,#interactive-workout-tutorial-entry,.interactive-workout-native-launch"
    ).forEach(node => node.remove());

    if (document.getElementById(CARD_ID)) return;

    const completed = readCompleted();
    const section = document.createElement("section");
    section.className = "interactive-workout-v5-section";
    section.innerHTML = `
        <header class="interactive-workout-v5-heading">
            <div><small>INTERACTIVE TUTORIAL</small><h3>Learn the workout logger</h3></div>
            <p>Walk through a full workout using an existing Level Up template and learn what each control is for.</p>
        </header>
        <button id="${CARD_ID}" class="interactive-workout-v5-card${completed ? " is-complete" : ""}" type="button" aria-label="Start Interactive Workout Logger tutorial">
            <span class="interactive-workout-v5-icon" aria-hidden="true">☝️</span>
            <span class="interactive-workout-v5-copy">
                <strong>Interactive Workout Logger</strong>
                <small>Full Body Foundation · Day 1 – Full Body A · form guide, warm-ups, plate calculator, sets, drop sets, swaps, Add Set and Add Exercise.</small>
                <span>${STEPS.length} guided steps · about 4 min</span>
            </span>
            <span class="interactive-workout-v5-action">${completed ? "Practice again →" : "Start →"}</span>
        </button>`;

    const appGuides = shell.querySelector(".learn-library-heading");
    if (appGuides) appGuides.insertAdjacentElement("beforebegin", section);
    else shell.appendChild(section);
}

function handleClick(event) {
    const launcher = event.target.closest?.(`#${CARD_ID}`);
    if (launcher) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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
        beginFlow("form");
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .exercise-warmup-btn`)) {
        window.setTimeout(() => setStep(3), 140);
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
        beginFlow("plate");
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .complete-set-btn`)) {
        window.setTimeout(() => setStep(6), 180);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"] .drop-set-menu-trigger`)) {
        window.setTimeout(() => setStep(7), 160);
        return;
    }

    if (event.target.closest?.(`${PRIMARY_SELECTOR} .session-inline-swap`)) {
        beginFlow("swap");
        return;
    }

    if (event.target.closest?.(`${FIRST_CARD_SELECTOR} .compact-add-set-btn`)) {
        window.setTimeout(() => setStep(9), 180);
        return;
    }

    if (event.target.closest?.(`${FIRST_CARD_SELECTOR} .session-add-exercise-btn`)) {
        beginFlow("add");
    }
}

function startTutorial() {
    if (active || launching) return;
    if (!TUTORIAL_PLAN) {
        setCardAction("Tutorial unavailable");
        return;
    }

    launching = true;
    setCardAction("Opening…");

    try {
        protectStorage();
        navigate("workout");
        waitFor(".workout-page", () => {
            try {
                openWorkoutLogger(TUTORIAL_PLAN);
            } catch (error) {
                failLaunch(error);
                return;
            }

            waitFor("#workout-session-logger", logger => {
                clearLaunchTimer();
                active = true;
                launching = false;
                stepIndex = 0;
                flow = null;
                flowOpened = false;
                logger.dataset.interactiveTutorial = "true";
                document.documentElement.classList.add("interactive-workout-tutorial-active");

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
    } catch (error) {
        failLaunch(error);
    }
}

function beginFlow(nextFlow) {
    flow = nextFlow;
    flowOpened = false;
    hideGuide();
    window.setTimeout(reconcileFlow, 80);
}

function reconcileFlow() {
    if (!active || !flow) return;

    const state = getFlowState(flow);
    if (state.open) {
        flowOpened = true;
        return;
    }
    if (!flowOpened) return;

    const finishedFlow = flow;
    flow = null;
    flowOpened = false;
    if (finishedFlow === "form") setStep(2);
    if (finishedFlow === "plate") setStep(5);
    if (finishedFlow === "swap") setStep(8);
    if (finishedFlow === "add") setStep(10);
}

function getFlowState(name) {
    if (name === "form") return { open: Boolean(document.querySelector(".exercise-guide-screen")) };
    if (name === "plate") {
        const node = document.querySelector(".plate-calculator-overlay");
        return { open: Boolean(node && !node.hidden) };
    }
    if (name === "swap") {
        const node = document.querySelector("#session-exercise-swap-sheet");
        return { open: Boolean(node && !node.hidden) };
    }
    if (name === "add") {
        const node = document.querySelector("#session-add-exercise-sheet");
        return { open: Boolean(node && !node.hidden) };
    }
    return { open: false };
}

function suppressAdaptiveUI() {
    document.querySelectorAll(
        ".adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner"
    ).forEach(node => node.remove());
    document.getElementById("workout-session-logger")?.classList.remove(
        "adaptive-guidance-on",
        "adaptive-deload-active",
        "adaptive-deload-preview-active"
    );
}

function preparePrimarySet() {
    const row = document.querySelector(`${PRIMARY_SELECTOR} .session-set-row[data-set-index="0"]`);
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

function ensureGuide() {
    if (document.querySelector("[data-interactive-tutorial-guide]")) return;
    document.body.insertAdjacentHTML("beforeend", `
        <div class="interactive-tutorial-plan-badge" data-interactive-tutorial-badge>
            <span>TUTORIAL</span><strong>Full Body Foundation · Day 1 – Full Body A</strong>
        </div>
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
    scrollStep = -1;
    ensureGuide();

    const step = STEPS[stepIndex];
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    setText(guide?.querySelector("[data-interactive-step-label]"), `STEP ${stepIndex + 1} OF ${STEPS.length}`);
    setText(guide?.querySelector("[data-interactive-step-title]"), step.title);
    setText(guide?.querySelector("[data-interactive-step-body]"), step.body);
    if (guide) guide.hidden = false;
    schedulePosition();
}

function schedulePosition() {
    if (!active || flow) return;
    window.requestAnimationFrame(positionGuide);
}

function positionGuide() {
    if (!active || flow) return;
    const step = STEPS[stepIndex];
    const target = step ? document.querySelector(step.target) : null;
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    const guide = document.querySelector("[data-interactive-tutorial-guide]");

    if (!target || !finger || !guide) {
        clearFocusedTarget();
        if (finger) finger.hidden = true;
        return;
    }

    if (focusedTarget !== target) {
        clearFocusedTarget();
        focusedTarget = target;
        if (!target.classList.contains("interactive-tutorial-focus")) {
            target.classList.add("interactive-tutorial-focus");
        }
    }

    let rect = target.getBoundingClientRect();
    const guideHeight = Math.max(125, guide.getBoundingClientRect().height || 0);
    const bottomClearance = guideHeight + 30;
    const needsScroll = rect.top < 82 || rect.bottom > window.innerHeight - bottomClearance;

    // Scroll at most once per step and do it without smooth animation. Repeated
    // smooth-scroll calls were another source of apparent freezing on iOS.
    if (needsScroll && scrollStep !== stepIndex) {
        scrollStep = stepIndex;
        target.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
        rect = target.getBoundingClientRect();
    }

    finger.style.left = `${Math.max(16, Math.min(window.innerWidth - 54, rect.left + rect.width / 2 - 18))}px`;
    finger.style.top = `${Math.max(54, rect.top - 42)}px`;
    finger.hidden = false;
}

function clearFocusedTarget() {
    if (focusedTarget?.classList?.contains("interactive-tutorial-focus")) {
        focusedTarget.classList.remove("interactive-tutorial-focus");
    }
    focusedTarget = null;
}

function hideGuide() {
    const guide = document.querySelector("[data-interactive-tutorial-guide]");
    const finger = document.querySelector("[data-interactive-tutorial-finger]");
    if (guide) guide.hidden = true;
    if (finger) finger.hidden = true;
    clearFocusedTarget();
}

function finishTutorial() {
    try {
        localStorage.setItem(COMPLETION_KEY, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
    } catch {}
    exitTutorial(true);
}

function exitTutorial(completed) {
    clearLaunchTimer();
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
    flowOpened = false;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    restoreProtectedStorage();
    returnToLearn(completed);
}

function failLaunch(error) {
    console.error("Interactive workout tutorial failed to open", error);
    clearLaunchTimer();
    active = false;
    launching = false;
    flow = null;
    flowOpened = false;
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    restoreProtectedStorage();
    returnToLearn(false, true);
}

function returnToLearn(completed, failed = false) {
    navigate("more");
    waitFor('[data-more-page="learn"]', button => {
        button.click();
        window.setTimeout(() => {
            injectCard();
            setCardAction(failed ? "Try again →" : completed ? "Practice again →" : "Start →");
            document.getElementById(CARD_ID)?.scrollIntoView({ behavior: "auto", block: "center" });
        }, 120);
    }, false);
}

function protectStorage() {
    if (storageSnapshot) return;
    storageSnapshot = new Map(PROTECTED_STORAGE_KEYS.map(key => [key, localStorage.getItem(key)]));
    try {
        sessionStorage.setItem(RESTORE_KEY, JSON.stringify([...storageSnapshot]));
    } catch (error) {
        console.warn("Tutorial restore snapshot could not be persisted", error);
    }
    document.documentElement.dataset.localDataSandbox = "true";
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
    localStorage.setItem(ADAPTIVE_SETTINGS_KEY, JSON.stringify({ enabled: false }));
}

function restoreProtectedStorage() {
    if (storageSnapshot) {
        for (const [key, value] of storageSnapshot.entries()) {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        }
    }
    storageSnapshot = null;
    sessionStorage.removeItem(RESTORE_KEY);
    delete document.documentElement.dataset.localDataSandbox;
}

function recoverInterruptedTutorial() {
    document.documentElement.classList.remove("interactive-workout-tutorial-active");
    document.querySelector("[data-interactive-tutorial-guide]")?.remove();
    document.querySelector("[data-interactive-tutorial-finger]")?.remove();
    document.querySelector("[data-interactive-tutorial-badge]")?.remove();
    try {
        const raw = sessionStorage.getItem(RESTORE_KEY);
        if (!raw) return;
        const entries = JSON.parse(raw);
        if (!Array.isArray(entries)) return;
        for (const [key, value] of entries) {
            if (!PROTECTED_STORAGE_KEYS.includes(key)) continue;
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        }
    } catch (error) {
        console.warn("Tutorial recovery failed", error);
    } finally {
        sessionStorage.removeItem(RESTORE_KEY);
        delete document.documentElement.dataset.localDataSandbox;
    }
}

function waitFor(selector, callback, canFail = true, attempts = 0) {
    const node = document.querySelector(selector);
    if (node) {
        callback(node);
        return;
    }
    if (attempts >= 80) {
        if (canFail) failLaunch(new Error(`Timed out waiting for ${selector}`));
        return;
    }
    if (canFail && attempts === 0) {
        clearLaunchTimer();
        launchTimer = window.setTimeout(() => failLaunch(new Error(`Timed out waiting for ${selector}`)), 5000);
    }
    window.setTimeout(() => waitFor(selector, callback, canFail, attempts + 1), 50);
}

function clearLaunchTimer() {
    if (launchTimer) window.clearTimeout(launchTimer);
    launchTimer = null;
}

function setCardAction(value) {
    setText(document.querySelector(`#${CARD_ID} .interactive-workout-v5-action`), value);
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
        .interactive-workout-tutorial-section,#interactive-workout-tutorial-standalone,#interactive-workout-tutorial-entry,.interactive-workout-native-launch{display:none!important}
        .interactive-workout-v5-section{position:relative;z-index:2;margin:18px 0;min-width:0}
        .interactive-workout-v5-heading{display:grid;gap:4px;margin-bottom:9px}
        .interactive-workout-v5-heading>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
        .interactive-workout-v5-heading small{color:var(--accent-text,var(--accent));font-size:9px;font-weight:900;letter-spacing:.1em}
        .interactive-workout-v5-heading h3{margin:0;color:var(--text);font-size:18px;line-height:1.2}
        .interactive-workout-v5-heading p{margin:0;color:var(--muted);font-size:11px;line-height:1.4}
        .interactive-workout-v5-card{box-sizing:border-box;display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:11px;width:100%;min-width:0;padding:14px;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 11%,var(--card)),var(--card));color:var(--text);box-shadow:var(--shadow);text-align:left;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        .interactive-workout-v5-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:color-mix(in srgb,var(--accent) 14%,var(--card));font-size:22px}
        .interactive-workout-v5-copy{display:grid;gap:3px;min-width:0}
        .interactive-workout-v5-copy strong{font-size:14px;line-height:1.2}
        .interactive-workout-v5-copy small{color:var(--muted);font-size:10px;line-height:1.38}
        .interactive-workout-v5-copy span{color:var(--accent-text,var(--accent));font-size:9px;font-weight:850}
        .interactive-workout-v5-action{color:var(--text);font-size:10px;font-weight:900;white-space:nowrap}
        html.interactive-workout-tutorial-active .bottom-nav{display:none!important}
        html.interactive-workout-tutorial-active #content{padding-bottom:245px!important}
        html.interactive-workout-tutorial-active :is(.adaptive-recovery-flow,.adaptive-post-flow,.adaptive-rir-control,.adaptive-deload-banner,.adaptive-preview-banner){display:none!important}
        .interactive-tutorial-plan-badge{position:fixed;z-index:10030;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;max-width:calc(100vw - 24px);padding:6px 9px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--card-border,#333));border-radius:999px;background:color-mix(in srgb,var(--card) 96%,transparent);box-shadow:0 6px 22px rgba(0,0,0,.24);white-space:nowrap;pointer-events:none}
        .interactive-tutorial-plan-badge span{padding:3px 5px;border-radius:999px;background:var(--accent);color:var(--accent-text,#fff);font-size:8px;font-weight:950}
        .interactive-tutorial-plan-badge strong{overflow:hidden;text-overflow:ellipsis;color:var(--text);font-size:9px}
        .interactive-tutorial-guide{position:fixed;z-index:10040;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:flex-start;justify-content:space-between;gap:11px;max-height:min(220px,42vh);overflow:auto;padding:12px;border:1px solid color-mix(in srgb,var(--accent) 34%,var(--card-border,#333));border-radius:16px;background:var(--card);box-shadow:0 12px 36px rgba(0,0,0,.38);color:var(--text)}
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
            .interactive-workout-v5-card{grid-template-columns:44px minmax(0,1fr);gap:10px;padding:14px}
            .interactive-workout-v5-action{grid-column:2;justify-self:start}
            .interactive-tutorial-guide{left:10px;right:10px}
            .interactive-tutorial-plan-badge strong{max-width:250px}
        }
    `;
    document.head.appendChild(style);
}
