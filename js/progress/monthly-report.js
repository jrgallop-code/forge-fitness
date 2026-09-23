import { getAllExercises } from "../workouts/exercise-library.js?v=exercise-library-catalogue-2";
import { getExerciseImpacts } from "../workouts/plan-muscle-volume.js?v=plan-volume-shared-1";
import { calculatePrCounts } from "../workouts/workout-pr-badges.js?v=monthly-report-1";
import { readFoodLog, summarizeEntries } from "../nutrition/food-log-data.js?v=food-search-freeze-fix-1";
import { getNutritionMacroPreference, getNutritionPlan, getNutritionProfile } from "../nutrition/nutrition-storage.js?v=food-log-macro-bars-1";
import { calculateMacroTargets, poundsToKg } from "../nutrition/tdee-calculator.js?v=food-log-macro-bars-1";
import { getCalculatedMaintenanceHistory } from "../nutrition/calculated-maintenance.js?v=energy-summary-1";
import { isNutritionEnabled } from "../core/app-feature-preferences.js?v=nutrition-feature-choice-1";
import { collectCardioEntries, summarizeCardio } from "./cardio-analytics.js?v=monthly-report-1";
import { shareNativePdfFile } from "../core/native-capabilities.js?v=monthly-pdf-report-1";

const SESSION_KEY = "forge_workout_sessions";
const WEIGHT_KEY = "forge_weight_entries";
const PHASES_KEY = "level_up_nutrition_phases";
const SNAPSHOT_KEY = "level_up_monthly_report_snapshots_v1";
const SEEN_KEY = "level_up_monthly_report_seen_v1";
const PENDING_KEY = "level_up_monthly_report_pending_v1";
const DAY_MS = 86400000;
const REPORT_VERSION = 1;
const STYLE_ID = "level-up-monthly-report-style";

export function initializeMonthlyReports(root = document) {
    ensureStyles();
    const page = root.querySelector && root.querySelector(".progress-page");
    if (!page || page.dataset.monthlyReportBound === "true") return;
    page.dataset.monthlyReportBound = "true";
    const tabs = page.querySelector(".progress-tabs");
    if (!tabs) return;

    const monthKey = preferredMonthKey();
    const report = buildMonthlyReport(monthKey);
    tabs.insertAdjacentHTML("beforebegin", renderEntryCard(report));
    const opener = page.querySelector("[data-monthly-report-open]");
    if (opener) opener.addEventListener("click", function () { openMonthlyReportsHub(page, monthKey); });

    const pending = localStorage.getItem(PENDING_KEY);
    if (/^\d{4}-\d{2}$/.test(String(pending || ""))) {
        localStorage.removeItem(PENDING_KEY);
        requestAnimationFrame(function () {
            openMonthlyReportsHub(page, pending);
            const screen = document.querySelector("[data-monthly-report-screen]");
            if (screen) renderReportView(screen, page, pending);
        });
    }
}

export function initializeMonthlyReportDashboardPrompt(root = document) {
    ensureStyles();
    const now = new Date();
    if (now.getDate() > 7) return;
    const previous = shiftMonth(monthKeyForDate(now), -1);
    if (!monthHasMeaningfulData(previous) || seenMonths().has(previous)) return;

    const host = root.querySelector ? (root.querySelector("#content") || root) : root;
    if (!host || host.querySelector("[data-monthly-report-dashboard]")) return;

    const report = buildMonthlyReport(previous);
    const card = document.createElement("section");
    card.className = "monthly-report-dashboard-card";
    card.dataset.monthlyReportDashboard = "";
    card.innerHTML =
        '<div><span class="eyebrow">MONTHLY REPORT</span>' +
        '<strong>Your ' + escapeHtml(report.label) + ' report is ready</strong>' +
        '<p>See what improved and what to focus on next.</p></div>' +
        '<button class="primary-btn" type="button">View Report</button>';
    const first = host.firstElementChild;
    if (first) first.insertAdjacentElement("afterend", card);
    else host.prepend(card);

    const button = card.querySelector("button");
    if (button) button.addEventListener("click", function () {
        localStorage.setItem(PENDING_KEY, previous);
        document.dispatchEvent(new CustomEvent("levelup:navigate", { detail: { page: "progress" } }));
    });
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "css/monthly-report.css?v=ios-monthly-report-1";
    document.head.appendChild(link);
}

function renderEntryCard(report) {
    const stats = [];
    if (report.training.workouts) stats.push(report.training.workouts + " workouts");
    if (report.prCount) stats.push(report.prCount + " PRs");
    if (report.weight.available) stats.push(formatSigned(report.weight.change, 1) + " lb");
    if (!stats.length && report.nutrition.available) stats.push(report.nutrition.loggedDays + " nutrition days");
    return '<section class="monthly-report-entry-card">' +
        '<div class="monthly-report-entry-art" aria-hidden="true"><img src="assets/level-up-logo.svg" alt=""></div>' +
        '<div class="monthly-report-entry-copy">' +
            '<div class="monthly-report-entry-kicker"><span>MONTHLY REPORT</span><b>' + (report.isCurrent ? "LIVE" : "READY") + '</b></div>' +
            '<h3>' + escapeHtml(report.label) + '</h3>' +
            '<p>Training, progress and useful next steps in one place.</p>' +
            '<small>' + escapeHtml(stats.join(" · ") || "Your month in review") + '</small>' +
        '</div>' +
        '<button type="button" class="monthly-report-entry-action" data-monthly-report-open>View Report</button>' +
    '</section>';
}

function openMonthlyReportsHub(progressPage, preferred) {
    progressPage.hidden = true;
    const old = document.querySelector("[data-monthly-report-screen]");
    if (old) old.remove();
    const screen = document.createElement("section");
    screen.className = "monthly-report-screen";
    screen.dataset.monthlyReportScreen = "";
    screen.innerHTML = renderHub(preferred);
    progressPage.insertAdjacentElement("afterend", screen);
    bindHub(screen, progressPage, preferred);
    window.scrollTo({ top: 0, behavior: "auto" });
}

function renderHub(preferred) {
    const months = availableMonths();
    const chosen = months.indexOf(preferred) >= 0 ? preferred : months[0];
    const report = buildMonthlyReport(chosen);
    const previous = months.filter(function (month) { return month !== chosen; });
    return '<header class="monthly-report-screen-head">' +
        '<button type="button" class="monthly-report-back" data-monthly-hub-back>← Progress</button>' +
        '<span class="eyebrow">LEVEL UP REPORTS</span><h2>Monthly Reports</h2>' +
        '<p>Your training, nutrition and progress—organized into a useful month-by-month review.</p></header>' +
        '<section class="monthly-report-featured"><div><span>' + (report.isCurrent ? "CURRENT MONTH" : "LATEST REPORT") + '</span>' +
        '<h3>' + escapeHtml(report.label) + '</h3><p>' + escapeHtml(hubSummary(report)) + '</p></div>' +
        '<button class="primary-btn" type="button" data-monthly-view="' + chosen + '">View Report</button></section>' +
        '<div class="monthly-report-history-head"><h3>Previous Reports</h3><small>Rebuilt from your saved Level Up history</small></div>' +
        '<div class="monthly-report-history">' +
        (previous.length ? previous.map(function (month) { return renderHistoryRow(buildMonthlyReport(month)); }).join("") :
        '<p class="monthly-report-empty">Previous months will appear here as you build history.</p>') +
        '</div>';
}

function renderHistoryRow(report) {
    const bits = [];
    if (report.training.workouts) bits.push(report.training.workouts + " workouts");
    if (report.prCount) bits.push(report.prCount + " PRs");
    if (report.weight.available) bits.push(formatSigned(report.weight.change, 1) + " lb");
    return '<button type="button" class="monthly-report-history-row" data-monthly-view="' + report.monthKey + '">' +
        '<span><strong>' + escapeHtml(report.label) + '</strong><small>' + escapeHtml(bits.join(" · ") || "Report available") + '</small></span><b>›</b></button>';
}

function bindHub(screen, progressPage, preferred) {
    const back = screen.querySelector("[data-monthly-hub-back]");
    if (back) back.addEventListener("click", function () { closeMonthlyScreen(screen, progressPage); });
    screen.querySelectorAll("[data-monthly-view]").forEach(function (button) {
        button.addEventListener("click", function () { renderReportView(screen, progressPage, button.dataset.monthlyView || preferred); });
    });
}

function renderReportView(screen, progressPage, monthKey) {
    const report = buildMonthlyReport(monthKey);
    markSeen(monthKey);
    screen.innerHTML = renderReport(report);
    bindReport(screen, progressPage, report);
    window.scrollTo({ top: 0, behavior: "auto" });
}

function closeMonthlyScreen(screen, progressPage) {
    screen.remove();
    progressPage.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
}

