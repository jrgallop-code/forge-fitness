import { presetPlans } from "./workout-plans.js?v=proven-template-builder-1";
import { celebrityWorkoutPlans } from "./celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "./bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "./celebrity-expansion-plans.js?v=celebrity-expansion-2";
import { openWorkoutLogger } from "./workout-session.js?v=workout-source-stats-1";

const PLAN_KEY = "forge_workout_plans";
const PENDING_TEMPLATE_KEY = "level_up_pending_template_adoption_v1";
const OPEN_ROUTINES_KEY = "level_up_open_my_routines_v1";
const STYLE_ID = "workout-template-adoption-styles";

const allCataloguePlans = [
    ...presetPlans,
    ...celebrityWorkoutPlans,
    ...bodybuilderWorkoutPlans,
    ...celebrityExpansionPlans
].filter((plan, index, plans) => plans.findIndex(candidate => String(candidate?.id) === String(plan?.id)) === index);

initializeTemplateAdoption();

function initializeTemplateAdoption() {
    ensureStyles();
    decoratePlanDetail();
    decorateSaveLabels();

    document.addEventListener("click", handleTemplateAction, true);

    const observer = new MutationObserver(() => {
        decoratePlanDetail();
        decorateSaveLabels();
    });
    const start = () => observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
}

function handleTemplateAction(event) {
    const target = event.target;

    const startButton = target.closest?.("#start-workout-plan");
    if (startButton) {
        const screen = startButton.closest("#workout-plan-detail-screen");
        const template = resolveTemplateFromDetail(screen);
        if (!template) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        const savedPlan = ensureTemplateSaved(template, { reason: "started" });
        if (!savedPlan) return;

        screen.remove();
        document.querySelector(".workout-page")?.classList.remove("showing-plan-details");
        requestAnimationFrame(() => openWorkoutLogger(savedPlan));
        return;
    }

    const modifyButton = target.closest?.("#modify-workout-plan");
    if (modifyButton) {
        const template = resolveTemplateFromDetail(modifyButton.closest("#workout-plan-detail-screen"));
        if (template) rememberPendingTemplate(template);
        return;
    }

    const manualSave = target.closest?.("#save-plan-btn");
    if (manualSave) {
        const pending = readPendingTemplate();
        if (!pending?.templateId) return;
        const beforeIds = new Set(readSavedPlans().map(plan => String(plan?.id || "")));
        window.setTimeout(() => enrichManualTemplateSave({ pending, beforeIds }), 80);
        return;
    }

    if (target.closest?.("#close-plan-builder-btn")) {
        clearPendingTemplate();
    }
}

function decoratePlanDetail() {
    const screen = document.querySelector("#workout-plan-detail-screen");
    const template = resolveTemplateFromDetail(screen);
    if (!screen || !template) return;

    const actions = screen.querySelector(".plan-detail-bottom-actions");
    if (!actions) return;
    actions.classList.add("has-save-to-routines");

    let saveButton = actions.querySelector("#save-workout-plan-to-routines");
    if (!saveButton) {
        saveButton = document.createElement("button");
        saveButton.id = "save-workout-plan-to-routines";
        saveButton.type = "button";
        saveButton.className = "secondary-btn save-workout-plan-to-routines";
        actions.prepend(saveButton);
        saveButton.addEventListener("click", () => saveTemplateFromDetail(template, saveButton));
    }

    const existing = findSavedTemplateCopy(template);
    const saved = Boolean(existing);
    const label = saved ? "Saved to My Routines ✓" : "Save to My Routines";
    if (saveButton.disabled !== saved) saveButton.disabled = saved;
    saveButton.classList.toggle("is-saved", saved);
    if (saveButton.textContent !== label) saveButton.textContent = label;
}

function saveTemplateFromDetail(template, button) {
    const saved = ensureTemplateSaved(template, { reason: "saved" });
    if (!saved) return;
    button.disabled = true;
    button.classList.add("is-saved");
    if (button.textContent !== "Saved to My Routines ✓") button.textContent = "Saved to My Routines ✓";

    try { sessionStorage.setItem(OPEN_ROUTINES_KEY, "1"); }
    catch {}
    document.dispatchEvent(new CustomEvent("levelup:workout-library-changed", {
        detail: { planId: saved.id, templateId: template.id, reason: "saved" }
    }));

    // Re-entering the Workout route refreshes the legacy saved-card registry as
    // well as the new My Routines view, so Open/Edit/Delete all work immediately.
    window.setTimeout(() => {
        document.querySelector('.nav-btn[data-page="workout"]')?.click();
    }, 180);
}

