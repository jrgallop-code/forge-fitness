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
    return `
        <svg class="anatomy-svg" viewBox="0 0 430 720" aria-hidden="true">
            <g class="anatomy-outline">
                <ellipse cx="215" cy="59" rx="29" ry="37"/>
                <path d="M199 94c-1 12-4 20-11 26M231 94c1 12 4 20 11 26"/>
                <path d="M188 120c-11 7-24 10-38 14-25 7-38 20-42 43-4 25 1 54 7 79l14 64c3 12 1 26-2 39l-10 42c-3 13 3 23 14 25 11 2 19-6 22-18l13-59c3-16 3-31-1-47l-11-49c-2-12-2-25 1-38"/>
                <path d="M242 120c11 7 24 10 38 14 25 7 38 20 42 43 4 25-1 54-7 79l-14 64c-3 12-1 26 2 39l10 42c3 13-3 23-14 25-11 2-19-6-22-18l-13-59c-3-16-3-31 1-47l11-49c2-12 2-25-1-38"/>
                <path d="M188 120c-12 13-24 31-27 54-5 37 7 76 17 105 5 15 5 34-1 50-7 18-12 39-9 60 3 20 12 36 24 47"/>
                <path d="M242 120c12 13 24 31 27 54 5 37-7 76-17 105-5 15-5 34 1 50 7 18 12 39 9 60-3 20-12 36-24 47"/>
                <path d="M192 436c-10 29-14 63-13 99 1 39 5 74 1 105l-5 47c-1 12 7 20 18 20 11 0 18-7 19-19l3-93"/>
                <path d="M238 436c10 29 14 63 13 99-1 39-5 74-1 105l5 47c1 12-7 20-18 20-11 0-18-7-19-19l-3-93"/>
                <path d="M192 436c7 9 15 14 23 14s16-5 23-14"/>
                <path d="M179 535c10 6 21 9 33 9M251 535c-10 6-21 9-33 9"/>
                <path d="M180 640c9 4 19 6 31 6M250 640c-9 4-19 6-31 6"/>
                <path d="M188 121c7 13 16 19 27 19s20-6 27-19"/>
                <path d="M169 159c15-9 30-13 46-13s31 4 46 13"/>
                <path d="M167 183c15-8 31-12 48-12s33 4 48 12"/>
                <path d="M170 204c13 18 28 27 45 27s32-9 45-27"/>
                <path d="M215 171v118M186 236c8 7 18 10 29 10s21-3 29-10"/>
                <path d="M187 266c8 7 17 10 28 10s20-3 28-10M188 294c8 7 17 10 27 10s19-3 27-10"/>
                <path d="M178 334c10 10 23 15 37 15s27-5 37-15"/>
                <path d="M171 373c12 18 27 27 44 27s32-9 44-27"/>
                <path d="M195 450c-7 27-9 53-7 80M235 450c7 27 9 53 7 80"/>
                <path d="M187 553c10 7 19 10 28 10s18-3 28-10"/>
            </g>

            ${measurementBand(190, 116, 50, 1, "Neck", "right")}
            ${measurementBand(150, 150, 130, 2, "Shoulders", "left")}
            ${measurementBand(164, 190, 102, 3, "Chest", "right")}
            ${measurementBand(119, 225, 34, 4, "Upper arm", "left")}
            ${measurementBand(178, 300, 74, 5, "Waist", "right")}
            ${measurementBand(169, 356, 92, 6, "Hips", "left")}
            ${measurementBand(105, 321, 31, 7, "Forearm", "left")}
            ${measurementBand(178, 461, 42, 8, "Thigh", "right")}
            ${measurementBand(180, 585, 36, 9, "Calf", "right")}
        </svg>
    `;
}

function renderBackBodyFigure() {
    return `
        <svg class="anatomy-svg" viewBox="0 0 430 720" aria-hidden="true">
            <g class="anatomy-outline">
                <ellipse cx="215" cy="59" rx="29" ry="37"/>
                <path d="M199 94c-1 12-4 20-11 26M231 94c1 12 4 20 11 26"/>
                <path d="M188 120c-11 7-24 10-38 14-25 7-38 20-42 43-4 25 1 54 7 79l14 64c3 12 1 26-2 39l-10 42c-3 13 3 23 14 25 11 2 19-6 22-18l13-59c3-16 3-31-1-47l-11-49c-2-12-2-25 1-38"/>
                <path d="M242 120c11 7 24 10 38 14 25 7 38 20 42 43 4 25-1 54-7 79l-14 64c-3 12-1 26 2 39l10 42c3 13-3 23-14 25-11 2-19-6-22-18l-13-59c-3-16-3-31 1-47l11-49c2-12 2-25-1-38"/>
                <path d="M188 120c-12 13-24 31-27 54-5 37 7 76 17 105 5 15 5 34-1 50-7 18-12 39-9 60 3 20 12 36 24 47"/>
                <path d="M242 120c12 13 24 31 27 54 5 37-7 76-17 105-5 15-5 34 1 50 7 18 12 39 9 60-3 20-12 36-24 47"/>
                <path d="M192 436c-10 29-14 63-13 99 1 39 5 74 1 105l-5 47c-1 12 7 20 18 20 11 0 18-7 19-19l3-93"/>
                <path d="M238 436c10 29 14 63 13 99-1 39-5 74-1 105l5 47c1 12-7 20-18 20-11 0-18-7-19-19l-3-93"/>
                <path d="M192 436c7 9 15 14 23 14s16-5 23-14"/>
                <path d="M179 535c10 6 21 9 33 9M251 535c-10 6-21 9-33 9"/>
                <path d="M180 640c9 4 19 6 31 6M250 640c-9 4-19 6-31 6"/>
                <path d="M188 121c7 13 16 19 27 19s20-6 27-19"/>
                <path d="M215 140v190"/>
                <path d="M168 166c12-12 27-18 47-19M262 166c-12-12-27-18-47-19"/>
                <path d="M170 184c13 9 27 19 45 29M260 184c-13 9-27 19-45 29"/>
                <path d="M176 221c12 13 25 20 39 20s27-7 39-20"/>
                <path d="M184 270c8 8 18 12 31 12s23-4 31-12"/>
                <path d="M180 330c9 11 21 16 35 16s26-5 35-16"/>
                <path d="M171 373c11-17 26-25 44-25s33 8 44 25"/>
                <path d="M173 382c10 20 24 31 42 31s32-11 42-31"/>
                <path d="M215 351v74"/>
                <path d="M195 450c-7 27-9 53-7 80M235 450c7 27 9 53 7 80"/>
                <path d="M187 553c10 7 19 10 28 10s18-3 28-10"/>
            </g>

            ${measurementBand(190, 116, 50, 1, "Neck", "left")}
            ${measurementBand(150, 150, 130, 2, "Shoulders", "right")}
            ${measurementBand(119, 225, 34, 4, "Upper arm", "left")}
            ${measurementBand(178, 300, 74, 5, "Waist", "right")}
            ${measurementBand(169, 356, 92, 6, "Hips", "left")}
            ${measurementBand(105, 321, 31, 7, "Forearm", "left")}
            ${measurementBand(178, 461, 42, 8, "Thigh", "right")}
            ${measurementBand(180, 585, 36, 9, "Calf", "right")}
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
