import {
    navigate
}
from "./core/router.js?v=router-icons-stage-2";

import {
    renderNavbar,
    initializeNavbar
}
from "./components/navbar.js?v=navbar-icons-3";

import {
    initializeWorkoutRuntime
}
from "./workouts/workout-session.js?v=workout-session-4";

const DUMBBELL_SVG = `
    <svg class="app-inline-icon app-dumbbell-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.7 10.2h2v3.6h-2v-3.6Zm3-2h2.1v7.6H5.7V8.2Zm2.9 2.8h6.8v2H8.6v-2Zm7.6-2.8h2.1v7.6h-2.1V8.2Zm3.1 2h2v3.6h-2v-3.6Z"/>
    </svg>
`;

const EXERCISE_LIFTER_SVG = `
    <svg class="app-inline-icon app-exercise-person-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="6" r="2.05"/>
        <path d="M10.2 9h3.6l1.1 3.9 2.5 2.2-1.4 1.6-3-2.5-1-2.2-1 2.2-3 2.5-1.4-1.6 2.5-2.2L10.2 9Z"/>
        <path d="M9.8 15.1 8 21h2.4l1.6-3.8 1.6 3.8H16l-1.8-5.9H9.8Z"/>
        <path d="M3.1 3.2h2v5.2h-2V3.2Zm2.8 1.2H8v2.8H5.9V4.4Zm2.3.7h7.6v1.4H8.2V5.1Zm7.8-.7h2.1v2.8H16V4.4Zm2.9-1.2h2v5.2h-2V3.2Z"/>
    </svg>
`;

function createIconElement(svgMarkup) {
    const template = document.createElement("template");
    template.innerHTML = svgMarkup.trim();
    return template.content.firstElementChild;
}

function replaceBicepEmoji(root) {
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
    );

    const matches = [];
    let node;

    while ((node = walker.nextNode())) {
        if (node.nodeValue?.includes("💪")) {
            matches.push(node);
        }
    }

    matches.forEach(textNode => {
        const parts = textNode.nodeValue.split("💪");
        const fragment = document.createDocumentFragment();

        parts.forEach((part, index) => {
            if (part) fragment.append(document.createTextNode(part));
            if (index < parts.length - 1) {
                fragment.append(createIconElement(DUMBBELL_SVG));
            }
        });

        textNode.replaceWith(fragment);
    });
}

function addExerciseButtonIcons(root) {
    root.querySelectorAll("button").forEach(button => {
        if (!/\bexercises?\b/i.test(button.textContent || "")) return;
        if (button.querySelector(".app-exercise-person-icon")) return;

        button.insertBefore(
            createIconElement(EXERCISE_LIFTER_SVG),
            button.firstChild
        );
    });
}

function decorateAppIcons(root = document) {
    replaceBicepEmoji(root);
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
