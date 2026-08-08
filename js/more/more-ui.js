import {
    navigate
}
from "../core/router.js?v=router-workout-flow-1";


export function renderMore() {

    return `
        <section class="dashboard-welcome">
            <div>
                <span class="eyebrow">TOOLS & TRACKERS</span>
                <h2>More</h2>
                <p>Open a focused tool without scrolling through a long page.</p>
            </div>
        </section>

        <section class="more-menu-grid" aria-label="More tools">
            <button class="more-menu-card" type="button" data-more-page="history">
                <span class="more-menu-icon">🕘</span>
                <span>
                    <strong>Workout History</strong>
                    <small>Resume unfinished workouts or edit completed sessions.</small>
                </span>
                <span class="more-menu-arrow">›</span>
            </button>

            <button class="more-menu-card" type="button" data-more-page="water">
                <span class="more-menu-icon">💧</span>
                <span>
                    <strong>Water Log</strong>
                    <small>Record daily water and review recent entries.</small>
                </span>
                <span class="more-menu-arrow">›</span>
            </button>

            <button class="more-menu-card" type="button" data-more-page="energy">
                <span class="more-menu-icon">🥗</span>
                <span>
                    <strong>Nutrition Planner</strong>
                    <small>Manage energy needs, calorie goals, macros and your goal timeline.</small>
                </span>
                <span class="more-menu-arrow">›</span>
            </button>
        </section>
    `;

}


export function initializeMore() {

    document
        .querySelectorAll("[data-more-page]")
        .forEach(button =>
            button.addEventListener(
                "click",
                () =>
                    navigate(
                        button.dataset.morePage
                    )
            )
        );

}
