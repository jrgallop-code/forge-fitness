document.addEventListener("click", event => {
  const root = event.target.closest?.("[data-smart-build-wizard]");
  if (!root) return;
  const buildAction = event.target.closest?.("[data-smart-next], [data-smart-regenerate]");
  if (!buildAction) return;
  window.setTimeout(() => {
    const days = root.querySelectorAll(".smart-review-day");
    days.forEach(day => {
      const seen = new Set();
      day.querySelectorAll(".smart-review-exercise").forEach(row => {
        const name = row.querySelector("strong")?.textContent?.trim().toLowerCase();
        if (!name) return;
        if (seen.has(name)) row.dataset.duplicateExercise = "true";
        else seen.add(name);
      });
    });
  }, 0);
}, true);
