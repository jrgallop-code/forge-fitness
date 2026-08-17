import { getTrainingReview } from "../core/training-coach.js?v=training-coach-1";

const SESSION_KEY = "forge_workout_sessions";
const PLAN_KEY = "forge_workout_plans";
const SCHEDULE_KEY = "level_up_workout_schedule_v1";
let queued = false;

function formatSets(value) {
    if (!Number.isFinite(Number(value))) return "—";
    const rounded = Math.round(Number(value) * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatWindow(startDate, endDate) {
    if (!startDate || !endDate) return "Last 7 days";
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    const startMonth = start.toLocaleDateString(undefined, { month: "short" });
    const endMonth = end.toLocaleDateString(undefined, { month: "short" });
    return startMonth === endMonth
        ? `${startMonth} ${start.getDate()}–${end.getDate()}`
        : `${startMonth} ${start.getDate()}–${endMonth} ${end.getDate()}`;
}

function performanceText(performance) {
    if (!performance?.comparable) return "Building";
    return `↑${performance.improved} =${performance.maintained} ↓${performance.declined}`;
}

function recoveryText(recovery) {
    if (!Number.isFinite(recovery?.average)) return "—";
    return `${Math.round(recovery.average)}% avg`;
}

function renderMuscleSignals(signals) {
    if (!signals?.length) return "";
    return `
        <div class="training-review-signals">
            <span class="training-review-mini-label">Biggest plan differences</span>
            ${signals.map(item => `
                <div class="training-review-signal is-${escapeHtml(item.status)}">
                    <strong>${escapeHtml(item.muscle)}</strong>
                    <span>${formatSets(item.actual)} / ${formatSets(item.planned)} sets</span>
                    <small>${escapeHtml(item.label)}</small>
                </div>
            `).join("")}
        </div>
    `;
}

function renderCard(review) {
    const hasTarget = Number.isFinite(review.workouts.target) && review.workouts.target > 0;
    const workoutValue = hasTarget
        ? `${review.workouts.completed} / ${review.workouts.target}`
        : String(review.workouts.all);
    const volumeValue = Number.isFinite(review.volume.planned) && review.volume.planned > 0
        ? `${formatSets(review.volume.actual)} / ${formatSets(review.volume.planned)}`
        : formatSets(review.volume.actual);
    const programLine = review.programName
        ? `${escapeHtml(review.programName)} · ${escapeHtml(formatWindow(review.window.startDate, review.window.endDate))}`
        : formatWindow(review.window.startDate, review.window.endDate);

    return `
        <section class="section-card training-review-card is-${escapeHtml(review.tone)}" data-training-review-card>
            <div class="training-review-head">
                <div>
                    <span class="eyebrow">TRAINING REVIEW</span>
                    <h2>${escapeHtml(review.title)}</h2>
                    <p>${programLine}</p>
                </div>
                <span class="training-review-label">${escapeHtml(review.label)}</span>
            </div>

            <div class="training-review-metrics">
                <div><span>Workouts</span><strong>${escapeHtml(workoutValue)}</strong><small>${hasTarget ? "scheduled" : "last 7 days"}</small></div>
                <div><span>Muscle Volume</span><strong>${escapeHtml(volumeValue)}</strong><small>${review.volume.planned ? "actual / planned" : "set credits"}</small></div>
                <div><span>Performance</span><strong>${escapeHtml(performanceText(review.performance))}</strong><small>${review.performance.comparable || 0} comparisons</small></div>
                <div><span>Recovery</span><strong>${escapeHtml(recoveryText(review.recovery))}</strong><small>${review.recovery.tracked || 0} trained groups</small></div>
            </div>

            <div class="training-review-recommendation">
                <strong>Level Up recommendation</strong>
                <p>${escapeHtml(review.message)}</p>
            </div>

            ${renderMuscleSignals(review.muscleSignals)}

            <button class="training-review-action" type="button" data-training-review-open-muscles>
                View muscle volume & recovery <span aria-hidden="true">›</span>
            </button>
        </section>
    `;
}

function ensureCard() {
    const content = document.getElementById("content");
    const weekly = content?.querySelector(".dashboard-command-weekly");
    if (!content?.classList.contains("dashboard-command-center") || !weekly) return;

    const review = getTrainingReview();
    const signature = JSON.stringify({
        code: review.code,
        label: review.label,
        workouts: review.workouts,
        volume: review.volume,
        performance: {
            comparable: review.performance.comparable,
            improved: review.performance.improved,
            maintained: review.performance.maintained,
            declined: review.performance.declined
        },
        recovery: review.recovery,
        signals: review.muscleSignals
    });

    let card = content.querySelector("[data-training-review-card]");
    if (!card) {
        weekly.insertAdjacentHTML("afterend", renderCard(review));
        card = content.querySelector("[data-training-review-card]");
    }
    else if (card.dataset.signature !== signature) {
        card.outerHTML = renderCard(review);
        card = content.querySelector("[data-training-review-card]");
    }

    if (card) {
        card.dataset.signature = signature;
        if (card.previousElementSibling !== weekly) weekly.insertAdjacentElement("afterend", card);
    }
}

function queueEnsureCard() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        ensureCard();
    });
}

function openMuscles() {
    document.querySelector('.nav-btn[data-page="progress"]')?.click();
    let attempts = 0;
    const open = () => {
        const lifting = document.getElementById("lifting-tab");
        if (lifting && !lifting.classList.contains("active")) lifting.click();
        const muscles = document.querySelector('.training-progress-tab[data-view="training"]');
        if (muscles) {
            muscles.click();
            muscles.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        attempts += 1;
        if (attempts < 16) requestAnimationFrame(open);
    };
    requestAnimationFrame(open);
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-training-review-open-muscles]")) openMuscles();
});

const content = document.getElementById("content");
if (content) new MutationObserver(queueEnsureCard).observe(content, { childList: true, subtree: true });

window.addEventListener("focus", queueEnsureCard);
window.addEventListener("storage", event => {
    if ([SESSION_KEY, PLAN_KEY, SCHEDULE_KEY].includes(event.key)) queueEnsureCard();
});

queueEnsureCard();

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
