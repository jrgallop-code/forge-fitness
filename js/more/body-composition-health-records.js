const STYLE_ID = "level-up-body-composition-health-records-styles";
const CARD_ATTR = "data-more-body-composition";
const STAGING_ATTR = "data-body-composition-staging";
let queued = false;
let opening = false;

install();

function install() {
    ensureStyles();
    reconcile();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        reconcile();
    });
}

function reconcile() {
    hideProgressPlacement();
    ensureHealthRecordsCard();
}

function hideProgressPlacement() {
    const tab = document.getElementById("body-composition-progress-tab");
    if (tab && !tab.closest(`[${STAGING_ATTR}]`)) {
        tab.hidden = true;
        tab.setAttribute("aria-hidden", "true");
        tab.tabIndex = -1;
    }

    const panel = document.getElementById("body-composition-progress");
    if (panel && !panel.closest(`[${STAGING_ATTR}]`) && !panel.closest("[data-body-composition-more-host]")) {
        panel.hidden = true;
    }
}

function ensureHealthRecordsCard() {
    const group = document.querySelector('.more-menu-group[data-more-group="health"]');
    if (!group || group.querySelector(`[${CARD_ATTR}]`)) return;

    const card = document.createElement("button");
    card.className = "more-menu-card";
    card.type = "button";
    card.setAttribute(CARD_ATTR, "1");
    card.innerHTML = `
        <span class="more-menu-icon" aria-hidden="true">
            <svg class="app-silhouette-icon" viewBox="0 0 24 24"><path d="M8 3.5c1.1 1.1 2.4 1.7 4 1.7s2.9-.6 4-1.7l2 2.1-1.6 3.7V20H7.6V9.3L6 5.6l2-2.1Zm1.4 3.1.2 2.1h4.8l.2-2.1c-.8.4-1.7.6-2.6.6s-1.8-.2-2.6-.6Zm.2 4.1V18h4.8v-7.3H9.6Z"/></svg>
        </span>
        <span><strong>Body Composition</strong><small>Track body-fat estimates, fat mass, lean mass and changes over time.</small></span>`;

    const measurements = group.querySelector('[data-more-page="measurements"]');
    if (measurements) measurements.insertAdjacentElement("beforebegin", card);
    else group.appendChild(card);
}

function handleClick(event) {
    if (event.target.closest?.(`[${CARD_ATTR}]`)) {
        event.preventDefault();
        openBodyCompositionPage();
        return;
    }
    if (event.target.closest?.("[data-body-composition-more-back]")) {
        event.preventDefault();
        document.querySelector('.bottom-nav .nav-btn[data-page="more"]')?.click();
    }
}

function openBodyCompositionPage() {
    if (opening) return;
    opening = true;
    const content = document.getElementById("content");
    if (!content) {
        opening = false;
        return;
    }

    content.innerHTML = `
        <section class="dashboard-welcome body-composition-more-header">
            <div>
                <button class="nutrition-planner-back" type="button" data-body-composition-more-back>← More</button>
                <span class="eyebrow">HEALTH &amp; RECORDS</span>
                <h2>Body Composition</h2>
                <p>Track body-fat estimates and see estimated fat mass and lean mass alongside your weight history.</p>
            </div>
        </section>
        <div data-body-composition-more-host></div>
        <div ${STAGING_ATTR}="1" hidden>
            <div class="progress-tabs"><button id="weight-tab" type="button">Weight</button></div>
            <div id="weight-progress"></div>
        </div>`;

    waitForBodyCompositionPanel(0);
}

function waitForBodyCompositionPanel(attempt) {
    const staging = document.querySelector(`[${STAGING_ATTR}]`);
    const host = document.querySelector("[data-body-composition-more-host]");
    const panel = staging?.querySelector("#body-composition-progress");

    if (staging && host && panel) {
        panel.hidden = false;
        host.replaceChildren(panel);
        staging.remove();
        opening = false;
        window.dispatchEvent(new CustomEvent("levelup:body-composition-updated", { detail: { source: "health-records-opened" } }));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    if (attempt >= 24) {
        opening = false;
        if (host) host.innerHTML = '<p class="empty-state">Body Composition could not load. Close and reopen this page.</p>';
        staging?.remove();
        return;
    }

    requestAnimationFrame(() => waitForBodyCompositionPanel(attempt + 1));
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #body-composition-progress-tab{display:none!important}
        .body-composition-more-header{margin-bottom:14px}
        [data-body-composition-more-host] #body-composition-progress{display:block!important}
        [data-body-composition-more-host] .body-composition-shell{padding-bottom:18px}
    `;
    document.head.appendChild(style);
}
