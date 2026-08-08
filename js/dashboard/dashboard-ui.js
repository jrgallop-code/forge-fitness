import {
    createCard
}
from "../components/card.js";


import {
    getExerciseById
}
from "../workouts/exercise-library.js";


const SESSION_STORAGE_KEY =
    "forge_workout_sessions";

const PLAN_STORAGE_KEY =
    "forge_workout_plans";

const NUTRITION_STORAGE_KEY =
    "level_up_nutrition_habits";

const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";

const WATER_STORAGE_KEY =
    "level_up_water_entries";

const SLEEP_STORAGE_KEY =
    "level_up_sleep_entries";


export function renderDashboard() {

    const sessions =
        getStoredArray(
            SESSION_STORAGE_KEY
        )
        .sort(
            (a, b) =>
                getSessionTime(b) -
                getSessionTime(a)
        );


    const plans =
        getStoredArray(
            PLAN_STORAGE_KEY
        );


    const recentSessions =
        sessions.slice(0, 4);


    const weekStart =
        new Date();

    weekStart.setHours(
        0,
        0,
        0,
        0
    );

    weekStart.setDate(
        weekStart.getDate() -
        6
    );


    const weeklySessions =
        sessions.filter(session =>
            getSessionTime(session) >=
            weekStart.getTime()
        );


    const weeklySets =
        weeklySessions.reduce(
            (
                total,
                session
            ) =>
                total +
                countCompletedSets(
                    session
                ),
            0
        );


    const weeklyExercises =
        weeklySessions.reduce(
            (
                total,
                session
            ) =>
                total +
                countRecordedExercises(
                    session
                ),
            0
        );


    const nutritionToday =
        getNutritionToday();


    const latestWeight =
        getLatestRecordedWeight();

    const waterToday =
        getWaterRecordedToday();

    const latestSleep =
        getLatestSleepDuration();


    const latest =
        sessions[0] ||
        null;


    return `
        <section class="dashboard-welcome">

            <div>
                <span class="eyebrow">
                    YOUR TRAINING
                </span>

                <h2>
                    Dashboard
                </h2>

                <p>
                    A live overview built from the workouts,
                    plans and daily check-ins saved in this browser.
                </p>
            </div>

            <div class="dashboard-status">
                <span class="status-dot"></span>
                Local data connected
            </div>

        </section>


        <section class="dashboard">

            ${createCard(
                "Workouts — Last 7 Days",
                String(
                    weeklySessions.length
                ),
                "🏋️"
            )}

            ${createCard(
                "Completed Sets — Last 7 Days",
                String(
                    weeklySets
                ),
                "✓"
            )}

            ${createCard(
                "Exercises — Last 7 Days",
                String(
                    weeklyExercises
                ),
                "💪"
            )}

            ${createCard(
                "Saved Workout Plans",
                String(
                    plans.length
                ),
                "📋"
            )}

            ${createCard(
                "Latest Recorded Weight",
                latestWeight === null
                    ? "--"
                    : `${latestWeight.toFixed(1)} lb`,
                "⚖️"
            )}

            ${createCard(
                "Water Recorded Today",
                waterToday === null
                    ? "--"
                    : `${waterToday.toLocaleString()} mL`,
                "💧"
            )}

            ${createCard(
                "Latest Sleep Duration",
                latestSleep === null
                    ? "--"
                    : formatSleepDuration(latestSleep),
                "🌙"
            )}

        </section>


        <section class="dashboard-detail-grid">

            <article class="section-card dashboard-latest">

                <div class="dashboard-card-heading">
                    <div>
                        <span class="eyebrow">
                            LATEST ACTIVITY
                        </span>
                        <h2>
                            Most Recent Workout
                        </h2>
                    </div>

                    ${latest
                        ? `
                            <time datetime="${escapeHtml(
                                latest.date ||
                                ""
                            )}">
                                ${formatDate(
                                    latest.date
                                )}
                            </time>
                        `
                        : ""}

                </div>

                ${latest
                    ? renderLatestWorkout(
                        latest
                    )
                    : renderEmptyState(
                        "No completed workouts yet",
                        "Log a workout from one of your saved plans and it will appear here."
                    )}

            </article>


            <article class="section-card dashboard-nutrition">

                <div class="dashboard-card-heading">
                    <div>
                        <span class="eyebrow">
                            TODAY
                        </span>
                        <h2>
                            Nutrition Check-In
                        </h2>
                    </div>

                    <span class="nutrition-dashboard-score">
                        ${nutritionToday.completed}/6
                    </span>
                </div>

                <div class="nutrition-dashboard-progress">
                    <span
                        style="width:${Math.round(
                            nutritionToday.completed /
                            6 *
                            100
                        )}%"
                    ></span>
                </div>

                <p>
                    ${nutritionToday.saved
                        ? `${nutritionToday.completed} helpful ${nutritionToday.completed === 1 ? "habit" : "habits"} checked today.`
                        : "No Nutrition check-in has been saved for today."}
                </p>

                ${nutritionToday.notes
                    ? `
                        <div class="dashboard-note">
                            <strong>Today's note</strong>
                            <span>
                                ${escapeHtml(
                                    nutritionToday.notes
                                )}
                            </span>
                        </div>
                    `
                    : ""}

            </article>

        </section>


        <section class="section-card dashboard-history">

            <div class="dashboard-card-heading">
                <div>
                    <span class="eyebrow">
                        HISTORY
                    </span>
                    <h2>
                        Recent Workouts
                    </h2>
                </div>

                <span class="dashboard-total">
                    ${sessions.length}
                    total
                </span>
            </div>

            ${recentSessions.length
                ? `
                    <div class="dashboard-session-list">
                        ${recentSessions.map(
                            renderSessionRow
                        ).join("")}
                    </div>
                `
                : renderEmptyState(
                    "Your workout history is empty",
                    "Completed sessions will be listed here automatically."
                )}

        </section>


        <section class="section-card dashboard-backup">

            <div class="backup-icon">
                ☁️
            </div>

            <div class="backup-copy">
                <span class="eyebrow">
                    DATA SAFETY
                </span>

                <h2>
                    Backup & Restore
                </h2>

                <p>
                    Download a copy of your workout plans, completed
                    sessions, custom exercises, weight entries and
                    nutrition check-ins. Store it somewhere secure
                    before testing on another device.
                </p>

                <div class="backup-details">
                    <span>✓ One portable JSON file</span>
                    <span>✓ Works between phone and computer</span>
                    <span>✓ Stored only where you choose</span>
                </div>
            </div>

            <div class="backup-actions">

                <button
                    id="export-backup-btn"
                    class="primary-btn"
                    type="button"
                >
                    ↓ Export Backup
                </button>

                <button
                    id="import-backup-btn"
                    class="secondary-btn"
                    type="button"
                >
                    ↑ Restore Backup
                </button>

                <input
                    id="backup-file-input"
                    type="file"
                    accept=".json,application/json"
                    hidden
                >

                <span
                    id="backup-message"
                    class="backup-message"
                    aria-live="polite"
                ></span>

            </div>

        </section>


        <section class="section-card dashboard-drive">

            <div class="backup-icon drive-icon">
                G
            </div>

            <div class="backup-copy">

                <span class="eyebrow">
                    MULTI-DEVICE BETA
                </span>

                <h2>
                    Google Drive
                </h2>

                <p>
                    Connect your Google account to transfer Level Up
                    data between this device and your private app-data
                    folder in Google Drive.
                </p>

                <div class="drive-state-row">
                    <span
                        id="google-drive-status"
                        class="drive-status"
                    >
                        Not connected
                    </span>

                    <span id="google-drive-last-sync">
                        No Drive transfer completed on this device.
                    </span>
                </div>

                <p class="drive-safety-note">
                    Upload copies this device to Drive. Download replaces
                    this device with the Drive copy. Automatic merging is
                    intentionally disabled during the first beta.
                </p>

            </div>

            <div class="backup-actions drive-actions">

                <button
                    id="connect-google-drive"
                    class="primary-btn"
                    type="button"
                >
                    Connect Google Drive
                </button>

                <button
                    id="upload-google-drive"
                    class="secondary-btn"
                    type="button"
                    disabled
                >
                    ↑ Upload This Device
                </button>

                <button
                    id="download-google-drive"
                    class="secondary-btn"
                    type="button"
                    disabled
                >
                    ↓ Download to This Device
                </button>

                <button
                    id="disconnect-google-drive"
                    class="text-btn"
                    type="button"
                    hidden
                >
                    Disconnect
                </button>

                <span
                    id="google-drive-message"
                    class="backup-message"
                    aria-live="polite"
                ></span>

            </div>

        </section>


    `;

}


