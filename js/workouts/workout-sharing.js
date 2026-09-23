import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const PLAN_STORAGE_KEY = "forge_workout_plans";
const API_URL = "https://api.leveluphypertrophy.com";
const CLOUD_SESSION_KEY = "level_up_cloud_session";
const CUSTOM_EXERCISE_STORAGE_KEY = "forge_custom_exercises";
const SHARE_SCHEME = "leveluphypertrophy:";
const SHARE_HOST = "workout";
const SHARE_PATH = "/import";
const SHARE_VERSION = 1;
const MAX_SHARE_TEXT_LENGTH = 100000;
const PRIVATE_KEYS = new Set([
    "userId",
    "ownerId",
    "accountId",
    "lastWorkout",
    "lastWorkoutAt",
    "workoutHistory",
    "history",
    "sessions",
    "completedWorkouts",
    "prs",
    "personalRecords",
    "progressHistory",
    "progressionHistory",
    "previousWeight",
    "previousReps",
    "lastWeight",
    "lastReps",
    "loggedWeight",
    "weightHistory"
]);
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

let nativeListenerBound = false;
let nativeListenerAttempts = 0;

function clonePortable(value, key = "", depth = 0) {
    if (depth > 40) return null;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
    if (Array.isArray(value)) return value.map(item => clonePortable(item, "", depth + 1));
    if (!value || typeof value !== "object") return null;

    const output = {};
    Object.entries(value).forEach(([childKey, childValue]) => {
        if (DANGEROUS_KEYS.has(childKey) || PRIVATE_KEYS.has(childKey)) return;
        output[childKey] = clonePortable(childValue, childKey, depth + 1);
    });
    return output;
}

function readJsonArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    }
    catch {
        return [];
    }
}

function writeJsonArray(key, value) {
    localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
}

function exerciseIdsForPlan(plan) {
    const ids = new Set();
    (Array.isArray(plan?.days) ? plan.days : []).forEach(day => {
        (Array.isArray(day?.exercises) ? day.exercises : []).forEach(exercise => {
            if (exercise?.id) ids.add(String(exercise.id));
        });
    });
    return ids;
}

function customExercisesForPlan(plan) {
    const ids = exerciseIdsForPlan(plan);
    return getAllExercises()
        .filter(exercise => exercise?.isCustom && ids.has(String(exercise.id)))
        .map(exercise => clonePortable(exercise));
}

function encodeBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function normalizePackage(input) {
    if (!input || typeof input !== "object" || input.kind !== "levelup-workout" || Number(input.version) !== SHARE_VERSION) return null;
    const plan = clonePortable(input.plan);
    if (!plan || typeof plan !== "object") return null;

    plan.name = String(plan.name || "Shared Workout").trim().slice(0, 120) || "Shared Workout";
    if (!Array.isArray(plan.days) || !plan.days.length || plan.days.length > 14) return null;

    const validDays = plan.days.every(day => {
        if (!day || typeof day !== "object" || !Array.isArray(day.exercises) || day.exercises.length > 60) return false;
        day.name = String(day.name || "Workout Day").trim().slice(0, 120) || "Workout Day";
        return day.exercises.every(exercise => {
            if (!exercise || typeof exercise !== "object") return false;
            exercise.id = String(exercise.id || "").trim().slice(0, 160);
            if (!exercise.id) return false;
            if (exercise.reps != null) exercise.reps = String(exercise.reps).slice(0, 80);
            if (exercise.sets != null) exercise.sets = Math.max(0, Math.min(30, Number(exercise.sets) || 0));
            return true;
        });
    });
    if (!validDays) return null;

    const customExercises = Array.isArray(input.customExercises)
        ? input.customExercises
            .map(exercise => clonePortable(exercise))
            .filter(exercise => exercise && typeof exercise === "object" && String(exercise.id || "").startsWith("custom-"))
            .slice(0, 100)
        : [];

    return {
        kind: "levelup-workout",
        version: SHARE_VERSION,
        plan,
        customExercises
    };
}

