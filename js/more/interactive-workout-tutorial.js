import { getFormGuideVideo } from "../workouts/exercise-guide-video-manifest.js?v=form-videos-1";

const STYLE_ID = "level-up-interactive-workout-tutorial-styles";
const CARD_ID = "interactive-workout-tutorial-card";
const COMPLETION_KEY = "level_up_interactive_workout_tutorial_v1";
const STEPS = [
    {
        target: "[data-demo-start]",
        title: "Start a workout",
        body: "A real workout starts from a saved plan and workout day. Tap Start Demo Workout to enter the logger."
    },
    {
        target: "[data-demo-form]",
        title: "Check the form video",
        body: "Use Form Video when you want a quick technique reference without leaving the workout."
    },
    {
        target: "[data-demo-warmup]",
        title: "Complete your warm-up",
        body: "Compound lifts can show suggested warm-up sets before the working sets. Tap the check beside the first warm-up."
    },
    {
        target: "[data-demo-plate]",
        title: "Use the plate calculator",
        body: "For barbell work, open the plate calculator to see exactly what should go on each side of the bar."
    },
    {
        target: "[data-demo-set-complete]",
        title: "Log a working set",
        body: "Enter weight and reps after the set, then tap the checkmark. The demo is prefilled so you can practice the completion flow."
    },
    {
        target: "[data-demo-drop]",
        title: "Add a drop set",
        body: "Use Drop Set when you intentionally continue at a lighter load after the working set. Tap it to add the drop row."
    },
    {
        target: "[data-demo-swap]",
        title: "Smart Swap an exercise",
        body: "If equipment is busy or an exercise is not a good fit today, Smart Swap offers similar movement options."
    },
    {
        target: "[data-demo-finish]",
        title: "Finish the workout",
        body: "A real finish saves the session to history and updates Progress. In this sandbox, nothing is written to your workout data."
    }
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
        <header>
            <div><small>INTERACTIVE PRACTICE</small><h3>Learn by doing</h3></div>
            <p>Practice the real workout flow without changing your training data.</p>
        </header>
        <button id="${CARD_ID}" class="interactive-workout-tutorial-card${completed ? " is-complete" : ""}" type="button">
            <span class="interactive-workout-tutorial-icon" aria-hidden="true">☝️</span>
            <span class="interactive-workout-tutorial-copy">
                <strong>Interactive Workout Logger</strong>
                <small>Start a demo plan and practice form video, warm-ups, plate calculator, working sets, drop sets and Smart Swap.</small>
                <span>Hands-on · ${STEPS.length} steps · about 3 min</span>
            </span>
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

    if (event.target.closest?.(".bottom-nav .nav-btn")) {
        cleanupDemo();
        return;
    }

    if (event.target.closest?.("[data-demo-back]")) {
        event.preventDefault();
        returnToTutorials();
        return;
    }

    if (event.target.closest?.("[data-demo-exit]")) {
        event.preventDefault();
        returnToTutorials();
        return;
    }

    if (event.target.closest?.("[data-demo-start]")) {
        renderLogger();
        setStep(1);
        return;
    }

    if (event.target.closest?.("[data-demo-form]")) {
        openFormVideo();
        return;
    }

    if (event.target.closest?.("[data-demo-form-done]")) {
        closeSheet();
        setStep(2);
        return;
    }

    if (event.target.closest?.("[data-demo-warmup]")) {
        const button = event.target.closest("[data-demo-warmup]");
        button.classList.add("is-complete");
        button.textContent = "✓";
        button.setAttribute("aria-label", "Warm-up set completed");
        setStep(3);
        return;
    }

    if (event.target.closest?.("[data-demo-plate]")) {
        openPlateCalculator();
        return;
    }

    if (event.target.closest?.("[data-demo-plate-done]")) {
        closeSheet();
        setStep(4);
        return;
    }

    if (event.target.closest?.("[data-demo-set-complete]")) {
        const button = event.target.closest("[data-demo-set-complete]");
        button.classList.add("is-complete");
        button.textContent = "✓";
        button.closest(".demo-working-set")?.classList.add("is-complete");
        setStep(5);
        return;
    }

    if (event.target.closest?.("[data-demo-drop]")) {
        addDropSet();
        setStep(6);
        return;
    }

    if (event.target.closest?.("[data-demo-swap]")) {
        openSwapSheet();
        return;
    }

    const swapChoice = event.target.closest?.("[data-demo-swap-choice]");
    if (swapChoice) {
        const name = swapChoice.dataset.demoSwapChoice;
        const heading = document.querySelector("[data-demo-exercise-name]");
        if (heading) heading.textContent = name;
        closeSheet();
        setStep(7);
        return;
    }

    if (event.target.closest?.("[data-demo-sheet-close]")) {
        closeSheet();
        positionGuide();
        return;
    }

    if (event.target.closest?.("[data-demo-finish]")) {
        completeTutorial();
    }
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
            <header class="interactive-workout-demo-header">
                <button type="button" class="nutrition-planner-back" data-demo-back>← Tutorials</button>
                <span class="eyebrow">INTERACTIVE TUTORIAL</span>
                <h2>Level Up Demo Workout</h2>
                <p>Practice only. This demo never changes your real workouts, history, PRs, progression or analytics.</p>
            </header>
            <div class="interactive-demo-safe-banner"><span aria-hidden="true">✓</span><div><strong>Sandbox mode</strong><small>Nothing in this workout is saved to your training data.</small></div></div>
            <div data-demo-stage></div>
        </section>
        <div class="interactive-demo-dim" data-demo-dim aria-hidden="true"></div>
        <div class="interactive-demo-finger" data-demo-finger aria-hidden="true">👇</div>
        <aside class="interactive-demo-guide" data-demo-guide role="status" aria-live="polite">
            <div><small data-demo-step-label></small><strong data-demo-step-title></strong><p data-demo-step-body></p></div>
            <button type="button" data-demo-exit>Exit tutorial</button>
        </aside>`;
    renderPlanPreview();
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPlanPreview() {
    const stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    stage.innerHTML = `
        <article class="demo-plan-card">
            <div class="demo-plan-card-head"><div><small>DEMO PLAN</small><h3>Workout Logger Practice</h3><p>Push · 1 exercise · demo only</p></div><span>Practice</span></div>
            <div class="demo-plan-exercise"><span>1</span><div><strong>Barbell Bench Press</strong><small>3 sets · 8–12 reps · Barbell</small></div></div>
            <div class="demo-plan-features"><span>Warm-ups</span><span>Form video</span><span>Plate calculator</span><span>Drop set</span><span>Smart Swap</span></div>
            <button class="primary-btn demo-start-button" type="button" data-demo-start>Start Demo Workout</button>
        </article>`;
}

function renderLogger() {
    const stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    stage.innerHTML = `
        <section class="demo-logger">
            <div class="demo-logger-status"><span><small>DEMO SESSION</small><strong>Push Practice</strong></span><b>00:00</b></div>
            <article class="demo-exercise-card">
                <header class="demo-exercise-head">
                    <div><small>CHEST · COMPOUND</small><h3 data-demo-exercise-name>Barbell Bench Press</h3><p>3 × 8–12</p></div>
                    <div class="demo-exercise-head-actions"><button type="button" data-demo-form>Form Video</button><button type="button" data-demo-swap>Swap</button></div>
                </header>

                <section class="demo-warmups">
                    <div class="demo-section-title"><span>WARM-UP</span><small>Suggested from working weight</small></div>
                    <div class="demo-warmup-row"><span>Warm-up 1</span><strong>65 lb × 8</strong><button type="button" data-demo-warmup aria-label="Complete first warm-up">○</button></div>
                    <div class="demo-warmup-row"><span>Warm-up 2</span><strong>100 lb × 5</strong><button type="button" aria-label="Example second warm-up">○</button></div>
                </section>

                <button class="demo-plate-trigger" type="button" data-demo-plate><span aria-hidden="true">▰</span><span><strong>Plate Calculator</strong><small>135 lb · see plates per side</small></span><b>›</b></button>

                <section class="demo-working-sets">
                    <div class="demo-set-head"><span>SET</span><span>WEIGHT</span><span>REPS</span><span></span></div>
                    <div class="demo-working-set"><b>1</b><label><input type="number" value="135" inputmode="decimal" aria-label="Demo set weight"><small>lb</small></label><label><input type="number" value="8" inputmode="numeric" aria-label="Demo set reps"><small>reps</small></label><button type="button" data-demo-set-complete aria-label="Complete demo working set">○</button></div>
                    <div class="demo-working-set is-muted"><b>2</b><label><input type="number" placeholder="—" disabled><small>lb</small></label><label><input type="number" placeholder="—" disabled><small>reps</small></label><button type="button" disabled>○</button></div>
                    <div data-demo-drop-host></div>
                </section>

                <div class="demo-exercise-tools"><button type="button" data-demo-drop>＋ Drop Set</button><button type="button" data-demo-swap>↔ Smart Swap</button></div>
            </article>
            <button class="primary-btn demo-finish-button" type="button" data-demo-finish>Finish Demo Workout</button>
        </section>`;
}

function addDropSet() {
    const host = document.querySelector("[data-demo-drop-host]");
    if (!host || host.children.length) return;
    host.innerHTML = `<div class="demo-drop-row"><span>↳ Drop 1</span><label><input value="95" aria-label="Demo drop-set weight"><small>lb</small></label><label><input value="10" aria-label="Demo drop-set reps"><small>reps</small></label><button type="button" aria-label="Demo drop set complete">○</button></div>`;
}

function openFormVideo() {
    const video = getFormGuideVideo("barbell-bench-press");
    sheetOpen = true;
    hideGuideFocus();
    const sheet = createSheet("Form Video", `
        <div class="demo-form-video-wrap">
            ${video?.src ? `<video src="${video.src}" autoplay muted loop playsinline preload="metadata" aria-label="Barbell Bench Press form demonstration"></video>` : `<div class="demo-video-fallback">Form demonstration</div>`}
        </div>
        <div class="demo-sheet-copy"><strong>Barbell Bench Press</strong><p>Use the form guide as a quick technique reference, then return to the workout without losing your place.</p></div>
        <button class="primary-btn" type="button" data-demo-form-done>Back to Workout</button>`);
    document.body.appendChild(sheet);
}

function openPlateCalculator() {
    sheetOpen = true;
    hideGuideFocus();
    const sheet = createSheet("Plate Calculator", `
        <div class="demo-plate-summary"><span>Target load</span><strong>135 lb</strong><small>45 lb bar · 45 lb per side</small></div>
        <div class="demo-barbell" aria-label="One 45 pound plate per side"><i class="demo-bar"></i><i class="demo-plate demo-plate-45">45</i><i class="demo-collar"></i></div>
        <div class="demo-plate-list"><span><i class="demo-plate-dot"></i>45 lb plate</span><strong>× 1 per side</strong></div>
        <button class="primary-btn" type="button" data-demo-plate-done>Done</button>`);
    document.body.appendChild(sheet);
}

function openSwapSheet() {
    sheetOpen = true;
    hideGuideFocus();
    const sheet = createSheet("Smart Swap", `
        <div class="demo-sheet-copy"><strong>Similar movement options</strong><p>Choose a substitute that keeps the same general training purpose for today.</p></div>
        <div class="demo-swap-list">
            <button type="button" data-demo-swap-choice="Dumbbell Bench Press"><span><strong>Dumbbell Bench Press</strong><small>Chest · horizontal press</small></span><b>Choose</b></button>
            <button type="button" data-demo-swap-choice="Machine Chest Press"><span><strong>Machine Chest Press</strong><small>Chest · horizontal press</small></span><b>Choose</b></button>
            <button type="button" data-demo-swap-choice="Push-Up"><span><strong>Push-Up</strong><small>Chest · bodyweight press</small></span><b>Choose</b></button>
        </div>`);
    document.body.appendChild(sheet);
}

function createSheet(title, body) {
    const backdrop = document.createElement("div");
    backdrop.className = "interactive-demo-sheet-backdrop";
    backdrop.dataset.demoSheet = "1";
    backdrop.innerHTML = `<section class="interactive-demo-sheet" role="dialog" aria-modal="true"><header><h3>${title}</h3><button type="button" data-demo-sheet-close aria-label="Close">×</button></header>${body}</section>`;
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
    window.setTimeout(positionGuide, 280);
}

function positionGuide() {
    if (!active || sheetOpen) return;
    const step = STEPS[stepIndex];
    const target = step ? document.querySelector(step.target) : null;
    const finger = document.querySelector("[data-demo-finger]");
    if (!target || !finger) return;
    const rect = target.getBoundingClientRect();
    finger.style.left = `${Math.max(18, Math.min(window.innerWidth - 52, rect.left + rect.width / 2 - 18))}px`;
    finger.style.top = `${Math.max(18, rect.top - 42)}px`;
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
    document.querySelector("[data-demo-dim]")?.remove();
    const stage = document.querySelector("[data-demo-stage]");
    if (!stage) return;
    stage.innerHTML = `
        <article class="demo-tutorial-complete">
            <div class="demo-complete-mark">✓</div>
            <span class="eyebrow">TUTORIAL COMPLETE</span>
            <h3>You know the workout logger.</h3>
            <p>You practiced the form video, warm-ups, plate calculator, set logging, drop sets, Smart Swap and finishing a workout. No training data was changed.</p>
            <button class="primary-btn" type="button" data-demo-back>Back to Tutorials</button>
        </article>`;
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

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .interactive-workout-tutorial-section{margin:18px 0}.interactive-workout-tutorial-section>header{margin-bottom:9px}.interactive-workout-tutorial-section>header>div{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.interactive-workout-tutorial-section>header small{color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.08em}.interactive-workout-tutorial-section>header h3{margin:2px 0;color:var(--text)}.interactive-workout-tutorial-section>header p{margin:0;color:var(--muted);font-size:11px}
        .interactive-workout-tutorial-card{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;width:100%;padding:13px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--card-border,#333));border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--card)),var(--card));color:var(--text);text-align:left}.interactive-workout-tutorial-card.is-complete{border-color:color-mix(in srgb,var(--text) 13%,transparent)}.interactive-workout-tutorial-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:color-mix(in srgb,var(--accent) 15%,transparent);font-size:24px}.interactive-workout-tutorial-copy strong,.interactive-workout-tutorial-copy small,.interactive-workout-tutorial-copy span{display:block}.interactive-workout-tutorial-copy strong{font-size:13px}.interactive-workout-tutorial-copy small{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}.interactive-workout-tutorial-copy span{margin-top:5px;color:var(--accent);font-size:9px;font-weight:850}.interactive-workout-tutorial-state{font-size:10px;font-weight:900;white-space:nowrap}
        .interactive-workout-demo{padding-bottom:155px}.interactive-workout-demo-header{margin-bottom:12px}.interactive-workout-demo-header h2{margin:5px 0}.interactive-workout-demo-header p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}.interactive-demo-safe-banner{display:flex;gap:9px;align-items:center;margin:10px 0 14px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);border-radius:14px;background:color-mix(in srgb,var(--accent) 7%,var(--card))}.interactive-demo-safe-banner>span{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:var(--accent);color:#fff;font-weight:900}.interactive-demo-safe-banner strong,.interactive-demo-safe-banner small{display:block}.interactive-demo-safe-banner strong{font-size:11px}.interactive-demo-safe-banner small{color:var(--muted);font-size:9px}
        .demo-plan-card,.demo-exercise-card,.demo-logger-status,.demo-tutorial-complete{border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:18px;background:var(--card);color:var(--text)}.demo-plan-card{padding:15px}.demo-plan-card-head{display:flex;justify-content:space-between;gap:12px}.demo-plan-card-head small{color:var(--accent);font-size:9px;font-weight:900}.demo-plan-card-head h3{margin:3px 0}.demo-plan-card-head p{margin:0;color:var(--muted);font-size:10px}.demo-plan-card-head>span{align-self:flex-start;padding:5px 8px;border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-size:9px;font-weight:900}.demo-plan-exercise{display:flex;gap:10px;align-items:center;margin:14px 0;padding:12px;border-radius:14px;background:color-mix(in srgb,var(--text) 4%,transparent)}.demo-plan-exercise>span{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:var(--accent);color:#fff;font-size:10px;font-weight:900}.demo-plan-exercise strong,.demo-plan-exercise small{display:block}.demo-plan-exercise strong{font-size:12px}.demo-plan-exercise small{margin-top:2px;color:var(--muted);font-size:9px}.demo-plan-features{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:13px}.demo-plan-features span{padding:5px 7px;border-radius:999px;background:color-mix(in srgb,var(--text) 5%,transparent);color:var(--muted);font-size:8px;font-weight:800}.demo-start-button,.demo-finish-button{width:100%}
        .demo-logger{display:grid;gap:10px}.demo-logger-status{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}.demo-logger-status span small,.demo-logger-status span strong{display:block}.demo-logger-status small{color:var(--muted);font-size:8px;font-weight:850}.demo-logger-status strong{font-size:11px}.demo-logger-status>b{font-size:16px}.demo-exercise-card{padding:12px}.demo-exercise-head{display:flex;justify-content:space-between;gap:10px}.demo-exercise-head small{color:var(--accent);font-size:8px;font-weight:900}.demo-exercise-head h3{margin:3px 0;font-size:15px}.demo-exercise-head p{margin:0;color:var(--muted);font-size:10px}.demo-exercise-head-actions{display:flex;gap:5px;align-self:flex-start}.demo-exercise-head-actions button,.demo-exercise-tools button{padding:7px 8px;border:1px solid color-mix(in srgb,var(--text) 12%,transparent);border-radius:9px;background:color-mix(in srgb,var(--text) 4%,transparent);color:var(--text);font-size:9px;font-weight:850}
        .demo-warmups{margin-top:12px;padding-top:10px;border-top:1px solid color-mix(in srgb,var(--text) 8%,transparent)}.demo-section-title{display:flex;justify-content:space-between;margin-bottom:5px}.demo-section-title span{font-size:8px;font-weight:900;letter-spacing:.08em}.demo-section-title small{color:var(--muted);font-size:8px}.demo-warmup-row{display:grid;grid-template-columns:1fr auto 32px;align-items:center;gap:8px;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--text) 6%,transparent);font-size:10px}.demo-warmup-row:first-of-type{border-top:0}.demo-warmup-row strong{font-size:10px}.demo-warmup-row button,.demo-working-set>button,.demo-drop-row>button{display:grid;place-items:center;width:29px;height:29px;border:1px solid color-mix(in srgb,var(--text) 15%,transparent);border-radius:50%;background:transparent;color:var(--text);font-weight:900}.demo-warmup-row button.is-complete,.demo-working-set>button.is-complete{background:var(--accent);border-color:var(--accent);color:#fff}
        .demo-plate-trigger{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:8px;align-items:center;width:100%;margin:10px 0;padding:9px;border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:12px;background:color-mix(in srgb,var(--text) 3%,transparent);color:var(--text);text-align:left}.demo-plate-trigger>span:first-child{display:grid;place-items:center;width:24px;height:24px;border-radius:8px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent)}.demo-plate-trigger strong,.demo-plate-trigger small{display:block}.demo-plate-trigger strong{font-size:10px}.demo-plate-trigger small{color:var(--muted);font-size:8px}
        .demo-set-head,.demo-working-set,.demo-drop-row{display:grid;grid-template-columns:28px minmax(72px,1fr) minmax(62px,.8fr) 32px;gap:6px;align-items:center}.demo-set-head{padding:6px 0;color:var(--muted);font-size:8px;font-weight:850}.demo-working-set,.demo-drop-row{padding:6px 0;border-top:1px solid color-mix(in srgb,var(--text) 7%,transparent)}.demo-working-set>b{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:color-mix(in srgb,var(--text) 5%,transparent);font-size:9px}.demo-working-set label,.demo-drop-row label{position:relative}.demo-working-set input,.demo-drop-row input{width:100%;box-sizing:border-box;height:36px;padding:5px 23px 5px 7px;border:1px solid color-mix(in srgb,var(--text) 12%,transparent);border-radius:9px;background:color-mix(in srgb,var(--text) 4%,transparent);color:var(--text);text-align:center;font-size:12px}.demo-working-set label small,.demo-drop-row label small{position:absolute;right:5px;top:13px;color:var(--muted);font-size:7px}.demo-working-set.is-muted{opacity:.45}.demo-working-set.is-complete{background:color-mix(in srgb,var(--accent) 5%,transparent)}.demo-drop-row>span{font-size:8px;font-weight:850;color:var(--accent)}.demo-exercise-tools{display:flex;gap:7px;margin-top:10px}.demo-exercise-tools button{flex:1}
        .interactive-demo-dim{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.48);pointer-events:none}.interactive-demo-focus{position:relative!important;z-index:9002!important;box-shadow:0 0 0 3px var(--accent),0 0 0 8px color-mix(in srgb,var(--accent) 24%,transparent),0 12px 35px rgba(0,0,0,.28)!important;background-color:var(--card)!important}.interactive-demo-finger{position:fixed;z-index:9004;font-size:30px;line-height:1;pointer-events:none;filter:drop-shadow(0 3px 8px rgba(0,0,0,.35));animation:levelUpDemoPoint .75s ease-in-out infinite alternate}.interactive-demo-guide{position:fixed;z-index:9003;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end;padding:12px 13px;border:1px solid color-mix(in srgb,var(--accent) 36%,transparent);border-radius:17px;background:color-mix(in srgb,var(--card) 96%,#000);box-shadow:0 18px 55px rgba(0,0,0,.42);color:var(--text)}.interactive-demo-guide small{display:block;color:var(--accent);font-size:8px;font-weight:900;letter-spacing:.08em}.interactive-demo-guide strong{display:block;margin-top:2px;font-size:13px}.interactive-demo-guide p{margin:3px 0 0;color:var(--muted);font-size:10px;line-height:1.35}.interactive-demo-guide>button{padding:7px;border:0;background:transparent;color:var(--muted);font-size:9px;font-weight:850}
        .interactive-demo-sheet-backdrop{position:fixed;inset:0;z-index:9100;display:flex;align-items:flex-end;background:rgba(0,0,0,.56)}.interactive-demo-sheet{width:100%;max-height:86vh;overflow:auto;padding:16px 15px calc(18px + env(safe-area-inset-bottom));border-radius:22px 22px 0 0;background:var(--card);color:var(--text);box-shadow:0 -18px 50px rgba(0,0,0,.4)}.interactive-demo-sheet>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.interactive-demo-sheet>header h3{margin:0}.interactive-demo-sheet>header button{width:32px;height:32px;border:0;border-radius:50%;background:color-mix(in srgb,var(--text) 7%,transparent);color:var(--text);font-size:18px}.demo-form-video-wrap{overflow:hidden;border-radius:15px;background:#000;aspect-ratio:16/10}.demo-form-video-wrap video{display:block;width:100%;height:100%;object-fit:cover}.demo-video-fallback{display:grid;place-items:center;height:100%;color:#fff}.demo-sheet-copy{margin:12px 0}.demo-sheet-copy strong{font-size:13px}.demo-sheet-copy p{margin:4px 0 0;color:var(--muted);font-size:10px;line-height:1.4}.interactive-demo-sheet>.primary-btn{width:100%}.demo-plate-summary{text-align:center;padding:9px}.demo-plate-summary span,.demo-plate-summary strong,.demo-plate-summary small{display:block}.demo-plate-summary span{color:var(--muted);font-size:9px}.demo-plate-summary strong{font-size:25px}.demo-plate-summary small{color:var(--muted);font-size:9px}.demo-barbell{display:flex;align-items:center;justify-content:center;height:90px}.demo-bar{width:90px;height:8px;border-radius:4px;background:color-mix(in srgb,var(--text) 35%,transparent)}.demo-plate{display:grid;place-items:center;width:23px;height:68px;margin-left:-2px;border-radius:5px;background:color-mix(in srgb,var(--accent) 78%,#222);color:#fff;font-size:8px;font-weight:900}.demo-collar{width:12px;height:28px;margin-left:3px;border-radius:3px;background:color-mix(in srgb,var(--text) 25%,transparent)}.demo-plate-list{display:flex;justify-content:space-between;align-items:center;margin:4px 0 14px;padding:10px;border-radius:12px;background:color-mix(in srgb,var(--text) 4%,transparent);font-size:10px}.demo-plate-dot{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:var(--accent)}.demo-swap-list{display:grid;gap:7px}.demo-swap-list button{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px;border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:13px;background:color-mix(in srgb,var(--text) 3%,transparent);color:var(--text);text-align:left}.demo-swap-list strong,.demo-swap-list small{display:block}.demo-swap-list strong{font-size:11px}.demo-swap-list small{color:var(--muted);font-size:8px}.demo-swap-list b{color:var(--accent);font-size:9px}
        .demo-tutorial-complete{padding:24px 17px;text-align:center}.demo-complete-mark{display:grid;place-items:center;width:52px;height:52px;margin:0 auto 12px;border-radius:50%;background:var(--accent);color:#fff;font-size:25px;font-weight:900}.demo-tutorial-complete h3{margin:5px 0}.demo-tutorial-complete p{margin:0 auto 15px;max-width:420px;color:var(--muted);font-size:11px;line-height:1.5}
        @keyframes levelUpDemoPoint{from{transform:translateY(-2px) scale(1)}to{transform:translateY(7px) scale(1.07)}}
        @media(max-width:430px){.interactive-workout-tutorial-card{grid-template-columns:40px minmax(0,1fr)}.interactive-workout-tutorial-state{grid-column:2}.demo-exercise-head{display:grid}.demo-exercise-head-actions{justify-self:start}.demo-set-head,.demo-working-set,.demo-drop-row{grid-template-columns:24px minmax(68px,1fr) minmax(56px,.8fr) 30px}.interactive-demo-guide{grid-template-columns:1fr}.interactive-demo-guide>button{justify-self:start;padding-left:0}}
    `;
    document.head.appendChild(style);
}
