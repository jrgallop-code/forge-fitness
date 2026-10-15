import {createFoodSpeechSession} from './food-speech.js';
import {voiceIngredients,accurateVoiceMatch,voicePortion,replacementVoicePortion} from './voice-food-model.js';
import { withFoodWeightUnits, validFoodAmount } from "./food-portion-units.js";
import { foodAmountMarkup, foodHeroMarkup, bindFoodAmountEditor, restoreFoodAmount } from "./food-portion-editor.js";
import {
    MEALS,
    buildCustomFoodPortions,
    createLogEntry,
    cloneEntriesForMeal,
    entriesForDate,
    hasCopiedMeal,
    isFoodDayComplete,
    logSavedMeal,
    localDateKey,
    mealPreview,
    matchingLoggedFoods,
    previousDateKey,
    prioritizeLoggedFoodMatches,
    readCustomFoods,
    readSavedMeals,
    recentFoods,
    readFoodLog,
    removeEntry,
    removeSavedMeal,
    saveCustomFood,
    saveEntry,
    saveEntries,
    saveSavedMeal,
    setFoodDayComplete,
    scaledNutrition,
    summarizeEntries,
    totalServingLabel,
    updateEntry,
    withUsefulLiquidPortions
} from "./food-log-data.js?v=food-search-freeze-fix-1";
import {
    chooseIngredientFood,
    ingredientPortionSelection,
    parseIngredientText,
    parseSpokenIngredientText
} from "./ingredient-paste-parser.js?v=voice-food-1";
import {
    getNutritionMacroPreference,
    getNutritionProfile
} from "./nutrition-storage.js?v=food-log-macro-bars-1";
import {
    calculateMacroTargets,
    poundsToKg
} from "./tdee-calculator.js?v=food-log-macro-bars-1";
import { getFoodEmoji } from "./food-emoji.js?v=food-artwork-polish-1";
import { initializeRestaurantMenu, openRestaurantMenu } from "./restaurant-menu.js?v=eating-out-9";

const FOOD_MIC_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
const FOOD_BARCODE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4M7 7v10M10 7v10M13 7v10M17 7v10"/></svg>';
const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const CALORIES_TAB_KEY = "level_up_calories_tab_v1";
const BARCODE_CHOICE_KEY = "level_up_barcode_choices_v1";
const BARCODE_CHOICE_MAX_AGE_MS = 90 * 86400000;
const ZXING_BROWSER_URL = "https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/umd/zxing-browser.min.js";
const ZXING_BROWSER_INTEGRITY = "sha384-HRtzk9lZgkbSgvUyQrnfC/GxiXZgwaNyD7hC9wcXlsBpDhkS80ISl73juef2FRuf";
let selectedDate = localDateKey();
let calendarMonth = new Date(`${selectedDate.slice(0, 7)}-01T12:00:00`);
let calendarEventsAbort = null;
let selectedFood = null;
let selectedMeal = "Breakfast";
let addContext = "log";
let mealDraft = null;
let editingEntryId = null;
let editingMealItemIndex = null;
let editingCustomFoodId = null;
let foodSearchController = null;
let foodSearchTimer = null;
let foodDetailController = null;
let foodSelectionRequest = 0;
let barcodeScannerControls = null;
let barcodeVideoTrack = null;
let barcodeLookupActive = false;
let barcodeLookupController = null;
let zxingLoadPromise = null;
let mealImportController = null;
let foodVoiceRecognition = null;
let foodVoiceTranscript = "";
let voiceSwapRequest = null;
const foodDetailCache = new Map();
const barcodeFoodCache = new Map();
const expandedMealKeys = new Set();

export function renderCaloriesHub(planMarkup) {
    return `
        <section class="calories-hub" data-calories-hub>
            <div class="calories-tabs" role="tablist" aria-label="Calories sections">
                <button type="button" class="active" role="tab" aria-selected="true" data-calories-tab="log">Food Log</button>
                <button type="button" role="tab" aria-selected="false" data-calories-tab="plan">Goals &amp; Plan</button>
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
                <div><span class="eyebrow">DAILY NUTRITION</span><h2>Food Log</h2><button class="food-log-plan-link" type="button" data-food-open-plan>Calorie goals, lean bulk &amp; planning →</button></div>
                <button class="food-log-add primary-btn" type="button" data-food-add>+ Log Food</button>
            </header>
            <div class="food-log-date-nav">
                <button type="button" data-food-date-shift="-1" aria-label="Previous day">←</button>
                <button type="button" data-food-calendar-toggle aria-label="Choose food log date" aria-expanded="false" aria-controls="food-log-calendar"><strong data-food-date-label>Today</strong><small data-food-date-value></small><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg></button>
                <button type="button" data-food-date-shift="1" aria-label="Next day">→</button>
            </div>
            <div class="food-log-calendar" id="food-log-calendar" data-food-calendar hidden></div>
            <article class="food-daily-summary" data-food-summary></article>
            <div class="food-day-complete" data-food-day-complete></div>
            <div class="food-meals" data-food-meals></div>
            <p class="food-data-credit" aria-label="Food data attribution"></p>
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
                <div class="food-meal-picker" aria-label="Choose meal">
                    <span>Log to</span>
                    <div role="radiogroup">${MEALS.map(meal => `<button type="button" role="radio" aria-checked="false" data-food-target-meal="${meal}">${meal}</button>`).join("")}</div>
                </div>
                <form class="food-search" data-food-search-form>
                    <div class="food-search-entry"><div class="food-search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/></svg><input type="search" name="query" minlength="2" maxlength="80" autocomplete="off" placeholder="Search foods" aria-label="Search foods"></div></div>
                    <button type="submit" class="primary-btn food-search-submit">Search</button>
                </form>
                <div class="food-search-shortcuts" role="group" aria-label="Food logging shortcuts"><button type="button" data-barcode-open aria-label="Scan a food barcode"><span>${FOOD_BARCODE_ICON}</span><small>Barcode</small></button><button type="button" data-food-voice aria-label="Log food by voice"><span>${FOOD_MIC_ICON}</span><small>Voice</small></button></div>
                <button type="button" class="food-eating-out-entry" data-food-eating-out>
                    <span class="food-eating-out-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3v6M8 3v6M11 3v6M5 9c0 1.7 1.3 3 3 3s3-1.3 3-3M8 12v9M18 3v18M18 3c-2.5 2.7-3.7 5.7-3.7 9H18"/></svg></span>
                    <span><strong>Eating Out</strong><small>Browse restaurant menus by calories and protein</small></span>
                    <b aria-hidden="true">›</b>
                </button>
                <div class="food-sheet-tabs">
                    <button type="button" class="active" data-food-mode="recent">Recent</button>
                    <button type="button" data-food-mode="meals">My Meals</button>
                    <button type="button" data-food-mode="custom">My Foods</button>
                </div>
                <div class="food-sheet-scroll">
                <div data-food-mode-panel="search" hidden>
                    <p class="food-search-status" data-food-search-status aria-live="polite">Search branded and generic foods.</p>
                    <div class="food-results" data-food-results></div>
                </div>
                <div data-food-mode-panel="recent" hidden><div class="food-results" data-food-recents></div></div>
                <div data-food-mode-panel="meals" hidden><div class="food-meal-create-actions"><button type="button" class="food-create-meal" data-create-meal>+ Create a Meal</button><button type="button" class="food-create-meal food-paste-meal" data-paste-meal>Paste Ingredients</button></div><div class="food-results" data-saved-meals></div></div>
                <div data-food-mode-panel="custom" hidden><button type="button" class="food-create-meal" data-create-food>+ Create a Food</button><div data-custom-food-editor hidden>${renderCustomFoodForm()}</div><div class="food-results" data-custom-foods></div></div>
                </div>
                <div class="food-portion-panel" data-food-portion hidden></div>
                <div class="food-meal-builder" data-meal-builder hidden></div>
                ${renderBarcodeScanner()}
            </section>
        </div>
        <div class="food-toast" data-food-toast role="status" aria-live="polite" hidden></div>
    `;
}

function renderCustomFoodForm() {
    return `
        <form class="custom-food-form" data-custom-food-form>
            <div class="custom-food-intro"><span class="eyebrow" data-custom-food-eyebrow>CREATE FOOD</span><strong data-custom-food-title>Food details</strong><small data-custom-food-copy>Enter nutrition for one serving. Level Up will calculate other usable units when possible.</small></div>
            <label>Brand name <span>(optional)</span><input name="brand" maxlength="120" placeholder="Kirkland Signature"></label>
            <label>Description<input name="name" required maxlength="180" placeholder="Chipotle grilled chicken"></label>
            <fieldset class="custom-serving-fields"><legend>Serving size</legend><div>
                <label><span>Amount</span><input name="servingAmount" required type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="1"></label>
                <label><span>Unit</span><select name="servingUnit" required>
                    <option value="g">g</option><option value="oz">oz</option><option value="ml">ml</option><option value="cup">cup</option>
                    <option value="tbsp">tbsp</option><option value="tsp">tsp</option><option value="serving" selected>serving</option>
                    <option value="item">item</option><option value="piece">piece</option><option value="slice">slice</option>
                    <option value="bar">bar</option><option value="burger">burger</option><option value="scoop">scoop</option>
                </select></label>
            </div></fieldset>
            <label>Servings per container <span>(optional)</span><input name="servingsPerContainer" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" placeholder="Example: 10"></label>
            <label>Barcode <span>(optional)</span><input name="barcode" inputmode="numeric" pattern="[0-9]*" maxlength="14" autocomplete="off" placeholder="Scan or enter 8–14 digits"></label>
            <div class="custom-nutrition-heading"><strong>Nutrition per serving</strong><small>Use the values shown on the package label.</small></div>
            <div class="custom-food-grid">
                <label>Calories<input name="calories" required type="number" min="0" max="10000" step="1"></label>
                <label>Protein (g)<input name="protein" required type="number" min="0" max="1000" step="0.1"></label>
                <label>Carbs (g)<input name="carbs" required type="number" min="0" max="1000" step="0.1"></label>
                <label>Fat (g)<input name="fat" required type="number" min="0" max="1000" step="0.1"></label>
                <label>Fiber (g) <span>(optional)</span><input name="fiber" type="number" min="0" max="1000" step="0.1"></label>
            </div>
            <div class="custom-food-actions"><button type="button" data-custom-food-cancel hidden>Cancel</button><button type="submit" class="primary-btn" data-custom-food-submit>Save &amp; Add</button></div>
        </form>
    `;
}

function renderBarcodeScanner() {
    return `
        <section class="food-barcode-panel" data-barcode-panel hidden aria-labelledby="food-barcode-title">
            <header class="food-barcode-heading"><div><span class="eyebrow">QUICK ADD</span><h3 id="food-barcode-title">Scan Barcode</h3></div><button type="button" data-barcode-close aria-label="Close barcode scanner">×</button></header>
            <div class="food-barcode-camera"><video data-barcode-video playsinline muted></video><div class="food-barcode-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="food-barcode-camera-copy"><strong>Hold the barcode inside the box</strong><span>Keep the bars flat and move closer until they look sharp.</span></div></div>
            <div class="food-barcode-zoom" data-barcode-zoom hidden>
                <button type="button" data-barcode-zoom-out aria-label="Zoom out">−</button>
                <label><span>Camera zoom</span><input type="range" data-barcode-zoom-range aria-label="Camera zoom"><b data-barcode-zoom-value>1×</b></label>
                <button type="button" data-barcode-zoom-in aria-label="Zoom in">+</button>
            </div>
            <p class="food-barcode-status" data-barcode-status role="status" aria-live="polite">Starting camera…</p>
            <form class="food-barcode-manual" data-barcode-form>
                <label>Enter barcode manually<input name="barcode" inputmode="numeric" pattern="[0-9]*" minlength="8" maxlength="14" autocomplete="off" placeholder="UPC, EAN, or GTIN"></label>
                <button type="submit" class="primary-btn">Look Up</button>
            </form>
            <button type="button" class="food-barcode-custom" data-barcode-custom hidden>Create a custom food with this barcode</button>
            <small class="food-barcode-privacy">Only the barcode number is sent for lookup. Camera images stay on your device.</small>
        </section>`;
}