function renderLatestWorkout(
    session
) {

    const exercises =
        Array.isArray(
            session.exercises
        )
            ? session.exercises
            : [];


    const names =
        exercises
            .map(exercise =>
                getExerciseById(
                    exercise.exerciseId
                )?.name ||
                "Exercise"
            );


    return `
        <div class="latest-workout-title">

            <div class="latest-workout-icon">
                🏋️
            </div>

            <div>
                <h3>
                    ${escapeHtml(
                        session.planName ||
                        "Workout"
                    )}
                </h3>

                <p>
                    ${escapeHtml(
                        session.trainingDayName ||
                        "Training Day"
                    )}
                </p>
            </div>

        </div>

        <div class="latest-workout-stats">

            <div>
                <span>Exercises recorded</span>
                <strong>
                    ${countRecordedExercises(
                        session
                    )}
                </strong>
            </div>

            <div>
                <span>Completed sets</span>
                <strong>
                    ${countCompletedSets(
                        session
                    )}
                </strong>
            </div>

        </div>

        <div class="latest-exercise-list">
            ${names.length
                ? names.map(name => `
                    <span>
                        ${escapeHtml(name)}
                    </span>
                `).join("")
                : `
                    <span>
                        No exercise details
                    </span>
                `}
        </div>
    `;

}


