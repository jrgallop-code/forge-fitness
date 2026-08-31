import { renderCalorieStats } from "../nutrition/calorie-stats.js?v=shared-live-trend-1";

export function renderProgress() {

    return `

        <section class="section-card">

            <h2>📈 Progress</h2>

            <p class="section-description">
                Track body weight, lifting, nutrition, cardio and progress photos over time.
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
                    id="nutrition-progress-tab"
                    type="button"
                >
                    Nutrition
                </button>

                <button
                    class="progress-tab"
                    id="cardio-progress-tab"
                    type="button"
                >
                    Cardio
                </button>

                <button
                    class="progress-tab"
                    id="photo-log-tab"
                    type="button"
                >
                    Photo Log
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

                            <span class="weight-chart-kicker">
                                7-DAY ROLLING AVERAGE
                            </span>

                            <h3>Weight Trend</h3>

                            <p>
                                Daily measurements · smoothed trend
                            </p>

                        </div>

                    </div>

                    <div class="weight-chart-period-summary" aria-live="polite">

                        <div class="weight-chart-period-stat">
                            <small>Average</small>
                            <strong data-weight-chart-average>—</strong>
                        </div>

                        <div class="weight-chart-period-stat">
                            <small>Change</small>
                            <strong data-weight-chart-change>—</strong>
                        </div>

                        <div class="weight-chart-period-dates" data-weight-chart-period>—</div>

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

                            <span>Moving Average</span>

                            <span>Weekly Trend</span>

                            <span>Actions</span>

                        </div>


                        <div id="weight-history-list">

                            <p class="empty-state">
                                No weight entries yet.
                            </p>

                        </div>

                    </div>

                </div>


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

                        <input id="progress-range" type="hidden" value="70">

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

                </div>


                <section
                    class="training-progress-view"
                    data-view="overview"
                >

                    <div class="analytics-card">

                        <span class="training-chart-kicker">Training frequency</span>
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

                        <div class="exercise-metric-controls" aria-label="Exercise progress metric">
                            <button type="button" data-exercise-metric="volume" aria-pressed="true">Session Volume</button>
                            <button type="button" data-exercise-metric="strength" aria-pressed="false">Estimated 1RM</button>
                        </div>

                        <div class="exercise-volume-comparison" id="exercise-volume-comparison" aria-live="polite"></div>

                        <p class="analytics-note exercise-chart-note" id="exercise-progress-note">
                            Working-set load: weight × reps.
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
                            <span>Volume</span>
                            <span>Change</span>
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

                        <span class="training-chart-kicker">Training volume</span>
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


            </div>

            <div id="calorie-progress" hidden>
                ${renderCalorieStats()}
            </div>

            <div id="cardio-progress" hidden>
                <section class="cardio-progress-shell">
                    <header class="cardio-progress-header">
                        <div>
                            <span class="eyebrow">CARDIO</span>
                            <h3>Cardio Progress</h3>
                            <p>See how your endurance work, speed and effort change over time.</p>
                        </div>
                        <div class="cardio-range-tabs" aria-label="Cardio date range">
                            <button type="button" data-cardio-range="7" aria-pressed="false">7D</button>
                            <button type="button" data-cardio-range="28" class="active" aria-pressed="true">4W</button>
                            <button type="button" data-cardio-range="84" aria-pressed="false">12W</button>
                            <button type="button" data-cardio-range="0" aria-pressed="false">All</button>
                        </div>
                    </header>

                    <div class="cardio-summary-grid">
                        <article class="cardio-summary-card"><span>Duration</span><strong data-cardio-duration>0 min</strong><small>Total cardio time</small></article>
                        <article class="cardio-summary-card"><span>Sessions</span><strong data-cardio-sessions>0</strong><small>Completed entries</small></article>
                        <article class="cardio-summary-card"><span>Distance</span><strong data-cardio-distance>0 mi</strong><small>Recorded distance</small></article>
                        <article class="cardio-summary-card"><span>Avg speed</span><strong data-cardio-speed>—</strong><small>Distance ÷ time</small></article>
                        <article class="cardio-summary-card"><span>Cardio load</span><strong data-cardio-load>—</strong><small data-cardio-load-note>Minutes × RPE</small></article>
                    </div>

                    <p class="cardio-empty-note" data-cardio-empty>Complete a cardio workout to populate these analytics. Your existing lifting history is unchanged.</p>

                    <div class="cardio-chart-grid">
                        <article class="cardio-analytics-card">
                            <span class="training-chart-kicker">Training frequency</span>
                            <h4>Weekly Cardio Minutes</h4>
                            <p>Duration completed each week.</p>
                            <div class="cardio-weekly-chart" data-cardio-weekly></div>
                        </article>
                        <article class="cardio-analytics-card">
                            <span class="training-chart-kicker">Performance trend</span>
                            <h4>Average Speed</h4>
                            <p>Sessions with both time and distance.</p>
                            <div class="cardio-trend-chart" data-cardio-trend></div>
                        </article>
                    </div>

                    <article class="cardio-analytics-card">
                        <span class="training-chart-kicker">Activity mix</span>
                        <h4>Minutes by Activity</h4>
                        <p>See where your cardio time is going.</p>
                        <div class="cardio-activity-list" data-cardio-activities></div>
                    </article>

                    <article class="cardio-analytics-card">
                        <span class="training-chart-kicker">Workout history</span>
                        <h4>Recent Cardio</h4>
                        <div class="cardio-recent-list" data-cardio-recent></div>
                    </article>
                </section>
            </div>

            <div id="photo-log-progress" hidden>
                <section class="photo-log-coming-soon">
                    <span class="eyebrow">PHOTO LOG</span>
                    <div class="photo-log-placeholder-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M4 7.5h3l1.2-2h7.6l1.2 2h3v11H4v-11Z"/><circle cx="12" cy="13" r="3.2"/></svg>
                    </div>
                    <h3>Photo Log Coming Soon</h3>
                    <p>A dedicated place for organizing photo records is planned for a future update.</p>
                </section>
            </div>

        </section>

    `;

}
