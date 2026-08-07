export function renderGoals() {

    return `

        <section class="section-card">

            <h2>
                🎯 Goals & Phases
            </h2>

            <p class="section-description">
                Organize your training into phases.
                Completed phases remain in your history.
            </p>


            <div
                id="current-phase-panel"
                class="phase-panel"
            ></div>


            <div
                id="new-phase-panel"
                class="phase-panel"
            >

                <h3>
                    Start New Phase
                </h3>


                <label for="phase-type">
                    Phase
                </label>

                <select id="phase-type">

                    <option value="maintain">
                        ⚖️ Maintain
                    </option>

                    <option value="cut">
                        🔥 Cut
                    </option>

                    <option value="bulk">
                        💪 Lean Bulk
                    </option>

                </select>


                <label for="phase-start-date">
                    Start Date
                </label>

                <input
                    id="phase-start-date"
                    type="date"
                >


                <label for="phase-start-weight">
                    Starting Weight (optional)
                </label>

                <input
                    id="phase-start-weight"
                    type="number"
                    step="0.1"
                    placeholder="lb"
                >


                <div id="adult-phase-options">

                    <label for="phase-target-weight">
                        Goal Weight (optional)
                    </label>

                    <input
                        id="phase-target-weight"
                        type="number"
                        step="0.1"
                        placeholder="lb"
                    >


                    <label for="phase-target-rate">
                        Planned Weekly Change (optional)
                    </label>

                    <input
                        id="phase-target-rate"
                        type="number"
                        step="0.05"
                        placeholder="Example: 0.3"
                    >

                </div>


                <button
                    id="start-phase-btn"
                    class="primary-btn"
                    type="button"
                >
                    Start Phase
                </button>


                <div
                    id="phase-message"
                    aria-live="polite"
                ></div>

            </div>


            <div class="phase-panel">

                <h3>
                    Phase History
                </h3>

                <div id="phase-history">

                    <p class="empty-state">
                        No completed phases yet.
                    </p>

                </div>

            </div>

        </section>

    `;

}