import {
    navigate
}
from "./core/router.js?v=router-data-storage-1";

import {
    renderNavbar,
    initializeNavbar
}
from "./components/navbar.js?v=navbar-icons-3";

import {
    initializeWorkoutRuntime
}
from "./workouts/workout-session.js?v=workout-session-4";

const FILLED_ICON = paths => `
    <svg class="app-inline-icon" viewBox="0 0 24 24" aria-hidden="true">
        ${paths}
    </svg>
`;

const STROKE_ICON = paths => `
    <svg class="app-inline-icon" viewBox="0 0 24 24" aria-hidden="true"
         style="fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round">
        ${paths}
    </svg>
`;

const DUMBBELL_SVG = FILLED_ICON(`
    <path d="M2.7 10.2h2v3.6h-2v-3.6Zm3-2h2.1v7.6H5.7V8.2Zm2.9 2.8h6.8v2H8.6v-2Zm7.6-2.8h2.1v7.6h-2.1V8.2Zm3.1 2h2v3.6h-2v-3.6Z"/>
`);

const EXERCISE_LIFTER_SVG = `
    <svg class="app-inline-icon app-exercise-person-icon" viewBox="0 0 24 24" aria-hidden="true"
         style="fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">
        <path d="M3 3.4h18"/>
        <path d="M3 1.9v3M5 1.3v4.2M19 1.3v4.2M21 1.9v3"/>
        <circle cx="12" cy="7.2" r="1.7"/>
        <path d="M10 10.2 7 4.2M14 10.2l3-6"/>
        <path d="M10 10.2h4l.8 5.1M10 10.2l-.8 5.1"/>
        <path d="M9.2 15.3 7 21M14.8 15.3 17 21M9.2 15.3h5.6"/>
    </svg>
`;

