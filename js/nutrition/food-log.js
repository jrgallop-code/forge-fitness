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
} from "./food-log-data.js?v=calculated-maintenance-1";
import {
    chooseIngredientFood,
    ingredientPortionSelection,
    parseIngredientText
} from "./ingredient-paste-parser.js?v=paste-ingredients-1";

const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const CALORIES_TAB_KEY = "level_up_calories_tab_v1";
const ZXING_BROWSER_URL = "https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/umd/zxing-browser.min.js";
const ZXING_BROWSER_INTEGRITY = "sha384-HRtzk9lZgkbSgvUyQrnfC/GxiXZgwaNyD7hC9wcXlsBpDhkS80ISl73juef2FRuf";
let selectedDate = localDateKey();
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
const foodDetailCache = new Map();
const barcodeFoodCache = new Map();

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
                <button type="button" data-food-date-today><strong data-food-date-label>Today</strong><small data-food-date-value></small></button>
                <button type="button" data-food-date-shift="1" aria-label="Next day">→</button>
            </div>
            <article class="food-daily-summary" data-food-summary></article>
            <div class="food-day-complete" data-food-day-complete></div>
            <div class="food-meals" data-food-meals></div>
            <p class="food-data-credit">Food data from Level Up verified sources, USDA FoodData Central, and Open Food Facts (ODbL). Nutrition values may vary by product and serving.</p>
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
                    <div class="food-search-entry"><div class="food-search-field"><input type="search" name="query" minlength="2" maxlength="80" autocomplete="off" placeholder="Search foods" aria-label="Search foods"></div><button type="button" class="food-barcode-open" data-barcode-open aria-label="Scan a food barcode" title="Scan barcode"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14M2.5 5h2M19.5 5h2M2.5 19h2M19.5 19h2"/></svg></button></div>
                    <button type="submit" class="primary-btn">Search</button>
                </form>
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
    hub.querySelector("[data-food-date-today]")?.addEventListener("click", () => { selectedDate = localDateKey(); renderDay(); });
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
    renderDay();
}

