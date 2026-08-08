import { ACTIVITY_LEVELS } from "./tdee-calculator.js";

export function renderNutrition() {
    return `
        <section class="section-card nutrition-page">
            <div class="nutrition-header">
                <div>
                    <p class="eyebrow">NUTRITION</p>
                    <h2>Energy Estimate</h2>
                    <p class="section-description">
                        Estimate your resting energy needs and daily maintenance calories.
                    </p>
                </div>
            </div>

            <div class="nutrition-panel">
                <h3>Nutrition Profile</h3>
                <p class="nutrition-help">
                    Enter your information below. This calculator is intended for adults 18+.
                </p>

                <div class="nutrition-form-grid">
                    <label>
                        Age
                        <input id="nutrition-age" type="number" min="18" max="100" inputmode="numeric" placeholder="Age">
                    </label>

                    <label>
                        Sex used for equation
                        <select id="nutrition-sex">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </label>

                    <label>
                        Height (inches)
                        <input id="nutrition-height" type="number" min="48" max="96" step="0.1" inputmode="decimal" placeholder="Height">
                    </label>

                    <label>
                        Weight (lb)
                        <input id="nutrition-weight" type="number" min="70" max="700" step="0.1" inputmode="decimal" placeholder="Weight">
                    </label>
                </div>

                <label class="nutrition-activity-label">
                    Activity Level
                    <select id="nutrition-activity">
                        ${Object.entries(ACTIVITY_LEVELS).map(([key, level]) => `
                            <option value="${key}">${level.label}</option>
                        `).join("")}
                    </select>
                </label>

                <div id="activity-description" class="activity-description"></div>

                <button id="calculate-tdee-btn" class="primary-btn" type="button">
                    Calculate Estimated Calories
                </button>

                <p id="nutrition-message" class="nutrition-message" aria-live="polite"></p>
            </div>

            <div id="nutrition-results" class="nutrition-results" hidden>
                <div class="nutrition-result-card">
                    <span>Estimated BMR</span>
                    <strong id="nutrition-bmr">--</strong>
                    <small>kcal/day</small>
                </div>

                <div class="nutrition-result-card featured">
                    <span>Estimated Maintenance</span>
                    <strong id="nutrition-tdee">--</strong>
                    <small>kcal/day</small>
                </div>
            </div>

            <p class="nutrition-disclaimer">
                Energy needs are estimates. Actual maintenance needs can differ and may be refined later using logged body-weight trends.
            </p>
        </section>
    `;
}

export function renderMore() {
    return `
        <section class="section-card more-page">
            <p class="eyebrow">MORE</p>
            <h2>More</h2>
            <p class="section-description">
                Manage nutrition, profile details, and app settings.
            </p>

            <div class="more-menu">
                <button class="more-menu-card" id="open-nutrition-btn" type="button">
                    <span class="more-menu-icon">🍎</span>
                    <span>
                        <strong>Nutrition</strong>
                        <small>Energy needs and nutrition planning</small>
                    </span>
                    <span class="more-chevron">›</span>
                </button>

                <div class="more-menu-card disabled" aria-disabled="true">
                    <span class="more-menu-icon">⚙️</span>
                    <span>
                        <strong>Settings</strong>
                        <small>Coming soon</small>
                    </span>
                </div>
            </div>
        </section>
    `;
}