function renderSessionRow(
    session
) {

    const setCount =
        countCompletedSets(
            session
        );


    const exerciseCount =
        countRecordedExercises(
            session
        );


    return `
        <article class="dashboard-session-row">

            <div class="session-date-badge">
                <strong>
                    ${formatDay(
                        session.date
                    )}
                </strong>
                <span>
                    ${formatMonth(
                        session.date
                    )}
                </span>
            </div>

            <div class="dashboard-session-name">
                <strong>
                    ${escapeHtml(
                        session.planName ||
                        "Workout"
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        session.trainingDayName ||
                        "Training Day"
                    )}
                </span>
            </div>

            <div class="dashboard-session-summary">
                <strong>
                    ${exerciseCount}
                    ${exerciseCount === 1
                        ? "exercise"
                        : "exercises"}
                </strong>

                <span>
                    ${setCount}
                    completed
                    ${setCount === 1
                        ? "set"
                        : "sets"}
                    ${formatSessionDuration(session)}
                </span>
            </div>

        </article>
    `;

}


function formatSessionDuration(session) {

    const milliseconds =
        Number(session?.durationMs) ||
        Number(session?.durationMinutes) * 60000;

    if (!(milliseconds > 0)) {
        return "";
    }

    const minutes =
        Math.max(1, Math.round(milliseconds / 60000));

    return ` • ${minutes} min`;

}


function countCompletedSets(
    session
) {

    return (
        session.exercises ||
        []
    )
    .reduce(
        (
            total,
            exercise
        ) =>
            total +
            (
                exercise.sets ||
                []
            )
            .filter(set =>
                set.weight !==
                    null ||
                set.reps !==
                    null
            )
            .length,
        0
    );

}


