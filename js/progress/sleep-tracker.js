const SLEEP_STORAGE_KEY =
    "level_up_sleep_entries";

const SLEEP_AGE_GROUP_KEY =
    "level_up_sleep_age_group";


let editingSleepDate =
    null;


export function renderSleepTracker() {

    return `
        <div class="training-progress-header">
            <div>
                <h3>Sleep & Recovery</h3>
                <p>Record sleep duration, quality and optional notes.</p>
            </div>
        </div>

        <div class="weight-entry-card">
            <label for="sleep-age-group">Age group</label>
            <select id="sleep-age-group">
                <option value="teen">Teen — ages 13–18</option>
                <option value="adult">Adult — age 18 or older</option>
            </select>

            <label for="sleep-date">Date</label>
            <input id="sleep-date" type="date">

            <label for="sleep-bedtime">Bedtime</label>
            <input id="sleep-bedtime" type="time">

            <label for="sleep-wake-time">Wake time</label>
            <input id="sleep-wake-time" type="time">

            <label for="sleep-quality">Sleep quality</label>
            <select id="sleep-quality">
                <option value="">Not recorded</option>
                <option value="1">1 — Very poor</option>
                <option value="2">2 — Poor</option>
                <option value="3">3 — Fair</option>
                <option value="4">4 — Good</option>
                <option value="5">5 — Very good</option>
            </select>

            <label for="sleep-note">Optional note</label>
            <input
                id="sleep-note"
                type="text"
                maxlength="160"
                placeholder="Anything useful to remember"
            >

            <button id="save-sleep-btn" class="primary-btn" type="button">
                Save Sleep
            </button>
        </div>

        <p id="sleep-message" class="workout-message" aria-live="polite"></p>

        <p id="sleep-guidance" class="workout-message" aria-live="polite"></p>

        <p class="weight-history-help">
            Guidance uses the lower end of the American Academy of Sleep
            Medicine consensus ranges:
            <a href="https://jcsm.aasm.org/doi/10.5664/jcsm.6288" target="_blank" rel="noopener noreferrer">8–10 hours for ages 13–18</a>
            and
            <a href="https://jcsm.aasm.org/doi/10.5664/jcsm.4758" target="_blank" rel="noopener noreferrer">7 or more hours for adults</a>.
            Individual needs can vary.
        </p>

        <div class="weight-summary">
            <div class="metric-card">
                <div>
                    <h3>Latest Sleep</h3>
                    <p id="latest-sleep">--</p>
                </div>
            </div>

            <div class="metric-card">
                <div>
                    <h3>7-Entry Average</h3>
                    <p id="average-sleep">--</p>
                </div>
            </div>
        </div>

        <div class="weight-chart-card">
            <div class="chart-header">
                <div>
                    <h3>Sleep Duration</h3>
                    <p>Daily measurements and seven-entry average</p>
                </div>
            </div>

            <canvas
                id="sleep-chart"
                width="800"
                height="400"
                aria-label="Sleep duration graph"
            ></canvas>
        </div>

        <div class="weight-history">
            <h3>Sleep History</h3>

            <div class="weight-table">
                <div class="weight-table-header">
                    <span>Date</span>
                    <span>Duration</span>
                    <span>Quality</span>
                    <span>Actions</span>
                </div>

                <div id="sleep-history-list">
                    <p class="empty-state">No sleep entries yet.</p>
                </div>
            </div>
        </div>
    `;

}


export function initializeSleepTracker() {

    const dateInput =
        document.getElementById("sleep-date");


    if (dateInput) {
        dateInput.value =
            getLocalDateValue();
    }


    const ageGroup =
        document.getElementById("sleep-age-group");


    if (ageGroup) {
        ageGroup.value =
            localStorage.getItem(
                SLEEP_AGE_GROUP_KEY
            ) ||
            "teen";

        ageGroup.addEventListener(
            "change",
            () => {
                localStorage.setItem(
                    SLEEP_AGE_GROUP_KEY,
                    ageGroup.value
                );
                updateSleepDisplay();
            }
        );
    }


    document
        .getElementById("save-sleep-btn")
        ?.addEventListener(
            "click",
            saveSleepEntry
        );


    updateSleepDisplay();

}


function getSleepEntries() {

    try {

        const parsed =
            JSON.parse(
                localStorage.getItem(
                    SLEEP_STORAGE_KEY
                ) ||
                "[]"
            );


        return Array.isArray(parsed)
            ? parsed
                .filter(entry =>
                    entry?.date &&
                    Number.isFinite(
                        Number(entry.duration)
                    )
                )
                .map(entry => ({
                    ...entry,
                    duration:
                        Number(entry.duration),
                    quality:
                        entry.quality === "" ||
                        entry.quality === null ||
                        entry.quality === undefined
                            ? null
                            : Number(entry.quality)
                }))
                .sort((a, b) =>
                    a.date.localeCompare(b.date)
                )
            : [];

    }

    catch {
        return [];
    }

}


