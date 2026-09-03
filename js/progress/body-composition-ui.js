import {
    BODY_FAT_RANGES,
    BODY_FAT_METHODS,
    bodyFatMethodLabel,
    estimateBodyComposition,
    getBodyFatEntries,
    getBodyFatPrior,
    getBodyFatRange,
    removeBodyFatEntry,
    saveBodyFatEntry,
    saveBodyFatRange
} from "../core/body-composition.js?v=body-composition-1";
import { UNIT_KINDS, isMetric, poundsToKilograms } from "../core/unit-system.js?v=granular-units-1";

const WEIGHT_KEY = "forge_weight_entries";
const STYLE_ID = "level-up-body-composition-styles";
let scheduled = false;

install();

function install() {
    ensureStyles();
    schedule();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    ["levelup:body-composition-updated", "levelup:weight-updated", "levelup:profile-updated", "levelup:appearance-changed"]
        .forEach(name => window.addEventListener(name, schedule));
}

function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
        scheduled = false;
        enhanceOnboarding();
        enhanceBodyProfile();
        enhanceProgress();
    });
}

function enhanceOnboarding() {
    const screen = document.querySelector(".onboarding-profile-screen");
    if (!screen || screen.querySelector("[data-body-fat-visual-selector]")) return;
    const anchor = screen.querySelector(".onboarding-units-disclosure");
    const section = visualSelector("onboarding");
    if (anchor) anchor.insertAdjacentElement("beforebegin", section);
    else screen.appendChild(section);
}

function enhanceBodyProfile() {
    const form = document.getElementById("profile-appearance-form");
    if (!form || form.querySelector("[data-body-fat-visual-selector]")) return;
    const status = form.querySelector(".profile-appearance-status");
    const section = visualSelector("profile");
    if (status) status.insertAdjacentElement("beforebegin", section);
    else form.appendChild(section);
}

function enhanceProgress() {
    const tabs = document.querySelector(".progress-tabs");
    const weightPanel = document.getElementById("weight-progress");
    if (!tabs || !weightPanel) return;

    let tab = document.getElementById("body-composition-progress-tab");
    if (!tab) {
        tab = document.createElement("button");
        tab.className = "progress-tab";
        tab.id = "body-composition-progress-tab";
        tab.type = "button";
        tab.textContent = "Body Comp";
        document.getElementById("weight-tab")?.insertAdjacentElement("afterend", tab);
    }

    let panel = document.getElementById("body-composition-progress");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "body-composition-progress";
        panel.hidden = true;
        weightPanel.insertAdjacentElement("afterend", panel);
    }
    if (!panel.hidden || !panel.dataset.bodyCompositionRendered) renderProgressPanel(panel);
}

function visualSelector(context) {
    const saved = getBodyFatRange();
    const section = document.createElement("section");
    section.className = `body-fat-visual-selector body-fat-visual-selector--${context}`;
    section.dataset.bodyFatVisualSelector = context;
    section.innerHTML = `
        <div class="body-fat-visual-head">
            <div><span class="eyebrow">BODY COMPOSITION · OPTIONAL</span><h3>Estimated body fat</h3></div>
            <button type="button" class="body-fat-not-sure" data-body-fat-range="">Not sure</button>
        </div>
        <p>Choose the closest visual range only if you are comfortable estimating. This is an approximation, not a medical assessment.</p>
        <div class="body-fat-visual-grid" role="radiogroup" aria-label="Estimated body-fat range">
            ${BODY_FAT_RANGES.map((range, index) => visualRangeCard(range, index, saved?.rangeId === range.id)).join("")}
        </div>
        <small class="body-fat-visual-foot">Level Up uses this only as a small background refinement. Your logged calories and Trend Weight remain the main expenditure inputs.</small>`;
    return section;
}

function visualRangeCard(range, index, selected) {
    return `<button type="button" class="body-fat-visual-card${selected ? " selected" : ""}" data-body-fat-range="${range.id}" aria-pressed="${selected}">
        ${torsoSvg(index)}
        <strong>${range.label}</strong>
    </button>`;
}

