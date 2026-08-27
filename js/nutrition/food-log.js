import {
    MEALS,
    createLogEntry,
    entriesForDate,
    localDateKey,
    readCustomFoods,
    recentFoods,
    removeEntry,
    saveCustomFood,
    saveEntry,
    summarizeEntries
} from "./food-log-data.js?v=usda-food-log-1";

const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
let selectedDate = localDateKey();
let selectedFood = null;

export function renderCaloriesHub(planMarkup) {
    return `
        <section class="calories-hub" data-calories-hub>
            <div class="calories-tabs" role="tablist" aria-label="Calories sections">
                <button type="button" class="active" role="tab" aria-selected="true" data-calories-tab="log">Food Log</button>
                <button type="button" role="tab" aria-selected="false" data-calories-tab="plan">Targets &amp; Plan</button>
            </div>
            <div data-calories-panel="log">${renderFoodLogShell()}</div>
            <div data-calories-panel="plan" hidden>${planMarkup}</div>
        </section>
        ${renderFoodSheet()}
    `;
}

function renderFoodLogShell() {
    return `
        <section class="food-log-page" data-food-log>
            <header class="food-log-heading">
                <div><span class="eyebrow">DAILY NUTRITION</span><h2>Food Log</h2></div>
                <button class="food-log-add primary-btn" type="button" data-food-add>+ Log Food</button>
            </header>
            <div class="food-log-date-nav">
                <button type="button" data-food-date-shift="-1" aria-label="Previous day">←</button>
                <button type="button" data-food-date-today><strong data-food-date-label>Today</strong><small data-food-date-value></small></button>
                <button type="button" data-food-date-shift="1" aria-label="Next day">→</button>
            </div>
            <article class="food-daily-summary" data-food-summary></article>
            <div class="food-meals" data-food-meals></div>
            <p class="food-data-credit">Food data from USDA FoodData Central. Nutrition values may vary by product and serving.</p>
        </section>
    `;
}

function renderFoodSheet() {
    return `
        <div class="food-sheet" data-food-sheet hidden>
            <button class="food-sheet-backdrop" type="button" data-food-close aria-label="Close food search"></button>
            <section class="food-sheet-card" role="dialog" aria-modal="true" aria-labelledby="food-sheet-title">
                <div class="food-sheet-handle"></div>
                <header><div><span class="eyebrow">ADD TO YOUR DAY</span><h2 id="food-sheet-title">Log Food</h2></div><button type="button" class="food-sheet-close" data-food-close aria-label="Close">×</button></header>
                <div class="food-sheet-tabs">
                    <button type="button" class="active" data-food-mode="search">Search USDA</button>
                    <button type="button" data-food-mode="recent">Recent</button>
                    <button type="button" data-food-mode="custom">Custom</button>
                </div>
                <div data-food-mode-panel="search">
                    <form class="food-search" data-food-search-form>
                        <input type="search" name="query" minlength="2" maxlength="80" autocomplete="off" placeholder="Search chicken, rice, Kirkland…" aria-label="Search foods">
                        <button type="submit" class="primary-btn">Search</button>
                    </form>
                    <p class="food-search-status" data-food-search-status aria-live="polite">Search branded and generic foods.</p>
                    <div class="food-results" data-food-results></div>
                </div>
                <div data-food-mode-panel="recent" hidden><div class="food-results" data-food-recents></div></div>
                <div data-food-mode-panel="custom" hidden>${renderCustomFoodForm()}</div>
                <div class="food-portion-panel" data-food-portion hidden></div>
            </section>
        </div>
    `;
}

function renderCustomFoodForm() {
    return `
        <form class="custom-food-form" data-custom-food-form>
            <label>Food name<input name="name" required maxlength="180" placeholder="Homemade turkey chili"></label>
            <label>Serving name<input name="serving" required maxlength="80" placeholder="1 bowl"></label>
            <div class="custom-food-grid">
                <label>Calories<input name="calories" required type="number" min="0" max="10000" step="1"></label>
                <label>Protein (g)<input name="protein" required type="number" min="0" max="1000" step="0.1"></label>
                <label>Carbs (g)<input name="carbs" required type="number" min="0" max="1000" step="0.1"></label>
                <label>Fat (g)<input name="fat" required type="number" min="0" max="1000" step="0.1"></label>
            </div>
            <button type="submit" class="primary-btn">Save &amp; Add</button>
        </form>
    `;
}