function saveSleepEntry() {

    const date =
        document.getElementById("sleep-date")?.value;

    const bedtime =
        document.getElementById("sleep-bedtime")?.value;

    const wakeTime =
        document.getElementById("sleep-wake-time")?.value;

    const qualityValue =
        document.getElementById("sleep-quality")?.value ||
        "";

    const note =
        document.getElementById("sleep-note")?.value.trim() ||
        "";

    const duration =
        calculateDuration(
            bedtime,
            wakeTime
        );


    if (!date || duration === null) {
        setSleepMessage(
            "Choose a date, bedtime and wake time."
        );
        return;
    }


    const entries =
        getSleepEntries()
            .filter(entry =>
                entry.date !== editingSleepDate &&
                entry.date !== date
            );


    entries.push({
        date,
        bedtime,
        wakeTime,
        duration,
        quality:
            qualityValue
                ? Number(qualityValue)
                : null,
        note
    });


    entries.sort((a, b) =>
        a.date.localeCompare(b.date)
    );


    localStorage.setItem(
        SLEEP_STORAGE_KEY,
        JSON.stringify(entries)
    );


    editingSleepDate =
        null;


    const button =
        document.getElementById("save-sleep-btn");


    if (button) {
        button.textContent =
            "Save Sleep";
    }


    setSleepMessage(
        "Sleep entry saved."
    );


    updateSleepDisplay();

}


function calculateDuration(
    bedtime,
    wakeTime
) {

    if (!bedtime || !wakeTime) {
        return null;
    }


    const [bedHour, bedMinute] =
        bedtime.split(":").map(Number);

    const [wakeHour, wakeMinute] =
        wakeTime.split(":").map(Number);

    let minutes =
        wakeHour * 60 +
        wakeMinute -
        (bedHour * 60 + bedMinute);


    if (minutes <= 0) {
        minutes += 24 * 60;
    }


    return Number(
        (minutes / 60).toFixed(2)
    );

}


function updateSleepDisplay() {

    const entries =
        getSleepEntries();

    const averages =
        entries.map((entry, index) => {
            const windowEntries =
                entries.slice(
                    Math.max(0, index - 6),
                    index + 1
                );

            return {
                date: entry.date,
                duration:
                    windowEntries.reduce(
                        (sum, item) =>
                            sum + item.duration,
                        0
                    ) / windowEntries.length
            };
        });


    const latest =
        entries.at(-1);

    const latestElement =
        document.getElementById("latest-sleep");

    const averageElement =
        document.getElementById("average-sleep");


    if (latestElement) {
        latestElement.textContent =
            latest
                ? formatDuration(latest.duration)
                : "--";
    }


    if (averageElement) {
        averageElement.textContent =
            averages.length
                ? formatDuration(
                    averages.at(-1).duration
                )
                : "--";
    }


    renderSleepHistory(entries);
    updateSleepGuidance(latest);
    drawSleepChart(
        entries,
        averages
    );

}


function updateSleepGuidance(latest) {

    const guidance =
        document.getElementById("sleep-guidance");


    if (!guidance) {
        return;
    }


    if (!latest) {
        guidance.textContent = "";
        return;
    }


    const ageGroup =
        document.getElementById("sleep-age-group")?.value ||
        "teen";

    const minimumHours =
        ageGroup === "adult"
            ? 7
            : 8;


    guidance.textContent =
        latest.duration < minimumHours
            ? `This entry is below the usual ${minimumHours}-hour minimum for the selected age group. Consider prioritizing sleep and a consistent sleep routine. If this happens often or sleep is difficult, talk with a trusted adult or healthcare professional.`
            : "";

}


function renderSleepHistory(entries) {

    const container =
        document.getElementById("sleep-history-list");


    if (!container) {
        return;
    }


    if (!entries.length) {
        container.innerHTML =
            '<p class="empty-state">No sleep entries yet.</p>';
        return;
    }


    container.innerHTML =
        [...entries]
            .reverse()
            .map(entry => `
                <div class="weight-table-row">
                    <span>${formatDate(entry.date)}</span>
                    <strong>${formatDuration(entry.duration)}</strong>
                    <span>${entry.quality === null ? "--" : `${entry.quality}/5`}</span>
                    <div class="weight-entry-actions">
                        <button class="edit-sleep-entry" type="button" data-date="${entry.date}">Edit</button>
                        <button class="remove-sleep-entry" type="button" data-date="${entry.date}">Remove</button>
                    </div>
                </div>
            `)
            .join("");


    container
        .querySelectorAll(".edit-sleep-entry")
        .forEach(button =>
            button.addEventListener(
                "click",
                () => editSleepEntry(button.dataset.date)
            )
        );

    container
        .querySelectorAll(".remove-sleep-entry")
        .forEach(button =>
            button.addEventListener(
                "click",
                () => removeSleepEntry(button.dataset.date)
            )
        );

}


