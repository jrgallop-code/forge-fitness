import {
    getCurrentPhase,
    getPhaseForDate
}
from "../goals/phase-manager.js";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";


export function initializeWeightTracker() {

    const saveButton = document.getElementById("save-weight-btn");
    const demoButton = document.getElementById("load-demo-weight-btn");
    const dateInput = document.getElementById("weight-date");

    if (dateInput && !dateInput.value) {
        dateInput.value = getTodayLocalDate();
    }

    saveButton?.addEventListener("click", saveWeightEntry);
    demoButton?.addEventListener("click", loadDemoData);

    initializeProgressTabs();
    updateWeightDisplay();
}


function getTodayLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}


function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") {
        return null;
    }

    const date = String(entry.date || "").trim();
    const weight = Number(entry.weight);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return null;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
        return null;
    }

    return {
        date,
        weight
    };
}


function getWeightEntries() {
    const stored = localStorage.getItem(WEIGHT_STORAGE_KEY);

    if (!stored) {
        return [];
    }

    try {
        const parsed = JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map(normalizeEntry)
            .filter(Boolean)
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    catch (error) {
        console.error("Could not read weight entries:", error);
        return [];
    }
}


function saveWeightEntries(entries) {
    const cleanEntries = entries
        .map(normalizeEntry)
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));

    localStorage.setItem(
        WEIGHT_STORAGE_KEY,
        JSON.stringify(cleanEntries)
    );
}


function saveWeightEntry() {
    const dateElement = document.getElementById("weight-date");
    const weightElement = document.getElementById("daily-weight");

    const date = dateElement?.value?.trim();
    const weight = Number(weightElement?.value);

    if (!date || !Number.isFinite(weight) || weight <= 0) {
        alert("Please enter a valid date and weight.");
        return;
    }

    const entries = getWeightEntries();
    const existing = entries.find(entry => entry.date === date);

    if (existing) {
        existing.weight = weight;
    }
    else {
        entries.push({
            date,
            weight
        });
    }

    saveWeightEntries(entries);

    if (weightElement) {
        weightElement.value = "";
    }

    updateWeightDisplay();
}


function loadDemoData() {
    const demoEntries = [
        { date: "2026-06-20", weight: 164.8 },
        { date: "2026-06-21", weight: 165.2 },
        { date: "2026-06-22", weight: 164.5 },
        { date: "2026-06-23", weight: 164.9 },
        { date: "2026-06-24", weight: 164.1 },
        { date: "2026-06-25", weight: 164.4 },
        { date: "2026-06-26", weight: 163.9 },
        { date: "2026-06-27", weight: 164.3 },
        { date: "2026-06-28", weight: 163.7 },
        { date: "2026-06-29", weight: 164.0 },
        { date: "2026-06-30", weight: 163.5 },
        { date: "2026-07-01", weight: 163.8 },
        { date: "2026-07-02", weight: 163.2 },
        { date: "2026-07-03", weight: 163.6 },
        { date: "2026-07-04", weight: 163.0 },
        { date: "2026-07-05", weight: 163.4 },
        { date: "2026-07-06", weight: 162.9 },
        { date: "2026-07-07", weight: 163.1 },
        { date: "2026-07-08", weight: 162.6 },
        { date: "2026-07-09", weight: 163.0 },
        { date: "2026-07-10", weight: 162.5 },
        { date: "2026-07-11", weight: 162.7 },
        { date: "2026-07-12", weight: 162.2 },
        { date: "2026-07-13", weight: 162.6 },
        { date: "2026-07-14", weight: 162.1 },
        { date: "2026-07-15", weight: 162.4 },
        { date: "2026-07-16", weight: 161.9 },
        { date: "2026-07-17", weight: 162.2 },
        { date: "2026-07-18", weight: 161.7 },
        { date: "2026-07-19", weight: 162.0 },
        { date: "2026-07-20", weight: 161.5 },
        { date: "2026-07-21", weight: 161.8 },
        { date: "2026-07-22", weight: 161.3 },
        { date: "2026-07-23", weight: 161.7 },
        { date: "2026-07-24", weight: 161.1 },
        { date: "2026-07-25", weight: 161.4 },
        { date: "2026-07-26", weight: 160.9 },
        { date: "2026-07-27", weight: 161.2 },
        { date: "2026-07-28", weight: 160.7 },
        { date: "2026-07-29", weight: 161.0 },
        { date: "2026-07-30", weight: 160.5 },
        { date: "2026-07-31", weight: 160.8 },
        { date: "2026-08-01", weight: 160.3 },
        { date: "2026-08-02", weight: 160.6 },
        { date: "2026-08-03", weight: 160.1 },
        { date: "2026-08-04", weight: 160.4 },
        { date: "2026-08-05", weight: 159.9 },
        { date: "2026-08-06", weight: 160.2 },
        { date: "2026-08-07", weight: 159.7 }
    ];

    saveWeightEntries(demoEntries);
    updateWeightDisplay();
}


