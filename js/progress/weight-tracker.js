
import {
    getCurrentPhase,
    getPhaseForDate
}
from "../goals/phase-manager.js";

const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";


const WEIGHT_RESET_KEY =
    "level_up_weight_reset_2026_08_07";


let editingWeightDate =
    null;


export function initializeWeightTracker() {

    clearExistingWeightDataOnce();


    const saveButton =
        document.getElementById(
            "save-weight-btn"
        );

    const dateInput =
        document.getElementById(
            "weight-date"
        );


    if (dateInput) {

        dateInput.value =
            new Date()
                .toISOString()
                .split("T")[0];

    }


    saveButton?.addEventListener(
        "click",
        saveWeightEntry
    );


    initializeProgressTabs();

    updateWeightDisplay();

}



function clearExistingWeightDataOnce() {

    if (
        localStorage.getItem(
            WEIGHT_RESET_KEY
        )
    ) {

        return;

    }


    localStorage.removeItem(
        WEIGHT_STORAGE_KEY
    );


    localStorage.setItem(
        WEIGHT_RESET_KEY,
        "complete"
    );

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


        return entries.sort(
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
        editingWeightDate !==
            date
    ) {

        const originalIndex =
            entries.findIndex(
                entry =>
                    entry.date ===
                    editingWeightDate
            );


        if (
            originalIndex >=
            0
        ) {

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



function calculateMovingAverage(
    entries,
    windowSize = 7
) {

    return entries.map(
        (entry, index) => {

            if (
                index <
                windowSize - 1
            ) {

                return {
                    date:
                        entry.date,

                    weight:
                        null
                };

            }


            const windowEntries =
                entries.slice(
                    index -
                    windowSize +
                    1,
                    index +
                    1
                );


            const total =
                windowEntries.reduce(
                    (sum, current) =>
                        sum +
                        current.weight,
                    0
                );


            return {

                date:
                    entry.date,

                weight:
                    Number(
                        (
                            total /
                            windowSize
                        )
                        .toFixed(2)
                    )

            };

        }
    );

}


function calculateLinearRegression(
    entries
) {

    if (entries.length < 2) {

        return {
            points: [],
            slopePerDay: null
        };

    }


    const firstTime =
        new Date(
            `${entries[0].date}T00:00:00`
        )
        .getTime();


    const values =
        entries.map(entry => ({

            x:
                (
                    new Date(
                        `${entry.date}T00:00:00`
                    )
                    .getTime() -
                    firstTime
                ) /
                86400000,

            y:
                entry.weight,

            date:
                entry.date

        }));


    const count =
        values.length;


    const meanX =
        values.reduce(
            (sum, item) =>
                sum +
                item.x,
            0
        ) /
        count;


    const meanY =
        values.reduce(
            (sum, item) =>
                sum +
                item.y,
            0
        ) /
        count;


    const numerator =
        values.reduce(
            (sum, item) =>
                sum +
                (
                    item.x -
                    meanX
                ) *
                (
                    item.y -
                    meanY
                ),
            0
        );


    const denominator =
        values.reduce(
            (sum, item) =>
                sum +
                (
                    item.x -
                    meanX
                ) **
                2,
            0
        );


    if (!denominator) {

        return {
            points: [],
            slopePerDay: null
        };

    }


    const slopePerDay =
        numerator /
        denominator;


    const intercept =
        meanY -
        slopePerDay *
        meanX;


    return {

        slopePerDay,

        points:
            values.map(item => ({

                date:
                    item.date,

                weight:
                    intercept +
                    slopePerDay *
                    item.x

            }))

    };

}



function daysBetween(
    firstDate,
    secondDate
) {

    const first =
        new Date(
            `${firstDate}T00:00:00`
        );


    const second =
        new Date(
            `${secondDate}T00:00:00`
        );


    return (
        second - first
    ) /
    86400000;

}



function calculateWeeklyRates(
    trend
) {

    return trend.map(
        (current, index) => {

            if (
                current.weight ===
                null
            ) {

                return {
                    date:
                        current.date,

                    rate:
                        null
                };

            }


            let previous =
                null;


            for (
                let i = index - 1;
                i >= 0;
                i--
            ) {

                if (
                    trend[i].weight ===
                    null
                ) {
                    continue;
                }


                const days =
                    daysBetween(
                        trend[i].date,
                        current.date
                    );


                if (days >= 7) {

                    previous =
                        trend[i];

                    break;

                }

            }


            if (!previous) {

                return {
                    date:
                        current.date,

                    rate:
                        null
                };

            }


            const elapsedDays =
                daysBetween(
                    previous.date,
                    current.date
                );


            const weightChange =
                current.weight -
                previous.weight;


            const weeklyRate =
                weightChange /
                elapsedDays *
                7;


            return {

                date:
                    current.date,

                rate:
                    Number(
                        weeklyRate.toFixed(2)
                    )

            };

        }
    );

}



function calculateOverallRate(
    entries
) {

    if (entries.length < 2) {
        return null;
    }


    const elapsedDays =
        daysBetween(
            entries[0].date,
            entries[
                entries.length - 1
            ].date
        );


    if (elapsedDays < 7) {
        return null;
    }


    const regression =
        calculateLinearRegression(
            entries
        );


    return regression.slopePerDay ===
        null
            ? null
            : regression.slopePerDay *
                7;

}



function updateWeightDisplay() {

    const entries =
        getWeightEntries();


    const trend =
        calculateMovingAverage(
            entries
        );


    const regression =
        calculateLinearRegression(
            entries
        );


    const weeklyRates =
        calculateWeeklyRates(
            trend
        );


    updateSummary(
        entries,
        trend,
        weeklyRates
    );


    updateHistory(
        entries,
        trend,
        weeklyRates
    );


    drawWeightChart(
        entries,
        trend,
        regression.points
    );

}



function updateSummary(
    entries,
    trend,
    weeklyRates
) {

    const latestElement =
        document.getElementById(
            "latest-weight"
        );


    const trendElement =
        document.getElementById(
            "weight-trend"
        );


    const weeklyElement =
        document.getElementById(
            "current-weekly-rate"
        );


    const overallElement =
        document.getElementById(
            "overall-weight-rate"
        );


    if (!entries.length) {

        if (latestElement) {
            latestElement.textContent = "--";
        }

        if (trendElement) {
            trendElement.textContent = "--";
        }

        if (weeklyElement) {
            weeklyElement.textContent = "--";
        }

        if (overallElement) {
            overallElement.textContent = "--";
        }

        return;

    }


    const latest =
        entries[
            entries.length - 1
        ];


    const latestTrend =
        [...trend]
            .reverse()
            .find(item =>
                item.weight !==
                null
            ) ||
        null;


    if (latestElement) {

        latestElement.textContent =
            `${latest.weight.toFixed(
                1
            )} lb`;

    }


    if (trendElement) {

        trendElement.textContent =
            latestTrend
                ? `${latestTrend.weight.toFixed(
                    1
                )} lb`
                : "--";

    }


    const latestRate =
        [...weeklyRates]
            .reverse()
            .find(
                item =>
                    item.rate !== null
            );


   if (weeklyElement) {

    if (latestRate) {

        weeklyElement.textContent =
            formatRate(
                latestRate.rate
            );


        weeklyElement.className =
            getRateClass(
                latestRate.rate
            );

    }

    else {

        weeklyElement.textContent =
            "--";

        weeklyElement.className =
            "";

    }

}

    const overallRate =
        calculateOverallRate(
            entries
        );


    if (overallElement) {

    if (overallRate !== null) {

        overallElement.textContent =
            formatRate(
                overallRate
            );


        overallElement.className =
            getRateClass(
                overallRate
            );

    }

    else {

        overallElement.textContent =
            "--";

        overallElement.className =
            "";

    }

}
}



function updateHistory(
    entries,
    trend,
    weeklyRates
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

                date:
                    entry.date,

                weight:
                    entry.weight,

                trend:
                    trend[index]
                        ?.weight,

                weeklyRate:
                    weeklyRates[index]
                        ?.rate,

                weightChange:
                    index > 0
                        ? entry.weight -
                            entries[index - 1].weight
                        : null,

                trendChange:
                    index > 0 &&
                    trend[index - 1]
                        ? trend[index].weight -
                            trend[index - 1].weight
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
                            )}
                        </strong>

                        <span>
                            ${
                                row.trend !== undefined &&
                                row.trend !== null
                                    ? formatDirectionalWeight(
                                        row.trend,
                                        row.trendChange
                                    )
                                    : "--"
                            }
                        </span>
<span
    class="${
        row.weeklyRate !== null &&
        row.weeklyRate !== undefined
            ? getRateClass(
                row.weeklyRate
            )
            : ""
    }"
>
    ${
        row.weeklyRate !== null &&
        row.weeklyRate !== undefined
            ? formatRate(
                row.weeklyRate
            )
            : "--"
    }
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



function formatRate(rate) {

    if (!Number.isFinite(rate)) {
        return "--";
    }


    const arrow =
        rate > 0
            ? "↑"
            : rate < 0
                ? "↓"
                : "→";


    const prefix =
        rate > 0
            ? "+"
            : "";


    return (
        `${arrow} ${prefix}${rate.toFixed(2)} lb/wk`
    );

}

function getRateClass(rate) {

    if (!Number.isFinite(rate)) {
        return "";
    }


    if (rate < 0) {
        return "rate-negative";
    }


    if (rate > 0) {
        return "rate-positive";
    }


    return "rate-neutral";

}


function drawWeightChart(
    entries,
    trend,
    regression
) {

    const canvas =
        document.getElementById(
            "weight-chart"
        );


    if (!canvas) {
        return;
    }


    const context =
        canvas.getContext("2d");


    const width =
        canvas.clientWidth || 800;


    const height =
        400;


    const scale =
        window.devicePixelRatio || 1;


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
            "16px Arial";


        context.fillText(
            "Add at least two weigh-ins to display the trend.",
            20,
            50
        );


        return;

    }


    const values = [

        ...entries.map(
            item =>
                item.weight
        ),

        ...trend
            .filter(item =>
                item.weight !==
                null
            )
            .map(item =>
                item.weight
            ),

        ...regression.map(
            item =>
                item.weight
        )

    ];


    const minimum =
        Math.min(...values) - 1;


    const maximum =
        Math.max(...values) + 1;


    const padding = {

        left: 55,
        right: 20,
        top: 30,
        bottom: 45

    };


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    function xPosition(index) {

        return (
            padding.left +
            index /
            (
                entries.length - 1
            ) *
            chartWidth
        );

    }


    function yPosition(weight) {

        return (
            padding.top +
            (
                maximum - weight
            ) /
            (
                maximum - minimum
            ) *
            chartHeight
        );

    }


    for (
        let index = 0;
        index <
            entries.length - 1;
        index++
    ) {

        const date =
            new Date(
                `${entries[index].date}T00:00:00`
            );


        const weekNumber =
            Math.floor(
                index /
                7
            );


        if (
            weekNumber % 2 ===
            0
        ) {

            const startX =
                xPosition(
                    index
                );


            const endX =
                xPosition(
                    index + 1
                );


            context.fillStyle =
                "rgba(255,255,255,.035)";


            context.fillRect(
                startX,
                padding.top,
                endX -
                startX,
                chartHeight
            );

        }


        if (
            date.getDay() ===
            1
        ) {

            context.strokeStyle =
                "#252525";


            context.beginPath();


            context.moveTo(
                xPosition(index),
                padding.top
            );


            context.lineTo(
                xPosition(index),
                padding.top +
                chartHeight
            );


            context.stroke();

        }

    }


    context.strokeStyle =
        "#333";


    context.lineWidth =
        1;


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            padding.top +
            chartHeight *
            i /
            4;


        context.beginPath();


        context.moveTo(
            padding.left,
            y
        );


        context.lineTo(
            width -
            padding.right,
            y
        );


        context.stroke();


        const tickValue =
            maximum -
            (
                maximum -
                minimum
            ) *
            i /
            4;


        context.fillStyle =
            "#a0a0a0";


        context.font =
            "11px Arial";


        context.textAlign =
            "right";


        context.fillText(
            tickValue.toFixed(1),
            padding.left -
            8,
            y +
            4
        );

    }


    context.save();


    context.translate(
        16,
        padding.top +
        chartHeight /
        2
    );


    context.rotate(
        -Math.PI /
        2
    );


    context.fillStyle =
        "#a0a0a0";


    context.font =
        "12px Arial";


    context.textAlign =
        "center";


    context.fillText(
        "Weight (lb)",
        0,
        0
    );


    context.restore();


    let previousMonth =
        null;


    entries.forEach(
        (entry, index) => {

            const date =
                new Date(
                    `${entry.date}T00:00:00`
                );


            const monthKey =
                `${date.getFullYear()}-${date.getMonth()}`;


            if (
                monthKey ===
                previousMonth
            ) {
                return;
            }


            previousMonth =
                monthKey;


            const x =
                xPosition(
                    index
                );


            context.strokeStyle =
                "#555";


            context.beginPath();


            context.moveTo(
                x,
                padding.top
            );


            context.lineTo(
                x,
                padding.top +
                chartHeight
            );


            context.stroke();


            context.fillStyle =
                "#a0a0a0";


            context.font =
                "11px Arial";


            context.textAlign =
                "left";


            context.fillText(
                date.toLocaleDateString(
                    undefined,
                    {
                        month:
                            "short"
                    }
                ),
                x +
                4,
                height -
                18
            );

        }
    );


    context.strokeStyle =
        "#777";


    context.lineWidth =
        1.5;


    context.beginPath();


    entries.forEach(
        (entry, index) => {

            const x =
                xPosition(index);


            const y =
                yPosition(
                    entry.weight
                );


            if (index === 0) {

                context.moveTo(
                    x,
                    y
                );

            }

            else {

                context.lineTo(
                    x,
                    y
                );

            }

        }
    );


    context.stroke();


    context.fillStyle =
        "#ffffff";


    entries.forEach(
        (entry, index) => {

            context.beginPath();


            context.arc(
                xPosition(index),
                yPosition(
                    entry.weight
                ),
                4,
                0,
                Math.PI * 2
            );


            context.fill();

        }
    );


    context.strokeStyle =
        "#ef1821";


    context.lineWidth =
        3;


    context.beginPath();


    let movingAverageStarted =
        false;


    trend.forEach(
        (entry, index) => {

            if (
                entry.weight ===
                null
            ) {
                return;
            }


            const x =
                xPosition(index);


            const y =
                yPosition(
                    entry.weight
                );


            if (!movingAverageStarted) {

                context.moveTo(
                    x,
                    y
                );


                movingAverageStarted =
                    true;

            }

            else {

                context.lineTo(
                    x,
                    y
                );

            }

        }
    );


    if (movingAverageStarted) {
        context.stroke();
    }


    if (
        regression.length >=
        2
    ) {

        context.save();


        context.strokeStyle =
            "#7dd3fc";


        context.lineWidth =
            2;


        context.setLineDash([
            7,
            5
        ]);


        context.beginPath();


        regression.forEach(
            (entry, index) => {

                const x =
                    xPosition(index);


                const y =
                    yPosition(
                        entry.weight
                    );


                if (index === 0) {

                    context.moveTo(
                        x,
                        y
                    );

                }

                else {

                    context.lineTo(
                        x,
                        y
                    );

                }

            }
        );


        context.stroke();
        context.restore();

    }


    const legendItems = [
        {
            color: "#ffffff",
            label: "Measurements",
            dashed: false
        },
        {
            color: "#ef1821",
            label: "7-entry average",
            dashed: false
        },
        {
            color: "#7dd3fc",
            label: "Best-fit trend",
            dashed: true
        }
    ];


    let legendX =
        padding.left;


    legendItems.forEach(item => {

        context.save();


        context.strokeStyle =
            item.color;


        context.lineWidth =
            2;


        if (item.dashed) {
            context.setLineDash([
                5,
                4
            ]);
        }


        context.beginPath();


        context.moveTo(
            legendX,
            14
        );


        context.lineTo(
            legendX +
            18,
            14
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
            legendX +
            23,
            17
        );


        legendX +=
            item.label.length *
            6 +
            48;

    });

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


    const weightSection =
        document.getElementById(
            "weight-progress"
        );


    const liftingSection =
        document.getElementById(
            "lifting-progress"
        );


    weightButton?.addEventListener(
        "click",
        () => {

            if (
                !weightSection ||
                !liftingSection
            ) {
                return;
            }


            weightSection.hidden =
                false;


            liftingSection.hidden =
                true;


            weightButton.classList.add(
                "active"
            );


            liftingButton?.classList.remove(
                "active"
            );

        }
    );


    liftingButton?.addEventListener(
        "click",
        () => {

            if (
                !weightSection ||
                !liftingSection
            ) {
                return;
            }


            weightSection.hidden =
                true;


            liftingSection.hidden =
                false;


            liftingButton.classList.add(
                "active"
            );


            weightButton?.classList.remove(
                "active"
            );

        }
    );

}



function editWeightEntry(date) {

    const entry =
        getWeightEntries()
            .find(item =>
                item.date ===
                date
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
                item.date ===
                date
            );


    if (!entry) {
        return;
    }


    const confirmed =
        window.confirm(
            `Remove the weight entry for ${formatDate(
                date
            )}? This cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    const remaining =
        getWeightEntries()
            .filter(item =>
                item.date !==
                date
            );


    saveWeightEntries(
        remaining
    );


    if (
        editingWeightDate ===
        date
    ) {

        editingWeightDate =
            null;


        const weightInput =
            document.getElementById(
                "daily-weight"
            );


        if (weightInput) {
            weightInput.value =
                "";
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
