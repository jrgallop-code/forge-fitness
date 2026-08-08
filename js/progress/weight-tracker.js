
import {
    getCurrentPhase,
    getPhaseForDate
}
from "../goals/phase-manager.js";

const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";


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
    entries
) {

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
            windowStart.getDate() -
            6
        );


        const windowEntries =
            entries.filter(item => {

                const itemDate =
                    new Date(
                        `${item.date}T00:00:00`
                    );


                return itemDate >=
                    windowStart &&
                    itemDate <=
                    currentDate;

            });


        const average =
            windowEntries.reduce(
                (total, item) =>
                    total +
                    item.weight,
                0
            ) /
            windowEntries.length;


        return {
            date:
                entry.date,

            weight:
                Number(
                    average.toFixed(
                        2
                    )
                )
        };

    });

}



function calculateLinearRegression(
    entries
) {

    if (entries.length < 2) {

        return {
            points: []
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


    const meanX =
        values.reduce(
            (sum, item) =>
                sum +
                item.x,
            0
        ) /
        values.length;


    const meanY =
        values.reduce(
            (sum, item) =>
                sum +
                item.y,
            0
        ) /
        values.length;


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
            points: []
        };

    }


    const slope =
        numerator /
        denominator;


    const intercept =
        meanY -
        slope *
        meanX;


    return {

        points:
            values.map(item => ({
                date:
                    item.date,

                weight:
                    intercept +
                    slope *
                    item.x
            }))

    };

}



function updateSummary(
    entries
) {

    const latestElement =
        document.getElementById(
            "latest-weight"
        );


    if (!latestElement) {
        return;
    }


    if (!entries.length) {

        latestElement.textContent =
            "--";

        return;

    }


    const latest =
        entries[
            entries.length - 1
        ];


    latestElement.textContent =
        `${latest.weight.toFixed(
            1
        )} lb`;

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

                date:
                    entry.date,

                weight:
                    entry.weight,

                average:
                    movingAverage[index]
                        ?.weight ??
                    null,

                weightChange:
                    index > 0
                        ? entry.weight -
                            entries[
                                index - 1
                            ].weight
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
                            ${row.average ===
                                null
                                    ? "--"
                                    : `${row.average.toFixed(
                                        1
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







function drawWeightChart(
    entries,
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
        width *
        scale;


    canvas.height =
        height *
        scale;


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
            item =>
                item.weight
        ),
        ...regression.map(
            item =>
                item.weight
        )
    ];


    const minimum =
        Math.min(
            ...values
        ) -
        1;


    const maximum =
        Math.max(
            ...values
        ) +
        1;


    const firstTime =
        new Date(
            `${entries[0].date}T00:00:00`
        )
        .getTime();


    const lastTime =
        new Date(
            `${entries[
                entries.length - 1
            ].date}T00:00:00`
        )
        .getTime();


    const elapsed =
        Math.max(
            1,
            lastTime -
            firstTime
        );


    const xPosition =
        date =>
            padding.left +
            (
                new Date(
                    `${date}T00:00:00`
                )
                .getTime() -
                firstTime
            ) /
            elapsed *
            chartWidth;


    const yPosition =
        weight =>
            padding.top +
            (
                maximum -
                weight
            ) /
            (
                maximum -
                minimum
            ) *
            chartHeight;


    context.strokeStyle =
        "#303037";


    context.lineWidth =
        1;


    for (
        let index = 0;
        index <= 4;
        index++
    ) {

        const y =
            padding.top +
            chartHeight *
            index /
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


        const value =
            maximum -
            (
                maximum -
                minimum
            ) *
            index /
            4;


        context.fillStyle =
            "#a0a0a8";


        context.font =
            "11px Arial";


        context.textAlign =
            "right";


        context.fillText(
            value.toFixed(
                1
            ),
            padding.left -
            8,
            y +
            4
        );

    }


    context.fillStyle =
        "#a0a0a8";


    context.font =
        "11px Arial";


    context.textAlign =
        "left";


    context.fillText(
        formatDate(
            entries[0].date
        ),
        padding.left,
        height -
        16
    );


    context.textAlign =
        "right";


    context.fillText(
        formatDate(
            entries[
                entries.length - 1
            ].date
        ),
        width -
        padding.right,
        height -
        16
    );


    context.strokeStyle =
        "#777780";


    context.lineWidth =
        1.5;


    context.beginPath();


    entries.forEach(
        (entry, index) => {

            const x =
                xPosition(
                    entry.date
                );


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


    entries.forEach(entry => {

        context.beginPath();


        context.arc(
            xPosition(
                entry.date
            ),
            yPosition(
                entry.weight
            ),
            4,
            0,
            Math.PI *
            2
        );


        context.fill();

    });


    if (
        regression.length >=
        2
    ) {

        context.save();


        context.strokeStyle =
            "#7dd3fc";


        context.lineWidth =
            2.5;


        context.setLineDash([
            8,
            5
        ]);


        context.beginPath();


        regression.forEach(
            (entry, index) => {

                const x =
                    xPosition(
                        entry.date
                    );


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


    const legend = [
        {
            color: "#ffffff",
            label: "Measurements",
            dashed: false
        },
        {
            color: "#7dd3fc",
            label: "Best-fit line",
            dashed: true
        }
    ];


    let legendX =
        padding.left;


    legend.forEach(item => {

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
            18
        );
        context.lineTo(
            legendX +
            18,
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
            legendX +
            23,
            21
        );


        legendX +=
            item.label.length *
            6 +
            48;

    });

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