function calculateMovingAverage(entries, windowSize = 7) {
    return entries.map((entry, index) => {
        const startIndex = Math.max(0, index - windowSize + 1);
        const windowEntries = entries.slice(startIndex, index + 1);

        const total = windowEntries.reduce(
            (sum, current) => sum + current.weight,
            0
        );

        return {
            date: entry.date,
            weight: total / windowEntries.length
        };
    });
}


function daysBetween(firstDate, secondDate) {
    const first = new Date(`${firstDate}T00:00:00`);
    const second = new Date(`${secondDate}T00:00:00`);
    return (second - first) / 86400000;
}


function calculateWeeklyRates(trend) {
    return trend.map((current, index) => {
        let previous = null;

        for (let i = index - 1; i >= 0; i--) {
            const days = daysBetween(trend[i].date, current.date);

            if (days >= 7) {
                previous = trend[i];
                break;
            }
        }

        if (!previous) {
            return {
                date: current.date,
                rate: null
            };
        }

        const elapsedDays = daysBetween(previous.date, current.date);

        if (elapsedDays <= 0) {
            return {
                date: current.date,
                rate: null
            };
        }

        return {
            date: current.date,
            rate: ((current.weight - previous.weight) / elapsedDays) * 7
        };
    });
}


function calculateOverallRate(trend) {
    if (trend.length < 2) {
        return null;
    }

    const startIndex = trend.length >= 7 ? 6 : 0;
    const first = trend[startIndex];
    const last = trend[trend.length - 1];
    const elapsedDays = daysBetween(first.date, last.date);

    if (elapsedDays <= 0) {
        return null;
    }

    return ((last.weight - first.weight) / elapsedDays) * 7;
}


function updateWeightDisplay() {
    const entries = getWeightEntries();
    const trend = calculateMovingAverage(entries);
    const weeklyRates = calculateWeeklyRates(trend);

    // Keep each display section independent. If one section ever fails,
    // the user's newly entered data can still appear in the others.
    try {
        updateSummary(entries, trend, weeklyRates);
    }
    catch (error) {
        console.error("Weight summary failed to update:", error);
    }

    try {
        updateHistory(entries, trend, weeklyRates);
    }
    catch (error) {
        console.error("Weight history failed to update:", error);
    }

    try {
        drawWeightChart(entries, trend);
    }
    catch (error) {
        console.error("Weight chart failed to update:", error);
    }
}


function updateSummary(entries, trend, weeklyRates) {
    const latestElement = document.getElementById("latest-weight");
    const averageElement = document.getElementById("weight-trend");
    const weeklyElement = document.getElementById("current-weekly-rate");
    const overallElement = document.getElementById("overall-weight-rate");

    if (!entries.length) {
        if (latestElement) latestElement.textContent = "--";
        if (averageElement) averageElement.textContent = "--";
        if (weeklyElement) {
            weeklyElement.textContent = "--";
            weeklyElement.className = "";
        }
        if (overallElement) {
            overallElement.textContent = "--";
            overallElement.className = "";
        }
        return;
    }

    const latest = entries[entries.length - 1];
    const latestAverage = trend[trend.length - 1];

    if (latestElement) {
        latestElement.textContent = `${latest.weight.toFixed(1)} lb`;
    }

    if (averageElement) {
        averageElement.textContent = `${latestAverage.weight.toFixed(1)} lb`;
    }

    const latestRate = [...weeklyRates]
        .reverse()
        .find(item => Number.isFinite(item.rate));

    if (weeklyElement) {
        if (latestRate) {
            weeklyElement.textContent = formatRate(latestRate.rate);
            weeklyElement.className = getRateClass(
                latestRate.rate,
                latestRate.date
            );
        }
        else {
            weeklyElement.textContent = "--";
            weeklyElement.className = "";
        }
    }

    const overallRate = calculateOverallRate(trend);

    if (overallElement) {
        if (Number.isFinite(overallRate)) {
            overallElement.textContent = formatRate(overallRate);
            overallElement.className = getRateClass(
                overallRate,
                latest.date
            );
        }
        else {
            overallElement.textContent = "--";
            overallElement.className = "";
        }
    }
}


function updateHistory(entries, trend, weeklyRates) {
    const container = document.getElementById("weight-history-list");

    if (!container) {
        return;
    }

    if (!entries.length) {
        container.innerHTML = `
            <p class="empty-state">
                No weight entries yet.
            </p>
        `;
        return;
    }

    const rows = entries.map((entry, index) => ({
        date: entry.date,
        weight: entry.weight,
        average: trend[index]?.weight,
        weeklyRate: weeklyRates[index]?.rate
    }));

    container.innerHTML = [...rows]
        .reverse()
        .map(row => `
            <div class="weight-table-row">
                <span>${formatDate(row.date)}</span>
                <strong>${row.weight.toFixed(1)}</strong>
                <span>
                    ${Number.isFinite(row.average)
                        ? row.average.toFixed(1)
                        : "--"}
                </span>
                <span class="${Number.isFinite(row.weeklyRate)
                    ? getRateClass(row.weeklyRate, row.date)
                    : ""}">
                    ${Number.isFinite(row.weeklyRate)
                        ? formatRate(row.weeklyRate)
                        : "--"}
                </span>
            </div>
        `)
        .join("");
}


