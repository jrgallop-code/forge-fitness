const DAY_MS = 86400000;
const MOVING_AVERAGE_DAYS = 7;
const MIN_WINDOW_ENTRIES = 4;
const FIRST_PHASE_TREND_DAY = 7;
const FIRST_PHASE_CHECK_DAY = 14;
const PHASE_CHECK_CADENCE_DAYS = 7;
const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const DISPLAY_TREND_DAYS = 21;
const DISPLAY_TREND_MIN_ENTRIES = 3;
const DISPLAY_TREND_MIN_SPAN_DAYS = 5;
const DISPLAY_TREND_FULL_ENTRIES = 6;
const DISPLAY_TREND_FULL_SPAN_DAYS = 14;

export function calculateWeightTrend(entries, options = {}) {
    const normalized = normalizeWeightEntries(entries);
    const minEntriesPerWindow = positiveInteger(options.minEntriesPerWindow, MIN_WINDOW_ENTRIES);
    const endDate = validDate(options.endDate)
        ? String(options.endDate)
        : normalized.at(-1)?.date || null;

    if (!endDate) {
        return buildMovingAverageResult({ status: "insufficient", allEntries: normalized, minEntriesPerWindow });
    }

    const current = calculateSevenDayAverage(normalized, endDate);
    const previousEndDate = shiftDate(endDate, -MOVING_AVERAGE_DAYS);
    const previous = calculateSevenDayAverage(normalized, previousEndDate);
    const enoughCurrent = current.entries >= minEntriesPerWindow;
    const enoughPrevious = previous.entries >= minEntriesPerWindow;

    if (!enoughCurrent || !enoughPrevious || !Number.isFinite(current.average) || !Number.isFinite(previous.average)) {
        return buildMovingAverageResult({
            status: "insufficient",
            allEntries: normalized,
            current,
            previous,
            endDate,
            minEntriesPerWindow
        });
    }

    const weeklyChange = current.average - previous.average;
    return buildMovingAverageResult({
        status: "actual",
        weeklyChange,
        allEntries: normalized,
        current,
        previous,
        endDate,
        minEntriesPerWindow
    });
}

