const DAY_MS = 86400000;
const DEFAULT_WINDOW_DAYS = 21;

export function calculateWeightTrend(entries, options = {}) {
    const maxWindowDays = Number(options.maxWindowDays) > 0
        ? Math.round(Number(options.maxWindowDays))
        : DEFAULT_WINDOW_DAYS;

    const normalized = normalizeWeightEntries(entries);
    if (normalized.length < 2) {
        return buildResult("insufficient", null, normalized, normalized, 0);
    }

    const firstTime = dateMs(normalized[0].date);
    const lastTime = dateMs(normalized.at(-1).date);
    const totalDays = Math.floor((lastTime - firstTime) / DAY_MS) + 1;
    const cutoffTime = lastTime - ((maxWindowDays - 1) * DAY_MS);
    const windowEntries = normalized.filter(entry => dateMs(entry.date) >= cutoffTime);
    const windowDays = windowEntries.length
        ? Math.floor((dateMs(windowEntries.at(-1).date) - dateMs(windowEntries[0].date)) / DAY_MS) + 1
        : 0;

    if (totalDays < 7 || windowEntries.length < 4 || windowDays < 7) {
        return buildResult("insufficient", null, normalized, windowEntries, windowDays);
    }

    const weeklyChange = calculateRegressionWeeklyChange(windowEntries);
    if (!Number.isFinite(weeklyChange)) {
        return buildResult("insufficient", null, normalized, windowEntries, windowDays);
    }

    const established = totalDays >= 14 && windowDays >= 14 && windowEntries.length >= 7;
    return buildResult(
        established ? "actual" : "preliminary",
        weeklyChange,
        normalized,
        windowEntries,
        windowDays
    );
}

export function calculateRegressionWeeklyChange(entries) {
    const normalized = normalizeWeightEntries(entries);
    if (normalized.length < 2) return null;

    const origin = dateMs(normalized[0].date);
    const points = normalized.map(entry => ({
        x: (dateMs(entry.date) - origin) / DAY_MS,
        y: entry.weight
    }));

    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const numerator = points.reduce(
        (sum, point) => sum + ((point.x - meanX) * (point.y - meanY)),
        0
    );
    const denominator = points.reduce(
        (sum, point) => sum + ((point.x - meanX) ** 2),
        0
    );

    if (!Number.isFinite(denominator) || denominator <= 0) return null;
    const dailySlope = numerator / denominator;
    return Number.isFinite(dailySlope) ? dailySlope * 7 : null;
}

export function normalizeWeightEntries(entries) {
    if (!Array.isArray(entries)) return [];

    const byDate = new Map();
    entries.forEach(entry => {
        const date = String(entry?.date || "");
        const weight = Number(entry?.weight);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(weight) || weight <= 0) return;
        byDate.set(date, { date, weight });
    });

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildResult(status, weeklyChange, allEntries, windowEntries, windowDays) {
    const label = status === "actual"
        ? "Actual Weekly Change"
        : status === "preliminary"
            ? "Preliminary Weekly Trend"
            : "Weekly Trend";

    return {
        status,
        label,
        weeklyChange,
        totalEntries: allEntries.length,
        windowEntries: windowEntries.length,
        windowDays,
        windowStart: windowEntries[0]?.date || null,
        windowEnd: windowEntries.at(-1)?.date || null,
        minimumActualDays: 14,
        maximumWindowDays: DEFAULT_WINDOW_DAYS
    };
}

function dateMs(date) {
    return new Date(`${date}T12:00:00`).getTime();
}
