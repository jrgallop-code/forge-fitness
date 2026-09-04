import { getNutritionPhaseHistory } from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { getWeeklyCheckInStatus } from "./weekly-check-in-status.js?v=weekly-checkin-status-1";

const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const FIRST_CHECK_DAY = 14;
const CADENCE_DAYS = 7;

function localDate(date = new Date()) {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 10);
}

function shiftDate(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return "";
    date.setDate(date.getDate() + days);
    return localDate(date);
}

function phaseKey(phase) {
    return String(phase?.id || `${phase?.goalId || "phase"}|${phase?.startDate || ""}`);
}

function readHandledState() {
    try {
        const value = JSON.parse(localStorage.getItem(CHECK_STATE_KEY) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

function monthBounds(date = new Date()) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
    return { start: localDate(first), end: localDate(last) };
}

function stateLabel(state) {
    if (state === "handled") return "Check-in completed";
    if (state === "ready") return "Calorie review ready";
    if (state === "waiting") return "Check-in due · more data needed";
    if (state === "past") return "Scheduled calorie check-in";
    return "Upcoming calorie check-in";
}

function eventFor({ date, checkDay, phase, state }) {
    return {
        date,
        checkDay,
        phaseId: phase?.id || null,
        goalId: phase?.goalId || null,
        state,
        label: stateLabel(state)
    };
}

export function getMonthlyCheckInEvents(viewDate = new Date()) {
    const { start, end } = monthBounds(viewDate);
    const today = localDate();
    const phases = getNutritionPhaseHistory();
    const handledState = readHandledState();
    const active = phases.find(phase => !phase?.endDate) || null;
    const status = active ? getWeeklyCheckInStatus() : null;
    const events = new Map();

    phases.forEach(phase => {
        if (!phase?.startDate) return;
        const phaseEnd = phase.endDate || end;
        const lastDate = phaseEnd < end ? phaseEnd : end;
        let checkDay = FIRST_CHECK_DAY;
        let date = shiftDate(phase.startDate, FIRST_CHECK_DAY - 1);
        const handled = handledState[phaseKey(phase)];
        const lastHandledCheckDay = Number(handled?.lastHandledCheckDay);

        while (date && date <= lastDate) {
            if (date >= start) {
                const handledCheck = Number.isFinite(lastHandledCheckDay) && checkDay <= lastHandledCheckDay;
                const state = handledCheck ? "handled" : date < today ? "past" : "upcoming";
                events.set(date, eventFor({ date, checkDay, phase, state }));
            }
            checkDay += CADENCE_DAYS;
            date = shiftDate(date, CADENCE_DAYS);
        }
    });

    if (active && status?.mode !== "track" && status?.reviewDate && status.reviewDate >= start && status.reviewDate <= end) {
        const currentState = status.state === "ready"
            ? "ready"
            : status.state === "waiting"
                ? "waiting"
                : "upcoming";
        const existing = events.get(status.reviewDate);
        events.set(status.reviewDate, eventFor({
            date: status.reviewDate,
            checkDay: existing?.checkDay ?? null,
            phase: active,
            state: currentState
        }));

        let future = shiftDate(status.reviewDate, CADENCE_DAYS);
        while (future && future <= end) {
            if (future >= start && !events.has(future)) {
                events.set(future, eventFor({ date: future, checkDay: null, phase: active, state: "upcoming" }));
            }
            future = shiftDate(future, CADENCE_DAYS);
        }
    }

    return [...events.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getCheckInEventMap(viewDate = new Date()) {
    return new Map(getMonthlyCheckInEvents(viewDate).map(event => [event.date, event]));
}

export const CHECK_IN_APPLE_SVG = `<svg class="level-up-checkin-apple" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.1 7.2c-1.4-1.4-3.5-2-5.3-1.1-2.4 1.2-3.3 4.3-2.2 7.5 1.2 3.6 3.5 6.4 5.6 6.4 1.1 0 1.8-.7 3-.7s1.9.7 3 .7c1.8 0 3.5-2 4.6-4.5-1.4-.4-2.5-1.6-2.5-3.2 0-1.4.9-2.6 2.1-3.2-1.1-2.1-3.6-3.2-5.9-2.4-1 .3-1.7.8-2.4 1.5Z"/><path d="M12.3 6c.2-2 1.5-3.4 3.6-3.8-.2 1.9-1.4 3.2-3.6 3.8Z"/></svg>`;
