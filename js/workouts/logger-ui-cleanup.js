const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";

function readActiveWorkout() {
    try {
        const active = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
        return active?.status === "in_progress" ? active : null;
    } catch {
        return null;
    }
}

function saveActiveWorkout(active) {
    if (!active) return;
    active.updatedAt = new Date().toISOString();
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
}

function enhanceCardioNotes(card) {
    if (!card || card.dataset.compactNotesEnhanced === "true") return;
    card.dataset.compactNotesEnhanced = "true";

    const label = card.querySelector(".cardio-notes-label");
    if (!label) return;

    const textarea = label.querySelector(".session-cardio-notes");
    const hasExistingNotes = Boolean(String(textarea?.value || "").trim());

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cardio-notes-toggle";
    button.textContent = hasExistingNotes ? "− Notes" : "+ Notes";
    button.setAttribute("aria-expanded", String(hasExistingNotes));

    label.hidden = !hasExistingNotes;
    label.insertAdjacentElement("beforebegin", button);

    button.addEventListener("click", () => {
        const opening = label.hidden;
        label.hidden = !opening;
        button.textContent = opening ? "− Notes" : "+ Notes";
        button.setAttribute("aria-expanded", String(opening));
        if (opening) textarea?.focus();
    });
}

function removeRirQuestionnaires(logger) {
    logger.querySelectorAll(".effort-rir-check").forEach(node => node.remove());
}

function tidyCompleteButtons(logger) {
    logger.querySelectorAll(".complete-set-btn").forEach(button => {
        const row = button.closest(".session-set-row");
        if (!row) return;

        row.dataset.setType = "working";
        const completed = row.classList.contains("completed");
        button.textContent = completed ? "✓" : "";
        button.setAttribute("aria-label", completed ? "Working set completed" : "Complete working set");
    });
}

function polishExerciseHeader(card, index, total) {
    if (!card || card.dataset.trackingType !== "reps") return;

    const header = card.querySelector(".compact-exercise-header");
    const heading = header?.querySelector("h4");
    if (!header || !heading) return;

    let title = header.querySelector(".logger-exercise-title");
    if (!title) {
        title = document.createElement("div");
        title.className = "logger-exercise-title";
        heading.insertAdjacentElement("beforebegin", title);
        title.appendChild(heading);
        title.insertAdjacentHTML("beforeend", '<small class="logger-exercise-position"></small>');
    }

    const position = title.querySelector(".logger-exercise-position");
    if (position) position.textContent = `Exercise ${index + 1} of ${total}`;

    let tools = card.querySelector(".logger-exercise-tools");
    if (!tools) {
        tools = document.createElement("div");
        tools.className = "logger-exercise-tools";
        header.insertAdjacentElement("afterend", tools);
    }

    const formGuide = card.querySelector(".logger-form-guide-btn");
    const warmup = card.querySelector(".exercise-warmup-btn");
    if (formGuide && formGuide.parentElement !== tools) tools.appendChild(formGuide);
    if (warmup && warmup.parentElement !== tools) tools.appendChild(warmup);
}

function setupExerciseStrip(logger) {
    const container = logger.querySelector("#session-exercises");
    const controls = container?.querySelector(".exercise-carousel-controls");
    const cards = [...(container?.querySelectorAll(".session-exercise-card") || [])];
    if (!container || !controls || cards.length < 2) return;

    let strip = container.querySelector(".logger-exercise-strip");
    if (!strip) {
        strip = document.createElement("div");
        strip.className = "logger-exercise-strip";
        strip.setAttribute("role", "tablist");
        strip.setAttribute("aria-label", "Workout exercises");
        controls.insertAdjacentElement("afterend", strip);

        strip.addEventListener("click", event => {
            const tab = event.target.closest("button[data-exercise-tab-index]");
            if (!tab) return;
            const target = Number(tab.dataset.exerciseTabIndex);
            let current = Number(logger.dataset.carouselExerciseIndex) || 0;
            const next = controls.querySelector(".exercise-carousel-next");
            const previous = controls.querySelector(".exercise-carousel-prev");

            while (current < target && next && !next.disabled) {
                next.click();
                current += 1;
            }
            while (current > target && previous && !previous.disabled) {
                previous.click();
                current -= 1;
            }
            requestAnimationFrame(() => updateExerciseStrip(logger, true));
        });

        container.addEventListener("pointerup", () => {
            setTimeout(() => updateExerciseStrip(logger, true), 0);
        });
    }

    const signature = cards.map(card => card.querySelector("h4")?.textContent?.trim() || "Exercise").join("|");
    if (strip.dataset.signature !== signature) {
        strip.dataset.signature = signature;
        strip.innerHTML = cards.map((card, index) => {
            const name = card.querySelector("h4")?.textContent?.trim() || `Exercise ${index + 1}`;
            return `
                <button type="button" role="tab" data-exercise-tab-index="${index}" aria-selected="false">
                    <span>${index + 1}</span>
                    <strong>${escapeHtml(name)}</strong>
                </button>
            `;
        }).join("");
    }

    cards.forEach((card, index) => polishExerciseHeader(card, index, cards.length));
    updateExerciseStrip(logger, false);
}

