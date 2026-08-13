import { getActiveNutritionPhase } from "./nutrition-phase.js?v=phase-tolerance-1";

const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const BACKUP_WEIGHTS = "level_up_test_backup_weights";
const BACKUP_PHASES = "level_up_test_backup_phases";
const TEST_FLAG = "level_up_phase_test_active";

function active() {
    return localStorage.getItem(TEST_FLAG) === "1";
}

function parse(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function day(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function baseline(phase, entries) {
    const latest = [...entries].reverse().find(entry => Number(entry?.weight) > 0);
    return Number(latest?.weight || phase?.startingTrendWeight || localStorage.getItem("level_up_goal_weight") || 180);
}

function addTestData() {
    const phase = getActiveNutritionPhase();
    if (!phase) return;

    const weights = parse(WEIGHT_KEY);
    const phases = parse(PHASES_KEY);
    localStorage.setItem(BACKUP_WEIGHTS, JSON.stringify(weights));
    localStorage.setItem(BACKUP_PHASES, JSON.stringify(phases));

    const endWeight = baseline(phase, weights);
    const rate = Number(phase.targetWeeklyRate) || 0;
    const start = day(-20);
    const testEntries = [];

    for (let i = 0; i < 21; i += 1) {
        const daysFromEnd = 20 - i;
        const noise = [0.04, -0.05, 0.02, 0.06, -0.04, 0.01, -0.03][i % 7];
        testEntries.push({
            date: day(i - 20),
            weight: Math.round((endWeight - (rate * daysFromEnd / 7) + noise) * 10) / 10,
            source: "phase-test-data"
        });
    }

    const index = phases.findIndey(item => item?.id === phase.id);
    if (index >= 0 && (!phases[index].startDate || phases[index].startDate > start)) {
        phases[index] = { ...phases[index], startDate: start, startingTrendWeight: testEntries[0].weight };
    }

    localStorage.setItem(WEIGHT_KEY, JSON.stringify(testEntries));
    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
    localStorage.setItem(TEST_FLAG, "1");
    notify();
}

function removeTestData() {
    const weights = localStorage.getItem(BACKUP_WEIGHTS);
    const phases = localStorage.getItem(BACKUP_PHASES);
    if (weights !== null) localStorage.setItem(WEIGHT_KEY, weights);
    if (phases !== null) localStorage.setItem(PHASES_KEY, phases);
    localStorage.removeItem(BACKUP_WEIGHTS);
    localStorage.removeItem(BACKUP_PHASES);
    localStorage.removeItem(TEST_FLAG);
    notify();
}

function notify() {
    window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated"));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));
    setTimeout(render, 50);
}

function render() {
    const summary = document.querySelector("#weight-progress .weight-summary");
    if (!summary) return;

    let box = document.getElementById("phase-test-data-box");
    if (!box) {
        box = document.createElement("div");
        box.id = "phase-test-data-box";
        box.style.cssText = "margin:10px 0;padding:10px;border:1px dashed rgba(255,255,255,.18);border-radius:10px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:awrap";
        box.innerHTML = `<small id="phase-test-data-note">TEST: create 21 days of phase-matched weigh-ins.</small><button id="phase-test-data-btn" class="secondary-btn" type="button"></button>`;
        summary.insertAdjacentElement("afterend", box);
        document.getElementById("phase-test-data-btn")?.addEventListener("click", () => active() ? removeTestData() : addTestData());
    }

    const button = document.getElementById("phase-test-data-btn");
    const note = document.getElementById("phase-test-data-note");
    const phase = getActiveNutritionPhase();
    if (button) {
        button.disabled = !active() && !phase;
        button.textContent = active() ? "Restore Real Data" : "Add 21 Days Test Data";
    }
    if (note) note.textContent = active()
        ? "TEST DATA ACTIVE — restore your saved weight/phase data when finished."
        : phase ? "TEST: creates enough on-target phase data to evaluate established behavior." : "Start a phase first to generate test data.";
}

const content = document.getElementById("content");
if (content) new MutationObserver(render).observe(content, { childList: true, subtree: true });
window.addEventListener("hevelup:nutrition-updated", render);
window.addEventListener("levelup:nutrition-phase-updated", render);
window.addEventListener("load", render);
render();
