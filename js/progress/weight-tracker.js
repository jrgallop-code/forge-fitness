import {
    getNutritionGoal
}
from "../nutrition/nutrition-storage.js?v=weight-goals-1";

import {
    GOAL_PRESETS
}
from "../nutrition/tdee-calculator.js?v=weight-goals-1";

const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";

const GOAL_WEIGHT_STORAGE_KEY =
    "level_up_goal_weight";

const LEGACY_REFERENCE_WEIGHT_STORAGE_KEY =
    "forge_reference_weight";

let editingWeightDate =
    null;


export function initializeWeightTracker() {
    const saveButton =
        document.getElementById(
            "save-weight-btn"
        );

    const dateInput =
        document.getElementById(
            "weight-date"
        );

    prepareGoalWeightControls();

    const goalButton =
        document.getElementById(
            "save-reference-weight-btn"
        );

    const goalInput =
        document.getElementById(
            "reference-weight"
        );

    if (dateInput) {
        dateInput.value =
            getTodayLocalDate();
    }

    saveButton?.addEventListener(
        "click",
        saveWeightEntry
    );

    goalButton?.addEventListener(
        "click",
        saveGoalWeight
    );

    migrateLegacyReferenceWeight();

    const goalWeight =
        getGoalWeight();

    if (
        goalInput &&
        goalWeight !== null
    ) {
        goalInput.value =
            goalWeight;
    }

    ensureWeightRateSummary();
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


function prepareGoalWeightControls() {
    const label =
        document.querySelector(
            'label[for="reference-weight"]'
        );

    const input =
        document.getElementById(
            "reference-weight"
        );

    const button =
        document.getElementById(
            "save-reference-weight-btn"
        );

    if (label) {
        label.textContent =
            "Goal Weight (lb)";
    }

    if (input) {
        input.placeholder =
            "Enter goal weight";
        input.setAttribute(
            "aria-label",
            "Goal Weight (lb)"
        );
    }

    if (button) {
        button.textContent =
            "Save Goal Weight";
    }
}


function migrateLegacyReferenceWeight() {
    if (
        localStorage.getItem(
            GOAL_WEIGHT_STORAGE_KEY
        ) !== null
    ) {
        return;
    }

    const legacyValue =
        Number(
            localStorage.getItem(
                LEGACY_REFERENCE_WEIGHT_STORAGE_KEY
            )
        );

    if (
        Number.isFinite(legacyValue) &&
        legacyValue > 0
    ) {
        localStorage.setItem(
            GOAL_WEIGHT_STORAGE_KEY,
            String(legacyValue)
        );
    }

    localStorage.removeItem(
        LEGACY_REFERENCE_WEIGHT_STORAGE_KEY
    );
}


function getGoalWeight() {
    const value =
        Number(
            localStorage.getItem(
                GOAL_WEIGHT_STORAGE_KEY
            )
        );

    return Number.isFinite(value) &&
        value > 0
            ? value
            : null;
}


function saveGoalWeight() {
    const input =
        document.getElementById(
            "reference-weight"
        );

    const value =
        Number(
            input?.value
        );

    if (!Number.isFinite(value) || value <= 0) {
        localStorage.removeItem(
            GOAL_WEIGHT_STORAGE_KEY
        );

        if (input) {
            input.value = "";
        }
    }
    else {
        localStorage.setItem(
            GOAL_WEIGHT_STORAGE_KEY,
            String(value)
        );
    }

    window.dispatchEvent(
        new CustomEvent(
            "levelup:nutrition-updated"
        )
    );

    updateWeightDisplay();
}


function getWeightEntries() {
    const stored =
        localStorage.getItem(
            WEIGHT_STORAGE_KEY
        );

    if (!stored) {
        return [];
    }

    try {
        const entries =
            JSON.parse(stored);

        if (!Array.isArray(entries)) {
            return [];
        }

        return entries
            .map(entry => ({
                ...entry,
                weight:
                    Number(
                        entry.weight
                    )
            }))
            .filter(entry =>
                entry.date &&
                Number.isFinite(
                    entry.weight
                ) &&
                entry.weight > 0
            )
            .sort(
                (a, b) =>
                    new Date(a.date) -
                    new Date(b.date)
            );
    }
    catch {
        return [];
    }
}


function saveWeightEntries(entries) {
    localStorage.setItem(
        WEIGHT_STORAGE_KEY,
        JSON.stringify(entries)
    );
}


function saveWeightEntry() {
    const dateElement =
        document.getElementById(
            "weight-date"
        );

    const weightElement =
        document.getElementById(
            "daily-weight"
        );

    const date =
        dateElement?.value;

    const weight =
        Number(
            weightElement?.value
        );

    if (
        !date ||
        !weight ||
        weight <= 0
    ) {
        alert(
            "Please enter a valid date and weight."
        );
        return;
    }

    const entries =
        getWeightEntries();

    if (
        editingWeightDate &&
        editingWeightDate !== date
    ) {
        const originalIndex =
            entries.findIndex(
                entry =>
                    entry.date ===
                    editingWeightDate
            );

        if (originalIndex >= 0) {
            entries.splice(
                originalIndex,
                1
            );
        }
    }

    const existing =
        entries.find(
            entry =>
                entry.date === date
        );

    if (existing) {
        existing.weight =
            weight;
    }
    else {
        entries.push({
            date,
            weight
        });
    }

    entries.sort(
        (a, b) =>
            new Date(a.date) -
            new Date(b.date)
    );

    saveWeightEntries(
        entries
    );

    if (weightElement) {
        weightElement.value = "";
    }

    editingWeightDate =
        null;

    const saveButton =
        document.getElementById(
            "save-weight-btn"
        );

    if (saveButton) {
        saveButton.textContent =
            "Save Weight";
    }

    updateWeightDisplay();
}


function calculateMovingAverage(entries) {
    return entries.map(entry => {
        const currentDate =
            new Date(
                `${entry.date}T00:00:00`
            );

        const windowStart =
            new Date(
                currentDate
            );

        windowStart.setDate(
            windowStart.getDate() - 6
        );

        const windowEntries =
            entries.filter(item => {
                const itemDate =
                    new Date(
                        `${item.date}T00:00:00`
                    );

                return itemDate >= windowStart &&
                    itemDate <= currentDate;
            });

        const average =
            windowEntries.reduce(
                (total, item) =>
                    total + item.weight,
                0
            ) /
            windowEntries.length;

        return {
            date: entry.date,
            weight:
                Number(
                    average.toFixed(2)
                )
        };
    });
}


function calculateActualWeeklyChange(movingAverage) {
    if (movingAverage.length < 2) {
        return null;
    }

    const latest =
        movingAverage[
            movingAverage.length - 1
        ];

    const latestDate =
        new Date(
            `${latest.date}T00:00:00`
        );

    let comparison =
        null;

    for (
        let index = movingAverage.length - 2;
        index >= 0;
        index--
    ) {
        const candidate =
            movingAverage[index];

        const candidateDate =
            new Date(
                `${candidate.date}T00:00:00`
            );

        const days =
            (
                latestDate -
                candidateDate
            ) /
            86400000;

        if (days >= 7) {
            comparison = {
                ...candidate,
                days
            };
            break;
        }
    }

    if (!comparison) {
        return null;
    }

    return (
        (
            latest.weight -
            comparison.weight
        ) /
        comparison.days
    ) * 7;
}


function getGoalWeeklyChange() {
    const savedGoal =
        getNutritionGoal();

    const preset =
        savedGoal?.goalId
            ? GOAL_PRESETS[
                savedGoal.goalId
            ]
            : null;

    if (!preset) {
        return null;
    }

    if (
        Number.isFinite(
            Number(
                preset.weeklyChangeLb
            )
        )
    ) {
        return Number(
            preset.weeklyChangeLb
        );
    }

    if (
        Number.isFinite(
            Number(
                preset.dailyCalorieAdjustment
            )
        )
    ) {
        return (
            Number(
                preset.dailyCalorieAdjustment
            ) *
            7
        ) /
        3500;
    }

    return null;
}


function ensureWeightRateSummary() {
    if (
        document.getElementById(
            "actual-weekly-weight-change"
        )
    ) {
        return;
    }

    const summary =
        document.querySelector(
            "#weight-progress .weight-summary"
        );

    if (!summary) {
        return;
    }

    summary.insertAdjacentHTML(
        "beforeend",
        `
            <div class="metric-card">
                <div>
                    <h3>Actual Weekly Change</h3>
                    <p id="actual-weekly-weight-change">--</p>
                </div>
            </div>

            <div class="metric-card">
                <div>
                    <h3>Goal Weekly Change</h3>
                    <p id="goal-weekly-weight-change">--</p>
                </div>
            </div>
        `
    );
}


function updateWeightDisplay() {
    const entries =
        getWeightEntries();

    const movingAverage =
        calculateMovingAverage(
            entries
        );

    updateSummary(
        entries,
        movingAverage
    );

    updateHistory(
        entries,
        movingAverage
    );

    drawWeightChart(
        entries,
        [],
        getGoalWeight()
    );
}


function updateSummary(
    entries,
    movingAverage
) {
    const latestElement =
        document.getElementById(
            "latest-weight"
        );

    const actualElement =
        document.getElementById(
            "actual-weekly-weight-change"
        );

    const goalElement =
        document.getElementById(
            "goal-weekly-weight-change"
        );

    if (latestElement) {
        latestElement.textContent =
            entries.length
                ? `${entries[
                    entries.length - 1
                ].weight.toFixed(1)} lb`
                : "--";
    }

    const actualWeeklyChange =
        calculateActualWeeklyChange(
            movingAverage
        );

    if (actualElement) {
        actualElement.textContent =
            formatWeeklyChange(
                actualWeeklyChange
            );
    }

    const goalWeeklyChange =
        getGoalWeeklyChange();

    if (goalElement) {
        goalElement.textContent =
            formatWeeklyChange(
                goalWeeklyChange
            );
    }
}


function updateHistory(
    entries,
    movingAverage
) {
    const container =
        document.getElementById(
            "weight-history-list"
        );

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

    const rows =
        entries.map(
            (entry, index) => ({
                date: entry.date,
                weight: entry.weight,
                average:
                    movingAverage[index]
                        ?.weight ??
                    null,
                averageChange:
                    index > 0 &&
                    movingAverage[index]
                        ?.weight !== undefined &&
                    movingAverage[index - 1]
                        ?.weight !== undefined
                        ? movingAverage[index].weight -
                            movingAverage[index - 1].weight
                        : null,
                weightChange:
                    index > 0
                        ? entry.weight -
                            entries[index - 1].weight
                        : null
            })
        );

    container.innerHTML =
        [...rows]
            .reverse()
            .map(
                row => `
                    <div class="weight-table-row">
                        <span>
                            ${formatDate(row.date)}
                        </span>

                        <strong>
                            ${formatDirectionalWeight(
                                row.weight,
                                row.weightChange
                            )} lb
                        </strong>

                        <span>
                            ${row.average === null
                                ? "--"
                                : `${formatDirectionalWeight(
                                    row.average,
                                    row.averageChange
                                )} lb`}
                        </span>

                        <div class="weight-entry-actions">
                            <button
                                class="edit-weight-entry"
                                type="button"
                                data-date="${row.date}"
                            >
                                Edit
                            </button>

                            <button
                                class="remove-weight-entry"
                                type="button"
                                data-date="${row.date}"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                `
            )
            .join("");

    container
        .querySelectorAll(
            ".edit-weight-entry"
        )
        .forEach(button =>
            button.addEventListener(
                "click",
                () =>
                    editWeightEntry(
                        button.dataset.date
                    )
            )
        );

    container
        .querySelectorAll(
            ".remove-weight-entry"
        )
        .forEach(button =>
            button.addEventListener(
                "click",
                () =>
                    removeWeightEntry(
                        button.dataset.date
                    )
            )
        );
}


function initializeProgressTabs() {
    const weightButton =
        document.getElementById(
            "weight-tab"
        );

    const liftingButton =
        document.getElementById(
            "lifting-tab"
        );

    const sleepButton =
        document.getElementById(
            "sleep-tab"
        );

    const weightSection =
        document.getElementById(
            "weight-progress"
        );

    const liftingSection =
        document.getElementById(
            "lifting-progress"
        );

    const sleepSection =
        document.getElementById(
            "sleep-progress"
        );

    weightButton?.addEventListener(
        "click",
        () => {
            if (
                !weightSection ||
                !liftingSection ||
                !sleepSection
            ) {
                return;
            }

            weightSection.hidden = false;
            liftingSection.hidden = true;
            sleepSection.hidden = true;

            weightButton.classList.add(
                "active"
            );
            liftingButton?.classList.remove(
                "active"
            );
            sleepButton?.classList.remove(
                "active"
            );

            requestAnimationFrame(
                updateWeightDisplay
            );
        }
    );

    liftingButton?.addEventListener(
        "click",
        () => {
            if (
                !weightSection ||
                !liftingSection ||
                !sleepSection
            ) {
                return;
            }

            weightSection.hidden = true;
            liftingSection.hidden = false;
            sleepSection.hidden = true;

            liftingButton.classList.add(
                "active"
            );
            weightButton?.classList.remove(
                "active"
            );
            sleepButton?.classList.remove(
                "active"
            );
        }
    );

    sleepButton?.addEventListener(
        "click",
        () => {
            if (
                !weightSection ||
                !liftingSection ||
                !sleepSection
            ) {
                return;
            }

            weightSection.hidden = true;
            liftingSection.hidden = true;
            sleepSection.hidden = false;

            sleepButton.classList.add(
                "active"
            );
            weightButton?.classList.remove(
                "active"
            );
            liftingButton?.classList.remove(
                "active"
            );
        }
    );
}


function drawWeightChart(
    entries,
    regression,
    goalWeight
) {
    const canvas =
        document.getElementById(
            "weight-chart"
        );

    if (!canvas) {
        return;
    }

    const context =
        canvas.getContext(
            "2d"
        );

    const width =
        canvas.clientWidth ||
        800;

    const height =
        400;

    const scale =
        window.devicePixelRatio ||
        1;

    canvas.width =
        width * scale;
    canvas.height =
        height * scale;

    context.setTransform(
        scale,
        0,
        0,
        scale,
        0,
        0
    );

    context.clearRect(
        0,
        0,
        width,
        height
    );

    if (entries.length < 2) {
        context.fillStyle =
            "#a0a0a0";
        context.font =
            "14px Arial";
        context.fillText(
            "Add at least two entries to display the graph.",
            20,
            45
        );
        return;
    }

    const padding = {
        left: 58,
        right: 22,
        top: 42,
        bottom: 48
    };

    const chartWidth =
        width -
        padding.left -
        padding.right;

    const chartHeight =
        height -
        padding.top -
        padding.bottom;

    const values = [
        ...entries.map(
            item => item.weight
        ),
        ...regression.map(
            item => item.weight
        ),
        ...(goalWeight === null
            ? []
            : [goalWeight])
    ];

    const minimum =
        Math.min(...values) - 1;

    const maximum =
        Math.max(...values) + 1;

    const firstTime =
        new Date(
            `${entries[0].date}T00:00:00`
        ).getTime();

    const lastTime =
        new Date(
            `${entries[
                entries.length - 1
            ].date}T00:00:00`
        ).getTime();

    const elapsed =
        Math.max(
            1,
            lastTime - firstTime
        );

    const xPosition =
        date =>
            padding.left +
            (
                new Date(
                    `${date}T00:00:00`
                ).getTime() - firstTime
            ) /
            elapsed *
            chartWidth;

    const yPosition =
        weight =>
            padding.top +
            (
                maximum - weight
            ) /
            (
                maximum - minimum
            ) *
            chartHeight;

    context.strokeStyle =
        "#303037";
    context.lineWidth = 1;

    for (
        let index = 0;
        index <= 4;
        index++
    ) {
        const y =
            padding.top +
            chartHeight * index / 4;

        context.beginPath();
        context.moveTo(
            padding.left,
            y
        );
        context.lineTo(
            width - padding.right,
            y
        );
        context.stroke();

        const value =
            maximum -
            (
                maximum - minimum
            ) *
            index / 4;

        context.fillStyle =
            "#a0a0a8";
        context.font =
            "11px Arial";
        context.textAlign =
            "right";
        context.fillText(
            value.toFixed(1),
            padding.left - 8,
            y + 4
        );
    }

    context.fillStyle =
        "#a0a0a8";
    context.font =
        "11px Arial";
    context.textAlign =
        "left";
    context.fillText(
        formatDate(entries[0].date),
        padding.left,
        height - 16
    );

    context.textAlign =
        "right";
    context.fillText(
        formatDate(
            entries[
                entries.length - 1
            ].date
        ),
        width - padding.right,
        height - 16
    );

    context.strokeStyle =
        "#777780";
    context.lineWidth = 1.5;
    context.beginPath();

    entries.forEach(
        (entry, index) => {
            const x =
                xPosition(entry.date);
            const y =
                yPosition(entry.weight);

            if (index === 0) {
                context.moveTo(x, y);
            }
            else {
                context.lineTo(x, y);
            }
        }
    );

    context.stroke();
    context.fillStyle =
        "#ffffff";

    entries.forEach(entry => {
        context.beginPath();
        context.arc(
            xPosition(entry.date),
            yPosition(entry.weight),
            4,
            0,
            Math.PI * 2
        );
        context.fill();
    });

    if (regression.length >= 2) {
        context.save();
        context.strokeStyle =
            "#7dd3fc";
        context.lineWidth = 2.5;
        context.setLineDash([
            8,
            5
        ]);
        context.beginPath();

        regression.forEach(
            (entry, index) => {
                const x =
                    xPosition(entry.date);
                const y =
                    yPosition(entry.weight);

                if (index === 0) {
                    context.moveTo(x, y);
                }
                else {
                    context.lineTo(x, y);
                }
            }
        );

        context.stroke();
        context.restore();
    }

    if (goalWeight !== null) {
        context.save();
        context.strokeStyle =
            "#facc15";
        context.lineWidth = 2;
        context.setLineDash([
            4,
            4
        ]);
        context.beginPath();
        context.moveTo(
            padding.left,
            yPosition(goalWeight)
        );
        context.lineTo(
            width - padding.right,
            yPosition(goalWeight)
        );
        context.stroke();
        context.restore();
    }

    const legend = [
        {
            color: "#ffffff",
            label: "Measurements",
            dashed: false
        },
        ...(goalWeight === null
            ? []
            : [{
                color: "#facc15",
                label: `Goal ${goalWeight.toFixed(1)} lb`,
                dashed: true
            }])
    ];

    let legendX =
        padding.left;

    legend.forEach(item => {
        context.save();
        context.strokeStyle =
            item.color;
        context.lineWidth = 2;

        if (item.dashed) {
            context.setLineDash([
                5,
                4
            ]);
        }

        context.beginPath();
        context.moveTo(
            legendX,
            18
        );
        context.lineTo(
            legendX + 18,
            18
        );
        context.stroke();
        context.restore();

        context.fillStyle =
            "#b9b9c1";
        context.font =
            "10px Arial";
        context.textAlign =
            "left";
        context.fillText(
            item.label,
            legendX + 23,
            21
        );

        legendX +=
            item.label.length * 6 + 48;
    });
}


function editWeightEntry(date) {
    const entry =
        getWeightEntries()
            .find(item =>
                item.date === date
            );

    if (!entry) {
        return;
    }

    const dateInput =
        document.getElementById(
            "weight-date"
        );

    const weightInput =
        document.getElementById(
            "daily-weight"
        );

    if (dateInput) {
        dateInput.value =
            entry.date;
    }

    if (weightInput) {
        weightInput.value =
            entry.weight;
        weightInput.focus();
    }

    editingWeightDate =
        entry.date;

    const saveButton =
        document.getElementById(
            "save-weight-btn"
        );

    if (saveButton) {
        saveButton.textContent =
            "Update Entry";
    }

    document
        .querySelector(
            ".weight-entry-card"
        )
        ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
}


function removeWeightEntry(date) {
    const entry =
        getWeightEntries()
            .find(item =>
                item.date === date
            );

    if (!entry) {
        return;
    }

    const confirmed =
        window.confirm(
            `Remove the weight entry for ${formatDate(date)}? This cannot be undone.`
        );

    if (!confirmed) {
        return;
    }

    const remaining =
        getWeightEntries()
            .filter(item =>
                item.date !== date
            );

    saveWeightEntries(
        remaining
    );

    if (
        editingWeightDate === date
    ) {
        editingWeightDate = null;

        const weightInput =
            document.getElementById(
                "daily-weight"
            );

        if (weightInput) {
            weightInput.value = "";
        }

        const saveButton =
            document.getElementById(
                "save-weight-btn"
            );

        if (saveButton) {
            saveButton.textContent =
                "Save Weight";
        }
    }

    updateWeightDisplay();
}


function formatDirectionalWeight(
    value,
    change
) {
    if (
        change === null ||
        change === undefined
    ) {
        return value.toFixed(1);
    }

    const arrow =
        change > 0
            ? "↑"
            : change < 0
                ? "↓"
                : "→";

    return `${arrow} ${value.toFixed(1)}`;
}


function formatWeeklyChange(value) {
    if (!Number.isFinite(value)) {
        return "--";
    }

    if (Math.abs(value) < 0.005) {
        return "→ 0.00 lb/wk";
    }

    const arrow =
        value > 0
            ? "↑"
            : "↓";

    return `${arrow} ${Math.abs(value).toFixed(2)} lb/wk`;
}


function formatDate(date) {
    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric"
        }
    );
}
