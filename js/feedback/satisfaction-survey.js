const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const STATE_KEY = "level_up_satisfaction_survey_v1";
const WORKOUTS_KEY = "forge_workout_sessions";
const FOOD_LOG_KEY = "level_up_food_log_v1";
const APP_VERSION = "2026-08-31-satisfaction-1";
const DAY_MS = 86400000;

let initialized = false;
let statusPromise = null;

export function initializeSatisfactionSurvey() {
    ensureStyles();
    recordActiveDay();
    if (initialized) return;
    initialized = true;
    window.addEventListener("levelup:cloud-session-started", () => { statusPromise = null; });
    window.addEventListener("levelup:workout-completed", recordActiveDay);
}

function ensureStyles() {
    if (document.querySelector("link[data-satisfaction-survey-styles]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/satisfaction-survey.css?v=satisfaction-survey-1";
    link.dataset.satisfactionSurveyStyles = "";
    document.head.appendChild(link);
}

export async function showSatisfactionSurveyIfEligible(root = document.getElementById("content")) {
    if (!root?.querySelector(".dashboard") || root.querySelector("[data-satisfaction-survey]")) return;
    const trigger = eligibilityTrigger();
    const state = readState();
    if (!trigger || isLocallySuppressed(state) || !sessionToken()) return;
    const remote = await feedbackStatus();
    if (!remote || !root.querySelector(".dashboard") || root.querySelector("[data-satisfaction-survey]")) return;
    if (Number(remote.submissionsLastYear || 0) >= 3) return;
    if (remote.lastSubmittedAt && Date.now() - Date.parse(remote.lastSubmittedAt) < 90 * DAY_MS) return;
    renderSurvey(root, trigger);
}

function renderSurvey(root, trigger) {
    const card = document.createElement("section");
    card.className = "satisfaction-survey-card";
    card.dataset.satisfactionSurvey = "true";
    card.dataset.trigger = trigger;
    card.innerHTML = `
        <div class="satisfaction-survey-heading">
            <span class="eyebrow">HELP SHAPE LEVEL UP</span>
            <h2>How are you enjoying Level Up?</h2>
            <p>We strive to make a free, high-quality app that people can rely on. Your feedback helps us keep improving it.</p>
        </div>
        <div class="satisfaction-stars" role="radiogroup" aria-label="Rate Level Up out of five stars">
            ${[1,2,3,4,5].map(value => `<button type="button" role="radio" aria-checked="false" aria-label="${value} out of 5 stars" data-rating="${value}">★</button>`).join("")}
        </div>
        <p class="satisfaction-rating-label" data-rating-label>Tap a star to rate</p>
        <label class="satisfaction-comment"><span>Anything you’d like us to improve? <small>Optional</small></span>
            <textarea maxlength="1000" rows="3" placeholder="Share anything you liked, disliked, or found confusing."></textarea>
        </label>
        <p class="satisfaction-survey-status" data-survey-status aria-live="polite"></p>
        <div class="satisfaction-survey-actions">
            <button class="primary-btn" type="button" data-submit-rating disabled>Submit rating</button>
            <button class="satisfaction-not-now" type="button" data-survey-later>Not now</button>
        </div>
        <small class="satisfaction-privacy">Your response is used internally to improve Level Up.</small>`;
    root.querySelector(".dashboard").before(card);
    bindSurvey(card);
}

function bindSurvey(card) {
    let rating = 0;
    const labels = ["", "Very dissatisfied", "Dissatisfied", "Okay", "Satisfied", "Very satisfied"];
    card.querySelectorAll("[data-rating]").forEach(button => button.addEventListener("click", () => {
        rating = Number(button.dataset.rating);
        card.querySelectorAll("[data-rating]").forEach(star => {
            star.classList.toggle("selected", Number(star.dataset.rating) <= rating);
            star.setAttribute("aria-checked", String(Number(star.dataset.rating) === rating));
        });
        card.querySelector("[data-rating-label]").textContent = `${rating} of 5 · ${labels[rating]}`;
        card.querySelector("[data-submit-rating]").disabled = false;
    }));
    card.querySelector("[data-survey-later]")?.addEventListener("click", () => {
        writeState({ ...readState(), snoozedUntil: new Date(Date.now() + 30 * DAY_MS).toISOString() });
        card.remove();
    });
    card.querySelector("[data-submit-rating]")?.addEventListener("click", async event => {
        if (!rating) return;
        const submit = event.currentTarget;
        const status = card.querySelector("[data-survey-status]");
        submit.disabled = true;
        status.textContent = "Sending your feedback…";
        status.classList.remove("is-error");
        try {
            const response = await fetch(`${API_URL}/v1/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken()}` },
                body: JSON.stringify({ rating, comment: card.querySelector("textarea")?.value || "", trigger: card.dataset.trigger, appVersion: APP_VERSION })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Feedback could not be sent.");
            const state = readState();
            const submissions = [...(state.submissions || []), data.submittedAt || new Date().toISOString()].slice(-3);
            writeState({ ...state, lastSubmittedAt: submissions.at(-1), submissions, snoozedUntil: null });
            statusPromise = Promise.resolve({ lastSubmittedAt: submissions.at(-1), submissionsLastYear: submissions.length });
            card.innerHTML = `<div class="satisfaction-survey-thanks"><span class="eyebrow">FEEDBACK RECEIVED</span><h2>Thank you</h2><p>Your response will help us make Level Up better.</p></div>`;
            window.setTimeout(() => card.remove(), 2400);
        } catch (error) {
            status.textContent = error.message;
            status.classList.add("is-error");
            submit.disabled = false;
        }
    });
}

function eligibilityTrigger() {
    const workouts = readJson(WORKOUTS_KEY, []).filter(item => item?.completedAt).length;
    const foodLog = readJson(FOOD_LOG_KEY, {});
    const foodDays = Object.values(foodLog || {}).filter(items => Array.isArray(items) && items.length).length;
    return determineSatisfactionSurveyTrigger({ workouts, foodDays, activeDays: (readState().activeDays || []).length });
}

export function determineSatisfactionSurveyTrigger({ workouts = 0, foodDays = 0, activeDays = 0 } = {}) {
    if (Number(workouts) >= 3) return "workout_milestone";
    if (Number(foodDays) >= 5) return "food_log_milestone";
    if (Number(activeDays) >= 7) return "active_day_milestone";
    return "";
}

function isLocallySuppressed(state) {
    if (state.snoozedUntil && Date.parse(state.snoozedUntil) > Date.now()) return true;
    if (state.lastSubmittedAt && Date.now() - Date.parse(state.lastSubmittedAt) < 90 * DAY_MS) return true;
    return (state.submissions || []).filter(value => Date.now() - Date.parse(value) < 365 * DAY_MS).length >= 3;
}

function recordActiveDay() {
    const state = readState();
    const today = new Date().toLocaleDateString("en-CA");
    const activeDays = [...new Set([...(state.activeDays || []), today])].sort().slice(-14);
    writeState({ ...state, activeDays });
}

function feedbackStatus() {
    if (statusPromise) return statusPromise;
    statusPromise = fetch(`${API_URL}/v1/feedback/status`, { headers: { Authorization: `Bearer ${sessionToken()}` } })
        .then(async response => response.ok ? response.json() : null).catch(() => null);
    return statusPromise;
}

function sessionToken() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; } catch { return ""; } }
function readState() { return readJson(STATE_KEY, {}); }
function writeState(value) { try { localStorage.setItem(STATE_KEY, JSON.stringify(value)); } catch {} }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
