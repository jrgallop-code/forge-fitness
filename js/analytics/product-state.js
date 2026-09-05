const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const APPEARANCE_KEY = "level_up_appearance_settings";
const WORKOUT_LOG_KEY = "forge_workout_sessions";
const SNAPSHOT_STATE_KEY = "level_up_product_state_snapshot_v1";
const PROGRAM_RECONCILE_KEY = "level_up_program_analytics_reconcile_v1";
const SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const RECENT_PROGRAM_DAYS = 31;
const MAX_PROGRAM_SESSIONS = 50;

let initialized = false;
let sendTimer = 0;

initializeProductStateTracking();

export function initializeProductStateTracking() {
    if (initialized) return;
    initialized = true;

    window.addEventListener("levelup:cloud-session-started", () => {
        queueSnapshot(250, true);
        void reconcileRecentProgramUsage(true);
    });
    window.addEventListener("levelup:appearance-change", () => queueSnapshot(250, true));
    window.addEventListener("levelup:workout-completed", event => {
        window.setTimeout(() => {
            void sendCompletedProgram(event.detail?.sessionId);
            queueSnapshot(100, true);
        }, 250);
    });
    window.addEventListener("online", () => {
        queueSnapshot(300, false);
        void reconcileRecentProgramUsage(false);
    });
    window.addEventListener("pageshow", () => queueSnapshot(500, false));
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) queueSnapshot(500, false);
    });

    window.setTimeout(() => {
        queueSnapshot(0, false);
        void reconcileRecentProgramUsage(false);
    }, 1200);
}

function queueSnapshot(delay = 0, force = false) {
    window.clearTimeout(sendTimer);
    sendTimer = window.setTimeout(() => void sendProductStateSnapshot(force), Math.max(0, delay));
}

export async function sendProductStateSnapshot(force = false) {
    const token = sessionToken();
    if (!token || !navigator.onLine) return false;

    const appearance = appearanceState();
    const program = latestProgramState();
    const state = {
        appearanceTheme: appearance.selected,
        effectiveTheme: appearance.effective,
        programId: program?.id || null,
        programName: program?.name || null,
        programSource: program?.source || null
    };

    const fingerprint = JSON.stringify([token.slice(-12), state]);
    const previous = safeRead(SNAPSHOT_STATE_KEY);
    const age = Date.now() - Date.parse(previous?.sentAt || 0);
    if (!force && previous?.fingerprint === fingerprint && Number.isFinite(age) && age < SNAPSHOT_MAX_AGE_MS) return true;

    try {
        const response = await fetch(`${API_URL}/v1/activity`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({ productState: state })
        });
        if (!response.ok) return false;
        safeSet(SNAPSHOT_STATE_KEY, { fingerprint, sentAt: new Date().toISOString() });
        return true;
    } catch {
        return false;
    }
}

export async function reconcileRecentProgramUsage(force = false) {
    const token = sessionToken();
    if (!token || !navigator.onLine) return false;
    const sessions = recentProgramSessions();
    if (!sessions.length) return true;

    const fingerprint = JSON.stringify([
        token.slice(-12),
        sessions.map(session => [session.id, session.planId, session.planName, workoutOccurredAt(session)])
    ]);
    if (!force && localStorage.getItem(PROGRAM_RECONCILE_KEY) === fingerprint) return true;

    for (const session of sessions) {
        await sendProgramSession(session, token);
    }
    localStorage.setItem(PROGRAM_RECONCILE_KEY, fingerprint);
    return true;
}

async function sendCompletedProgram(sessionId) {
    const token = sessionToken();
    if (!token || !navigator.onLine || !sessionId) return false;
    const sessions = safeRead(WORKOUT_LOG_KEY);
    const session = Array.isArray(sessions) ? sessions.find(item => String(item?.id) === String(sessionId)) : null;
    if (!session) return false;
    return sendProgramSession(session, token);
}

async function sendProgramSession(session, token) {
    const programName = cleanText(session?.planName, 160);
    const programId = cleanText(session?.planId, 128);
    if (!session?.id || (!programName && !programId) || session?.workoutSource === "one_off") return false;

    try {
        const response = await fetch(`${API_URL}/v1/events`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify({
                eventName: "workout_completed",
                eventKey: String(session.id),
                occurredAt: workoutOccurredAt(session) || new Date().toISOString(),
                metadata: {
                    planId: programId || null,
                    planName: programName || null,
                    workoutSource: cleanText(session.workoutSource, 64) || null,
                    workingSets: countWorkingSets(session),
                    durationMinutes: Number(session.durationMinutes) || 0,
                    reconciledProgramName: true
                }
            })
        });
        return response.ok;
    } catch {
        return false;
    }
}

function appearanceState() {
    let selected = "level-up";
    try {
        const stored = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "null");
        selected = String(stored?.theme || stored || "level-up");
    } catch {}
    const valid = new Set(["system", "level-up", "arctic", "pure", "ocean", "midnight", "slate", "pulse"]);
    if (!valid.has(selected)) selected = "level-up";
    const effective = valid.has(document.documentElement.dataset.theme)
        ? document.documentElement.dataset.theme
        : selected === "system"
            ? (new Date().getHours() >= 7 && new Date().getHours() < 19 ? "arctic" : "level-up")
            : selected;
    return { selected, effective };
}

function latestProgramState() {
    const sessions = recentProgramSessions(365);
    const session = sessions[0];
    if (!session) return null;
    return {
        id: cleanText(session.planId, 128),
        name: cleanText(session.planName, 160),
        source: cleanText(session.workoutSource, 64)
    };
}

function recentProgramSessions(days = RECENT_PROGRAM_DAYS) {
    const sessions = safeRead(WORKOUT_LOG_KEY);
    if (!Array.isArray(sessions)) return [];
    const cutoff = Date.now() - days * 86400000;
    return sessions
        .filter(session => {
            if (!session?.id || session?.workoutSource === "one_off") return false;
            if (!session?.planId && !session?.planName) return false;
            const occurredAt = workoutOccurredAt(session);
            return occurredAt && Date.parse(occurredAt) >= cutoff;
        })
        .sort((a, b) => workoutOccurredAt(b).localeCompare(workoutOccurredAt(a)))
        .slice(0, MAX_PROGRAM_SESSIONS);
}

function workoutOccurredAt(session) {
    if (typeof session?.completedAt === "string" && Number.isFinite(Date.parse(session.completedAt))) {
        return new Date(session.completedAt).toISOString();
    }
    if (typeof session?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
        return `${session.date}T12:00:00.000Z`;
    }
    return "";
}

function countWorkingSets(session) {
    return (session?.exercises || []).reduce((total, exercise) =>
        total + (exercise?.sets || []).filter(set => Number(set?.reps) > 0).length, 0);
}

function sessionToken() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session?.token) return "";
        if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) return "";
        return session.token;
    } catch {
        return "";
    }
}

function authHeaders(token) {
    return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
}

function safeRead(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
}

function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch {}
}

function cleanText(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}
