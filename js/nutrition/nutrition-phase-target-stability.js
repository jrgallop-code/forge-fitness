import { getActiveNutritionPhase } from "./nutrition-phase.js?v=nutrition-phase-target-stability-1";

const STYLE_ID = "level-up-phase-target-stability-styles";
let queued = false;

// Older phase helpers already respect this flag. Declaring the authority here
// prevents them from briefly swapping the saved calorie target for a projected
// recommendation before the unified nutrition authority restores the real value.
window.__levelUpFullAdjustmentAuthority = true;

install();

function install() {
    ensureStyles();
    schedule();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    [
        "levelup:nutrition-updated",
        "levelup:nutrition-phase-updated",
        "levelup:maintenance-check-in-updated",
        "levelup:weekly-calorie-review-readiness"
    ].forEach(name => window.addEventListener(name, schedule));
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        syncSavedTarget();
    });
}

function syncSavedTarget() {
    const phase = getActiveNutritionPhase();
    const target = Number(phase?.currentCalories ?? phase?.startCalories);
    if (!Number.isFinite(target) || target <= 0) return;
    const display = `${Math.round(target).toLocaleString()} kcal/day`;

    const phaseCard = document.getElementById("nutrition-current-phase");
    if (phaseCard) {
        const suggestion = phaseCard.querySelector("[data-phase-calorie-suggestion]");
        if (suggestion) {
            setText(suggestion.querySelector("span"), "Current Calorie Target");
            setText(suggestion.querySelector("strong"), display);
            const note = suggestion.querySelector("small");
            if (note && !/review|reassess|applied|target/i.test(note.textContent || "")) {
                setText(note, "Active target · changes only when a weekly review is applied");
            }
        }

        phaseCard.querySelectorAll(".nutrition-current-phase-grid > div").forEach(cell => {
            const label = cell.querySelector("span")?.textContent?.trim() || "";
            if (!/current calories|calorie target|daily target/i.test(label)) return;
            setText(cell.querySelector("span"), "Current Calorie Target");
            setText(cell.querySelector("strong"), display);
        });
    }

    setText(document.getElementById("weight-calorie-suggestion"), display);
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #nutrition-current-phase [data-phase-calorie-suggestion] strong,
        #nutrition-current-phase .nutrition-current-phase-grid strong{
            transition:none!important;
            animation:none!important;
        }
    `;
    document.head.appendChild(style);
}
