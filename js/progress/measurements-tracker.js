const MEASUREMENTS_STORAGE_KEY = "level_up_body_measurements";

const MEASUREMENT_FIELDS = [
    ["neck", "Neck"],
    ["shoulders", "Shoulders"],
    ["chest", "Chest"],
    ["waist", "Waist"],
    ["hips", "Hips"],
    ["upperArm", "Upper arm"],
    ["forearm", "Forearm"],
    ["thigh", "Thigh"],
    ["calf", "Calf"]
];

let editingDate = null;

export function renderMeasurementsTracker() {
    return `
        <section class="section-card measurements-page">
            <div class="measurements-heading">
                <div>
                    <span class="eyebrow">BODY MEASUREMENTS</span>
                    <h2>Measurements</h2>
                    <p class="section-description">Track body-size changes beyond the scale. Measure the same locations under similar conditions each time.</p>
                </div>
            </div>

            <section class="measurement-howto measurement-guide-card">
                <div class="measurement-guide-head">
                    <div>
                        <span class="eyebrow">MEASUREMENT GUIDE</span>
                        <h3>How to Measure</h3>
                    </div>
                    <div class="measurement-view-tabs" role="tablist" aria-label="Measurement body view">
                        <button class="measurement-view-tab active" type="button" data-measurement-view="front" aria-selected="true">Front</button>
                        <button class="measurement-view-tab" type="button" data-measurement-view="back" aria-selected="false">Back</button>
                    </div>
                </div>

                <div class="measurement-guide-layout">
                    <div class="measurement-figure measurement-figure-modern" data-measurement-figure="front" role="img" aria-label="Front body measurement guide">
                        ${renderFrontBodyFigure()}
                    </div>

                    <div class="measurement-figure measurement-figure-modern" data-measurement-figure="back" role="img" aria-label="Back body measurement guide" hidden>
                        ${renderBackBodyFigure()}
                    </div>

                    <aside class="measurement-instructions measurement-instructions-modern">
                        <h3>Tips</h3>
                        <div class="measurement-tip"><strong>1</strong><span>Use a flexible measuring tape.</span></div>
                        <div class="measurement-tip"><strong>2</strong><span>Measure on bare skin or thin clothing.</span></div>
                        <div class="measurement-tip"><strong>3</strong><span>Keep the tape level and snug, not tight.</span></div>
                        <div class="measurement-tip"><strong>4</strong><span>Stand naturally with feet about shoulder-width apart.</span></div>
                        <div class="measurement-tip"><strong>5</strong><span>Take measurements at a consistent time of day.</span></div>
                    </aside>
                </div>

                <div class="measurement-location-key">
                    <div><span>1</span><p><b>Neck</b><small>Below the Adam's apple / same point each time.</small></p></div>
                    <div><span>2</span><p><b>Shoulders</b><small>Around the widest part of the shoulders.</small></p></div>
                    <div><span>3</span><p><b>Chest</b><small>Level around the fullest part of the chest.</small></p></div>
                    <div><span>4</span><p><b>Upper arm</b><small>Around the fullest point of the upper arm.</small></p></div>
                    <div><span>5</span><p><b>Waist</b><small>Use the narrowest reproducible point of the torso.</small></p></div>
                    <div><span>6</span><p><b>Hips</b><small>Around the widest point of the glutes.</small></p></div>
                    <div><span>7</span><p><b>Forearm</b><small>Around the widest point of the forearm.</small></p></div>
                    <div><span>8</span><p><b>Thigh</b><small>Around the widest point of the thigh.</small></p></div>
                    <div><span>9</span><p><b>Calf</b><small>Around the widest point of the calf.</small></p></div>
                </div>
            </section>

            <section class="measurement-entry-card">
                <div class="measurement-entry-heading">
                    <div>
                        <span class="eyebrow">LOG MEASUREMENTS</span>
                        <h3>New Entry</h3>
                    </div>
                </div>

                <label for="measurement-date">Date</label>
                <input id="measurement-date" type="date">

                <div class="measurement-input-grid">
                    ${MEASUREMENT_FIELDS.map(([key, label]) => `
                        <label>${label} (in)
                            <input data-measurement-field="${key}" type="number" min="0" step="0.1" inputmode="decimal" placeholder="--">
                        </label>
                    `).join("")}
                </div>

                <button id="save-measurements-btn" class="primary-btn" type="button">Save Measurements</button>
                <p id="measurements-message" class="workout-message" aria-live="polite"></p>
            </section>

            <section class="measurement-summary-grid">
                <div class="metric-card"><div><h3>Latest Entry</h3><p id="measurements-latest-date">--</p></div></div>
                <div class="metric-card"><div><h3>Net Change Since Start</h3><p id="measurements-total-change">--</p></div></div>
            </section>

            <section class="measurement-progress-card">
                <div class="chart-header">
                    <div><h3>Measurement Progress</h3><p>Directional change only — larger or smaller is not automatically better.</p></div>
                </div>
                <div class="measurement-progress-table">
                    <div class="measurement-progress-header"><span>Area</span><span>Current</span><span>Last Change</span><span>Since Start</span></div>
                    <div id="measurement-progress-body"></div>
                </div>
            </section>

            <section class="weight-history measurement-history">
                <h3>Measurement History</h3>
                <div class="weight-table measurement-history-table">
                    <div class="weight-table-header"><span>Date</span><span>Recorded</span><span>Net vs Start</span><span>Actions</span></div>
                    <div id="measurement-history-list"><p class="empty-state">No measurement entries yet.</p></div>
                </div>
            </section>
        </section>
    `;
}