const ICONS = {
    "💪": DUMBBELL_SVG,
    "🏋️‍♂️": EXERCISE_LIFTER_SVG,
    "🏋️‍♀️": EXERCISE_LIFTER_SVG,
    "🏋️": EXERCISE_LIFTER_SVG,
    "🏋": EXERCISE_LIFTER_SVG,
    "👤": STROKE_ICON(`<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.5-4.2 3-6.4 6.5-6.4s6 2.2 6.5 6.4"/>`),
    "🎯": STROKE_ICON(`<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8"/><path d="m15.5 8.5 4.2-4.2M17.2 4.3h2.5v2.5"/>`),
    "📈": STROKE_ICON(`<path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6"/><path d="M16.5 7H19v2.5"/>`),
    "📉": STROKE_ICON(`<path d="M4 5v14h16M7 9l4 4 3-2 5 6"/><path d="M16.5 17H19v-2.5"/>`),
    "📊": STROKE_ICON(`<path d="M4 20V4M4 20h16"/><path d="M7 17v-5h3v5M12 17V8h3v9M17 17V5h3v12"/>`),
    "⚖️": STROKE_ICON(`<path d="M12 4v15M7 5h10M4.5 8 2.5 13h4L4.5 8Zm15 0-2 5h4l-2-5ZM7.5 20h9"/>`),
    "⚖": STROKE_ICON(`<path d="M12 4v15M7 5h10M4.5 8 2.5 13h4L4.5 8Zm15 0-2 5h4l-2-5ZM7.5 20h9"/>`),
    "🌙": FILLED_ICON(`<path d="M20.4 15.2A8.6 8.6 0 0 1 9 3.6 9 9 0 1 0 20.4 15.2Z"/>`),
    "💧": FILLED_ICON(`<path d="M12 2.4S5.8 9.4 5.8 14a6.2 6.2 0 0 0 12.4 0C18.2 9.4 12 2.4 12 2.4Z"/>`),
    "🔥": FILLED_ICON(`<path d="M13.6 2.4c.3 2.4-.5 4.1-2 5.6-1.3 1.2-2.2 2.4-2.1 4.1 0 .9.4 1.6 1 2.2-.1-2.1 1.1-3.4 2.6-4.6.3 1.7 1.4 2.7 2.3 3.8.8 1 1.2 2 1.1 3.3-.1 2.7-2.1 4.8-4.9 4.8-3.3 0-5.7-2.4-5.7-5.8 0-3.4 1.9-5.5 4-7.6 1.9-1.8 3.2-3.3 3.7-5.8Z"/>`),
    "⚡": FILLED_ICON(`<path d="M13.5 2 5.8 13h5.1L9.8 22l8.4-12h-5.4L13.5 2Z"/>`),
    "🕘": STROKE_ICON(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5H8.5"/>`),
    "🕒": STROKE_ICON(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5h4"/>`),
    "⏱️": STROKE_ICON(`<circle cx="12" cy="13" r="7.2"/><path d="M12 5.8V3M9.5 3h5M17.2 7.8l1.4-1.4M12 13l3-2"/>`),
    "⏱": STROKE_ICON(`<circle cx="12" cy="13" r="7.2"/><path d="M12 5.8V3M9.5 3h5M17.2 7.8l1.4-1.4M12 13l3-2"/>`),
    "☁️": FILLED_ICON(`<path d="M7.2 18.5h10.5a4.3 4.3 0 0 0 .4-8.6A6.4 6.4 0 0 0 6 8.2a5.2 5.2 0 0 0 1.2 10.3Z"/>`),
    "☁": FILLED_ICON(`<path d="M7.2 18.5h10.5a4.3 4.3 0 0 0 .4-8.6A6.4 6.4 0 0 0 6 8.2a5.2 5.2 0 0 0 1.2 10.3Z"/>`),
    "📋": STROKE_ICON(`<path d="M8 5.5H5.8A1.8 1.8 0 0 0 4 7.3v12.9h16V7.3a1.8 1.8 0 0 0-1.8-1.8H16"/><path d="M8 4.2h2a2 2 0 0 1 4 0h2v3H8v-3ZM8 11h8M8 15h8"/>`),
    "✅": STROKE_ICON(`<circle cx="12" cy="12" r="9"/><path d="m7.5 12.2 3 3 6-6"/>`),
    "🌿": STROKE_ICON(`<path d="M5 19c5-1 9-5 12-12M7 16c-2.5-1-3.8-3-3.5-5.5 2.8-.4 5 .7 6.3 3M12 11c.3-3.2 2.2-5.2 5.7-6 1.1 3.2.1 5.8-3 7.5"/>`),
    "🌱": STROKE_ICON(`<path d="M12 21v-9M12 14c-4.2 0-6.5-2.1-7-6 4.2-.4 6.6 1.4 7 5M12 12c.4-4.1 2.8-6 7-5.7-.4 4-2.7 6-7 6"/>`),
    "🥦": STROKE_ICON(`<path d="M11 21v-7M14 21v-7M8 14h9"/><circle cx="8" cy="9" r="3"/><circle cx="13" cy="7" r="3.5"/><circle cx="17" cy="10" r="3"/>`),
    "🥬": STROKE_ICON(`<path d="M12 21V8M12 17c-4-1-6.5-3.7-7-8 4.2 0 6.8 2 7 6M12 15c.5-4.1 2.8-6.4 7-7-.1 4.4-2.4 7-7 8"/>`),
    "🥚": STROKE_ICON(`<path d="M12 3c3.4 0 6.2 5.3 6.2 10 0 4-2.6 7-6.2 7s-6.2-3-6.2-7C5.8 8.3 8.6 3 12 3Z"/>`),
    "🌾": STROKE_ICON(`<path d="M12 21V4M12 8 8 5M12 11 7 9M12 14l-5 1M12 8l4-3M12 11l5-2M12 14l5 1"/>`),
    "🫘": STROKE_ICON(`<path d="M8.4 5.2c4.1-2.1 8.1.2 8 4.1-.1 3.2-2.2 4.2-4.7 5.3-2.2 1-3.4 2.8-3.8 4.2-3.3-.8-5-3.1-4.6-6 .4-3 2.1-6.1 5.1-7.6Z"/>`),
    "🥑": STROKE_ICON(`<path d="M12 3c3.2 0 6.5 6.1 6.5 10.2A6.5 6.5 0 0 1 5.5 13.2C5.5 9.1 8.8 3 12 3Z"/><circle cx="12" cy="14" r="2.4"/>`),
    "🥩": STROKE_ICON(`<path d="M5.3 7.2c3.1-3 8-3.5 11.3-.8 3 2.5 3.4 6.7.8 9.4-2.4 2.5-6.6 2.9-9.7 1.2-3.8-2.1-5.3-6.9-2.4-9.8Z"/><circle cx="14.8" cy="10.2" r="1.7"/>`),
    "🛌": STROKE_ICON(`<path d="M3 19V8M3 15h18v4M7 15v-4h5a4 4 0 0 1 4 4M5.5 9.5h3v3h-3z"/>`),
    "🛒": STROKE_ICON(`<path d="M3 5h2l2.2 9.5h9.7l2-6.5H6M9 19.2h.1M17 19.2h.1"/>`),
    "📸": STROKE_ICON(`<path d="M4 8h4l1.4-2h5.2L16 8h4v11H4V8Z"/><circle cx="12" cy="13.5" r="3.2"/>`),
    "📅": STROKE_ICON(`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/>`),
    "🗓️": STROKE_ICON(`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M8 13h2M14 13h2M8 17h2M14 17h2"/>`)
};

const ICON_TOKENS = Object.keys(ICONS).sort((a, b) => b.length - a.length);
const ICON_REGEX = new RegExp(`(${ICON_TOKENS.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");

function createIconElement(svgMarkup) {
    const template = document.createElement("template");
    template.innerHTML = svgMarkup.trim();
    return template.content.firstElementChild;
}

function replaceColoredEmojis(root) {
    if (!root) return;

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.closest("script, style, textarea, input, option")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return ICON_TOKENS.some(token => node.nodeValue?.includes(token))
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        }
    );

    const matches = [];
    let node;

    while ((node = walker.nextNode())) {
        matches.push(node);
    }

    matches.forEach(textNode => {
        const parts = textNode.nodeValue.split(ICON_REGEX);
        const fragment = document.createDocumentFragment();

        parts.forEach(part => {
            if (!part) return;
            if (ICONS[part]) {
                fragment.append(createIconElement(ICONS[part]));
            }
            else {
                fragment.append(document.createTextNode(part));
            }
        });

        textNode.replaceWith(fragment);
    });
}

function addExerciseButtonIcons(root) {
    root.querySelectorAll?.("button").forEach(button => {
        if (!/\bexercises?\b/i.test(button.textContent || "")) return;
        if (button.querySelector(".app-exercise-person-icon")) return;

        button.insertBefore(
            createIconElement(EXERCISE_LIFTER_SVG),
            button.firstChild
        );
    });
}

function decorateAppIcons(root = document) {
    replaceColoredEmojis(root);
    addExerciseButtonIcons(root);
}

initializeWorkoutRuntime();

const content = document.getElementById("content");
if (content) {
    new MutationObserver(() => decorateAppIcons(content))
        .observe(content, { childList: true, subtree: true });
}

navigate("home");
decorateAppIcons(content || document);

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("./service-worker.js")
        .catch(error => console.warn("Service worker registration failed:", error));
}

document.body.insertAdjacentHTML("beforeend", renderNavbar());
initializeNavbar();
decorateAppIcons(document);
