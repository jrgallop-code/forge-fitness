import {
    getExerciseById
}
from "../workouts/exercise-library.js";


const SESSION_STORAGE_KEY =
    "forge_workout_sessions";


export function initializeTrainingProgress() {

    document
        .querySelectorAll(
            ".training-progress-tab"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    showTrainingView(
                        button.dataset.view
                    )
            );

        });


    document
        .getElementById(
            "progress-range"
        )
        ?.addEventListener(
            "change",
            renderTrainingProgress
        );


    document
        .getElementById(
            "exercise-progress-select"
        )
        ?.addEventListener(
            "change",
            renderExerciseProgress
        );


    document
        .getElementById(
            "export-workouts-json"
        )
        ?.addEventListener(
            "click",
            exportSessionsAsJson
        );


    document
        .getElementById(
            "export-workouts-csv"
        )
        ?.addEventListener(
            "click",
            exportSessionsAsCsv
        );


    renderTrainingProgress();

}



function showTrainingView(view) {

    document
        .querySelectorAll(
            ".training-progress-tab"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.view === view
            );

        });


    document
        .querySelectorAll(
            ".training-progress-view"
        )
        .forEach(section => {

            section.hidden =
                section.dataset.view !==
                view;

        });


    if (view === "exercises") {
        renderExerciseProgress();
    }

}



function renderTrainingProgress() {

    const sessions =
        getFilteredSessions();


    updateSummary(
        sessions
    );


    populateExerciseSelector(
        sessions
    );


    drawWeeklyChart(
        "weekly-workouts-chart",
        groupByWeek(
            sessions,
            () => 1
        ),
        "Workouts"
    );


    renderRecentImprovements(
        sessions
    );


    renderExerciseProgress();


    drawWeeklyChart(
        "weekly-sets-chart",
        groupByWeek(
            sessions,
            countCompletedSets
        ),
        "Working sets"
    );


    renderMuscleDistribution(
        sessions
    );


    renderSessionHistory(
        sessions
    );

}



function getSessions() {

    const stored =
        localStorage.getItem(
            SESSION_STORAGE_KEY
        );


    if (!stored) {
        return [];
    }


    try {

        const sessions =
            JSON.parse(
                stored
            );


        return Array.isArray(
            sessions
        )
            ? sessions
            : [];

    }

    catch {

        return [];

    }

}



function getFilteredSessions() {

    const days =
        Number(
            document
                .getElementById(
                    "progress-range"
                )
                ?.value ||
            0
        );


    return getSessions()
        .filter(session => {

            if (!days) {
                return true;
            }


            const cutoff =
                new Date();


            cutoff.setDate(
                cutoff.getDate() -
                days
            );


            return new Date(
                `${session.date}T23:59:59`
            ) >= cutoff;

        })
        .sort(
            (a, b) =>
                String(a.date)
                    .localeCompare(
                        String(b.date)
                    )
        );

}



function updateSummary(sessions) {

    const completedSets =
        sessions.reduce(
            (total, session) =>
                total +
                countCompletedSets(
                    session
                ),
            0
        );


    const exerciseIds =
        new Set();


    sessions.forEach(session =>
        session.exercises
            ?.forEach(exercise =>
                exerciseIds.add(
                    exercise.exerciseId
                )
            )
    );


    setText(
        "progress-workout-count",
        sessions.length
    );


    setText(
        "progress-set-count",
        completedSets
    );


    setText(
        "progress-exercise-count",
        exerciseIds.size
    );


    const recentDate =
        sessions.length
            ? formatDate(
                sessions[
                    sessions.length - 1
                ].date
            )
            : "Not started";


    setText(
        "progress-latest-session",
        recentDate
    );

}