function renderReport(report) {
    const sections = [];
    if (report.training.workouts) sections.push(renderConsistency(report));
    if (report.strength.available) sections.push(renderStrength(report));
    if (report.muscles.available) sections.push(renderMuscles(report));
    if (report.weight.available) sections.push(renderWeight(report));
    if (report.nutrition.available) sections.push(renderNutrition(report));
    if (report.rir.available || report.cardio.available) sections.push(renderEffortCardio(report));
    sections.push(renderImprovement(report));
    sections.push(renderFocus(report));

    let overviewExtras = "";
    if (report.nutrition.available) overviewExtras += '<div><span>Avg calories</span><strong>' + Math.round(report.nutrition.averageCalories).toLocaleString() + '</strong></div>';
    if (report.weight.available) overviewExtras += '<div><span>Weight rate</span><strong>' + (Number.isFinite(report.weight.weeklyRate) ? formatSigned(report.weight.weeklyRate, 2) + " lb/wk" : "—") + '</strong></div>';

    return '<header class="monthly-report-view-head">' +
        '<button type="button" class="monthly-report-back" data-monthly-report-back>← Reports</button>' +
        '<div class="monthly-report-head-actions"><button type="button" data-monthly-share>Share Summary</button><button type="button" data-monthly-pdf>Export PDF</button></div></header>' +
        '<section class="monthly-report-hero">' +
            '<img src="assets/level-up-logo.svg" alt="Level Up" class="monthly-report-logo">' +
            '<span class="eyebrow">' + (report.isCurrent ? "MONTH IN PROGRESS" : "MONTHLY PERFORMANCE REPORT") + '</span>' +
            '<h1>' + escapeHtml(report.label) + '</h1><p>' + escapeHtml(report.overviewLine) + '</p>' +
            '<div class="monthly-report-hero-metrics">' +
                metricBlock(report.training.workouts, "Workouts") +
                metricBlock(report.prCount, "PRs") +
                metricBlock(report.training.activeDays, "Active days") +
                metricBlock(report.training.workingSets, "Working sets") +
            '</div>' +
            (report.weight.available ? '<div class="monthly-report-hero-highlight"><span>Trend weight</span><strong>' + formatSigned(report.weight.change, 1) + ' lb</strong></div>' : '') +
        '</section>' +
        '<nav class="monthly-report-section-nav" aria-label="Report sections">' +
            '<button type="button" data-report-jump="monthly-section-overview">Overview</button>' +
            (report.training.workouts ? '<button type="button" data-report-jump="monthly-section-consistency">Training</button>' : '') +
            (report.strength.available ? '<button type="button" data-report-jump="monthly-section-strength">Strength</button>' : '') +
            (report.muscles.available ? '<button type="button" data-report-jump="monthly-section-muscles">Muscles</button>' : '') +
            '<button type="button" data-report-jump="monthly-section-focus">Focus</button>' +
        '</nav>' +
        '<section class="monthly-report-overview" id="monthly-section-overview">' +
            '<div><span>Training time</span><strong>' + formatDuration(report.training.durationMinutes) + '</strong></div>' +
            '<div><span>Avg / week</span><strong>' + report.training.workoutsPerWeek.toFixed(1) + '</strong></div>' +
            overviewExtras +
        '</section>' +
        sections.join("") +
        '<footer class="monthly-report-footer-actions"><button class="secondary-btn" type="button" data-monthly-share>Share Summary</button>' +
        '<button class="primary-btn" type="button" data-monthly-pdf>Export Full PDF</button><p data-monthly-export-status aria-live="polite"></p></footer>';
}

function metricBlock(value, label) {
    return '<div><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>';
}

function renderConsistency(report) {
    const days = daysInMonth(report.monthKey);
    const workoutDays = new Set(report.training.sessions.map(function (session) { return String(session.date || ""); }));
    const parts = report.monthKey.split("-").map(Number);
    const firstWeekday = new Date(parts[0], parts[1] - 1, 1, 12).getDay();
    const todayKey = localDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push('<span class="is-empty"></span>');
    for (let day = 1; day <= days; day += 1) {
        const key = report.monthKey + "-" + String(day).padStart(2, "0");
        const classes = [];
        if (workoutDays.has(key)) classes.push("is-workout");
        if (key > todayKey) classes.push("is-future");
        cells.push('<span class="' + classes.join(" ") + '">' + day + '</span>');
    }
    const delta = report.training.previousWorkouts == null ? null : report.training.workouts - report.training.previousWorkouts;
    return '<section class="monthly-report-card" id="monthly-section-consistency">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">CONSISTENCY</span><h2>Training consistency</h2><p>Every completed workout across the month.</p></div>' +
        '<strong>' + report.training.workoutsPerWeek.toFixed(1) + '<small>/week</small></strong></div>' +
        '<div class="monthly-calendar-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>' +
        '<div class="monthly-calendar-grid">' + cells.join("") + '</div>' +
        '<div class="monthly-report-three">' +
            metricBlock(report.training.workouts, "Workouts") +
            metricBlock(formatDuration(report.training.durationMinutes), "Training time") +
            metricBlock(report.training.longestStreak, "Day streak") +
        '</div>' +
        (delta != null && delta !== 0 ? '<p class="monthly-report-insight">' + (delta > 0 ? "↑" : "↓") + " " + Math.abs(delta) + " workout" + (Math.abs(delta) === 1 ? "" : "s") + " " + (delta > 0 ? "more" : "fewer") + " than " + escapeHtml(labelForMonth(shiftMonth(report.monthKey, -1))) + '.</p>' : '') +
    '</section>';
}

function renderStrength(report) {
    return '<section class="monthly-report-card" id="monthly-section-strength">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">STRENGTH</span><h2>You got stronger</h2><p>First-to-latest comparable performance this month.</p></div>' +
        '<strong>' + report.prCount + '<small>PRs</small></strong></div>' +
        '<div class="monthly-strength-bars">' + barRows(report.strength.improvements.map(function (item) { return { label: item.name, value: item.percent, suffix: "%" }; }), 5) + '</div>' +
        (report.strength.best ? '<div class="monthly-pr-highlight"><span>BIGGEST IMPROVEMENT</span><strong>' + escapeHtml(report.strength.best.name) + '</strong><b>+' + report.strength.best.percent.toFixed(1) + '%</b></div>' : '') +
    '</section>';
}

function renderMuscles(report) {
    const top = report.muscles.rows.slice(0, 8);
    return '<section class="monthly-report-card" id="monthly-section-muscles">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">MUSCLE DEVELOPMENT</span><h2>What you trained</h2>' +
        '<p>Effective sets use full credit for primary muscles and partial credit for secondary muscles.</p></div></div>' +
        '<div class="monthly-muscle-visual"><div class="monthly-muscle-silhouette" aria-hidden="true">' + muscleSilhouette(top) + '</div>' +
        '<div class="monthly-muscle-bars">' + barRows(top.map(function (row) { return { label: row.name, value: row.sets, suffix: "" }; }), 8) + '</div></div>' +
    '</section>';
}

function renderWeight(report) {
    return '<section class="monthly-report-card" id="monthly-section-weight">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">BODY WEIGHT</span><h2>Weight & goal</h2><p>Smoothed from your logged weigh-ins.</p></div>' +
        '<strong>' + formatSigned(report.weight.change, 1) + '<small>lb</small></strong></div>' +
        lineChartSvg(report.weight.points, "trend", report.weight.targetLine, "Weight trend chart") +
        '<div class="monthly-report-four">' +
            smallStat("Start", report.weight.start.toFixed(1) + " lb") +
            smallStat("End", report.weight.end.toFixed(1) + " lb") +
            smallStat("Rate", Number.isFinite(report.weight.weeklyRate) ? formatSigned(report.weight.weeklyRate, 2) + "/wk" : "—") +
            smallStat("Goal", Number.isFinite(report.weight.targetWeeklyRate) ? formatSigned(report.weight.targetWeeklyRate, 2) + "/wk" : "—") +
        '</div><p class="monthly-report-insight">' + escapeHtml(report.weight.insight) + '</p></section>';
}

