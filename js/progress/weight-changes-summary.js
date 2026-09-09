import { calculateTrendWeightSeries, normalizeWeightEntries } from "../core/weight-trend.js?v=smoothed-visible-trend-1";
import { displayMass, massUnit } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const WINDOWS = [3, 7, 14, 30, 90];
const DAY_MS = 86400000;
const STYLE_ID = "weight-changes-summary-styles";
let queued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .weight-changes-card{margin-top:14px;padding:16px;border:1px solid var(--line,rgba(255,255,255,.10));border-radius:16px;background:var(--card,var(--surface-raised,#17171b));color:var(--text,#f7f7f8);box-shadow:0 8px 24px rgba(0,0,0,.08)}
        .weight-changes-card h3{margin:0 0 13px;font-size:16px;line-height:1.2}
        .weight-changes-grid{display:grid;gap:2px}
        .weight-changes-row{display:grid;grid-template-columns:58px minmax(0,1fr) 92px;align-items:center;gap:10px;min-height:42px;padding:6px 0;border-top:1px solid color-mix(in srgb,var(--line,rgba(255,255,255,.10)) 72%,transparent)}
        .weight-changes-row:first-child{border-top:0}
        .weight-changes-period{color:var(--muted,#9b9ba3);font-size:12px;font-weight:700}
        .weight-changes-measure{display:grid;grid-template-columns:minmax(54px,70px) auto;align-items:center;gap:8px;min-width:0}
        .weight-changes-measure strong{white-space:nowrap;font-size:12px;font-weight:850;color:var(--text,#f7f7f8)}
        .weight-change-spark{display:block;width:100%;height:24px;color:var(--accent,#8b5cf6)}
        .weight-change-spark polyline{fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
        .weight-change-spark.is-empty{opacity:.32}
        .weight-changes-direction{display:flex;align-items:center;justify-content:flex-start;gap:5px;color:var(--muted,#9b9ba3);font-size:11px;white-space:nowrap}
        .weight-changes-direction svg{width:19px;height:15px;fill:none;stroke:var(--accent,#8b5cf6);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}
        .weight-changes-direction.is-stable svg{opacity:.8}
        html[data-theme="arctic"] .weight-changes-card,html[data-theme="pure"] .weight-changes-card,html[data-theme="ocean"] .weight-changes-card{box-shadow:0 8px 22px rgba(15,23,42,.06)}
        @media(max-width:390px){.weight-changes-card{padding:14px 12px}.weight-changes-row{grid-template-columns:52px minmax(0,1fr) 84px;gap:7px}.weight-changes-measure{grid-template-columns:minmax(48px,62px) auto;gap:6px}.weight-changes-direction{font-size:10px}}
    `;
    document.head.appendChild(style);
}

function readWeightEntries() {
    try {
        const today = localDate();
        return normalizeWeightEntries(JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]"))
            .filter(entry => entry.date <= today);
    } catch {
        return [];
    }
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return null;
    date.setDate(date.getDate() + Number(days || 0));
    return localDate(date);
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildSparkline(points, ready) {
    if (!ready || points.length < 2) {
        return '<svg class="weight-change-spark is-empty" viewBox="0 0 70 24" aria-hidden="true"><polyline points="3,13 18,11 34,14 51,12 67,13"/></svg>';
    }
    const width = 70;
    const height = 24;
    const pad = 2;
    const values = points.map(point => Number(point.weight)).filter(Number.isFinite);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(.01, max - min);
    const firstTime = new Date(`${points[0].date}T12:00:00`).getTime();
    const lastTime = new Date(`${points.at(-1).date}T12:00:00`).getTime();
    const elapsed = Math.max(DAY_MS, lastTime - firstTime);
    const svgPoints = points.map(point => {
        const time = new Date(`${point.date}T12:00:00`).getTime();
        const x = pad + ((time - firstTime) / elapsed) * (width - pad * 2);
        const y = pad + ((max - point.weight) / range) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg class="weight-change-spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="${points.length}-point trend mini graph"><polyline points="${svgPoints}"/></svg>`;
}

function directionIcon(direction) {
    if (direction === "increase") {
        return '<svg viewBox="0 0 24 16" aria-hidden="true"><path d="M2 13 8 8l5 3 8-8"/><path d="M17 3h4v4"/></svg>';
    }
    if (direction === "decrease") {
        return '<svg viewBox="0 0 24 16" aria-hidden="true"><path d="m2 3 6 5 5-3 8 8"/><path d="M17 13h4V9"/></svg>';
    }
    return '<svg viewBox="0 0 24 16" aria-hidden="true"><path d="M2 8h19"/><path d="m18 5 3 3-3 3"/></svg>';
}

function summaryForWindow(series, days) {
    const end = series.at(-1);
    if (!end) return { ready: false, points: [], delta: null, direction: "stable", label: "Need data" };
    const startDate = shiftDate(end.date, -days);
    const start = series.find(point => point.date === startDate);
    const points = series.filter(point => point.date >= startDate && point.date <= end.date);
    if (!start || !Number.isFinite(start.weight) || !Number.isFinite(end.weight)) {
        return { ready: false, points, delta: null, direction: "stable", label: "Need data" };
    }
    const delta = end.weight - start.weight;
    const displayDelta = displayMass(delta, 2);
    const threshold = .05;
    const direction = Number(displayDelta) > threshold ? "increase" : Number(displayDelta) < -threshold ? "decrease" : "stable";
    return {
        ready: true,
        points,
        delta,
        direction,
        label: direction === "increase" ? "Increase" : direction === "decrease" ? "Decrease" : "Stable"
    };
}

function formatChange(value) {
    if (!Number.isFinite(value)) return "—";
    const shown = displayMass(Math.abs(value), 1);
    if (!Number.isFinite(shown)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${shown.toFixed(1)} ${massUnit()}`;
}

export function ensureWeightChangesSummary(section = document.getElementById("weight-progress")) {
    if (!section) return;
    const anchor = section.querySelector(".weight-chart-card");
    if (!anchor) return;
    ensureStyles();

    let card = section.querySelector("[data-weight-changes-card]");
    if (!card) {
        card = document.createElement("section");
        card.className = "weight-changes-card";
        card.dataset.weightChangesCard = "1";
        card.setAttribute("aria-label", "Weight Changes");
    }
    if (card.previousElementSibling !== anchor) anchor.insertAdjacentElement("afterend", card);

    const entries = readWeightEntries();
    const series = calculateTrendWeightSeries(entries);
    const rows = WINDOWS.map(days => {
        const result = summaryForWindow(series, days);
        return `<div class="weight-changes-row" data-window-days="${days}">
            <span class="weight-changes-period">${days}-day</span>
            <span class="weight-changes-measure">
                ${buildSparkline(result.points, result.ready)}
                <strong>${formatChange(result.delta)}</strong>
            </span>
            <span class="weight-changes-direction is-${result.direction}">
                ${directionIcon(result.direction)}<span>${result.label}</span>
            </span>
        </div>`;
    }).join("");

    card.innerHTML = `<h3>Weight Changes</h3><div class="weight-changes-grid">${rows}</div>`;
}

function refresh() {
    queued = false;
    ensureWeightChangesSummary();
}

function schedule(delay = 0) {
    if (delay) {
        window.setTimeout(schedule, delay);
        return;
    }
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(() => schedule()).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:weight-updated", () => schedule(40));
window.addEventListener("levelup:units-changed", () => schedule());
window.addEventListener("pageshow", () => schedule(30));
document.addEventListener("click", event => {
    if (event.target.closest?.("#save-weight-btn,.remove-weight-entry,.edit-weight-entry,#weight-tab,.nav-btn[data-page='progress']")) schedule(70);
}, true);
schedule();
