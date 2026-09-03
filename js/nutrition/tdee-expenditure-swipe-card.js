const STYLE_ID = "level-up-tdee-expenditure-swipe-card-styles";
const WRAPPER_ATTR = "data-tdee-expenditure-swipe-card";
const PAGER_ATTR = "data-tdee-expenditure-swipe-pager";
let scheduled = false;

install();

function install() {
    ensureStyles();
    schedule();

    const content = document.getElementById("content");
    if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });

    ["pageshow", "levelup:nutrition-updated", "levelup:food-log-updated", "levelup:weight-updated", "levelup:appearance-changed"]
        .forEach(name => window.addEventListener(name, schedule));

    document.addEventListener("click", event => {
        const pager = event.target.closest?.("[data-tdee-expenditure-page]");
        if (pager) {
            const wrapper = pager.closest(`[${WRAPPER_ATTR}]`);
            if (!wrapper) return;
            const index = Math.max(0, Math.min(1, Number(pager.dataset.tdeeExpenditurePage) || 0));
            scrollToPage(wrapper, index, true);
            return;
        }

        if (event.target.closest?.("[data-tdee-chart-range], #nutrition-progress-tab, [data-page='progress']")) {
            window.setTimeout(schedule, 0);
        }
    }, true);
}

function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
        scheduled = false;
        combineCards();
    });
}

function combineCards() {
    const root = document.querySelector("#calorie-progress");
    const expenditureCard = root?.querySelector(".expenditure-trend-card");
    const comparisonCard = root?.querySelector("[data-calorie-expenditure-comparison-card]");
    if (!root || !expenditureCard || !comparisonCard) return;

    let wrapper = expenditureCard.closest(`[${WRAPPER_ATTR}]`);
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "tdee-expenditure-swipe-card";
        wrapper.setAttribute(WRAPPER_ATTR, "1");
        expenditureCard.insertAdjacentElement("beforebegin", wrapper);
        wrapper.appendChild(expenditureCard);
    }

    const pager = ensurePager(wrapper);

    if (comparisonCard.parentElement !== wrapper || comparisonCard.previousElementSibling !== expenditureCard) {
        wrapper.insertBefore(comparisonCard, pager);
    }

    expenditureCard.dataset.tdeeExpenditureSlide = "0";
    comparisonCard.dataset.tdeeExpenditureSlide = "1";
    expenditureCard.setAttribute("aria-label", "Expenditure Over Time, graph 1 of 2");
    comparisonCard.setAttribute("aria-label", "Calories vs Expenditure, graph 2 of 2");

    bindSwipe(wrapper);
    updatePager(wrapper);
}

function ensurePager(wrapper) {
    let pager = wrapper.querySelector(`:scope > [${PAGER_ATTR}]`);
    if (pager) return pager;

    pager = document.createElement("div");
    pager.className = "tdee-expenditure-swipe-pager";
    pager.setAttribute(PAGER_ATTR, "1");
    pager.setAttribute("aria-label", "Energy graph pages");
    pager.innerHTML = `
        <button type="button" data-tdee-expenditure-page="0" aria-label="Show Expenditure Over Time" aria-pressed="true"></button>
        <button type="button" data-tdee-expenditure-page="1" aria-label="Show Calories vs Expenditure" aria-pressed="false"></button>
        <span>Swipe for calories vs expenditure</span>`;
    wrapper.appendChild(pager);
    return pager;
}

function bindSwipe(wrapper) {
    if (wrapper.dataset.tdeeSwipeBound === "1") return;
    wrapper.dataset.tdeeSwipeBound = "1";

    let touchStartX = null;
    let touchStartY = null;

    wrapper.addEventListener("touchstart", event => {
        const touch = event.touches?.[0];
        if (!touch) return;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true, capture: true });

    wrapper.addEventListener("touchend", event => {
        if (touchStartX === null || touchStartY === null) return;
        const touch = event.changedTouches?.[0];
        if (!touch) return resetTouch();

        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        resetTouch();

        if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
        const current = currentPage(wrapper);
        scrollToPage(wrapper, deltaX < 0 ? Math.min(1, current + 1) : Math.max(0, current - 1), true);
    }, { passive: true, capture: true });

    wrapper.addEventListener("scroll", () => window.requestAnimationFrame(() => updatePager(wrapper)), { passive: true });

    function resetTouch() {
        touchStartX = null;
        touchStartY = null;
    }
}

function currentPage(wrapper) {
    const width = Math.max(1, wrapper.clientWidth);
    return Math.max(0, Math.min(1, Math.round(wrapper.scrollLeft / width)));
}

function scrollToPage(wrapper, index, smooth) {
    wrapper.scrollTo({ left: index * wrapper.clientWidth, behavior: smooth ? "smooth" : "auto" });
    window.setTimeout(() => updatePager(wrapper), smooth ? 240 : 0);
}

function updatePager(wrapper) {
    const index = currentPage(wrapper);
    wrapper.querySelectorAll("[data-tdee-expenditure-page]").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.tdeeExpenditurePage) === index));
    });
    const hint = wrapper.querySelector(`:scope > [${PAGER_ATTR}] span`);
    if (hint) hint.textContent = index === 0 ? "Swipe for calories vs expenditure" : "Swipe back for expenditure over time";
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .tdee-expenditure-swipe-card {
            position: relative;
            display: flex;
            align-items: stretch;
            gap: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-snap-type: x mandatory;
            scroll-behavior: smooth;
            scrollbar-width: none;
            overscroll-behavior-x: contain;
            padding-bottom: 30px;
        }
        #calorie-progress .tdee-expenditure-swipe-card::-webkit-scrollbar {
            display: none;
        }
        #calorie-progress .tdee-expenditure-swipe-card > .calorie-stat-card {
            flex: 0 0 100%;
            width: 100%;
            min-width: 100%;
            max-width: 100%;
            margin: 0;
            scroll-snap-align: start;
            scroll-snap-stop: always;
            box-sizing: border-box;
        }
        #calorie-progress .tdee-expenditure-swipe-card > .calorie-expenditure-comparison-card {
            margin-left: 0 !important;
        }
        #calorie-progress .tdee-expenditure-swipe-pager {
            position: sticky;
            left: 0;
            bottom: 0;
            z-index: 5;
            flex: 0 0 0;
            width: 0;
            min-width: 0;
            height: 26px;
            align-self: flex-end;
            transform: translateX(-200%);
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: var(--muted);
            font-size: 8px;
            font-weight: 750;
            white-space: nowrap;
        }
        #calorie-progress .tdee-expenditure-swipe-pager button {
            width: 6px;
            height: 6px;
            min-width: 6px;
            padding: 0;
            border: 0;
            border-radius: 999px;
            background: color-mix(in srgb, var(--text) 24%, transparent);
            pointer-events: auto;
            transition: width .18s ease, background .18s ease;
        }
        #calorie-progress .tdee-expenditure-swipe-pager button[aria-pressed="true"] {
            width: 16px;
            background: var(--accent);
        }
        #calorie-progress .tdee-expenditure-swipe-pager span {
            margin-left: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
            #calorie-progress .tdee-expenditure-swipe-card { scroll-behavior: auto; }
            #calorie-progress .tdee-expenditure-swipe-pager button { transition: none; }
        }
    `;
    document.head.appendChild(style);
}