export function calculatePhaseMovingAverageTrend(entries, options = {}) {
    const phaseStartDate = validDate(options.phaseStartDate) ? String(options.phaseStartDate) : null;
    const asOfDate = validDate(options.asOfDate)
        ? String(options.asOfDate)
        : localDate();
    const minEntriesPerWindow = positiveInteger(options.minEntriesPerWindow, MIN_WINDOW_ENTRIES);
    const startingTrendWeight = finiteNumber(options.startingTrendWeight);
    const rolling = options.rolling === true;
    const provided = normalizeWeightEntries(entries).filter(entry => entry.date <= asOfDate);
    const normalized = provided.filter(entry => !phaseStartDate || entry.date >= phaseStartDate);
    const rollingContext = rolling ? getRollingContextEntries(provided, asOfDate) : normalized;

    if (!phaseStartDate) {
        return {
            ...calculateWeightTrend([], { minEntriesPerWindow }),
            reason: "missing-phase-start",
            phaseDay: null,
            dataPhaseDay: null,
            latestEntryDate: null,
            measurementDate: null,
            checkDay: null,
            checkDate: null,
            nextTrendDay: FIRST_PHASE_TREND_DAY,
            nextTrendDate: null,
            nextCheckDay: FIRST_PHASE_CHECK_DAY,
            nextCheckDate: null,
            daysUntilTrend: null,
            daysUntilCheck: null
        };
    }

    const phaseDay = Math.max(1, Math.floor((dateMs(asOfDate) - dateMs(phaseStartDate)) / DAY_MS) + 1);
    const firstTrendDate = shiftDate(phaseStartDate, FIRST_PHASE_TREND_DAY - 1);
    const latestEntryDate = normalized.at(-1)?.date || null;
    const dataPhaseDay = validDate(latestEntryDate)
        ? Math.max(1, Math.floor((dateMs(latestEntryDate) - dateMs(phaseStartDate)) / DAY_MS) + 1)
        : 0;
    const rollingEndDate = getRollingPhaseEndDate(normalized, firstTrendDate, asOfDate);

    if (phaseDay < FIRST_PHASE_TREND_DAY) {
        return {
            ...calculateWeightTrend([], { minEntriesPerWindow }),
            reason: "before-first-trend",
            phaseDay,
            dataPhaseDay,
            latestEntryDate,
            measurementDate: null,
            checkDay: null,
            checkDate: null,
            nextTrendDay: FIRST_PHASE_TREND_DAY,
            nextTrendDate: firstTrendDate,
            nextCheckDay: FIRST_PHASE_CHECK_DAY,
            nextCheckDate: shiftDate(phaseStartDate, FIRST_PHASE_CHECK_DAY - 1),
            daysUntilTrend: FIRST_PHASE_TREND_DAY - phaseDay,
            daysUntilCheck: FIRST_PHASE_CHECK_DAY - phaseDay,
            totalEntries: normalized.length
        };
    }

    if (phaseDay < FIRST_PHASE_CHECK_DAY) {
        const trendDate = rolling ? rollingEndDate : firstTrendDate;
        const current = calculateSevenDayAverage(normalized, trendDate);
        const enoughCurrent = current.entries >= minEntriesPerWindow;

        if (!enoughCurrent || !Number.isFinite(current.average) || !Number.isFinite(startingTrendWeight)) {
            return {
                ...buildMovingAverageResult({
                    status: "insufficient",
                    allEntries: normalized,
                    current,
                    previous: {
                        average: startingTrendWeight,
                        entries: 0,
                        startDate: null,
                        endDate: phaseStartDate
                    },
                    endDate: trendDate,
                    minEntriesPerWindow
                }),
                reason: "insufficient-preliminary-data",
                phaseDay,
                dataPhaseDay,
                latestEntryDate,
                measurementDate: trendDate,
                checkDay: null,
                checkDate: null,
                nextTrendDay: FIRST_PHASE_TREND_DAY,
                nextTrendDate: trendDate,
                nextCheckDay: FIRST_PHASE_CHECK_DAY,
                nextCheckDate: shiftDate(phaseStartDate, FIRST_PHASE_CHECK_DAY - 1),
                daysUntilTrend: 0,
                daysUntilCheck: FIRST_PHASE_CHECK_DAY - phaseDay
            };
        }

        const weeklyChange = current.average - startingTrendWeight;
        return {
            ...buildMovingAverageResult({
                status: "preliminary",
                weeklyChange,
                allEntries: normalized,
                current,
                previous: {
                    average: startingTrendWeight,
                    entries: 0,
                    startDate: null,
                    endDate: phaseStartDate
                },
                endDate: trendDate,
                minEntriesPerWindow
            }),
            reason: null,
            phaseDay,
            dataPhaseDay,
            latestEntryDate,
            measurementDate: trendDate,
            checkDay: null,
            checkDate: null,
            nextTrendDay: FIRST_PHASE_TREND_DAY,
            nextTrendDate: trendDate,
            nextCheckDay: FIRST_PHASE_CHECK_DAY,
            nextCheckDate: shiftDate(phaseStartDate, FIRST_PHASE_CHECK_DAY - 1),
            daysUntilTrend: 0,
            daysUntilCheck: FIRST_PHASE_CHECK_DAY - phaseDay
        };
    }

    // Phase age and check eligibility use in-phase weigh-ins only. The measured
    // rolling rate, however, needs complete 7-day comparison windows. When the
    // previous rolling window reaches before the phase start, include available
    // pre-phase weigh-ins as context instead of silently shortening that window.
    const dataCheckDay = dataPhaseDay >= FIRST_PHASE_CHECK_DAY
        ? FIRST_PHASE_CHECK_DAY
            + (Math.floor((dataPhaseDay - FIRST_PHASE_CHECK_DAY) / PHASE_CHECK_CADENCE_DAYS) * PHASE_CHECK_CADENCE_DAYS)
        : FIRST_PHASE_CHECK_DAY;
    const checkDay = dataCheckDay;
    const checkDate = shiftDate(phaseStartDate, checkDay - 1);
    const trendDate = rolling ? rollingEndDate : checkDate;
    const result = calculateWeightTrend(rolling ? rollingContext : normalized, { endDate: trendDate, minEntriesPerWindow });
    const nextCheckDay = checkDay + PHASE_CHECK_CADENCE_DAYS;
    const nextCheckDate = shiftDate(phaseStartDate, nextCheckDay - 1);

    return {
        ...result,
        reason: result.status === "actual" ? null : "insufficient-window-data",
        phaseDay,
        dataPhaseDay,
        latestEntryDate,
        measurementDate: trendDate,
        checkDay,
        checkDate,
        nextTrendDay: null,
        nextTrendDate: null,
        nextCheckDay,
        nextCheckDate,
        daysUntilTrend: 0,
        daysUntilCheck: Math.max(0, nextCheckDay - phaseDay),
        awaitingNewWeighIn: phaseDay >= nextCheckDay && dataPhaseDay < nextCheckDay
    };
}