export function initializeFoodLog() {
    const hub = document.querySelector("[data-calories-hub]");
    if (!hub) return;
    ensureBarcodeStyles();
    bindHubTabs(hub);
    hub.querySelector("[data-food-add]")?.addEventListener("click", openFoodSheet);
    hub.querySelectorAll("[data-food-date-shift]").forEach(button => button.addEventListener("click", () => shiftDate(Number(button.dataset.foodDateShift))));
    const calendarToggle = hub.querySelector("[data-food-calendar-toggle]");
    const calendar = hub.querySelector("[data-food-calendar]");
    calendarToggle?.addEventListener("click", () => {
        if (!calendar) return;
        const opening = calendar.hidden;
        calendar.hidden = !opening;
        calendarToggle.setAttribute("aria-expanded", String(opening));
        if (opening) {
            calendarMonth = new Date(`${selectedDate.slice(0, 7)}-01T12:00:00`);
            renderFoodCalendar();
        }
    });
    calendar?.addEventListener("click", event => {
        // Repainting month buttons removes the tapped element before the document
        // click listener runs; keep this calendar interaction from closing it.
        event.stopPropagation();
        const monthButton = event.target.closest("[data-food-calendar-month]");
        if (monthButton) {
            calendarMonth.setMonth(calendarMonth.getMonth() + Number(monthButton.dataset.foodCalendarMonth));
            renderFoodCalendar();
            return;
        }
        const dateButton = event.target.closest("[data-food-calendar-date]");
        if (dateButton) {
            selectedDate = dateButton.dataset.foodCalendarDate;
            closeFoodCalendar();
            renderDay();
        }
    });
    calendarEventsAbort?.abort();
    calendarEventsAbort = new AbortController();
    document.addEventListener("click", event => {
        if (calendar && !calendar.hidden && !calendar.contains(event.target) && !calendarToggle?.contains(event.target)) closeFoodCalendar();
    }, { signal: calendarEventsAbort.signal });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && calendar && !calendar.hidden) {
            closeFoodCalendar();
            calendarToggle?.focus();
        }
    }, { signal: calendarEventsAbort.signal });
    document.querySelectorAll("[data-food-close]").forEach(button => button.addEventListener("click", closeFoodSheet));
    document.querySelectorAll("[data-food-mode]").forEach(button => button.addEventListener("click", () => showFoodMode(button.dataset.foodMode)));
    document.querySelectorAll("[data-food-target-meal]").forEach(button => button.addEventListener("click", () => selectTargetMeal(button.dataset.foodTargetMeal)));
    const foodSearchForm = document.querySelector("[data-food-search-form]");
    foodSearchForm?.addEventListener("submit", searchFoods);
    foodSearchForm?.querySelector('input[name="query"]')?.addEventListener("input", event => {
        window.clearTimeout(foodSearchTimer);
        if (String(event.currentTarget.value || "").trim().length < 2) return;
        foodSearchTimer = window.setTimeout(() => foodSearchForm.requestSubmit(), 300);
    });
    initializeFoodVoiceInput();
    initializeRestaurantMenu({
        getContext: () => ({
            dateKey: selectedDate,
            meal: selectedMeal,
            targets: activeTargets(),
            totals: summarizeEntries(entriesForDate(selectedDate))
        }),
        onChooseFood: food => { void chooseFood(food); }
    });
    document.querySelector("[data-food-eating-out]")?.addEventListener("click", openRestaurantMenu);
    document.querySelector("[data-barcode-open]")?.addEventListener("click", openBarcodeScanner);
    document.querySelector("[data-barcode-close]")?.addEventListener("click", closeBarcodeScanner);
    document.querySelector("[data-barcode-form]")?.addEventListener("submit", submitManualBarcode);
    document.querySelector("[data-barcode-zoom-range]")?.addEventListener("input", event => { void setBarcodeZoom(Number(event.currentTarget.value)); });
    document.querySelector("[data-barcode-zoom-out]")?.addEventListener("click", () => nudgeBarcodeZoom(-1));
    document.querySelector("[data-barcode-zoom-in]")?.addEventListener("click", () => nudgeBarcodeZoom(1));
    document.querySelector("[data-barcode-custom]")?.addEventListener("click", openCustomFoodForBarcode);
    document.querySelector("[data-custom-food-form]")?.addEventListener("submit", createCustomFood);
    document.querySelector("[data-create-food]")?.addEventListener("click", beginCustomFoodCreation);
    document.querySelector("[data-custom-food-cancel]")?.addEventListener("click", resetCustomFoodEditor);
    document.querySelector("[data-create-meal]")?.addEventListener("click", () => openMealBuilder());
    document.querySelector("[data-paste-meal]")?.addEventListener("click", () => openMealBuilder([], "", null, { pasteOpen: true }));
    window.addEventListener("levelup:food-log-updated", renderDay);
    window.addEventListener("levelup:nutrition-updated", renderDay);
    window.addEventListener("levelup:nutrition-phase-updated", renderDay);
    renderDay();
}

function ensureBarcodeStyles() {
    if (document.querySelector("link[data-food-barcode-styles]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/food-barcode-scanner.css?v=barcode-scanner-3";
    link.dataset.foodBarcodeStyles = "";
    document.head.append(link);
}

function bindHubTabs(hub) {
    const showTab = tab => {
        const safeTab = tab === "plan" ? "plan" : "log";
        hub.querySelectorAll("[data-calories-tab]").forEach(item => {
            const active = item.dataset.caloriesTab === safeTab;
            item.classList.toggle("active", active);
            item.setAttribute("aria-selected", String(active));
        });
        hub.querySelectorAll("[data-calories-panel]").forEach(panel => { panel.hidden = panel.dataset.caloriesPanel !== safeTab; });
        localStorage.setItem(CALORIES_TAB_KEY, safeTab);
        if (safeTab === "plan") {
            window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "calories-plan-opened" } }));
        }
    };

    hub.querySelectorAll("[data-calories-tab]").forEach(button => button.addEventListener("click", () => showTab(button.dataset.caloriesTab)));
    hub.querySelector("[data-food-open-plan]")?.addEventListener("click", () => showTab("plan"));
    showTab(localStorage.getItem(CALORIES_TAB_KEY));
}

function shiftDate(days) {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    selectedDate = localDateKey(date);
    closeFoodCalendar();
    renderDay();
}

function closeFoodCalendar() {
    const calendar = document.querySelector("[data-food-calendar]");
    if (calendar) calendar.hidden = true;
    document.querySelector("[data-food-calendar-toggle]")?.setAttribute("aria-expanded", "false");
}

function renderFoodCalendar() {
    const calendar = document.querySelector("[data-food-calendar]");
    if (!calendar || calendar.hidden) return;
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1, 12).getDay();
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const monthLabel = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const today = localDateKey();
    const cells = Array.from({ length: firstWeekday }, () => '<span aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day, 12);
        const key = localDateKey(date);
        const hasFood = entriesForDate(key).length > 0;
        const label = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        cells.push(`<button type="button" data-food-calendar-date="${key}" aria-label="${label}${hasFood ? ", food logged" : ""}" aria-pressed="${key === selectedDate}" class="${key === selectedDate ? "selected " : ""}${key === today ? "today" : ""}">${day}${hasFood ? '<i aria-hidden="true"></i>' : ""}</button>`);
    }
    calendar.innerHTML = `<div class="food-calendar-header"><button type="button" data-food-calendar-month="-1" aria-label="Previous month">‹</button><strong>${monthLabel}</strong><button type="button" data-food-calendar-month="1" aria-label="Next month">›</button></div><div class="food-calendar-weekdays" aria-hidden="true">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => `<span>${day}</span>`).join("")}</div><div class="food-calendar-days">${cells.join("")}</div><button type="button" class="food-calendar-today" data-food-calendar-date="${today}">Go to today</button>`;
}