function renderNutrition(report) {
    const n = report.nutrition;
    let protein = "";
    if (n.proteinTarget) {
        protein = '<div class="monthly-protein-strip" aria-label="Protein target consistency">' +
            n.daily.map(function (day) {
                const height = Math.max(18, Math.min(100, day.protein / n.proteinTarget * 100));
                return '<i class="' + (day.protein >= n.proteinTarget ? "hit" : "") + '" style="height:' + height + '%"></i>';
            }).join("") + '</div>' +
            '<p class="monthly-report-insight">Protein target reached on <strong>' + n.proteinHitDays + " of " + n.loggedDays + '</strong> logged days.</p>';
    }
    return '<section class="monthly-report-card" id="monthly-section-nutrition">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">NUTRITION</span><h2>Fueling the month</h2><p>Only logged days are included in averages.</p></div>' +
        '<strong>' + n.loggedDays + '<small>logged days</small></strong></div>' +
        twoLineChartSvg(n.chartPoints, "calories", "expenditure", "Calories and expenditure chart") +
        '<div class="monthly-report-four">' +
            smallStat("Avg intake", Math.round(n.averageCalories).toLocaleString()) +
            smallStat("Avg protein", Math.round(n.averageProtein) + " g") +
            smallStat("Expenditure", Number.isFinite(n.averageExpenditure) ? Math.round(n.averageExpenditure).toLocaleString() : "—") +
            smallStat("Balance", Number.isFinite(n.averageBalance) ? formatSigned(Math.round(n.averageBalance), 0) : "—") +
        '</div>' + protein + '</section>';
}

function renderEffortCardio(report) {
    let rir = "";
    if (report.rir.available) {
        rir = '<div class="monthly-effort-layout"><div class="monthly-rir-ring"><strong>' + report.rir.count + '</strong><span>RIR sets</span></div>' +
            '<div class="monthly-rir-list">' + [0,1,2,3,4].map(function (value) {
                return '<div><span>' + (value === 4 ? "4+" : value) + ' RIR</span><i><b style="width:' + report.rir.percentages[value] + '%"></b></i><strong>' + report.rir.percentages[value].toFixed(0) + '%</strong></div>';
            }).join("") + '</div></div>';
    }
    let cardio = "";
    if (report.cardio.available) {
        cardio = '<div class="monthly-cardio-summary">' +
            metricBlock(report.cardio.sessions, "Sessions") +
            metricBlock(Math.round(report.cardio.duration), "Minutes") +
            metricBlock(report.cardio.distanceKm.toFixed(report.cardio.distanceKm >= 10 ? 1 : 2), "km") +
        '</div>';
    }
    return '<section class="monthly-report-card" id="monthly-section-effort">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">EFFORT & CARDIO</span><h2>How you trained</h2><p>Shown only when enough data is available.</p></div></div>' +
        rir + cardio + '</section>';
}

function renderImprovement(report) {
    const items = report.improvements.length ? report.improvements : [{ title: "Consistency", value: report.training.workouts + " workouts", note: "Your monthly baseline" }];
    return '<section class="monthly-report-card monthly-report-improved" id="monthly-section-improved">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">WHAT IMPROVED</span><h2>Your wins this month</h2><p>Positive movement worth keeping.</p></div></div>' +
        '<div class="monthly-improvement-grid">' + items.slice(0,3).map(function (item) {
            return '<article><span>' + escapeHtml(item.title) + '</span><strong>' + escapeHtml(item.value) + '</strong><p>' + escapeHtml(item.note) + '</p></article>';
        }).join("") + '</div></section>';
}

function renderFocus(report) {
    const nextLabel = labelForMonth(shiftMonth(report.monthKey, 1), true);
    return '<section class="monthly-report-card monthly-report-focus" id="monthly-section-focus">' +
        '<div class="monthly-report-card-head"><div><span class="eyebrow">NEXT MONTH</span><h2>Focus for ' + escapeHtml(nextLabel) + '</h2>' +
        '<p>A maximum of three priorities with enough supporting data.</p></div></div>' +
        '<div class="monthly-focus-list">' + report.recommendations.map(function (item, index) {
            return '<article><b>0' + (index + 1) + '</b><div><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.reason) + '</p><span>Target: ' + escapeHtml(item.target) + '</span></div></article>';
        }).join("") + '</div>' +
        '<div class="monthly-keep-doing"><h3>Keep doing</h3>' + report.keepDoing.map(function (item) { return '<p>✓ ' + escapeHtml(item) + '</p>'; }).join("") + '</div>' +
    '</section>';
}

function smallStat(label, value) {
    return '<div><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
}