export function calculateSevenDayAverage(entries, endDate) {
    const normalized = normalizeWeightEntries(entries);
    if (!validDate(endDate)) return emptyWindow(null, null);
    const end = String(endDate);
    const start = shiftDate(end, -(MOVING_AVERAGE_DAYS - 1));
    const rows = normalized.filter(entry => entry.date >= start && entry.date <= end);
    const average = rows.length
        ? rows.reduce((sum, entry) => sum + entry.weight, 0) / rows.length
        : null;
    return {
        average: Number.isFinite(average) ? average : null,
        entries: rows.length,
        startDate: start,
        endDate: end
    };
}

export function calculateRegressionWeeklyChange(entries) {
    const normalized = normalizeWeightEntries(entries);
    if (normalized.length < 2) return null;
    const origin = dateMs(normalized[0].date);
    const points = normalized.map(entry => ({ x: (dateMs(entry.date) - origin) / DAY_MS, y: entry.weight }));
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const numerator = points.reduce((sum, point) => sum + ((point.x - meanX) * (point.y - meanY)), 0);
    const denominator = points.reduce((sum, point) => sum + ((point.x - meanX) ** 2), 0);
    if (!Number.isFinite(denominator) || denominator <= 0) return null;
    const dailySlope = numerator / denominator;
    return Number.isFinite(dailySlope) ? dailySlope * 7 : null;
}

// User-facing rate of change. This intentionally has a lower entry threshold
// than calorie/TDEE decisions so people get useful feedback early. Live display
// calculations also ignore future-dated test entries unless explicitly allowed.
export function calculateDisplayWeightTrend(entries, options = {}) {
    const normalized = normalizeWeightEntries(entries);
    const allowFuture = options.allowFuture === true;
    const today = localDate();
    const eligible = allowFuture
        ? normalized
        : normalized.filter(entry => entry.date <= today);
    const requestedEndDate = validDate(options.endDate) ? String(options.endDate) : null;
    const endDate = requestedEndDate && (allowFuture || requestedEndDate <= today)
        ? requestedEndDate
        : eligible.at(-1)?.date || null;
    const windowDays = positiveInteger(options.windowDays, DISPLAY_TREND_DAYS);
    const minEntries = positiveInteger(options.minEntries, DISPLAY_TREND_MIN_ENTRIES);
    const minSpanDays = positiveInteger(options.minSpanDays, DISPLAY_TREND_MIN_SPAN_DAYS);
    const fullEntries = positiveInteger(options.fullEntries, DISPLAY_TREND_FULL_ENTRIES);
    const fullSpanDays = positiveInteger(options.fullSpanDays, DISPLAY_TREND_FULL_SPAN_DAYS);

    if (!endDate) {
        return { status: "insufficient", label: "Weekly Trend", weeklyChange: null, entries: 0, spanDays: 0, windowDays };
    }

    const startDate = shiftDate(endDate, -(windowDays - 1));
    const windowEntries = eligible.filter(entry => entry.date >= startDate && entry.date <= endDate);
    const firstDate = windowEntries[0]?.date || null;
    const lastDate = windowEntries.at(-1)?.date || null;
    const spanDays = firstDate && lastDate
        ? Math.floor((dateMs(lastDate) - dateMs(firstDate)) / DAY_MS) + 1
        : 0;
    const weeklyChange = calculateRegressionWeeklyChange(windowEntries);
    const ready = windowEntries.length >= minEntries
        && spanDays >= minSpanDays
        && Number.isFinite(weeklyChange);

    if (!ready) {
        return {
            status: "insufficient",
            label: "Weekly Trend",
            weeklyChange: null,
            entries: windowEntries.length,
            spanDays,
            windowDays,
            windowStart: startDate,
            windowEnd: endDate
        };
    }

    const status = windowEntries.length >= fullEntries && spanDays >= fullSpanDays
        ? "actual"
        : "preliminary";
    return {
        status,
        label: status === "preliminary" ? "Preliminary Trend" : "Weekly Trend",
        weeklyChange,
        entries: windowEntries.length,
        spanDays,
        windowDays,
        windowStart: firstDate,
        windowEnd: lastDate
    };
}

