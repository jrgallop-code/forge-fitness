import { buildCaloriesExpenditureState, renderCaloriesExpenditureChart } from "./calorie-expenditure-shared.js?v=authoritative-graphs-1";

const STYLE_ID = "level-up-calorie-expenditure-card-styles";
let queued = false;
let resizeBound = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .calorie-expenditure-comparison-card{min-width:0}
        #calorie-progress .calorie-expenditure-card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
        #calorie-progress .calorie-expenditure-card-heading>div{display:grid;gap:2px;min-width:0}
        #calorie-progress .calorie-expenditure-card-heading small{color:var(--muted);font-size:8px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
        #calorie-progress .calorie-expenditure-card-heading h3{margin:0;color:var(--text);font-size:15px;line-height:1.15}
        #calorie-progress .calorie-expenditure-card-heading p{margin:0;max-width:150px;color:var(--text-secondary,var(--muted));font-size:9px;font-weight:650;line-height:1.35;text-align:right}
        #calorie-progress .calorie-expenditure-shell{position:relative;min-height:250px}
        #calorie-progress .calorie-expenditure-shell canvas{display:block;width:100%;touch-action:pan-y}
        #calorie-progress .calorie-expenditure-tooltip{position:absolute;top:12px;z-index:3;width:138px;padding:8px 9px;border:1px solid var(--card-border,var(--line));border-radius:10px;background:var(--card);color:var(--text);box-shadow:var(--shadow);pointer-events:none}
        #calorie-progress .calorie-expenditure-tooltip strong,#calorie-progress .calorie-expenditure-tooltip span,#calorie-progress .calorie-expenditure-tooltip small{display:block}
        #calorie-progress .calorie-expenditure-tooltip strong{margin-bottom:4px;font-size:10px}
        #calorie-progress .calorie-expenditure-tooltip span{font-size:9px;font-weight:850;line-height:1.45}
        #calorie-progress .calorie-expenditure-tooltip small{margin-top:3px;color:var(--text-secondary,var(--muted));font-size:8px;line-height:1.35}
        #calorie-progress .calorie-expenditure-legend{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:7px;color:var(--text-secondary,var(--muted));font-size:8px;font-weight:850}
        #calorie-progress .calorie-expenditure-legend span{display:inline-flex;align-items:center;gap:5px}
        #calorie-progress .calorie-expenditure-legend i{display:inline-block;box-sizing:border-box}
        #calorie-progress .calorie-expenditure-legend .is-calories{width:8px;height:10px;border:1px solid var(--accent);border-radius:2px;background:color-mix(in srgb,var(--accent) 28%,transparent)}
        #calorie-progress .calorie-expenditure-legend .is-expenditure{width:17px;height:0;border-top:2px solid var(--text)}
        #calorie-progress .calorie-expenditure-hint{margin:5px 0 0;color:var(--muted);font-size:8px;font-weight:650;text-align:center}
    `;
    document.head.appendChild(style);
}

function restoreLegacyCarousel(graphCard) {
    const legacy = graphCard.querySelector("[data-expenditure-visual-carousel]");
    if (!legacy) return;
    const expenditurePage = legacy.querySelector('[data-expenditure-visual-page="expenditure"]');
    [".expenditure-chart-shell", ".expenditure-chart-legend", ".expenditure-chart-hint"].forEach(selector => {
        const node = expenditurePage?.querySelector(selector);
        if (node) legacy.insertAdjacentElement("beforebegin", node);
    });
    legacy.remove();
}

function ensureComparisonCard(graphCard) {
    restoreLegacyCarousel(graphCard);
    let card = document.querySelector("#calorie-progress [data-calorie-expenditure-comparison-card]");
    if (card) {
        if (card.previousElementSibling !== graphCard) graphCard.insertAdjacentElement("afterend", card);
        return card;
    }
    card = document.createElement("article");
    card.className = "calorie-stat-card calorie-expenditure-comparison-card";
    card.dataset.calorieExpenditureComparisonCard = "1";
    card.innerHTML = `
        <header class="calorie-expenditure-card-heading">
            <div><small>ENERGY BALANCE</small><h3>Calories vs Expenditure</h3></div>
            <p>Bars show logged calories. The line shows daily expenditure.</p>
        </header>
        <div class="calorie-expenditure-shell">
            <canvas data-calorie-expenditure-chart role="img" aria-label="Daily calories compared with daily expenditure"></canvas>
            <div class="calorie-expenditure-tooltip" data-calorie-expenditure-tooltip hidden aria-live="polite"></div>
        </div>
        <div class="calorie-expenditure-legend" aria-hidden="true">
            <span><i class="is-calories"></i>Calories</span>
            <span><i class="is-expenditure"></i>Expenditure</span>
        </div>
        <p class="calorie-expenditure-hint">Tap or drag for daily values. Uses the expenditure range selected above.</p>`;
    graphCard.insertAdjacentElement("afterend", card);
    return card;
}

function refresh() {
    queued = false;
    ensureStyles();
    const graphCard = document.querySelector("#calorie-progress .expenditure-trend-card");
    if (!graphCard) return;
    const card = ensureComparisonCard(graphCard);
    if (!card) return;
    renderCaloriesExpenditureChart(card, buildCaloriesExpenditureState());
}
function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
["pageshow", "levelup:nutrition-updated", "levelup:food-log-updated", "levelup:weight-updated", "levelup:appearance-changed"]
    .forEach(name => window.addEventListener(name, schedule));
if (!resizeBound) {
    resizeBound = true;
    window.addEventListener("resize", () => document.querySelector("#calorie-progress [data-calorie-expenditure-comparison-card]")?.__levelUpCaloriesExpenditureDraw?.());
}
document.addEventListener("click", event => {
    if (event.target.closest?.("[data-tdee-chart-range], #nutrition-progress-tab, [data-page='progress']")) window.setTimeout(schedule, 0);
}, true);
schedule();
