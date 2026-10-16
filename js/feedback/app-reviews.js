const WORKOUT_KEYS = ['forge_workout_sessions', 'level_up_circuit_sessions_v1'];
export const REVIEW_URL = 'https://apps.apple.com/app/id6810024008?action=write-review';
const DAY = 86400000;
let initialized = false;
let pendingSessionId = null;
const nativePlugin = () => window.Capacitor?.getPlatform?.() === 'ios' ? window.Capacitor?.Plugins?.LevelUpAppIcon : null;

export function reviewEligibility(sessions, now = Date.now()) {
    const unique = new Map();
    for (const session of sessions || []) {
        if (!session?.id || !session.completedAt || ['draft', 'in_progress'].includes(session.status)) continue;
        const time = Date.parse(session.completedAt);
        if (!Number.isFinite(time) || time > now) continue;
        if (!(session.exercises || []).some(exercise => (exercise.sets || []).some(set => set.completed !== false && !set.isWarmup && !set.warmup && set.type !== 'warmup' && (Number(set.reps) > 0 || Number(set.durationSeconds) > 0)))) continue;
        unique.set(session.id, time);
    }
    const firstWorkoutAt = unique.size ? Math.min(...unique.values()) : now;
    return { eligible: unique.size >= 5 && now - firstWorkoutAt >= 7 * DAY, completedWorkouts: unique.size, firstWorkoutAt };
}
function sessions() {
    return WORKOUT_KEYS.flatMap(key => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } });
}
export function appReviewCardMarkup() {
    if (!nativePlugin()) return '';
    return `<button class="more-menu-card" type="button" data-app-review><span class="more-menu-icon"><svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2Z"/></svg></span><span><strong>Rate Level Up</strong><small>Leave a review on the App Store.</small></span></button>`;
}
export async function openAppReviews() {
    const plugin = nativePlugin();
    if (plugin?.openReviews) return plugin.openReviews();
    window.location.href = REVIEW_URL;
}
export function initializeAppReviews() {
    if (initialized || !nativePlugin()) return;
    initialized = true;
    window.addEventListener('levelup:workout-completed', event => { pendingSessionId = event.detail?.sessionId || null; });
    window.addEventListener('levelup:workout-recap-dismissed', event => {
        const sessionId = pendingSessionId;
        pendingSessionId = null;
        if (!sessionId || event.detail?.sessionId !== sessionId || event.detail?.resumed) return;
        window.setTimeout(async () => {
            // Avoid interrupting a new/resumed workout, another sheet or background app.
            if (document.hidden || document.querySelector('[data-workout-complete-recap], [role="dialog"][aria-modal="true"]')) return;
            try {
                const active = JSON.parse(localStorage.getItem('level_up_active_workout') || 'null');
                if (active?.status === 'in_progress') return;
                const history = sessions();
                if (!history.some(item => item.id === sessionId)) return;
                const stats = reviewEligibility(history);
                if (stats.eligible) await nativePlugin()?.requestReview(stats);
            } catch (error) { console.warn('App review request unavailable', error); }
        }, 1000);
    });
    document.addEventListener('click', event => {
        const button = event.target.closest?.('[data-app-review]');
        if (!button) return;
        void openAppReviews().catch(() => { window.location.href = REVIEW_URL; });
    });
}