export function normalizeWeightEntries(entries) {
    if (!Array.isArray(entries)) return [];
    const byDate = new Map();
    entries.forEach(entry => {
        const date = String(entry?.date || "");
        const weight = Number(entry?.weight);
        if (!validDate(date) || !Number.isFinite(weight) || weight <= 0) return;
        byDate.set(date, { date, weight });
    });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function getRollingContextEntries(provided, asOfDate) {
    let stored = [];
    try {
        if (typeof globalThis?.localStorage !== "undefined") {
            stored = normalizeWeightEntries(JSON.parse(globalThis.localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]"))
                .filter(entry => entry.date <= asOfDate);
        }
    } catch {
        stored = [];
    }
    if (!stored.length) return provided;
    return normalizeWeightEntries([...stored, ...provided]).filter(entry => entry.date <= asOfDate);
}

function getRollingPhaseEndDate(entries, firstTrendDate, asOfDate) {
    const latestDate = entries.at(-1)?.date || null;
    if (!validDate(firstTrendDate)) return latestDate;
    if (!validDate(latestDate) || latestDate < firstTrendDate) return firstTrendDate;
    return latestDate > asOfDate ? asOfDate : latestDate;
}

function buildMovingAverageResult({ status, weeklyChange = null, allEntries = [], current = emptyWindow(null, null), previous = emptyWindow(null, null), endDate = null, minEntriesPerWindow = MIN_WINDOW_ENTRIES }) {
    const windowEntries = Number(current.entries || 0) + Number(previous.entries || 0);
    return {
        status,
        label: status === "preliminary" ? "Preliminary Trend" : "Weekly Trend",
        weeklyChange: Number.isFinite(weeklyChange) ? weeklyChange : null,
        previousAverage: Number.isFinite(previous.average) ? previous.average : null,
        currentAverage: Number.isFinite(current.average) ? current.average : null,
        previousEntries: Number(previous.entries || 0),
        currentEntries: Number(current.entries || 0),
        previousWindowStart: previous.startDate || null,
        previousWindowEnd: previous.endDate || null,
        currentWindowStart: current.startDate || null,
        currentWindowEnd: current.endDate || endDate || null,
        totalEntries: allEntries.length,
        windowEntries,
        windowDays: status === "preliminary" ? MOVING_AVERAGE_DAYS : MOVING_AVERAGE_DAYS * 2,
        windowStart: previous.startDate || null,
        windowEnd: current.endDate || endDate || null,
        minimumActualDays: MOVING_AVERAGE_DAYS * 2,
        maximumWindowDays: MOVING_AVERAGE_DAYS * 2,
        movingAverageDays: MOVING_AVERAGE_DAYS,
        minEntriesPerWindow
    };
}

function emptyWindow(startDate, endDate) {
    return { average: null, entries: 0, startDate, endDate };
}

function positiveInteger(value, fallback) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(dateMs(String(value)));
}

function shiftDate(value, days) {
    if (!validDate(value)) return null;
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return localDate(date);
}

function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}