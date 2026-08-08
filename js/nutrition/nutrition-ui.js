const NUTRITION_STORAGE_KEY =
    "level_up_nutrition_habits";


const HABITS = [
    {
        id: "vegetables-fruit",
        icon: "🥦",
        label: "Included vegetables or fruit",
        help: "Aim for variety across meals. Fresh, frozen, canned and dried foods can all contribute."
    },
    {
        id: "protein-food",
        icon: "🥚",
        label: "Included a protein food",
        help: "Examples include beans, lentils, tofu, eggs, fish, poultry, yogurt, nuts and seeds."
    },
    {
        id: "whole-grain",
        icon: "🌾",
        label: "Included a whole-grain food",
        help: "Examples include oats, brown or wild rice, quinoa, whole-grain bread and whole-grain pasta."
    },
    {
        id: "water",
        icon: "💧",
        label: "Made water an easy choice",
        help: "Keep water accessible and drink regularly, especially around activity and warm weather."
    },
    {
        id: "training-fuel",
        icon: "⚡",
        label: "Ate around training when needed",
        help: "A familiar meal or snack before or after activity can support energy and recovery."
    },
    {
        id: "regular-meals",
        icon: "🕒",
        label: "Ate regularly and noticed hunger",
        help: "Use appetite, energy, training demands and your normal routine as practical cues."
    }
];


export function renderNutrition() {

    return `
        <section class="nutrition-page">

            <article class="nutrition-hero-card">

                <img
                    src="assets/nutrition-hero.svg"
                    alt="Balanced meal with salmon, whole grains, vegetables, fruit and water"
                >

                <div class="nutrition-hero-overlay">

                    <span class="eyebrow">
                        EVERYDAY NUTRITION
                    </span>

                    <h2>
                        Build meals that support your day
                    </h2>

                    <p>
                        A practical guide to variety, energy,
                        training recovery and enjoyable eating.
                    </p>

                </div>

            </article>


            <article class="section-card nutrition-intro">

                <div>

                    <span class="eyebrow">
                        CANADA'S FOOD GUIDE
                    </span>

                    <h2>
                        A simple way to build a balanced plate
                    </h2>

                    <p>
                        Use the plate as a flexible visual guide—not a rule
                        or a measure of how much you must eat. Individual
                        needs vary from day to day.
                    </p>

                </div>

                <div
                    class="plate-guide"
                    role="img"
                    aria-label="Half vegetables and fruit, one quarter protein foods, and one quarter whole-grain foods"
                >

                    <div class="plate-half">
                        <strong>½</strong>
                        <span>Vegetables & fruit</span>
                    </div>

                    <div class="plate-quarter protein">
                        <strong>¼</strong>
                        <span>Protein foods</span>
                    </div>

                    <div class="plate-quarter grains">
                        <strong>¼</strong>
                        <span>Whole grains</span>
                    </div>

                </div>

            </article>


            <section class="nutrition-food-grid">

                <article class="nutrition-food-card vegetables">
                    <span class="nutrition-card-icon">🥬</span>
                    <h3>Vegetables & fruit</h3>
                    <p>
                        Provide fibre and a range of vitamins and minerals.
                        Different colours often bring different nutrients.
                    </p>
                    <strong>Try:</strong>
                    <span>
                        Berries, apples, leafy greens, broccoli,
                        carrots, tomatoes and frozen vegetables.
                    </span>
                </article>

                <article class="nutrition-food-card protein">
                    <span class="nutrition-card-icon">🫘</span>
                    <h3>Protein foods</h3>
                    <p>
                        Protein foods provide building blocks used throughout
                        the body and can be included across regular meals.
                    </p>
                    <strong>Try:</strong>
                    <span>
                        Beans, lentils, tofu, eggs, fish, poultry,
                        yogurt, nuts and seeds.
                    </span>
                </article>

                <article class="nutrition-food-card grains">
                    <span class="nutrition-card-icon">🌾</span>
                    <h3>Whole-grain foods</h3>
                    <p>
                        Carbohydrate-containing foods help provide energy for
                        everyday activity and training.
                    </p>
                    <strong>Try:</strong>
                    <span>
                        Oats, quinoa, brown rice, whole-grain bread
                        and whole-grain pasta.
                    </span>
                </article>

                <article class="nutrition-food-card fats">
                    <span class="nutrition-card-icon">🥑</span>
                    <h3>Unsaturated fats</h3>
                    <p>
                        Dietary fats help with normal body functions and make
                        meals satisfying and flavourful.
                    </p>
                    <strong>Try:</strong>
                    <span>
                        Avocado, nuts, seeds, olive or canola oil,
                        and fatty fish.
                    </span>
                </article>

            </section>


            <article class="section-card nutrition-habits-card">

                <div class="nutrition-section-heading">

                    <div>
                        <span class="eyebrow">
                            DAILY CHECK-IN
                        </span>
                        <h2>Focus on helpful habits</h2>
                        <p>
                            This checklist tracks variety and routine—not
                            calories, body weight or perfect eating.
                        </p>
                    </div>

                    <label class="nutrition-date-label">
                        Date
                        <input
                            id="nutrition-date"
                            type="date"
                        >
                    </label>

                </div>

                <div id="nutrition-habit-list" class="nutrition-habit-list">

                    ${HABITS.map(habit => `
                        <label class="nutrition-habit">
                            <input
                                type="checkbox"
                                value="${habit.id}"
                            >
                            <span class="habit-check"></span>
                            <span class="habit-icon">
                                ${habit.icon}
                            </span>
                            <span>
                                <strong>
                                    ${habit.label}
                                </strong>
                                <small>
                                    ${habit.help}
                                </small>
                            </span>
                        </label>
                    `).join("")}

                </div>

                <label class="nutrition-notes-label">
                    Meal, energy or recovery notes
                    <textarea
                        id="nutrition-notes"
                        placeholder="Example: Foods I enjoyed, how training felt, meal ideas for next time, or anything I want to remember."
                    ></textarea>
                </label>

                <div class="nutrition-save-row">
                    <button
                        id="save-nutrition-btn"
                        class="primary-btn"
                        type="button"
                    >
                        Save Daily Check-In
                    </button>

                    <span
                        id="nutrition-message"
                        class="nutrition-message"
                        aria-live="polite"
                    ></span>
                </div>

            </article>


            <section class="nutrition-tip-grid">

                <article class="nutrition-tip-card">
                    <span>🏋️</span>
                    <div>
                        <h3>Training days</h3>
                        <p>
                            Familiar foods, regular meals and enough fluids
                            can help you arrive at training ready to move.
                            Avoid experimenting with unfamiliar foods just
                            before a hard session.
                        </p>
                    </div>
                </article>

                <article class="nutrition-tip-card">
                    <span>🛌</span>
                    <div>
                        <h3>Recovery is bigger than one meal</h3>
                        <p>
                            Overall eating patterns, sleep, rest and consistent
                            training work together. One food or supplement does
                            not determine progress.
                        </p>
                    </div>
                </article>

                <article class="nutrition-tip-card">
                    <span>🛒</span>
                    <div>
                        <h3>Make useful foods convenient</h3>
                        <p>
                            Keep a few easy options available: fruit, yogurt,
                            eggs, hummus, frozen vegetables, oats, whole-grain
                            bread, beans and nuts.
                        </p>
                    </div>
                </article>

                <article class="nutrition-tip-card">
                    <span>🌱</span>
                    <div>
                        <h3>Variety matters</h3>
                        <p>
                            Rotate foods you enjoy rather than searching for
                            one “perfect” meal. Cultural and family foods can
                            fit into a balanced eating pattern.
                        </p>
                    </div>
                </article>

            </section>


            <article class="nutrition-evidence-card">

                <div>
                    <span class="eyebrow">
                        LEARN MORE
                    </span>
                    <h2>Reliable nutrition information</h2>
                    <p>
                        These resources explain the recommendations in more
                        detail. For individual needs, allergies, medical
                        conditions or performance planning, talk with a
                        registered dietitian or healthcare professional.
                    </p>
                </div>

                <div class="nutrition-resource-links">
                    <a
                        href="https://www.canada.ca/en/health-canada/services/food-guide/eating-support/cooking/make-healthy-meals-plate.html"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Canada's food guide plate
                        <span>↗</span>
                    </a>

                    <a
                        href="https://www.canada.ca/en/health-canada/services/food-guide/explore/healthy-eating-recommendations/eat-variety/eat-proteins.html"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Health Canada: protein foods
                        <span>↗</span>
                    </a>

                    <a
                        href="https://www.canada.ca/en/health-canada/services/food-guide/explore/snapshot.html"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Food guide snapshot
                        <span>↗</span>
                    </a>
                </div>

            </article>

        </section>
    `;

}