function torsoSvg(index) {
    const waist = [29, 30, 32, 35, 38, 41, 44, 47][index] || 36;
    const shoulder = [41, 41, 40, 39, 39, 39, 40, 41][index] || 39;
    const definition = Math.max(0, 5 - index);
    const abs = definition >= 3 ? `
        <path d="M42 50 Q50 54 58 50 M43 62 Q50 66 57 62 M44 74 Q50 77 56 74"/>
        <path d="M50 46V82"/>` : definition === 2 ? `<path d="M43 58 Q50 62 57 58 M44 70 Q50 73 56 70"/>` : definition === 1 ? `<path d="M45 66 Q50 69 55 66"/>` : "";
    return `<svg class="body-fat-torso" viewBox="0 0 100 120" aria-hidden="true">
        <path class="body-fat-torso-fill" d="M${50-shoulder} 24 Q27 13 40 12 L42 5 H58 L60 12 Q73 13 ${50+shoulder} 24 Q88 38 80 58 L${50+waist} 98 Q64 109 50 109 Q36 109 ${50-waist} 98 L20 58 Q12 38 ${50-shoulder} 24Z"/>
        <path class="body-fat-torso-line" d="M${50-shoulder} 24 Q27 13 40 12 L42 5 H58 L60 12 Q73 13 ${50+shoulder} 24 Q88 38 80 58 L${50+waist} 98 Q64 109 50 109 Q36 109 ${50-waist} 98 L20 58 Q12 38 ${50-shoulder} 24Z"/>
        <path class="body-fat-torso-line" d="M30 34 Q39 29 48 36 M52 36 Q61 29 70 34"/>
        ${definition >= 4 ? `<path class="body-fat-torso-line" d="M28 48 Q38 45 47 48 M53 48 Q62 45 72 48"/>` : ""}
        <g class="body-fat-definition">${abs}</g>
    </svg>`;
}

function renderProgressPanel(panel) {
    const entries = getBodyFatEntries();
    const prior = getBodyFatPrior();
    const latest = entries.at(-1);
    const latestPercent = latest?.percent ?? prior?.percent ?? null;
    const weight = weightAtOrBefore(latest?.date || todayKey());
    const composition = estimateBodyComposition(weight, latestPercent);
    const previous = entries.length > 1 ? entries.at(-2) : null;
    const change = previous && latest ? latest.percent - previous.percent : null;
    panel.dataset.bodyCompositionRendered = "1";
    panel.innerHTML = `
        <section class="body-composition-shell">
            <header class="body-composition-header">
                <div><span class="eyebrow">BODY COMPOSITION</span><h3>Body Fat Progress</h3><p>Track estimates over time. Weekly or every few weeks is usually more useful than daily logging.</p></div>
            </header>
            <div class="body-composition-summary">
                ${summaryCard("Current BF", latestPercent === null ? "—" : `${formatPercent(latestPercent)}%`, latest ? bodyFatMethodLabel(latest.method) : prior?.label || "Visual range")}
                ${summaryCard("Fat mass", composition ? formatMass(composition.fatMassLb) : "—", "Estimated")}
                ${summaryCard("Lean mass", composition ? formatMass(composition.leanMassLb) : "—", "Estimated")}
                ${summaryCard("Change", change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`, entries.length > 1 ? "Since previous log" : "Add another log")}
            </div>
            <article class="body-composition-log-card">
                <div><span class="eyebrow">ADD MEASUREMENT</span><h4>Log body fat</h4></div>
                <form data-body-fat-entry-form>
                    <label>Date<input name="date" type="date" value="${todayKey()}"></label>
                    <label>Body fat %<input name="percent" type="number" min="2" max="70" step="0.1" inputmode="decimal" placeholder="e.g. 17.5"></label>
                    <label>Method<select name="method">${BODY_FAT_METHODS.map(item => `<option value="${item.id}">${item.label}</option>`).join("")}</select></label>
                    <button class="primary-btn" type="submit">Save Body Fat</button>
                </form>
                <p data-body-fat-entry-status aria-live="polite"></p>
            </article>
            <article class="body-composition-chart-card">
                <div class="body-composition-chart-head"><div><span class="eyebrow">TREND</span><h4>Body Fat % Over Time</h4></div><div class="body-composition-range-tabs" role="group" aria-label="Body-fat chart range"><button type="button" data-body-fat-chart-range="30">1M</button><button type="button" data-body-fat-chart-range="90" aria-pressed="true">3M</button><button type="button" data-body-fat-chart-range="180">6M</button><button type="button" data-body-fat-chart-range="0">All</button></div></div>
                <div class="body-composition-chart-shell"><canvas data-body-fat-chart aria-label="Body-fat percentage over time"></canvas><p data-body-fat-chart-empty>Add at least two body-fat measurements to build a trend.</p></div>
            </article>
            <article class="body-composition-visual-card-wrap">
                ${visualSelector("progress").outerHTML}
            </article>
            <article class="body-composition-history-card">
                <div><span class="eyebrow">HISTORY</span><h4>Body Fat Log</h4></div>
                <div data-body-fat-history>${historyMarkup(entries)}</div>
            </article>
        </section>`;
    bindChartRange(panel);
    drawBodyFatChart(panel, 90);
}

function summaryCard(label, value, note) {
    return `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function historyMarkup(entries) {
    if (!entries.length) return `<p class="empty-state">No body-fat measurements yet.</p>`;
    return [...entries].reverse().map(entry => {
        const weight = weightAtOrBefore(entry.date);
        const composition = estimateBodyComposition(weight, entry.percent);
        return `<div class="body-composition-history-row"><span><strong>${formatDate(entry.date)}</strong><small>${bodyFatMethodLabel(entry.method)}</small></span><b>${formatPercent(entry.percent)}%</b><span>${composition ? `${formatMass(composition.fatMassLb)} fat` : "Weight unavailable"}</span><button type="button" data-remove-body-fat-entry="${entry.date}">Remove</button></div>`;
    }).join("");
}