function bindReport(screen, progressPage, report) {
    const back = screen.querySelector("[data-monthly-report-back]");
    if (back) back.addEventListener("click", function () {
        screen.innerHTML = renderHub(report.monthKey);
        bindHub(screen, progressPage, report.monthKey);
        window.scrollTo({ top: 0, behavior: "auto" });
    });
    screen.querySelectorAll("[data-report-jump]").forEach(function (button) {
        button.addEventListener("click", function () {
            const target = document.getElementById(button.dataset.reportJump);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
    screen.querySelectorAll("[data-monthly-share]").forEach(function (button) {
        button.addEventListener("click", function () { shareReportSummary(report, screen); });
    });
    screen.querySelectorAll("[data-monthly-pdf]").forEach(function (button) {
        button.addEventListener("click", function () { exportPdf(report, screen, button); });
    });
}

export function buildMonthlyReport(monthKey) {
    const bounds = monthBounds(monthKey);
    const allSessions = readArray(SESSION_KEY).filter(function (session) { return session && session.isDemo !== true; });
    const sessions = allSessions.filter(function (session) { return inMonth(session.date, monthKey); }).sort(byDate);
    const previousMonth = shiftMonth(monthKey, -1);
    const previousSessions = allSessions.filter(function (session) { return inMonth(session.date, previousMonth); });
    const weights = readArray(WEIGHT_KEY).filter(validWeight).sort(byDate);
    const foodLog = readFoodLog();
    const phase = phaseForMonth(monthKey);
    const training = trainingSummary(sessions, previousSessions, bounds);
    const prCounts = calculatePrCounts(allSessions);
    const prCount = sessions.reduce(function (sum, session) { return sum + Number(prCounts.get(String(session.id)) || 0); }, 0);
    const strength = strengthSummary(sessions);
    const muscles = muscleSummary(sessions, bounds);
    const weight = weightSummary(weights, monthKey, phase);
    const nutrition = nutritionSummary(foodLog, monthKey, phase);
    const cardio = cardioSummary(allSessions, bounds);
    const rir = rirSummary(sessions);
    const previous = {
        training: trainingSummary(previousSessions, null, monthBounds(previousMonth)),
        nutrition: nutritionSummary(foodLog, previousMonth, phaseForMonth(previousMonth))
    };
    const generatedRecommendations = recommendationEngine({ training: training, muscles: muscles, weight: weight, nutrition: nutrition, rir: rir, previous: previous });
    const generatedKeepDoing = keepDoingEngine({ training: training, strength: strength, weight: weight, nutrition: nutrition, rir: rir });
    const improvements = improvementEngine({ training: training, strength: strength, weight: weight, nutrition: nutrition, previous: previous });
    const isCurrent = monthKey === monthKeyForDate(new Date());
    const snapshot = isCurrent ? null : getOrCreateSnapshot(monthKey, phase, generatedRecommendations, generatedKeepDoing);

    return {
        version: REPORT_VERSION,
        monthKey: monthKey,
        label: labelForMonth(monthKey),
        isCurrent: isCurrent,
        bounds: bounds,
        phase: snapshot && snapshot.phase ? snapshot.phase : phase,
        training: training,
        prCount: prCount,
        strength: strength,
        muscles: muscles,
        weight: weight,
        nutrition: nutrition,
        cardio: cardio,
        rir: rir,
        recommendations: snapshot && Array.isArray(snapshot.recommendations) ? snapshot.recommendations : generatedRecommendations,
        keepDoing: snapshot && Array.isArray(snapshot.keepDoing) ? snapshot.keepDoing : generatedKeepDoing,
        improvements: improvements,
        overviewLine: overviewLine(training, strength, weight, nutrition)
    };
}

function trainingSummary(sessions, previousSessions, bounds) {
    const activeDays = new Set(sessions.map(function (session) { return session.date; }).filter(Boolean));
    const workingSets = sessions.reduce(function (total, session) { return total + countRecordedSets(session); }, 0);
    const durationMinutes = sessions.reduce(function (total, session) {
        return total + Math.max(0, Number(session.durationMinutes) || Number(session.durationMs) / 60000 || 0);
    }, 0);
    const totalDays = daysInMonth(bounds.monthKey);
    const coveredDays = Math.max(1, Math.min(totalDays, bounds.isCurrent ? new Date().getDate() : totalDays));
    return {
        sessions: sessions,
        workouts: sessions.length,
        previousWorkouts: Array.isArray(previousSessions) ? previousSessions.length : null,
        activeDays: activeDays.size,
        workingSets: workingSets,
        durationMinutes: durationMinutes,
        workoutsPerWeek: sessions.length / Math.max(1, coveredDays / 7),
        longestStreak: longestDateStreak(Array.from(activeDays))
    };
}

function strengthSummary(sessions) {
    const records = new Map();
    sessions.forEach(function (session) {
        (session.exercises || []).forEach(function (exercise) {
            if (exercise && exercise.trackingType === "notes") return;
            const id = String(exercise.exerciseId || exercise.id || "");
            if (!id) return;
            const best = bestWeightedSet(exercise.sets || []);
            if (!best) return;
            const profileId = String(exercise.equipmentProfileId || "default");
            const key = id + "::" + profileId;
            if (!records.has(key)) {
                records.set(key, {
                    id: id,
                    name: exerciseName(id) + (profileId !== "default" && exercise.equipmentProfileName ? " · " + exercise.equipmentProfileName : ""),
                    points: []
                });
            }
            records.get(key).points.push({ date: session.date, value: best.e1rm });
        });
    });
    const improvements = Array.from(records.values()).map(function (record) {
        const points = record.points;
        if (points.length < 2) return null;
        points.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
        const first = points[0];
        const last = points[points.length - 1];
        if (!(first.value > 0) || last.value <= first.value) return null;
        return { id: record.id, name: record.name, first: first.value, last: last.value, percent: (last.value - first.value) / first.value * 100 };
    }).filter(Boolean).sort(function (a, b) { return b.percent - a.percent; }).slice(0, 5);
    return { available: improvements.length > 0, improvements: improvements, best: improvements[0] || null };
}

function muscleSummary(sessions, bounds) {
    const totals = new Map();
    sessions.forEach(function (session) {
        (session.exercises || []).forEach(function (exercise) {
            if (exercise && exercise.trackingType === "notes") return;
            const sets = (exercise.sets || []).filter(isRecordedSet).length;
            if (!sets) return;
            getExerciseImpacts(exercise).forEach(function (credit, muscle) {
                totals.set(muscle, (totals.get(muscle) || 0) + sets * credit);
            });
        });
    });
    const rows = Array.from(totals.entries()).map(function (entry) { return { name: entry[0], sets: round1(entry[1]) }; })
        .sort(function (a, b) { return b.sets - a.sets; });
    const totalDays = daysInMonth(bounds.monthKey);
    const coveredDays = Math.max(1, Math.min(totalDays, bounds.isCurrent ? new Date().getDate() : totalDays));
    return { available: rows.length > 0, rows: rows, weeks: coveredDays / 7 };
}

function weightSummary(allWeights, monthKey, phase) {
    const monthWeights = allWeights.filter(function (entry) { return inMonth(entry.date, monthKey); });
    if (monthWeights.length < 4) return { available: false, count: monthWeights.length };
    const points = monthWeights.map(function (entry) {
        return { date: entry.date, weight: Number(entry.weight), trend: rollingWeightAverage(allWeights, entry.date) };
    }).filter(function (point) { return Number.isFinite(point.trend); });
    if (!points.length) return { available: false, count: monthWeights.length };

    const first = points[0];
    const last = points[points.length - 1];
    const span = (dateMs(last.date) - dateMs(first.date)) / DAY_MS;
    const change = last.trend - first.trend;
    const weeklyRate = span >= 7 ? change / span * 7 : null;
    const targetWeeklyRate = finite(phase && phase.targetWeeklyRate);
    let insight = "Your trend is based on the weigh-ins you recorded this month.";
    if (Number.isFinite(weeklyRate) && Number.isFinite(targetWeeklyRate)) {
        const tolerance = Math.max(0.15, Math.abs(targetWeeklyRate) * 0.3);
        const delta = weeklyRate - targetWeeklyRate;
        if (Math.abs(delta) <= tolerance) insight = "Your weight trend stayed close to your selected goal rate.";
        else if (delta > 0) insight = "Your weight trend moved faster than your selected goal rate.";
        else insight = "Your weight trend moved slower than your selected goal rate.";
    }
    return {
        available: true, count: monthWeights.length, start: first.trend, end: last.trend,
        change: change, spanDays: span, weeklyRate: weeklyRate, targetWeeklyRate: targetWeeklyRate,
        targetLine: Number.isFinite(targetWeeklyRate) && span >= 7 ? first.trend + targetWeeklyRate * span / 7 : null,
        insight: insight, points: points
    };
}

function nutritionSummary(foodLog, monthKey, phase) {
    if (!isNutritionEnabled()) return { available: false, loggedDays: 0 };
    const keys = Object.keys(foodLog || {}).filter(function (key) { return inMonth(key, monthKey); }).sort();
    const daily = keys.map(function (date) {
        const totals = summarizeEntries(foodLog[date]);
        return { date: date, calories: totals.calories, protein: totals.protein, carbs: totals.carbs, fat: totals.fat };
    }).filter(function (day) { return day.calories > 0; });
    if (daily.length < 4) return { available: false, loggedDays: daily.length };

    const averageCalories = average(daily.map(function (day) { return day.calories; }));
    const averageProtein = average(daily.map(function (day) { return day.protein; }));
    const proteinTarget = activeProteinTarget();
    const proteinHitDays = proteinTarget ? daily.filter(function (day) { return day.protein >= proteinTarget; }).length : 0;
    const expenditureHistory = getCalculatedMaintenanceHistory(null, { startDate: monthKey + "-01" })
        .filter(function (point) { return inMonth(point.date, monthKey); })
        .map(function (point) {
            return { date: point.date, expenditure: finite(point.liveMaintenanceCalories) != null ? finite(point.liveMaintenanceCalories) : finite(point.maintenanceCalories) };
        }).filter(function (point) { return Number.isFinite(point.expenditure); });

    const byDate = new Map(expenditureHistory.map(function (point) { return [point.date, point.expenditure]; }));
    let lastExpenditure = null;
    const chartPoints = daily.map(function (day) {
        const exact = byDate.get(day.date);
        if (Number.isFinite(exact)) lastExpenditure = exact;
        return { date: day.date, calories: day.calories, protein: day.protein, expenditure: Number.isFinite(exact) ? exact : lastExpenditure };
    });
    const usableExpenditure = chartPoints.map(function (point) { return point.expenditure; }).filter(Number.isFinite);
    const averageExpenditure = usableExpenditure.length ? average(usableExpenditure) : null;
    const calorieTarget = finite(phase && phase.currentCalories) != null ? finite(phase.currentCalories) :
        finite(phase && phase.startCalories) != null ? finite(phase.startCalories) : finite(getNutritionPlan().calculatedCalories);

    return {
        available: true, loggedDays: daily.length, daily: daily, averageCalories: averageCalories, averageProtein: averageProtein,
        calorieTarget: calorieTarget, proteinTarget: proteinTarget, proteinHitDays: proteinHitDays,
        proteinHitRate: proteinTarget ? proteinHitDays / daily.length : null, averageExpenditure: averageExpenditure,
        averageBalance: Number.isFinite(averageExpenditure) ? averageCalories - averageExpenditure : null, chartPoints: chartPoints
    };
}

function cardioSummary(sessions, bounds) {
    const end = new Date(bounds.end + "T23:59:59");
    const entries = collectCardioEntries(sessions, end, 0).filter(function (entry) {
        return entry.timestamp >= dateMs(bounds.start) && entry.timestamp <= dateMs(bounds.end) + DAY_MS - 1;
    });
    if (!entries.length) return { available: false, sessions: 0 };
    const summary = summarizeCardio(entries);
    return Object.assign({ available: true, entries: entries }, summary);
}

function rirSummary(sessions) {
    const values = [];
    sessions.forEach(function (session) {
        (session.exercises || []).forEach(function (exercise) {
            (exercise.sets || []).forEach(function (set) {
                const value = finite(set.rir);
                if (value != null) values.push(Math.max(0, Math.min(4, Math.round(value))));
            });
        });
    });
    if (values.length < 8) return { available: false, count: values.length };
    const counts = [0,0,0,0,0];
    values.forEach(function (value) { counts[value] += 1; });
    const percentages = counts.map(function (count) { return count / values.length * 100; });
    return { available: true, count: values.length, counts: counts, percentages: percentages, failureShare: percentages[0] / 100 };
}

function recommendationEngine(context) {
    const training = context.training, muscles = context.muscles, weight = context.weight, nutrition = context.nutrition, rir = context.rir, previous = context.previous;
    const candidates = [];
    if (training.workoutsPerWeek < 2.5 && training.workouts >= 2) {
        candidates.push({ score: 80, title: "Build training consistency", reason: "You averaged " + training.workoutsPerWeek.toFixed(1) + " workouts per week this month.", target: "Aim for a repeatable 3+ sessions/week if that matches your plan." });
    } else if (previous.training.workouts >= 4 && training.workouts <= previous.training.workouts - 3) {
        candidates.push({ score: 72, title: "Restore your normal training rhythm", reason: "You completed " + training.workouts + " workouts versus " + previous.training.workouts + " last month.", target: "Return toward last month’s sustainable frequency." });
    }

    if (muscles.available && muscles.rows.length >= 3) {
        const top = muscles.rows[0];
        const low = muscles.rows.slice().reverse().find(function (row) { return row.sets >= 2; });
        const topWeekly = top.sets / Math.max(1, muscles.weeks);
        const lowWeekly = low ? low.sets / Math.max(1, muscles.weeks) : null;
        if (low && top.name !== low.name && topWeekly >= 8 && lowWeekly < topWeekly * 0.55) {
            candidates.push({ score: 64, title: "Review " + low.name.toLowerCase() + " volume", reason: low.name + " received about " + lowWeekly.toFixed(1) + " effective sets/week versus " + topWeekly.toFixed(1) + " for " + top.name + ".", target: "If it is a priority, add 2–3 effective sets/week before adding more elsewhere." });
        }
    }

    if (nutrition.available && nutrition.proteinTarget && nutrition.proteinHitRate < 0.75) {
        candidates.push({ score: 88, title: "Improve protein consistency", reason: "You reached your protein target on " + nutrition.proteinHitDays + " of " + nutrition.loggedDays + " logged days.", target: "Hit your protein target on at least 6 days/week." });
    }

    if (weight.available && Number.isFinite(weight.weeklyRate) && Number.isFinite(weight.targetWeeklyRate)) {
        const tolerance = Math.max(0.15, Math.abs(weight.targetWeeklyRate) * 0.35);
        const diff = weight.weeklyRate - weight.targetWeeklyRate;
        if (Math.abs(diff) > tolerance) {
            candidates.push({
                score: 92,
                title: diff > 0 ? "Steady the rate of weight change" : "Bring weight change closer to target",
                reason: "Your trend moved " + formatSigned(weight.weeklyRate, 2) + " lb/week against a " + formatSigned(weight.targetWeeklyRate, 2) + " lb/week goal.",
                target: diff > 0 ? "Avoid increasing calories further until the next check-in." : "Use the next nutrition check-in before making a large calorie change."
            });
        }
    }

    if (rir.available && rir.failureShare > 0.35) {
        candidates.push({ score: 70, title: "Use failure more selectively", reason: Math.round(rir.failureShare * 100) + "% of recorded RIR sets finished at 0 RIR.", target: "Keep more compound working sets around 1–2 RIR unless the exercise calls for failure." });
    }

    const chosen = candidates.sort(function (a, b) { return b.score - a.score; }).slice(0, 3).map(function (item) {
        return { title: item.title, reason: item.reason, target: item.target };
    });
    if (!chosen.length) chosen.push({ title: "Keep the plan steady", reason: "The data available this month does not show a strong reason for a major change.", target: "Repeat the habits that are producing consistent training." });
    return chosen;
}

function keepDoingEngine(context) {
    const training = context.training, strength = context.strength, weight = context.weight, nutrition = context.nutrition, rir = context.rir;
    const items = [];
    if (training.workoutsPerWeek >= 3) items.push("Your current training frequency");
    if (strength.available) items.push("The exercises that are still progressing");
    if (nutrition.available && nutrition.proteinHitRate >= 0.8) items.push("Your current protein routine");
    if (weight.available && Number.isFinite(weight.weeklyRate) && Number.isFinite(weight.targetWeeklyRate) &&
        Math.abs(weight.weeklyRate - weight.targetWeeklyRate) <= Math.max(0.15, Math.abs(weight.targetWeeklyRate) * 0.3)) items.push("Your current rate of weight change");
    if (rir.available && rir.failureShare <= 0.25) items.push("Your current effort distribution");
    if (!items.length) items.push("Keep logging consistently so Level Up can make stronger comparisons");
    return items.slice(0, 4);
}

function improvementEngine(context) {
    const training = context.training, strength = context.strength, weight = context.weight, nutrition = context.nutrition, previous = context.previous;
    const items = [];
    if (strength.best) items.push({ title: "Strength", value: "+" + strength.best.percent.toFixed(1) + "%", note: strength.best.name });
    const workoutDelta = previous.training.workouts ? training.workouts - previous.training.workouts : 0;
    if (workoutDelta > 0) items.push({ title: "Consistency", value: "+" + workoutDelta + " workouts", note: "Compared with last month" });
    if (nutrition.available && previous.nutrition.available && nutrition.proteinTarget && previous.nutrition.proteinTarget) {
        const delta = nutrition.proteinHitDays - previous.nutrition.proteinHitDays;
        if (delta > 0) items.push({ title: "Protein", value: "+" + delta + " target days", note: "Compared with last month" });
    }
    if (weight.available && Number.isFinite(weight.weeklyRate) && Number.isFinite(weight.targetWeeklyRate) &&
        Math.abs(weight.weeklyRate - weight.targetWeeklyRate) <= Math.max(0.15, Math.abs(weight.targetWeeklyRate) * 0.3)) {
        items.push({ title: "Goal pace", value: "On track", note: "Weight trend stayed near target" });
    }
    return items.slice(0, 3);
}

function overviewLine(training, strength, weight, nutrition) {
    const bits = [];
    if (training.workouts) bits.push(training.workouts + " completed workouts");
    if (strength.available) bits.push("measurable strength progress");
    if (weight.available) bits.push(formatSigned(weight.change, 1) + " lb trend change");
    if (nutrition.available) bits.push(nutrition.loggedDays + " nutrition days");
    return bits.length ? capitalize(bits.join(", ")) + "." : "Your report will become richer as you log training and progress.";
}

function activeProteinTarget() {
    const preference = getNutritionMacroPreference() || {};
    const manual = Number(preference.manualMacros && preference.manualMacros.protein);
    if (preference.useManual === true && manual > 0) return manual;
    const auto = Number(preference.autoBaseline && preference.autoBaseline.protein);
    if (auto > 0) return auto;

    const profile = getNutritionProfile() || {};
    const calories = Number(getNutritionPlan().calculatedCalories);
    const weightKg = Number(profile.weightKg) > 0 ? Number(profile.weightKg) :
        Number(profile.weightLb) > 0 ? poundsToKg(Number(profile.weightLb)) : null;
    if (!(weightKg > 0) || !(calories > 0)) return null;
    const calculated = calculateMacroTargets({ calories: calories, weightKg: weightKg, macroPreset: preference.macroPreset || "balanced" });
    return Number(calculated && calculated.protein) || null;
}

function phaseForMonth(monthKey) {
    const phases = readArray(PHASES_KEY);
    const bounds = monthBounds(monthKey);
    return phases.slice().reverse().find(function (phase) {
        return String(phase && phase.startDate || "") <= bounds.end &&
            (!(phase && phase.endDate) || String(phase.endDate) >= bounds.start);
    }) || null;
}

function getOrCreateSnapshot(monthKey, phase, recommendations, keepDoing) {
    const all = readObject(SNAPSHOT_KEY) || {};
    if (all[monthKey] && all[monthKey].version === REPORT_VERSION) return all[monthKey];
    const snapshot = { version: REPORT_VERSION, generatedAt: new Date().toISOString(), phase: phase || null, recommendations: recommendations, keepDoing: keepDoing };
    all[monthKey] = snapshot;
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(all));
    return snapshot;
}

async function exportPdf(report, screen, button) {
    const status = screen.querySelector("[data-monthly-export-status]");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Preparing…";
    if (status) status.textContent = "Building your Level Up report…";
    try {
        const logoSvg = await fetch("assets/level-up-logo.svg").then(function (response) { return response.ok ? response.text() : ""; });
        const html = buildPdfHtml(report, logoSvg);
        const result = await shareNativePdfFile({ html: html, filename: "Level-Up-" + report.monthKey + "-Performance-Report.pdf" });
        if (!result) throw new Error("PDF export is available in the iOS app.");
        if (status) status.textContent = result.cancelled ? "PDF export cancelled." : "PDF ready to save or share.";
    } catch (error) {
        console.error("Monthly report PDF export failed:", error);
        if (status) status.textContent = error && error.message ? error.message : "The PDF could not be created.";
    } finally {
        button.disabled = false;
        button.textContent = original;
    }
}

function buildPdfHtml(report, logoSvg) {
    const logo = logoSvg ? '<div class="brand-logo">' + logoSvg + '</div>' : '<div class="brand-fallback">LEVEL UP</div>';
    const profile = getNutritionProfile() || {};
    const displayName = String(profile.displayName || "").trim();
    const pages = [];
    let pdfPage = 2;

    pages.push('<section class="pdf-page pdf-cover">' + logo +
        '<div class="cover-rule"></div><span>MONTHLY PERFORMANCE REPORT</span><h1>' + escapeHtml(report.label) + '</h1>' +
        (displayName ? '<h2>' + escapeHtml(displayName) + '</h2>' : '') +
        '<p>Training. Progress. Better decisions.</p>' +
        '<div class="pdf-kpis">' +
            pdfKpi(report.training.workouts, "WORKOUTS") + pdfKpi(report.prCount, "PRS") +
            pdfKpi(report.training.activeDays, "ACTIVE DAYS") + pdfKpi(report.training.workingSets, "WORKING SETS") +
        '</div>' +
        (report.weight.available ? '<div class="cover-highlight">TREND WEIGHT <b>' + formatSigned(report.weight.change, 1) + ' lb</b></div>' : '') +
        '<footer>LEVEL UP · TRACK. PROGRESS. IMPROVE.</footer></section>');

    pages.push('<section class="pdf-page">' + pdfHeader(logo, report, "Executive Summary") +
        '<div class="pdf-summary-grid">' +
            pdfSummary(report.training.workouts, "Workouts") +
            pdfSummary(formatDuration(report.training.durationMinutes), "Training time") +
            pdfSummary(report.prCount, "PRs") +
            pdfSummary(report.training.activeDays, "Active days") +
            (report.weight.available ? pdfSummary(formatSigned(report.weight.change, 1) + " lb", "Trend change") : '') +
            (report.nutrition.available ? pdfSummary(Math.round(report.nutrition.averageProtein) + " g", "Avg protein") : '') +
        '</div><div class="pdf-panel"><h2>Month at a glance</h2><p>' + escapeHtml(report.overviewLine) + '</p></div>' +
        '<div class="pdf-two"><div><h3>What improved</h3>' +
            (report.improvements.length ? report.improvements.map(function (item) {
                return '<p class="check"><b>✓ ' + escapeHtml(item.title) + ':</b> ' + escapeHtml(item.value) + ' · ' + escapeHtml(item.note) + '</p>';
            }).join("") : '<p class="muted">More comparisons will appear as your history grows.</p>') +
        '</div><div><h3>Focus next month</h3>' +
            report.recommendations.map(function (item) { return '<p class="focus"><b>' + escapeHtml(item.title) + '</b><br>' + escapeHtml(item.target) + '</p>'; }).join("") +
        '</div></div>' + pdfFooter(report, pdfPage++) + '</section>');

    if (report.training.workouts || report.strength.available || report.muscles.available) {
        pages.push('<section class="pdf-page">' + pdfHeader(logo, report, "Training & Strength") +
            '<div class="pdf-kpis light">' + pdfKpi(report.training.workouts, "WORKOUTS") + pdfKpi(report.training.workingSets, "WORKING SETS") +
            pdfKpi(report.training.workoutsPerWeek.toFixed(1), "PER WEEK") + pdfKpi(report.prCount, "PRS") + '</div>' +
            (report.strength.available ? '<h2>Strength improvements</h2><div class="pdf-bars">' +
                pdfBarRows(report.strength.improvements.map(function (row) { return { label: row.name, value: row.percent, suffix: "%" }; })) + '</div>' : '') +
            (report.muscles.available ? '<h2>Effective sets by muscle</h2><div class="pdf-bars">' +
                pdfBarRows(report.muscles.rows.slice(0,8).map(function (row) { return { label: row.name, value: row.sets, suffix: "" }; })) + '</div>' : '') +
            pdfFooter(report, pdfPage++) + '</section>');
    }

    if (report.weight.available) {
        pages.push('<section class="pdf-page">' + pdfHeader(logo, report, "Body Weight") +
            '<h2>Trend weight</h2><p class="lead">Daily weigh-ins are smoothed to reduce normal scale noise.</p>' +
            '<div class="pdf-chart">' + lineChartSvg(report.weight.points, "trend", report.weight.targetLine, "Weight trend chart") + '</div>' +
            '<div class="pdf-summary-grid">' +
                pdfSummary(report.weight.start.toFixed(1) + " lb", "Start") +
                pdfSummary(report.weight.end.toFixed(1) + " lb", "End") +
                pdfSummary(formatSigned(report.weight.change, 1) + " lb", "Change") +
                pdfSummary(Number.isFinite(report.weight.weeklyRate) ? formatSigned(report.weight.weeklyRate, 2) + " /wk" : "—", "Average rate") +
            '</div><div class="pdf-insight"><b>Level Up observation</b><p>' + escapeHtml(report.weight.insight) + '</p></div>' +
            pdfFooter(report, pdfPage++) + '</section>');
    }

    if (report.nutrition.available) {
        pages.push('<section class="pdf-page">' + pdfHeader(logo, report, "Nutrition") +
            '<h2>Calories & expenditure</h2><div class="pdf-chart">' +
            twoLineChartSvg(report.nutrition.chartPoints, "calories", "expenditure", "Calories and expenditure chart") + '</div>' +
            '<div class="pdf-summary-grid">' +
                pdfSummary(Math.round(report.nutrition.averageCalories).toLocaleString(), "Avg calories") +
                pdfSummary(Math.round(report.nutrition.averageProtein) + " g", "Avg protein") +
                pdfSummary(Number.isFinite(report.nutrition.averageExpenditure) ? Math.round(report.nutrition.averageExpenditure).toLocaleString() : "—", "Avg expenditure") +
                pdfSummary(report.nutrition.loggedDays, "Logged days") +
            '</div>' +
            (report.nutrition.proteinTarget ? '<div class="pdf-insight"><b>Protein consistency</b><p>Target reached on ' +
                report.nutrition.proteinHitDays + " of " + report.nutrition.loggedDays + ' logged days.</p></div>' : '') +
            pdfFooter(report, pdfPage++) + '</section>');
    }

    pages.push('<section class="pdf-page">' + pdfHeader(logo, report, "Your " + labelForMonth(shiftMonth(report.monthKey, 1), true) + " Focus") +
        '<div class="pdf-focus-list">' + report.recommendations.map(function (item, index) {
            return '<article><b>0' + (index + 1) + '</b><div><h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.reason) +
                '</p><strong>Target: ' + escapeHtml(item.target) + '</strong></div></article>';
        }).join("") + '</div><div class="pdf-keep"><h2>Keep doing</h2>' +
        report.keepDoing.map(function (item) { return '<p>✓ ' + escapeHtml(item) + '</p>'; }).join("") +
        '</div><div class="pdf-closing">KEEP PROGRESSING.</div>' + pdfFooter(report, pdfPage++) + '</section>');

    return '<!doctype html><html><head><meta charset="utf-8"><style>' + pdfCss() + '</style></head><body>' + pages.join("") + '</body></html>';
}

function pdfKpi(value, label) { return '<div><b>' + escapeHtml(value) + '</b><small>' + label + '</small></div>'; }
function pdfSummary(value, label) { return '<div><b>' + escapeHtml(value) + '</b><span>' + label + '</span></div>'; }
function pdfHeader(logo, report, title) { return '<header class="pdf-header">' + logo + '<div><small>LEVEL UP · ' + escapeHtml(report.label).toUpperCase() + '</small><h1>' + escapeHtml(title) + '</h1></div></header>'; }
function pdfFooter(report, page) { return '<footer class="pdf-footer"><span>LEVEL UP PERFORMANCE REPORT · ' + escapeHtml(report.label).toUpperCase() + '</span><b>' + page + '</b></footer>'; }

function pdfCss() {
    return '@page{size:letter;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;-webkit-print-color-adjust:exact}' +
    '.pdf-page{position:relative;min-height:736px;padding:32px 38px 46px;background:#fff;page-break-after:always;overflow:hidden}.pdf-cover{padding-top:58px}' +
    '.brand-logo{width:74px;height:74px;overflow:hidden}.brand-logo svg{display:block;width:74px;height:74px}.brand-fallback{font-size:20px;font-weight:950}' +
    '.cover-rule{width:56px;height:5px;background:#e51b26;margin:30px 0}.pdf-cover>span{font-size:12px;font-weight:850;letter-spacing:2px}.pdf-cover h1{font-size:42px;margin:8px 0 5px;letter-spacing:-1.5px}.pdf-cover h2{font-size:18px;margin:0 0 6px}.pdf-cover>p{font-size:17px;color:#555;margin:0 0 34px}' +
    '.pdf-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:25px 0}.pdf-kpis>div,.pdf-summary-grid>div{padding:16px;border:1px solid #ddd;border-radius:12px;background:#f7f7f8}.pdf-kpis b,.pdf-summary-grid b{display:block;font-size:22px}.pdf-kpis small,.pdf-summary-grid span{display:block;margin-top:4px;color:#666;font-size:9px;font-weight:800;letter-spacing:.7px}' +
    '.cover-highlight{margin-top:18px;padding:18px;border-left:5px solid #e51b26;background:#f5f5f5;font-weight:800}.cover-highlight b{float:right;color:#e51b26}.pdf-cover footer{position:absolute;bottom:38px;left:38px;font-size:9px;font-weight:800;letter-spacing:1.4px}' +
    '.pdf-header{display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:2px solid #111;margin-bottom:24px}.pdf-header .brand-logo,.pdf-header .brand-logo svg{width:42px;height:42px}.pdf-header small{font-size:8px;letter-spacing:1.2px;color:#e51b26;font-weight:900}.pdf-header h1{font-size:24px;margin:3px 0 0}' +
    '.pdf-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}.pdf-panel{padding:18px;border-radius:12px;background:#111;color:#fff;margin:14px 0}.pdf-panel h2{margin:0 0 8px;font-size:18px}.pdf-panel p{margin:0;line-height:1.5;color:#e4e4e4}' +
    '.pdf-two{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.pdf-two>div{padding:16px;border:1px solid #e0e0e0;border-radius:12px}.pdf-two h3{margin:0 0 10px}.check,.focus{font-size:11px;line-height:1.5}.check b{color:#198754}.focus b{color:#e51b26}.muted,.lead{color:#666}' +
    '.pdf-bars{display:grid;gap:8px;margin:12px 0 22px}.pdf-bar{display:grid;grid-template-columns:145px 1fr 55px;align-items:center;gap:10px;font-size:10px}.pdf-bar-track{height:10px;border-radius:999px;background:#e7e7e9;overflow:hidden}.pdf-bar-fill{height:100%;background:#e51b26}.pdf-bar strong{text-align:right}' +
    '.pdf-chart{margin:12px 0 20px;padding:12px;border:1px solid #ddd;border-radius:12px}.pdf-chart svg{display:block;width:100%;height:210px}.pdf-chart .grid line{stroke:#ddd}.pdf-chart .trend{stroke:#e51b26;stroke-width:3}.pdf-chart .second{stroke:#555}.pdf-chart circle{fill:#e51b26}.pdf-chart .target{stroke:#777;stroke-dasharray:5 4}' +
    '.pdf-insight{padding:16px;border-left:5px solid #e51b26;background:#f6f6f7;margin-top:18px}.pdf-insight b{font-size:11px;text-transform:uppercase;letter-spacing:.7px}.pdf-insight p{margin:6px 0 0;line-height:1.5}' +
    '.pdf-focus-list{display:grid;gap:14px}.pdf-focus-list article{display:grid;grid-template-columns:48px 1fr;gap:14px;padding:16px;border:1px solid #ddd;border-radius:14px}.pdf-focus-list article>b{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:#e51b26;color:#fff}.pdf-focus-list h2{font-size:16px;margin:0 0 5px}.pdf-focus-list p{font-size:11px;line-height:1.45;color:#555;margin:0 0 8px}.pdf-focus-list strong{font-size:10px;color:#e51b26}' +
    '.pdf-keep{margin-top:22px;padding:18px;background:#f4f4f5;border-radius:12px}.pdf-keep h2{margin:0 0 8px}.pdf-keep p{margin:6px 0;font-size:11px}.pdf-closing{margin-top:26px;font-size:24px;font-weight:950;letter-spacing:-.5px}.pdf-footer{position:absolute;left:38px;right:38px;bottom:24px;display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:8px;font-size:7px;color:#777;letter-spacing:.8px}';
}

async function shareReportSummary(report, screen) {
    const status = screen.querySelector("[data-monthly-export-status]");
    try {
        const blob = await summaryCardBlob(report);
        const file = typeof File === "function" ? new File([blob], "Level-Up-" + report.monthKey + "-Summary.png", { type: "image/png" }) : null;
        if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: report.label + " · Level Up" });
            if (status) status.textContent = "Summary shared.";
            return;
        }
        if (navigator.share) {
            await navigator.share({ title: report.label + " · Level Up", text: summaryText(report) });
            return;
        }
        throw new Error("Sharing is not available on this device.");
    } catch (error) {
        if (error && error.name === "AbortError") return;
        console.error("Monthly summary share failed:", error);
        if (status) status.textContent = error && error.message ? error.message : "The summary could not be shared.";
    }
}

