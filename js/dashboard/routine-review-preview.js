const MOCK_EXERCISES = [
    { name: "Barbell Bench Press", earlier: [176, 178, 177], recent: [176, 175, 176] },
    { name: "Lat Pulldown", earlier: [154, 155, 156], recent: [155, 156, 155] },
    { name: "Back Squat", earlier: [286, 290, 288], recent: [279, 277, 278] },
    { name: "Seated Cable Row", earlier: [143, 145, 144], recent: [143, 142, 143] },
    { name: "Dumbbell Shoulder Press", earlier: [66, 67, 66], recent: [68, 69, 69] },
    { name: "Cable Curl", earlier: [48, 49, 49], recent: [47, 46, 47] }
];

let previewHidden = false;

export function renderRoutineReviewPreview() {
    if (previewHidden) return "";

    const analysis = analyzeRoutine(MOCK_EXERCISES);
    return `
        <section class="section-card routine-review-card" data-routine-review-preview>
            <div class="routine-review-head">
                <div>
                    <span class="eyebrow">PREVIEW · MOCK DATA</span>
                    <h2>Routine Review</h2>
                </div>
                <span class="routine-review-badge">Review</span>
            </div>
            <p class="routine-review-lead">
                Performance has remained stable or declined across
                <strong>${analysis.reviewCount} of ${analysis.total} tracked exercises</strong>
                over the last six comparable sessions.
            </p>
            <div class="routine-review-summary">
                <span class="is-progressing"><strong>${analysis.progressing}</strong> progressing</span>
                <span class="is-stable"><strong>${analysis.stable}</strong> stable</span>
                <span class="is-declining"><strong>${analysis.declining}</strong> declining</span>
            </div>
            <p class="routine-review-context">
                Normal variation, recovery and training consistency can also affect this trend.
                Review those first; if they are on track, consider changing one or two stalled exercises.
            </p>
            <div class="routine-review-actions">
                <button class="secondary-btn" type="button" data-routine-trend-toggle aria-expanded="false">View mock trend</button>
                <button class="text-btn" type="button" data-routine-preview-hide>Hide preview</button>
            </div>
            <div class="routine-review-details" data-routine-trend-panel hidden>
                ${analysis.exercises.map(renderExercise).join("")}
                <p>Calculated from the median estimated strength of the latest three sessions versus the preceding three. Mock data is never saved.</p>
            </div>
        </section>
    `;
}

export function initializeRoutineReviewPreview() {
    const card = document.querySelector("[data-routine-review-preview]");
    if (!card) return;

    card.querySelector("[data-routine-trend-toggle]")?.addEventListener("click", event => {
        const panel = card.querySelector("[data-routine-trend-panel]");
        if (!panel) return;
        const opening = panel.hidden;
        panel.hidden = !opening;
        event.currentTarget.setAttribute("aria-expanded", String(opening));
        event.currentTarget.textContent = opening ? "Hide mock trend" : "View mock trend";
    });

    card.querySelector("[data-routine-preview-hide]")?.addEventListener("click", () => {
        previewHidden = true;
        card.remove();
    });
}

function analyzeRoutine(exercises) {
    const analyzed = exercises.map(exercise => {
        const earlier = median(exercise.earlier);
        const recent = median(exercise.recent);
        const change = earlier > 0 ? ((recent - earlier) / earlier) * 100 : 0;
        const status = change > 2.5
            ? "progressing"
            : change < -2.5
                ? "declining"
                : "stable";
        return { ...exercise, earlier, recent, change, status };
    });

    const count = status => analyzed.filter(exercise => exercise.status === status).length;
    const progressing = count("progressing");
    const stable = count("stable");
    const declining = count("declining");

    return {
        exercises: analyzed,
        progressing,
        stable,
        declining,
        reviewCount: stable + declining,
        total: analyzed.length
    };
}

function median(values) {
    const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function renderExercise(exercise) {
    const label = exercise.status[0].toUpperCase() + exercise.status.slice(1);
    const sign = exercise.change > 0 ? "+" : "";
    return `
        <div class="routine-review-row">
            <div><strong>${escapeHtml(exercise.name)}</strong><small>${exercise.earlier.toFixed(1)} → ${exercise.recent.toFixed(1)} lb estimated strength</small></div>
            <span class="is-${exercise.status}">${label} · ${sign}${exercise.change.toFixed(1)}%</span>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