function renderDay() {
    const entries = entriesForDate(selectedDate);
    const log = readFoodLog();
    const totals = summarizeEntries(entries);
    const target = activeTargets();
    const date = new Date(`${selectedDate}T12:00:00`);
    const isToday = selectedDate === localDateKey();
    setText("[data-food-date-label]", isToday ? "Today" : date.toLocaleDateString(undefined, { weekday: "long" }));
    setText("[data-food-date-value]", date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
    renderFoodCalendar();
    const summary = document.querySelector("[data-food-summary]");
    if (summary) summary.innerHTML = summaryMarkup(totals, target);
    const completion = document.querySelector("[data-food-day-complete]");
    if (completion) {
        const complete = isFoodDayComplete(selectedDate);
        const future = selectedDate > localDateKey();
        completion.innerHTML = `<div><strong>${complete ? "Day marked complete" : "Finished logging?"}</strong><small>${complete ? "This day can be used for calculated maintenance." : "Confirm everything you ate is logged before Level Up uses this day."}</small></div><button type="button" ${!entries.length || future ? "disabled" : ""}>${complete ? "Reopen day" : "Mark day complete"}</button>`;
        completion.querySelector("button")?.addEventListener("click", () => setFoodDayComplete(selectedDate, !complete));
    }
    const meals = document.querySelector("[data-food-meals]");
    if (meals) meals.innerHTML = MEALS.map(meal => mealMarkup(meal, entries.filter(entry => entry.meal === meal), latestMealSource(log, selectedDate, meal))).join("");
    meals?.querySelectorAll(".food-meal > summary").forEach(summary => {
        const details = summary.parentElement;
        summary.setAttribute("aria-expanded", String(Boolean(details?.open)));
        summary.addEventListener("click", event => {
            event.preventDefault();
            if (!details) return;
            details.open = !details.open;
            summary.setAttribute("aria-expanded", String(details.open));
            const key = mealExpansionKey(selectedDate, details.dataset.foodMeal);
            if (details.open) expandedMealKeys.add(key);
            else expandedMealKeys.delete(key);
        });
    });
    meals?.querySelectorAll("[data-food-remove]").forEach(button => button.addEventListener("click", () => removeEntry(selectedDate, button.dataset.foodRemove)));
    meals?.querySelectorAll("[data-food-edit]").forEach(button => button.addEventListener("click", () => openLoggedFoodEditor(button.dataset.foodEdit)));
    meals?.querySelectorAll("[data-food-add-meal]").forEach(button => button.addEventListener("click", () => openFoodSheet(button.dataset.foodAddMeal)));
    meals?.querySelectorAll("[data-save-diary-meal]").forEach(button => button.addEventListener("click", () => {
        const meal = button.dataset.saveDiaryMeal;
        openFoodSheet(meal);
        openMealBuilder(entries.filter(entry => entry.meal === meal), `${meal} Meal`);
    }));
    meals?.querySelectorAll("[data-copy-yesterday]").forEach(bindYesterdayCopy);
}

function summaryMarkup(totals, target) {
    const calorieTarget = Number(target.calories) || 0;
    const remaining = calorieTarget ? Math.round(calorieTarget - totals.calories) : null;
    const percent = calorieTarget ? Math.min(100, Math.max(0, (totals.calories / calorieTarget) * 100)) : 0;
    return `
        <div class="food-calorie-total"><span>Calories</span><div class="food-calorie-value"><strong>${Math.round(totals.calories).toLocaleString()}<b class="food-calorie-target">${calorieTarget ? `${Math.round(calorieTarget).toLocaleString()} cal target` : "No calorie target"}</b></strong></div><em>${remaining === null ? "Set a goal in Goals & Plan" : `${Math.abs(remaining).toLocaleString()} ${remaining >= 0 ? "remaining" : "over"}`}</em><i style="--food-progress:${percent}%"></i></div>
        ${macroTile("Protein", totals.protein, target.protein)}
        ${macroTile("Carbs", totals.carbs, target.carbs)}
        ${macroTile("Fat", totals.fat, target.fat)}
    `;
}

function macroTile(label, value, target) {
    const safeTarget = Math.max(0, Number(target) || 0);
    const progress = safeTarget > 0
        ? Math.min(100, Math.max(0, (Number(value) / safeTarget) * 100))
        : 0;
    const targetText = safeTarget > 0
        ? ` <small>/ ${Math.round(safeTarget)} g</small>`
        : "";
    return `<div class="food-macro-total food-macro-total--${label.toLowerCase()}"><span>${label}</span><strong>${roundOne(value)} g${targetText}</strong><i role="progressbar" aria-label="${escapeHtml(label)} target progress" aria-valuemin="0" aria-valuemax="${safeTarget}" aria-valuenow="${Math.max(0, Number(value) || 0)}"><b style="width:${progress}%"></b></i></div>`;
}

function latestMealSource(log, beforeDate, meal) {
    for (const date of Object.keys(log).filter(date => date < beforeDate).sort().reverse()) {
        const entries = Array.isArray(log[date]) ? log[date].filter(entry => entry?.meal === meal) : [];
        if (entries.length) return { date, entries };
    }
    return { date: null, entries: [] };
}

function mealMarkup(meal, entries, source) {
    const yesterdayEntries = source.entries;
    const sourceLabel = source.date === previousDateKey(selectedDate) ? "Yesterday’s" : "Most recent";
    const totals = summarizeEntries(entries);
    const yesterdayCopied = hasCopiedMeal(entries, source.date, meal);
    const showYesterday = yesterdayEntries.length > 0 && !yesterdayCopied;
    const expanded = expandedMealKeys.has(mealExpansionKey(selectedDate, meal));
    return `
        <details class="food-meal" data-food-meal="${meal}"${expanded ? " open" : ""}>
            <summary aria-expanded="${expanded}"><span><strong>${meal}</strong><small>${entries.length ? `${entries.length} item${entries.length === 1 ? "" : "s"}` : "Nothing logged"}</small></span><b>${Math.round(totals.calories)} kcal</b></summary>
            <div class="food-meal-body">
                ${entries.length ? `<div class="food-meal-macros">${macroBreakdownMarkup(totals, `${meal} total · ${entries.length} item${entries.length === 1 ? "" : "s"}`)}</div>` : ""}
                ${showYesterday ? `<button type="button" class="food-copy-yesterday" data-copy-yesterday="${meal}" data-copy-source-date="${source.date}"><span><strong>${sourceLabel} ${meal}</strong><small>${escapeHtml(mealPreview(yesterdayEntries))}</small></span><b>Swipe right <i>→</i></b></button>` : ""}
                ${entries.map(entry => `<div class="food-entry"><button type="button" class="food-entry-edit" data-food-edit="${escapeHtml(entry.id)}" aria-label="Edit ${escapeHtml(entry.name)}"><span class="food-entry-emoji" aria-hidden="true">${getFoodEmoji(entry)}</span><span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.brand ? `${entry.brand} · ` : "")}${escapeHtml(totalServingLabel(entry.quantity, entry.servingLabel))}</small></span><b>${Math.round(entry.nutrition?.calories || 0)} kcal</b><i aria-hidden="true">›</i></button><button type="button" class="food-entry-remove" data-food-remove="${escapeHtml(entry.id)}" aria-label="Remove ${escapeHtml(entry.name)}">×</button></div>`).join("")}
                ${entries.length ? `<button type="button" class="food-save-diary-meal" data-save-diary-meal="${meal}">Save ${meal} as My Meal</button>` : ""}
                <button type="button" class="food-add-meal" data-food-add-meal="${meal}">+ Add to ${meal}</button>
            </div>
        </details>
    `;
}

function mealExpansionKey(dateKey, meal) {
    return `${dateKey}::${meal || ""}`;
}

function openFoodSheet(meal) {
    const sheet = document.querySelector("[data-food-sheet]");
    if (!sheet) return;
    selectedMeal = MEALS.includes(meal) ? meal : defaultMealForTime();
    addContext = "log";
    editingEntryId = null;
    selectTargetMeal(selectedMeal);
    sheet.hidden = false;
    document.body.classList.add("food-sheet-open");
    selectedFood = null;
    document.querySelector("[data-food-portion]")?.setAttribute("hidden", "");
    document.querySelector("[data-meal-builder]")?.setAttribute("hidden", "");
    document.querySelector("[data-barcode-panel]")?.setAttribute("hidden", "");
    renderRecents();
    renderSavedMeals();
    renderCustomFoods();
    showFoodMode("recent");
    window.setTimeout(() => document.querySelector("[data-food-search-form] input")?.focus(), 50);
}

function closeFoodSheet() {
    const sheet = document.querySelector("[data-food-sheet]");
    if (sheet) sheet.hidden = true;
    foodSelectionRequest += 1;
    foodSearchController?.abort();
    foodDetailController?.abort();
    mealImportController?.abort();
    if (foodVoiceRecognition) {
        foodVoiceTranscript = "";
        try { foodVoiceRecognition.abort(); } catch {}
        foodVoiceRecognition = null;
        setFoodVoiceState(false);
    }
    closeBarcodeScanner();
    document.body.classList.remove("food-sheet-open");
    addContext = "log";
    editingEntryId = null;
    editingMealItemIndex = null;
    editingCustomFoodId = null;
    mealDraft = null;
}

async function openBarcodeScanner() {
    const panel = document.querySelector("[data-barcode-panel]");
    if (!panel) return;
    document.querySelector("[data-food-portion]")?.setAttribute("hidden", "");
    document.querySelector("[data-meal-builder]")?.setAttribute("hidden", "");
    panel.hidden = false;
    barcodeLookupActive = false;
    const customButton = panel.querySelector("[data-barcode-custom]");
    if (customButton) customButton.hidden = true;
    setBarcodeStatus("Starting rear camera…");

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setBarcodeStatus("Camera scanning is not available here. Enter the barcode below instead.");
        return;
    }
    try {
        await loadZxingBrowser();
        if (panel.hidden) return;
        const video = panel.querySelector("[data-barcode-video]");
        const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
        barcodeScannerControls = await reader.decodeFromConstraints(
            { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
            video,
            (result, error, controls) => {
                if (!result || barcodeLookupActive) return;
                const barcode = normalizeClientBarcode(result.getText?.() || result.text);
                if (!isSupportedClientBarcode(barcode)) return;
                barcodeScannerControls = controls || barcodeScannerControls;
                lookupBarcode(barcode);
            }
        );
        await configureBarcodeZoom(video);
        if (!barcodeLookupActive) setBarcodeStatus("Scanning automatically — hold steady when the bars are sharp.");
    }
    catch (error) {
        stopBarcodeScanner();
        const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
        setBarcodeStatus(denied ? "Camera access was not allowed. Enter the barcode below instead." : "The camera could not start. Enter the barcode below instead.");
    }
}

function closeBarcodeScanner() {
    stopBarcodeScanner();
    document.querySelector("[data-barcode-panel]")?.setAttribute("hidden", "");
}

function stopBarcodeScanner() {
    try { barcodeScannerControls?.stop?.(); } catch {}
    barcodeScannerControls = null;
    barcodeVideoTrack = null;
    const zoom = document.querySelector("[data-barcode-zoom]");
    if (zoom) zoom.hidden = true;
    const video = document.querySelector("[data-barcode-video]");
    const stream = video?.srcObject;
    stream?.getTracks?.().forEach(track => track.stop());
    if (video) video.srcObject = null;
    barcodeLookupController?.abort();
    barcodeLookupController = null;
    barcodeLookupActive = false;
}

async function configureBarcodeZoom(video) {
    barcodeVideoTrack = video?.srcObject?.getVideoTracks?.()[0] || null;
    const capabilities = barcodeVideoTrack?.getCapabilities?.();
    const zoomCapability = capabilities?.zoom;
    const zoomPanel = document.querySelector("[data-barcode-zoom]");
    const range = document.querySelector("[data-barcode-zoom-range]");
    if (!zoomPanel || !range || !barcodeVideoTrack || !zoomCapability || !Number.isFinite(zoomCapability.min) || !Number.isFinite(zoomCapability.max) || zoomCapability.max <= zoomCapability.min) {
        if (zoomPanel) zoomPanel.hidden = true;
        return;
    }
    const step = Number(zoomCapability.step) > 0 ? Number(zoomCapability.step) : 0.1;
    const settingsZoom = Number(barcodeVideoTrack.getSettings?.().zoom);
    const helpfulZoom = zoomCapability.min + (zoomCapability.max - zoomCapability.min) * 0.3;
    const preferredZoom = Number.isFinite(settingsZoom) ? Math.max(settingsZoom, helpfulZoom) : helpfulZoom;
    range.min = String(zoomCapability.min);
    range.max = String(zoomCapability.max);
    range.step = String(step);
    range.value = String(Math.min(zoomCapability.max, Math.max(zoomCapability.min, preferredZoom)));
    zoomPanel.hidden = false;
    await setBarcodeZoom(Number(range.value));
}

async function setBarcodeZoom(value) {
    const range = document.querySelector("[data-barcode-zoom-range]");
    const label = document.querySelector("[data-barcode-zoom-value]");
    if (!range || !barcodeVideoTrack || !Number.isFinite(value)) return;
    const zoom = Math.min(Number(range.max), Math.max(Number(range.min), value));
    try {
        await barcodeVideoTrack.applyConstraints({ advanced: [{ zoom }] });
        range.value = String(zoom);
        if (label) label.textContent = `${Number(zoom.toFixed(1))}×`;
    }
    catch {
        const panel = document.querySelector("[data-barcode-zoom]");
        if (panel) panel.hidden = true;
    }
}

function nudgeBarcodeZoom(direction) {
    const range = document.querySelector("[data-barcode-zoom-range]");
    if (!range) return;
    const step = Number(range.step) || 0.1;
    void setBarcodeZoom(Number(range.value) + step * direction);
}

function loadZxingBrowser() {
    if (window.ZXingBrowser?.BrowserMultiFormatReader) return Promise.resolve(window.ZXingBrowser);
    if (zxingLoadPromise) return zxingLoadPromise;
    zxingLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = ZXING_BROWSER_URL;
        script.integrity = ZXING_BROWSER_INTEGRITY;
        script.crossOrigin = "anonymous";
        script.async = true;
        script.addEventListener("load", () => window.ZXingBrowser?.BrowserMultiFormatReader ? resolve(window.ZXingBrowser) : reject(new Error("Scanner did not load.")), { once: true });
        script.addEventListener("error", () => reject(new Error("Scanner could not load.")), { once: true });
        document.head.append(script);
    }).catch(error => {
        zxingLoadPromise = null;
        throw error;
    });
    return zxingLoadPromise;
}

function submitManualBarcode(event) {
    event.preventDefault();
    const barcode = normalizeClientBarcode(new FormData(event.currentTarget).get("barcode"));
    lookupBarcode(barcode);
}

