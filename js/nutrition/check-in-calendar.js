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

function handledDate(record) {
    const date = new Date(record?.handledAt);
    return Number.isFinite(date.getTime()) ? localDate(date) : null;
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

function eventFor({ date, checkDay = null, phase, state }) {
    return {
        date,
        checkDay,
        phaseId: phase?.id || null,
        goalId: phase?.goalId || null,
        state,
        label: stateLabel(state)
    };
}

function canonicalPhaseEvents(phase, bounds, handledState, today) {
    const events = [];
    if (!phase?.startDate) return events;
    const phaseEnd = phase.endDate || bounds.end;
    const lastDate = phaseEnd < bounds.end ? phaseEnd : bounds.end;
    const handled = handledState[phaseKey(phase)];
    const lastHandledCheckDay = Number(handled?.lastHandledCheckDay);
    let checkDay = FIRST_CHECK_DAY;
    let date = shiftDate(phase.startDate, FIRST_CHECK_DAY - 1);

    while (date && date <= lastDate) {
        if (date >= bounds.start) {
            const wasHandled = Number.isFinite(lastHandledCheckDay) && checkDay <= lastHandledCheckDay;
            events.push(eventFor({
                date,
                checkDay,
                phase,
                state: wasHandled ? "handled" : date < today ? "past" : "upcoming"
            }));
        }
        checkDay += CADENCE_DAYS;
        date = shiftDate(date, CADENCE_DAYS);
    }
    return events;
}

function activePhaseEvents(phase, status, bounds, handledState, today) {
    if (!phase?.startDate || status?.mode === "track") return [];

    const firstReviewDate = shiftDate(phase.startDate, FIRST_CHECK_DAY - 1);
    let anchor = status?.reviewDate || firstReviewDate;
    if (!anchor) return [];

    // The live check-in status is authoritative. Once a review is delayed or
    // accepted on a different day, anchor the whole visible monthly sequence to
    // that date so the calendar can never show two competing weekly cadences.
    while (anchor < firstReviewDate) anchor = shiftDate(anchor, CADENCE_DAYS);

    let date = anchor;
    while (shiftDate(date, -CADENCE_DAYS) >= firstReviewDate) {
        const previous = shiftDate(date, -CADENCE_DAYS);
        if (previous < bounds.start) break;
        date = previous;
    }
    while (date < bounds.start) date = shiftDate(date, CADENCE_DAYS);

    const handled = handledState[phaseKey(phase)];
    const latestHandledDate = handledDate(handled);
    const events = [];
    const activeEnd = phase.endDate || bounds.end;
    const lastDate = activeEnd < bounds.end ? activeEnd : bounds.end;

    while (date && date <= lastDate) {
        let state;
        if (date === status?.reviewDate) {
            state = status.state === "ready"
                ? "ready"
                : status.state === "waiting"
                    ? "waiting"
                    : "upcoming";
        } else if (date < today) {
            state = latestHandledDate && date <= latestHandledDate ? "handled" : "past";
        } else {
            state = "upcoming";
        }
        events.push(eventFor({ date, phase, state }));
        date = shiftDate(date, CADENCE_DAYS);
    }

    return events;
}

export function getMonthlyCheckInEvents(viewDate = new Date()) {
    const bounds = monthBounds(viewDate);
    const today = localDate();
    const phases = getNutritionPhaseHistory();
    const handledState = readHandledState();
    const active = phases.find(phase => !phase?.endDate) || null;
    const status = active ? getWeeklyCheckInStatus() : null;
    const events = [];

    phases.filter(phase => phase?.endDate).forEach(phase => {
        events.push(...canonicalPhaseEvents(phase, bounds, handledState, today));
    });

    if (active) {
        events.push(...activePhaseEvents(active, status, bounds, handledState, today));
    }

    // One date can only represent one check-in. This also protects against a
    // phase boundary landing on the same calendar day as another phase event.
    const unique = new Map();
    const priority = { ready: 5, waiting: 4, handled: 3, upcoming: 2, past: 1 };
    events.forEach(event => {
        const current = unique.get(event.date);
        if (!current || (priority[event.state] || 0) > (priority[current.state] || 0)) unique.set(event.date, event);
    });

    return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getCheckInEventMap(viewDate = new Date()) {
    return new Map(getMonthlyCheckInEvents(viewDate).map(event => [event.date, event]));
}

export const CHECK_IN_APPLE_SVG = `<svg class="level-up-checkin-apple" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.1 7.2c-1.4-1.4-3.5-2-5.3-1.1-2.4 1.2-3.3 4.3-2.2 7.5 1.2 3.6 3.5 6.4 5.6 6.4 1.1 0 1.8-.7 3-.7s1.9.7 3 .7c1.8 0 3.5-2 4.6-4.5-1.4-.4-2.5-1.6-2.5-3.2 0-1.4.9-2.6 2.1-3.2-1.1-2.1-3.6-3.2-5.9-2.4-1 .3-1.7.8-2.4 1.5Z"/><path d="M12.3 6c.2-2 1.5-3.4 3.6-3.8-.2 1.9-1.4 3.2-3.6 3.8Z"/></svg>`;
