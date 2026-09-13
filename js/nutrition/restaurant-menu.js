const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const APPROVED_LOGO_USAGE_BASES = new Set(["written_permission", "documented_license"]);
const RESTAURANT_LOGO_ASSET_PATTERN = /^assets\/restaurant-logos\/[a-z0-9][a-z0-9._/-]*\.(?:svg|png|webp)$/i;

// Add artwork here only after its app-display rights have been documented.
// Restaurant search results and external APIs cannot opt themselves into logo display.
const APPROVED_RESTAURANT_LOGOS = Object.freeze({});

const FEATURED_RESTAURANTS = [
    restaurant("Boston Pizza", "BP", "Pizza & casual dining"),
    restaurant("Mezza Lebanese Kitchen", "MZ", "Wraps, plates & bowls"),
    restaurant("Swiss Chalet", "SC", "Chicken & family meals"),
    restaurant("Subway", "SW", "Sandwiches & bowls"),
    restaurant("McDonald's", "M", "Burgers & breakfast"),
    restaurant("Pür & Simple", "PS", "Breakfast & brunch"),
    restaurant("A&W Canada", "AW", "Burgers & breakfast"),
    restaurant("Harvey's", "H", "Burgers & grilled chicken"),
    restaurant("Wendy's", "W", "Burgers & chicken"),
    restaurant("Dairy Queen", "DQ", "Meals & treats"),
    restaurant("Starbucks", "S", "Coffee & café food"),
    restaurant("Pizza Hut", "PH", "Pizza & sides"),
    restaurant("Domino's", "D", "Pizza & sides"),
    restaurant("Burger King", "BK", "Burgers & chicken"),
    restaurant("Popeyes", "P", "Chicken & sides"),
    restaurant("Chipotle", "C", "Bowls & salads"),
    restaurant("Taco Bell", "TB", "Tacos & burritos"),
    restaurant("Chick-fil-A", "CFA", "Chicken & salads"),
    restaurant("Dunkin'", "DD", "Coffee & breakfast"),
    restaurant("Panera Bread", "PB", "Soups, salads & sandwiches"),
    restaurant("Panda Express", "PE", "Bowls & entrées"),
    restaurant("Olive Garden", "OG", "Pasta & entrées")
];

const state = {
    restaurant: FEATURED_RESTAURANTS[0],
    foods: [],
    query: "",
    quickFilters: new Set(),
    maxCalories: 1600,
    minProtein: 0,
    sort: "menu",
    loading: false,
    error: "",
    warning: "",
    source: "",
    request: null,
    context: null
};

const cache = new Map();
let hooks = { getContext: () => ({}), onChooseFood: () => {} };
let returnFocus = null;

function restaurant(name, mark, description) {
    const id = normalize(name).replace(/ /g, "-");
    return { id, name, mark, description, known: true, logo: APPROVED_RESTAURANT_LOGOS[id] || null };
}

export function approvedRestaurantLogoAsset(item) {
    const logo = item?.logo;
    const assetPath = String(logo?.assetPath || "").trim();
    if (logo?.status !== "approved") return "";
    if (!APPROVED_LOGO_USAGE_BASES.has(String(logo?.usageBasis || ""))) return "";
    if (!String(logo?.rightsHolder || "").trim() || !String(logo?.permissionReference || "").trim()) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(logo?.approvedAt || ""))) return "";
    if (!RESTAURANT_LOGO_ASSET_PATTERN.test(assetPath) || assetPath.includes("..")) return "";
    return assetPath;
}

export function initializeRestaurantMenu(options = {}) {
    hooks = {
        getContext: typeof options.getContext === "function" ? options.getContext : hooks.getContext,
        onChooseFood: typeof options.onChooseFood === "function" ? options.onChooseFood : hooks.onChooseFood
    };
    ensureRestaurantMenuStyles();
    if (document.querySelector("[data-restaurant-menu-screen]")) return;
    document.body.insertAdjacentHTML("beforeend", screenMarkup());
    bindScreen();
}