async function summaryCardBlob(report) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, "rgba(229,27,38,.35)");
    gradient.addColorStop(.45, "rgba(229,27,38,.04)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1350);
    try {
        const logo = await loadImage("assets/level-up-logo.svg");
        ctx.drawImage(logo, 72, 68, 112, 112);
    } catch {}
    ctx.fillStyle = "#fff";
    ctx.font = "900 52px -apple-system, Arial";
    ctx.fillText("LEVEL UP", 205, 138);
    ctx.fillStyle = "#e51b26";
    ctx.font = "800 25px -apple-system, Arial";
    ctx.fillText("MONTHLY PERFORMANCE REPORT", 74, 250);
    ctx.fillStyle = "#fff";
    ctx.font = "900 76px -apple-system, Arial";
    ctx.fillText(report.label.toUpperCase(), 74, 335);

    const cards = [["WORKOUTS", report.training.workouts], ["PRS", report.prCount], ["ACTIVE DAYS", report.training.activeDays], ["WORKING SETS", report.training.workingSets]];
    cards.forEach(function (item, index) {
        const x = 74 + (index % 2) * 466;
        const y = 420 + Math.floor(index / 2) * 190;
        ctx.fillStyle = "#17171b";
        drawRoundRect(ctx, x, y, 430, 150, 24);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "900 54px -apple-system, Arial";
        ctx.fillText(String(item[1]), x + 28, y + 66);
        ctx.fillStyle = "#aaaab2";
        ctx.font = "800 21px -apple-system, Arial";
        ctx.fillText(item[0], x + 28, y + 108);
    });
    ctx.fillStyle = "#fff";
    ctx.font = "900 38px -apple-system, Arial";
    ctx.fillText("NEXT MONTH", 74, 860);
    const rec = report.recommendations[0];
    ctx.fillStyle = "#e51b26";
    ctx.font = "900 30px -apple-system, Arial";
    ctx.fillText(String(rec && rec.title || "Keep progressing").toUpperCase(), 74, 915);
    ctx.fillStyle = "#d0d0d5";
    ctx.font = "500 27px -apple-system, Arial";
    wrapCanvasText(ctx, rec && rec.target || "Keep building on this month.", 74, 965, 900, 38);
    ctx.fillStyle = "#777780";
    ctx.font = "700 19px -apple-system, Arial";
    ctx.fillText("TRACK. PROGRESS. IMPROVE.", 74, 1275);

    return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error("Image could not be created.")); }, "image/png", .95);
    });
}