function renderDay() {
    const entries = entriesForDate(selectedDate);
    const yesterdayEntries = entriesForDate(previousDateKey(selectedDate));
    const totals = summarizeEntries(entries);
    const target = activeTargets();
    const date = new Date(`${selectedDate}T12:00:00`);
    const isToday = selectedDate === localDateKey();
    setText("[data-food-date-label]", isToday ? "Today" : date.toLocaleDateString(undefined, { weekday: "long" }));
    setText("[data-food-date-value]", date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
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
    if (meals) meals.innerHTML = MEALS.map(meal => mealMarkup(meal, entries.filter(entry => entry.meal === meal), yesterdayEntries.filter(entry => entry.meal === meal))).join("");
    meals?.querySelectorAll(".food-meal > summary").forEach(summary => {
        const details = summary.parentElement;
        summary.setAttribute("aria-expanded", String(Boolean(details?.open)));
        summary.addEventListener("click", event => {
            event.preventDefault();
            if (!details) return;
            details.open = !details.open;
            summary.setAttribute("aria-expanded", String(details.open));
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
    const targetText = safeTarget > 0 ? ` / ${Math.round(safeTarget)} g` : " g";
    const progress = safeTarget > 0
        ? Math.min(100, Math.max(0, (Number(value) / safeTarget) * 100))
        : 0;
    return `<div class="food-macro-total food-macro-total--${label.toLowerCase()}"><span>${label}</span><strong>${roundOne(value)}${escapeHtml(targetText)}</strong><i aria-hidden="true"><b style="width:${progress}%"></b></i></div>`;
}

function mealMarkup(meal, entries, yesterdayEntries) {
    const totals = summarizeEntries(entries);
    const yesterdayCopied = hasCopiedMeal(entries, previousDateKey(selectedDate), meal);
    const showYesterday = yesterdayEntries.length > 0 && !yesterdayCopied;
    return `
        <details class="food-meal">
            <summary><span><strong>${meal}</strong><small>${entries.length ? `${entries.length} item${entries.length === 1 ? "" : "s"}` : "Nothing logged"}</small></span><b>${Math.round(totals.calories)} kcal</b></summary>
            <div class="food-meal-body">
                ${entries.length ? `<div class="food-meal-macros">${macroBreakdownMarkup(totals, `${meal} total · ${entries.length} item${entries.length === 1 ? "" : "s"}`)}</div>` : ""}
                ${showYesterday ? `<button type="button" class="food-copy-yesterday" data-copy-yesterday="${meal}"><span><strong>Yesterday’s ${meal}</strong><small>${escapeHtml(mealPreview(yesterdayEntries))}</small></span><b>Swipe right <i>→</i></b></button>` : ""}
                ${entries.map(entry => `<div class="food-entry"><button type="button" class="food-entry-edit" data-food-edit="${escapeHtml(entry.id)}" aria-label="Edit ${escapeHtml(entry.name)}"><span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.brand ? `${entry.brand} · ` : "")}${escapeHtml(totalServingLabel(entry.quantity, entry.servingLabel))}</small></span><b>${Math.round(entry.nutrition?.calories || 0)} kcal</b><i aria-hidden="true">›</i></button><button type="button" class="food-entry-remove" data-food-remove="${escapeHtml(entry.id)}" aria-label="Remove ${escapeHtml(entry.name)}">×</button></div>`).join("")}
                ${entries.length ? `<button type="button" class="food-save-diary-meal" data-save-diary-meal="${meal}">Save ${meal} as My Meal</button>` : ""}
                <button type="button" class="food-add-meal" data-food-add-meal="${meal}">+ Add to ${meal}</button>
            </div>
        </details>
    `;
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
        const response = await fetch(`${API_URL}/v1/foods/barcode/${encodeURIComponent(barcode)}`, {
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
    setText("[data-food-search-status]", "Searching Level Up, USDA and Open Food Facts…");
    const results = document.querySelector("[data-food-results]");
    if (results) results.innerHTML = "";
    foodSearchController?.abort();
    foodSearchController = new AbortController();
    try {
        const country = String(navigator.language || "en-CA").toUpperCase().endsWith("-US") ? "US" : "CA";
        const response = await fetch(`${API_URL}/v1/foods/search?q=${encodeURIComponent(query)}&country=${country}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: foodSearchController.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Food search could not be loaded.");
        const foods = prioritizeLoggedFoodMatches(query, payload.foods || []);
        renderFoodResults(results, foods);
        const verifiedCount = foods.filter(food => food?.source === "levelup").length;
        const historyCount = foods.filter(food => food?.previouslyLogged).length;
        const countLabel = `${foods.length} matches${historyCount ? ` · ${historyCount} previously logged` : ""}${verifiedCount ? ` · ${verifiedCount} Level Up verified` : ""}`;
        setText("[data-food-search-status]", foods.length ? countLabel : "No matches. Try a simpler name or create a custom food.");
    }
    catch (error) {
        if (error?.name === "AbortError") return;
        setText("[data-food-search-status]", error.message || "Food search could not be loaded.");
    }
}

function renderFoodResults(container, foods) {
    if (!container) return;
    container.innerHTML = foods.map((food, index) => foodResultMarkup(food, index)).join("");
    container.querySelectorAll("[data-food-result]").forEach(button => button.addEventListener("click", () => chooseFood(foods[Number(button.dataset.foodResult)])));
}

function foodResultMarkup(food, index) {
    const portion = withUsefulLiquidPortions(food).portions?.[0];
    const verification = food?.provenance?.verificationStatus === "verified"
        ? `${food.countryCode || ""} official source${food?.provenance?.nutritionScope === "calories_only" ? " · Calories only" : ""}`.trim()
        : "";
    const sourceLabel = food.previouslyLogged
        ? `${food.brand || "Your history"} · Previously logged`
        : food.source === "levelup"
        ? `${food.brand || "Level Up"} · Verified${verification ? ` · ${verification}` : ""}`
        : (food.brand || food.dataType || "USDA food");
    return `<button class="food-result" type="button" data-food-result="${index}"><span><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(sourceLabel)}</small></span><b>${Math.round(portion?.nutrition?.calories || 0)} kcal<small>${escapeHtml(portion?.label || "per 100 g")}</small></b></button>`;
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
            renderFoodPortionPanel(food, "Full serving choices could not load. Showing the available USDA value.");
        }
        return;
    }
    renderFoodPortionPanel(food);
}

async function loadFoodDetails(food) {
    const cacheKey = String(food.fdcId);
    if (foodDetailCache.has(cacheKey)) return foodDetailCache.get(cacheKey);
    const token = sessionToken();
    if (!token) throw new Error("Sign in to load USDA serving details.");
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

function renderFoodLoading(food) {
    selectedFood = food;
    const panel = document.querySelector("[data-food-portion]");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = `
        <div class="food-portion-heading"><div><span class="eyebrow">${addContext === "edit" ? "EDIT LOGGED FOOD" : editingMealItemIndex !== null ? "EDIT MEAL ITEM" : "ADD FOOD"}</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="${addContext === "edit" ? "Cancel editing" : "Back to results"}">×</button></div>
        <div class="food-portion-loading" role="status"><strong>Loading servings…</strong><span>Getting the per-item options from USDA.</span></div>`;
    panel.querySelector("[data-food-portion-close]")?.addEventListener("click", closeFoodPortionPanel);
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
    food = withUsefulLiquidPortions(food);
    selectedFood = food;
    const panel = document.querySelector("[data-food-portion]");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = `
        <div class="food-portion-heading"><div><span class="eyebrow">${addContext === "edit" ? "EDIT LOGGED FOOD" : editingMealItemIndex !== null ? "EDIT MEAL ITEM" : "ADD FOOD"}</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="${addContext === "edit" ? "Close food editor" : "Back to results"}">×</button></div>
        ${addContext === "meal-builder" ? `<div class="food-builder-destination">${editingMealItemIndex !== null ? "Updating an item in your saved meal" : "Adding to your saved meal"}</div>` : `<label>Meal<select data-food-meal>${MEALS.map(meal => `<option${meal === selectedMeal ? " selected" : ""}>${meal}</option>`).join("")}</select></label>`}
        ${warning ? `<p class="food-portion-warning">${escapeHtml(warning)}</p>` : ""}
        <label>Serving size<select data-food-serving>${(food.portions || []).map((portion, index) => `<option value="${index}">${escapeHtml(portion.label)}</option>`).join("")}</select></label>
        <label>Number of servings<input data-food-quantity type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="1"></label>
        <div class="food-portion-preview" data-food-preview></div>
        <button type="button" class="primary-btn" data-food-confirm>${addContext === "meal-builder" ? (editingMealItemIndex !== null ? "Update Item" : "Add to Meal") : addContext === "edit" ? "Save Changes" : "Add to Food Log"}</button>
        ${addContext === "edit" ? '<button type="button" class="food-edit-remove" data-food-edit-remove>Remove Food</button>' : ""}
    `;
    panel.querySelector("[data-food-portion-close]")?.addEventListener("click", closeFoodPortionPanel);
    panel.querySelectorAll("select,input").forEach(input => input.addEventListener("input", updatePortionPreview));
    panel.querySelector("[data-food-confirm]")?.addEventListener("click", addSelectedFood);
    panel.querySelector("[data-food-edit-remove]")?.addEventListener("click", removeEditedFood);
    updatePortionPreview();
}

function updatePortionPreview() {
    if (!selectedFood) return;
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

function mealItemDetailsMarkup(entry, index) {
    const food = withUsefulLiquidPortions(mealFoodForEntry(entry));
    const quantity = Math.max(.01, Number(entry?.quantity) || 1);
    const portions = food.portions || [];
    const servingIndex = Math.max(0, portions.findIndex(portion => portion?.label === entry?.servingLabel));
    const portion = portions[servingIndex] || portions[0] || {};
    return `<details class="food-builder-item-details" data-meal-item-details="${index}">
        <summary><span><strong>${escapeHtml(entry?.name || "Food")}</strong><small>${escapeHtml(totalServingLabel(quantity, entry?.servingLabel))}</small></span><b>${Math.round(entry?.nutrition?.calories || 0)} kcal</b><i aria-hidden="true">›</i></summary>
        <div class="food-builder-item-editor">
            <div class="food-builder-item-edit-heading"><span class="eyebrow">EDIT ITEM</span><strong>Serving and quantity</strong></div>
            <label>Serving size<select data-meal-item-serving>${portions.map((item, portionIndex) => `<option value="${portionIndex}"${portionIndex === servingIndex ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
            <label>Quantity<input data-meal-item-quantity type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="${quantity}"></label>
            <div class="food-portion-preview food-portion-preview--macros" data-meal-item-preview>${foodMacroBreakdown(portion.nutrition || {}, quantity, portion.label)}</div>
            <div class="food-builder-item-actions"><button type="button" data-meal-item-remove>Remove Item</button><button type="button" class="primary-btn" data-meal-item-save>Update Item</button></div>
        </div>
    </details>`;
}

function bindMealItemDetails(panel) {
    panel.querySelectorAll("[data-meal-item-details]").forEach(details => {
        const index = Number(details.dataset.mealItemDetails);
        const entry = mealDraft?.items?.[index];
        if (!entry) return;
        const food = withUsefulLiquidPortions(mealFoodForEntry(entry));
        const serving = details.querySelector("[data-meal-item-serving]");
        const quantity = details.querySelector("[data-meal-item-quantity]");
        const preview = details.querySelector("[data-meal-item-preview]");
        const updatePreview = () => {
            const portion = food.portions?.[Number(serving?.value)] || food.portions?.[0] || {};
            const amount = Math.max(.01, Number(quantity?.value) || 1);
            if (preview) preview.innerHTML = foodMacroBreakdown(portion.nutrition || {}, amount, portion.label);
        };
        serving?.addEventListener("input", updatePreview);
        quantity?.addEventListener("input", updatePreview);
        details.addEventListener("toggle", () => {
            if (!details.open) return;
            panel.querySelectorAll("[data-meal-item-details][open]").forEach(item => {
                if (item !== details) item.removeAttribute("open");
            });
        });
        details.querySelector("[data-meal-item-save]")?.addEventListener("click", () => {
            const portion = food.portions?.[Number(serving?.value)] || food.portions?.[0];
            if (!portion) return;
            const amount = Math.max(.01, Number(quantity?.value) || 1);
            const updated = createLogEntry({ meal: selectedMeal, food, portion, quantity: amount });
            if (entry.pasteImported) updated.pasteImported = true;
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
    const quantity = Number(document.querySelector("[data-food-quantity]")?.value);
    const entry = createLogEntry({ meal, food: selectedFood, portion, quantity });
    if (addContext === "edit" && editingEntryId) {
        updateEntry(selectedDate, editingEntryId, entry);
        closeFoodSheet();
        return;
    }
    if (addContext === "meal-builder") {
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
        const sourceDate = previousDateKey(selectedDate);
        const source = entriesForDate(sourceDate).filter(entry => entry.meal === meal);
        if (!source.length) return;
        saveEntries(selectedDate, cloneEntriesForMeal(source, meal, { dateKey: sourceDate, meal }));
        showFoodToast(`Yesterday’s ${meal.toLowerCase()} added.`);
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
        pasteText: "",
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
    const ingredients = parseIngredientText(mealDraft.pasteText);
    if (!ingredients.length) {
        mealDraft.importStatus = "Add at least one ingredient. Put each ingredient on its own line.";
        renderMealBuilder();
        return;
    }

    mealImportController?.abort();
    mealImportController = new AbortController();
    mealDraft.importing = true;
    mealDraft.importStatus = `Matching ${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}…`;
    mealDraft.importUnresolved = [];
    renderMealBuilder();

    const token = sessionToken();
    const imported = [];
    const unresolved = [];
    try {
        for (const ingredient of ingredients) {
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
            const matched = chooseIngredientFood(ingredient, foods);
            const food = matched ? withUsefulLiquidPortions(matched) : null;
            const selection = ingredientPortionSelection(ingredient, food);
            if (!food || !selection?.portion) {
                unresolved.push(ingredient.original);
                continue;
            }
            const entry = createLogEntry({ meal: selectedMeal, food, portion: selection.portion, quantity: selection.quantity });
            entry.pasteImported = true;
            imported.push(entry);
        }
    }
    catch (error) {
        if (error?.name === "AbortError") return;
        unresolved.push(...ingredients.slice(imported.length).map(item => item.original));
    }
    finally {
        if (!mealDraft || mealDraft !== draft) return;
        mealDraft.items = [...mealDraft.items.filter(item => !item?.pasteImported), ...imported];
        mealDraft.importing = false;
        mealDraft.importUnresolved = [...new Set(unresolved)];
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
    panel.innerHTML = `
        <header class="food-builder-heading"><div><span class="eyebrow">MY MEALS</span><h3>${editingMeal ? "Edit Meal" : "Build a Meal"}</h3></div><button type="button" data-meal-builder-close aria-label="Close meal builder">×</button></header>
        <label>Meal name<input type="text" maxlength="100" value="${escapeHtml(mealDraft.name)}" placeholder="Post-workout lunch" data-meal-name></label>
        <div class="food-builder-photo"><button type="button" data-meal-photo-pick>${mealDraft.photoDataUrl ? `<img src="${escapeHtml(mealDraft.photoDataUrl)}" alt="Meal thumbnail"><span>Change photo</span>` : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Add photo</span>'}</button>${mealDraft.photoDataUrl ? '<button type="button" data-meal-photo-remove>Remove</button>' : ""}<input type="file" accept="image/*" data-meal-photo-input hidden></div>
        ${pastedIngredientsMarkup()}
        <div class="food-builder-macros food-portion-preview food-portion-preview--macros">${macroBreakdownMarkup(totals, `Whole meal · ${mealDraft.items.length} item${mealDraft.items.length === 1 ? "" : "s"}`)}</div>
        <div class="food-builder-items">${mealDraft.items.map((entry, index) => mealItemDetailsMarkup(entry, index)).join("") || '<p class="empty-state">Add foods to create a reusable meal.</p>'}</div>
        <button type="button" class="food-builder-add" data-meal-builder-add>+ Add Food</button>
        <button type="button" class="primary-btn" data-meal-builder-save ${mealDraft.items.length ? "" : "disabled"}>${editingMeal ? "Save Changes" : "Save to My Meals"}</button>`;
    panel.querySelector("[data-meal-name]")?.addEventListener("input", event => { mealDraft.name = event.currentTarget.value; });
    panel.querySelector("[data-meal-photo-pick]")?.addEventListener("click", () => panel.querySelector("[data-meal-photo-input]")?.click());
    panel.querySelector("[data-meal-photo-input]")?.addEventListener("change", event => { if (event.currentTarget.files?.[0]) void setMealDraftPhoto(event.currentTarget.files[0]); });
    panel.querySelector("[data-meal-photo-remove]")?.addEventListener("click", () => { mealDraft.photoDataUrl = ""; renderMealBuilder(); });
    panel.querySelector("[data-meal-paste]")?.addEventListener("toggle", event => { mealDraft.pasteOpen = event.currentTarget.open; });
    panel.querySelector("[data-meal-paste-input]")?.addEventListener("input", event => { mealDraft.pasteText = event.currentTarget.value; });
    panel.querySelector("[data-meal-paste-analyze]")?.addEventListener("click", () => { void importPastedIngredients(); });
    panel.querySelector("[data-meal-builder-close]")?.addEventListener("click", () => { panel.hidden = true; addContext = "log"; editingMealItemIndex = null; showFoodMode("meals"); });
    panel.querySelector("[data-meal-builder-add]")?.addEventListener("click", () => { panel.hidden = true; addContext = "meal-builder"; editingMealItemIndex = null; showFoodMode("recent"); });
    bindMealItemDetails(panel);
    panel.querySelector("[data-meal-builder-save]")?.addEventListener("click", saveMealDraft);
}

function saveMealDraft() {
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