function updateExerciseStrip(logger, centerActive = false) {
    const strip = logger.querySelector(".logger-exercise-strip");
    if (!strip) return;
    const current = Number(logger.dataset.carouselExerciseIndex) || 0;
    strip.querySelectorAll("button[data-exercise-tab-index]").forEach(button => {
        const active = Number(button.dataset.exerciseTabIndex) === current;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
        if (active && centerActive) {
            button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
    });
}

function parseSuggestionNumber(value) {
    const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
}

function parseWarmupSuggestions(panel) {
    return [...panel.querySelectorAll(".warmup-suggestion-row")]
        .map(row => {
            const spans = row.querySelectorAll("span");
            const weight = parseSuggestionNumber(row.querySelector("strong")?.textContent);
            const reps = parseSuggestionNumber(spans[1]?.textContent);
            const percent = parseSuggestionNumber(row.querySelector("small")?.textContent);
            if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
            return {
                setType: "warmup",
                weight,
                reps,
                completed: false,
                suggestedPercent: Number.isFinite(percent) ? percent : null,
                source: "recommended"
            };
        })
        .filter(Boolean);
}

function getWarmupState(card) {
    const active = readActiveWorkout();
    const exerciseIndex = Number(card?.dataset.exerciseIndex);
    const state = active?.exercises?.[exerciseIndex];
    return { active, exerciseIndex, state };
}

function saveWarmupValue(card, warmupIndex, field, value) {
    const { active, state } = getWarmupState(card);
    const set = state?.warmupSets?.[warmupIndex];
    if (!active || !set) return;
    set[field] = value;
    saveActiveWorkout(active);
}

function renderWarmupRows(card) {
    if (!card || card.dataset.trackingType !== "reps") return;

    const logger = card.closest("#workout-session-logger");
    if (logger?.dataset.editingSessionId) return;

    const { state } = getWarmupState(card);
    const warmups = Array.isArray(state?.warmupSets) ? state.warmupSets : [];
    const signature = JSON.stringify(warmups.map(set => [
        set?.weight ?? null,
        set?.reps ?? null,
        Boolean(set?.completed),
        set?.suggestedPercent ?? null
    ]));
    const existingRows = card.querySelectorAll(".session-warmup-row");
    if (card.dataset.warmupRowsSignature === signature && existingRows.length === warmups.length) return;

    existingRows.forEach(row => row.remove());
    card.dataset.warmupRowsSignature = signature;
    if (!warmups.length) return;

    const header = card.querySelector(".session-set-header");
    if (!header) return;

    let anchor = header;
    warmups.forEach((set, warmupIndex) => {
        const row = document.createElement("div");
        row.className = `session-warmup-row ${set.completed ? "completed" : ""}`;
        row.dataset.warmupIndex = String(warmupIndex);
        row.dataset.setType = "warmup";
        const context = Number.isFinite(Number(set.suggestedPercent))
            ? `${Number(set.suggestedPercent)}% warm-up`
            : "Warm-up";
        row.innerHTML = `
            <strong aria-label="Warm-up set">W</strong>
            <span class="previous-set-value warmup-set-context">${escapeHtml(context)}</span>
            <input class="session-warmup-weight" type="number" inputmode="decimal" min="0" step="0.5" value="${set.weight ?? ""}" placeholder="Weight" aria-label="Warm-up set ${warmupIndex + 1} weight">
            <input class="session-warmup-reps" type="number" inputmode="numeric" min="0" step="1" value="${set.reps ?? ""}" placeholder="Reps" aria-label="Warm-up set ${warmupIndex + 1} reps">
            <button class="complete-warmup-btn secondary-btn" type="button" aria-label="${set.completed ? "Warm-up set completed" : "Complete warm-up set"}"></button>
        `;
        anchor.insertAdjacentElement("afterend", row);
        anchor = row;

        row.querySelector(".session-warmup-weight")?.addEventListener("input", event => {
            saveWarmupValue(card, warmupIndex, "weight", event.target.value === "" ? null : Number(event.target.value));
        });
        row.querySelector(".session-warmup-reps")?.addEventListener("input", event => {
            saveWarmupValue(card, warmupIndex, "reps", event.target.value === "" ? null : Number(event.target.value));
        });
        row.querySelector(".complete-warmup-btn")?.addEventListener("click", () => {
            const { active, state: latest } = getWarmupState(card);
            const latestSet = latest?.warmupSets?.[warmupIndex];
            if (!active || !latestSet) return;
            latestSet.completed = !latestSet.completed;
            saveActiveWorkout(active);
            row.classList.toggle("completed", latestSet.completed);
            const button = row.querySelector(".complete-warmup-btn");
            button?.setAttribute("aria-label", latestSet.completed ? "Warm-up set completed" : "Complete warm-up set");
        });
    });
}

function enhanceWarmupPanel(panel) {
    const card = panel.closest(".session-exercise-card");
    if (!card || card.dataset.trackingType !== "reps") return;

    const optional = panel.querySelector(".exercise-warmup-optional");
    const titleSmall = panel.querySelector(".exercise-warmup-title small");
    const suggestions = panel.querySelectorAll(".warmup-suggestion-row");

    if (!suggestions.length) {
        if (titleSmall?.textContent?.trim() === "Not recorded") {
            titleSmall.textContent = "Optional · excluded from working-set stats";
        }
        return;
    }

    if (optional) {
        optional.innerHTML = "<b>Do all, some, or none.</b> Add them to the workout if you want to log them as warm-up sets.";
    }

    const actions = panel.querySelector(".warmup-panel-actions");
    if (!actions || actions.querySelector(".warmup-add-to-workout")) return;

    const { state } = getWarmupState(card);
    const logged = Array.isArray(state?.warmupSets) ? state.warmupSets : [];

    const add = document.createElement("button");
    add.type = "button";
    add.className = "warmup-add-to-workout primary-btn";
    add.textContent = logged.length ? "Update Warm-ups" : "Add to Workout";

    add.addEventListener("click", () => {
        const warmups = parseWarmupSuggestions(panel);
        if (!warmups.length) return;
        const current = getWarmupState(card);
        if (!current.active || !current.state) return;

        const existing = Array.isArray(current.state.warmupSets) ? current.state.warmupSets : [];
        if (existing.some(set => set?.completed)) {
            const replace = window.confirm("Replace the warm-up sets already logged for this exercise?");
            if (!replace) return;
        }

        current.state.warmupSets = warmups;
        saveActiveWorkout(current.active);
        renderWarmupRows(card);
        panel.hidden = true;
        const warmupButton = card.querySelector(".exercise-warmup-btn");
        warmupButton?.setAttribute("aria-expanded", "false");
    });

    const hide = actions.querySelector(".warmup-done-btn");
    if (hide) hide.classList.add("secondary-btn");
    if (hide) hide.insertAdjacentElement("beforebegin", add);
    else actions.appendChild(add);

    if (logged.length) {
        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "warmup-clear-logged secondary-btn";
        clear.textContent = "Remove Logged";
        clear.addEventListener("click", () => {
            const current = getWarmupState(card);
            const existing = Array.isArray(current.state?.warmupSets) ? current.state.warmupSets : [];
            if (!current.active || !current.state || !existing.length) return;
            if (existing.some(set => set?.completed) && !window.confirm("Remove the logged warm-up sets for this exercise?")) return;
            current.state.warmupSets = [];
            saveActiveWorkout(current.active);
            renderWarmupRows(card);
            panel.hidden = true;
            card.querySelector(".exercise-warmup-btn")?.setAttribute("aria-expanded", "false");
        });
        actions.appendChild(clear);
    }

    if (!panel.querySelector(".warmup-stat-note")) {
        const note = document.createElement("p");
        note.className = "warmup-stat-note";
        note.textContent = "Warm-up sets are saved separately and never count toward working-set volume, progression, PRs, or training analytics.";
        actions.insertAdjacentElement("afterend", note);
    }
}

function enhanceWarmupLogging(logger) {
    logger.querySelectorAll('.session-exercise-card[data-tracking-type="reps"]').forEach(card => {
        renderWarmupRows(card);
    });
    logger.querySelectorAll(".exercise-warmup-panel").forEach(enhanceWarmupPanel);
}

function scanLogger() {
    const logger = document.getElementById("workout-session-logger");
    if (!logger) return;

    removeRirQuestionnaires(logger);
    tidyCompleteButtons(logger);
    logger.querySelectorAll(".cardio-session-card").forEach(enhanceCardioNotes);
    setupExerciseStrip(logger);
    enhanceWarmupLogging(logger);
}

let scanQueued = false;
function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
        scanQueued = false;
        scanLogger();
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
scanLogger();

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