function renderFrontBodyFigure() {
    return renderBodyFigure("front");
}

function renderBackBodyFigure() {
    return renderBodyFigure("back");
}

function renderBodyFigure(view) {
    const isBack = view === "back";
    return `
        <svg class="anatomy-svg anatomy-silhouette" viewBox="0 0 430 720" aria-hidden="true">
            <g class="anatomy-outline">
                <ellipse cx="215" cy="52" rx="25" ry="32"/>
                <path d="M197 78c1 14 0 23-5 29-5 6-12 9-19 12"/>
                <path d="M233 78c-1 14 0 23 5 29 5 6 12 9 19 12"/>

                <path d="M173 119c-23 6-34 17-36 38-2 20-1 34-3 48"/>
                <path d="M257 119c23 6 34 17 36 38 2 20 1 34 3 48"/>
                <path d="M173 119c-12 17-20 37-19 61 1 27 9 49 17 69 7 18 10 37 8 59l-4 51c-1 29 2 55 9 78"/>
                <path d="M257 119c12 17 20 37 19 61-1 27-9 49-17 69-7 18-10 37-8 59l4 51c1 29-2 55-9 78"/>
                <path d="M175 359c-1 26 2 51 9 78-8 34-12 69-11 104 1 28 4 52-3 78-5 18-6 38-7 58l-5 10c-3 7 4 11 18 11h12c7 0 10-4 8-10l-2-10 3-39c8-34 10-65 8-97-2-38 0-74 10-111"/>
                <path d="M255 359c1 26-2 51-9 78 8 34 12 69 11 104-1 28-4 52 3 78 5 18 6 38 7 58l5 10c3 7-4 11-18 11h-12c-7 0-10-4-8-10l2-10-3-39c-8-34-10-65-8-97 2-38 0-74-10-111"/>
                <path d="M184 437c9-10 19-15 31-15s22 5 31 15"/>

                <path d="M137 157c-8 13-9 28-10 48-1 25-5 45-13 66l-17 48c-5 16-9 27-17 36l-22 20"/>
                <path d="M154 181c-2 17-5 33-10 50l-13 45-15 54c-3 12-7 22-14 29l-18 18"/>
                <path d="M293 157c8 13 9 28 10 48 1 25 5 45 13 66l17 48c5 16 9 27 17 36l22 20"/>
                <path d="M276 181c2 17 5 33 10 50l13 45 15 54c3 12 7 22 14 29l18 18"/>

                <path d="M58 375l-19 14-10 7c-3 2-1 6 2 5l14-7-10 15c-2 4 2 6 5 3l11-14-6 20c-1 4 4 5 6 1l7-19-2 20c0 4 5 4 6 0l3-20 3 17c1 4 6 3 6-1l-1-25 11-14"/>
                <path d="M372 375l19 14 10 7c3 2 1 6-2 5l-14-7 10 15c2 4-2 6-5 3l-11-14 6 20c1 4-4 5-6 1l-7-19 2 20c0 4-5 4-6 0l-3-20-3 17c-1 4-6 3-6-1l1-25-11-14"/>

                ${isBack ? `
                    <path class="anatomy-landmark" d="M215 119v211"/>
                    <path class="anatomy-landmark" d="M174 151c13 5 26 15 41 28M256 151c-13 5-26 15-41 28"/>
                    <path class="anatomy-landmark" d="M181 367c8-11 19-17 34-17s26 6 34 17"/>
                    <path class="anatomy-landmark" d="M215 350v68"/>
                ` : `
                    <path class="anatomy-landmark" d="M190 137c8 5 16 7 25 7s17-2 25-7"/>
                    <path class="anatomy-landmark" d="M215 173v115"/>
                    <circle class="anatomy-landmark anatomy-navel" cx="215" cy="292" r="2"/>
                `}
            </g>

            ${measurementBand(190, 103, 50, 1, "Neck", isBack ? "left" : "right")}
            ${measurementBand(157, 132, 116, 2, "Shoulders", isBack ? "right" : "left")}
            ${isBack ? "" : measurementBand(165, 180, 100, 3, "Chest", "right")}
            ${measurementBand(128, 216, 31, 4, "Upper arm", "left")}
            ${measurementBand(177, 300, 76, 5, "Waist", "right")}
            ${measurementBand(168, 365, 94, 6, "Hips", "left")}
            ${measurementBand(101, 302, 30, 7, "Forearm", "left")}
            ${measurementBand(176, 466, 38, 8, "Thigh", "right")}
            ${measurementBand(169, 585, 35, 9, "Calf", "right")}
        </svg>
    `;
}