function countRecordedExercises(
    session
) {

    return (
        session.exercises ||
        []
    )
    .filter(exercise => {

        const hasSets =
            (
                exercise.sets ||
                []
            )
            .some(set =>
                set.weight !==
                    null ||
                set.reps !==
                    null
            );


        const hasNotes =
            Boolean(
                exercise.notes
                    ?.trim()
            );


        return hasSets ||
            hasNotes;

    })
    .length;

}


function getNutritionToday() {

    const data =
        getStoredObject(
            NUTRITION_STORAGE_KEY
        );


    const entry =
        data[
            getLocalDateValue()
        ];


    return {

        saved:
            Boolean(entry),

        completed:
            Array.isArray(
                entry?.habits
            )
                ? entry.habits.length
                : 0,

        notes:
            entry?.notes ||
            ""

    };

}


function getLatestRecordedWeight() {

    const entries =
        getStoredArray(
            WEIGHT_STORAGE_KEY
        )
        .map(entry => ({
            date:
                String(
                    entry?.date ||
                    ""
                ),
            weight:
                Number(
                    entry?.weight
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
                b.date.localeCompare(
                    a.date
                )
        );


    return entries[0]
        ?.weight ??
        null;

}


function getWaterRecordedToday() {

    const entry =
        getStoredArray(
            WATER_STORAGE_KEY
        )
        .find(item =>
            item?.date ===
                getLocalDateValue()
        );

    const amount =
        Number(entry?.amount);


    return Number.isFinite(amount) &&
        amount >= 0
            ? amount
            : null;

}


function getLatestSleepDuration() {

    const entry =
        getStoredArray(
            SLEEP_STORAGE_KEY
        )
        .filter(item =>
            item?.date &&
            Number.isFinite(
                Number(item.duration)
            )
        )
        .sort((a, b) =>
            String(b.date).localeCompare(
                String(a.date)
            )
        )[0];

    const duration =
        Number(entry?.duration);


    return Number.isFinite(duration)
        ? duration
        : null;

}


function formatSleepDuration(hours) {

    const minutes =
        Math.round(hours * 60);


    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

}


function getStoredArray(key) {

    try {

        const parsed =
            JSON.parse(
                localStorage.getItem(
                    key
                ) ||
                "[]"
            );


        return Array.isArray(
            parsed
        )
            ? parsed
            : [];

    }

    catch {

        return [];

    }

}


function getStoredObject(key) {

    try {

        const parsed =
            JSON.parse(
                localStorage.getItem(
                    key
                ) ||
                "{}"
            );


        return parsed &&
            typeof parsed ===
                "object" &&
            !Array.isArray(parsed)
                ? parsed
                : {};

    }

    catch {

        return {};

    }

}


function getSessionTime(
    session
) {

    const value =
        session.completedAt ||
        (
            session.date
                ? `${session.date}T12:00:00`
                : ""
        );


    const time =
        new Date(value)
            .getTime();


    return Number.isFinite(
        time
    )
        ? time
        : 0;

}


function renderEmptyState(
    title,
    detail
) {

    return `
        <div class="dashboard-empty">
            <span>＋</span>
            <strong>
                ${escapeHtml(title)}
            </strong>
            <p>
                ${escapeHtml(detail)}
            </p>
        </div>
    `;

}


function formatDate(value) {

    if (!value) {
        return "Unknown date";
    }


    return new Intl.DateTimeFormat(
        undefined,
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    )
    .format(
        new Date(
            `${value}T12:00:00`
        )
    );

}


function formatDay(value) {

    if (!value) {
        return "—";
    }


    return new Date(
        `${value}T12:00:00`
    )
    .getDate();

}


function formatMonth(value) {

    if (!value) {
        return "";
    }


    return new Intl.DateTimeFormat(
        undefined,
        {
            month: "short"
        }
    )
    .format(
        new Date(
            `${value}T12:00:00`
        )
    );

}


function getLocalDateValue() {

    const now =
        new Date();


    return new Date(
        now.getTime() -
        now.getTimezoneOffset() *
        60000
    )
    .toISOString()
    .slice(0, 10);

}


function escapeHtml(value) {

    return String(
        value ??
        ""
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
