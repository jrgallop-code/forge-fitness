import {
    startPhase,
    endCurrentPhase,
    getCurrentPhase,
    getPhaseHistory
}
from "./phase-manager.js";


export function initializeGoals() {

    const startDate =
        document.getElementById(
            "phase-start-date"
        );


    if (startDate) {

        startDate.value =
            new Date()
                .toISOString()
                .split("T")[0];

    }


    document
        .getElementById(
            "start-phase-btn"
        )
        ?.addEventListener(
            "click",
            handleStartPhase
        );


    renderPhaseInformation();

}



function handleStartPhase() {

    const type =
        document.getElementById(
            "phase-type"
        )
        .value;


    const startDate =
        document.getElementById(
            "phase-start-date"
        )
        .value;


    const startWeight =
        numberOrNull(
            document.getElementById(
                "phase-start-weight"
            )
            .value
        );


    const targetWeight =
        numberOrNull(
            document.getElementById(
                "phase-target-weight"
            )
            .value
        );


    let targetRate =
        numberOrNull(
            document.getElementById(
                "phase-target-rate"
            )
            .value
        );


    if (type === "cut") {

        targetRate =
            targetRate === null
                ? null
                : -Math.abs(
                    targetRate
                );

    }


    if (type === "bulk") {

        targetRate =
            targetRate === null
                ? null
                : Math.abs(
                    targetRate
                );

    }


    if (type === "maintain") {

        targetRate =
            0;

    }


    try {

        startPhase({

            type,

            startDate,

            startWeight,

            targetWeight,

            targetRate

        });


        renderPhaseInformation();

    }

    catch (error) {

        showMessage(
            error.message
        );

    }

}



function handleEndPhase() {

    const current =
        getCurrentPhase();


    if (!current) {
        return;
    }


    const endWeightInput =
        document.getElementById(
            "phase-end-weight"
        );


    const endWeight =
        numberOrNull(
            endWeightInput?.value
        );


    endCurrentPhase({

        endDate:
            new Date()
                .toISOString()
                .split("T")[0],

        endWeight

    });


    renderPhaseInformation();

}



function renderPhaseInformation() {

    renderCurrentPhase();

    renderHistory();

}



function renderCurrentPhase() {

    const container =
        document.getElementById(
            "current-phase-panel"
        );


    const newPhasePanel =
        document.getElementById(
            "new-phase-panel"
        );


    if (!container) {
        return;
    }


    const phase =
        getCurrentPhase();


    if (!phase) {

        container.innerHTML = `

            <h3>
                Current Phase
            </h3>

            <p class="empty-state">
                No active phase.
            </p>

        `;


        if (newPhasePanel) {
            newPhasePanel.hidden = false;
        }


        return;

    }


    if (newPhasePanel) {
        newPhasePanel.hidden = true;
    }


    container.innerHTML = `

        <h3>
            Current Phase
        </h3>


        <div class="current-phase-card">

            <div class="phase-name">

                ${getPhaseIcon(
                    phase.type
                )}

                ${getPhaseName(
                    phase.type
                )}

            </div>


            <div class="phase-details">

                <p>
                    <span>
                        Started
                    </span>

                    <strong>
                        ${formatDate(
                            phase.startDate
                        )}
                    </strong>
                </p>


                <p>
                    <span>
                        Starting Weight
                    </span>

                    <strong>
                        ${
                            phase.startWeight !== null
                                ? `${phase.startWeight} lb`
                                : "--"
                        }
                    </strong>
                </p>


                <p>
                    <span>
                        Goal Weight
                    </span>

                    <strong>
                        ${
                            phase.targetWeight !== null
                                ? `${phase.targetWeight} lb`
                                : "--"
                        }
                    </strong>
                </p>


                <p>
                    <span>
                        Planned Rate
                    </span>

                    <strong>
                        ${
                            formatTargetRate(
                                phase.targetRate
                            )
                        }
                    </strong>
                </p>

            </div>


            <label for="phase-end-weight">
                Ending Weight
            </label>

            <input
                id="phase-end-weight"
                type="number"
                step="0.1"
                placeholder="Current weight"
            >


            <button
                id="end-phase-btn"
                class="secondary-btn"
                type="button"
            >
                End Phase
            </button>

        </div>

    `;


    document
        .getElementById(
            "end-phase-btn"
        )
        ?.addEventListener(
            "click",
            handleEndPhase
        );

}



function renderHistory() {

    const container =
        document.getElementById(
            "phase-history"
        );


    if (!container) {
        return;
    }


    const history =
        getPhaseHistory();


    if (!history.length) {

        container.innerHTML = `

            <p class="empty-state">
                No completed phases yet.
            </p>

        `;

        return;

    }


    container.innerHTML =
        [...history]
            .reverse()
            .map(
                phase => `

                    <div class="phase-history-row">

                        <div>

                            <strong>
                                ${getPhaseIcon(
                                    phase.type
                                )}
                                ${getPhaseName(
                                    phase.type
                                )}
                            </strong>

                            <span>
                                ${formatDate(
                                    phase.startDate
                                )}
                                →
                                ${formatDate(
                                    phase.endDate
                                )}
                            </span>

                        </div>


                        <div>

                            ${
                                getWeightChange(
                                    phase
                                )
                            }

                        </div>

                    </div>

                `
            )
            .join("");

}



function getWeightChange(
    phase
) {

    if (
        phase.startWeight === null ||
        phase.endWeight === null
    ) {

        return "--";

    }


    const change =
        phase.endWeight -
        phase.startWeight;


    const arrow =
        change < 0
            ? "↓"
            : change > 0
                ? "↑"
                : "→";


    return (
        `${arrow} ${Math.abs(change).toFixed(1)} lb`
    );

}



function getPhaseIcon(type) {

    if (type === "cut") {
        return "🔥";
    }


    if (type === "bulk") {
        return "💪";
    }


    return "⚖️";

}



function getPhaseName(type) {

    if (type === "cut") {
        return "Cut";
    }


    if (type === "bulk") {
        return "Lean Bulk";
    }


    return "Maintain";

}



function formatTargetRate(
    rate
) {

    if (
        rate === null ||
        !Number.isFinite(rate)
    ) {

        return "--";

    }


    if (rate < 0) {

        return (
            `↓ ${Math.abs(rate).toFixed(2)} lb/wk`
        );

    }


    if (rate > 0) {

        return (
            `↑ ${rate.toFixed(2)} lb/wk`
        );

    }


    return "Maintain";

}



function numberOrNull(
    value
) {

    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {

        return null;

    }


    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : null;

}



function formatDate(date) {

    if (!date) {
        return "--";
    }


    return new Date(
        `${date}T00:00:00`
    )
        .toLocaleDateString(
            undefined,
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );

}



function showMessage(message) {

    const element =
        document.getElementById(
            "phase-message"
        );


    if (element) {

        element.textContent =
            message;

    }

}