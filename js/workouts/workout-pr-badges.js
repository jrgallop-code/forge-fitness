const SESSION_STORAGE_KEY = "forge_workout_sessions";
const EPSILON = 0.01;

export function initializeWorkoutPrBadges() {
    decoratePrBadges();
    wireRefreshTriggers();
}

function decoratePrBadges() {
    const sessions = getSessions();
    if (!sessions.length) return;

    const prCounts = calculatePrCounts(sessions);
    decorateWorkoutHistoryCards(prCounts);
    decorateTrainingHistoryCards(sessions, prCounts);
}

function wireRefreshTriggers() {
    [
        "load-training-demo",
        "remove-training-demo",
        "progress-range"
    ].forEach(id => {
        const element = document.getElementById(id);
        if (!element || element.dataset.prBadgeRefreshBound === "true") return;
        element.dataset.prBadgeRefreshBound = "true";
        const eventName = id === "progress-range" ? "change" : "click";
        element.addEventListener(eventName, () => requestAnimationFrame(decoratePrBadges));
    });

    document.querySelectorAll(".delete-history-workout").forEach(button => {
        if (button.dataset.prBadgeRefreshBound === "true") return;
        button.dataset.prBadgeRefreshBound = "true";
        button.addEventListener("click", () => requestAnimationFrame(decoratePrBadges));
    });
}

function decorateWorkoutHistoryCards(prCounts) {
    document.querySelectorAll(".history-workout-card").forEach(card => {
        const sessionId = card.dataset.sessionId || card.querySelector(".edit-history-workout")?.dataset.sessionId;
        const count = sessionId ? (prCounts.get(sessionId) || 0) : 0;
        const target = card.querySelector(".history-workout-metrics");
        updateBadge(target, count);
    });
}

function decorateTrainingHistoryCards(allSessions, prCounts) {
    const cards = [...document.querySelectorAll(".history-session-card")];
    if (!cards.length) return;

    const visibleSessions = getFilteredSessions(allSessions)
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
        .reverse();

    cards.forEach((card, index) => {
        const session = visibleSessions[index];
        const count = session?.id ? (prCounts.get(session.id) || 0) : 0;
        const target = card.firstElementChild || card;
        updateBadge(target, count);
    });
}

function updateBadge(target, count) {
    if (!target) return;
    target.querySelector(".workout-pr-badge")?.remove();
    if (count <= 0) return;

    const badge = document.createElement("span");
    badge.className = "workout-pr-badge";
    badge.setAttribute("aria-label", `${count} personal ${count === 1 ? "record" : "records"}`);
    badge.innerHTML = `${trophyIcon()}<span>PR · ${count}</span>`;
    target.appendChild(badge);
}

function trophyIcon() {
    return `
        <svg class="workout-pr-trophy" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 4h8v3.5c0 3.2-1.7 5.5-4 5.5s-4-2.3-4-5.5V4Z"/>
            <path d="M8 6H4.5v1.3c0 2.4 1.5 4.2 3.9 4.5M16 6h3.5v1.3c0 2.4-1.5 4.2-3.9 4.5"/>
            <path d="M12 13v4M8.5 20h7M10 17h4"/>
        </svg>
    `;
}

export function calculatePrCounts(sessions) {
    const counts = new Map();
    const records = new Map();

    const ordered = sessions
        .map((session, index) => ({ session, index }))
        .sort((a, b) => {
            const timeDifference = getSessionTime(a.session) - getSessionTime(b.session);
            return timeDifference || a.index - b.index;
        });

    ordered.forEach(({ session }) => {
        let count = 0;
        const scores = getSessionExerciseScores(session);

        scores.forEach((score, exerciseId) => {
            const previous = records.get(exerciseId) || {};
            let isPr = false;

            if (score.weighted != null) {
                if (previous.weighted != null && score.weighted > previous.weighted + EPSILON) {
                    isPr = true;
                }
                previous.weighted = previous.weighted == null
                    ? score.weighted
                    : Math.max(previous.weighted, score.weighted);
            } else if (score.reps != null) {
                if (previous.reps != null && score.reps > previous.reps) {
                    isPr = true;
                }
                previous.reps = previous.reps == null
                    ? score.reps
                    : Math.max(previous.reps, score.reps);
            }

            records.set(exerciseId, previous);
            if (isPr) count += 1;
        });

        if (session?.id) counts.set(session.id, count);
    });

    return counts;
}

function getSessionExerciseScores(session) {
    const scores = new Map();

    (session?.exercises || []).forEach(exercise => {
        if (exercise?.trackingType === "notes") return;

        const exerciseId = exercise?.exerciseId || exercise?.id;
        if (!exerciseId) return;

        const sets = (exercise.sets || []).filter(isValidRecordedSet);
        if (!sets.length) return;

        const weightedScores = sets
            .filter(set => Number(set.weight) > 0 && Number(set.reps) > 0)
            .map(set => estimateOneRepMax(set));

        const current = scores.get(exerciseId) || { weighted: null, reps: null };

        if (weightedScores.length) {
            const bestWeighted = Math.max(...weightedScores);
            current.weighted = current.weighted == null
                ? bestWeighted
                : Math.max(current.weighted, bestWeighted);
        } else {
            const repScores = sets
                .map(set => Number(set.reps))
                .filter(reps => reps > 0);
            if (repScores.length) {
                const bestReps = Math.max(...repScores);
                current.reps = current.reps == null
                    ? bestReps
                    : Math.max(current.reps, bestReps);
            }
        }

        scores.set(exerciseId, current);
    });

    return scores;
}

function isValidRecordedSet(set) {
    if (!set || set.completed === false) return false;
    const reps = Number(set.reps);
    const weight = Number(set.weight);
    return reps > 0 || weight > 0;
}

function estimateOneRepMax(set) {
    return Number(set.weight) * (1 + Number(set.reps) / 30);
}

function getSessionTime(session) {
    const completedAt = Date.parse(session?.completedAt || "");
    if (Number.isFinite(completedAt)) return completedAt;

    const date = Date.parse(`${session?.date || "1970-01-01"}T12:00:00`);
    return Number.isFinite(date) ? date : 0;
}

function getFilteredSessions(sessions) {
    const days = Number(document.getElementById("progress-range")?.value || 0);
    if (!days) return [...sessions];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return sessions.filter(session =>
        new Date(`${session.date}T23:59:59`) >= cutoff
    );
}

function getSessions() {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [];

    try {
        const sessions = JSON.parse(stored);
        return Array.isArray(sessions) ? sessions : [];
    } catch {
        return [];
    }
}
