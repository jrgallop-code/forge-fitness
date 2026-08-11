const PROFILE_KEY = "level_up_nutrition_profile";

export function renderBmiCard() {
    return `
        <section class="section-card bmi-index-card" aria-labelledby="bmi-index-title">
            <div class="bmi-index-header">
                <div>
                    <span class="eyebrow">BODY MASS INDEX</span>
                    <h3 id="bmi-index-title">BMI</h3>
                </div>
                <div class="bmi-index-value" data-bmi-value>--</div>
            </div>

            <div class="bmi-gauge" data-bmi-gauge aria-label="BMI scale">
                <svg viewBox="0 0 240 132" role="img" aria-hidden="true">
                    <path class="bmi-gauge-track" d="M28 112 A92 92 0 0 1 212 112" pathLength="100" />
                    <path class="bmi-gauge-segment bmi-under" d="M28 112 A92 92 0 0 1 212 112" pathLength="100" stroke-dasharray="17.5 82.5" stroke-dashoffset="0" />
                    <path class="bmi-gauge-segment bmi-healthy" d="M28 112 A92 92 0 0 1 212 112" pathLength="100" stroke-dasharray="32.5 67.5" stroke-dashoffset="-17.5" />
                    <path class="bmi-gauge-segment bmi-over" d="M28 112 A92 92 0 0 1 212 112" pathLength="100" stroke-dasharray="25 75" stroke-dashoffset="-50" />
                    <path class="bmi-gauge-segment bmi-obesity" d="M28 112 A92 92 0 0 1 212 112" pathLength="100" stroke-dasharray="25 75" stroke-dashoffset="-75" />
                    <g class="bmi-gauge-pointer" data-bmi-pointer transform="rotate(-90 120 112)">
                        <line x1="120" y1="112" x2="120" y2="35" />
                        <circle cx="120" cy="112" r="7" />
                    </g>
                </svg>
            </div>

            <div class="bmi-scale-labels" aria-hidden="true">
                <span>Under 18.5</span><span>18.5–24.9</span><span>25–29.9</span><span>30+</span>
            </div>

            <div class="bmi-index-result">
                <strong data-bmi-category>Save Body Profile to calculate BMI</strong>
                <small data-bmi-detail>Source: Body Profile height and weight.</small>
            </div>

            <p class="bmi-index-note">BMI is an adult screening measure based on height and weight. It does not directly measure body composition or diagnose health.</p>
        </section>
    `;
}

export function initializeBmiCard() {
    const card = document.querySelector(".bmi-index-card");
    if (!card) return;

    const profile = readProfile();
    const bmi = calculateBmi(profile);
    const value = card.querySelector("[data-bmi-value]");
    const category = card.querySelector("[data-bmi-category]");
    const detail = card.querySelector("[data-bmi-detail]");
    const pointer = card.querySelector("[data-bmi-pointer]");

    if (!Number.isFinite(bmi)) {
        if (value) value.textContent = "--";
        if (category) category.textContent = "Save Body Profile to calculate BMI";
        if (detail) detail.textContent = "Source: Body Profile height and weight.";
        if (pointer) pointer.style.opacity = "0";
        return;
    }

    if (value) value.textContent = bmi.toFixed(1);
    if (category) category.textContent = getCategory(bmi);
    if (detail) detail.textContent = "Calculated from your saved Body Profile height and weight.";
    if (pointer) {
        pointer.style.opacity = "1";
        pointer.setAttribute("transform", `rotate(${bmiToAngle(bmi)} 120 112)`);
    }
}

function readProfile() {
    try {
        return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    } catch {
        return null;
    }
}

function calculateBmi(profile) {
    if (!profile) return null;
    const weightLb = Number(profile.weightLb ?? (Number(profile.weightKg) / 0.45359237));
    const heightCm = Number(profile.heightCm ?? (((Number(profile.heightFeet) || 0) * 12 + (Number(profile.heightInches) || 0)) * 2.54));
    const heightM = heightCm / 100;
    if (!Number.isFinite(weightLb) || weightLb <= 0 || !Number.isFinite(heightM) || heightM <= 0) return null;
    return (weightLb * 0.45359237) / (heightM * heightM);
}

function getCategory(bmi) {
    if (bmi < 18.5) return "Underweight range";
    if (bmi < 25) return "Healthy weight range";
    if (bmi < 30) return "Overweight range";
    return "Obesity range";
}

function bmiToAngle(bmi) {
    const min = 15;
    const max = 35;
    const clamped = Math.min(max, Math.max(min, bmi));
    return -90 + ((clamped - min) / (max - min)) * 180;
}