function editSleepEntry(date) {

    const entry =
        getSleepEntries()
            .find(item =>
                item.date === date
            );


    if (!entry) {
        return;
    }


    document.getElementById("sleep-date").value =
        entry.date;
    document.getElementById("sleep-bedtime").value =
        entry.bedtime;
    document.getElementById("sleep-wake-time").value =
        entry.wakeTime;
    document.getElementById("sleep-quality").value =
        entry.quality ?? "";
    document.getElementById("sleep-note").value =
        entry.note || "";


    editingSleepDate =
        entry.date;


    document.getElementById("save-sleep-btn").textContent =
        "Update Sleep";

}


function removeSleepEntry(date) {

    if (!window.confirm("Remove this sleep entry?")) {
        return;
    }


    const entries =
        getSleepEntries()
            .filter(entry =>
                entry.date !== date
            );


    localStorage.setItem(
        SLEEP_STORAGE_KEY,
        JSON.stringify(entries)
    );


    updateSleepDisplay();

}


function drawSleepChart(
    entries,
    averages
) {

    const canvas =
        document.getElementById("sleep-chart");


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
    context.clearRect(0, 0, width, height);


    if (!entries.length) {
        context.fillStyle = "#a0a0a0";
        context.font = "14px Arial";
        context.fillText(
            "Add sleep entries to display the graph.",
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
        width - padding.left - padding.right;
    const chartHeight =
        height - padding.top - padding.bottom;

    const values = [
        ...entries.map(entry => entry.duration),
        ...averages.map(entry => entry.duration)
    ];

    const minimum =
        Math.max(0, Math.floor(Math.min(...values) - 1));
    const maximum =
        Math.ceil(Math.max(...values) + 1);

    const xPosition = index =>
        padding.left +
        (entries.length === 1
            ? chartWidth / 2
            : index / (entries.length - 1) * chartWidth);

    const yPosition = value =>
        padding.top +
        (maximum - value) /
        Math.max(1, maximum - minimum) *
        chartHeight;


    context.strokeStyle = "#303037";
    context.lineWidth = 1;

    for (let index = 0; index <= 4; index++) {
        const y =
            padding.top + chartHeight * index / 4;
        const value =
            maximum - (maximum - minimum) * index / 4;

        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
        context.fillStyle = "#a0a0a8";
        context.font = "11px Arial";
        context.textAlign = "right";
        context.fillText(
            value.toFixed(1),
            padding.left - 8,
            y + 4
        );
    }


    drawLine(
        context,
        entries.map(entry => entry.duration),
        xPosition,
        yPosition,
        "#ffffff",
        false
    );

    drawLine(
        context,
        averages.map(entry => entry.duration),
        xPosition,
        yPosition,
        "#7dd3fc",
        true
    );


    context.fillStyle = "#a0a0a8";
    context.font = "11px Arial";
    context.textAlign = "left";
    context.fillText(
        formatDate(entries[0].date),
        padding.left,
        height - 16
    );
    context.textAlign = "right";
    context.fillText(
        formatDate(entries.at(-1).date),
        width - padding.right,
        height - 16
    );

}


function drawLine(
    context,
    values,
    xPosition,
    yPosition,
    color,
    dashed
) {

    context.save();
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.setLineDash(
        dashed
            ? [8, 5]
            : []
    );
    context.beginPath();

    values.forEach((value, index) => {
        const x = xPosition(index);
        const y = yPosition(value);

        if (index === 0) {
            context.moveTo(x, y);
        }
        else {
            context.lineTo(x, y);
        }
    });

    context.stroke();
    context.restore();

}


function formatDuration(hours) {

    const totalMinutes =
        Math.round(hours * 60);

    const wholeHours =
        Math.floor(totalMinutes / 60);

    const minutes =
        totalMinutes % 60;


    return `${wholeHours}h ${minutes}m`;

}


function formatDate(date) {
    return new Date(
        `${date}T12:00:00`
    ).toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric"
        }
    );
}


function setSleepMessage(value) {
    const message =
        document.getElementById("sleep-message");

    if (message) {
        message.textContent = value;
    }
}


function getLocalDateValue() {
    const now = new Date();

    return new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
    )
    .toISOString()
    .slice(0, 10);
}