async function lookupBarcode(value) {
    const barcode = normalizeClientBarcode(value);
    if (!isSupportedClientBarcode(barcode)) {
        setBarcodeStatus("Enter a valid 8, 12, 13, or 14 digit barcode.");
        return;
    }
    if (barcodeFoodCache.has(barcode)) {
        closeBarcodeScanner();
        chooseFood(barcodeFoodCache.get(barcode));
        return;
    }
    const rememberedFood = readRememberedBarcodeFood(barcode);
    if (rememberedFood) {
        barcodeFoodCache.set(barcode, rememberedFood);
        closeBarcodeScanner();
        chooseFood(rememberedFood);
        return;
    }
    const token = sessionToken();
    if (!token) {
        stopBarcodeScanner();
        setBarcodeStatus("Sign in to look up a barcode, or create a custom food.");
        showBarcodeCustomFallback(barcode);
        return;
    }
    barcodeLookupActive = true;
    stopBarcodeScanner();
    barcodeLookupActive = true;
    barcodeLookupController = new AbortController();
    const input = document.querySelector("[data-barcode-form] input");
    if (input) input.value = barcode;
    setBarcodeStatus("Looking up product…");
    const customButton = document.querySelector("[data-barcode-custom]");
    if (customButton) customButton.hidden = true;
    try {
        const response = await fetch(`${API_URL}/v1/foods/barcode/${encodeURIComponent(barcode)}?country=${foodSearchCountry()}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: barcodeLookupController.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 404) {
            const customFood = readCustomFoods().find(food => normalizeClientBarcode(food?.barcode) === barcode);
            if (customFood) {
                barcodeFoodCache.set(barcode, customFood);
                closeBarcodeScanner();
                chooseFood(customFood);
                return;
            }
            setBarcodeStatus("Product not found. Create it once and keep this barcode attached for next time.");
            showBarcodeCustomFallback(barcode);
            return;
        }
        if (!response.ok || !payload.food) throw new Error(payload.error || "Barcode lookup could not be loaded.");
        const candidates = Array.isArray(payload.candidates) ? payload.candidates.filter(Boolean) : [];
        if (candidates.length > 1) {
            closeBarcodeScanner();
            showFoodMode("search");
            const comparableCandidates = candidates.map(food => ({ ...food, barcodeCandidate: true }));
            renderFoodResults(document.querySelector("[data-food-results]"), comparableCandidates, food => {
                const { barcodeCandidate, ...selectedFood } = food;
                rememberBarcodeFood(barcode, selectedFood);
                chooseFood(selectedFood);
            });
            setText("[data-food-search-status]", "We found different nutrition records for this barcode. Choose the one that matches your label.");
            return;
        }
        barcodeFoodCache.set(barcode, payload.food);
        closeBarcodeScanner();
        chooseFood(payload.food);
    }
    catch (error) {
        if (error?.name === "AbortError") return;
        barcodeLookupActive = false;
        setBarcodeStatus(error.message || "Barcode lookup could not be loaded.");
    }
}

function showBarcodeCustomFallback(barcode) {
    const button = document.querySelector("[data-barcode-custom]");
    if (!button) return;
    button.dataset.barcodeCustom = barcode;
    button.hidden = false;
    barcodeLookupActive = false;
}

function openCustomFoodForBarcode() {
    const barcode = normalizeClientBarcode(document.querySelector("[data-barcode-custom]")?.dataset.barcodeCustom);
    closeBarcodeScanner();
    showFoodMode("custom");
    const editor = document.querySelector("[data-custom-food-editor]");
    if (editor) editor.hidden = false;
    const form = document.querySelector("[data-custom-food-form]");
    form?.reset();
    const barcodeInput = form?.elements?.barcode;
    if (barcodeInput) barcodeInput.value = barcode;
    window.setTimeout(() => form?.elements?.name?.focus(), 30);
}

function setBarcodeStatus(message) {
    setText("[data-barcode-status]", message);
}

function normalizeClientBarcode(value) {
    return String(value || "").replace(/\D/g, "");
}

function isSupportedClientBarcode(value) {
    return [8, 12, 13, 14].includes(String(value || "").length) && !/^0+$/.test(String(value || ""));
}

function showFoodMode(mode) {
    document.querySelectorAll("[data-food-mode]").forEach(button => button.classList.toggle("active", button.dataset.foodMode === mode));
    document.querySelectorAll("[data-food-mode-panel]").forEach(panel => { panel.hidden = panel.dataset.foodModePanel !== mode; });
    document.querySelector("[data-food-portion]")?.setAttribute("hidden", "");
    if (mode === "recent") renderRecents();
    if (mode === "meals") renderSavedMeals();
    if (mode === "custom") renderCustomFoods();
}

function initializeFoodVoiceInput() {
    document.querySelector('[data-food-voice]')?.addEventListener('click',()=>openMealBuilder([], '', null, {voiceMode:true}));
}
async function toggleFoodVoiceInput() {
    if(foodVoiceRecognition){foodVoiceRecognition.stop();return;}
    if(!mealDraft?.voiceMode || mealDraft.importing)return;
    const draft=mealDraft;
    draft.voiceError='';
    draft.voiceTranscript='';
    const session=createFoodSpeechSession({
        onText:text=>{if(mealDraft!==draft)return;draft.voiceTranscript=text;const input=document.querySelector('[data-voice-transcript]');if(input)input.value=text;},
        onError:message=>{if(mealDraft!==draft)return;draft.voiceError=message;},
        onUtterance:text=>{if(mealDraft===draft)queueVoiceFoods(text);},
        onEnd:(text,pending)=>{
            if(mealDraft!==draft)return;
            foodVoiceRecognition=null;draft.voiceListening=false;draft.voiceTranscript='';
            if(pending?.trim())queueVoiceFoods(pending);
            renderMealBuilder();
        }
    });
    foodVoiceRecognition=session;draft.voiceListening=true;renderMealBuilder();
    try {await session.start();}
    catch(error){if(mealDraft!==draft)return;session.abort();foodVoiceRecognition=null;draft.voiceListening=false;draft.voiceError=error?.message||'Voice could not start. Type your foods below.';renderMealBuilder();}
}
function setFoodVoiceState(){ /* The recording control is rendered from its draft. */ }
async function importVoiceTranscript(){
    if(!mealDraft?.voiceMode||mealDraft.importing||mealDraft.voiceListening)return;
    const input=document.querySelector('[data-voice-transcript]');
    const text=input?.value || mealDraft.voiceTranscript || '';
    if(!voiceIngredients(text).length){mealDraft.voiceError='Say or type a food and its amount.';renderMealBuilder();return;}
    mealDraft.voiceTranscript='';queueVoiceFoods(text);
}
function queueVoiceFoods(text){
    if(!mealDraft?.voiceMode || !text.trim())return;
    const history={text:text.trim(),status:'Finding foods…'};
    mealDraft.voiceHistory.push(history);mealDraft.voiceQueue.push({text:text.trim(),history});
    if(!mealDraft.voiceQueueRunning)void processVoiceQueue(mealDraft);
    renderMealBuilder();
}
async function processVoiceQueue(draft){
    if(draft.voiceQueueRunning)return;
    draft.voiceQueueRunning=true;
    while(mealDraft===draft && draft.voiceQueue.length){
        const batch=draft.voiceQueue.shift(),before=draft.items.length,missing=draft.importUnresolved.length;
        draft.pasteText=voiceIngredients(batch.text).map(i=>i.original).join('\n');
        await importPastedIngredients();
        if(mealDraft!==draft)return;
        const added=draft.items.length-before;
        batch.history.status=added?`${added} food${added===1?'':'s'} added to review${draft.importUnresolved.length>missing?' · some need a match':''}`:'Choose a match below';
        renderMealBuilder();
    }
    draft.voiceQueueRunning=false;
    if(mealDraft===draft)renderMealBuilder();
}

function voiceReviewMarkup(){
    const d=mealDraft;
    return `<label class="food-voice-meal">Log to<select data-voice-meal>${MEALS.map(m=>`<option${m===selectedMeal?' selected':''}>${m}</option>`).join('')}</select></label>
    <section class="food-voice-recorder" aria-label="Describe your meal">
      <strong data-voice-state>${d.voiceListening?'Listening…':d.importing?'Finding your foods…':'What did you eat?'}</strong>
      <p>Say the amount, food and brand: “Two bananas and 150 grams of Kirkland blueberries.”</p>
      <textarea data-voice-transcript rows="3" maxlength="2000" aria-label="Meal transcript" placeholder="Your words appear here. You can also type or correct them."${d.voiceListening?' readonly':''}>${escapeHtml(d.voiceTranscript||'')}</textarea>
      <div class="food-voice-recorder-actions"><button type="button" class="food-voice-mic" data-voice-record aria-label="${d.voiceListening?'Stop recording':'Start recording'}" title="${d.voiceListening?'Stop recording':'Start recording'}" aria-pressed="${Boolean(d.voiceListening)}"${d.importing&&!d.voiceListening?' disabled':''}>${FOOD_MIC_ICON}</button><button type="button" data-voice-match${d.importing||d.voiceListening?' disabled':''}>Find foods</button></div>
      <p role="status" aria-live="polite">${escapeHtml(d.voiceError||d.importStatus||'Tap the microphone and speak. Pause between foods or say them in a list.')}</p>
      ${d.voiceHistory.length?`<ol class="food-voice-history" aria-label="Heard foods">${d.voiceHistory.map(h=>`<li><span>${escapeHtml(h.text)}</span><small>${escapeHtml(h.status)}</small></li>`).join('')}</ol>`:''}
    </section>
    ${d.importUnresolved.length?`<div class="food-voice-unresolved"><strong>Choose a match</strong>${d.importUnresolved.map((text,i)=>`<div><span>${escapeHtml(text)}</span><button type="button" data-voice-resolve="${i}">Find food</button><button type="button" data-voice-dismiss="${i}" aria-label="Remove ${escapeHtml(text)}">×</button></div>`).join('')}</div>`:''}`;
}
async function openVoiceSwap(index=null,unresolvedIndex=null){
    if(!mealDraft || mealDraft.importing || mealDraft.voiceListening)return;
    const draft=mealDraft,entry=index!==null?draft.items[index]:null;
    const ingredient=entry?.voiceIngredient || voiceIngredients(draft.importUnresolved[unresolvedIndex]||'')[0];
    const panel=document.querySelector('[data-meal-builder]');
    const old=panel.querySelector('.food-voice-swap');old?.remove();
    const host=document.createElement('section');host.className='food-voice-swap';host.setAttribute('aria-label','Find a replacement food');
    host.innerHTML=`<header><strong>${entry?'Swap '+escapeHtml(entry.name):'Find food'}</strong><button type="button" data-swap-close aria-label="Close food swap">×</button></header><form><input type="search" aria-label="Search food and brand" placeholder="Food name and brand" value="${escapeHtml(ingredient?.name||entry?.name||'')}"><button type="submit">Search</button></form><p role="status" data-swap-status>Search for the food and brand you want.</p><div data-swap-results></div>`;
    panel.appendChild(host);host.scrollIntoView({block:'nearest',behavior:'smooth'});
    let controller,version=0;
    const close=()=>{version++;controller?.abort();host.remove();};
    host.querySelector('[data-swap-close]').addEventListener('click',close);
    const search=async event=>{
      event?.preventDefault();const query=host.querySelector('input').value.trim();if(query.length<2)return;
      const request=++version;controller?.abort();controller=new AbortController();
      const status=host.querySelector('[data-swap-status]');status.textContent='Searching…';
      let foods=matchingLoggedFoods(query,20);
      try{const token=sessionToken();if(token){const r=await fetch(`${API_URL}/v1/foods/search?q=${encodeURIComponent(query)}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});const payload=await r.json();if(!r.ok)throw Error(payload.error||'Search unavailable.');foods=prioritizeLoggedFoodMatches(query,payload.foods||[],30);}
        if(mealDraft!==draft||request!==version||!host.isConnected)return;
        status.textContent=foods.length?'Choose a food, then check its amount.':sessionToken()?'No matches. Try a shorter name.':'Sign in to search more foods, or choose a previously logged food.';
        renderFoodResults(host.querySelector('[data-swap-results]'),foods,async food=>{
          if(mealDraft!==draft)return;close();voiceSwapRequest={itemIndex:index,unresolvedIndex,ingredient};editingMealItemIndex=index;addContext='meal-builder';
          panel.hidden=true;await chooseFood(food);if(mealDraft!==draft)return;
          const normalized=withFoodWeightUnits(withUsefulLiquidPortions(selectedFood));
          const selection=entry?replacementVoicePortion(entry,normalized):voicePortion(ingredient||{amount:1,unit:'serving'},normalized);
          if(selection?.portion){restoreFoodAmount(document.querySelector('[data-food-portion]'),selectedFood,selectedFood.portions.findIndex(p=>p.label===selection.portion.label),selection.quantity);updatePortionPreview();}
        });
      }catch(error){if(request===version&&mealDraft===draft&&error?.name!=='AbortError')status.textContent=error.message||'Search failed. Try again.';}
    };
    host.querySelector('form').addEventListener('submit',search);host.querySelector('input').focus();void search();
}