function ensureRestaurantMenuStyles() {
    if (document.querySelector("link[data-restaurant-menu-styles]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/restaurant-menu.css?v=eating-out-6";
    link.dataset.restaurantMenuStyles = "";
    document.head.append(link);
}

export function openRestaurantMenu(event) {
    event?.preventDefault?.();
    const screen = document.querySelector("[data-restaurant-menu-screen]");
    if (!screen) return;
    returnFocus = event?.currentTarget || document.activeElement;
    state.context = hooks.getContext() || {};
    state.query = "";
    state.quickFilters.clear();
    state.maxCalories = 1600;
    state.minProtein = 0;
    state.sort = "menu";
    screen.hidden = false;
    document.body.classList.add("restaurant-menu-open");
    closeSheet();
    renderContext();
    renderFilters();
    renderResults();
    void loadRestaurant(state.restaurant);
}

export function closeRestaurantMenu() {
    const screen = document.querySelector("[data-restaurant-menu-screen]");
    if (!screen || screen.hidden) return;
    state.request?.abort();
    closeSheet();
    screen.hidden = true;
    document.body.classList.remove("restaurant-menu-open");
    returnFocus?.focus?.();
    returnFocus = null;
}

function screenMarkup() {
    return `
        <section class="restaurant-menu-screen" data-restaurant-menu-screen hidden aria-labelledby="restaurant-menu-title">
            <header class="restaurant-menu-topbar">
                <button type="button" class="restaurant-menu-back" data-restaurant-menu-close aria-label="Back to Food Log">
                    ${chevronSvg("left")}<span>Food Log</span>
                </button>
                <div><small>EATING OUT</small><strong id="restaurant-menu-title">Restaurant Menus</strong></div>
                <button type="button" class="restaurant-menu-info" data-restaurant-sheet-open="about" aria-label="How restaurant menus work">${infoSvg()}</button>
            </header>
            <div class="restaurant-menu-scroll" data-restaurant-menu-scroll>
                <article class="restaurant-menu-hero">
                    <div class="restaurant-menu-hero-kicker"><span>RESTAURANT NUTRITION</span><span data-restaurant-destination></span></div>
                    <button type="button" class="restaurant-menu-picker" data-restaurant-sheet-open="restaurants" aria-haspopup="dialog">
                        <span class="restaurant-menu-mark" data-restaurant-mark>${restaurantBrandContent(FEATURED_RESTAURANTS[0])}</span>
                        <span><small>VIEWING MENU FOR</small><strong data-restaurant-name>Boston Pizza</strong><em data-restaurant-meta>Searchable nutrition results</em></span>
                        ${chevronSvg("right")}
                    </button>
                    <div class="restaurant-menu-promise"><h1>See what fits before you order.</h1><p>Browse available menu nutrition, compare calories and protein, then add an item through the normal Food Log.</p></div>
                    <div class="restaurant-menu-budget" aria-label="Remaining nutrition targets">
                        <span><small>Calories left</small><strong data-restaurant-calories-left>—</strong></span>
                        <i></i>
                        <span><small>Protein left</small><strong data-restaurant-protein-left>—</strong></span>
                    </div>
                </article>

                <p class="restaurant-menu-notice" role="note">${infoSvg()}<span><strong>Coverage varies.</strong> Results use available food data and may not reproduce every current menu item. Confirm values with the restaurant when accuracy matters.</span></p>

                <form class="restaurant-menu-search" data-restaurant-menu-search role="search">
                    ${searchSvg()}
                    <input type="search" name="query" autocomplete="off" placeholder="Search this menu" aria-label="Search this restaurant menu">
                    <button type="button" data-restaurant-menu-clear aria-label="Clear menu search" hidden>×</button>
                </form>

                <div class="restaurant-menu-filters" aria-label="Nutrition filters">
                    <button type="button" data-restaurant-quick="fits">${checkSvg()} Fits my day</button>
                    <button type="button" data-restaurant-quick="under700">Under 700 cal</button>
                    <button type="button" data-restaurant-quick="protein40">40+ g protein</button>
                    <button type="button" data-restaurant-sheet-open="filters">${slidersSvg()} Filters <b data-restaurant-filter-count hidden>0</b></button>
                </div>

                <div class="restaurant-menu-results-heading">
                    <div><small data-restaurant-results-label>MENU RESULTS</small><h2 data-restaurant-results-title>Boston Pizza menu</h2><p data-restaurant-results-status aria-live="polite">Choose a restaurant to load available items.</p></div>
                    <button type="button" data-restaurant-sheet-open="filters" data-restaurant-sort-label>Menu order</button>
                </div>
                <div class="restaurant-menu-results" data-restaurant-menu-results></div>
            </div>

            <div class="restaurant-menu-sheet-layer" data-restaurant-sheet-layer hidden>
                <button type="button" class="restaurant-menu-scrim" data-restaurant-sheet-close aria-label="Close dialog"></button>
                <section class="restaurant-menu-sheet" role="dialog" aria-modal="true" aria-labelledby="restaurant-sheet-title">
                    <div class="restaurant-menu-sheet-grabber" aria-hidden="true"></div>
                    <div data-restaurant-sheet-content></div>
                </section>
            </div>
        </section>`;
}

function bindScreen() {
    const screen = document.querySelector("[data-restaurant-menu-screen]");
    screen.querySelector("[data-restaurant-menu-close]")?.addEventListener("click", closeRestaurantMenu);
    screen.querySelectorAll("[data-restaurant-sheet-close]").forEach(button => button.addEventListener("click", closeSheet));
    screen.querySelectorAll("[data-restaurant-sheet-open]").forEach(button => button.addEventListener("click", () => openSheet(button.dataset.restaurantSheetOpen)));
    screen.querySelector("[data-restaurant-menu-search]")?.addEventListener("submit", event => event.preventDefault());
    const menuSearch = screen.querySelector('[data-restaurant-menu-search] input[name="query"]');
    menuSearch?.addEventListener("input", event => {
        state.query = String(event.currentTarget.value || "").trim();
        const clear = screen.querySelector("[data-restaurant-menu-clear]");
        if (clear) clear.hidden = !state.query;
        renderResults();
    });
    screen.querySelector("[data-restaurant-menu-clear]")?.addEventListener("click", () => {
        state.query = "";
        if (menuSearch) menuSearch.value = "";
        screen.querySelector("[data-restaurant-menu-clear]").hidden = true;
        renderResults();
        menuSearch?.focus();
    });
    screen.querySelectorAll("[data-restaurant-quick]").forEach(button => button.addEventListener("click", () => {
        const filter = button.dataset.restaurantQuick;
        if (state.quickFilters.has(filter)) state.quickFilters.delete(filter);
        else state.quickFilters.add(filter);
        renderFilters();
        renderResults();
    }));
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || screen.hidden) return;
        if (!screen.querySelector("[data-restaurant-sheet-layer]")?.hidden) closeSheet();
        else closeRestaurantMenu();
    });
}

