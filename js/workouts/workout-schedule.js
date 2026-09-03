import { openWorkoutLogger } from "../workouts/workout-session.js?v=workout-source-stats-1";
import { getTrainingPreferences } from "../core/training-preferences.js?v=onboarding-training-days-1";
import { createOnboardingSchedule } from "./onboarding-schedule.js?v=onboarding-training-days-1";

const PLAN_KEY = "forge_workout_plans";
const SESSION_KEY = "forge_workout_sessions";
const SCHEDULE_KEY = "level_up_workout_schedule_v1";
const START_FLAG = "level_up_start_scheduled_workout";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function renderDashboardSchedule() {
    const context = getTodayContext();
    if (!context.schedule || !context.plan) return "";
    return `<section class="section-card schedule-dashboard-card">
        <div class="schedule-heading"><div><span class="eyebrow">TODAY'S WORKOUT</span><h2>${escapeHtml(context.title)}</h2></div><span class="schedule-day-label">${context.statusLabel}</span></div>
        <p>${escapeHtml(context.subtitle)}</p>
        ${renderScheduleActions(context, "dashboard")}
    </section>`;
}

export function initializeWorkoutSchedule(scope = document) {
    bindDashboardActions(scope);
    const page = scope.querySelector?.(".workout-page");
    if (!page) return;
    page.querySelector(".workout-schedule-shell")?.remove();
    const firstSection = page.querySelector("[data-smart-build-launcher], .workout-home-section");
    if (!firstSection) return;
    firstSection.insertAdjacentHTML("beforebegin", renderWorkoutSchedulePanel());
    bindWorkoutScheduleControls(page);
    const pending = sessionStorage.getItem(START_FLAG);
    if (pending) {
        sessionStorage.removeItem(START_FLAG);
        startScheduledWorkout(pending);
    }
}

function renderWorkoutSchedulePanel() {
    const plans = getPlans();
    const schedule = ensureOnboardingSchedule(plans, getSchedule());
    if (!plans.length) {
        return `<section class="workout-home-section workout-schedule-shell"><div class="schedule-empty"><span class="eyebrow">WORKOUT SCHEDULE</span><h3>Create a workout plan first</h3><p>Your saved plan days will become available for weekly scheduling.</p></div></section>`;
    }
    const context = getTodayContext();
    const editor = `<div class="schedule-editor" data-schedule-editor hidden>
        <label>Workout plan<select data-schedule-plan>${plans.map(plan => `<option value="${escapeHtml(plan.id)}" ${plan.id === schedule?.planId ? "selected" : ""}>${escapeHtml(plan.name || "Workout Plan")}</option>`).join("")}</select></label>
        <div class="schedule-day-editor" data-schedule-days></div>
        <div class="schedule-editor-actions"><button class="primary-btn" type="button" data-schedule-save>Save Schedule</button><button class="secondary-btn" type="button" data-schedule-cancel>Cancel</button></div>
    </div>`;
    if (!schedule) {
        return `<section class="workout-home-section workout-schedule-shell schedule-setup-shell">
            <button class="primary-btn schedule-set-btn" type="button" data-schedule-edit>Set Schedule</button>
            ${editor}
        </section>`;
    }
    return `<section class="workout-home-section workout-schedule-shell schedule-banner">
        <div class="schedule-banner-top"><div><span class="eyebrow">WORKOUT SCHEDULE</span><strong>${escapeHtml(context.title)}</strong></div><button class="schedule-edit-link" type="button" data-schedule-edit>Edit</button></div>
        ${renderWeekStrip(schedule)}
        <div class="schedule-banner-actions"><span>${escapeHtml(context.subtitle)}</span>${renderScheduleActions(context, "workout")}</div>
        ${editor}
    </section>`;
}
function renderWeekStrip(schedule) {
    const week = getWeekDates();
    const plan = getPlans().find(item => item.id === schedule.planId);
    const sessions = getSessions();
    return `<div class="schedule-week-strip">${week.map(date => {
        const item = getScheduledItem(date, schedule, plan);
        const completed = sessions.some(session => session.planId === plan?.id && Number(session.trainingDayIndex) === Number(item.dayIndex) && session.date === date);
        const today = date === localDate();
        return `<div class="schedule-day ${today ? "is-today" : ""} ${completed ? "is-complete" : ""}"><span>${DAYS[new Date(date + "T12:00:00").getDay()]}</span><strong>${new Date(date + "T12:00:00").getDate()}</strong><small>${completed ? "✓ Done" : escapeHtml(shortDayName(item.title))}</small></div>`;
    }).join("")}</div>`;
}