function measurementBand(x, y, width, number, label, side) {
    const lineEnd = side === "left" ? 52 : 378;
    const labelX = side === "left" ? 18 : 412;
    const anchor = side === "left" ? "start" : "end";
    const startX = side === "left" ? x : x + width;
    return `
        <g class="anatomy-measure">
            <line class="body-band" x1="${x}" y1="${y}" x2="${x + width}" y2="${y}"/>
            <line class="leader-line" x1="${startX}" y1="${y}" x2="${lineEnd}" y2="${y}"/>
            <circle class="measure-number" cx="${side === "left" ? 36 : 394}" cy="${y}" r="13"/>
            <text class="measure-number-text" x="${side === "left" ? 36 : 394}" y="${y + 4}" text-anchor="middle">${number}</text>
            <text class="measure-label" x="${labelX}" y="${y - 19}" text-anchor="${anchor}">${label}</text>
        </g>
    `;
}

export function initializeMeasurementsTracker() {
    const dateInput = document.getElementById("measurement-date");
    if (dateInput) dateInput.value = getLocalDate();

    document.querySelectorAll("[data-measurement-view]").forEach(button => {
        button.addEventListener("click", () => setMeasurementView(button.dataset.measurementView));
    });

    document.getElementById("save-measurements-btn")?.addEventListener("click", saveEntry);
    updateDisplay();
}