function populateExerciseSelector(
    sessions
) {

    const select =
        document.getElementById(
            "exercise-progress-select"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const ids =
        [
            ...new Set(
                sessions.flatMap(
                    session =>
                        session.exercises
                            ?.map(
                                exercise =>
                                    exercise.exerciseId
                            ) ||
                        []
                )
            )
        ]
        .filter(Boolean)
        .sort(
            (a, b) =>
                getExerciseName(a)
                    .localeCompare(
                        getExerciseName(b)
                    )
        );


    select.innerHTML =
        ids.length
            ? ids.map(id => `
                <option value="${escapeHtml(id)}">
                    ${escapeHtml(
                        getExerciseName(id)
                    )}
                </option>
            `).join("")
            : `
                <option value="">
                    No exercise data yet
                </option>
            `;


    if (
        ids.includes(
            current
        )
    ) {

        select.value =
            current;

    }

}



function renderExerciseProgress() {

    const exerciseId =
        document
            .getElementById(
                "exercise-progress-select"
            )
            ?.value;


    const sessions =
        getFilteredSessions();


    const records =
        getExerciseRecords(
            sessions,
            exerciseId
        );


    const title =
        document.getElementById(
            "exercise-progress-title"
        );


    if (title) {

        title.textContent =
            exerciseId
                ? getExerciseName(
                    exerciseId
                )
                : "Exercise Progress";

    }


    drawLineChart(
        "exercise-strength-chart",
        records.map(record => ({
            label:
                formatShortDate(
                    record.date
                ),

            value:
                record.estimatedOneRepMax

        }))
    );


    const history =
        document.getElementById(
            "exercise-history-body"
        );


    if (!history) {
        return;
    }


    if (!records.length) {

        history.innerHTML = `
            <p class="empty-state">
                Log this exercise to see its progress history.
            </p>
        `;

        return;

    }


    history.innerHTML =
        [...records]
            .reverse()
            .map(record => `
                <div class="exercise-history-row">

                    <span>
                        ${formatDate(
                            record.date
                        )}
                    </span>

                    <strong>
                        ${formatSet(
                            record.bestSet
                        )}
                    </strong>

                    <span>
                        ${record.estimatedOneRepMax
                            ? record.estimatedOneRepMax.toFixed(1)
                            : "—"}
                    </span>

                    <span>
                        ${record.completedSets}
                    </span>

                </div>
            `)
            .join("");

}



function getExerciseRecords(
    sessions,
    exerciseId
) {

    if (!exerciseId) {
        return [];
    }


    return sessions
        .map(session => {

            const exercise =
                session.exercises
                    ?.find(
                        item =>
                            item.exerciseId ===
                            exerciseId
                    );


            if (!exercise) {
                return null;
            }


            const completed =
                exercise.sets
                    ?.filter(set =>
                        Number(set.weight) > 0 &&
                        Number(set.reps) > 0
                    ) ||
                [];


            const bestSet =
                [...completed]
                    .sort(
                        (a, b) =>
                            estimateOneRepMax(b) -
                            estimateOneRepMax(a)
                    )[0] ||
                null;


            return {

                date:
                    session.date,

                bestSet,

                estimatedOneRepMax:
                    bestSet
                        ? estimateOneRepMax(
                            bestSet
                        )
                        : 0,

                completedSets:
                    completed.length

            };

        })
        .filter(Boolean);

}



function renderRecentImprovements(
    sessions
) {

    const container =
        document.getElementById(
            "recent-improvements"
        );


    if (!container) {
        return;
    }


    const ids =
        [
            ...new Set(
                sessions.flatMap(
                    session =>
                        session.exercises
                            ?.map(
                                exercise =>
                                    exercise.exerciseId
                            ) ||
                        []
                )
            )
        ];


    const improvements =
        ids.map(id => {

            const records =
                getExerciseRecords(
                    sessions,
                    id
                );


            if (records.length < 2) {
                return null;
            }


            const current =
                records[
                    records.length - 1
                ];


            const previous =
                records[
                    records.length - 2
                ];


            return {

                id,

                change:
                    current.estimatedOneRepMax -
                    previous.estimatedOneRepMax,

                current

            };

        })
        .filter(item =>
            item &&
            item.change > 0
        )
        .sort(
            (a, b) =>
                b.change -
                a.change
        )
        .slice(0, 5);


    if (!improvements.length) {

        container.innerHTML = `
            <p class="empty-state">
                Complete at least two sessions for an exercise to see improvements.
            </p>
        `;

        return;

    }


    container.innerHTML =
        improvements.map(item => `
            <div class="improvement-row">

                <strong>
                    ${escapeHtml(
                        getExerciseName(
                            item.id
                        )
                    )}
                </strong>

                <span>
                    +${item.change.toFixed(1)}
                    estimated strength
                </span>

            </div>
        `).join("");

}



function renderMuscleDistribution(
    sessions
) {

    const container =
        document.getElementById(
            "muscle-distribution"
        );


    if (!container) {
        return;
    }


    const totals = {};


    sessions.forEach(session =>
        session.exercises
            ?.forEach(exercise => {

                const muscle =
                    getExerciseById(
                        exercise.exerciseId
                    )
                    ?.muscleGroup ||
                    "Other";


                totals[muscle] =
                    (
                        totals[muscle] ||
                        0
                    ) +
                    (
                        exercise.sets
                            ?.filter(set =>
                                set.reps !== null ||
                                set.weight !== null
                            )
                            .length ||
                        0
                    );

            })
    );


    const entries =
        Object.entries(
            totals
        )
        .sort(
            (a, b) =>
                b[1] -
                a[1]
        );


    if (!entries.length) {

        container.innerHTML = `
            <p class="empty-state">
                Muscle-group distribution will appear after workouts are logged.
            </p>
        `;

        return;

    }


    const maximum =
        Math.max(
            ...entries.map(
                entry =>
                    entry[1]
            )
        );


    container.innerHTML =
        entries.map(
            ([muscle, sets]) => `
                <div class="muscle-bar-row">

                    <span>
                        ${escapeHtml(
                            muscle
                        )}
                    </span>

                    <div class="muscle-bar-track">

                        <div
                            class="muscle-bar-fill"
                            style="width:${sets / maximum * 100}%"
                        ></div>

                    </div>

                    <strong>
                        ${sets}
                    </strong>

                </div>
            `
        ).join("");

}



function renderSessionHistory(
    sessions
) {

    const container =
        document.getElementById(
            "workout-history-list"
        );


    if (!container) {
        return;
    }


    if (!sessions.length) {

        container.innerHTML = `
            <p class="empty-state">
                No completed workouts yet.
            </p>
        `;

        return;

    }


    container.innerHTML =
        [...sessions]
            .reverse()
            .map(session => `
                <article class="history-session-card">

                    <div>

                        <strong>
                            ${escapeHtml(
                                session.trainingDayName ||
                                "Workout"
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                session.planName ||
                                "Workout Plan"
                            )}
                        </span>

                    </div>

                    <div>

                        <strong>
                            ${formatDate(
                                session.date
                            )}
                        </strong>

                        <span>
                            ${countCompletedSets(
                                session
                            )} sets
                        </span>

                    </div>

                </article>
            `).join("");

}



function groupByWeek(
    sessions,
    valueGetter
) {

    const totals = {};


    sessions.forEach(session => {

        const week =
            getWeekStart(
                session.date
            );


        totals[week] =
            (
                totals[week] ||
                0
            ) +
            valueGetter(
                session
            );

    });


    return Object.entries(
        totals
    )
    .sort(
        (a, b) =>
            a[0].localeCompare(
                b[0]
            )
    )
    .slice(-12)
    .map(
        ([date, value]) => ({

            label:
                formatShortDate(
                    date
                ),

            value

        })
    );

}



function drawWeeklyChart(
    canvasId,
    points,
    label
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) {
        return;
    }


    const context =
        prepareCanvas(
            canvas
        );


    if (!context) {
        return;
    }


    drawEmptyOrAxes(
        context,
        canvas,
        points,
        label
    );


    if (!points.length) {
        return;
    }


    const width =
        canvas.clientWidth;


    const height =
        canvas.clientHeight;


    const padding = {
        top: 25,
        right: 15,
        bottom: 45,
        left: 40
    };


    const maximum =
        Math.max(
            1,
            ...points.map(
                point =>
                    point.value
            )
        );


    const space =
        (
            width -
            padding.left -
            padding.right
        ) /
        points.length;


    points.forEach(
        (point, index) => {

            const barHeight =
                point.value /
                maximum *
                (
                    height -
                    padding.top -
                    padding.bottom
                );


            const x =
                padding.left +
                index *
                space +
                space *
                .18;


            const y =
                height -
                padding.bottom -
                barHeight;


            context.fillStyle =
                "#e10600";


            context.fillRect(
                x,
                y,
                space * .64,
                barHeight
            );


            context.fillStyle =
                "#a0a0a0";


            context.font =
                "11px Arial";


            context.textAlign =
                "center";


            context.fillText(
                point.label,
                x +
                space *
                .32,
                height -
                18
            );


            context.fillStyle =
                "#ffffff";


            context.fillText(
                String(
                    point.value
                ),
                x +
                space *
                .32,
                Math.max(
                    15,
                    y -
                    6
                )
            );

        }
    );

}