function renderScheduleActions(context, location) {
    if (context.status === "complete") {
        return `<div class="schedule-actions"><button class="secondary-btn" type="button" data-schedule-open>View Schedule</button></div>`;
    }
    if (!context.dayIndex && context.dayIndex !== 0) {
        return `<div class="schedule-actions"><button class="secondary-btn" type="button" data-schedule-open>View Schedule</button></div>`;
    }
    if (context.status === "skipped") {
        return `<div class="schedule-actions"><button class="secondary-btn" type="button" data-schedule-restore>Restore</button><button class="secondary-btn" type="button" data-schedule-open>Schedule</button></div>`;
    }
    return `<div class="schedule-actions"><button class="primary-btn" type="button" data-schedule-start data-plan-id="${escapeHtml(context.plan.id)}">Start Workout</button>${location === "workout" ? '<button class="secondary-btn" type="button" data-schedule-move>Move to Tomorrow</button><button class="schedule-skip-btn" type="button" data-schedule-skip>Skip</button>' : '<button class="secondary-btn" type="button" data-schedule-open>Schedule</button>'}</div>`;
}

function bindDashboardActions(root) {
    root.querySelectorAll?.("[data-schedule-open]").forEach(button => button.addEventListener("click", openWorkoutTab));
    root.querySelectorAll?.("[data-schedule-start]").forEach(button => button.addEventListener("click", () => {
        sessionStorage.setItem(START_FLAG, button.dataset.planId || "");
        openWorkoutTab();
    }));
}

function bindWorkoutScheduleControls(page) {
    const shell = page.querySelector(".workout-schedule-shell");
    const editor = shell?.querySelector("[data-schedule-editor]");
    const planSelect = shell?.querySelector("[data-schedule-plan]");
    const renderEditorDays = () => {
        const plan = getPlans().find(item => item.id === planSelect?.value);
        const schedule = getSchedule();
        const assigned = schedule?.planId === plan?.id ? schedule.weekly : {};
        const options = (plan?.days || []).map((day, index) => `<option value="${index}">${escapeHtml(day.name || `Day ${index + 1}`)}</option>`).join("");
        const container = shell?.querySelector("[data-schedule-days]");
        if (container) container.innerHTML = DAYS.map((label, index) => `<label><span>${label}</span><select data-weekday="${index}"><option value="">Rest</option>${options}</select></label>`).join("");
        Object.entries(assigned || {}).forEach(([day, value]) => {
            const select = container?.querySelector(`[data-weekday="${day}"]`);
            if (select && value !== null && value !== undefined) select.value = String(value);
        });
    };
    renderEditorDays();
    planSelect?.addEventListener("change", renderEditorDays);
    shell?.querySelector("[data-schedule-edit]")?.addEventListener("click", () => { editor.hidden = false; renderEditorDays(); });
    shell?.querySelector("[data-schedule-cancel]")?.addEventListener("click", () => { editor.hidden = true; });
    shell?.querySelector("[data-schedule-save]")?.addEventListener("click", () => {
        const weekly = {};
        shell.querySelectorAll("[data-weekday]").forEach(select => { weekly[select.dataset.weekday] = select.value === "" ? null : Number(select.value); });
        saveSchedule({ planId: planSelect.value, weekly, exceptions: {}, source: "manual", updatedAt: new Date().toISOString() });
        initializeWorkoutSchedule(document);
    });
    shell?.querySelector("[data-schedule-start]")?.addEventListener("click", event => startScheduledWorkout(event.currentTarget.dataset.planId));
    shell?.querySelector("[data-schedule-skip]")?.addEventListener("click", () => updateTodayException({ status: "skipped", dayIndex: null }));
    shell?.querySelector("[data-schedule-restore]")?.addEventListener("click", () => updateTodayException(null));
    shell?.querySelector("[data-schedule-move]")?.addEventListener("click", () => moveTodayToTomorrow());
    shell?.querySelector("[data-schedule-open]")?.addEventListener("click", () => { editor.hidden = false; });
}