async function searchFoods(event) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") || "").trim();
    showFoodMode("search");
    if (query.length < 2) return setText("[data-food-search-status]", "Enter at least 2 characters.");
    const token = sessionToken();
    const historyFoods = matchingLoggedFoods(query, 20);
    if (!token) {
        renderFoodResults(document.querySelector("[data-food-results]"), historyFoods);
        return setText("[data-food-search-status]", historyFoods.length ? `${historyFoods.length} previously logged matches` : "Sign in to search foods. Custom foods still work offline.");
    }
    setText("[data-food-search-status]", "Searching foods…");
    const results = document.querySelector("[data-food-results]");
    if (results) results.innerHTML = "";
    foodSearchController?.abort();
    foodSearchController = new AbortController();
    try {
        const country = foodSearchCountry();
        const response = await fetch(`${API_URL}/v1/foods/search?q=${encodeURIComponent(query)}&country=${country}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: foodSearchController.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Food search could not be loaded.");
        const foods = prioritizeLoggedFoodMatches(query, payload.foods || []);
        renderFoodResults(results, foods);
        const historyCount = foods.filter(food => food?.previouslyLogged).length;
        const countLabel = `${foods.length} matches${historyCount ? ` · ${historyCount} previously logged` : ""}`;
        setText("[data-food-search-status]", foods.length ? countLabel : "No matches. Try a simpler name or create a custom food.");
    }
    catch (error) {
        if (error?.name === "AbortError") return;
        setText("[data-food-search-status]", error.message || "Food search could not be loaded.");
    }
}

function renderFoodResults(container, foods, onSelect = chooseFood) {
    if (!container) return;
    container.innerHTML = foods.map((food, index) => foodResultMarkup(food, index)).join("");
    container.querySelectorAll("[data-food-result]").forEach(button => button.addEventListener("click", () => onSelect(foods[Number(button.dataset.foodResult)])));
}

function readRememberedBarcodeFood(barcode) {
    try {
        const choices = JSON.parse(localStorage.getItem(BARCODE_CHOICE_KEY) || "{}");
        const entry = choices?.[barcode];
        if (!entry?.food || Date.now() - Number(entry.updatedAt || 0) > BARCODE_CHOICE_MAX_AGE_MS) return null;
        return entry.food;
    }
    catch { return null; }
}

function rememberBarcodeFood(barcode, food) {
    if (!barcode || !food) return;
    try {
        const choices = JSON.parse(localStorage.getItem(BARCODE_CHOICE_KEY) || "{}");
        choices[barcode] = { food, updatedAt: Date.now() };
        const recent = Object.entries(choices)
            .sort(([, a], [, b]) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0))
            .slice(0, 100);
        localStorage.setItem(BARCODE_CHOICE_KEY, JSON.stringify(Object.fromEntries(recent)));
        barcodeFoodCache.set(barcode, food);
    }
    catch {}
}

function foodResultMarkup(food, index) {
    const portion = withUsefulLiquidPortions(food).portions?.[0];
    const nutrition = portion?.nutrition || {};
    const defaultSourceLabel = food.previouslyLogged
        ? `${food.brand ? `${food.brand} · ` : ""}Previously logged`
        : (food.brand || (food?.provenance?.nutritionScope === "calories_only" ? "Calories only" : "Generic food"));
    const sourceLabel = food.barcodeCandidate
        ? `${food.brand ? `${food.brand} · ` : ""}P ${roundOne(nutrition.protein || 0)}g · C ${roundOne(nutrition.carbs || 0)}g · F ${roundOne(nutrition.fat || 0)}g`
        : defaultSourceLabel;
    return `<button class="food-result" type="button" data-food-result="${index}"><span class="food-result-emoji" aria-hidden="true">${getFoodEmoji(food)}</span><span class="food-result-copy"><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(sourceLabel)}</small></span><b>${Math.round(portion?.nutrition?.calories || 0)} kcal<small>${escapeHtml(portion?.label || "per 100 g")}</small></b></button>`;
}

async function chooseFood(food) {
    const requestId = ++foodSelectionRequest;
    foodDetailController?.abort();
    if (food?.source === "usda" && food?.fdcId && !food.detailsLoaded) {
        renderFoodLoading(food);
        try {
            const detailed = await loadFoodDetails(food);
            if (requestId !== foodSelectionRequest) return;
            renderFoodPortionPanel(detailed);
        }
        catch (error) {
            if (error?.name === "AbortError" || requestId !== foodSelectionRequest) return;
            renderFoodPortionPanel(food, "Full serving choices could not load. Showing the available value.");
        }
        return;
    }
    if (food?.source === "fatsecret" && food?.fatSecretFoodId && !hasFatSecretServingId(food)) {
        renderFoodLoading(food);
        try {
            const detailed = await loadFatSecretFoodDetails(food);
            if (requestId !== foodSelectionRequest) return;
            renderFoodPortionPanel(detailed);
        }
        catch (error) {
            if (error?.name === "AbortError" || requestId !== foodSelectionRequest) return;
            renderFoodDetailError(food, error?.message || "Serving details could not be loaded.");
        }
        return;
    }
    renderFoodPortionPanel(food);
}

async function loadFoodDetails(food) {
    const cacheKey = String(food.fdcId);
    if (foodDetailCache.has(cacheKey)) return foodDetailCache.get(cacheKey);
    const token = sessionToken();
    if (!token) throw new Error("Sign in to load serving details.");
    foodDetailController = new AbortController();
    const response = await fetch(`${API_URL}/v1/foods/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: foodDetailController.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.food) throw new Error(payload.error || "Serving details could not be loaded.");
    foodDetailCache.set(cacheKey, payload.food);
    return payload.food;
}

