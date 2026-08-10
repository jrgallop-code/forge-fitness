export function initializeWorkoutCatalogue(root = document) {
    const page = root.querySelector?.(".workout-page") || document.querySelector(".workout-page");
    if (!page) return;

    const home = page.querySelector("[data-workout-home]");
    const catalogue = page.querySelector("[data-catalogue-view]");
    const builder = page.querySelector("#plan-builder");
    const list = page.querySelector("#saved-plan-list");
    const viewAll = page.querySelector("[data-workout-view-all]");

    const showHome = () => {
        if (home) home.hidden = false;
        if (catalogue) catalogue.hidden = true;
        window.scrollTo({ top: page.offsetTop, behavior: "smooth" });
    };

    page.querySelector("[data-catalogue-open]")?.addEventListener("click", () => {
        if (home) home.hidden = true;
        if (builder) builder.hidden = true;
        if (catalogue) catalogue.hidden = false;
        applyFilters();
        window.scrollTo({ top: page.offsetTop, behavior: "smooth" });
    });

    page.querySelector("[data-catalogue-back]")?.addEventListener("click", showHome);

    const savedCards = list?.querySelectorAll(".preset-plan-card") || [];
    if (viewAll && savedCards.length > 2) {
        viewAll.hidden = false;
        viewAll.addEventListener("click", () => {
            const expanded = list.classList.toggle("is-expanded");
            list.classList.toggle("is-collapsed", !expanded);
            viewAll.textContent = expanded ? "Show Recent Workouts" : "View All Workouts";
        });
    }

    const moreButton = page.querySelector("[data-catalogue-more]");
    const morePanel = page.querySelector("[data-catalogue-more-panel]");
    moreButton?.addEventListener("click", () => {
        morePanel.hidden = !morePanel.hidden;
        moreButton.textContent = morePanel.hidden ? "More Filters" : "Fewer Filters";
    });

    const filters = page.querySelectorAll("[data-catalogue-type], [data-catalogue-days], [data-catalogue-equipment], [data-catalogue-duration], [data-catalogue-level]");
    filters.forEach(control => control.addEventListener("change", applyFilters));

    function applyFilters() {
        const type = page.querySelector("[data-catalogue-type]")?.value || "";
        const days = page.querySelector("[data-catalogue-days]")?.value || "";
        const equipment = page.querySelector("[data-catalogue-equipment]")?.value || "";
        const duration = page.querySelector("[data-catalogue-duration]")?.value || "";
        const level = page.querySelector("[data-catalogue-level]")?.value || "";
        const cards = [...page.querySelectorAll(".catalogue-plan-card")];
        let visible = 0;

        cards.forEach(card => {
            const durationValues = (card.dataset.duration || "").match(/\d+/g)?.map(Number) || [];
            const minimum = durationValues[0] || 0;
            const maximum = durationValues.at(-1) || minimum;
            const durationMatch = !duration
                || (duration === "45" && maximum <= 45)
                || (duration === "60" && minimum <= 60 && maximum > 45)
                || (duration === "61" && maximum > 60);
            const matches = (!type || card.dataset.type.includes(type))
                && (!days || card.dataset.days === days)
                && (!equipment || card.dataset.equipment.includes(equipment))
                && (!level || card.dataset.level.includes(level))
                && durationMatch;
            card.hidden = !matches;
            if (matches) visible += 1;
        });

        const count = page.querySelector("[data-catalogue-count]");
        if (count) count.textContent = `${visible} template${visible === 1 ? "" : "s"}`;
        const empty = page.querySelector("[data-catalogue-empty]");
        if (empty) empty.hidden = visible !== 0;
    }

    initializeFormCoach(page);
    applyFilters();
}