function moveTodayToTomorrow() {
    const context = getTodayContext();
    if (context.dayIndex === null || context.dayIndex === undefined) return;
    const schedule = getSchedule();
    schedule.exceptions ||= {};
    schedule.exceptions[localDate()] = { status: "moved", dayIndex: null };
    schedule.exceptions[addDays(localDate(), 1)] = { status: "moved", dayIndex: context.dayIndex };
    saveSchedule(schedule);
    initializeWorkoutSchedule(document);
}

function updateTodayException(value) {
    const schedule = getSchedule();
    if (!schedule) return;
    schedule.exceptions ||= {};
    if (value) schedule.exceptions[localDate()] = value;
    else delete schedule.exceptions[localDate()];
    saveSchedule(schedule);
    initializeWorkoutSchedule(document);
}

function startScheduledWorkout(planId) {
    const context = getTodayContext();
    const plan = getPlans().find(item => item.id === planId);
    if (!plan || context.dayIndex === null || context.dayIndex === undefined) return;
    openWorkoutLogger(plan);
    const select = document.querySelector("#session-day-select");
    if (select) select.value = String(context.dayIndex);
}

function getTodayContext() {
    const plans = getPlans();
    const schedule = ensureOnboardingSchedule(plans, getSchedule());
    const plan = plans.find(item => item.id === schedule?.planId);
    if (!schedule || !plan) return { schedule: null, plan: null, title: "No schedule", subtitle: "Set up a weekly schedule", statusLabel: "Unscheduled", dayIndex: null };
    const item = getScheduledItem(localDate(), schedule, plan);
    const completed = getSessions().some(session => session.planId === plan.id && Number(session.trainingDayIndex) === Number(item.dayIndex) && session.date === localDate());
    if (completed && item.dayIndex !== null) return { ...item, schedule, plan, title: item.title, subtitle: "Completed today", statusLabel: "✓ Complete", status: "complete" };
    if (item.status === "skipped") return { ...item, schedule, plan, title: "Workout skipped", subtitle: "Restore it if your plans change", statusLabel: "Skipped" };
    return { ...item, schedule, plan, statusLabel: item.dayIndex === null ? "Recovery Day" : "Today" };
}

function getScheduledItem(date, schedule, plan) {
    const exception = schedule?.exceptions?.[date];
    const weekday = new Date(date + "T12:00:00").getDay();
    const dayIndex = exception ? exception.dayIndex : schedule?.weekly?.[weekday];
    const day = dayIndex !== null && dayIndex !== undefined ? plan?.days?.[dayIndex] : null;
    return { dayIndex: day ? Number(dayIndex) : null, title: day?.name || "Recovery Day", subtitle: day ? `${day.exercises?.length || 0} exercises · ${plan.name || "Workout Plan"}` : "No workout scheduled", status: exception?.status || "scheduled" };
}

function openWorkoutTab() { document.querySelector('.nav-btn[data-page="workout"]')?.click(); }
function getWeekDates() {
    const today = new Date(localDate() + "T12:00:00");
    const sunday = new Date(today); sunday.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(sunday); date.setDate(sunday.getDate() + index); return toDate(date); });
}
function getPlans() { try { const value = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function getSessions() { try { const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function getSchedule() { try { const value = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "null"); return value && typeof value === "object" ? value : null; } catch { return null; } }
function saveSchedule(value) { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(value)); }
function ensureOnboardingSchedule(plans, schedule) {
    let preferences;
    try { preferences = getTrainingPreferences(); } catch { return schedule; }
    if (!preferences.onboardingComplete || !preferences.trainingDays.length) return schedule;
    if (schedule && schedule.source !== "onboarding") return schedule;
    const plan = schedule?.planId
        ? plans.find(item => item.id === schedule.planId)
        : [...plans].reverse().find(item => Array.isArray(item?.days) && item.days.length);
    if (!plan) return schedule;
    const next = createOnboardingSchedule(plan, preferences, schedule);
    if (!next) return schedule;
    if (schedule && JSON.stringify(schedule.weekly) === JSON.stringify(next.weekly)) return schedule;
    saveSchedule(next);
    return next;
}
function localDate() { return toDate(new Date()); }
function toDate(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function addDays(value, count) { const date = new Date(value + "T12:00:00"); date.setDate(date.getDate() + count); return toDate(date); }
function shortDayName(value) { const text = String(value || "Rest"); return text.length > 8 ? text.slice(0, 7) + "…" : text; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
