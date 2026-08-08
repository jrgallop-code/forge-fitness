import { navigate }
from "../core/router.js?v=router-nav-stable-1";


export function renderNavbar() {
    return `
        <nav class="bottom-nav" aria-label="Primary navigation">
            <button class="nav-btn active" data-page="home" aria-label="Home" type="button">
                🏠
                <span>Home</span>
            </button>

            <button class="nav-btn" data-page="workout" aria-label="Workout" type="button">
                💪
                <span>Workout</span>
            </button>

            <button class="nav-btn" data-page="progress" aria-label="Progress" type="button">
                📈
                <span>Progress</span>
            </button>

            <button class="nav-btn" data-page="energy" aria-label="Calorie Planner" type="button">
                🔥
                <span>Calories</span>
            </button>

            <button class="nav-btn" data-page="more" aria-label="More" type="button">
                •••
                <span>More</span>
            </button>
        </nav>
    `;
}


export function initializeNavbar() {
    const nav =
        document.querySelector(".bottom-nav");

    if (!nav || nav.dataset.bound === "true") {
        return;
    }

    nav.dataset.bound = "true";

    nav.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(".nav-btn");

            if (!button || !nav.contains(button)) {
                return;
            }

            const page =
                button.dataset.page;

            if (!page) {
                return;
            }

            event.preventDefault();

            nav.querySelectorAll(".nav-btn")
                .forEach(item =>
                    item.classList.toggle(
                        "active",
                        item === button
                    )
                );

            try {
                navigate(page);
            }
            catch (error) {
                console.error(
                    `Navigation to ${page} failed:`,
                    error
                );
            }
        }
    );
}
