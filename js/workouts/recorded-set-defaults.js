// Only recorded sets can supply completion values; recommendations are never read.
export function recordedSetDefaults(sets, index, history = []) {
    const valid = set => set && set.completed !== false &&
        Number.isFinite(set.weight) && set.weight >= 0 &&
        Number.isFinite(set.reps) && set.reps > 0;
    for (let i = index - 1; i >= 0; i--) {
        if (sets[i]?.completed === true && valid(sets[i])) return sets[i];
    }
    if (valid(history[index])) return history[index];
    return [...history].reverse().find(valid) || null;
}