function summaryText(report) {
    return report.label + " · Level Up\n" + report.training.workouts + " workouts · " + report.prCount + " PRs · " + report.training.activeDays + " active days" +
        (report.weight.available ? " · " + formatSigned(report.weight.change, 1) + " lb trend" : "");
}

function lineChartSvg(points, valueKey, target, aria) {
    const values = points.map(function (point) { return finite(point[valueKey]); }).filter(Number.isFinite);
    if (Number.isFinite(target)) values.push(target);
    if (values.length < 2) return "";
    const width = 640, height = 230, pad = 28;
    const min = Math.min.apply(null, values), max = Math.max.apply(null, values), range = Math.max(.1, max - min);
    const xy = points.map(function (point, index) {
        return { x: pad + (width - pad * 2) * (index / Math.max(1, points.length - 1)), y: height - pad - (height - pad * 2) * ((Number(point[valueKey]) - min) / range) };
    });
    const path = xy.map(function (p, index) { return (index ? "L" : "M") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(" ");
    let targetLine = "";
    if (Number.isFinite(target)) {
        const y = height - pad - (height - pad * 2) * ((target - min) / range);
        targetLine = '<line x1="' + pad + '" y1="' + y.toFixed(1) + '" x2="' + (width - pad) + '" y2="' + y.toFixed(1) + '" class="target"/>';
    }
    return '<svg class="monthly-line-chart" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + escapeHtml(aria) + '">' +
        '<g class="grid"><line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (height - pad) + '"/><line x1="' + pad + '" y1="' + (height - pad) + '" x2="' + (width - pad) + '" y2="' + (height - pad) + '"/></g>' +
        targetLine + '<path d="' + path + '" class="trend" fill="none"/>' +
        xy.map(function (p) { return '<circle cx="' + p.x + '" cy="' + p.y + '" r="3"/>'; }).join("") + '</svg>';
}

function twoLineChartSvg(points, firstKey, secondKey, aria) {
    const usable = points.filter(function (point) { return Number.isFinite(finite(point[firstKey])); });
    if (usable.length < 2) return "";
    const values = [];
    usable.forEach(function (point) {
        const a = finite(point[firstKey]), b = finite(point[secondKey]);
        if (Number.isFinite(a)) values.push(a);
        if (Number.isFinite(b)) values.push(b);
    });
    const width = 640, height = 230, pad = 28;
    const min = Math.min.apply(null, values), max = Math.max.apply(null, values), range = Math.max(1, max - min);
    function pathFor(key) {
        const coords = [];
        usable.forEach(function (point, index) {
            const value = finite(point[key]);
            if (!Number.isFinite(value)) return;
            coords.push({ x: pad + (width - pad * 2) * (index / Math.max(1, usable.length - 1)), y: height - pad - (height - pad * 2) * ((value - min) / range) });
        });
        return coords.map(function (p, index) { return (index ? "L" : "M") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(" ");
    }
    return '<svg class="monthly-line-chart" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + escapeHtml(aria) + '">' +
        '<g class="grid"><line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (height - pad) + '"/><line x1="' + pad + '" y1="' + (height - pad) + '" x2="' + (width - pad) + '" y2="' + (height - pad) + '"/></g>' +
        '<path d="' + pathFor(firstKey) + '" class="trend first" fill="none"/><path d="' + pathFor(secondKey) + '" class="trend second" fill="none"/></svg>';
}

function barRows(rows, limit) {
    const visible = rows.slice(0, limit);
    const max = Math.max.apply(null, [1].concat(visible.map(function (row) { return Number(row.value) || 0; })));
    return visible.map(function (row) {
        return '<div class="monthly-bar-row"><span>' + escapeHtml(row.label) + '</span><div><i style="width:' + Math.max(3, (Number(row.value) || 0) / max * 100) + '%"></i></div><strong>' +
            Number(row.value).toFixed(1) + escapeHtml(row.suffix) + '</strong></div>';
    }).join("");
}

function pdfBarRows(rows) {
    const max = Math.max.apply(null, [1].concat(rows.map(function (row) { return Number(row.value) || 0; })));
    return rows.map(function (row) {
        return '<div class="pdf-bar"><span>' + escapeHtml(row.label) + '</span><div class="pdf-bar-track"><div class="pdf-bar-fill" style="width:' +
            Math.max(3, (Number(row.value) || 0) / max * 100) + '%"></div></div><strong>' + Number(row.value).toFixed(1) + escapeHtml(row.suffix) + '</strong></div>';
    }).join("");
}

function muscleSilhouette(rows) {
    const max = Math.max.apply(null, [1].concat(rows.map(function (row) { return row.sets; })));
    const segments = rows.slice(0, 6).map(function (row, index) {
        const opacity = .25 + .75 * (row.sets / max);
        return '<span style="--heat:' + opacity + ";--y:" + (18 + index * 12) + '%"></span>';
    }).join("");
    return '<div class="monthly-body-outline"><i class="head"></i><i class="torso"></i><i class="arm a"></i><i class="arm b"></i><i class="leg a"></i><i class="leg b"></i>' + segments + '</div>';
}

function availableMonths() {
    const months = new Set();
    readArray(SESSION_KEY).forEach(function (item) { addMonth(months, item && item.date); });
    readArray(WEIGHT_KEY).forEach(function (item) { addMonth(months, item && item.date); });
    Object.keys(readFoodLog() || {}).forEach(function (key) { addMonth(months, key); });
    if (!months.size) months.add(monthKeyForDate(new Date()));
    return Array.from(months).filter(function (month) { return /^\d{4}-\d{2}$/.test(month); }).sort().reverse().slice(0, 24);
}

function preferredMonthKey() {
    const current = monthKeyForDate(new Date());
    if (monthHasMeaningfulData(current)) return current;
    const previous = shiftMonth(current, -1);
    return monthHasMeaningfulData(previous) ? previous : current;
}
function monthHasMeaningfulData(month) {
    return readArray(SESSION_KEY).some(function (item) { return inMonth(item && item.date, month); }) ||
        readArray(WEIGHT_KEY).some(function (item) { return inMonth(item && item.date, month); }) ||
        Object.keys(readFoodLog() || {}).some(function (key) { return inMonth(key, month); });
}
function monthBounds(monthKey) {
    const parts = monthKey.split("-").map(Number);
    const endDay = new Date(parts[0], parts[1], 0).getDate();
    const current = monthKey === monthKeyForDate(new Date());
    return { monthKey: monthKey, start: monthKey + "-01", end: monthKey + "-" + String(endDay).padStart(2, "0"), isCurrent: current };
}
function daysInMonth(monthKey) { const p = monthKey.split("-").map(Number); return new Date(p[0], p[1], 0).getDate(); }
function shiftMonth(monthKey, delta) { const p = monthKey.split("-").map(Number); return monthKeyForDate(new Date(p[0], p[1] - 1 + delta, 1, 12)); }
function monthKeyForDate(date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"); }
function labelForMonth(monthKey, monthOnly) { const p = monthKey.split("-").map(Number); return new Intl.DateTimeFormat(undefined, monthOnly ? { month: "long" } : { month: "long", year: "numeric" }).format(new Date(p[0], p[1] - 1, 1, 12)); }
function localDate(date) { const d = date || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function inMonth(date, month) { return String(date || "").slice(0, 7) === month; }
function addMonth(set, date) { const month = String(date || "").slice(0, 7); if (/^\d{4}-\d{2}$/.test(month)) set.add(month); }
function byDate(a, b) { return String(a && a.date || "").localeCompare(String(b && b.date || "")); }
function validWeight(entry) { return /^\d{4}-\d{2}-\d{2}$/.test(String(entry && entry.date || "")) && Number(entry && entry.weight) > 0; }
function dateMs(value) { const n = new Date(String(value).slice(0, 10) + "T12:00:00").getTime(); return Number.isFinite(n) ? n : 0; }
function rollingWeightAverage(entries, date) { const end = dateMs(date), start = end - 6 * DAY_MS; const values = entries.filter(function (item) { const t = dateMs(item.date); return t >= start && t <= end; }).map(function (item) { return Number(item.weight); }).filter(Number.isFinite); return values.length ? average(values) : null; }
function countRecordedSets(session) { return (session && session.exercises || []).reduce(function (sum, exercise) { return sum + (exercise.sets || []).filter(isRecordedSet).length; }, 0); }
function isRecordedSet(set) { return Number(set && set.reps) > 0 || Number(set && set.weight) > 0 || (set && set.completed === true); }
function bestWeightedSet(sets) { const valid = (sets || []).filter(function (set) { return Number(set && set.weight) > 0 && Number(set && set.reps) > 0; }).map(function (set) { return { set: set, e1rm: Number(set.weight) * (1 + Number(set.reps) / 30) }; }); valid.sort(function (a,b) { return b.e1rm - a.e1rm; }); return valid[0] || null; }
function exerciseName(id) { const found = getAllExercises().find(function (exercise) { return String(exercise.id) === String(id); }); return found && found.name ? found.name : String(id || "Exercise").split("-").map(function (word) { return word ? word[0].toUpperCase() + word.slice(1) : ""; }).join(" "); }
function longestDateStreak(dates) { const sorted = Array.from(new Set(dates)).sort(); let best = 0, current = 0, last = null; sorted.forEach(function (value) { const time = dateMs(value); if (last != null && Math.round((time - last) / DAY_MS) === 1) current += 1; else current = 1; best = Math.max(best, current); last = time; }); return best; }
function average(values) { const clean = values.map(Number).filter(Number.isFinite); return clean.length ? clean.reduce(function (a,b) { return a+b; }, 0) / clean.length : null; }
function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function round1(value) { return Math.round(Number(value) * 10) / 10; }
function formatSigned(value, digits) { const n = Number(value); if (!Number.isFinite(n)) return "—"; return (n > 0 ? "+" : "") + n.toFixed(digits == null ? 1 : digits); }
function formatDuration(minutes) { const n = Math.max(0, Math.round(Number(minutes) || 0)); if (n < 60) return n + "m"; const h = Math.floor(n / 60), m = n % 60; return m ? h + "h " + m + "m" : h + "h"; }
function capitalize(value) { const text = String(value || ""); return text ? text[0].toUpperCase() + text.slice(1) : text; }
function hubSummary(report) { const bits = []; if (report.training.workouts) bits.push(report.training.workouts + " workouts"); if (report.prCount) bits.push(report.prCount + " PRs"); if (report.weight.available) bits.push(formatSigned(report.weight.change,1) + " lb"); return bits.join(" · ") || "Your month in review"; }
function seenMonths() { return new Set(readArray(SEEN_KEY)); }
function markSeen(month) { const values = seenMonths(); values.add(month); localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(values).slice(-36))); }
function readArray(key) { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function readObject(key) { try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value && typeof value === "object" && !Array.isArray(value) ? value : null; } catch { return null; } }
function escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]; }); }
function loadImage(src) { return new Promise(function (resolve, reject) { const image = new Image(); image.onload = function () { resolve(image); }; image.onerror = reject; image.src = src; }); }
function drawRoundRect(ctx, x, y, w, h, r) { if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); return; } ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) { const words = String(text || "").split(/\s+/); let line = ""; words.forEach(function (word) { const test = line ? line + " " + word : word; if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line,x,y); line = word; y += lineHeight; } else line = test; }); if (line) ctx.fillText(line,x,y); }
