
import {
    getCurrentPhase,
    getPhaseForDate
}
from "../goals/phase-manager.js";

const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";


const WEIGHT_RESET_KEY =
    "level_up_weight_reset_2026_08_07";


let editingWeightDate =
    null;


export function initializeWeightTracker() {

    clearExistingWeightDataOnce();


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



function clearExistingWeightDataOnce() {

    if (
        localStorage.getItem(
            WEIGHT_RESET_KEY
        )
    ) {

        return;

    }


    localStorage.removeItem(
        WEIGHT_STORAGE_KEY
    );


    localStorage.setItem(
        WEIGHT_RESET_KEY,
        "complete"
    );

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



















function updateWeightDisplay() {

    const entries =
        getWeightEntries();


    const regression =
        calculateLinearRegression(
            entries
        );


    updateSummary(
        entries
    );


    updateHistory(
        entries
    );


    drawWeightChart(
        entries,
        regression.points
    );

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
    entries
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
