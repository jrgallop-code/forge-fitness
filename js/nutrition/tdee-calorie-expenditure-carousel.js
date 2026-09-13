import { getEnergyBalanceState, getEnergyBalanceWindow } from "./energy-balance-state.js?v=energy-balance-range-1";

const CALORIE_RANGE_KEY = "level_up_calorie_stats_range_v1";
const STYLE_ID = "level-up-calorie-expenditure-card-styles";
let queued = false;
let resizeBound = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .calorie-expenditure-comparison-card {
            min-width: 0;
        }
        #calorie-progress .calorie-expenditure-card-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
        }
        #calorie-progress .calorie-expenditure-card-heading > div {
            display: grid;
            gap: 2px;
            min-width: 0;
        }
        #calorie-progress .calorie-expenditure-card-heading small {
            color: var(--muted);
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .09em;
            text-transform: uppercase;
        }
        #calorie-progress .calorie-expenditure-card-heading h3 {
            margin: 0;
            color: var(--text);
            font-size: 15px;
            line-height: 1.15;
        }
        #calorie-progress .calorie-expenditure-card-heading p {
            margin: 0;
            max-width: 150px;
            color: var(--text-secondary, var(--muted));
            font-size: 10px;
            font-weight: 650;
            line-height: 1.35;
            text-align: right;
        }
        #calorie-progress .calorie-expenditure-shell {
            position: relative;
            min-height: 250px;
        }
        #calorie-progress .calorie-expenditure-shell canvas {
            display: block;
            width: 100%;
            touch-action: pan-y;
        }
        #calorie-progress .calorie-expenditure-tooltip {
            position: absolute;
            top: 12px;
            z-index: 3;
            width: 138px;
            padding: 8px 9px;
            border: 1px solid var(--card-border, var(--line));
            border-radius: 10px;
            background: var(--card);
            color: var(--text);
            box-shadow: var(--shadow);
            pointer-events: none;
        }
        #calorie-progress .calorie-expenditure-tooltip strong,
        #calorie-progress .calorie-expenditure-tooltip span,
        #calorie-progress .calorie-expenditure-tooltip small {
            display: block;
        }
        #calorie-progress .calorie-expenditure-tooltip strong {
            margin-bottom: 4px;
            font-size: 10px;
        }
        #calorie-progress .calorie-expenditure-tooltip span {
            font-size: 9px;
            font-weight: 850;
            line-height: 1.45;
        }
        #calorie-progress .calorie-expenditure-tooltip small {
            margin-top: 3px;
            color: var(--text-secondary, var(--muted));
            font-size: 8px;
            line-height: 1.35;
        }
        #calorie-progress .calorie-expenditure-legend {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 7px;
            color: var(--text-secondary, var(--muted));
            font-size: 10px;
            font-weight: 850;
        }
        #calorie-progress .calorie-expenditure-legend span {
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        #calorie-progress .calorie-expenditure-legend i {
            display: inline-block;
            box-sizing: border-box;
        }
        #calorie-progress .calorie-expenditure-legend .is-calories {
            width: 7px;
            height: 10px;
            border-radius: 2px;
            background: color-mix(in srgb, var(--accent) 58%, transparent);
        }
        #calorie-progress .calorie-expenditure-legend .is-expenditure {
            width: 17px;
            height: 0;
            border-top: 2px solid var(--text);
        }
        #calorie-progress .calorie-expenditure-hint {
            margin: 5px 0 0;
            color: var(--muted);
            font-size: 10px;
            font-weight: 650;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function themeColor(token, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function formatNumber(value) {
    return Math.round(Number(value)).toLocaleString();
}

function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function selectedRangeDays() {
    const requested = Number(localStorage.getItem(CALORIE_RANGE_KEY));
    return [7, 28, 84].includes(requested) ? requested : 7;
}

function rangeLabel(days) {
    if (days === 7) return "LAST 7 DAYS";
    if (days === 28) return "LAST 4 WEEKS";
    return "LAST 12 WEEKS";
}

function buildComparisonState() {
    const endDate = localDateKey();
    const days = selectedRangeDays();
    const window = getEnergyBalanceWindow(endDate, days);
    const state = getEnergyBalanceState(window);
    return { days, startDate: window.startDate, endDate: window.endDate, points: state.visible };
}

function niceAxisStep(value) {
    return [250, 500, 750, 1000, 1250, 1500, 2000].find(step => step >= value) || 2500;
}

function comparisonAxis(points) {
    const values = points
        .flatMap(point => [positive(point.expenditureCalories), positive(point.intakeCalories)])
        .filter(value => value !== null);
    if (!values.length) return { yMin: 0, yMax: 3000 };
    const maximum = Math.max(...values, 1000);
    const step = niceAxisStep(maximum / 4);
    return { yMin: 0, yMax: Math.max(step * 4, Math.ceil(maximum / step) * step) };
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
            <div><small data-energy-balance-range-label>ENERGY BALANCE</small><h3>Calories vs Expenditure</h3></div>
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
        <p class="calorie-expenditure-hint">Tap or drag for daily values.</p>`;
    graphCard.insertAdjacentElement("afterend", card);
    return card;
}

function renderComparisonChart(card, state) {
    const range = card.querySelector("[data-energy-balance-range-label]");
    if (range) range.textContent = `ENERGY BALANCE · ${rangeLabel(state.days)}`;
    const canvas = card.querySelector("[data-calorie-expenditure-chart]");
    const tooltip = card.querySelector("[data-calorie-expenditure-tooltip]");
    const shell = canvas?.closest(".calorie-expenditure-shell");
    if (!canvas || !tooltip || !shell) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (!state.points.length) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        tooltip.hidden = true;
        return;
    }

    let selectedIndex = null;
    let dragging = false;
    const padding = { top: 16, right: 46, bottom: 30, left: 8 };
    const startMs = new Date(`${state.startDate}T12:00:00`).getTime();
    const endMs = new Date(`${state.endDate}T12:00:00`).getTime();

    const draw = () => {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(280, Math.round(shell.clientWidth || 320));
        const height = 250;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const { yMin, yMax } = comparisonAxis(state.points);
        const x = point => padding.left + ((new Date(`${point.date}T12:00:00`).getTime() - startMs) / Math.max(1, endMs - startMs)) * plotWidth;
        const y = value => padding.top + (1 - (Number(value) - yMin) / (yMax - yMin)) * plotHeight;
        const accent = themeColor("--accent", "#ff3b4b");
        const text = themeColor("--text", "#ffffff");
        const muted = themeColor("--muted", "#85858f");
        const cardColor = themeColor("--card", "#1b1b1f");

        context.font = "800 9px Arial";
        context.textAlign = "left";
        context.textBaseline = "middle";
        for (let index = 0; index <= 4; index += 1) {
            const value = yMax - (yMax - yMin) * index / 4;
            const lineY = padding.top + plotHeight * index / 4;
            context.strokeStyle = themeColor("--line", "rgba(255,255,255,.09)");
            context.lineWidth = 1;
            context.setLineDash([3, 3]);
            context.beginPath();
            context.moveTo(padding.left, lineY);
            context.lineTo(width - padding.right + 4, lineY);
            context.stroke();
            context.setLineDash([]);
            context.fillStyle = muted;
            context.fillText(formatNumber(value), width - padding.right + 9, lineY);
        }

        const daysInRange = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
        const barWidth = Math.max(1, Math.min(22, plotWidth / daysInRange * .62));
        state.points.forEach(point => {
            const intake = positive(point.intakeCalories);
            if (intake === null) return;
            const pointX = x(point);
            const top = y(intake);
            const base = y(0);
            const left = Math.max(padding.left, Math.min(width - padding.right - barWidth, pointX - barWidth / 2));
            context.save();
            context.globalAlpha = .52;
            context.fillStyle = accent;
            context.fillRect(left, top, barWidth, Math.max(1, base - top));
            context.restore();
        });

        if (state.points.length) {
            context.save();
            context.strokeStyle = text;
            context.lineWidth = 2.5;
            context.globalAlpha = .94;
            context.setLineDash([]);
            context.beginPath();
            state.points.forEach((point, index) => {
                if (index === 0) context.moveTo(x(point), y(point.expenditureCalories));
                else context.lineTo(x(point), y(point.expenditureCalories));
            });
            context.stroke();
            context.restore();
        }

        const labelCount = 5;
        context.fillStyle = muted;
        context.font = "800 10px Arial";
        context.textBaseline = "alphabetic";
        for (let index = 0; index < labelCount; index += 1) {
            const labelDate = new Date(startMs + (endMs - startMs) * index / Math.max(1, labelCount - 1));
            const pointX = padding.left + index / Math.max(1, labelCount - 1) * plotWidth;
            context.textAlign = index === 0 ? "left" : index === labelCount - 1 ? "right" : "center";
            context.fillText(formatDate(localDateKey(labelDate)), pointX, height - 7);
        }

        if (Number.isInteger(selectedIndex) && state.points[selectedIndex]) {
            const point = state.points[selectedIndex];
            const pointX = x(point);
            const pointY = y(point.expenditureCalories);
            context.save();
            context.strokeStyle = muted;
            context.globalAlpha = .65;
            context.setLineDash([3, 3]);
            context.beginPath();
            context.moveTo(pointX, padding.top);
            context.lineTo(pointX, padding.top + plotHeight);
            context.stroke();
            context.setLineDash([]);
            context.fillStyle = cardColor;
            context.strokeStyle = text;
            context.globalAlpha = 1;
            context.lineWidth = 2.5;
            context.beginPath();
            context.arc(pointX, pointY, 4.5, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.restore();
        }
    };

    const select = event => {
        const bounds = canvas.getBoundingClientRect();
        const relative = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const plotWidth = Math.max(1, bounds.width - padding.left - padding.right);
        const proportion = Math.max(0, Math.min(1, (relative - padding.left) / plotWidth));
        const selectedTime = startMs + (endMs - startMs) * proportion;
        selectedIndex = state.points.reduce((nearest, point, index) => {
            const pointTime = new Date(`${point.date}T12:00:00`).getTime();
            const nearestTime = new Date(`${state.points[nearest].date}T12:00:00`).getTime();
            return Math.abs(pointTime - selectedTime) < Math.abs(nearestTime - selectedTime) ? index : nearest;
        }, 0);
        const point = state.points[selectedIndex];
        const intake = positive(point.intakeCalories);
        const expenditure = positive(point.expenditureCalories);
        const difference = intake !== null && expenditure !== null ? intake - expenditure : null;
        tooltip.hidden = false;
        tooltip.innerHTML = `<strong>${formatDate(point.date)}</strong><span>Calories: ${intake !== null ? formatNumber(intake) : "Not logged"}</span><span>Expenditure: ${formatNumber(expenditure)}</span><small>${difference !== null ? `${difference >= 0 ? "+" : "−"}${formatNumber(Math.abs(difference))} cal ${difference >= 0 ? "above" : "below"} expenditure` : "No completed calorie log for this day."}</small>`;
        const desiredLeft = relative < bounds.width / 2 ? relative + 10 : relative - 148;
        tooltip.style.left = `${Math.max(8, Math.min(bounds.width - 142, desiredLeft))}px`;
        draw();
    };

    canvas.onpointerdown = event => {
        dragging = true;
        try { canvas.setPointerCapture(event.pointerId); } catch {}
        select(event);
    };
    canvas.onpointermove = event => { if (dragging) select(event); };
    canvas.onpointerup = event => {
        dragging = false;
        try { canvas.releasePointerCapture(event.pointerId); } catch {}
    };
    canvas.onpointercancel = () => { dragging = false; };
    canvas.ondblclick = () => {
        selectedIndex = null;
        tooltip.hidden = true;
        draw();
    };

    card.__levelUpCaloriesExpenditureDraw = draw;
    draw();
}

function refresh() {
    queued = false;
    ensureStyles();
    const graphCard = document.querySelector("#calorie-progress .expenditure-trend-card");
    if (!graphCard) return;
    const card = ensureComparisonCard(graphCard);
    if (!card) return;
    renderComparisonChart(card, buildComparisonState());
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
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
    if (event.target.closest?.("#nutrition-progress-tab, [data-page='progress'], [data-calorie-stats-range]")) window.setTimeout(schedule, 0);
}, true);

schedule();
