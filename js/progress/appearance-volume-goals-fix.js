const STYLE_ID = "appearance-volume-goals-fix-styles";
const STYLE_HREF = "css/appearance-volume-goals-fix.css?v=appearance-volume-goals-3";
const BAND_CLASSES = [
    "volume-band-none",
    "volume-band-very-low",
    "volume-band-below-target",
    "volume-band-target",
    "volume-band-high",
    "volume-band-very-high"
];
const BAND_STYLE_TOKENS = {
    "volume-band-none": ["--volume-band-none-bg", "--volume-band-none-border"],
    "volume-band-very-low": ["--volume-band-very-low-bg", "--volume-band-very-low-border"],
    "volume-band-below-target": ["--volume-band-below-bg", "--volume-band-below-border"],
    "volume-band-target": ["--volume-band-target-bg", "--volume-band-target-border"],
    "volume-band-high": ["--volume-band-high-bg", "--volume-band-high-border"],
    "volume-band-very-high": ["--volume-band-very-high-bg", "--volume-band-very-high-border"]
};

function ensureStyles() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) {
        if (!existing.href.includes("appearance-volume-goals-3")) existing.href = STYLE_HREF;
        return;
    }
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.appendChild(link);
}

function volumeBand(value) {
    if (!(value > 0)) return ["volume-band-none", "No volume"];
    if (value < 5) return ["volume-band-very-low", "Very low"];
    if (value < 10) return ["volume-band-below-target", "Below target"];
    if (value <= 20) return ["volume-band-target", "Target range"];
    if (value < 25) return ["volume-band-high", "High"];
    return ["volume-band-very-high", "Very high"];
}

function applyBandStyles(cell, bandClass) {
    const tokens = BAND_STYLE_TOKENS[bandClass];
    if (!tokens) return;
    cell.style.setProperty("background", `var(${tokens[0]})`, "important");
    cell.style.setProperty("border-color", `var(${tokens[1]})`, "important");
    cell.style.setProperty("color", "var(--text)", "important");
}

function enhanceHeatmap() {
    const container = document.getElementById("weekly-muscle-volume");
    if (!container) return;

    const cells = [...container.querySelectorAll(".volume-cell")];
    cells.forEach(cell => {
        const value = Number.parseFloat(cell.textContent || "0");
        if (!Number.isFinite(value)) return;
        const [bandClass, label] = volumeBand(value);
        BAND_CLASSES.forEach(name => cell.classList.remove(name));
        cell.classList.add(bandClass);
        applyBandStyles(cell, bandClass);
        cell.dataset.volumeStatus = label;
        cell.setAttribute("aria-label", `${cell.title || "Weekly muscle volume"}. ${label}.`);
    });

    const note = container.querySelector(".weekly-volume-note");
    if (note && !container.querySelector(".volume-goal-guide")) {
        note.insertAdjacentHTML("afterend", `
            <div class="volume-goal-guide">
                <strong>Level Up volume guide:</strong> 10–20 weekly muscle-set credits is the target zone for this view. If a priority muscle is repeatedly below 10, consider reviewing its weekly volume; values above 20 are a cue to check recovery and performance before adding more.
            </div>
        `);
    }

    const legend = container.querySelector(".volume-intensity-legend");
    if (legend && legend.dataset.goalLegend !== "true") {
        legend.dataset.goalLegend = "true";
        legend.classList.add("volume-goal-legend");
        legend.innerHTML = `
            <span><i class="legend-guide-none"></i> 0 · None</span>
            <span><i class="legend-guide-very-low"></i> 1–4.9 · Very low</span>
            <span><i class="legend-guide-below"></i> 5–9.9 · Below target</span>
            <span><i class="legend-guide-target"></i> 10–20 · Target</span>
            <span><i class="legend-guide-high"></i> 20.5–24.9 · High</span>
            <span><i class="legend-guide-very-high"></i> 25+ · Very high</span>
        `;
    }
}

