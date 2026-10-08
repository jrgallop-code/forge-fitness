// Saved routines are a complete library; Explore filters and limits apply only to catalogue entries.
export function buildWorkoutLibraryRows(saved, catalogue, showAll = false) {
    const rows = saved.map(plan => ({ ...plan, isSavedPlan: true }));
    const ids = new Set(rows.map(plan => String(plan.id)));
    const visibleCatalogue = showAll ? catalogue : catalogue.slice(0, 14);
    for (const plan of visibleCatalogue) {
        if (ids.has(String(plan.id))) continue;
        ids.add(String(plan.id));
        rows.push(plan);
    }
    return rows;
}