function formatRate(rate) {
    if (!Number.isFinite(rate)) {
        return "--";
    }

    if (rate < 0) {
        return `↓ ${Math.abs(rate).toFixed(2)} lb/wk`;
    }

    if (rate > 0) {
        return `↑ ${rate.toFixed(2)} lb/wk`;
    }

    return "→ 0.00 lb/wk";
}


function getRateClass(rate, date = null) {
    if (!Number.isFinite(rate)) {
        return "";
    }

    const phase = date
        ? getPhaseForDate(date)
        : getCurrentPhase();

    const phaseType = phase?.type || getCurrentPhase()?.type || "cut";

    if (Math.abs(rate) < 0.005) {
        return "rate-neutral";
    }

    if (phaseType === "bulk") {
        return rate > 0 ? "rate-negative" : "rate-positive";
    }

    if (phaseType === "maintain") {
        return "rate-neutral";
    }

    // Cut/default: downward weight trend is favourable.
    return rate < 0 ? "rate-negative" : "rate-positive";
}


function drawWeightChart(entries, trend) {
    const canvas = document.getElementById("weight-chart");

    if (!canvas) {
        return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
        return;
    }

    const width = Math.max(canvas.clientWidth || 800, 280);
    const height = 400;
    const scale = window.devicePixelRatio || 1;

    canvas.width = width * scale;
    canvas.height = height * scale;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);

    if (!entries.length) {
        context.fillStyle = "#a0a0a0";
        context.font = "16px Arial";
        context.fillText(
            "Add a weigh-in to display your progress.",
            20,
            50
        );
        return;
    }

    const values = [
        ...entries.map(item => item.weight),
        ...trend.map(item => item.weight)
    ];

    let minimum = Math.min(...values);
    let maximum = Math.max(...values);

    // Give a flat/single-point chart enough vertical room to be visible.
    if (maximum === minimum) {
        maximum += 1;
        minimum -= 1;
    }
    else {
        minimum -= 1;
        maximum += 1;
    }

    const padding = {
        left: 55,
        right: 20,
        top: 30,
        bottom: 45
    };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    function xPosition(index) {
        if (entries.length === 1) {
            return padding.left + chartWidth / 2;
        }

        return padding.left +
            (index / (entries.length - 1)) * chartWidth;
    }

    function yPosition(weight) {
        return padding.top +
            ((maximum - weight) / (maximum - minimum)) * chartHeight;
    }

    context.strokeStyle = "#333";
    context.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i / 4);
        const labelValue = maximum - ((maximum - minimum) * i / 4);

        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();

        context.fillStyle = "#a0a0a0";
        context.font = "12px Arial";
        context.textAlign = "right";
        context.fillText(
            labelValue.toFixed(1),
            padding.left - 8,
            y + 4
        );
    }

    // Raw daily weight line.
    if (entries.length > 1) {
        context.strokeStyle = "#777";
        context.lineWidth = 1.5;
        context.beginPath();

        entries.forEach((entry, index) => {
            const x = xPosition(index);
            const y = yPosition(entry.weight);

            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });

        context.stroke();
    }

    // Raw daily weight points. This also makes a single weigh-in visible.
    context.fillStyle = "#ffffff";

    entries.forEach((entry, index) => {
        context.beginPath();
        context.arc(
            xPosition(index),
            yPosition(entry.weight),
            4,
            0,
            Math.PI * 2
        );
        context.fill();
    });

    // 7-day moving average.
    if (trend.length > 1) {
        context.strokeStyle = "#e10600";
        context.lineWidth = 3;
        context.beginPath();

        trend.forEach((entry, index) => {
            const x = xPosition(index);
            const y = yPosition(entry.weight);

            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });

        context.stroke();
    }

    // Simple date labels at the beginning and end.
    context.fillStyle = "#a0a0a0";
    context.font = "12px Arial";

    context.textAlign = "left";
    context.fillText(
        formatDate(entries[0].date),
        padding.left,
        height - 15
    );

    if (entries.length > 1) {
        context.textAlign = "right";
        context.fillText(
            formatDate(entries[entries.length - 1].date),
            width - padding.right,
            height - 15
        );
    }
}


function initializeProgressTabs() {
    const weightButton = document.getElementById("weight-tab");
    const liftingButton = document.getElementById("lifting-tab");
    const weightSection = document.getElementById("weight-progress");
    const liftingSection = document.getElementById("lifting-progress");

    weightButton?.addEventListener("click", () => {
        if (!weightSection || !liftingSection) {
            return;
        }

        weightSection.hidden = false;
        liftingSection.hidden = true;
        weightButton.classList.add("active");
        liftingButton?.classList.remove("active");

        // Redraw when the weight tab becomes visible so canvas sizing is correct.
        requestAnimationFrame(updateWeightDisplay);
    });

    liftingButton?.addEventListener("click", () => {
        if (!weightSection || !liftingSection) {
            return;
        }

        weightSection.hidden = true;
        liftingSection.hidden = false;
        liftingButton.classList.add("active");
        weightButton?.classList.remove("active");
    });
}


function formatDate(date) {
    if (!date) {
        return "--";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric"
        }
    );
}