async function loadRestaurant(nextRestaurant) {
    state.restaurant = nextRestaurant;
    state.query = "";
    state.error = "";
    state.warning = "";
    const input = document.querySelector('[data-restaurant-menu-search] input[name="query"]');
    if (input) {
        input.value = "";
        input.placeholder = `Search ${nextRestaurant.name} menu`;
    }
    const cacheKey = `${countryCode()}:${normalize(nextRestaurant.name)}`;
    renderContext();
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        state.foods = cached.foods;
        state.source = cached.source;
        state.warning = cached.warning;
        state.loading = false;
        renderResults();
        return;
    }
    const token = sessionToken();
    if (!token) {
        state.foods = [];
        state.loading = false;
        state.error = "Sign in to search restaurant nutrition. Your saved foods still work offline.";
        renderResults();
        return;
    }
    state.request?.abort();
    const controller = new AbortController();
    state.request = controller;
    state.foods = [];
    state.loading = true;
    renderResults();
    try {
        const response = await fetch(`${API_URL}/v1/foods/search?q=${encodeURIComponent(nextRestaurant.name)}&country=${countryCode()}&menu=1`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Restaurant menu could not be loaded.");
        const usable = (Array.isArray(payload.foods) ? payload.foods : []).filter(food => food?.portions?.[0]?.nutrition);
        const matching = usable.filter(food => restaurantFoodMatches(food, nextRestaurant.name));
        state.foods = matching.length ? matching : (nextRestaurant.known ? [] : usable);
        state.source = String(payload.source || "");
        state.warning = String(payload.warning || "");
        cache.set(cacheKey, { foods: state.foods, source: state.source, warning: state.warning });
    }
    catch (error) {
        if (error?.name === "AbortError") return;
        state.error = error?.message || "Restaurant menu could not be loaded.";
    }
    finally {
        if (state.request !== controller) return;
        state.loading = false;
        renderContext();
        renderResults();
    }
}