function drawLineChart(
    canvasId,
    points
) {

    const canvas =
        document.getElementById(
            canvasId
        );


    if (!canvas) {
        return;
    }


    const context =
        prepareCanvas(
            canvas
        );


    if (!context) {
        return;
    }


    drawEmptyOrAxes(
        context,
        canvas,
        points,
        "Estimated strength"
    );


    if (!points.length) {
        return;
    }


    const width =
        canvas.clientWidth;


    const height =
        canvas.clientHeight;


    const padding = {
        top: 30,
        right: 20,
        bottom: 45,
        left: 45
    };


    const values =
        points.map(
            point =>
                point.value
        );


    const minimum =
        Math.min(
            ...values
        );


    const maximum =
        Math.max(
            ...values
        );


    const range =
        maximum -
        minimum ||
        1;


    const coordinates =
        points.map(
            (point, index) => ({

                x:
                    padding.left +
                    (
                        points.length === 1
                            ? (
                                width -
                                padding.left -
                                padding.right
                            ) / 2
                            : index /
                                (
                                    points.length -
                                    1
                                ) *
                                (
                                    width -
                                    padding.left -
                                    padding.right
                                )
                    ),

                y:
                    padding.top +
                    (
                        maximum -
                        point.value
                    ) /
                    range *
                    (
                        height -
                        padding.top -
                        padding.bottom
                    ),

                ...point

            })
        );


    context.strokeStyle =
        "#e10600";


    context.lineWidth = 3;


    context.beginPath();


    coordinates.forEach(
        (point, index) => {

            if (index === 0) {

                context.moveTo(
                    point.x,
                    point.y
                );

            }

            else {

                context.lineTo(
                    point.x,
                    point.y
                );

            }

        }
    );


    context.stroke();


    coordinates.forEach(point => {

        context.fillStyle =
            "#ffffff";


        context.beginPath();


        context.arc(
            point.x,
            point.y,
            4,
            0,
            Math.PI * 2
        );


        context.fill();


        context.fillStyle =
            "#a0a0a0";


        context.font =
            "11px Arial";


        context.textAlign =
            "center";


        context.fillText(
            point.label,
            point.x,
            height -
            18
        );

    });

}



