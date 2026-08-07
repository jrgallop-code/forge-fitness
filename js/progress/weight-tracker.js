const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";


export function initializeWeightTracker() {

    const saveButton =
        document.getElementById(
            "save-weight-btn"
        );

    const demoButton =
        document.getElementById(
            "load-demo-weight-btn"
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


    demoButton?.addEventListener(
        "click",
        loadDemoData
    );


    initializeProgressTabs();

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


    saveWeightEntries(
        demoEntries
    );


    updateWeightDisplay();

}



function calculateMovingAverage(
    entries,
    windowSize = 7
) {

    return entries.map(
        (entry, index) => {

            const startIndex =
                Math.max(
                    0,
                    index -
                    windowSize +
                    1
                );


            const windowEntries =
                entries.slice(
                    startIndex,
                    index + 1
                );


            const total =
                windowEntries.reduce(
                    (sum, current) =>
                        sum +
                        current.weight,
                    0
                );


            const average =
                total /
                windowEntries.length;


            return {

                date:
                    entry.date,

                weight:
                    Number(
                        average.toFixed(2)
                    )

            };

        }
    );

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

            let previous =
                null;


            for (
                let i = index - 1;
                i >= 0;
                i--
            ) {

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
    trend
) {

    if (trend.length < 2) {
        return null;
    }


    const startIndex =
        trend.length >= 7
            ? 6
            : 0;


    const first =
        trend[startIndex];


    const last =
        trend[
            trend.length - 1
        ];


    const elapsedDays =
        daysBetween(
            first.date,
            last.date
        );


    if (elapsedDays <= 0) {
        return null;
    }


    return (
        (
            last.weight -
            first.weight
        ) /
        elapsedDays
    ) * 7;

}



function updateWeightDisplay() {

    const entries =
        getWeightEntries();


    const trend =
        calculateMovingAverage(
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
        trend
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
        trend[
            trend.length - 1
        ];


    if (latestElement) {

        latestElement.textContent =
            `${latest.weight.toFixed(1)} lb`;

    }


    if (trendElement) {

        trendElement.textContent =
            `${latestTrend.weight.toFixed(1)} lb`;

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
            trend
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
                        ?.rate

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
                            ${row.weight.toFixed(1)}
                        </strong>

                        <span>
                            ${
                                row.trend !== undefined
                                    ? row.trend.toFixed(1)
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

                    </div>

                `
            )
            .join("");

}



function formatRate(rate) {

    if (!Number.isFinite(rate)) {
        return "--";
    }


    const prefix =
        rate > 0
            ? "+"
            : "";


    return (
        `${prefix}${rate.toFixed(2)} lb/wk`
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
    trend
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

        ...trend.map(
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

    }


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
        "#e10600";


    context.lineWidth =
        3;


    context.beginPath();


    trend.forEach(
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