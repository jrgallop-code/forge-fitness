import { navigate } from "../core/router.js?v=deload-workout-preview-1";

const CARD_ID = "interactive-workout-tutorial-card";
const LINK_CLASS = "interactive-workout-native-launch";
const PARAM = "workoutTutorial";
const PARAM_VALUE = "1";
let queued = false;

install();

function install() {
    ensureStyles();
    queueOverlay();
    new MutationObserver(queueOverlay).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", queueOverlay);
    startFromUrlFlag();
}

function queueOverlay() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        installOverlay();
    });
}

function installOverlay() {
    const card = document.getElementById(CARD_ID);
    const section = card?.closest(".interactive-workout-tutorial-section");
    if (!card || !section) return;

    section.style.position = "relative";
    let link = section.querySelector(`.${LINK_CLASS}`);
    if (!link) {
        link = document.createElement("a");
        link.className = LINK_CLASS;
        link.href = buildLaunchHref();
        link.setAttribute("aria-label", "Start Interactive Workout Logger tutorial");
        link.title = "Start Interactive Workout Logger tutorial";
        section.appendChild(link);
    }

    // Match the visible tutorial card exactly. The user taps a normal native link,
    // so launch does not depend on pointer/click handlers surviving iOS PWA caching.
    link.style.top = `${card.offsetTop}px`;
    link.style.left = `${card.offsetLeft}px`;
    link.style.width = `${card.offsetWidth}px`;
    link.style.height = `${card.offsetHeight}px`;
}

function buildLaunchHref() {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM, PARAM_VALUE);
    url.hash = "";
    return `${url.pathname}${url.search}`;
}

function startFromUrlFlag() {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PARAM) !== PARAM_VALUE) return;

    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);

    // Wait until the normal app has rendered, then open More → Tutorials and
    // activate the current tutorial card with a synthetic click. This preserves
    // the production template/logger tutorial rather than creating a second flow.
    window.setTimeout(() => {
        navigate("more");
        waitFor('[data-more-page="learn"]', tutorialsButton => {
            tutorialsButton.click();
            waitFor(`#${CARD_ID}`, card => {
                card.click();
            });
        });
    }, 120);
}

function waitFor(selector, callback, attempt = 0) {
    const node = document.querySelector(selector);
    if (node) {
        callback(node);
        return;
    }
    if (attempt >= 120) return;
    window.setTimeout(() => waitFor(selector, callback, attempt + 1), 50);
}

function ensureStyles() {
    if (document.getElementById("interactive-workout-native-launch-style")) return;
    const style = document.createElement("style");
    style.id = "interactive-workout-native-launch-style";
    style.textContent = `
        .interactive-workout-native-launch{
            position:absolute;
            z-index:2147483000;
            display:block;
            background:transparent;
            border:0;
            opacity:.001;
            pointer-events:auto!important;
            touch-action:auto;
            -webkit-tap-highlight-color:transparent;
        }
        html.interactive-workout-tutorial-active .interactive-workout-native-launch{display:none!important;}
    `;
    document.head.appendChild(style);
}