function handleClick(event) {
    const rangeButton = event.target.closest?.("[data-body-fat-range]");
    if (rangeButton) {
        event.preventDefault();
        const id = String(rangeButton.dataset.bodyFatRange || "");
        saveBodyFatRange(id, { source: "visual" });
        document.querySelectorAll("[data-body-fat-visual-selector]").forEach(host => syncVisualSelection(host, id));
        return;
    }

    const bodyCompTab = event.target.closest?.("#body-composition-progress-tab");
    if (bodyCompTab) {
        showBodyCompositionTab();
        return;
    }

    const otherProgressTab = event.target.closest?.(".progress-tab:not(#body-composition-progress-tab)");
    if (otherProgressTab) {
        const panel = document.getElementById("body-composition-progress");
        if (panel) panel.hidden = true;
        document.getElementById("body-composition-progress-tab")?.classList.remove("active");
    }

    const remove = event.target.closest?.("[data-remove-body-fat-entry]");
    if (remove) {
        if (window.confirm("Remove this body-fat entry?")) {
            removeBodyFatEntry(remove.dataset.removeBodyFatEntry);
            const panel = document.getElementById("body-composition-progress");
            if (panel) renderProgressPanel(panel);
        }
        return;
    }
}

function handleSubmit(event) {
    const form = event.target.closest?.("[data-body-fat-entry-form]");
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form);
    const status = form.closest(".body-composition-log-card")?.querySelector("[data-body-fat-entry-status]");
    try {
        saveBodyFatEntry({ date: data.get("date"), percent: data.get("percent"), method: data.get("method") });
        if (status) status.textContent = "Body-fat estimate saved.";
        const panel = document.getElementById("body-composition-progress");
        if (panel) renderProgressPanel(panel);
    } catch (error) {
        if (status) status.textContent = error.message;
    }
}

