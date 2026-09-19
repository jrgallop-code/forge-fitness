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
                    <p class="section-description">Log a check-in and compare each body area over time.</p>
                </div>
            </div>

            <section class="measurement-entry-card">
                <div class="measurement-entry-heading">
                    <div>
                        <span class="eyebrow">NEW CHECK-IN</span>
                        <h3>Log measurements</h3>
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

                <details class="measurement-help">
                    <summary>How to measure consistently</summary>
                    <div class="measurement-help-grid">
                        <p><strong>Neck</strong><span>Below the Adam's apple at the same point each time.</span></p>
                        <p><strong>Shoulders</strong><span>Around the widest part of the shoulders.</span></p>
                        <p><strong>Chest</strong><span>Level around the fullest part of the chest.</span></p>
                        <p><strong>Upper arm</strong><span>Around the fullest point with the arm relaxed.</span></p>
                        <p><strong>Waist</strong><span>At the narrowest reproducible point of the torso.</span></p>
                        <p><strong>Hips</strong><span>Around the widest point of the glutes.</span></p>
                        <p><strong>Forearm</strong><span>Around the widest point of the forearm.</span></p>
                        <p><strong>Thigh</strong><span>Around the widest point of the thigh.</span></p>
                        <p><strong>Calf</strong><span>Around the widest point of the calf.</span></p>
                    </div>
                    <p class="measurement-help-note">Use a flexible tape on bare skin or thin clothing. Keep it level and snug, and check in under similar conditions each time.</p>
                </details>
            </section>

            <section class="measurement-summary-grid">
                <div class="metric-card"><div><h3>Latest Entry</h3><p id="measurements-latest-date">--</p></div></div>
                <div class="metric-card"><div><h3>Areas Tracked</h3><p id="measurements-areas-count">--</p></div></div>
            </section>

            <section class="measurement-progress-card">
                <div class="chart-header">
                    <div><span class="eyebrow">PROGRESS</span><h3>Latest measurements</h3><p>Changes are shown by area—up or down is not automatically better.</p></div>
                </div>
                <div class="measurement-progress-list">
                    <div class="measurement-progress-header"><span>Area</span><span>Current</span><span>Last Change</span><span>Since Start</span></div>
                    <div id="measurement-progress-body"></div>
                </div>
            </section>

            <section class="measurement-progress-card measurement-history">
                <div class="chart-header">
                    <div><span class="eyebrow">HISTORY</span><h3>Check-ins</h3><p>Open a check-in to review every recorded value.</p></div>
                </div>
                <div class="measurement-history-list">
                    <div id="measurement-history-list"><p class="empty-state">No measurement entries yet.</p></div>
                </div>
            </section>
        </section>
    `;
}

export function initializeMeasurementsTracker() {
    const dateInput = document.getElementById("measurement-date");
    if (dateInput) dateInput.value = getLocalDate();

    document.getElementById("save-measurements-btn")?.addEventListener("click", saveEntry);
    updateDisplay();
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

    const areasCount = document.getElementById("measurements-areas-count");
    if (areasCount) {
        const count = latest ? MEASUREMENT_FIELDS.filter(([key]) => numeric(latest[key]) !== null).length : 0;
        areasCount.textContent = latest ? `${count} of ${MEASUREMENT_FIELDS.length}` : "--";
    }

    renderProgress(latest, previous, first);
    renderHistory(entries);
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
            <span class="measurement-current"><small>Current</small>${current === null ? "--" : `${current.toFixed(1)} in`}</span>
            <span class="measurement-change ${changeClass(last)}"><small>Last</small>${formatChange(last)}</span>
            <span class="measurement-change ${changeClass(sinceStart)}"><small>Start</small>${formatChange(sinceStart)}</span>
        </div>`;
    }).join("");
}

function renderHistory(entries) {
    const list = document.getElementById("measurement-history-list");
    if (!list) return;

    if (!entries.length) {
        list.innerHTML = '<p class="empty-state">No measurement entries yet.</p>';
        return;
    }

    list.innerHTML = [...entries].reverse().map(entry => {
        const count = MEASUREMENT_FIELDS.filter(([key]) => numeric(entry[key]) !== null).length;
        const values = MEASUREMENT_FIELDS
            .filter(([key]) => numeric(entry[key]) !== null)
            .map(([key, label]) => `<div class="measurement-history-value"><small>${label}</small><strong>${numeric(entry[key]).toFixed(1)} in</strong></div>`)
            .join("");
        return `<details class="measurement-history-row">
            <summary><span><strong>${formatDate(entry.date)}</strong><small>${count} area${count === 1 ? "" : "s"} recorded</small></span><span class="measurement-history-chevron" aria-hidden="true">⌄</span></summary>
            <div class="measurement-history-values">${values}</div>
            <div class="measurement-row-actions">
                <button class="secondary-btn" type="button" data-edit-measurement="${entry.date}">Edit</button>
                <button class="secondary-btn" type="button" data-delete-measurement="${entry.date}">Delete</button>
            </div>
        </details>`;
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

function formatChange(value) {
    if (value === null) return "--";
    if (Math.abs(value) < 0.05) return "→ 0.0 in";
    return `${value > 0 ? "↑" : "↓"} ${Math.abs(value).toFixed(1)} in`;
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
