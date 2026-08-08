import {
    renderPhotoJournal
}
from "./photo-journal.js";

import {
    renderSleepTracker
}
from "./sleep-tracker.js";


export function renderProgress() {

    return `

        <section class="section-card">

            <h2>📈 Progress</h2>

            <p class="section-description">
                Track body-weight trends and lifting performance over time.
            </p>


            <div class="progress-tabs">

                <button
                    class="progress-tab active"
                    id="weight-tab"
                    type="button"
                >
                    ⚖️ Weight
                </button>

                <button
                    class="progress-tab"
                    id="lifting-tab"
                    type="button"
                >
                    🏋️ Lifting
                </button>

                <button
                    class="progress-tab"
                    id="sleep-tab"
                    type="button"
                >
                    🌙 Sleep
                </button>

            </div>


            <div id="weight-progress">

                <div class="weight-section-header">

                    <h3>Weight Progress</h3>



                </div>


                <div class="weight-entry-card">

                    <label for="weight-date">
                        Date
                    </label>

                    <input
                        id="weight-date"
                        type="date"
                    >


                    <label for="daily-weight">
                        Weight (lb)
                    </label>

                    <input
                        id="daily-weight"
                        type="number"
                        step="0.1"
                        placeholder="Enter weight"
                    >


                    <button
                        id="save-weight-btn"
                        class="primary-btn"
                        type="button"
                    >
                        Save Weight
                    </button>

                </div>


                <div class="weight-summary">

                    <div class="metric-card">

                        <div>

                            <h3>Latest Weight</h3>

                            <p id="latest-weight">
                                --
                            </p>

                        </div>

                    </div>


                </div>


                <div class="weight-entry-card">

                    <label for="reference-weight">
                        Reference Weight (lb)
                    </label>

                    <input
                        id="reference-weight"
                        type="number"
                        step="0.1"
                        placeholder="Optional reference"
                    >

                    <button
                        id="save-reference-weight-btn"
                        class="secondary-btn"
                        type="button"
                    >
                        Save Reference
                    </button>

                </div>


                <div class="weight-chart-card">

                    <div class="chart-header">

                        <div>

                            <h3>Weight Trend</h3>

                            <p>
                                Daily measurements
                            </p>

                        </div>




                    </div>


                    <canvas
                        id="weight-chart"
                        width="800"
                        height="400"
                        aria-label="Weight progress chart"
                    ></canvas>

                </div>


                <div class="weight-history">

                    <h3>Weight History</h3>

                    <p class="weight-history-help">
                        The 7-Day Moving Average uses the current entry
                        and measurements from the six days immediately
                        before it.
                    </p>


                    <div class="weight-table">

                        <div class="weight-table-header">

                            <span>Date</span>

                            <span>Weight</span>

                            <span>7-Day Moving Average</span>

                            <span>Actions</span>

                        </div>


                        <div id="weight-history-list">

                            <p class="empty-state">
                                No weight entries yet.
                            </p>

                        </div>

                    </div>

                </div>


                ${renderPhotoJournal()}

            </div>


            <div id="sleep-progress" hidden>
                ${renderSleepTracker()}
            </div>


            <div
                id="lifting-progress"
                hidden
            >

                <div class="training-progress-header">

                    <div>

                        <h3>Training Progress</h3>

                        <p>
                            Review strength, training volume and completed sessions.
                        </p>

                    </div>

                    <div class="training-header-actions">

                        <label>
                            Date range

                            <select id="progress-range">
                                <option value="28">4 Weeks</option>
                                <option value="84" selected>12 Weeks</option>
                                <option value="180">6 Months</option>
                                <option value="0">All</option>
                            </select>
                        </label>

                        <button
                            id="load-training-demo"
                            class="secondary-btn"
                            type="button"
                        >
                            Load 12-Week Demo
                        </button>

                        <button
                            id="remove-training-demo"
                            class="secondary-btn"
                            type="button"
                        >
                            Remove Demo Data
                        </button>

                    </div>

                </div>


                <p
                    id="training-demo-message"
                    class="workout-message"
                    aria-live="polite"
                ></p>


                <div class="training-summary-grid">

                    <div class="training-summary-card">
                        <span>Workouts</span>
                        <strong id="progress-workout-count">0</strong>
                    </div>

                    <div class="training-summary-card">
                        <span>Working Sets</span>
                        <strong id="progress-set-count">0</strong>
                    </div>

                    <div class="training-summary-card">
                        <span>Exercises Tracked</span>
                        <strong id="progress-exercise-count">0</strong>
                    </div>

                    <div class="training-summary-card">
                        <span>Latest Session</span>
                        <strong id="progress-latest-session">Not started</strong>
                    </div>

                </div>


                <div class="training-progress-tabs">

                    <button
                        class="training-progress-tab active"
                        data-view="overview"
                        type="button"
                    >
                        Overview
                    </button>

                    <button
                        class="training-progress-tab"
                        data-view="exercises"
                        type="button"
                    >
                        Exercises
                    </button>

                    <button
                        class="training-progress-tab"
                        data-view="training"
                        type="button"
                    >
                        Training
                    </button>

                    <button
                        class="training-progress-tab"
                        data-view="history"
                        type="button"
                    >
                        History & Data
                    </button>

                </div>


                <section
                    class="training-progress-view"
                    data-view="overview"
                >

                    <div class="analytics-card">

                        <h4>Weekly Workouts</h4>

                        <canvas
                            id="weekly-workouts-chart"
                            class="training-chart"
                            aria-label="Weekly completed workouts"
                        ></canvas>

                    </div>

                    <div class="analytics-card">

                        <h4>Recent Estimated Strength Improvements</h4>

                        <p class="analytics-note">
                            Compares estimated one-rep max (1RM) from the
                            best logged set in each of the two latest workouts.
                            This is an estimate, not a tested maximum.
                        </p>

                        <div id="recent-improvements"></div>

                    </div>

                </section>


                <section
                    class="training-progress-view"
                    data-view="exercises"
                    hidden
                >

                    <div class="exercise-progress-controls">

                        <label>
                            Exercise

                            <select id="exercise-progress-select"></select>
                        </label>

                    </div>

                    <div class="analytics-card">

                        <h4 id="exercise-progress-title">
                            Exercise Progress
                        </h4>

                        <p class="analytics-note">
                            Y-axis: Epley estimated one-rep maximum in pounds.
                            Formula: weight × (1 + reps ÷ 30), using the best
                            completed set. It is an estimate, not a tested maximum.
                        </p>

                        <canvas
                            id="exercise-strength-chart"
                            class="training-chart"
                            aria-label="Estimated exercise strength"
                        ></canvas>

                    </div>

                    <div class="analytics-card">

                        <div class="exercise-history-header">
                            <span>Date</span>
                            <span>Best Set</span>
                            <span>Est. 1RM</span>
                            <span>Sets</span>
                        </div>

                        <div id="exercise-history-body"></div>

                    </div>

                </section>


                <section
                    class="training-progress-view"
                    data-view="training"
                    hidden
                >

                    <div class="analytics-card">

                        <h4>Weekly Working Sets</h4>

                        <canvas
                            id="weekly-sets-chart"
                            class="training-chart"
                            aria-label="Weekly working sets"
                        ></canvas>

                    </div>

                    <div class="analytics-card">

                        <h4>Sets by Muscle Group</h4>

                        <div id="muscle-distribution"></div>

                    </div>

                </section>


                <section
                    class="training-progress-view"
                    data-view="history"
                    hidden
                >

                    <div class="history-export-actions">

                        <button
                            id="export-workouts-csv"
                            class="secondary-btn"
                            type="button"
                        >
                            Export CSV
                        </button>

                        <button
                            id="export-workouts-json"
                            class="secondary-btn"
                            type="button"
                        >
                            Export JSON
                        </button>

                    </div>

                    <div id="workout-history-list"></div>

                </section>

            </div>

        </section>

    `;

}
