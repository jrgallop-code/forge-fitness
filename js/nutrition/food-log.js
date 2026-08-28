import {
    MEALS,
    buildCustomFoodPortions,
    createLogEntry,
    cloneEntriesForMeal,
    entriesForDate,
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
    scaledNutrition,
    summarizeEntries,
    totalServingLabel,
    updateEntry,
    withUsefulLiquidPortions
} from "./food-log-data.js?v=food-log-total-units-1";

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
let foodSearchController = null;
let foodSearchTimer = null;
let foodDetailController = null;
let foodSelectionRequest = 0;
let barcodeScannerControls = null;
let barcodeVideoTrack = null;
let barcodeLookupActive = false;
let barcodeLookupController = null;
let zxingLoadPromise = null;
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
                <div data-food-mode-panel="meals" hidden><button type="button" class="food-create-meal" data-create-meal>+ Create a Meal</button><div class="food-results" data-saved-meals></div></div>
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
            <div class="custom-food-intro"><span class="eyebrow">CREATE FOOD</span><strong>Food details</strong><small>Enter nutrition for one serving. Level Up will calculate other usable units when possible.</small></div>
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
            <button type="submit" class="primary-btn">Save &amp; Add</button>
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
    document.querySelector("[data-create-food]")?.addEventListener("click", () => {
        const editor = document.querySelector("[data-custom-food-editor]");
        if (editor) editor.hidden = !editor.hidden;
    });
    document.querySelector("[data-create-meal]")?.addEventListener("click", () => openMealBuilder());
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
    const meals = document.querySelector("[data-food-meals]");
    if (meals) meals.innerHTML = MEALS.map(meal => mealMarkup(meal, entries.filter(entry => entry.meal === meal), yesterdayEntries.filter(entry => entry.meal === meal))).join("");
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
    return `
        <details class="food-meal" ${entries.length || yesterdayEntries.length ? "open" : ""}>
            <summary><span><strong>${meal}</strong><small>${entries.length ? `${entries.length} item${entries.length === 1 ? "" : "s"}` : "Nothing logged"}</small></span><b>${Math.round(totals.calories)} kcal</b></summary>
            <div class="food-meal-body">
                ${yesterdayEntries.length ? `<button type="button" class="food-copy-yesterday" data-copy-yesterday="${meal}"><span><strong>Yesterday’s ${meal}</strong><small>${escapeHtml(mealPreview(yesterdayEntries))}</small></span><b>Swipe right <i>→</i></b></button>` : ""}
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
    setText("[data-food-search-status]", "Searching Level Up and USDA foods…");
    const results = document.querySelector("[data-food-results]");
    if (results) results.innerHTML = "";
    foodSearchController?.abort();
    foodSearchController = new AbortController();
    try {
        const response = await fetch(`${API_URL}/v1/foods/search?q=${encodeURIComponent(query)}`, {
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
    const sourceLabel = food.previouslyLogged
        ? `${food.brand || "Your history"} · Previously logged`
        : food.source === "levelup"
        ? `${food.brand || "Level Up"} · Verified`
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
        <div class="food-portion-heading"><div><span class="eyebrow">${addContext === "edit" ? "EDIT LOGGED FOOD" : "ADD FOOD"}</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="${addContext === "edit" ? "Cancel editing" : "Back to results"}">×</button></div>
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
    if (addContext === "meal-builder" && mealDraft) renderMealBuilder();
}

function renderFoodPortionPanel(food, warning = "") {
    food = withUsefulLiquidPortions(food);
    selectedFood = food;
    const panel = document.querySelector("[data-food-portion]");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = `
        <div class="food-portion-heading"><div><span class="eyebrow">${addContext === "edit" ? "EDIT LOGGED FOOD" : "ADD FOOD"}</span><h3>${escapeHtml(food.name)}</h3><small>${escapeHtml(food.brand || "")}</small></div><button type="button" data-food-portion-close aria-label="${addContext === "edit" ? "Close food editor" : "Back to results"}">×</button></div>
        ${addContext === "meal-builder" ? '<div class="food-builder-destination">Adding to your saved meal</div>' : `<label>Meal<select data-food-meal>${MEALS.map(meal => `<option${meal === selectedMeal ? " selected" : ""}>${meal}</option>`).join("")}</select></label>`}
        ${warning ? `<p class="food-portion-warning">${escapeHtml(warning)}</p>` : ""}
        <label>Serving size<select data-food-serving>${(food.portions || []).map((portion, index) => `<option value="${index}">${escapeHtml(portion.label)}</option>`).join("")}</select></label>
        <label>Number of servings<input data-food-quantity type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="1"></label>
        <div class="food-portion-preview" data-food-preview></div>
        <button type="button" class="primary-btn" data-food-confirm>${addContext === "meal-builder" ? "Add to Meal" : addContext === "edit" ? "Save Changes" : "Add to Food Log"}</button>
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