function enhanceWeeklySetsChart() {
    const card = document.getElementById("overall-weekly-sets-card");
    const container = document.getElementById("overall-weekly-sets");
    if (!card || !container) return;

    const title = card.querySelector("h4");
    if (title && title.textContent.trim() !== "Sets Completed Per Week") {
        title.textContent = "Sets Completed Per Week";
    }

    const note = container.querySelector(".weekly-volume-note");
    if (note && note.dataset.weeklySetsCopy !== "true") {
        note.dataset.weeklySetsCopy = "true";
        note.innerHTML = `<strong>Completed working sets per week.</strong> Each bar is the raw number of completed working sets in that Monday–Sunday week; this chart does not use fractional muscle credit.`;
    }

    container.querySelectorAll(".overall-week-column").forEach(column => {
        const value = column.querySelector(".overall-week-value")?.textContent?.trim();
        const week = column.querySelector("small")?.textContent?.trim();
        if (!value || !week) return;
        column.setAttribute("aria-label", `${week}: ${value} completed working sets`);
        column.title = `${week}: ${value} completed working sets`;
    });
}

function removeNamedCoachIdentity() {
    document.querySelectorAll("[data-smart-heading], .smart-build-wizard h2, .smart-build-wizard h3, .smart-build-wizard h4").forEach(heading => {
        const text = heading.textContent?.trim() || "";
        if (/^coach\s+.+?\s+is\s+building\s+your\s+program$/i.test(text) || /^.+?\s+is\s+building\s+your\s+program$/i.test(text)) {
            heading.textContent = "Your coach is building your program";
        }
    });

    document.querySelectorAll(".smart-review-meta span").forEach(chip => {
        if (/^coach\s+.+/i.test(chip.textContent?.trim() || "")) chip.remove();
    });

    const smartBuildRoots = document.querySelectorAll(".smart-build-wizard, [data-smart-step], .smart-review");
    smartBuildRoots.forEach(root => {
        [...root.querySelectorAll("*")].forEach(label => {
            if ((label.textContent?.trim() || "").toUpperCase() !== "YOUR VIRTUAL COACH") return;

            let candidate = label.parentElement;
            while (candidate && candidate !== root) {
                const candidateText = candidate.textContent?.trim() || "";
                const hasAvatar = Boolean(candidate.querySelector("img, picture, [class*='avatar'], [class*='portrait']"));
                const looksLikeIdentityCard = /YOUR VIRTUAL COACH/i.test(candidateText) && /\bCoach\s+[^\n·]+/i.test(candidateText);
                if (hasAvatar && looksLikeIdentityCard) {
                    candidate.remove();
                    return;
                }
                candidate = candidate.parentElement;
            }

            label.parentElement?.remove();
        });
    });
}

function enhanceSmartBuildTheme() {
    document.querySelectorAll(".smart-build-wizard button, .smart-question-card button, .smart-picker-panel button").forEach(button => {
        if (button.textContent?.trim().toLowerCase() === "avoid") {
            button.classList.add("levelup-avoid-action");
        }
    });
    removeNamedCoachIdentity();
}

function applyEnhancements() {
    ensureStyles();
    enhanceHeatmap();
    enhanceWeeklySetsChart();
    enhanceSmartBuildTheme();
}

let scheduled = false;
function scheduleEnhancements() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
        scheduled = false;
        applyEnhancements();
        requestAnimationFrame(enhanceHeatmap);
    });
}

const observer = new MutationObserver(scheduleEnhancements);
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", event => {
    if (event.target.closest?.("#lifting-tab, .training-progress-tab, .training-analytics-range, .smart-build-wizard")) {
        setTimeout(scheduleEnhancements, 0);
    }
});

window.addEventListener("levelup:muscle-map-colors-changed", scheduleEnhancements);
window.addEventListener("levelup:appearance-change", scheduleEnhancements);
window.addEventListener("resize", scheduleEnhancements);

scheduleEnhancements();
