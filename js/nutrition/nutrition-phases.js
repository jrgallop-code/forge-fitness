const PHASES_KEY = "level_up_nutrition_phases";
const WEIGHT_KEY = "forge_weight_entries";
const PLAN_KEY = "level_up_nutrition_plan";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";

const PHASE_LABELS = {
    fat_loss: "Fat Loss",
    maintenance: "Maintenance",
    lean_bulk: "Lean Bulk",
    custom: "Custom"
};

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function getPhases() {
    const phases = readJson(PHASES_KEY, []);
    return Array.isArray(phases) ? phases : [];
}

function savePhases(phases) {
    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
}

function getActivePhase() {
    return getPhases().find(phase => !phase.endDate) || null;
}

function getWeights() {
    const rows = readJson(WEIGHT_KEY, []);
    if (!Array.isArray(rows)) return [];
    return rows
        .map(row => ({ date: String(row?.date || ""), weight: Number(row?.weight) }))
        .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.weight) && row.weight > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
}

function getCalculatedCalories() {
    const plan = readJson(PLAN_KEY, {});
    const value = Number(plan?.calculatedCalories);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function getCurrentWeeklyTarget() {
    const custom = Number(localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY));
    return Number.isFinite(custom) ? custom : 0;
}

function closestStartingWeight(startDate) {
    const weights = getWeights();
    if (!weights.length) return null;
    const onOrBefore = weights.filter(row => row.date <= startDate);
    return (onOrBefore.at(-1) || weights.find(row => row.date >= startDate) || null)?.weight ?? null;
}

function phaseWeights(phase) {
    if (!phase) return [];
    return getWeights().filter(row => row.date >= phase.startDate && (!phase.endDate || row.date <= phase.endDate));
}