export function createSharedWorkoutPackage(plan) {
    const portablePlan = clonePortable(plan);
    if (!portablePlan || typeof portablePlan !== "object") throw new Error("Workout could not be prepared for sharing.");
    delete portablePlan.id;

    const packageValue = normalizePackage({
        kind: "levelup-workout",
        version: SHARE_VERSION,
        plan: portablePlan,
        customExercises: customExercisesForPlan(plan)
    });

    if (!packageValue) throw new Error("Workout could not be prepared for sharing.");
    return packageValue;
}

export function encodeSharedWorkoutPackage(packageValue) {
    const normalized = normalizePackage(packageValue);
    if (!normalized) throw new Error("Invalid shared workout.");
    return encodeBase64Url(JSON.stringify(normalized));
}

export function decodeSharedWorkoutToken(token) {
    try {
        if (!token || String(token).length > MAX_SHARE_TEXT_LENGTH) return null;
        return normalizePackage(JSON.parse(decodeBase64Url(String(token))));
    }
    catch {
        return null;
    }
}

export function decodeSharedWorkoutFromText(text) {
    const value = String(text || "");
    const directToken = value.match(/leveluphypertrophy:\/\/workout\/import\?[^\s]*?data=([A-Za-z0-9_-]+)/i)?.[1];
    if (directToken) return decodeSharedWorkoutToken(directToken);

    const webToken = value.match(/https:\/\/app\.leveluphypertrophy\.com\/share-workout\.html\?[^\s]*?data=([A-Za-z0-9_-]+)/i)?.[1];
    if (webToken) return decodeSharedWorkoutToken(webToken);

    const compactToken = value.match(/LEVELUP_WORKOUT_V1:([A-Za-z0-9_-]+)/i)?.[1];
    return compactToken ? decodeSharedWorkoutToken(compactToken) : null;
}

export function extractSharedWorkoutCode(text) {
    const value = String(text || "");
    const webCode = value.match(/https:\/\/api\.leveluphypertrophy\.com\/w\/([A-Z2-9]{7})/i)?.[1];
    if (webCode) return webCode.toUpperCase();
    const deepLinkCode = value.match(/leveluphypertrophy:\/\/workout\/import\?[^\s]*?id=([A-Z2-9]{7})/i)?.[1];
    return deepLinkCode ? deepLinkCode.toUpperCase() : "";
}

function cloudSessionToken() {
    try {
        return JSON.parse(localStorage.getItem(CLOUD_SESSION_KEY) || "null")?.token || "";
    }
    catch {
        return "";
    }
}

function cloudHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = cloudSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

