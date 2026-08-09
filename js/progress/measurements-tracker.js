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
                    <p class="section-description">Track circumference measurements consistently over time. Use the same location and tape tension each time.</p>
                </div>
            </div>

            <section class="measurement-howto">
                <div class="measurement-figure" role="img" aria-label="Body measurement guide showing neck, shoulders, chest, waist, hips, upper arm, forearm, thigh and calf locations">
                    <svg viewBox="0 0 300 520" aria-hidden="true">
                        <g class="body-outline">
                            <circle cx="150" cy="48" r="28"/>
                            <path d="M128 78c-5 17-19 30-35 40-15 10-23 27-20 45l14 88-20 86 28 8 25-73 9 83-9 122h26l14-116 14 116h26l-9-122 9-83 25 73 28-8-20-86 14-88c3-18-5-35-20-45-16-10-30-23-35-40z"/>
                        </g>
                        <g class="measure-line"><line x1="119" y1="82" x2="181" y2="82"/><text x="190" y="86">Neck</text></g>
                        <g class="measure-line"><line x1="86" y1="119" x2="214" y2="119"/><text x="222" y="123">Shoulders</text></g>
                        <g class="measure-line"><line x1="95" y1="153" x2="205" y2="153"/><text x="213" y="157">Chest</text></g>
                        <g class="measure-line"><line x1="109" y1="202" x2="191" y2="202"/><text x="199" y="206">Waist</text></g>
                        <g class="measure-line"><line x1="101" y1="244" x2="199" y2="244"/><text x="207" y="248">Hips</text></g>
                        <g class="measure-line"><line x1="73" y1="178" x2="112" y2="178"/><text x="16" y="182">Upper arm</text></g>
                        <g class="measure-line"><line x1="62" y1="235" x2="98" y2="235"/><text x="15" y="239">Forearm</text></g>
                        <g class="measure-line"><line x1="118" y1="323" x2="147" y2="323"/><text x="60" y="327">Thigh</text></g>
                        <g class="measure-line"><line x1="121" y1="419" x2="144" y2="419"/><text x="68" y="423">Calf</text></g>
                    </svg>
                </div>

                <div class="measurement-instructions">
                    <h3>How to measure</h3>
                    <div class="measurement-tip"><strong>1</strong><span>Use a flexible tape and keep it level around the body.</span></div>
                    <div class="measurement-tip"><strong>2</strong><span>Measure the same location each time, ideally under similar conditions.</span></div>
                    <div class="measurement-tip"><strong>3</strong><span>Keep the tape snug against the skin without compressing it.</span></div>
                    <div class="measurement-tip"><strong>4</strong><span>For arms, thighs and calves, use the same side each time.</span></div>
                    <p class="measurement-detail"><b>Waist:</b> measure around your natural waist or another clearly defined point you can reproduce. <b>Chest:</b> tape level around the fullest part of the chest. <b>Hips:</b> around the widest point. <b>Limbs:</b> around the fullest point of the selected area.</p>
                </div>
            </section>

            <section class="measurement-entry-card">
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
