export function splitWeightTrendSegments(series) {
    const segments = [];
    for (let index = 1; index < series.length; index += 1) {
        const previous = series[index - 1];
        const current = series[index];
        const estimated = previous.actual === false || current.actual === false;
        const last = segments.at(-1);
        if (last?.estimated === estimated) {
            last.entries.push(current);
        } else {
            segments.push({ estimated, entries: [previous, current] });
        }
    }
    return segments;
}