export function initializeFoodLog() {
    const hub = document.querySelector("[data-calories-hub]");
    if (!hub) return;
    bindHubTabs(hub);
    hub.querySelector("[data-food-add]")?.addEventListener("click", openFoodSheet);
    hub.querySelectorAll("[data-food-date-shift]").forEach(button => button.addEventListener("click", () => shiftDate(Number(button.dataset.foodDateShift))));
    hub.querySelector("[data-food-date-today]")?.addEventListener("click", () => { selectedDate = localDateKey(); renderDay(); });
    document.querySelectorAll("[data-food-close]").forEach(button => button.addEventListener("click", closeFoodSheet));
    document.querySelectorAll("[data-food-mode]").forEach(button => button.addEventListener("click", () => showFoodMode(button.dataset.foodMode)));
    document.querySelector("[data-food-search-form]")?.addEventListener("submit", searchFoods);
    document.querySelector("[data-custom-food-form]")?.addEventListener("submit", createCustomFood);
    window.addEventListener("levelup:food-log-updated", renderDay);
    renderDay();
}

function bindHubTabs(hub) {
    hub.querySelectorAll("[data-calories-tab]").forEach(button => button.addEventListener("click", () => {
        const tab = button.dataset.caloriesTab;
        hub.querySelectorAll("[data-calories-tab]").forEach(item => {
            const active = item.dataset.caloriesTab === tab;
            item.classList.toggle("active", active);
            item.setAttribute("aria-selected", String(active));
        });
        hub.querySelectorAll("[data-calories-panel]").forEach(panel => { panel.hidden = panel.dataset.caloriesPanel !== tab; });
    }));
}

function shiftDate(days) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    selectedDate = localDateKey(date);
    renderDay();
}

function renderDay() {
    const entries = entriesForDate(selectedDate);
    const totals = summarizeEntries(entries);
    const target = activeTargets();
    const date = new Date(`${selectedDate}T12:00:00`);
    const isToday = selectedDate === localDateKey();
    setText("[data-food-date-label]", isToday ? "Today" : date.toLocaleDateString(undefined, { weekday: "long" }));
    setText("[data-food-date-value]", date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
    const summary = document.querySelector("[data-food-summary]");
    if (summary) summary.innerHTML = summaryMarkup(totals, target);
    const meals = document.querySelector("[data-food-meals]");
    if (meals) meals.innerHTML = MEALS.map(meal => mealMarkup(meal, entries.filter(entry => entry.meal === meal))).join("");
    meals?.querySelectorAll("[data-food-remove]").forEach(button => button.addEventListener("click", () => removeEntry(selectedDate, button.dataset.foodRemove)));
    meals?.querySelectorAll("[data-food-add-meal]").forEach(button => button.addEventListener("click", () => openFoodSheet(button.dataset.foodAddMeal)));
}

function summaryMarkup(totals, target) {
    const calorieTarget = Number(target.calories) || 0;
    const remaining = calorieTarget ? Math.round(calorieTarget - totals.calories) : null;
    const percent = calorieTarget ? Math.min(100, Math.max(0, (totals.calories / calorieTarget) * 100)) : 0;
    return `
        <div class="food-calorie-total"><span>Calories</span><strong>${Math.round(totals.calories).toLocaleString()}</strong><small>${remaining === null ? "No target set" : `${Math.abs(remaining).toLocaleString()} ${remaining >= 0 ? "remaining" : "over"}`}</small><i style="--food-progress:${percent}%"></i></div>
        ${macroTile("Protein", totals.protein, target.protein)}
        ${macroTile("Carbs", totals.carbs, target.carbs)}
        ${macroTile("Fat", totals.fat, target.fat)}
    `;
}

function macroTile(label, value, target) {
    const targetText = Number(target) > 0 ? ` / ${Math.round(target)} g` : " g";
    return `<div class="food-macro-total"><span>${label}</span><strong>${roundOne(value)}${escapeHtml(targetText)}</strong></div>`;
}

function mealMarkup(meal, entries) {
    const totals = summarizeEntries(entries);
    return `
        <details class="food-meal" ${entries.length ? "open" : ""}>
            <summary><span><strong>${meal}</strong><small>${entries.length ? `${entries.length} item${entries.length === 1 ? "" : "s"}` : "Nothing logged"}</small></span><b>${Math.round(totals.calories)} kcal</b></summary>
            <div class="food-meal-body">
                ${entries.map(entry => `<div class="food-entry"><div><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.brand ? `${entry.brand} · ` : "")}${roundOne(entry.quantity)} × ${escapeHtml(entry.servingLabel)}</small></div><span>${Math.round(entry.nutrition?.calories || 0)} kcal</span><button type="button" data-food-remove="${escapeHtml(entry.id)}" aria-label="Remove ${escapeHtml(entry.name)}">×</button></div>`).join("")}
                <button type="button" class="food-add-meal" data-food-add-meal="${meal}">+ Add to ${meal}</button>
            </div>
        </details>
    `;
}