function showBodyCompositionTab() {
    const panel = document.getElementById("body-composition-progress");
    if (!panel) return;
    ["weight-progress", "lifting-progress", "calorie-progress", "cardio-progress", "photo-log-progress"].forEach(id => {
        const section = document.getElementById(id);
        if (section) section.hidden = true;
    });
    document.querySelectorAll(".progress-tab").forEach(button => button.classList.remove("active"));
    document.getElementById("body-composition-progress-tab")?.classList.add("active");
    panel.hidden = false;
    renderProgressPanel(panel);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function syncVisualSelection(host, id) {
    host.querySelectorAll("[data-body-fat-range]").forEach(button => {
        const selected = Boolean(id) && button.dataset.bodyFatRange === id;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

function bindChartRange(panel) {
    panel.querySelectorAll("[data-body-fat-chart-range]").forEach(button => button.addEventListener("click", () => {
        panel.querySelectorAll("[data-body-fat-chart-range]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        drawBodyFatChart(panel, Number(button.dataset.bodyFatChartRange) || 0);
    }));
}

function drawBodyFatChart(panel, days) {
    const canvas = panel.querySelector("[data-body-fat-chart]");
    const empty = panel.querySelector("[data-body-fat-chart-empty]");
    const entries = filterRange(getBodyFatEntries(), days);
    if (!canvas || !empty) return;
    empty.hidden = entries.length >= 2;
    canvas.hidden = entries.length < 2;
    if (entries.length < 2) return;
    const ctx = canvas.getContext("2d");
    const shell = canvas.parentElement;
    if (!ctx || !shell) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(280, shell.clientWidth || 320);
    const height = 220;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const pad = { left: 42, right: 16, top: 18, bottom: 30 };
    const values = entries.map(entry => entry.percent);
    const min = Math.max(0, Math.floor(Math.min(...values) - 2));
    const max = Math.ceil(Math.max(...values) + 2);
    const start = new Date(`${entries[0].date}T12:00:00`).getTime();
    const end = new Date(`${entries.at(-1).date}T12:00:00`).getTime();
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text").trim() || "#fff";
    const muted = styles.getPropertyValue("--muted").trim() || "#888";
    const line = styles.getPropertyValue("--line").trim() || "rgba(255,255,255,.1)";
    const accent = styles.getPropertyValue("--accent").trim() || "#ef3348";
    const x = entry => pad.left + ((new Date(`${entry.date}T12:00:00`).getTime() - start) / Math.max(1, end - start)) * plotW;
    const y = value => pad.top + (1 - (value - min) / Math.max(1, max - min)) * plotH;

    ctx.font = "800 9px Arial";
    ctx.fillStyle = muted;
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i += 1) {
        const value = max - ((max - min) * i / 4);
        const py = pad.top + plotH * i / 4;
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(width - pad.right, py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText(`${value.toFixed(0)}%`, pad.left - 7, py + 3);
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    entries.forEach((entry, index) => index ? ctx.lineTo(x(entry), y(entry.percent)) : ctx.moveTo(x(entry), y(entry.percent)));
    ctx.stroke();
    entries.forEach(entry => {
        ctx.fillStyle = text;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x(entry), y(entry.percent), 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.font = "800 8px Arial";
    const labels = [entries[0], entries.at(-1)];
    labels.forEach(entry => ctx.fillText(formatShortDate(entry.date), x(entry), height - 8));
}

function filterRange(entries, days) {
    if (!days || !entries.length) return entries;
    const end = new Date(`${entries.at(-1).date}T12:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    const key = todayKey(start);
    return entries.filter(entry => entry.date >= key);
}

function weightAtOrBefore(date) {
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem(WEIGHT_KEY) || "[]") || []; } catch {}
    return (Array.isArray(entries) ? entries : [])
        .map(entry => ({ date: String(entry?.date || "").slice(0, 10), weight: Number(entry?.weight) }))
        .filter(entry => entry.date && entry.date <= date && Number.isFinite(entry.weight) && entry.weight > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1)?.weight ?? null;
}

function formatMass(lb) {
    if (!Number.isFinite(Number(lb))) return "—";
    return isMetric(UNIT_KINDS.BODY_WEIGHT) ? `${poundsToKilograms(lb).toFixed(1)} kg` : `${Number(lb).toFixed(1)} lb`;
}

function formatPercent(value) {
    const n = Number(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function todayKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function formatShortDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .body-fat-visual-selector{margin:18px 0;padding:16px;border:1px solid color-mix(in srgb,var(--text,#fff) 11%,transparent);border-radius:18px;background:color-mix(in srgb,var(--surface,#151518) 96%,transparent)}
        .body-fat-visual-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.body-fat-visual-head h3{margin:3px 0 0;color:var(--text)}.body-fat-visual-selector>p{margin:8px 0 12px;color:var(--muted);font-size:12px;line-height:1.45}.body-fat-not-sure{border:0;background:transparent;color:var(--accent);font-weight:800;font-size:11px}.body-fat-visual-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.body-fat-visual-card{min-width:0;padding:7px 5px 8px;border:1px solid color-mix(in srgb,var(--text,#fff) 10%,transparent);border-radius:14px;background:color-mix(in srgb,var(--card,#1c1c1e) 96%,transparent);color:var(--text);cursor:pointer}.body-fat-visual-card.selected{border-color:var(--accent);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 38%,transparent);background:color-mix(in srgb,var(--accent) 8%,var(--card,#1c1c1e))}.body-fat-visual-card strong{display:block;margin-top:3px;font-size:11px}.body-fat-torso{display:block;width:100%;height:74px}.body-fat-torso-fill{fill:color-mix(in srgb,var(--text,#fff) 8%,transparent)}.body-fat-torso-line,.body-fat-definition path{fill:none;stroke:color-mix(in srgb,var(--text,#fff) 55%,transparent);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.body-fat-visual-foot{display:block;margin-top:10px;color:var(--muted);font-size:10px;line-height:1.4}
        .body-composition-shell{display:grid;gap:14px}.body-composition-header h3{margin:4px 0}.body-composition-header p{margin:0;color:var(--muted);font-size:12px}.body-composition-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.body-composition-summary article{padding:13px;border:1px solid color-mix(in srgb,var(--text,#fff) 10%,transparent);border-radius:15px;background:var(--card)}.body-composition-summary span,.body-composition-summary small{display:block;color:var(--muted);font-size:10px}.body-composition-summary strong{display:block;margin:4px 0;color:var(--text);font-size:19px}.body-composition-log-card,.body-composition-chart-card,.body-composition-history-card,.body-composition-visual-card-wrap{padding:15px;border:1px solid color-mix(in srgb,var(--text,#fff) 10%,transparent);border-radius:18px;background:var(--card)}.body-composition-log-card h4,.body-composition-chart-card h4,.body-composition-history-card h4{margin:3px 0 8px}.body-composition-log-card form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.body-composition-log-card label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:750}.body-composition-log-card input,.body-composition-log-card select{width:100%;box-sizing:border-box}.body-composition-log-card .primary-btn{grid-column:1/-1}.body-composition-log-card [data-body-fat-entry-status]{margin:8px 0 0;color:var(--muted);font-size:11px}.body-composition-chart-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.body-composition-range-tabs{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.body-composition-range-tabs button{min-width:34px;padding:5px 7px;border:1px solid color-mix(in srgb,var(--text,#fff) 10%,transparent);border-radius:999px;background:transparent;color:var(--muted);font-size:9px;font-weight:850}.body-composition-range-tabs button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}.body-composition-chart-shell{min-height:220px;position:relative}.body-composition-chart-shell canvas{display:block;width:100%}.body-composition-chart-shell p{padding:70px 10px;text-align:center;color:var(--muted);font-size:12px}.body-composition-visual-card-wrap>.body-fat-visual-selector{margin:0;padding:0;border:0;background:transparent}.body-composition-history-row{display:grid;grid-template-columns:minmax(0,1.25fr) .55fr .9fr auto;gap:8px;align-items:center;padding:10px 0;border-top:1px solid color-mix(in srgb,var(--text,#fff) 8%,transparent);font-size:11px}.body-composition-history-row:first-child{border-top:0}.body-composition-history-row span strong,.body-composition-history-row span small{display:block}.body-composition-history-row span small{color:var(--muted);font-size:9px}.body-composition-history-row button{border:0;background:transparent;color:var(--muted);font-size:10px}
        .body-fat-visual-selector--onboarding{margin-top:16px}.body-fat-visual-selector--profile{margin-bottom:18px}
        @media(max-width:520px){.body-fat-visual-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.body-composition-log-card form{grid-template-columns:1fr}.body-composition-log-card .primary-btn{grid-column:auto}.body-composition-history-row{grid-template-columns:1.1fr .5fr .8fr auto}.body-composition-chart-head{display:grid}.body-composition-range-tabs{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
}
