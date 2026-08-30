import { UNIT_KINDS, distanceUnit, isMetric } from "../core/unit-system.js?v=granular-units-1";

const SESSION_STORAGE_KEY = "forge_workout_sessions";
const DAY_MS = 86400000;
const RANGE_OPTIONS = [7, 28, 84, 0];
let selectedRange = 28;

export function parseCardioDistance(value) {
    const text = String(value || "").trim().toLowerCase().replace(/,/g, ".");
    const match = text.match(/(\d+(?:\.\d+)?)\s*(km|kilometers?|kilometres?|mi|miles?|m|meters?|metres?)?/i);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const explicitUnit = match[2];
    // Cardio machines commonly display whole-number metres. Treat large bare
    // values as metres so an entry such as "700" cannot become 700 km.
    const unit = explicitUnit || (amount >= 100 ? "m" : distanceUnit());
    if (/^(mi|mile)/.test(unit)) return amount * 1.609344;
    if (/^(m|meter|metre)/.test(unit) && !/^mi/.test(unit)) return amount / 1000;
    return amount;
}

export function parseCardioRpe(exercise) {
    const direct = Number(exercise?.rpe);
    if (direct >= 1 && direct <= 10) return direct;
    const match = String(exercise?.notes || "").match(/\bRPE\s*[:=-]?\s*(10|[1-9](?:\.\d)?)/i);
    const parsed = Number(match?.[1]);
    return parsed >= 1 && parsed <= 10 ? parsed : null;
}

export function collectCardioEntries(sessions, now = new Date(), rangeDays = selectedRange) {
    const cutoff = rangeDays > 0 ? now.getTime() - rangeDays * DAY_MS : 0;
    return (Array.isArray(sessions) ? sessions : []).flatMap(session => {
        const timestamp = sessionTimestamp(session);
        if (!timestamp || timestamp < cutoff || timestamp > now.getTime() + DAY_MS) return [];
        return (session.exercises || []).filter(exercise => exercise?.trackingType === "notes").map(exercise => {
            const duration = positiveNumber(exercise.durationMinutes);
            const distanceKm = parseCardioDistance(exercise.distance);
            const rpe = parseCardioRpe(exercise);
            if (!duration && !distanceKm) return null;
            return {
                id: `${session.id || timestamp}-${exercise.exerciseId || exercise.name || "cardio"}`,
                sessionId: String(session.id || timestamp),
                timestamp,
                date: new Date(timestamp),
                name: exercise.exerciseName || exercise.name || titleFromId(exercise.exerciseId) || "Cardio",
                duration,
                distanceKm,
                rpe,
                load: duration && rpe ? duration * rpe : null
            };
        }).filter(Boolean);
    }).sort((a, b) => a.timestamp - b.timestamp);
}

export function summarizeCardio(entries) {
    const sessions = new Set(entries.map(entry => entry.sessionId)).size;
    const duration = entries.reduce((total, entry) => total + (entry.duration || 0), 0);
    const distanceEntries = entries.filter(entry => entry.duration > 0 && entry.distanceKm > 0);
    const distanceKm = entries.reduce((total, entry) => total + (entry.distanceKm || 0), 0);
    const speedDistanceKm = distanceEntries.reduce((total, entry) => total + entry.distanceKm, 0);
    const distanceDuration = distanceEntries.reduce((total, entry) => total + entry.duration, 0);
    const loadEntries = entries.filter(entry => Number.isFinite(entry.load));
    const load = loadEntries.reduce((total, entry) => total + entry.load, 0);
    return {
        sessions,
        duration,
        distanceKm,
        averageSpeedKmh: distanceDuration > 0 && speedDistanceKm > 0 ? speedDistanceKm / (distanceDuration / 60) : null,
        load: loadEntries.length ? load : null,
        loadCoverage: loadEntries.length
    };
}