function restaurantFoodMatches(food, restaurantName) {
    const restaurantIdentity = normalize(restaurantName);
    const brandIdentity = normalize(food?.brand);
    const nameIdentity = normalize(food?.name);
    if (!restaurantIdentity) return false;
    return Boolean(brandIdentity && (brandIdentity.includes(restaurantIdentity) || restaurantIdentity.includes(brandIdentity))) || nameIdentity.includes(restaurantIdentity);
}

function renderContext() {
    const context = state.context || {};
    const targets = context.targets || {};
    const totals = context.totals || {};
    const caloriesLeft = finiteDifference(targets.calories, totals.calories);
    const proteinLeft = finiteDifference(targets.protein, totals.protein);
    setText("[data-restaurant-name]", state.restaurant.name);
    renderRestaurantBrand(document.querySelector("[data-restaurant-mark]"), state.restaurant);
    setText("[data-restaurant-meta]", state.loading ? "Loading available nutrition…" : `${state.foods.length || "Searchable"} menu result${state.foods.length === 1 ? "" : "s"}`);
    setText("[data-restaurant-destination]", `${context.meal || "Meal"} · ${friendlyDate(context.dateKey)}`);
    setText("[data-restaurant-calories-left]", caloriesLeft === null ? "Not set" : `${Math.round(caloriesLeft)} cal`);
    setText("[data-restaurant-protein-left]", proteinLeft === null ? "Not set" : `${roundOne(proteinLeft)} g`);
    setText("[data-restaurant-results-title]", `${state.restaurant.name} menu`);
}