function prepareCanvas(canvas) {

    const context =
        canvas.getContext(
            "2d"
        );


    if (!context) {
        return null;
    }


    const ratio =
        window.devicePixelRatio ||
        1;


    const width =
        canvas.clientWidth ||
        700;


    const height =
        canvas.clientHeight ||
        300;


    canvas.width =
        width *
        ratio;


    canvas.height =
        height *
        ratio;


    context.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );


    context.clearRect(
        0,
        0,
        width,
        height
    );


    return context;

}



function drawEmptyOrAxes(
    context,
    canvas,
    points,
    label
) {

    const width =
        canvas.clientWidth;


    const height =
        canvas.clientHeight;


    context.strokeStyle =
        "#333";


    context.lineWidth = 1;


    context.beginPath();


    context.moveTo(
        40,
        20
    );


    context.lineTo(
        40,
        height -
        40
    );


    context.lineTo(
        width -
        15,
        height -
        40
    );


    context.stroke();


    context.fillStyle =
        "#a0a0a0";


    context.font =
        "12px Arial";


    context.textAlign =
        "left";


    context.fillText(
        label,
        45,
        15
    );


    if (!points.length) {

        context.textAlign =
            "center";


        context.fillText(
            "Log workouts to populate this chart",
            width / 2,
            height / 2
        );

    }

}