function initializeFormCoach(page) {
    const root = page.querySelector("[data-form-coach]");
    if (!root || root.dataset.formCoachBound === "true") return;
    root.dataset.formCoachBound = "true";

    const inputs = [...root.querySelectorAll("[data-form-coach-video-source]")];
    const player = root.querySelector("[data-form-coach-player]");
    const preview = root.querySelector("[data-form-coach-preview]");
    const fileLabel = root.querySelector("[data-form-coach-file]");
    const feedback = root.querySelector("[data-form-coach-feedback]");
    let videoUrl = "";

    inputs.forEach(input => input.addEventListener("change", () => {
        const file = input.files?.[0];
        inputs.filter(other => other !== input).forEach(other => { other.value = ""; });
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        videoUrl = "";

        if (!file || (!file.type.startsWith("video/") && !/\.(mov|mp4|m4v)$/i.test(file.name))) {
            if (preview) preview.hidden = true;
            if (feedback) feedback.hidden = true;
            return;
        }

        videoUrl = URL.createObjectURL(file);
        if (player) player.src = videoUrl;
        if (fileLabel) fileLabel.textContent = `${file.name} · ${formatFileSize(file.size)}`;
        if (preview) preview.hidden = false;
        if (feedback) feedback.hidden = true;
    }));

    root.querySelector("[data-form-coach-review]")?.addEventListener("click", () => {
        const exerciseId = root.querySelector("[data-form-coach-exercise]")?.value || "";
        const angle = root.querySelector("[data-form-coach-angle]")?.value || "side";
        if (!feedback) return;

        const guide = getFormReviewGuide(exerciseId, angle);
        feedback.innerHTML = `
            <span class="eyebrow">GUIDED REVIEW · BETA</span>
            <h4>${guide.title}</h4>
            <p>Replay the clip at normal speed and then frame by frame. Check these points:</p>
            <ol>${guide.points.map(point => `<li>${point}</li>`).join("")}</ol>
            <p class="form-coach-caution">These are review prompts, not findings generated from the video. If a repetition causes pain, stop and seek guidance from an appropriate professional.</p>
        `;
        feedback.hidden = false;
        feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
}

function getFormReviewGuide(exerciseId, angle) {
    const name = exerciseId.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
    const shared = [
        "Does each repetition use a controlled, repeatable path?",
        "Does the final repetition still resemble the first without a major technique change?",
        "Is the chosen range of motion comfortable and consistent?"
    ];
    const squat = /squat|leg-press|lunge|step-up/.test(exerciseId);
    const hinge = /deadlift|good-morning|hip-thrust|glute-bridge|pull-through/.test(exerciseId);
    const press = /bench|press|push-up|dip|skull-crusher|extension/.test(exerciseId);
    const pull = /row|pull-up|pulldown|curl|face-pull|fly/.test(exerciseId);

    let specific = shared;
    if (squat) specific = [
        angle === "side" ? "Does the foot remain planted while the knee and hip bend smoothly?" : "Do the knees track consistently with the feet rather than shifting suddenly?",
        "Is depth similar across repetitions without bouncing into an uncontrolled position?",
        "Does the torso remain controlled as effort increases?"
    ];
    else if (hinge) specific = [
        angle === "side" ? "Does the load remain close to the body through the repetition?" : "Do the hips stay level without a clear side-to-side shift?",
        "Does the trunk position remain controlled as the hips move?",
        "Does each repetition begin from a stable setup rather than being rushed?"
    ];
    else if (press) specific = [
        angle === "side" ? "Does the load follow a repeatable path on every repetition?" : "Do both sides rise at roughly the same rate?",
        "Are the wrists and elbows controlled rather than changing abruptly?",
        "Does the upper body stay supported and stable as effort increases?"
    ];
    else if (pull) specific = [
        angle === "side" ? "Does the arm or handle follow a repeatable path?" : "Do both sides move at roughly the same rate?",
        "Does the torso remain controlled rather than adding more momentum each repetition?",
        "Is the end position consistent without forcing extra range?"
    ];

    return { title: `${name || "Exercise"} · ${angle[0].toUpperCase() + angle.slice(1)} view`, points: specific };
}

function formatFileSize(bytes) {
    const megabytes = Number(bytes) / (1024 * 1024);
    return megabytes < 1 ? `${Math.max(1, Math.round(Number(bytes) / 1024))} KB` : `${megabytes.toFixed(1)} MB`;
}