function daysBetween(a, b) {
    const start = new Date(`${a}T12:00:00`);
    const end = new Date(`${b}T12:00:00`);
    return Math.max(0, Math.floor((end - start) / 86400000));
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function formatDate(date) {
    if (!date) return "Present";
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function signed(value, digits = 2) {
    if (!Number.isFinite(value)) return "--";
    return `${value > 0 ? "+" : ""}${value.toFixed(digits).replace(/\.00$/, "")}`;
}

function trendPerWeek(entries) {
    if (entries.length < 2) return null;
    const t0 = new Date(`${entries[0].date}T12:00:00`).getTime();
    const points = entries.map(row => ({ x: (new Date(`${row.date}T12:00:00`).getTime() - t0) / 86400000, y: row.weight }));
    const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
    const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
    const denominator = points.reduce((s, p) => s + Math.pow(p.x - meanX, 2), 0);
    if (!denominator) return null;
    const slopePerDay = points.reduce((s, p) => s + ((p.x - meanX) * (p.y - meanY)), 0) / denominator;
    return slopePerDay * 7;
}

function phaseSummary(phase) {
    const weights = phaseWeights(phase);
    const startWeight = Number.isFinite(Number(phase.startWeight)) ? Number(phase.startWeight) : weights[0]?.weight ?? null;
    const endWeight = weights.at(-1)?.weight ?? startWeight;
    const change = Number.isFinite(startWeight) && Number.isFinite(endWeight) ? endWeight - startWeight : null;
    const trend = trendPerWeek(weights);
    const end = phase.endDate || today();
    const dayCount = daysBetween(phase.startDate, end) + 1;
    return { weights, startWeight, endWeight, change, trend, dayCount, week: Math.max(1, Math.ceil(dayCount / 7)) };
}

function ensurePlannerCard() {
    const grid = document.querySelector(".nutrition-planner-grid");
    if (!grid || grid.querySelector('[data-nutrition-view="phases"]')) return;
    grid.insertAdjacentHTML("afterbegin", `
        <button class="nutrition-planner-card nutrition-phase-launcher" type="button" data-nutrition-view="phases">
            <span class="nutrition-planner-icon">↗</span>
            <strong>Nutrition Phases</strong>
            <small>Track cuts, maintenance & gaining phases</small>
        </button>
    `);
}

function ensurePhaseView() {
    const shell = document.querySelector(".nutrition-planner-shell");
    if (!shell || document.querySelector('[data-planner-view="phases"]')) return;
    shell.insertAdjacentHTML("afterend", `
        <section class="section-card nutrition-planner-view nutrition-phases-view" data-planner-view="phases" hidden>
            <button class="nutrition-planner-back" type="button" data-phase-back>← Nutrition Planner</button>
            <span class="eyebrow">NUTRITION PHASES</span>
            <h2>Keep one weight history. Judge each goal separately.</h2>
            <p class="section-description">Your weight log stays continuous. A phase simply marks the dates the Adaptive Coach should use, so a new cut or bulk starts with a clean trend instead of being influenced by the phase before it.</p>
            <div id="nutrition-phase-content"></div>
        </section>
    `);
}

function renderPhaseView() {
    const container = document.getElementById("nutrition-phase-content");
    if (!container) return;
    const phases = getPhases();
    const active = phases.find(phase => !phase.endDate) || null;

    if (active) {
        const s = phaseSummary(active);
        container.innerHTML = `
            <article class="phase-current-card">
                <div class="phase-card-top"><div><span class="eyebrow">CURRENT PHASE</span><h3>${PHASE_LABELS[active.type] || active.name || "Custom"}</h3></div><span class="phase-status-pill">ACTIVE</span></div>
                <p>${formatDate(active.startDate)} → Present · Week ${s.week}</p>
                <div class="phase-metrics">
                    <div><span>Start</span><strong>${s.startWeight ? `${s.startWeight.toFixed(1)} lb` : "--"}</strong></div>
                    <div><span>Latest</span><strong>${s.endWeight ? `${s.endWeight.toFixed(1)} lb` : "--"}</strong></div>
                    <div><span>Change</span><strong>${s.change === null ? "--" : `${signed(s.change, 1)} lb`}</strong></div>
                    <div><span>Target</span><strong>${signed(Number(active.targetWeeklyRate))} lb/wk</strong></div>
                </div>
                <div class="phase-goal-row"><span>Starting calories</span><strong>${active.startCalories ? `${active.startCalories} kcal/day` : "--"}</strong></div>
                <div class="phase-goal-row"><span>Current phase trend</span><strong>${s.trend === null ? "Collecting data" : `${signed(s.trend)} lb/wk`}</strong></div>
                <button id="end-nutrition-phase" class="secondary-btn" type="button">End Phase</button>
            </article>
            ${renderHistory(phases.filter(p => p.id !== active.id))}
        `;
        document.getElementById("end-nutrition-phase")?.addEventListener("click", endPhase);
    } else {
        container.innerHTML = `
            <article class="phase-start-card">
                <span class="eyebrow">START A PHASE</span>
                <h3>Create a clean tracking window</h3>
                <p class="nutrition-message">Starting a phase does not move or duplicate your weight data. It only tells Level Up which dates belong to this goal.</p>
                <div class="phase-form-grid">
                    <label>Phase<select id="phase-type"><option value="fat_loss">Fat Loss</option><option value="maintenance">Maintenance</option><option value="lean_bulk">Lean Bulk</option><option value="custom">Custom</option></select></label>
                    <label>Start date<input id="phase-start-date" type="date" value="${today()}"></label>
                    <label>Target weekly change (lb/week)<input id="phase-target-rate" type="number" step="0.05" value="${getCurrentWeeklyTarget()}"></label>
                </div>
                <button id="start-nutrition-phase" class="primary-btn" type="button">Start Phase</button>
                <p id="phase-message" class="nutrition-status-message"></p>
            </article>
            ${renderMockPreview()}
            ${renderHistory(phases)}
        `;
        document.getElementById("start-nutrition-phase")?.addEventListener("click", startPhase);
    }
}

function renderMockPreview() {
    return `
        <article class="phase-sample-card">
            <div class="phase-card-top"><div><span class="eyebrow">SAMPLE PREVIEW</span><h3>Lean Bulk</h3></div><span class="phase-sample-pill">MOCK DATA</span></div>
            <p>Jul 20 → Present · Week 3</p>
            <div class="phase-metrics">
                <div><span>Start</span><strong>158.4 lb</strong></div>
                <div><span>Latest</span><strong>159.2 lb</strong></div>
                <div><span>Change</span><strong>+0.8 lb</strong></div>
                <div><span>Target</span><strong>+0.25 lb/wk</strong></div>
            </div>
            <div class="phase-on-track">ON TRACK <small>Actual trend +0.23 lb/week</small></div>
        </article>
    `;
}

function renderHistory(phases) {
    if (!phases.length) return "";
    return `
        <div class="phase-history-block"><span class="eyebrow">PHASE HISTORY</span><div class="phase-history-list">
            ${[...phases].reverse().map(phase => {
                const s = phaseSummary(phase);
                return `<article class="phase-history-row"><div><strong>${PHASE_LABELS[phase.type] || "Custom"}</strong><small>${formatDate(phase.startDate)} → ${formatDate(phase.endDate)}</small></div><div><strong>${s.change === null ? "--" : `${signed(s.change, 1)} lb`}</strong><small>${s.trend === null ? "No trend" : `${signed(s.trend)} lb/wk`}</small></div></article>`;
            }).join("")}
        </div></div>
    `;
}

function startPhase() {
    const type = document.getElementById("phase-type")?.value || "custom";
    const startDate = document.getElementById("phase-start-date")?.value || today();
    const targetWeeklyRate = Number(document.getElementById("phase-target-rate")?.value);
    const message = document.getElementById("phase-message");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(targetWeeklyRate)) {
        if (message) message.textContent = "Choose a valid start date and weekly target.";
        return;
    }
    const phases = getPhases().map(phase => phase.endDate ? phase : { ...phase, endDate: startDate });
    phases.push({
        id: `phase-${Date.now()}`,
        type,
        startDate,
        endDate: null,
        startWeight: closestStartingWeight(startDate),
        startCalories: getCalculatedCalories(),
        targetWeeklyRate,
        createdAt: new Date().toISOString()
    });
    savePhases(phases);
    renderPhaseView();
    patchAdaptiveCoach();
}

function endPhase() {
    const phases = getPhases();
    const active = phases.find(phase => !phase.endDate);
    if (!active) return;
    active.endDate = today();
    active.endWeight = phaseWeights(active).at(-1)?.weight ?? null;
    savePhases(phases);
    renderPhaseView();
    patchAdaptiveCoach();
}

function showPhaseView() {
    const dashboard = document.getElementById("nutrition-planner-dashboard");
    if (dashboard) dashboard.hidden = true;
    document.querySelectorAll("[data-planner-view]").forEach(section => { section.hidden = section.dataset.plannerView !== "phases"; });
    renderPhaseView();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPlannerDashboard() {
    document.querySelectorAll("[data-planner-view]").forEach(section => { section.hidden = true; });
    const dashboard = document.getElementById("nutrition-planner-dashboard");
    if (dashboard) dashboard.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function patchAdaptiveCoach() {
    const coach = document.querySelector('[data-planner-view="coach"]');
    if (!coach || coach.hidden) return;
    const phase = getActivePhase();
    const recommendation = document.getElementById("coach-recommendation");
    if (!phase) {
        if (recommendation) recommendation.textContent = "Start a Nutrition Phase so the Adaptive Coach can judge progress using only the weight data that belongs to your current goal.";
        return;
    }
    const s = phaseSummary(phase);
    const rate = Number(phase.targetWeeklyRate);
    const phaseName = PHASE_LABELS[phase.type] || "Current Phase";
    const rateEl = document.getElementById("coach-goal-rate");
    const actualEl = document.getElementById("coach-actual-rate");
    const confidenceEl = document.getElementById("coach-confidence");
    if (rateEl) rateEl.textContent = `${signed(rate)} lb/wk`;
    if (actualEl) actualEl.textContent = s.trend === null ? "--" : `${signed(s.trend)} lb/wk`;
    if (confidenceEl) confidenceEl.textContent = `${s.weights.length} phase weigh-ins`;

    const phaseDays = daysBetween(phase.startDate, today()) + 1;
    if (phaseDays < 14 || s.weights.length < 7 || s.trend === null) {
        if (recommendation) recommendation.textContent = `${phaseName} started ${phaseDays} day${phaseDays === 1 ? "" : "s"} ago. Keep logging weight consistently. Level Up will evaluate this phase after about two weeks of current-phase data.`;
        return;
    }
    const diff = s.trend - rate;
    if (recommendation) {
        recommendation.textContent = Math.abs(diff) <= 0.2
            ? `On track for this ${phaseName.toLowerCase()} phase. Your phase-only trend is ${signed(s.trend)} lb/week versus a target of ${signed(rate)} lb/week. Keep calories unchanged.`
            : `This ${phaseName.toLowerCase()} phase is trending ${diff > 0 ? "faster" : "slower"} than planned. The coach is using only weight entries from ${formatDate(phase.startDate)} onward.`;
    }
}

function initializeNutritionPhases() {
    ensurePlannerCard();
    ensurePhaseView();
    document.querySelector('[data-nutrition-view="phases"]')?.addEventListener("click", showPhaseView);
    document.querySelector("[data-phase-back]")?.addEventListener("click", showPlannerDashboard);
    patchAdaptiveCoach();
}

function refreshSoon() {
    setTimeout(() => {
        initializeNutritionPhases();
        patchAdaptiveCoach();
    }, 20);
}

document.addEventListener("click", event => {
    if (event.target.closest('[data-nutrition-view="coach"]')) setTimeout(patchAdaptiveCoach, 40);
    if (event.target.closest('[data-nutrition-view="phases"]')) setTimeout(renderPhaseView, 20);
});
window.addEventListener("levelup:nutrition-updated", refreshSoon);
window.addEventListener("load", refreshSoon);
refreshSoon();
