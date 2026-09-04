import "../progress/analytics-chart-zoom.js?v=analytics-chart-zoom-2";
import "./weekly-change-choice-fix.js?v=weekly-change-choice-fix-1";

const STYLE_ID = "level-up-streamlined-goals-calories-styles";
const CHECKIN_ROUTE_KEY = "level_up_open_goals_plan_from_checkin";
let refreshQueued = false;
let lastExpenditureText = "";

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        [data-planner-view="goals"] > .section-description{max-width:34rem;margin-bottom:12px;color:var(--muted,#8f8f98);font-size:12px;line-height:1.4}
        #unified-goals-calories-card{display:grid;gap:12px}
        #unified-goals-calories-card>.eyebrow,
        #unified-goals-calories-card>h3,
        #unified-goals-calories-card>.unified-calorie-intro,
        #unified-goals-calories-card>.unified-calorie-summary,
        #unified-goals-calories-card>.unified-adult-note,
        .nutrition-authority-strip,
        [data-phase-calorie-suggestion]{display:none!important}
        #active-calorie-target-card[data-streamlined-duplicate="1"]{display:none!important}
        .streamlined-plan-settings{margin:0;border:1px solid var(--line,rgba(255,255,255,.10));border-radius:16px;background:var(--surface-raised,rgba(255,255,255,.025));overflow:hidden}
        .streamlined-plan-settings>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px;padding:0 14px;cursor:pointer;list-style:none;color:var(--text,#f4f4f6);font-size:13px;font-weight:850;-webkit-tap-highlight-color:transparent}
        .streamlined-plan-settings>summary::-webkit-details-marker{display:none}
        .streamlined-plan-settings>summary::after{content:"›";color:var(--muted,#8f8f98);font-size:22px;font-weight:600;transform:rotate(90deg);transition:transform .16s ease}
        .streamlined-plan-settings[open]>summary::after{transform:rotate(-90deg)}
        .streamlined-plan-settings>summary span{display:grid;gap:2px}
        .streamlined-plan-settings>summary strong{font-size:13px}
        .streamlined-plan-settings>summary small{color:var(--muted,#8f8f98);font-size:10px;font-weight:650}
        .streamlined-plan-settings-body{display:grid;gap:12px;padding:0 14px 14px;border-top:1px solid var(--line,rgba(255,255,255,.08))}
        .streamlined-plan-settings-body>.eyebrow,
        .streamlined-plan-settings-body>h3,
        .streamlined-plan-settings-body>.unified-calorie-intro,
        .streamlined-plan-settings-body>.unified-calorie-summary,
        .streamlined-plan-settings-body>.unified-adult-note,
        .streamlined-plan-settings-body .unified-maintenance-choice-note,
        .streamlined-plan-settings-body .unified-help{display:none!important}
        .streamlined-plan-settings-body>label:first-of-type{margin-top:14px}
        .streamlined-plan-settings-body .unified-goal-description{margin:0;color:var(--muted,#8f8f98);font-size:11px;line-height:1.4}
        .streamlined-plan-settings-body .unified-maintenance-heading small,
        .streamlined-plan-settings-body .unified-calculated-maintenance-meta{font-size:10px;line-height:1.35}
        .streamlined-plan-settings-body #unified-calorie-message:empty{display:none}
        #nutrition-current-phase .nutrition-current-phase-grid>[data-streamlined-expenditure]{display:block}
        #nutrition-current-phase .nutrition-current-phase-grid>[data-streamlined-expenditure] small{display:block;margin-top:4px;color:var(--muted,#8f8f98);font-size:10px;line-height:1.25}
    `;
    document.head.appendChild(style);
}

function currentGoalsPanel() {
    return document.querySelector('[data-calories-panel="plan"], [data-planner-view="goals"]');
}

function clickGoalsPlanWhenReady(attempt = 0) {
    const tab = document.querySelector('[data-calories-tab="plan"]');
    if (tab) {
        tab.click();
        sessionStorage.removeItem(CHECKIN_ROUTE_KEY);
        window.setTimeout(() => {
            const panel = currentGoalsPanel();
            panel?.scrollIntoView?.({ block: "start", behavior: "auto" });
            scheduleRefresh();
        }, 30);
        return;
    }
    if (attempt >= 40) return;
    window.setTimeout(() => clickGoalsPlanWhenReady(attempt + 1), 60);
}

function openGoalsAndPlan() {
    sessionStorage.setItem(CHECKIN_ROUTE_KEY, "1");
    document.querySelector('.nav-btn[data-page="energy"]')?.click();
    clickGoalsPlanWhenReady();
}

function captureAuthorityValues() {
    document.querySelectorAll(".nutrition-authority-strip").forEach(strip => {
        const items = [...strip.querySelectorAll(":scope > div")];
        const expenditure = items.find(item => /current expenditure/i.test(item.querySelector("span")?.textContent || item.textContent || ""));
        const strong = expenditure?.querySelector("strong");
        if (strong?.textContent?.trim()) lastExpenditureText = strong.textContent.trim();
        strip.remove();
    });
}

function authoritativeExpenditureText() {
    if (lastExpenditureText) return lastExpenditureText;
    const calculated = document.getElementById("unified-calculated-maintenance")?.textContent?.trim();
    if (calculated && /\d/.test(calculated)) return calculated;
    return "—";
}

function addExpenditureToPhaseSummary() {
    const grid = document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid");
    if (!grid) return;
    let cell = grid.querySelector("[data-streamlined-expenditure]");
    if (!cell) {
        cell = document.createElement("div");
        cell.dataset.streamlinedExpenditure = "1";
        cell.innerHTML = "<span>Current Expenditure</span><strong>—</strong><small>Live TDEE</small>";
        grid.appendChild(cell);
    }
    const strong = cell.querySelector("strong");
    const value = authoritativeExpenditureText();
    if (strong && value) strong.textContent = value;
}

function buildPlanSettings() {
    const card = document.getElementById("unified-goals-calories-card");
    const currentPhase = card?.querySelector("#nutrition-current-phase");
    if (!card || !currentPhase) return;

    let details = card.querySelector(":scope > .streamlined-plan-settings");
    if (!details) {
        details = document.createElement("details");
        details.className = "streamlined-plan-settings";
        details.innerHTML = `
            <summary><span><strong>Plan settings</strong><small>Phase, calorie baseline & coaching preference</small></span></summary>
            <div class="streamlined-plan-settings-body"></div>
        `;
        currentPhase.insertAdjacentElement("afterend", details);
    }
    const body = details.querySelector(".streamlined-plan-settings-body");
    if (!body) return;

    [...card.children].forEach(child => {
        if (child === currentPhase || child === details || child.classList.contains("nutrition-authority-strip")) return;
        body.appendChild(child);
    });

    const activeTarget = document.getElementById("active-calorie-target-card");
    if (activeTarget && document.querySelector("#nutrition-current-phase .nutrition-current-phase-grid")) {
        activeTarget.dataset.streamlinedDuplicate = "1";
    }
}

function simplifyCalorieTargetUI() {
    ensureStyles();
    captureAuthorityValues();

    const currentTarget = document.getElementById("current-calorie-target");
    const currentCard = currentTarget?.closest(".metric-card");
    if (currentCard) currentCard.remove();

    document.querySelectorAll("[data-phase-calorie-suggestion]").forEach(card => card.remove());

    document.querySelectorAll(".nutrition-current-target-card .nutrition-message").forEach(message => {
        if ((message.textContent || "").includes("Current Daily Target")) {
            message.textContent = "Your active calorie target is shown in Current Phase.";
        }
    });

    const goalsView = document.querySelector('[data-planner-view="goals"]');
    const heading = goalsView?.querySelector(":scope > h2");
    const description = goalsView?.querySelector(":scope > .section-description");
    if (heading) heading.textContent = "Goals & Calories";
    if (description) description.textContent = "Your current phase, calorie target and expenditure.";

    addExpenditureToPhaseSummary();
    buildPlanSettings();
}

function scheduleRefresh(delay = 0) {
    if (refreshQueued) return;
    refreshQueued = true;
    window.setTimeout(() => {
        refreshQueued = false;
        simplifyCalorieTargetUI();
    }, delay);
}

document.addEventListener("click", event => {
    if (event.target.closest?.("[data-dashboard-weekly-checkin]")) {
        openGoalsAndPlan();
        return;
    }
    scheduleRefresh();
}, true);

window.addEventListener("levelup:nutrition-updated", () => scheduleRefresh(0));
window.addEventListener("levelup:nutrition-phase-updated", () => scheduleRefresh(0));
window.addEventListener("load", () => {
    scheduleRefresh(0);
    if (sessionStorage.getItem(CHECKIN_ROUTE_KEY) === "1") clickGoalsPlanWhenReady();
});

new MutationObserver(() => scheduleRefresh(20)).observe(document.documentElement, { childList: true, subtree: true });
scheduleRefresh();
