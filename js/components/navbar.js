import { navigate } from "../core/router.js?v=history-editor-route-1";


export function renderNavbar() {
    return `
        <nav class="bottom-nav" aria-label="Primary navigation">
            <button class="nav-btn active" data-page="home" aria-label="Dashboard" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/>
                </svg>
                <span>Dashboard</span>
            </button>

            <button class="nav-btn" data-page="workout" aria-label="Workout" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 8h2v8h-2V8Zm2-2h3v12h-3V6Zm3 4h9v4h-9v-4Zm9-4h3v12h-3V6Zm3 2h2v8h-2V8Z"/>
                </svg>
                <span>Workout</span>
            </button>

            <button class="nav-btn" data-page="progress" aria-label="Progress" type="button">
                <svg class="nav-icon nav-icon-stroke" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 18.5V5.5M4 18.5h16"/>
                    <path d="m7 15 4-4 3 2 5-6"/>
                    <path d="M16.5 7H19v2.5"/>
                </svg>
                <span>Progress</span>
            </button>

            <button class="nav-btn" data-page="energy" aria-label="Nutrition" type="button">
                <svg class="nav-icon nav-icon-stroke" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 3v5M8 3v5M11 3v5M5 8c0 1.7 1.3 3 3 3s3-1.3 3-3M8 11v10"/>
                    <path d="M18 3v18M18 3c-2.3 2.4-3.5 5-3.5 8H18"/>
                </svg>
                <span>Nutrition</span>
            </button>

            <button class="nav-btn" data-page="more" aria-label="More" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="5" cy="12" r="2.1"/>
                    <circle cx="12" cy="12" r="2.1"/>
                    <circle cx="19" cy="12" r="2.1"/>
                </svg>
                <span>More</span>
            </button>
        </nav>
    `;
}


function initializeNativeTabGlass(nav) {
    const capacitor = window.Capacitor;
    if (!capacitor?.isNativePlatform?.() || capacitor.getPlatform?.() !== "ios") return;

    const pill = document.createElement("span");
    pill.className = "ios-tab-glass";
    pill.setAttribute("aria-hidden", "true");
    nav.prepend(pill);

    let gesture = null;
    let frame = 0;
    const sync = () => {
        frame = 0;
        const active = nav.querySelector(".nav-btn.active");
        if (!active?.offsetWidth) {
            pill.hidden = true;
            return;
        }
        const tabs = visibleTabs();
        const restX = active.offsetLeft + 2;
        const dragX = gesture?.dragging
            ? Math.max(tabs[0].offsetLeft + 2, Math.min(
                tabs.at(-1).offsetLeft + tabs.at(-1).offsetWidth - active.offsetWidth + 2,
                restX + gesture.x - gesture.startX
            ))
            : restX;
        pill.style.setProperty("--glass-x", `${dragX}px`);
        pill.style.setProperty("--glass-y", `${active.offsetTop + 2}px`);
        pill.style.width = `${active.offsetWidth - 4}px`;
        pill.style.height = `${active.offsetHeight - 4}px`;
        pill.hidden = false;
        nav.classList.add("has-ios-tab-glass");
    };
    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(sync);
    };

    new MutationObserver(schedule).observe(nav, {
        subtree: true, attributes: true, attributeFilter: ["class"]
    });
    new ResizeObserver(schedule).observe(nav);
    const visibleTabs = () => [...nav.querySelectorAll(".nav-btn")].filter(tab => tab.offsetWidth);
    nav.addEventListener("pointerdown", event => {
        const button = event.target.closest(".nav-btn");
        if (!event.isPrimary || event.button !== 0 || !button) return;
        gesture = { id: event.pointerId, startX: event.clientX, x: event.clientX, dragging: false };
        pill.classList.add("is-pressed");
    });
    window.addEventListener("pointermove", event => {
        if (gesture?.id !== event.pointerId) return;
        gesture.x = event.clientX;
        if (!gesture.dragging && Math.abs(gesture.x - gesture.startX) >= 8) {
            gesture.dragging = true;
            pill.classList.add("is-dragging");
            nav.setPointerCapture(event.pointerId);
        }
        if (gesture.dragging) schedule();
    });
    const release = event => {
        if (!gesture || (event.type !== "blur" && event.pointerId !== gesture.id)) return;
        const dragged = gesture.dragging;
        gesture = null;
        pill.classList.remove("is-pressed", "is-dragging");
        if (dragged && event.type === "pointerup") {
            const tab = visibleTabs().find(button => {
                const rect = button.getBoundingClientRect();
                return event.clientX >= rect.left && event.clientX <= rect.right
                    && event.clientY >= rect.top - 16 && event.clientY <= rect.bottom + 16;
            });
            tab?.click();
        }
        schedule();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    sync();
}

export function initializeNavbar() {
    const nav =
        document.querySelector(".bottom-nav");

    if (!nav || nav.dataset.bound === "true") {
        return;
    }

    nav.dataset.bound = "true";
    initializeNativeTabGlass(nav);

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

            // Workout creation/filter sheets are mounted on document.body rather
            // than inside #content. Always remove a stale one before changing tabs
            // so it can never intercept the next navigation tap.
            document.querySelectorAll("[data-workout-live-sheet]")
                .forEach(sheet => sheet.remove());

            button.classList.remove("nav-pulse");
            void button.offsetWidth;
            button.classList.add("nav-pulse");
            button.addEventListener(
                "animationend",
                () => button.classList.remove("nav-pulse"),
                { once: true }
            );

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