async function loadFatSecretFoodDetails(food) {
    const foodId = String(food?.fatSecretFoodId || "").trim();
    if (!/^\d+$/.test(foodId)) throw new Error("This restaurant item is missing its food identifier.");
    const cacheKey = `fatsecret:${foodId}`;
    if (foodDetailCache.has(cacheKey)) return foodDetailCache.get(cacheKey);
    const token = sessionToken();
    if (!token) throw new Error("Sign in to load serving details.");
    foodDetailController = new AbortController();
    const response = await fetch(`${API_URL}/v1/foods/fatsecret/${encodeURIComponent(foodId)}?country=${foodSearchCountry()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: foodDetailController.signal,
        cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.food || !hasFatSecretServingId(payload.food)) {
        throw new Error(payload.error || "Complete serving details are unavailable for this item.");
    }
    foodDetailCache.set(cacheKey, payload.food);
    return payload.food;
}

function hasFatSecretServingId(food) {
    return Array.isArray(food?.portions) && food.portions.some(portion => /^\d+$/.test(String(portion?.servingId || "")));
}

function foodSearchCountry() {
    return String(navigator.language || "en-CA").toUpperCase().endsWith("-US") ? "US" : "CA";
}

function renderFoodLoading(food) {
    selectedFood = food;
    const panel = document.querySelector("[data-food-portion]");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = `
        <div class="food-portion-heading"><div><span class="eyebrow">${addContext === "edit" ? "EDIT LOGGED FOOD" : editingMealItemIndex !== null ? "EDIT MEAL ITEM" : "ADD FOOD"}</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="${addContext === "edit" ? "Cancel editing" : "Back to results"}">×</button></div>
        <div class="food-portion-loading" role="status"><strong>Loading servings…</strong><span>Getting the available per-item options.</span></div>`;
    panel.querySelector("[data-food-portion-close]")?.addEventListener("click", closeFoodPortionPanel);
}

function renderFoodDetailError(food, message) {
    selectedFood = food;
    const panel = document.querySelector("[data-food-portion]");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = `
        <div class="food-portion-heading"><div><span class="eyebrow">SERVING DETAILS</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="Back to results">×</button></div>
        <div class="food-portion-loading" role="alert"><strong>Couldn’t load this item</strong><span>${escapeHtml(message)}</span><button type="button" class="primary-btn" data-food-detail-retry>Try again</button></div>`;
    panel.querySelector("[data-food-portion-close]")?.addEventListener("click", closeFoodPortionPanel);
    panel.querySelector("[data-food-detail-retry]")?.addEventListener("click", () => { void chooseFood(food); });
}

function closeFoodPortionPanel() {
    if (addContext === "edit") {
        closeFoodSheet();
        return;
    }
    foodSelectionRequest += 1;
    foodDetailController?.abort();
    document.querySelector("[data-food-portion]")?.setAttribute("hidden", "");
    if (addContext === "meal-builder" && mealDraft) {
        editingMealItemIndex = null;
        renderMealBuilder();
    }
}

function renderFoodPortionPanel(food, warning = "") {
    food = withFoodWeightUnits(withUsefulLiquidPortions(food));
    selectedFood = food;
    const panel = document.querySelector("[data-food-portion]");
    if (!panel) return;
    panel.hidden = false;
    panel.classList.add("food-detail-v2");
    panel.innerHTML = `
        ${foodHeroMarkup(food)}
        <div class="food-portion-heading"><div><span class="eyebrow">${addContext === "edit" ? "EDIT LOGGED FOOD" : editingMealItemIndex !== null ? "EDIT MEAL ITEM" : "ADD FOOD"}</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="${addContext === "edit" ? "Close food editor" : "Back to results"}">×</button></div>
        ${addContext === "meal-builder" ? `<div class="food-builder-destination">${editingMealItemIndex !== null ? "Updating an item in your saved meal" : "Adding to your saved meal"}</div>` : `<label class="food-detail-meal">Meal<select data-food-meal>${MEALS.map(meal => `<option${meal === selectedMeal ? " selected" : ""}>${meal}</option>`).join("")}</select></label>`}
        ${warning ? `<p class="food-portion-warning">${escapeHtml(warning)}</p>` : ""}
        ${foodAmountMarkup(food)}
        <button type="button" class="primary-btn" data-food-confirm>${addContext === "meal-builder" ? (editingMealItemIndex !== null ? "Update Item" : "Add to Meal") : addContext === "edit" ? "Save Changes" : "Add to Food Log"}</button>
        ${addContext === "edit" ? '<button type="button" class="food-edit-remove" data-food-edit-remove>Remove Food</button>' : ""}
    `;
    const dismiss = panel.querySelector(".food-portion-heading [data-food-portion-close]");
    if (dismiss) {
        dismiss.classList.add("food-detail-dismiss");
        panel.querySelector(".food-detail-photo")?.appendChild(dismiss);
    }
    panel.querySelectorAll("[data-food-portion-close]").forEach(button => button.addEventListener("click", closeFoodPortionPanel));
    bindFoodAmountEditor(panel, food, { onUpdate: updatePortionPreview, getTargets: activeTargets });
    panel.querySelector("[data-food-confirm]")?.addEventListener("click", addSelectedFood);
    panel.querySelector("[data-food-edit-remove]")?.addEventListener("click", removeEditedFood);
    updatePortionPreview();
}

function updatePortionPreview() {
    if (!selectedFood) return;
    document.querySelector("[data-food-portion]")?.foodAmountRefresh?.();
    const portion = selectedFood.portions?.[Number(document.querySelector("[data-food-serving]")?.value)] || selectedFood.portions?.[0];
    const quantity = Math.max(0, Number(document.querySelector("[data-food-quantity]")?.value) || 0);
    const n = portion?.nutrition || {};
    const preview = document.querySelector("[data-food-preview]");
    if (!preview) return;
    if (addContext === "edit") {
        preview.innerHTML = foodMacroBreakdown(n, quantity, portion?.label);
        preview.classList.add("food-portion-preview--macros");
    }
    else {
        preview.classList.remove("food-portion-preview--macros");
        preview.innerHTML = `<strong>${roundOne(quantity)} × ${escapeHtml(portion?.label || "1 serving")}</strong><span>${Math.round((n.calories || 0) * quantity)} kcal · P ${roundOne((n.protein || 0) * quantity)} g · C ${roundOne((n.carbs || 0) * quantity)} g · F ${roundOne((n.fat || 0) * quantity)} g</span>`;
    }
}

function macroBreakdownMarkup(nutrition, heading) {
    const values = {
        carbs: Math.max(0, Number(nutrition?.carbs) || 0),
        fat: Math.max(0, Number(nutrition?.fat) || 0),
        protein: Math.max(0, Number(nutrition?.protein) || 0)
    };
    const calories = Math.max(0, Number(nutrition?.calories) || 0);
    const macroCalories = values.carbs * 4 + values.fat * 9 + values.protein * 4;
    const percentages = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, macroCalories ? Math.round(value * (key === "fat" ? 9 : 4) / macroCalories * 100) : 0]));
    const carbEnd = percentages.carbs;
    const fatEnd = Math.min(100, carbEnd + percentages.fat);
    return `<div class="food-edit-serving">${escapeHtml(heading)}</div><div class="food-edit-macro-breakdown"><div class="food-edit-calorie-ring" style="--carb-end:${carbEnd}%;--fat-end:${fatEnd}%"><span><strong>${Math.round(calories)}</strong><small>cal</small></span></div><div class="food-edit-macro food-edit-macro--carbs"><em>${percentages.carbs}%</em><strong>${roundOne(values.carbs)} g</strong><small>Carbs</small></div><div class="food-edit-macro food-edit-macro--fat"><em>${percentages.fat}%</em><strong>${roundOne(values.fat)} g</strong><small>Fat</small></div><div class="food-edit-macro food-edit-macro--protein"><em>${percentages.protein}%</em><strong>${roundOne(values.protein)} g</strong><small>Protein</small></div></div>`;
}

function foodMacroBreakdown(nutrition, quantity, servingLabel) {
    return macroBreakdownMarkup(scaledNutrition(nutrition, quantity), `${roundOne(quantity)} × ${servingLabel || "1 serving"}`);
}

function mealFoodForEntry(entry) {
    const quantity = Math.max(.01, Number(entry?.quantity) || 1);
    return entry?.food?.portions?.length ? entry.food : {
        source: entry?.source || "custom",
        catalogueId: entry?.catalogueId || null,
        fdcId: entry?.fdcId || null,
        name: entry?.name || "Food",
        brand: entry?.brand || "",
        portions: [{ label: entry?.servingLabel || "1 serving", nutrition: scaledNutrition(entry?.nutrition, 1 / quantity) }]
    };
}

function mealItemDetailsMarkup(entry, index, {allowSwap=false}={}) {
    const food = withFoodWeightUnits(withUsefulLiquidPortions(mealFoodForEntry(entry)));
    const quantity = Math.max(.01, Number(entry?.quantity) || 1);
    const portions = food.portions || [];
    const servingIndex = Math.max(0, portions.findIndex(portion => portion?.label === entry?.servingLabel));
    const portion = portions[servingIndex] || portions[0] || {};
    return `<details class="food-builder-item-details" data-meal-item-details="${index}">
        <summary><span><strong>${escapeHtml(entry?.name || "Food")}</strong><small>${escapeHtml(entry?.brand?entry.brand+" · ":"")}${escapeHtml(totalServingLabel(quantity, entry?.servingLabel))}</small></span><b>${Math.round(entry?.nutrition?.calories || 0)} kcal</b><i aria-hidden="true">›</i></summary>
        <div class="food-builder-item-editor">
            <div class="food-builder-item-edit-heading"><span class="eyebrow">EDIT ITEM</span><strong>Serving and quantity</strong></div>
            ${allowSwap && entry.voiceIngredient?.unit==='serving' && entry.voiceIngredient?.assumed ? '<p class="food-voice-review-copy">Amount not heard · using 1 serving. Check the amount.</p>' : ''}
            ${foodAmountMarkup(food, {index: servingIndex, quantity, servingAttr: 'data-meal-item-serving', quantityAttr: 'data-meal-item-quantity'})}
            <div class="food-portion-preview food-portion-preview--macros" data-meal-item-preview>${foodMacroBreakdown(portion.nutrition || {}, quantity, portion.label)}</div>
            <div class="food-builder-item-actions"><button type="button" data-meal-item-remove>Remove Item</button><button type="button" class="primary-btn" data-meal-item-save>Update Item</button>${allowSwap?`<button type="button" class="food-builder-item-swap" data-voice-swap="${index}">Swap food</button>`:""}</div>
        </div>
    </details>`;
}

function bindMealItemDetails(panel) {
    panel.querySelectorAll("[data-meal-item-details]").forEach(details => {
        const index = Number(details.dataset.mealItemDetails);
        const entry = mealDraft?.items?.[index];
        if (!entry) return;
        const food = withFoodWeightUnits(withUsefulLiquidPortions(mealFoodForEntry(entry)));
        const serving = details.querySelector("[data-meal-item-serving]");
        const quantity = details.querySelector("[data-meal-item-quantity]");
        const preview = details.querySelector("[data-meal-item-preview]");
        const updatePreview = () => {
            const portion = food.portions?.[Number(serving?.value)] || food.portions?.[0] || {};
            const amount = Math.max(.01, Number(quantity?.value) || 1);
            if (preview) preview.innerHTML = foodMacroBreakdown(portion.nutrition || {}, amount, portion.label);
        };
        bindFoodAmountEditor(details, food, {servingSelector:'[data-meal-item-serving]',quantitySelector:'[data-meal-item-quantity]',saveSelector:'[data-meal-item-save]',onUpdate:updatePreview,getTargets:activeTargets});
        updatePreview();
        details.addEventListener("toggle", () => {
            if (!details.open) return;
            panel.querySelectorAll("[data-meal-item-details][open]").forEach(item => {
                if (item !== details) item.removeAttribute("open");
            });
        });
        details.querySelector("[data-meal-item-save]")?.addEventListener("click", () => {
            const portion = food.portions?.[Number(serving?.value)] || food.portions?.[0];
            if (!portion) return;
            if (!validFoodAmount(quantity?.value)) return;
            const amount = Number(quantity.value);
            const updated = createLogEntry({ meal: selectedMeal, food, portion, quantity: amount });
            if (entry.pasteImported) updated.pasteImported = true;
            if(entry.voiceIngredient)updated.voiceIngredient=entry.voiceIngredient;
            mealDraft.items.splice(index, 1, updated);
            renderMealBuilder();
        });
        details.querySelector("[data-meal-item-remove]")?.addEventListener("click", () => {
            mealDraft.items.splice(index, 1);
            renderMealBuilder();
        });
    });
}

function addSelectedFood() {
    if (!selectedFood) return;
    const portion = selectedFood.portions?.[Number(document.querySelector("[data-food-serving]")?.value)] || selectedFood.portions?.[0];
    const meal = document.querySelector("[data-food-meal]")?.value || selectedMeal;
    const rawAmount = document.querySelector("[data-food-quantity]")?.value;
    if (!validFoodAmount(rawAmount)) return;
    const quantity = Number(rawAmount);
    const entry = createLogEntry({ meal, food: selectedFood, portion, quantity });
    if (addContext === "edit" && editingEntryId) {
        updateEntry(selectedDate, editingEntryId, entry);
        closeFoodSheet();
        return;
    }
    if (addContext === "meal-builder") {
        if(voiceSwapRequest && mealDraft?.voiceMode){
            entry.voiceIngredient=voiceSwapRequest.ingredient;
            if(voiceSwapRequest.unresolvedIndex!==null)mealDraft.importUnresolved.splice(voiceSwapRequest.unresolvedIndex,1);
        }
        if (editingMealItemIndex !== null) mealDraft.items.splice(editingMealItemIndex, 1, entry);
        else mealDraft.items.push(entry);
        editingMealItemIndex = null;
        document.querySelector("[data-food-portion]")?.setAttribute("hidden", "");
        renderMealBuilder();
        return;
    }
    selectedMeal = MEALS.includes(meal) ? meal : selectedMeal;
    saveEntry(selectedDate, entry);
    closeFoodSheet();
}

function openLoggedFoodEditor(entryId) {
    const entry = entriesForDate(selectedDate).find(item => item?.id === entryId);
    if (!entry) return;
    const quantity = Math.max(.01, Number(entry.quantity) || 1);
    const food = entry.food?.portions?.length ? entry.food : {
        source: entry.source || "custom",
        catalogueId: entry.catalogueId || null,
        fdcId: entry.fdcId || null,
        name: entry.name || "Food",
        brand: entry.brand || "",
        portions: [{ label: entry.servingLabel || "1 serving", nutrition: scaledNutrition(entry.nutrition, 1 / quantity) }]
    };
    openFoodSheet(entry.meal);
    addContext = "edit";
    editingEntryId = entry.id;
    renderFoodPortionPanel(food);
    const servingIndex = Math.max(0, (food.portions || []).findIndex(portion => portion?.label === entry.servingLabel));
    const serving = document.querySelector("[data-food-serving]");
    const quantityInput = document.querySelector("[data-food-quantity]");
    const mealSelect = document.querySelector("[data-food-meal]");
    if (serving) serving.value = String(servingIndex);
    if (quantityInput) quantityInput.value = String(quantity);
    restoreFoodAmount(document.querySelector('[data-food-portion]'),selectedFood,servingIndex,quantity);
    if (mealSelect) mealSelect.value = entry.meal;
    updatePortionPreview();
}

function removeEditedFood() {
    if (!editingEntryId) return;
    removeEntry(selectedDate, editingEntryId);
    closeFoodSheet();
}

function setCustomFoodField(form, name, value) {
    const field = form?.elements?.namedItem(name);
    if (field) field.value = value == null ? "" : String(value);
}

function beginCustomFoodCreation() {
    const editor = document.querySelector("[data-custom-food-editor]");
    const form = document.querySelector("[data-custom-food-form]");
    if (!editor || !form) return;
    if (!editor.hidden && editingCustomFoodId === null) {
        resetCustomFoodEditor();
        return;
    }
    editingCustomFoodId = null;
    form.reset();
    setCustomFoodField(form, "servingAmount", 1);
    setCustomFoodField(form, "servingUnit", "serving");
    editor.hidden = false;
    setText("[data-custom-food-eyebrow]", "CREATE FOOD");
    setText("[data-custom-food-title]", "Food details");
    setText("[data-custom-food-copy]", "Enter nutrition for one serving. Level Up will calculate other usable units when possible.");
    setText("[data-custom-food-submit]", "Save & Add");
    const cancel = form.querySelector("[data-custom-food-cancel]");
    if (cancel) cancel.hidden = true;
    form.elements.namedItem("name")?.focus();
}

function beginCustomFoodEdit(food) {
    const editor = document.querySelector("[data-custom-food-editor]");
    const form = document.querySelector("[data-custom-food-form]");
    if (!editor || !form || !food) return;
    editingCustomFoodId = food.id;
    setCustomFoodField(form, "brand", food.brand);
    setCustomFoodField(form, "name", food.name);
    setCustomFoodField(form, "servingAmount", food.servingAmount || 1);
    setCustomFoodField(form, "servingUnit", food.servingUnit || "serving");
    setCustomFoodField(form, "servingsPerContainer", food.servingsPerContainer);
    setCustomFoodField(form, "barcode", food.barcode);
    ["calories", "protein", "carbs", "fat", "fiber"].forEach(key => setCustomFoodField(form, key, food.nutrition?.[key] ?? ""));
    editor.hidden = false;
    setText("[data-custom-food-eyebrow]", "EDIT FOOD");
    setText("[data-custom-food-title]", food.name || "Food details");
    setText("[data-custom-food-copy]", "Update the serving details or nutrition. Changes apply the next time you log this food.");
    setText("[data-custom-food-submit]", "Save Changes");
    const cancel = form.querySelector("[data-custom-food-cancel]");
    if (cancel) cancel.hidden = false;
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetCustomFoodEditor() {
    editingCustomFoodId = null;
    const form = document.querySelector("[data-custom-food-form]");
    form?.reset();
    document.querySelector("[data-custom-food-editor]")?.setAttribute("hidden", "");
}

function createCustomFood(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nutrition = Object.fromEntries(["calories", "protein", "carbs", "fat"].map(key => [key, Math.max(0, Number(data.get(key)) || 0)]));
    nutrition.fiber = Math.max(0, Number(data.get("fiber")) || 0);
    const barcode = normalizeClientBarcode(data.get("barcode"));
    const servingAmount = Math.max(.01, Number(data.get("servingAmount")) || 1);
    const servingUnit = String(data.get("servingUnit") || "serving").toLowerCase();
    const servingsPerContainer = Math.max(0, Number(data.get("servingsPerContainer")) || 0);
    const portions = buildCustomFoodPortions({ amount: servingAmount, unit: servingUnit, nutrition });
    const wasEditing = Boolean(editingCustomFoodId);
    const food = saveCustomFood({
        id: editingCustomFoodId || crypto.randomUUID(),
        source: "custom",
        name: String(data.get("name") || "Custom food"),
        brand: String(data.get("brand") || "").trim(),
        barcode: isSupportedClientBarcode(barcode) ? barcode : "",
        servingLabel: portions[0].label,
        servingAmount,
        servingUnit,
        servingsPerContainer: servingsPerContainer || null,
        nutrition,
        portions
    });
    resetCustomFoodEditor();
    renderCustomFoods();
    if (wasEditing) showFoodToast("Food updated.");
    else chooseFood(food);
}

function renderRecents() {
    const foods = recentFoods(12);
    const container = document.querySelector("[data-food-recents]");
    if (!container) return;
    if (!foods.length) { container.innerHTML = '<p class="empty-state">Foods you log will appear here for faster reuse.</p>'; return; }
    renderFoodResults(container, foods);
}

function renderCustomFoods() {
    const foods = readCustomFoods();
    const container = document.querySelector("[data-custom-foods]");
    if (!container) return;
    if (!foods.length) { container.innerHTML = '<p class="empty-state">Foods you create will be saved here.</p>'; return; }
    container.innerHTML = foods.map((food, index) => `<div class="food-custom-row">${foodResultMarkup(food, index).replace("data-food-result", "data-log-custom-food")}<button type="button" class="food-custom-edit" data-edit-custom-food="${index}" aria-label="Edit ${escapeHtml(food.name)}">Edit</button></div>`).join("");
    container.querySelectorAll("[data-log-custom-food]").forEach(button => button.addEventListener("click", () => chooseFood(foods[Number(button.dataset.logCustomFood)])));
    container.querySelectorAll("[data-edit-custom-food]").forEach(button => button.addEventListener("click", () => beginCustomFoodEdit(foods[Number(button.dataset.editCustomFood)])));
}

function selectTargetMeal(meal) {
    selectedMeal = MEALS.includes(meal) ? meal : "Breakfast";
    document.querySelectorAll("[data-food-target-meal]").forEach(button => {
        const selected = button.dataset.foodTargetMeal === selectedMeal;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-checked", String(selected));
    });
    const select = document.querySelector("[data-food-meal]");
    if (select) select.value = selectedMeal;
}

function defaultMealForTime() {
    const hour = new Date().getHours();
    if (hour < 11) return "Breakfast";
    if (hour < 15) return "Lunch";
    if (hour < 21) return "Dinner";
    return "Snacks";
}

function bindYesterdayCopy(button) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let tracking = false;
    const copy = () => {
        const meal = button.dataset.copyYesterday;
        const sourceDate = button.dataset.copySourceDate;
        if (!sourceDate || sourceDate >= selectedDate) return;
        const source = entriesForDate(sourceDate).filter(entry => entry.meal === meal);
        if (!source.length) return;
        saveEntries(selectedDate, cloneEntriesForMeal(source, meal, { dateKey: sourceDate, meal }));
        showFoodToast(`${sourceDate === previousDateKey(selectedDate) ? "Yesterday’s" : "Most recent"} ${meal.toLowerCase()} added.`);
    };
    button.addEventListener("click", () => {
        if (button.dataset.swiped === "true") return;
        copy();
    });
    button.addEventListener("touchstart", event => {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        dx = 0;
        tracking = true;
        button.classList.add("dragging");
    }, { passive: true });
    button.addEventListener("touchmove", event => {
        if (!tracking) return;
        const touch = event.touches[0];
        if (Math.abs(touch.clientY - startY) > Math.abs(touch.clientX - startX)) { tracking = false; return; }
        dx = Math.max(0, Math.min(110, touch.clientX - startX));
        button.style.setProperty("--copy-drag", `${dx}px`);
    }, { passive: true });
    button.addEventListener("touchend", () => {
        button.classList.remove("dragging");
        button.style.removeProperty("--copy-drag");
        if (tracking && dx >= 72) {
            button.dataset.swiped = "true";
            copy();
            window.setTimeout(() => { button.dataset.swiped = "false"; }, 450);
        }
        tracking = false;
    }, { passive: true });
}

function showFoodToast(message) {
    const toast = document.querySelector("[data-food-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showFoodToast.timer);
    showFoodToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2200);
}

function openMealBuilder(entries = [], name = "", savedMeal = null, options = {}) {
    addContext = "meal-builder";
    editingMealItemIndex = null;
    mealDraft = {
        id: savedMeal?.id || null,
        name: savedMeal?.name ?? name,
        photoDataUrl: savedMeal?.photoDataUrl || "",
        items: (savedMeal?.items || entries).map(entry => ({ ...entry })),
        pasteOpen: Boolean(options.pasteOpen),
        pasteText: String(options.pasteText || ""),
        voiceMode: Boolean(options.voiceMode),
        voiceTranscript: "", voiceError: "", voiceListening: false, voiceHistory: [], voiceQueue: [], voiceQueueRunning: false,
        importStatus: "",
        importUnresolved: [],
        importing: false
    };
    renderMealBuilder();
}

function pastedIngredientsMarkup() {
    const unresolved = Array.isArray(mealDraft?.importUnresolved) ? mealDraft.importUnresolved : [];
    return `<details class="food-builder-paste" data-meal-paste${mealDraft?.pasteOpen ? " open" : ""}>
        <summary><span><strong>Paste Ingredients</strong><small>One ingredient per line with its amount</small></span><i aria-hidden="true">›</i></summary>
        <div class="food-builder-paste-body">
            <p>Paste a recipe or ingredient list. Level Up will match each food, calculate the quantities, and show the whole-meal macros for review.</p>
            <textarea data-meal-paste-input rows="6" maxlength="2000" placeholder="400 g potatoes&#10;330 g chicken breast&#10;225 g mixed vegetables&#10;100 g corn&#10;1 tbsp olive oil">${escapeHtml(mealDraft?.pasteText || "")}</textarea>
            <button type="button" class="primary-btn" data-meal-paste-analyze${mealDraft?.importing ? " disabled" : ""}>${mealDraft?.importing ? "Matching ingredients…" : "Analyze Ingredients"}</button>
            ${mealDraft?.importStatus ? `<p class="food-builder-import-status" data-meal-import-status aria-live="polite">${escapeHtml(mealDraft.importStatus)}</p>` : '<p class="food-builder-import-status" data-meal-import-status aria-live="polite"></p>'}
            ${unresolved.length ? `<div class="food-builder-unresolved"><strong>Needs review</strong>${unresolved.map(item => `<span>${escapeHtml(item)}</span>`).join("")}<small>Use “Add Food” below to add or replace anything that did not match.</small></div>` : ""}
        </div>
    </details>`;
}

async function importPastedIngredients() {
    if (!mealDraft || mealDraft.importing) return;
    const draft = mealDraft;
    const input = document.querySelector("[data-meal-paste-input]");
    mealDraft.pasteText = String(input?.value || mealDraft.pasteText || "").trim();
    const ingredients = mealDraft.voiceMode ? voiceIngredients(mealDraft.pasteText) : parseIngredientText(mealDraft.pasteText);
    if (!ingredients.length) {
        mealDraft.importStatus = "Add at least one ingredient. Put each ingredient on its own line.";
        renderMealBuilder();
        return;
    }

    mealImportController?.abort();
    mealImportController = new AbortController();
    mealDraft.importing = true;
    mealDraft.importStatus = `Matching ${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}…`;
    if(!draft.voiceMode)mealDraft.importUnresolved = [];
    renderMealBuilder();

    const token = sessionToken();
    const imported = [];
    const unresolved = [];
    let processed=0;
    try {
        for (const ingredient of ingredients) {
            processed++;
            if(mealDraft!==draft || mealImportController.signal.aborted)return;
            const historyFoods = matchingLoggedFoods(ingredient.name, 8);
            let foods = historyFoods;
            if (token) {
                const response = await fetch(`${API_URL}/v1/foods/search?q=${encodeURIComponent(ingredient.name)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: mealImportController.signal
                });
                const payload = await response.json().catch(() => ({}));
                if (response.ok) foods = prioritizeLoggedFoodMatches(ingredient.name, payload.foods || [], 20);
            }
            const matched = draft.voiceMode ? accurateVoiceMatch(ingredient,foods) : chooseIngredientFood(ingredient, foods);
            let detailed=matched;
            if(draft.voiceMode && matched){
              try{if(matched.source==='usda'&&matched.fdcId&&!matched.detailsLoaded)detailed=await loadFoodDetails(matched);
              else if(matched.source==='fatsecret'&&matched.fatSecretFoodId&&!hasFatSecretServingId(matched))detailed=await loadFatSecretFoodDetails(matched);}catch(error){if(error?.name==='AbortError')return;detailed=null;}
            }
            if(mealDraft!==draft)return;
            const food = detailed ? withFoodWeightUnits(withUsefulLiquidPortions(detailed)) : null;
            const selection = food ? ingredientPortionSelection(ingredient, food) : null;
            if (!food || !selection?.portion) {
                unresolved.push(ingredient.original);
                continue;
            }
            const entry = createLogEntry({ meal: selectedMeal, food, portion: selection.portion, quantity: selection.quantity });
            entry.pasteImported = true;
            if(draft.voiceMode)entry.voiceIngredient=ingredient;
            imported.push(entry);
        }
    }
    catch (error) {
        if (error?.name === "AbortError") return;
        unresolved.push(...ingredients.slice(Math.max(0,processed-1)).map(item => item.original));
    }
    finally {
        if (!mealDraft || mealDraft !== draft) return;
        mealDraft.items = [...(draft.voiceMode?mealDraft.items:mealDraft.items.filter(item => !item?.pasteImported)), ...imported];
        mealDraft.importing = false;
        mealDraft.importUnresolved = [...new Set([...(draft.voiceMode?mealDraft.importUnresolved:[]),...unresolved])];
        mealDraft.importStatus = imported.length
            ? `Matched ${imported.length} of ${ingredients.length}. Review the foods and weights below before saving.`
            : token
                ? "No ingredients could be matched. Try simpler names or add the foods manually."
                : "Sign in to match new foods, or use foods you have logged before.";
        mealDraft.pasteOpen = true;
        renderMealBuilder();
    }
}

