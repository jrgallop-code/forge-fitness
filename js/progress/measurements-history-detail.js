const STORAGE_KEY = "level_up_body_measurements";

const FIELDS = [
  ["neck", "Neck"],
  ["shoulders", "Shoulders"],
  ["chest", "Chest"],
  ["waist", "Waist"],
  ["hips", "Hips"],
  ["upperArm", "Upper arm"],
  ["forearm", "Forearm"],
  ["thigh", "Thigh"],
  ["calf", "Calf"]
];

export function initializeMeasurementHistoryDetail() {
  refreshMeasurementHistoryDetail();

  // The tracker owns saving/deleting. Refresh this presentation layer only
  // after those existing actions have finished; no MutationObserver needed.
  document.getElementById("save-measurements-btn")?.addEventListener("click", () => {
    setTimeout(refreshMeasurementHistoryDetail, 0);
  });

  document.getElementById("measurement-history-list")?.addEventListener("click", event => {
    if (event.target.closest("[data-delete-measurement]")) {
      setTimeout(refreshMeasurementHistoryDetail, 0);
    }
  });
}

function refreshMeasurementHistoryDetail() {
  const entries = getEntries();
  const first = entries[0] || null;
  const list = document.getElementById("measurement-history-list");

  updateNetSummary(entries, first);
  if (!list || !entries.length) return;

  const rows = [...list.querySelectorAll(".measurement-history-row")];
  const newestFirst = [...entries].reverse();

  rows.forEach((row, index) => {
    const entry = newestFirst[index];
    if (!entry) return;

    row.querySelector(".measurement-history-raw")?.remove();

    const details = document.createElement("div");
    details.className = "measurement-history-raw";
    details.style.gridColumn = "1 / -1";
    details.style.display = "grid";
    details.style.gridTemplateColumns = "repeat(auto-fit, minmax(105px, 1fr))";
    details.style.gap = "8px";
    details.style.marginTop = "10px";

    details.innerHTML = FIELDS
      .filter(([key]) => numeric(entry[key]) !== null)
      .map(([key, label]) => `
        <div class="measurement-history-value">
          <small>${label}</small>
          <strong>${numeric(entry[key]).toFixed(1)} in</strong>
        </div>
      `)
      .join("");

    row.appendChild(details);
  });
}

function updateNetSummary(entries, first) {
  const latest = entries[entries.length - 1] || null;
  const element = document.getElementById("measurements-total-change");
  if (!element) return;

  const net = latest && first ? comparableNetChange(latest, first) : null;
  element.textContent = net === null ? "--" : `${signed(net)} in`;
  element.className = net > 0 ? "measurement-up" : net < 0 ? "measurement-down" : "measurement-flat";

  // Correct definition: total change is the sum of changes for body areas
  // measured in BOTH the starting and current entries. Missing measurements
  // are excluded rather than treated as zero.
  element.title = "Sum of changes for measurement areas recorded at both the starting and latest entry.";
}

function comparableNetChange(current, start) {
  const changes = FIELDS
    .map(([key]) => {
      const now = numeric(current[key]);
      const baseline = numeric(start[key]);
      return now === null || baseline === null ? null : now - baseline;
    })
    .filter(value => value !== null);

  if (!changes.length) return null;
  return Number(changes.reduce((sum, value) => sum + value, 0).toFixed(1));
}

function getEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(entry => entry?.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))
      : [];
  } catch {
    return [];
  }
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function signed(value) {
  if (Math.abs(value) < 0.05) return "0.0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}