export function initializeNutrition() {

    const dateInput =
        document.getElementById(
            "nutrition-date"
        );


    if (!dateInput) {
        return;
    }


    dateInput.value =
        getLocalDateValue();


    dateInput.addEventListener(
        "change",
        loadSelectedDay
    );


    document
        .getElementById(
            "save-nutrition-btn"
        )
        ?.addEventListener(
            "click",
            saveSelectedDay
        );


    loadSelectedDay();

}


function loadSelectedDay() {

    const date =
        document.getElementById(
            "nutrition-date"
        )?.value;


    const saved =
        getNutritionData()[date] ||
        {
            habits: [],
            notes: ""
        };


    document
        .querySelectorAll(
            "#nutrition-habit-list input[type='checkbox']"
        )
        .forEach(checkbox => {

            checkbox.checked =
                saved.habits.includes(
                    checkbox.value
                );

        });


    const notes =
        document.getElementById(
            "nutrition-notes"
        );


    if (notes) {
        notes.value =
            saved.notes ||
            "";
    }


    setMessage("");

}


function saveSelectedDay() {

    const date =
        document.getElementById(
            "nutrition-date"
        )?.value;


    if (!date) {
        setMessage(
            "Choose a date first."
        );
        return;
    }


    const data =
        getNutritionData();


    data[date] = {

        habits:
            [
                ...document.querySelectorAll(
                    "#nutrition-habit-list input:checked"
                )
            ]
            .map(input =>
                input.value
            ),

        notes:
            document.getElementById(
                "nutrition-notes"
            )
            ?.value
            .trim() ||
            ""

    };


    localStorage.setItem(
        NUTRITION_STORAGE_KEY,
        JSON.stringify(data)
    );


    setMessage(
        "Daily check-in saved."
    );

}


function getNutritionData() {

    try {

        const stored =
            JSON.parse(
                localStorage.getItem(
                    NUTRITION_STORAGE_KEY
                ) ||
                "{}"
            );


        return stored &&
            typeof stored ===
                "object" &&
            !Array.isArray(stored)
                ? stored
                : {};

    }

    catch {

        return {};

    }

}


function setMessage(value) {

    const message =
        document.getElementById(
            "nutrition-message"
        );


    if (message) {
        message.textContent =
            value;
    }

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