function openFoodSheet(meal = "Breakfast") {
    const sheet = document.querySelector("[data-food-sheet]");
    if (!sheet) return;
    sheet.dataset.meal = MEALS.includes(meal) ? meal : "Breakfast";
    sheet.hidden = false;
    document.body.classList.add("food-sheet-open");
    selectedFood = null;
    document.querySelector("[data-food-portion]")?.setAttribute("hidden", "");
    renderRecents();
    window.setTimeout(() => document.querySelector("[data-food-search-form] input")?.focus(), 50);
}

function closeFoodSheet() {
    const sheet = document.querySelector("[data-food-sheet]");
    if (sheet) sheet.hidden = true;
    document.body.classList.remove("food-sheet-open");
}

function showFoodMode(mode) {
    document.querySelectorAll("[data-food-mode]").forEach(button => button.classList.toggle("active", button.dataset.foodMode === mode));
    document.querySelectorAll("[data-food-mode-panel]").forEach(panel => { panel.hidden = panel.dataset.foodModePanel !== mode; });
    document.querySelector("[data-food-portion]")?.setAttribute("hidden", "");
    if (mode === "recent") renderRecents();
}

async function searchFoods(event) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") || "").trim();
    if (query.length < 2) return setText("[data-food-search-status]", "Enter at least 2 characters.");
    const token = sessionToken();
    if (!token) return setText("[data-food-search-status]", "Sign in to search USDA foods. Custom foods still work offline.");
    setText("[data-food-search-status]", "Searching USDA FoodData Central…");
    const results = document.querySelector("[data-food-results]");
    if (results) results.innerHTML = "";
    try {
        const response = await fetch(`${API_URL}/v1/foods/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Food search could not be loaded.");
        renderFoodResults(results, payload.foods || []);
        setText("[data-food-search-status]", payload.foods?.length ? `${payload.foods.length} matches` : "No matches. Try a simpler name or create a custom food.");
    }
    catch (error) {
        setText("[data-food-search-status]", error.message || "Food search could not be loaded.");
    }
}

function renderFoodResults(container, foods) {
    if (!container) return;
    container.innerHTML = foods.map((food, index) => foodResultMarkup(food, index)).join("");
    container.querySelectorAll("[data-food-result]").forEach(button => button.addEventListener("click", () => chooseFood(foods[Number(button.dataset.foodResult)])));
}

function foodResultMarkup(food, index) {
    const portion = food.portions?.[0];
    return `<button class="food-result" type="button" data-food-result="${index}"><span><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(food.brand || food.dataType || "USDA food")}</small></span><b>${Math.round(portion?.nutrition?.calories || 0)} kcal<small>${escapeHtml(portion?.label || "per 100 g")}</small></b></button>`;
}

function chooseFood(food) {
    selectedFood = food;
    const panel = document.querySelector("[data-food-portion]");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = `
        <div class="food-portion-heading"><div><span class="eyebrow">ADD FOOD</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="Back to results">×</button></div>
        <label>Meal<select data-food-meal>${MEALS.map(meal => `<option${meal === document.querySelector("[data-food-sheet]")?.dataset.meal ? " selected" : ""}>${meal}</option>`).join("")}</select></label>
        <label>Serving<select data-food-serving>${(food.portions || []).map((portion, index) => `<option value="${index}">${escapeHtml(portion.label)}</option>`).join("")}</select></label>
        <label>Quantity<input data-food-quantity type="number" inputmode="decimal" min="0.01" max="100" step="0.25" value="1"></label>
        <div class="food-portion-preview" data-food-preview></div>
        <button type="button" class="primary-btn" data-food-confirm>Add to Food Log</button>
    `;
    panel.querySelector("[data-food-portion-close]")?.addEventListener("click", () => { panel.hidden = true; });
    panel.querySelectorAll("select,input").forEach(input => input.addEventListener("input", updatePortionPreview));
    panel.querySelector("[data-food-confirm]")?.addEventListener("click", addSelectedFood);
    updatePortionPreview();
}

function updatePortionPreview() {
    if (!selectedFood) return;
    const portion = selectedFood.portions?.[Number(document.querySelector("[data-food-serving]")?.value)] || selectedFood.portions?.[0];
    const quantity = Math.max(0, Number(document.querySelector("[data-food-quantity]")?.value) || 0);
    const n = portion?.nutrition || {};
    const preview = document.querySelector("[data-food-preview]");
    if (preview) preview.textContent = `${Math.round((n.calories || 0) * quantity)} kcal · P ${roundOne((n.protein || 0) * quantity)} g · C ${roundOne((n.carbs || 0) * quantity)} g · F ${roundOne((n.fat || 0) * quantity)} g`;
}

function addSelectedFood() {
    if (!selectedFood) return;
    const portion = selectedFood.portions?.[Number(document.querySelector("[data-food-serving]")?.value)] || selectedFood.portions?.[0];
    const meal = document.querySelector("[data-food-meal]")?.value;
    const quantity = Number(document.querySelector("[data-food-quantity]")?.value);
    saveEntry(selectedDate, createLogEntry({ meal, food: selectedFood, portion, quantity }));
    closeFoodSheet();
}

function createCustomFood(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nutrition = Object.fromEntries(["calories", "protein", "carbs", "fat"].map(key => [key, Math.max(0, Number(data.get(key)) || 0)]));
    nutrition.fiber = 0;
    const food = saveCustomFood({ id: crypto.randomUUID(), source: "custom", name: String(data.get("name") || "Custom food"), brand: "Custom food", servingLabel: String(data.get("serving") || "1 serving"), nutrition, portions: [{ label: String(data.get("serving") || "1 serving"), nutrition }] });
    chooseFood(food);
}

function renderRecents() {
    const foods = [...readCustomFoods(), ...recentFoods()].filter((food, index, all) => all.findIndex(item => `${item.source}:${item.fdcId || item.id || item.name}` === `${food.source}:${food.fdcId || food.id || food.name}`) === index).slice(0, 12);
    const container = document.querySelector("[data-food-recents]");
    if (!container) return;
    if (!foods.length) { container.innerHTML = '<p class="empty-state">Foods you log will appear here for faster reuse.</p>'; return; }
    renderFoodResults(container, foods);
}

function activeTargets() {
    const plan = readJson("level_up_nutrition_plan", {});
    const phases = readJson("level_up_nutrition_phases", []);
    const active = Array.isArray(phases) ? [...phases].reverse().find(phase => !phase?.endDate) : null;
    const macro = readJson("level_up_nutrition_macro", {});
    const manual = macro?.useManual ? macro.manualMacros : null;
    const auto = macro?.autoBaseline;
    return {
        calories: Number(active?.currentCalories ?? active?.startCalories ?? plan?.calculatedCalories ?? plan?.currentCalories) || null,
        protein: Number(manual?.protein ?? auto?.protein) || null,
        carbs: Number(manual?.carbs ?? auto?.carbs) || null,
        fat: Number(manual?.fat ?? auto?.fat) || null
    };
}

function sessionToken() { return readJson(SESSION_KEY, {})?.token || ""; }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function setText(selector, value) { const node = document.querySelector(selector); if (node) node.textContent = value; }
function roundOne(value) { return Math.round((Number(value) || 0) * 10) / 10; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]); }