function renderFilters() {
    const screen = document.querySelector("[data-restaurant-menu-screen]");
    screen?.querySelectorAll("[data-restaurant-quick]").forEach(button => {
        const active = state.quickFilters.has(button.dataset.restaurantQuick);
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    const customCount = Number(state.maxCalories < 1600) + Number(state.minProtein > 0) + Number(state.sort !== "menu");
    const count = state.quickFilters.size + customCount;
    const badge = screen?.querySelector("[data-restaurant-filter-count]");
    if (badge) {
        badge.textContent = String(count);
        badge.hidden = count === 0;
    }
    setText("[data-restaurant-sort-label]", ({ menu: "Menu order", protein: "Highest protein", calories: "Lowest calories" })[state.sort]);
}

function visibleFoods() {
    const remainingCalories = finiteDifference(state.context?.targets?.calories, state.context?.totals?.calories);
    const query = normalize(state.query);
    const foods = state.foods.filter(food => {
        const nutrition = primaryNutrition(food);
        const haystack = normalize(`${food.name || ""} ${food.brand || ""} ${food.category || ""}`);
        if (query && !haystack.includes(query)) return false;
        if (state.quickFilters.has("fits") && remainingCalories !== null && nutrition.calories > remainingCalories) return false;
        if (state.quickFilters.has("under700") && nutrition.calories > 700) return false;
        if (state.quickFilters.has("protein40") && nutrition.protein < 40) return false;
        if (nutrition.calories > state.maxCalories || nutrition.protein < state.minProtein) return false;
        return true;
    });
    if (state.sort === "protein") foods.sort((a, b) => primaryNutrition(b).protein - primaryNutrition(a).protein);
    if (state.sort === "calories") foods.sort((a, b) => primaryNutrition(a).calories - primaryNutrition(b).calories);
    return foods;
}

function renderResults() {
    const container = document.querySelector("[data-restaurant-menu-results]");
    if (!container) return;
    renderContext();
    renderFilters();
    if (state.loading) {
        setText("[data-restaurant-results-status]", "Loading available menu nutrition…");
        container.innerHTML = loadingMarkup();
        return;
    }
    if (state.error) {
        setText("[data-restaurant-results-status]", state.error);
        container.innerHTML = `<div class="restaurant-menu-empty">${infoSvg()}<strong>Menu unavailable</strong><p>${escapeHtml(state.error)}</p><button type="button" data-restaurant-retry>Try again</button></div>`;
        container.querySelector("[data-restaurant-retry]")?.addEventListener("click", () => { void loadRestaurant(state.restaurant); });
        return;
    }
    const foods = visibleFoods();
    const source = state.source ? ` · ${state.source}` : "";
    setText("[data-restaurant-results-status]", `${foods.length} of ${state.foods.length} available item${state.foods.length === 1 ? "" : "s"}${source}`);
    if (!state.foods.length) {
        container.innerHTML = `<div class="restaurant-menu-empty">${searchSvg()}<strong>No menu results found</strong><p>Try another restaurant name. Coverage will expand as more official menus and licensed data are added.</p><button type="button" data-restaurant-sheet-open-local="restaurants">Search restaurants</button></div>`;
        container.querySelector("[data-restaurant-sheet-open-local]")?.addEventListener("click", () => openSheet("restaurants"));
        return;
    }
    if (!foods.length) {
        container.innerHTML = `<div class="restaurant-menu-empty">${slidersSvg()}<strong>No items match these filters</strong><p>Clear a filter or raise the calorie limit.</p><button type="button" data-restaurant-filter-reset>Reset filters</button></div>`;
        container.querySelector("[data-restaurant-filter-reset]")?.addEventListener("click", resetFilters);
        return;
    }
    const groups = groupFoods(foods);
    container.innerHTML = groups.map(([section, items]) => `<section class="restaurant-menu-section"><h3>${escapeHtml(section)}<span>${items.length}</span></h3><div>${items.map((food, index) => itemMarkup(food, state.foods.indexOf(food), index)).join("")}</div></section>`).join("");
    container.querySelectorAll("[data-restaurant-food-index]").forEach(button => button.addEventListener("click", () => {
        const food = state.foods[Number(button.dataset.restaurantFoodIndex)];
        if (!food) return;
        closeRestaurantMenu();
        hooks.onChooseFood(food);
    }));
}

function groupFoods(foods) {
    if (state.sort !== "menu") return [[state.sort === "protein" ? "Highest protein" : "Lowest calorie", foods]];
    const groups = new Map();
    foods.forEach(food => {
        const category = menuCategory(food);
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(food);
    });
    const order = ["Apps and Shareables", "Mains", "Bowls and Salads", "Sandwiches & Burgers", "Desserts", "Sides", "GlutenWise®", "Kids", "Pasta", "Pizza", "Wraps", "Plates with fries", "Plates with rice", "Bowls", "Lunch plates", "Poutines", "Salads", "Desserts & extras", "Sauces", "Protein", "Toppings", "High-protein picks", "Breakfast", "Burgers & sandwiches", "Pizza & pasta", "Bowls, salads & entrées", "Sides & snacks", "Drinks & treats", "Menu items"];
    return [...groups.entries()].sort((a, b) => {
        const aIndex = order.indexOf(a[0]);
        const bIndex = order.indexOf(b[0]);
        return (aIndex < 0 ? order.length : aIndex) - (bIndex < 0 ? order.length : bIndex);
    });
}

function menuCategory(food) {
    if (food?.menuSection) return food.menuSection;
    const name = normalize(`${food?.name || ""} ${food?.category || ""}`);
    const protein = primaryNutrition(food).protein;
    if (protein >= 40) return "High-protein picks";
    if (/breakfast|egg|omelette|pancake|waffle|hash brown|latte|bagel/.test(name)) return "Breakfast";
    if (/burger|sandwich|wrap|sub|hot dog|coney/.test(name)) return "Burgers & sandwiches";
    if (/pizza|pasta|alfredo|spaghetti|breadstick/.test(name)) return "Pizza & pasta";
    if (/bowl|salad|chicken|steak|salmon|shrimp|entree|entrée|sirloin|nugget|tender/.test(name)) return "Bowls, salads & entrées";
    if (/fries|chips|side|rice|vegetable|soup|poutine|onion ring|bread bite/.test(name)) return "Sides & snacks";
    if (/coffee|drink|tea|smoothie|shake|ice cream|cone|donut|cookie|cake|dessert/.test(name)) return "Drinks & treats";
    return "Menu items";
}

function itemMarkup(food, foodIndex) {
    const nutrition = primaryNutrition(food);
    const wholePizza = food?.portions?.find(portion => /^1 whole /i.test(String(portion?.label || "")));
    const servingCopy = wholePizza
        ? `${food.portions?.[0]?.label || "1 slice"} · ${Math.round(Number(wholePizza.nutrition?.calories) || 0)} cal whole`
        : food.portions?.[0]?.label || "1 serving";
    const caloriesOnly = food?.provenance?.nutritionScope === "calories_only";
    const remainingCalories = finiteDifference(state.context?.targets?.calories, state.context?.totals?.calories);
    const badges = [
        remainingCalories !== null && nutrition.calories <= remainingCalories ? "Fits today" : "",
        nutrition.protein >= 30 ? "High protein" : "",
        food?.provenance?.verificationStatus === "verified" ? "Verified" : "",
        caloriesOnly ? "Calories only" : ""
    ].filter(Boolean).slice(0, 3);
    return `<button type="button" class="restaurant-menu-item" data-restaurant-food-index="${foodIndex}" aria-label="Add ${escapeHtml(food.name)}">
        <span class="restaurant-menu-item-icon" aria-hidden="true">${plateSvg()}</span>
        <span class="restaurant-menu-item-copy"><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(servingCopy)}</small><span>${badges.map(badge => `<i>${escapeHtml(badge)}</i>`).join("")}</span>${caloriesOnly ? "" : `<em>C ${roundOne(nutrition.carbs)} g · F ${roundOne(nutrition.fat)} g</em>`}</span>
        <span class="restaurant-menu-item-macros"><strong>${Math.round(nutrition.calories)}</strong><small>calories</small>${caloriesOnly ? '<em>Macros unavailable</em>' : `<b>${roundOne(nutrition.protein)}<small> g protein</small></b>`}</span>
    </button>`;
}

function openSheet(type) {
    const layer = document.querySelector("[data-restaurant-sheet-layer]");
    const content = document.querySelector("[data-restaurant-sheet-content]");
    if (!layer || !content) return;
    if (type === "restaurants") content.innerHTML = restaurantPickerMarkup();
    else if (type === "filters") content.innerHTML = filterSheetMarkup();
    else content.innerHTML = aboutMarkup();
    layer.hidden = false;
    bindSheet(type, content);
    window.setTimeout(() => content.querySelector("input")?.focus(), 40);
}

function closeSheet() {
    const layer = document.querySelector("[data-restaurant-sheet-layer]");
    if (layer) layer.hidden = true;
}

function restaurantPickerMarkup() {
    return `<header class="restaurant-menu-sheet-heading"><div><small id="restaurant-sheet-title">CHOOSE A RESTAURANT</small><h2>Where are you eating?</h2><p>Search any restaurant or choose a supported favourite.</p></div><button type="button" data-restaurant-sheet-close-local aria-label="Close">×</button></header>
        <form class="restaurant-picker-search" data-restaurant-picker-search>${searchSvg()}<input type="search" name="restaurant" maxlength="80" autocomplete="off" placeholder="Search restaurants" aria-label="Search restaurants"><button type="submit">Search</button></form>
        <p class="restaurant-picker-hint" data-restaurant-picker-hint>Popular restaurants</p>
        <div class="restaurant-picker-list" data-restaurant-picker-list>${restaurantButtons(FEATURED_RESTAURANTS)}</div>`;
}

function restaurantButtons(restaurants) {
    return restaurants.map(item => `<button type="button" data-restaurant-choice="${escapeHtml(item.id)}"><span class="restaurant-picker-brand">${restaurantBrandContent(item)}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></span>${chevronSvg("right")}</button>`).join("");
}

function filterSheetMarkup() {
    return `<header class="restaurant-menu-sheet-heading"><div><small id="restaurant-sheet-title">FILTER MENU</small><h2>Find what fits</h2><p>Set nutrition limits or change the result order.</p></div><button type="button" data-restaurant-sheet-close-local aria-label="Close">×</button></header>
        <div class="restaurant-filter-fields">
            <label><span>Maximum calories <b data-max-calories-label>${state.maxCalories}</b></span><input type="range" min="200" max="1600" step="50" value="${state.maxCalories}" data-restaurant-max-calories></label>
            <label><span>Minimum protein <b data-min-protein-label>${state.minProtein} g</b></span><input type="range" min="0" max="80" step="5" value="${state.minProtein}" data-restaurant-min-protein></label>
            <label><span>Sort results</span><select data-restaurant-sort><option value="menu"${state.sort === "menu" ? " selected" : ""}>Menu order</option><option value="protein"${state.sort === "protein" ? " selected" : ""}>Highest protein</option><option value="calories"${state.sort === "calories" ? " selected" : ""}>Lowest calories</option></select></label>
        </div>
        <div class="restaurant-filter-actions"><button type="button" data-restaurant-reset>Reset</button><button type="button" class="primary-btn" data-restaurant-apply>Show results</button></div>`;
}

function aboutMarkup() {
    return `<header class="restaurant-menu-sheet-heading"><div><small id="restaurant-sheet-title">ABOUT EATING OUT</small><h2>Restaurant nutrition, organized for your goal</h2></div><button type="button" data-restaurant-sheet-close-local aria-label="Close">×</button></header>
        <div class="restaurant-about-list"><p><b>1</b><span><strong>Choose or search a restaurant</strong><small>Level Up checks the restaurant foods available through its current food-data sources.</small></span></p><p><b>2</b><span><strong>Compare the whole result</strong><small>Calories, protein, carbs and fat appear together whenever the source provides them.</small></span></p><p><b>3</b><span><strong>Add through Food Log</strong><small>Select an item, confirm its serving and meal, then log it normally.</small></span></p></div>
        <p class="restaurant-about-note">Menus and recipes change. Level Up can organize available nutrition, but it cannot guarantee that every restaurant item or customization is present. Restaurant logos appear only when Level Up has documented permission or a compatible licence; otherwise an initials badge is shown.</p>`;
}

function bindSheet(type, content) {
    content.querySelector("[data-restaurant-sheet-close-local]")?.addEventListener("click", closeSheet);
    if (type === "restaurants") {
        const form = content.querySelector("[data-restaurant-picker-search]");
        const input = form?.elements?.restaurant;
        const list = content.querySelector("[data-restaurant-picker-list]");
        const hint = content.querySelector("[data-restaurant-picker-hint]");
        const renderChoices = () => {
            const query = normalize(input?.value);
            const matches = FEATURED_RESTAURANTS.filter(item => normalize(`${item.name} ${item.description}`).includes(query));
            if (hint) hint.textContent = query ? (matches.length ? "Matching restaurants" : "No supported match — search the restaurant name") : "Popular restaurants";
            if (list) list.innerHTML = restaurantButtons(matches);
            bindRestaurantChoices(list);
        };
        input?.addEventListener("input", renderChoices);
        form?.addEventListener("submit", event => {
            event.preventDefault();
            const name = String(input?.value || "").trim().replace(/\s+/g, " ");
            if (name.length < 2) return;
            const known = FEATURED_RESTAURANTS.find(item => normalize(item.name) === normalize(name));
            chooseRestaurant(known || { id: normalize(name).replace(/ /g, "-"), name, mark: initials(name), description: "Search results", known: false });
        });
        bindRestaurantChoices(list);
    }
    if (type === "filters") {
        const maxInput = content.querySelector("[data-restaurant-max-calories]");
        const minInput = content.querySelector("[data-restaurant-min-protein]");
        maxInput?.addEventListener("input", () => setText("[data-max-calories-label]", maxInput.value, content));
        minInput?.addEventListener("input", () => setText("[data-min-protein-label]", `${minInput.value} g`, content));
        content.querySelector("[data-restaurant-reset]")?.addEventListener("click", () => { resetFilters(); closeSheet(); });
        content.querySelector("[data-restaurant-apply]")?.addEventListener("click", () => {
            state.maxCalories = Number(maxInput?.value) || 1600;
            state.minProtein = Number(minInput?.value) || 0;
            state.sort = content.querySelector("[data-restaurant-sort]")?.value || "menu";
            renderFilters();
            renderResults();
            closeSheet();
        });
    }
}

function bindRestaurantChoices(container) {
    bindRestaurantLogoFallbacks(container);
    container?.querySelectorAll("[data-restaurant-choice]").forEach(button => button.addEventListener("click", () => {
        const item = FEATURED_RESTAURANTS.find(restaurantItem => restaurantItem.id === button.dataset.restaurantChoice);
        if (item) chooseRestaurant(item);
    }));
}

function chooseRestaurant(item) {
    closeSheet();
    void loadRestaurant(item);
    document.querySelector("[data-restaurant-menu-scroll]")?.scrollTo?.({ top: 0, behavior: "smooth" });
}

function resetFilters() {
    state.quickFilters.clear();
    state.maxCalories = 1600;
    state.minProtein = 0;
    state.sort = "menu";
    renderFilters();
    renderResults();
}

function loadingMarkup() {
    return `<div class="restaurant-menu-loading" role="status"><i></i><strong>Loading ${escapeHtml(state.restaurant.name)}</strong><span>Checking available menu nutrition…</span></div>`;
}

function primaryNutrition(food) {
    const nutrition = food?.portions?.[0]?.nutrition || {};
    return {
        calories: Math.max(0, Number(nutrition.calories) || 0),
        protein: Math.max(0, Number(nutrition.protein) || 0),
        carbs: Math.max(0, Number(nutrition.carbs) || 0),
        fat: Math.max(0, Number(nutrition.fat) || 0)
    };
}

function finiteDifference(target, consumed) {
    const targetNumber = Number(target);
    if (!Number.isFinite(targetNumber) || targetNumber <= 0) return null;
    return Math.max(0, targetNumber - (Number(consumed) || 0));
}

function countryCode() {
    return String(navigator.language || "en-CA").toUpperCase().endsWith("-US") ? "US" : "CA";
}

function sessionToken() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; }
    catch { return ""; }
}