function estimateOneRepMax(set) {

    return Number(
        set.weight
    ) *
    (
        1 +
        Number(
            set.reps
        ) /
        30
    );

}



function countCompletedSets(session) {

    return session.exercises
        ?.reduce(
            (total, exercise) =>
                total +
                (
                    exercise.sets
                        ?.filter(set =>
                            set.weight !== null ||
                            set.reps !== null
                        )
                        .length ||
                    0
                ),
            0
        ) ||
        0;

}



function getWeekStart(dateValue) {

    const date =
        new Date(
            `${dateValue}T00:00:00`
        );


    const day =
        date.getDay();


    date.setDate(
        date.getDate() -
        (
            day === 0
                ? 6
                : day - 1
        )
    );


    return date
        .toISOString()
        .slice(0, 10);

}



function getExerciseName(id) {

    const exercise =
        getExerciseById(
            id
        );


    if (exercise) {
        return exercise.name;
    }


    return String(id || "Exercise")
        .split("-")
        .map(word =>
            word.charAt(0)
                .toUpperCase() +
            word.slice(1)
        )
        .join(" ");

}



function formatSet(set) {

    if (!set) {
        return "—";
    }


    return `${set.weight ?? "—"} × ${set.reps ?? "—"}`;

}



function formatDate(value) {

    if (!value) {
        return "Unknown";
    }


    return new Intl.DateTimeFormat(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    )
    .format(
        new Date(
            `${value}T00:00:00`
        )
    );

}



function formatShortDate(value) {

    return new Intl.DateTimeFormat(
        undefined,
        {
            month: "short",
            day: "numeric"
        }
    )
    .format(
        new Date(
            `${value}T00:00:00`
        )
    );

}



function setText(id, value) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}



function exportSessionsAsJson() {

    const sessions =
        getSessions();


    downloadText(
        "forge-workout-sessions.json",
        JSON.stringify(
            sessions,
            null,
            2
        ),
        "application/json"
    );

}



function exportSessionsAsCsv() {

    const rows = [[
        "session_id",
        "date",
        "plan",
        "training_day",
        "exercise_id",
        "set_number",
        "weight",
        "reps"
    ]];


    getSessions()
        .forEach(session =>
            session.exercises
                ?.forEach(exercise =>
                    exercise.sets
                        ?.forEach(
                            (set, index) => {

                                rows.push([
                                    session.id,
                                    session.date,
                                    session.planName,
                                    session.trainingDayName,
                                    exercise.exerciseId,
                                    index + 1,
                                    set.weight ?? "",
                                    set.reps ?? ""
                                ]);

                            }
                        )
                )
        );


    downloadText(
        "forge-workout-sessions.csv",
        rows.map(row =>
            row.map(csvCell)
                .join(",")
        )
        .join("\n"),
        "text/csv"
    );

}



function downloadText(
    filename,
    content,
    type
) {

    const blob =
        new Blob(
            [content],
            {
                type
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename;


    link.click();


    URL.revokeObjectURL(
        url
    );

}



function csvCell(value) {

    return `"${String(value ?? "")
        .replace(/"/g, '""')}"`;

}



function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
