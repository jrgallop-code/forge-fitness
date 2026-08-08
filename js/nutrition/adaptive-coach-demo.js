const WEIGHT_STORAGE_KEY =
    "forge_weight_entries";

const DEMO_BACKUP_KEY =
    "level_up_weight_entries_before_coach_demo";

const DEMO_ACTIVE_KEY =
    "level_up_adaptive_coach_demo_active";


export function initializeAdaptiveCoachDemo() {
    const coachView =
        document.querySelector(
            '[data-planner-view="coach"]'
        );

    if (!coachView) {
        return;
    }

    if (!document.getElementById("adaptive-coach-demo-controls")) {
        coachView.insertAdjacentHTML(
            "afterbegin",
            `
                <div
                    id="adaptive-coach-demo-controls"
                    class="goal-box nutrition-goal-card"
                >
                    <span class="eyebrow">TEST MODE</span>
                    <h3>Adaptive Coach Demo</h3>
                    <p class="nutrition-message">
                        Load 20 days of sample weigh-ins trending downward at roughly 0.4 lb/week.
                        Your real Weight Tracker data is saved temporarily and restored when you remove the demo.
                    </p>

                    <div class="nutrition-target-actions">
                        <button
                            id="load-adaptive-coach-demo"
                            class="secondary-btn"
                            type="button"
                        >
                            Load 20-Day Demo
                        </button>

                        <button
                            id="remove-adaptive-coach-demo"
                            class="secondary-btn"
                            type="button"
                        >
                            Restore My Weight Data
                        </button>
                    </div>

                    <p
                        id="adaptive-coach-demo-message"
                        class="nutrition-message"
                        aria-live="polite"
                    ></p>
                </div>
            `
        );
    }

    document
        .getElementById("load-adaptive-coach-demo")
        ?.addEventListener(
            "click",
            loadAdaptiveCoachDemo
        );

    document
        .getElementById("remove-adaptive-coach-demo")
        ?.addEventListener(
            "click",
            removeAdaptiveCoachDemo
        );

    updateDemoMessage();
}


function loadAdaptiveCoachDemo() {
    if (
        localStorage.getItem(DEMO_ACTIVE_KEY) !== "true"
    ) {
        const existing =
            localStorage.getItem(
                WEIGHT_STORAGE_KEY
            );

        localStorage.setItem(
            DEMO_BACKUP_KEY,
            existing === null
                ? "__NO_WEIGHT_DATA__"
                : existing
        );
    }

    const demoEntries =
        createDemoEntries();

    localStorage.setItem(
        WEIGHT_STORAGE_KEY,
        JSON.stringify(demoEntries)
    );

    localStorage.setItem(
        DEMO_ACTIVE_KEY,
        "true"
    );

    setMessage(
        "Loaded 20 demo weigh-ins at about −0.4 lb/week. If your selected goal is Moderate Fat Loss (−1.0 lb/week), the coach should detect that progress is slower than target and suggest a calorie reduction."
    );

    notifyWeightDataChanged();
}


function removeAdaptiveCoachDemo() {
    const backup =
        localStorage.getItem(
            DEMO_BACKUP_KEY
        );

    if (backup === null) {
        setMessage(
            "No saved pre-demo weight data was found."
        );
        return;
    }

    if (backup === "__NO_WEIGHT_DATA__") {
        localStorage.removeItem(
            WEIGHT_STORAGE_KEY
        );
    }
    else {
        localStorage.setItem(
            WEIGHT_STORAGE_KEY,
            backup
        );
    }

    localStorage.removeItem(
        DEMO_BACKUP_KEY
    );

    localStorage.removeItem(
        DEMO_ACTIVE_KEY
    );

    setMessage(
        "Demo removed. Your previous Weight Tracker data has been restored."
    );

    notifyWeightDataChanged();
}


function createDemoEntries() {
    const today =
        new Date();

    today.setHours(0, 0, 0, 0);

    const profileWeight =
        getProfileWeight();

    const startWeight =
        Number.isFinite(profileWeight)
            ? profileWeight + 0.55
            : 160.0;

    // The underlying trend is -0.4 lb/week. Small deterministic fluctuations
    // make the data look like real daily scale readings without changing the trend much.
    const dailyTrend =
        -0.4 / 7;

    const noise = [
        0.10,
        -0.04,
        0.07,
        -0.08,
        0.03,
        0.12,
        -0.10,
        0.05,
        -0.03,
        0.08,
        -0.09,
        0.02,
        0.10,
        -0.07,
        0.04,
        -0.05,
        0.06,
        -0.08,
        0.03,
        -0.04
    ];

    return Array.from(
        { length: 20 },
        (_, index) => {
            const date =
                new Date(today);

            date.setDate(
                today.getDate() -
                (19 - index)
            );

            const weight =
                startWeight +
                (dailyTrend * index) +
                noise[index];

            return {
                date: formatLocalDate(date),
                weight:
                    Number(
                        weight.toFixed(1)
                    ),
                demo:
                    "adaptive-coach"
            };
        }
    );
}


function getProfileWeight() {
    try {
        const profile =
            JSON.parse(
                localStorage.getItem(
                    "level_up_nutrition_profile"
                ) ||
                "null"
            );

        const weight =
            Number(
                profile?.weightLb
            );

        return Number.isFinite(weight) &&
            weight > 0
                ? weight
                : null;
    }
    catch {
        return null;
    }
}


function formatLocalDate(date) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function notifyWeightDataChanged() {
    window.dispatchEvent(
        new CustomEvent(
            "levelup:nutrition-updated"
        )
    );
}


function updateDemoMessage() {
    if (
        localStorage.getItem(DEMO_ACTIVE_KEY) === "true"
    ) {
        setMessage(
            "Demo mode is active. The Adaptive Coach is currently using the 20-day sample trend."
        );
    }
}


function setMessage(message) {
    const element =
        document.getElementById(
            "adaptive-coach-demo-message"
        );

    if (element) {
        element.textContent =
            message;
    }
}