function friendlyDate(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return "Today";
    const date = new Date(`${dateKey}T12:00:00`);
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return dateKey === localToday ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function initials(value) {
    return normalize(value).split(" ").filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "R";
}

function restaurantBrandContent(item) {
    const fallback = escapeHtml(item?.mark || initials(item?.name));
    const logoAsset = approvedRestaurantLogoAsset(item);
    return `<span class="restaurant-brand-fallback" aria-hidden="true">${fallback}</span>${logoAsset ? `<img class="restaurant-brand-logo" data-restaurant-logo src="${escapeHtml(logoAsset)}" alt="" loading="lazy" decoding="async">` : ""}`;
}

function renderRestaurantBrand(node, item) {
    if (!node) return;
    const logoAsset = approvedRestaurantLogoAsset(item);
    node.classList.toggle("has-approved-logo", Boolean(logoAsset));
    node.innerHTML = restaurantBrandContent(item);
    bindRestaurantLogoFallbacks(node);
}

function bindRestaurantLogoFallbacks(scope) {
    scope?.querySelectorAll?.("[data-restaurant-logo]").forEach(image => {
        if (image.dataset.restaurantLogoBound === "true") return;
        image.dataset.restaurantLogoBound = "true";
        const useFallback = () => {
            image.hidden = true;
            image.closest(".restaurant-menu-mark, .restaurant-picker-brand")?.classList.remove("has-approved-logo");
        };
        image.addEventListener("error", useFallback, { once: true });
        if (image.complete && image.naturalWidth === 0) useFallback();
        else image.closest(".restaurant-menu-mark, .restaurant-picker-brand")?.classList.add("has-approved-logo");
    });
}

function setText(selector, value, scope = document) {
    const node = scope.querySelector(selector);
    if (node) node.textContent = String(value ?? "");
}

function roundOne(value) {
    return Math.round((Number(value) || 0) * 10) / 10;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function chevronSvg(direction) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}"/></svg>`;
}

function infoSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
}

function searchSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/></svg>';
}

function checkSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
}

function slidersSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/></svg>';
}

function plateSvg() {
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M3 20h18"/></svg>';
}