function setMeasurementView(view) {
    document.querySelectorAll("[data-measurement-view]").forEach(button => {
        const active = button.dataset.measurementView === view;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll("[data-measurement-figure]").forEach(figure => {
        figure.hidden = figure.dataset.measurementFigure !== view;
    });
}

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getEntries() {
    try {
        const parsed = JSON.parse(localStorage.getItem(MEASUREMENTS_STORAGE_KEY) || "[]");
        return Array.isArray(parsed)
            ? parsed.filter(entry => entry?.date).sort((a, b) => a.date.localeCompare(b.date))
            : [];
    }
    catch {
        return [];
    }
}

function saveEntries(entries) {
    localStorage.setItem(MEASUREMENTS_STORAGE_KEY, JSON.stringify(entries));
}

function saveEntry() {
    const date = document.getElementById("measurement-date")?.value;
    if (!date) return;

    const values = {};
    document.querySelectorAll("[data-measurement-field]").forEach(input => {
        const value = Number(input.value);
        if (Number.isFinite(value) && value > 0) values[input.dataset.measurementField] = Number(value.toFixed(1));
    });

    if (!Object.keys(values).length) {
        setMessage("Enter at least one measurement.");
        return;
    }

    let entries = getEntries();
    if (editingDate && editingDate !== date) entries = entries.filter(entry => entry.date !== editingDate);

    const existing = entries.find(entry => entry.date === date);
    if (existing) Object.assign(existing, values);
    else entries.push({ date, ...values });

    entries.sort((a, b) => a.date.localeCompare(b.date));
    saveEntries(entries);
    editingDate = null;

    document.querySelectorAll("[data-measurement-field]").forEach(input => input.value = "");
    const button = document.getElementById("save-measurements-btn");
    if (button) button.textContent = "Save Measurements";
    setMessage("Measurements saved.");
    updateDisplay();
}

function updateDisplay() {
    const entries = getEntries();
    const latest = entries[entries.length - 1];
    const first = entries[0];
    const previous = entries.length > 1 ? entries[entries.length - 2] : null;

    const latestDate = document.getElementById("measurements-latest-date");
    if (latestDate) latestDate.textContent = latest ? formatDate(latest.date) : "--";

    const totalChange = document.getElementById("measurements-total-change");
    if (totalChange) {
        const net = latest && first ? getNetChange(latest, first) : null;
        totalChange.textContent = net === null ? "--" : `${formatSigned(net)} in`;
        totalChange.className = net > 0 ? "measurement-up" : net < 0 ? "measurement-down" : "measurement-flat";
    }

    renderProgress(latest, previous, first);
    renderHistory(entries, first);
}

function renderProgress(latest, previous, first) {
    const body = document.getElementById("measurement-progress-body");
    if (!body) return;

    if (!latest) {
        body.innerHTML = '<p class="empty-state">Add a measurement entry to see changes.</p>';
        return;
    }

    body.innerHTML = MEASUREMENT_FIELDS.map(([key, label]) => {
        const current = numeric(latest[key]);
        const last = current !== null && previous ? difference(current, numeric(previous[key])) : null;
        const sinceStart = current !== null && first ? difference(current, numeric(first[key])) : null;

        return `<div class="measurement-progress-row">
            <strong>${label}</strong>
            <span>${current === null ? "--" : `${current.toFixed(1)} in`}</span>
            <span class="${changeClass(last)}">${formatChange(last)}</span>
            <span class="${changeClass(sinceStart)}">${formatChange(sinceStart)}</span>
        </div>`;
    }).join("");
}

function renderHistory(entries, first) {
    const list = document.getElementById("measurement-history-list");
    if (!list) return;

    if (!entries.length) {
        list.innerHTML = '<p class="empty-state">No measurement entries yet.</p>';
        return;
    }

    list.innerHTML = [...entries].reverse().map(entry => {
        const count = MEASUREMENT_FIELDS.filter(([key]) => numeric(entry[key]) !== null).length;
        const net = first ? getNetChange(entry, first) : 0;
        return `<div class="weight-history-row measurement-history-row">
            <span>${formatDate(entry.date)}</span>
            <span>${count} areas</span>
            <span class="${changeClass(net)}">${formatChange(net)}</span>
            <span class="measurement-row-actions">
                <button class="secondary-btn" type="button" data-edit-measurement="${entry.date}">Edit</button>
                <button class="secondary-btn" type="button" data-delete-measurement="${entry.date}">Delete</button>
            </span>
        </div>`;
    }).join("");

    list.querySelectorAll("[data-edit-measurement]").forEach(button => button.addEventListener("click", () => editEntry(button.dataset.editMeasurement)));
    list.querySelectorAll("[data-delete-measurement]").forEach(button => button.addEventListener("click", () => deleteEntry(button.dataset.deleteMeasurement)));
}

function editEntry(date) {
    const entry = getEntries().find(item => item.date === date);
    if (!entry) return;

    editingDate = date;
    const dateInput = document.getElementById("measurement-date");
    if (dateInput) dateInput.value = date;

    document.querySelectorAll("[data-measurement-field]").forEach(input => {
        const value = numeric(entry[input.dataset.measurementField]);
        input.value = value === null ? "" : value;
    });

    const button = document.getElementById("save-measurements-btn");
    if (button) button.textContent = "Update Measurements";
    document.querySelector(".measurement-entry-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteEntry(date) {
    if (!window.confirm(`Delete measurements from ${formatDate(date)}?`)) return;
    saveEntries(getEntries().filter(entry => entry.date !== date));
    if (editingDate === date) editingDate = null;
    updateDisplay();
}

function numeric(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function difference(current, reference) {
    return current === null || reference === null ? null : Number((current - reference).toFixed(1));
}

function getNetChange(current, reference) {
    let total = 0;
    let used = 0;
    MEASUREMENT_FIELDS.forEach(([key]) => {
        const change = difference(numeric(current[key]), numeric(reference[key]));
        if (change !== null) {
            total += change;
            used++;
        }
    });
    return used ? Number(total.toFixed(1)) : null;
}

function formatChange(value) {
    if (value === null) return "--";
    if (Math.abs(value) < 0.05) return "→ 0.0 in";
    return `${value > 0 ? "↑" : "↓"} ${Math.abs(value).toFixed(1)} in`;
}

function formatSigned(value) {
    if (Math.abs(value) < 0.05) return "0.0";
    return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}

function changeClass(value) {
    if (value === null || Math.abs(value) < 0.05) return "measurement-flat";
    return value > 0 ? "measurement-up" : "measurement-down";
}

function formatDate(date) {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function setMessage(message) {
    const element = document.getElementById("measurements-message");
    if (element) element.textContent = message;
}
