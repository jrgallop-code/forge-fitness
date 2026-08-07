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

            </div>


            <div id="weight-progress">

                <div class="weight-section-header">

                    <h3>Weight Progress</h3>

                    <button
                        id="load-demo-weight-btn"
                        class="secondary-btn"
                        type="button"
                    >
                        📊 Load Demo Data
                    </button>

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


                    <div class="metric-card">

                        <div>

                            <h3>7-Day Trend</h3>

                            <p id="weight-trend">
                                --
                            </p>

                        </div>

                    </div>

                </div>


                <div class="weight-chart-card">

                    <div class="chart-header">

                        <div>

                            <h3>Weight Trend</h3>

                            <p>
                                Daily measurements and smoothed trend
                            </p>

                        </div>


                        <div class="chart-rate-summary">

                            <div class="rate-stat">

                                <span>
                                    Weekly Change
                                </span>

                                <strong id="current-weekly-rate">
                                    --
                                </strong>

                            </div>


                            <div class="rate-stat">

                                <span>
                                    Overall Rate
                                </span>

                                <strong id="overall-weight-rate">
                                    --
                                </strong>

                            </div>

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


                    <div class="weight-table">

                        <div class="weight-table-header">

                            <span>Date</span>

                            <span>Weight</span>

                            <span>Trend</span>

                            <span>Weekly Rate</span>

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

                <h3>Lifting Progress</h3>

                <p class="empty-state">
                    Exercise progression analytics will be added here next.
                </p>

            </div>

        </section>

    `;

}