export function groupCardioByWeek(entries) {
    const groups = new Map();
    entries.forEach(entry => {
        const start = startOfWeek(entry.date);
        const key = dateKey(start);
        const current = groups.get(key) || { key, start, duration: 0, distanceKm: 0, load: 0, loadCount: 0, sessions: 0 };
        current.duration += entry.duration || 0;
        current.distanceKm += entry.distanceKm || 0;
        current.sessions += 1;
        if (Number.isFinite(entry.load)) { current.load += entry.load; current.loadCount += 1; }
        groups.set(key, current);
    });
    return [...groups.values()].sort((a, b) => a.start - b.start);
}

export function initializeCardioAnalytics(root = document) {
    const panel = root.querySelector("#cardio-progress");
    if (!panel) return;
    panel.querySelectorAll("[data-cardio-range]").forEach(button => button.addEventListener("click", () => {
        selectedRange = Number(button.dataset.cardioRange);
        renderCardioAnalytics(panel);
    }));
    document.getElementById("cardio-progress-tab")?.addEventListener("click", () => requestAnimationFrame(() => renderCardioAnalytics(panel)));
    window.addEventListener("levelup:workout-completed", () => renderCardioAnalytics(panel));
    window.addEventListener("storage", event => { if (event.key === SESSION_STORAGE_KEY) renderCardioAnalytics(panel); });
    renderCardioAnalytics(panel);
}

