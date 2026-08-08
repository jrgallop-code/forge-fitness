import {
    navigate
}
from "../core/router.js?v=router-more-1";


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
            <button class="more-menu-card" type="button" data-more-page="water">
                <span class="more-menu-icon">💧</span>
                <span>
                    <strong>Water Log</strong>
                    <small>Record daily water and review recent entries.</small>
                </span>
                <span class="more-menu-arrow">›</span>
            </button>

            <button class="more-menu-card" type="button" data-more-page="energy">
                <span class="more-menu-icon">⚡</span>
                <span>
                    <strong>Energy Estimate</strong>
                    <small>Open the educational adult energy-needs calculator.</small>
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