async function createShortWorkoutShare(packageValue) {
    const response = await fetch(`${API_URL}/v1/workout-shares`, {
        method: "POST",
        headers: cloudHeaders(),
        body: JSON.stringify({ workout: packageValue })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.url || !/\/w\/[A-Z2-9]{7}$/i.test(payload.url)) {
        throw new Error(payload?.error || "Short workout link could not be created.");
    }
    return {
        code: String(payload.code || "").toUpperCase(),
        url: String(payload.url),
        expiresAt: payload.expiresAt || null
    };
}

export async function fetchSharedWorkoutPackage(code) {
    const normalizedCode = String(code || "").toUpperCase();
    if (!/^[A-Z2-9]{7}$/.test(normalizedCode)) throw new Error("Shared workout code is not valid.");
    const response = await fetch(`${API_URL}/v1/workout-shares/${encodeURIComponent(normalizedCode)}`, {
        headers: { Accept: "application/json" }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Shared workout could not be loaded.");
    const normalized = normalizePackage(payload?.workout);
    if (!normalized) throw new Error("Shared workout data is not valid.");
    return normalized;
}

export async function resolveSharedWorkoutFromText(text) {
    const embedded = decodeSharedWorkoutFromText(text);
    if (embedded) return embedded;
    const code = extractSharedWorkoutCode(text);
    return code ? fetchSharedWorkoutPackage(code) : null;
}

export function getSharedWorkoutStats(packageValue) {
    const normalized = normalizePackage(packageValue);
    const days = normalized?.plan?.days || [];
    const exercises = days.reduce((total, day) => total + day.exercises.length, 0);
    const workingSets = days.reduce(
        (total, day) => total + day.exercises.reduce((dayTotal, exercise) => dayTotal + (Number(exercise.sets) || 0), 0),
        0
    );
    return { days: days.length, exercises, workingSets };
}

function uniqueImportedPlanId() {
    return `shared-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mergeCustomExercises(customExercises) {
    if (!customExercises.length) return;
    const existing = readJsonArray(CUSTOM_EXERCISE_STORAGE_KEY);
    const byId = new Map(existing.map(exercise => [String(exercise?.id || ""), exercise]));

    customExercises.forEach(exercise => {
        const id = String(exercise?.id || "");
        if (!id || byId.has(id)) return;
        const clean = {
            id,
            name: String(exercise.name || "Custom Exercise").slice(0, 120),
            muscleGroup: String(exercise.muscleGroup || "Other").slice(0, 80),
            equipment: String(exercise.equipment || "Other").slice(0, 80),
            type: String(exercise.type || "compound").slice(0, 40),
            recommendedReps: String(exercise.recommendedReps || "8-12").slice(0, 40),
            defaultSets: Math.max(1, Math.min(20, Number(exercise.defaultSets) || 3)),
            trackingType: String(exercise.trackingType || "reps").slice(0, 40),
            isCustom: true
        };
        byId.set(id, clean);
        existing.push(clean);
    });

    writeJsonArray(CUSTOM_EXERCISE_STORAGE_KEY, existing);
}

export function importSharedWorkoutPackage(packageValue) {
    const normalized = normalizePackage(packageValue);
    if (!normalized) throw new Error("This shared workout is not valid.");

    mergeCustomExercises(normalized.customExercises);

    const plans = readJsonArray(PLAN_STORAGE_KEY);
    const plan = clonePortable(normalized.plan);
    plan.id = uniqueImportedPlanId();
    plan.sharedWorkout = {
        version: SHARE_VERSION,
        importedAt: new Date().toISOString()
    };
    plans.push(plan);
    writeJsonArray(PLAN_STORAGE_KEY, plans);

    window.dispatchEvent(new CustomEvent("levelup:shared-workout-imported", {
        detail: { planId: plan.id, planName: plan.name }
    }));
    return plan;
}

async function shareMessageForPlan(plan) {
    const packageValue = createSharedWorkoutPackage(plan);
    const stats = getSharedWorkoutStats(packageValue);
    let link = "";
    let shortCode = "";

    try {
        const shortShare = await createShortWorkoutShare(packageValue);
        link = shortShare.url;
        shortCode = shortShare.code;
    }
    catch (error) {
        console.warn("Short workout share unavailable; using embedded fallback.", error);
        const token = encodeSharedWorkoutPackage(packageValue);
        link = `https://app.leveluphypertrophy.com/share-workout.html?data=${token}`;
    }

    return {
        packageValue,
        link,
        shortCode,
        text: `${packageValue.plan.name} — Level Up Workout\n${stats.days} day${stats.days === 1 ? "" : "s"} · ${stats.exercises} exercises · ${stats.workingSets} working sets\n\nOpen this workout in Level Up. If needed, copy this message and paste it into Workout → Import Routine.`
    };
}

export async function shareWorkoutPlan(plan) {
    const share = await shareMessageForPlan(plan);

    if (navigator.share) {
        try {
            await navigator.share({
                title: `${share.packageValue.plan.name} — Level Up`,
                text: share.text,
                url: share.link
            });
            return { method: "share", link: share.link };
        }
        catch (error) {
            if (error?.name === "AbortError") return { method: "cancelled", link: share.link };
        }
    }

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${share.text}\n\n${share.link}`);
        return { method: "copy", link: share.link };
    }

    return { method: "unsupported", link: share.link, text: `${share.text}\n\n${share.link}` };
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));
}

function ensureStyles() {
    if (document.getElementById("level-up-workout-sharing-styles")) return;
    const style = document.createElement("style");
    style.id = "level-up-workout-sharing-styles";
    style.textContent = `
        .plan-detail-header{position:relative}
        .plan-detail-header.has-share-menu{padding-right:3rem}
        .plan-detail-overflow{position:absolute;right:0;top:0;z-index:5}
        .plan-detail-overflow-button{width:2.5rem;height:2.5rem;border-radius:999px;border:1px solid var(--line);background:var(--surface-raised);color:var(--text);-webkit-text-fill-color:var(--text);font-size:1.45rem;line-height:1;display:grid;place-items:center;padding:0}
        .plan-detail-overflow-menu{position:absolute;right:0;top:2.8rem;min-width:10.5rem;padding:.35rem;border-radius:.8rem;background:var(--surface);color:var(--text);border:1px solid var(--line);box-shadow:var(--shadow)}
        .plan-detail-overflow-menu[hidden]{display:none}
        .plan-detail-overflow-menu button{width:100%;border:0;background:transparent;color:var(--text);-webkit-text-fill-color:var(--text);text-align:left;padding:.7rem .8rem;border-radius:.6rem;font:inherit}
        .plan-detail-overflow-menu button:active{background:var(--accent-soft)}
        .shared-workout-overlay{position:fixed;inset:0;z-index:40050;background:rgba(0,0,0,.64);display:grid;align-items:end;padding:1rem}
        .shared-workout-sheet{width:min(100%,34rem);max-height:min(84vh,44rem);overflow:auto;margin:0 auto;background:var(--surface);color:var(--text);border:1px solid var(--card-border,var(--line));border-radius:1.2rem;padding:1rem;box-shadow:var(--shadow)}
        .shared-workout-sheet h2{margin:.25rem 0 .3rem;font-size:1.35rem;color:var(--heading)}
        .shared-workout-sheet p{margin:.2rem 0 .9rem;color:var(--text-secondary)}
        .shared-workout-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin:.9rem 0}
        .shared-workout-stats div{padding:.7rem .45rem;border-radius:.75rem;border:1px solid var(--line);background:var(--surface-raised);text-align:center;color:var(--text)}
        .shared-workout-stats strong,.shared-workout-stats span{display:block}
        .shared-workout-stats strong{color:var(--heading)}
        .shared-workout-stats span{font-size:.72rem;color:var(--muted);margin-top:.15rem}
        .shared-workout-days{display:grid;gap:.45rem;margin:.8rem 0 1rem}
        .shared-workout-day{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.72rem .8rem;border:1px solid var(--line);border-radius:.75rem;background:var(--surface-raised);color:var(--text)}
        .shared-workout-day strong{color:var(--heading)}
        .shared-workout-day span{font-size:.78rem;color:var(--muted)}
        .shared-workout-actions{display:grid;grid-template-columns:1fr 1.25fr;gap:.6rem;position:sticky;bottom:-1rem;padding:.7rem 0 calc(1rem + env(safe-area-inset-bottom));background:var(--surface)}
        @media (min-width:700px){.shared-workout-overlay{align-items:center}}
    `;
    document.head.appendChild(style);
}

function closeSharedWorkoutPreview() {
    document.querySelector("[data-shared-workout-overlay]")?.remove();
}

function navigateToImportedPlan(planId) {
    const openCard = (attempt = 0) => {
        const card = document.querySelector(`[data-custom-plan-id="${planId}"]`);
        if (card) {
            card.click();
            return;
        }
        if (attempt < 8) window.setTimeout(() => openCard(attempt + 1), 100);
    };

    const workoutNav = document.querySelector('.nav-btn[data-page="workout"]');
    if (workoutNav) workoutNav.click();
    window.setTimeout(() => openCard(), 80);
}

export function presentSharedWorkoutPreview(packageValue) {
    const normalized = normalizePackage(packageValue);
    if (!normalized) return false;
    ensureStyles();
    closeSharedWorkoutPreview();

    const stats = getSharedWorkoutStats(normalized);
    const overlay = document.createElement("div");
    overlay.className = "shared-workout-overlay";
    overlay.dataset.sharedWorkoutOverlay = "";
    overlay.innerHTML = `
        <section class="shared-workout-sheet" role="dialog" aria-modal="true" aria-labelledby="shared-workout-title">
            <span class="eyebrow">SHARED WORKOUT</span>
            <h2 id="shared-workout-title">${escapeHtml(normalized.plan.name)}</h2>
            <p>Review the workout, then add an independent copy to My Workouts.</p>
            <div class="shared-workout-stats">
                <div><strong>${stats.days}</strong><span>Days</span></div>
                <div><strong>${stats.exercises}</strong><span>Exercises</span></div>
                <div><strong>${stats.workingSets}</strong><span>Working sets</span></div>
            </div>
            <div class="shared-workout-days">
                ${normalized.plan.days.map((day, index) => `<div class="shared-workout-day"><strong>Day ${index + 1}: ${escapeHtml(day.name)}</strong><span>${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"}</span></div>`).join("")}
            </div>
            <div class="shared-workout-actions">
                <button class="secondary-btn" type="button" data-shared-workout-cancel>Cancel</button>
                <button class="primary-btn" type="button" data-shared-workout-add>Add to My Workouts</button>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector("[data-shared-workout-cancel]")?.addEventListener("click", closeSharedWorkoutPreview);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeSharedWorkoutPreview();
    });
    overlay.querySelector("[data-shared-workout-add]")?.addEventListener("click", event => {
        const button = event.currentTarget;
        try {
            button.disabled = true;
            const imported = importSharedWorkoutPackage(normalized);
            button.textContent = "Added ✓";
            window.setTimeout(() => {
                closeSharedWorkoutPreview();
                navigateToImportedPlan(imported.id);
            }, 180);
        }
        catch {
            button.disabled = false;
            button.textContent = "Could not add workout";
        }
    });

    return true;
}