export function renderCardioAnalytics(panel = document.querySelector("#cardio-progress")) {
    if (!panel) return;
    const entries = collectCardioEntries(readSessions(), new Date(), selectedRange);
    const summary = summarizeCardio(entries);
    const weeks = groupCardioByWeek(entries);
    panel.querySelectorAll("[data-cardio-range]").forEach(button => {
        const active = Number(button.dataset.cardioRange) === selectedRange;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    setText(panel, "[data-cardio-duration]", formatMinutes(summary.duration));
    setText(panel, "[data-cardio-sessions]", String(summary.sessions));
    setText(panel, "[data-cardio-distance]", formatDistance(summary.distanceKm));
    setText(panel, "[data-cardio-speed]", formatSpeed(summary.averageSpeedKmh));
    setText(panel, "[data-cardio-load]", summary.load === null ? "—" : Math.round(summary.load).toLocaleString());
    setText(panel, "[data-cardio-load-note]", summary.loadCoverage ? `Minutes × RPE · ${summary.loadCoverage} logged` : "Add RPE to calculate load");
    const empty = panel.querySelector("[data-cardio-empty]");
    if (empty) empty.hidden = entries.length > 0;
    renderWeeklyBars(panel, weeks);
    renderTrend(panel, entries);
    renderActivityBreakdown(panel, entries);
    renderRecent(panel, entries);
}

function renderWeeklyBars(panel, weeks) {
    const host = panel.querySelector("[data-cardio-weekly]");
    if (!host) return;
    const visible = weeks.slice(-12);
    const max = Math.max(1, ...visible.map(week => week.duration));
    host.innerHTML = visible.length ? visible.map(week => `
        <div class="cardio-week-column">
            <strong>${Math.round(week.duration)}</strong>
            <div class="cardio-week-track"><i style="height:${Math.max(5, Math.round(week.duration / max * 100))}%"></i></div>
            <span>${week.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>`).join("") : '<p class="cardio-chart-empty">Complete a cardio workout to start this chart.</p>';
}

function renderTrend(panel, entries) {
    const host = panel.querySelector("[data-cardio-trend]");
    if (!host) return;
    const points = entries.filter(entry => entry.duration > 0 && entry.distanceKm > 0).slice(-12);
    if (!points.length) {
        host.innerHTML = '<p class="cardio-chart-empty">Log time and distance together to see your speed trend.</p>';
        return;
    }
    const speeds = points.map(point => point.distanceKm / (point.duration / 60));
    const min = Math.min(...speeds);
    const max = Math.max(...speeds);
    const range = Math.max(0.1, max - min);
    const coords = speeds.map((speed, index) => {
        const x = points.length === 1 ? 50 : 6 + index * (88 / (points.length - 1));
        const y = 86 - ((speed - min) / range) * 66;
        return `${x},${y}`;
    }).join(" ");
    host.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Average speed trend">
        <defs><linearGradient id="cardioArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3039" stop-opacity=".34"/><stop offset="1" stop-color="#ff3039" stop-opacity="0"/></linearGradient></defs>
        <polygon points="6,92 ${coords} 94,92" fill="url(#cardioArea)"/>
        <polyline points="${coords}" fill="none" stroke="#ff3039" stroke-width="2.6" vector-effect="non-scaling-stroke"/>
        ${coords.split(" ").map(point => `<circle cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="2" fill="#ff3039" vector-effect="non-scaling-stroke"/>`).join("")}
    </svg><div class="cardio-trend-axis"><span>${formatSpeed(speeds[0])}</span><span>${formatSpeed(speeds.at(-1))}</span></div>`;
}

function renderActivityBreakdown(panel, entries) {
    const host = panel.querySelector("[data-cardio-activities]");
    if (!host) return;
    const activities = new Map();
    entries.forEach(entry => activities.set(entry.name, (activities.get(entry.name) || 0) + entry.duration));
    const rows = [...activities.entries()].sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map(([, value]) => value));
    host.innerHTML = rows.length ? rows.map(([name, minutes]) => `<div class="cardio-activity-row"><div><strong>${escapeHtml(name)}</strong><span>${formatMinutes(minutes)}</span></div><div class="cardio-activity-track"><i style="width:${Math.max(4, Math.round(minutes / max * 100))}%"></i></div></div>`).join("") : '<p class="cardio-chart-empty">No cardio activities in this range.</p>';
}

function renderRecent(panel, entries) {
    const host = panel.querySelector("[data-cardio-recent]");
    if (!host) return;
    host.innerHTML = entries.length ? entries.slice(-5).reverse().map(entry => `<div class="cardio-recent-row"><div><strong>${escapeHtml(entry.name)}</strong><span>${entry.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div><div><strong>${formatMinutes(entry.duration)}</strong><span>${entry.distanceKm ? formatDistance(entry.distanceKm) : entry.rpe ? `RPE ${entry.rpe}` : "Time only"}</span></div></div>`).join("") : '<p class="cardio-chart-empty">Your completed cardio sessions will appear here.</p>';
}

function readSessions() { try { const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function sessionTimestamp(session) { const value = session?.completedAt || session?.date || session?.startedAt; const timestamp = new Date(value).getTime(); return Number.isFinite(timestamp) ? timestamp : 0; }
function positiveNumber(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function startOfWeek(value) { const date = new Date(value); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
function dateKey(date) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
function titleFromId(id) { return String(id || "").split("-").filter(Boolean).map(word => word[0]?.toUpperCase() + word.slice(1)).join(" "); }
function formatMinutes(value) { const rounded = Math.round(Number(value) || 0); if (rounded < 60) return `${rounded} min`; const hours = Math.floor(rounded / 60); const minutes = rounded % 60; return minutes ? `${hours}h ${minutes}m` : `${hours}h`; }
function displayKm(value) { return isMetric(UNIT_KINDS.DISTANCE) ? value : value / 1.609344; }
function formatDistance(value) { return `${displayKm(Number(value) || 0).toFixed(value >= 10 ? 1 : 2)} ${distanceUnit()}`; }
function formatSpeed(value) { if (!Number.isFinite(value)) return "—"; const display = isMetric(UNIT_KINDS.DISTANCE) ? value : value / 1.609344; return `${display.toFixed(1)} ${distanceUnit()}/h`; }
function setText(root, selector, value) { const element = root.querySelector(selector); if (element) element.textContent = value; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
