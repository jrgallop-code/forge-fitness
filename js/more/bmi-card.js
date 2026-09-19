const PROFILE_KEY = "level_up_nutrition_profile";
const CDC_BMI_URL = "https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html";
const NHLBI_BMI_URL = "https://www.nhlbi.nih.gov/calculate-your-bmi";

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
                <small data-bmi-detail>Calculated from the height and weight saved in Body Profile.</small>
            </div>

            <section class="bmi-method-card" aria-labelledby="bmi-method-title">
                <span class="eyebrow">CALCULATION</span>
                <h4 id="bmi-method-title">How this result is calculated</h4>
                <p class="bmi-formula"><span>BMI</span><strong>weight (kg) ÷ height² (m²)</strong></p>
                <p>Level Up converts the height and weight saved in Body Profile to metric units, then applies this formula.</p>
            </section>

            <section class="bmi-reference-card" aria-labelledby="bmi-reference-title">
                <span class="eyebrow">SOURCES &amp; LIMITATIONS</span>
                <h4 id="bmi-reference-title">Adult BMI reference ranges</h4>
                <p class="bmi-reference-intro">The ranges shown above follow CDC categories for adults age 20 and older.</p>
                <div class="bmi-reference-table" role="table" aria-label="Adult BMI categories">
                    <div role="row"><span role="cell">Underweight</span><strong role="cell">Below 18.5</strong></div>
                    <div role="row"><span role="cell">Healthy weight</span><strong role="cell">18.5–24.9</strong></div>
                    <div role="row"><span role="cell">Overweight</span><strong role="cell">25.0–29.9</strong></div>
                    <div role="row"><span role="cell">Obesity</span><strong role="cell">30.0 or greater</strong></div>
                </div>
                <div class="bmi-medical-notice" role="note">
                    <strong>Screening measure, not a diagnosis</strong>
                    <p>BMI does not directly measure body fat or distinguish fat, muscle and bone. It is one potential health indicator and should be considered with other factors.</p>
                    <p>Do not use this result to make medical decisions. If you have questions about your BMI or health, consult a qualified healthcare professional.</p>
                </div>
                <div class="bmi-source-links" aria-label="BMI medical sources">
                    <a href="${CDC_BMI_URL}" target="_blank" rel="noopener noreferrer">CDC: Adult BMI Categories <span aria-hidden="true">↗</span></a>
                    <a href="${NHLBI_BMI_URL}" target="_blank" rel="noopener noreferrer">NIH/NHLBI: Calculate Your BMI <span aria-hidden="true">↗</span></a>
                </div>
            </section>
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
        if (detail) detail.textContent = "Calculated from the height and weight saved in Body Profile.";
        if (pointer) pointer.style.opacity = "0";
        return;
    }

    if (value) value.textContent = bmi.toFixed(1);
    if (category) category.textContent = getCategory(bmi);
    if (detail) detail.textContent = "Calculated from your saved Body Profile using weight (kg) ÷ height² (m²).";
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