function foodMacroBreakdown(nutrition, quantity, servingLabel) {
    const values = {
        carbs: Math.max(0, Number(nutrition?.carbs) || 0) * quantity,
        fat: Math.max(0, Number(nutrition?.fat) || 0) * quantity,
        protein: Math.max(0, Number(nutrition?.protein) || 0) * quantity
    };
    const calories = Math.max(0, Number(nutrition?.calories) || 0) * quantity;
    const macroCalories = values.carbs * 4 + values.fat * 9 + values.protein * 4;
    const percentages = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, macroCalories ? Math.round(value * (key === "fat" ? 9 : 4) / macroCalories * 100) : 0]));
    const carbEnd = percentages.carbs;
    const fatEnd = Math.min(100, carbEnd + percentages.fat);
    return `<div class="food-edit-serving">${roundOne(quantity)} × ${escapeHtml(servingLabel || "1 serving")}</div><div class="food-edit-macro-breakdown"><div class="food-edit-calorie-ring" style="--carb-end:${carbEnd}%;--fat-end:${fatEnd}%"><span><strong>${Math.round(calories)}</strong><small>cal</small></span></div><div class="food-edit-macro food-edit-macro--carbs"><em>${percentages.carbs}%</em><strong>${roundOne(values.carbs)} g</strong><small>Carbs</small></div><div class="food-edit-macro food-edit-macro--fat"><em>${percentages.fat}%</em><strong>${roundOne(values.fat)} g</strong><small>Fat</small></div><div class="food-edit-macro food-edit-macro--protein"><em>${percentages.protein}%</em><strong>${roundOne(values.protein)} g</strong><small>Protein</small></div></div>`;
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
        mealDraft.items.push(entry);
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
    const food = saveCustomFood({
        id: crypto.randomUUID(),
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
    event.currentTarget.reset();
    document.querySelector("[data-custom-food-editor]")?.setAttribute("hidden", "");
    renderCustomFoods();
    chooseFood(food);
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
    renderFoodResults(container, foods);
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
        const source = entriesForDate(previousDateKey(selectedDate)).filter(entry => entry.meal === meal);
        if (!source.length) return;
        saveEntries(selectedDate, cloneEntriesForMeal(source, meal));
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

function openMealBuilder(entries = [], name = "") {
    addContext = "meal-builder";
    mealDraft = { id: null, name, photoDataUrl: "", items: entries.map(entry => ({ ...entry })) };
    renderMealBuilder();
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
                const size = 180;
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
    panel.innerHTML = `
        <header class="food-builder-heading"><div><span class="eyebrow">MY MEALS</span><h3>Build a Meal</h3></div><button type="button" data-meal-builder-close aria-label="Close meal builder">×</button></header>
        <label>Meal name<input type="text" maxlength="100" value="${escapeHtml(mealDraft.name)}" placeholder="Post-workout lunch" data-meal-name></label>
        <div class="food-builder-photo"><button type="button" data-meal-photo-pick>${mealDraft.photoDataUrl ? `<img src="${escapeHtml(mealDraft.photoDataUrl)}" alt="Meal thumbnail"><span>Change photo</span>` : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Add photo</span>'}</button>${mealDraft.photoDataUrl ? '<button type="button" data-meal-photo-remove>Remove</button>' : ""}<input type="file" accept="image/*" data-meal-photo-input hidden></div>
        <div class="food-builder-summary"><strong>${mealDraft.items.length} item${mealDraft.items.length === 1 ? "" : "s"}</strong><span>${Math.round(totals.calories)} kcal · P ${roundOne(totals.protein)} g · C ${roundOne(totals.carbs)} g · F ${roundOne(totals.fat)} g</span></div>
        <div class="food-builder-items">${mealDraft.items.map((entry, index) => `<div><span><strong>${escapeHtml(entry.name)}</strong><small>${roundOne(entry.quantity)} × ${escapeHtml(entry.servingLabel)}</small></span><b>${Math.round(entry.nutrition?.calories || 0)} kcal</b><button type="button" data-remove-meal-item="${index}" aria-label="Remove ${escapeHtml(entry.name)}">×</button></div>`).join("") || '<p class="empty-state">Add foods to create a reusable meal.</p>'}</div>
        <button type="button" class="food-builder-add" data-meal-builder-add>+ Add Food</button>
        <button type="button" class="primary-btn" data-meal-builder-save ${mealDraft.items.length ? "" : "disabled"}>Save to My Meals</button>`;
    panel.querySelector("[data-meal-name]")?.addEventListener("input", event => { mealDraft.name = event.currentTarget.value; });
    panel.querySelector("[data-meal-photo-pick]")?.addEventListener("click", () => panel.querySelector("[data-meal-photo-input]")?.click());
    panel.querySelector("[data-meal-photo-input]")?.addEventListener("change", event => { if (event.currentTarget.files?.[0]) void setMealDraftPhoto(event.currentTarget.files[0]); });
    panel.querySelector("[data-meal-photo-remove]")?.addEventListener("click", () => { mealDraft.photoDataUrl = ""; renderMealBuilder(); });
    panel.querySelector("[data-meal-builder-close]")?.addEventListener("click", () => { panel.hidden = true; addContext = "log"; showFoodMode("meals"); });
    panel.querySelector("[data-meal-builder-add]")?.addEventListener("click", () => { panel.hidden = true; addContext = "meal-builder"; showFoodMode("recent"); });
    panel.querySelectorAll("[data-remove-meal-item]").forEach(button => button.addEventListener("click", () => { mealDraft.items.splice(Number(button.dataset.removeMealItem), 1); renderMealBuilder(); }));
    panel.querySelector("[data-meal-builder-save]")?.addEventListener("click", saveMealDraft);
}

function saveMealDraft() {
    const name = String(document.querySelector("[data-meal-name]")?.value || "").trim();
    if (!name) {
        document.querySelector("[data-meal-name]")?.focus();
        return;
    }
    saveSavedMeal({ ...mealDraft, name });
    mealDraft = null;
    addContext = "log";
    document.querySelector("[data-meal-builder]")?.setAttribute("hidden", "");
    showFoodMode("meals");
    showFoodToast("Meal saved to My Meals.");
}

function renderSavedMeals() {
    const meals = readSavedMeals();
    const container = document.querySelector("[data-saved-meals]");
    if (!container) return;
    if (!meals.length) { container.innerHTML = '<p class="empty-state">Build a meal once, then log it here in one tap.</p>'; return; }
    container.innerHTML = meals.map((meal, index) => {
        const totals = summarizeEntries(meal.items);
        const photo = meal.photoDataUrl ? `<img src="${escapeHtml(meal.photoDataUrl)}" alt="">` : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
        return `<article class="food-saved-meal"><div><strong>${escapeHtml(meal.name)}</strong><small>${escapeHtml(mealPreview(meal.items))}</small><span>${Math.round(totals.calories)} kcal · ${meal.items.length} items</span></div><button type="button" class="food-saved-meal-photo" data-saved-meal-photo="${index}" aria-label="${meal.photoDataUrl ? "Change" : "Add"} photo for ${escapeHtml(meal.name)}">${photo}</button><button type="button" class="food-saved-meal-add" data-log-saved-meal="${index}" aria-label="Log ${escapeHtml(meal.name)} to ${selectedMeal}">+</button><button type="button" class="food-saved-meal-delete" data-delete-saved-meal="${escapeHtml(meal.id)}" aria-label="Delete ${escapeHtml(meal.name)}">×</button></article>`;
    }).join("");
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
        input.addEventListener("change", async () => {
            if (!input.files?.[0]) return;
            try {
                const photoDataUrl = await compressMealPhoto(input.files[0]);
                saveSavedMeal({ ...meal, photoDataUrl });
                renderSavedMeals();
                showFoodToast("Meal photo saved.");
            }
            catch (error) { showFoodToast(error?.message || "The photo could not be added."); }
        });
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