function compressMealPhoto(file) {
    return new Promise((resolve, reject) => {
        if (!file?.type?.startsWith("image/")) { reject(new Error("Choose an image file.")); return; }
        if (file.size > 15 * 1024 * 1024) { reject(new Error("Choose a photo smaller than 15 MB.")); return; }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("The photo could not be read."));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error("That photo format is not supported."));
            image.onload = () => {
                const size = 160;
                const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
                const width = image.naturalWidth * scale;
                const height = image.naturalHeight * scale;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const context = canvas.getContext("2d");
                context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
                resolve(canvas.toDataURL("image/jpeg", .68));
            };
            image.src = String(reader.result || "");
        };
        reader.readAsDataURL(file);
    });
}

async function setMealDraftPhoto(file) {
    try {
        mealDraft.photoDataUrl = await compressMealPhoto(file);
        renderMealBuilder();
    }
    catch (error) { showFoodToast(error?.message || "The photo could not be added."); }
}

function renderMealBuilder() {
    const panel = document.querySelector("[data-meal-builder]");
    if (!panel || !mealDraft) return;
    panel.hidden = false;
    const totals = summarizeEntries(mealDraft.items);
    const editingMeal = Boolean(mealDraft.id);
    const voiceMode = Boolean(mealDraft.voiceMode);
    voiceSwapRequest=null;
    panel.innerHTML = `
        <header class="food-builder-heading"><div><span class="eyebrow">${voiceMode ? "VOICE LOG" : "MY MEALS"}</span><h3>${voiceMode ? "Review Ingredients" : editingMeal ? "Edit Meal" : "Build a Meal"}</h3></div><button type="button" data-meal-builder-close aria-label="Close meal builder">×</button></header>
        ${voiceMode ? voiceReviewMarkup() : `<label>Meal name<input type="text" maxlength="100" value="${escapeHtml(mealDraft.name)}" placeholder="Post-workout lunch" data-meal-name></label><div class="food-builder-photo"><button type="button" data-meal-photo-pick>${mealDraft.photoDataUrl ? `<img src="${escapeHtml(mealDraft.photoDataUrl)}" alt="Meal thumbnail"><span>Change photo</span>` : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Add photo</span>'}</button>${mealDraft.photoDataUrl ? '<button type="button" data-meal-photo-remove>Remove</button>' : ""}<input type="file" accept="image/*" data-meal-photo-input hidden></div>`}
        ${voiceMode?"":pastedIngredientsMarkup()}
        <div class="food-builder-macros food-portion-preview food-portion-preview--macros">${macroBreakdownMarkup(totals, `Whole meal · ${mealDraft.items.length} item${mealDraft.items.length === 1 ? "" : "s"}`)}</div>
        <div class="food-builder-items">${mealDraft.items.map((entry, index) => mealItemDetailsMarkup(entry,index,{allowSwap:voiceMode})).join("") || '<p class="empty-state">Add foods to create a reusable meal.</p>'}</div>
        <button type="button" class="food-builder-add" data-meal-builder-add${voiceMode&&(mealDraft.voiceListening||mealDraft.importing)?' disabled':''}>+ Add Food</button>
        <button type="button" class="primary-btn" data-meal-builder-save ${mealDraft.items.length && !mealDraft.importing && !mealDraft.voiceListening && !mealDraft.voiceQueueRunning && (!voiceMode || !mealDraft.importUnresolved.length) ? "" : "disabled"}>${voiceMode ? `Log to ${escapeHtml(selectedMeal)}` : editingMeal ? "Save Changes" : "Save to My Meals"}</button>`;
    panel.querySelector("[data-meal-name]")?.addEventListener("input", event => { mealDraft.name = event.currentTarget.value; });
    panel.querySelector("[data-meal-photo-pick]")?.addEventListener("click", () => panel.querySelector("[data-meal-photo-input]")?.click());
    panel.querySelector("[data-meal-photo-input]")?.addEventListener("change", event => { if (event.currentTarget.files?.[0]) void setMealDraftPhoto(event.currentTarget.files[0]); });
    panel.querySelector("[data-meal-photo-remove]")?.addEventListener("click", () => { mealDraft.photoDataUrl = ""; renderMealBuilder(); });
    panel.querySelector("[data-meal-paste]")?.addEventListener("toggle", event => { mealDraft.pasteOpen = event.currentTarget.open; });
    panel.querySelector("[data-meal-paste-input]")?.addEventListener("input", event => { mealDraft.pasteText = event.currentTarget.value; });
    panel.querySelector("[data-meal-paste-analyze]")?.addEventListener("click", () => { void importPastedIngredients(); });
    panel.querySelector("[data-meal-builder-close]")?.addEventListener("click", () => { foodVoiceRecognition?.abort();foodVoiceRecognition=null;mealImportController?.abort();mealDraft=null;panel.hidden = true; addContext = "log"; editingMealItemIndex = null; showFoodMode("recent"); });
    panel.querySelector("[data-meal-builder-add]")?.addEventListener("click", () => { panel.hidden = true; addContext = "meal-builder"; editingMealItemIndex = null; showFoodMode("recent"); });
    bindMealItemDetails(panel);
    if(voiceMode){
      panel.querySelector('[data-voice-record]')?.addEventListener('click',()=>{void toggleFoodVoiceInput();});
      panel.querySelector('[data-voice-match]')?.addEventListener('click',()=>{void importVoiceTranscript();});
      panel.querySelector('[data-voice-transcript]')?.addEventListener('input',event=>{mealDraft.voiceTranscript=event.target.value;});
      panel.querySelector('[data-voice-meal]')?.addEventListener('change',event=>{selectedMeal=event.target.value;renderMealBuilder();});
      panel.querySelectorAll('[data-voice-swap]').forEach(b=>b.addEventListener('click',()=>{void openVoiceSwap(Number(b.dataset.voiceSwap));}));
      panel.querySelectorAll('[data-voice-resolve]').forEach(b=>b.addEventListener('click',()=>{void openVoiceSwap(null,Number(b.dataset.voiceResolve));}));
      panel.querySelectorAll('[data-voice-dismiss]').forEach(b=>b.addEventListener('click',()=>{mealDraft.importUnresolved.splice(Number(b.dataset.voiceDismiss),1);renderMealBuilder();}));
    }
    panel.querySelector("[data-meal-builder-save]")?.addEventListener("click", saveMealDraft);
}

function saveMealDraft() {
    if (mealDraft?.voiceMode) {
        if(mealDraft.importing || mealDraft.voiceListening || mealDraft.voiceQueueRunning || mealDraft.importUnresolved.length || !mealDraft.items.length)return;
        const items = mealDraft.items.map(entry => ({ ...entry, meal: selectedMeal }));
        saveEntries(selectedDate, [...entriesForDate(selectedDate), ...items]);
        const count = items.length;
        closeFoodSheet();
        showFoodToast(`${count} ingredient${count === 1 ? "" : "s"} added to ${selectedMeal}.`);
        return;
    }
    const name = String(document.querySelector("[data-meal-name]")?.value || "").trim();
    if (!name) {
        document.querySelector("[data-meal-name]")?.focus();
        return;
    }
    const wasEditing = Boolean(mealDraft.id);
    saveSavedMeal({ ...mealDraft, name });
    mealDraft = null;
    editingMealItemIndex = null;
    addContext = "log";
    document.querySelector("[data-meal-builder]")?.setAttribute("hidden", "");
    showFoodMode("meals");
    showFoodToast(wasEditing ? "Meal updated." : "Meal saved to My Meals.");
}

function renderSavedMeals() {
    const meals = readSavedMeals();
    const container = document.querySelector("[data-saved-meals]");
    if (!container) return;
    if (!meals.length) { container.innerHTML = '<p class="empty-state">Build a meal once, then log it here in one tap.</p>'; return; }
    container.innerHTML = meals.map((meal, index) => {
        const totals = summarizeEntries(meal.items);
        const photo = meal.photoDataUrl ? `<img class="food-saved-meal-thumbnail" src="${escapeHtml(meal.photoDataUrl)}" alt="${escapeHtml(meal.name)} meal photo">` : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
        return `<article class="food-saved-meal"><button type="button" class="food-saved-meal-photo" data-saved-meal-photo="${index}" aria-label="${meal.photoDataUrl ? "Change" : "Add"} photo for ${escapeHtml(meal.name)}">${photo}</button><button type="button" class="food-saved-meal-edit" data-edit-saved-meal="${index}" aria-label="Edit ${escapeHtml(meal.name)}"><strong>${escapeHtml(meal.name)}</strong><small>${escapeHtml(mealPreview(meal.items))}</small><span>${Math.round(totals.calories)} kcal · ${meal.items.length} items</span></button><button type="button" class="food-saved-meal-add" data-log-saved-meal="${index}" aria-label="Log ${escapeHtml(meal.name)} to ${selectedMeal}">+</button><button type="button" class="food-saved-meal-delete" data-delete-saved-meal="${escapeHtml(meal.id)}" aria-label="Delete ${escapeHtml(meal.name)}">×</button></article>`;
    }).join("");
    container.querySelectorAll("[data-edit-saved-meal]").forEach(button => button.addEventListener("click", () => {
        const meal = meals[Number(button.dataset.editSavedMeal)];
        openMealBuilder(meal.items, meal.name, meal);
    }));
    container.querySelectorAll("[data-log-saved-meal]").forEach(button => button.addEventListener("click", () => {
        const meal = meals[Number(button.dataset.logSavedMeal)];
        logSavedMeal(selectedDate, meal, selectedMeal);
        closeFoodSheet();
        showFoodToast(`${meal.name} added to ${selectedMeal}.`);
    }));
    container.querySelectorAll("[data-saved-meal-photo]").forEach(button => button.addEventListener("click", () => {
        const meal = meals[Number(button.dataset.savedMealPhoto)];
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.hidden = true;
        input.setAttribute("aria-hidden", "true");
        document.body.append(input);
        const cleanup = () => input.remove();
        input.addEventListener("cancel", cleanup, { once: true });
        input.addEventListener("change", async () => {
            try {
                if (!input.files?.[0]) return;
                const photoDataUrl = await compressMealPhoto(input.files[0]);
                const saved = saveSavedMeal({ ...meal, photoDataUrl });
                if (!saved.photoDataUrl) throw new Error("The compressed photo could not be stored.");
                renderSavedMeals();
                showFoodToast("Meal photo saved.");
            }
            catch (error) { showFoodToast(error?.message || "The photo could not be added."); }
            finally { cleanup(); }
        }, { once: true });
        input.click();
    }));
    container.querySelectorAll("[data-delete-saved-meal]").forEach(button => button.addEventListener("click", () => {
        if (!window.confirm("Delete this saved meal?")) return;
        removeSavedMeal(button.dataset.deleteSavedMeal);
        renderSavedMeals();
    }));
}

function activeTargets() {
    const plan = readJson("level_up_nutrition_plan", {});
    const phases = readJson("level_up_nutrition_phases", []);
    const active = Array.isArray(phases) ? [...phases].reverse().find(phase => !phase?.endDate) : null;
    const calories = Number(active?.currentCalories ?? active?.startCalories ?? plan?.calculatedCalories ?? plan?.currentCalories) || null;
    const preference = getNutritionMacroPreference();
    const manual = preference?.manualMacros;
    const hasManualTargets = preference?.useManual === true &&
        [manual?.protein, manual?.carbs, manual?.fat]
            .every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
    const calculated = hasManualTargets
        ? manual
        : calculateMacroTargets({
            calories,
            weightKg: poundsToKg(Number(getNutritionProfile()?.weightLb)),
            macroPreset: preference?.macroPreset || "balanced"
        });
    return {
        calories,
        protein: Number(calculated?.protein) || null,
        carbs: Number(calculated?.carbs) || null,
        fat: Number(calculated?.fat) || null
    };
}

function sessionToken() { return readJson(SESSION_KEY, {})?.token || ""; }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function setText(selector, value) { const node = document.querySelector(selector); if (node) node.textContent = value; }
function roundOne(value) { return Math.round((Number(value) || 0) * 10) / 10; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]); }