function ensureTemplateSaved(template, { reason = "saved" } = {}) {
    const plans = readSavedPlans();
    const existing = findSavedTemplateCopy(template, plans);
    const now = new Date().toISOString();

    if (existing) {
        const index = plans.findIndex(plan => String(plan?.id) === String(existing.id));
        if (index >= 0) {
            plans[index] = {
                ...plans[index],
                sourceTemplateId: plans[index].sourceTemplateId || template.id,
                sourceType: plans[index].sourceType || "level-up-template",
                sourceLabel: plans[index].sourceLabel || "Level Up",
                adoptedFromTemplate: true,
                lastUsedAt: reason === "started" ? now : plans[index].lastUsedAt,
                savedAt: plans[index].savedAt || now
            };
            writeSavedPlans(plans);
            return plans[index];
        }
        return existing;
    }

    const saved = clonePlan(template);
    saved.id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    saved.sourceTemplateId = template.id;
    saved.sourceType = "level-up-template";
    saved.sourceLabel = "Level Up";
    saved.adoptedFromTemplate = true;
    saved.savedAt = now;
    if (reason === "started") saved.lastUsedAt = now;
    plans.push(saved);
    writeSavedPlans(plans);

    document.dispatchEvent(new CustomEvent("levelup:workout-library-changed", {
        detail: { planId: saved.id, templateId: template.id, reason }
    }));
    return saved;
}

function findSavedTemplateCopy(template, suppliedPlans = null) {
    if (!template) return null;
    const plans = Array.isArray(suppliedPlans) ? suppliedPlans : readSavedPlans();
    const exact = plans.find(plan => String(plan?.sourceTemplateId || "") === String(template.id));
    if (exact) return exact;

    // Backfill routines saved from templates before provenance metadata existed.
    const templateName = normalizeName(template.name);
    return plans.find(plan => normalizeName(plan?.name) === templateName) || null;
}

function resolveTemplateFromDetail(screen) {
    if (!screen) return null;
    const eyebrow = screen.querySelector(".plan-detail-header .eyebrow")?.textContent || "";
    if (!/level up template/i.test(eyebrow)) return null;
    const name = normalizeName(screen.querySelector(".plan-detail-header h2")?.textContent);
    if (!name) return null;
    return allCataloguePlans.find(plan => normalizeName(plan?.name) === name) || null;
}

function rememberPendingTemplate(template) {
    try {
        sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify({
            templateId: template.id,
            templateName: template.name,
            startedAt: new Date().toISOString()
        }));
    }
    catch {}
}

function readPendingTemplate() {
    try { return JSON.parse(sessionStorage.getItem(PENDING_TEMPLATE_KEY) || "null"); }
    catch { return null; }
}

function clearPendingTemplate() {
    try { sessionStorage.removeItem(PENDING_TEMPLATE_KEY); }
    catch {}
}

function enrichManualTemplateSave({ pending, beforeIds }) {
    const plans = readSavedPlans();
    if (!plans.length) return;

    let index = plans.findIndex(plan => !beforeIds.has(String(plan?.id || "")));
    if (index < 0) {
        index = plans.findIndex(plan => normalizeName(plan?.name) === normalizeName(pending.templateName));
    }
    if (index < 0) return;

    const now = new Date().toISOString();
    plans[index] = {
        ...plans[index],
        sourceTemplateId: pending.templateId,
        sourceType: "level-up-template",
        sourceLabel: "Level Up",
        adoptedFromTemplate: true,
        customizedFromTemplate: true,
        savedAt: plans[index].savedAt || now
    };
    writeSavedPlans(plans);
    clearPendingTemplate();

    document.dispatchEvent(new CustomEvent("levelup:workout-library-changed", {
        detail: { planId: plans[index].id, templateId: pending.templateId, reason: "modified-and-saved" }
    }));
}

function decorateSaveLabels() {
    const manual = document.querySelector("#save-plan-btn");
    if (manual && /save\s+plan/i.test(manual.textContent || "")) manual.textContent = "Save to My Routines";

    document.querySelectorAll("[data-smart-save]").forEach(button => {
        const text = button.textContent || "";
        if (/^\s*save\s+plan\s*$/i.test(text)) button.textContent = "Save to My Routines";
    });

    document.querySelectorAll("[data-routine-save]").forEach(button => {
        const text = button.textContent || "";
        if (/save\s+(routine|plan)/i.test(text) && !/saved/i.test(text)) button.textContent = "Save to My Routines";
    });
}

function clonePlan(plan) {
    try {
        if (typeof structuredClone === "function") return structuredClone(plan);
    }
    catch {}
    return JSON.parse(JSON.stringify(plan));
}

function readSavedPlans() {
    try {
        const value = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
        return Array.isArray(value) ? value.filter(plan => plan && typeof plan === "object") : [];
    }
    catch {
        return [];
    }
}

function writeSavedPlans(plans) {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
}

function normalizeName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.workout-plan-detail-screen .plan-detail-bottom-actions.has-save-to-routines{
  display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;
}
.workout-plan-detail-screen .plan-detail-bottom-actions.has-save-to-routines #save-workout-plan-to-routines{
  grid-column:1/-1;min-height:44px!important;
}
.workout-plan-detail-screen #save-workout-plan-to-routines.is-saved{
  border-color:color-mix(in srgb,var(--accent) 35%,var(--line))!important;
  background:var(--accent-soft)!important;color:var(--accent-text)!important;opacity:1!important;
}
@media(max-width:390px){
  .workout-plan-detail-screen .plan-detail-bottom-actions.has-save-to-routines{grid-template-columns:1fr!important}
  .workout-plan-detail-screen .plan-detail-bottom-actions.has-save-to-routines #save-workout-plan-to-routines{grid-column:auto}
}
`;
    document.head.appendChild(style);
}