async function handleWorkoutUrl(value) {
    try {
        const url = new URL(String(value || ""));
        if (url.protocol !== SHARE_SCHEME || url.hostname !== SHARE_HOST || url.pathname !== SHARE_PATH) return false;

        const embedded = decodeSharedWorkoutToken(url.searchParams.get("data"));
        if (embedded) return presentSharedWorkoutPreview(embedded);

        const code = String(url.searchParams.get("id") || "").toUpperCase();
        if (!/^[A-Z2-9]{7}$/.test(code)) return false;

        const packageValue = await fetchSharedWorkoutPackage(code);
        return presentSharedWorkoutPreview(packageValue);
    }
    catch (error) {
        console.error("Shared workout link could not be opened:", error);
        return false;
    }
}

function bindNativeListener() {
    if (nativeListenerBound || typeof window === "undefined") return;
    const appPlugin = window.Capacitor?.Plugins?.App;
    if (!appPlugin?.addListener) {
        if (nativeListenerAttempts++ < 12) window.setTimeout(bindNativeListener, 300);
        return;
    }

    nativeListenerBound = true;
    try {
        void appPlugin.addListener("appUrlOpen", event => {
            void handleWorkoutUrl(event?.url);
        });
        void appPlugin.getLaunchUrl?.().then(result => {
            if (result?.url) void handleWorkoutUrl(result.url);
        }).catch(() => {});
    }
    catch {
        nativeListenerBound = false;
    }
}

async function handleWebShareQuery() {
    if (typeof window === "undefined") return;
    try {
        const url = new URL(window.location.href);
        const code = String(url.searchParams.get("workoutShare") || "").toUpperCase();
        if (!/^[A-Z2-9]{7}$/.test(code)) return;

        url.searchParams.delete("workoutShare");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);

        const packageValue = await fetchSharedWorkoutPackage(code);
        presentSharedWorkoutPreview(packageValue);
    }
    catch (error) {
        console.error("Shared workout web link could not be opened:", error);
    }
}

export function initializeWorkoutSharing() {
    if (typeof document === "undefined") return;
    ensureStyles();
    bindNativeListener();
    void handleWebShareQuery();
}

if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeWorkoutSharing, { once: true });
    }
    else {
        initializeWorkoutSharing();
    }
}
