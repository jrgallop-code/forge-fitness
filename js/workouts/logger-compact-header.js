import './workout-mode.js?v=standalone-workout-mode-2-form-guide';

const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";

let durationObserver = null;

function readActiveWorkout() {
    try {
        const active = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
        return active?.status === "in_progress" ? active : null;
    } catch {
        return null;
    }
}

function compactDurationText(value) {
    const parts = String(value || "").trim().split(":");
    if (parts.length !== 3) return String(value || "");

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    if (![hours, minutes, seconds].every(Number.isFinite)) return String(value || "");

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function compactDurationDisplay(display) {
    if (!display) return;
    const compact = compactDurationText(display.textContent);
    if (compact && display.textContent !== compact) display.textContent = compact;
}

function observeDuration(display) {
    if (!display || display.dataset.compactDurationObserved === "true") return;
    display.dataset.compactDurationObserved = "true";
    compactDurationDisplay(display);

    durationObserver?.disconnect();
    durationObserver = new MutationObserver(() => compactDurationDisplay(display));
    durationObserver.observe(display, { childList: true, characterData: true, subtree: true });
}

function formatWorkoutDate(value) {
    if (!value) return "Today";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function syncMetadata(logger) {
    const line = logger.querySelector(".logger-compact-day-date");
    if (!line) return;

    const active = readActiveWorkout();
    const select = logger.querySelector("#session-day-select");
    const date = logger.querySelector("#session-date");
    const dayName =
        select?.selectedOptions?.[0]?.textContent?.trim() ||
        active?.trainingDayName ||
        "Training day";
    const dateValue = date?.value || active?.date || "";

    line.textContent = `${dayName} · ${formatWorkoutDate(dateValue)}`;
}

function bindDetailsToggle(logger, button, fields) {
    if (!button || !fields || button.dataset.compactDetailsBound === "true") return;
    button.dataset.compactDetailsBound = "true";

    button.addEventListener("click", () => {
        const opening = !logger.classList.contains("logger-details-open");
        logger.classList.toggle("logger-details-open", opening);
        button.textContent = opening ? "Done" : "Edit";
        button.setAttribute("aria-expanded", String(opening));
        if (opening) logger.querySelector("#session-date")?.focus();
    });

    logger.querySelector("#session-date")?.addEventListener("change", () => syncMetadata(logger));
    logger.querySelector("#session-day-select")?.addEventListener("change", () => syncMetadata(logger));
}

function ensureCompactHeader(logger) {
    if (!logger || logger.dataset.editingSessionId) return;
    const active = readActiveWorkout();
    if (!active) return;

    const exercises = logger.querySelector("#session-exercises");
    const display = logger.querySelector("#workout-duration-display");
    const timerActions = logger.querySelector(".workout-timer-actions");
    const fields = logger.querySelector(".workout-start-fields");
    if (!exercises || !display || !timerActions || !fields) return;

    logger.classList.add("logger-compact-session-header");

    let header = logger.querySelector(".logger-compact-workout-header");
    if (!header) {
        header = document.createElement("section");
        header.className = "logger-compact-workout-header";
        header.setAttribute("aria-label", "Active workout status");
        header.innerHTML = `
            <div class="logger-compact-time-row">
                <div class="logger-compact-time-group"></div>
            </div>
            <div class="logger-compact-meta-row">
                <span class="logger-compact-day-date"></span>
                <button class="logger-compact-edit-details" type="button" aria-expanded="false">Edit</button>
            </div>
        `;
        exercises.insertAdjacentElement("beforebegin", header);
    }

    const timeGroup = header.querySelector(".logger-compact-time-group");
    if (display.parentElement !== timeGroup) timeGroup.appendChild(display);
    if (timerActions.parentElement !== timeGroup) timeGroup.appendChild(timerActions);

    const pause = timerActions.querySelector("#pause-workout-timer");
    const resume = timerActions.querySelector("#resume-workout-timer");
    if (pause) {
        pause.textContent = "Ⅱ";
        pause.setAttribute("aria-label", "Pause workout timer");
        pause.setAttribute("title", "Pause workout timer");
    }
    if (resume) {
        resume.textContent = "▶";
        resume.setAttribute("aria-label", "Resume workout timer");
        resume.setAttribute("title", "Resume workout timer");
    }

    observeDuration(display);
    syncMetadata(logger);
    bindDetailsToggle(logger, header.querySelector(".logger-compact-edit-details"), fields);
}

function scan() {
    ensureCompactHeader(document.getElementById("workout-session-logger"));
}

let queued = false;
function queueScan() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        scan();
    });
}

const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation =>
        [...mutation.addedNodes].some(node =>
            node.nodeType === 1 && (
                node.id === "workout-session-logger" ||
                node.closest?.("#workout-session-logger") ||
                node.querySelector?.("#workout-session-logger")
            )
        )
    );
    if (relevant) queueScan();
});

observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener("click", event => {
    if (event.target.closest("#begin-session-btn, #resume-active-workout, [data-page='workout'], .nav-workout")) {
        setTimeout(scan, 0);
        setTimeout(scan, 120);
        setTimeout(scan, 400);
    }
});
window.addEventListener("focus", scan);
scan();
