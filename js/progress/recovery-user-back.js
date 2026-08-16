const BACK_ASSET = "assets/recovery/back-view.svg?v=recovery-back-vector-2";

const BACK_REGIONS = {
  "Rear Delts": ["muscle_back_016", "muscle_back_017"],
  Back: [
    "muscle_back_003", "muscle_back_004",
    "muscle_back_012", "muscle_back_013", "muscle_back_020", "muscle_back_021",
    "muscle_back_022", "muscle_back_023", "muscle_back_028", "muscle_back_029",
    "muscle_back_050", "muscle_back_051", "muscle_back_074", "muscle_back_075"
  ],
  Triceps: [
    "muscle_back_024", "muscle_back_025", "muscle_back_034",
    "muscle_back_035", "muscle_back_040", "muscle_back_041"
  ],
  Forearms: [
    "muscle_back_056", "muscle_back_057", "muscle_back_064", "muscle_back_065",
    "muscle_back_068", "muscle_back_069", "muscle_back_070", "muscle_back_071"
  ],
  Glutes: ["muscle_back_078", "muscle_back_079", "muscle_back_080", "muscle_back_081"],
  Hamstrings: [
    "muscle_back_096", "muscle_back_097", "muscle_back_113", "muscle_back_114",
    "muscle_back_118", "muscle_back_119", "muscle_back_120", "muscle_back_121",
    "muscle_back_126", "muscle_back_127"
  ],
  Calves: [
    "muscle_back_134", "muscle_back_135", "muscle_back_136", "muscle_back_137",
    "muscle_back_140", "muscle_back_141", "muscle_back_142", "muscle_back_143",
    "muscle_back_148", "muscle_back_149"
  ]
};

function copyStyles(root) {
  const map = new Map();
  root.querySelectorAll("[data-recovery-muscle]").forEach(node => {
    const key = node.dataset.recoveryMuscle;
    if (!key || map.has(key)) return;
    const style = getComputedStyle(node);
    map.set(key, {
      opacity: node.style.getPropertyValue("--recovery-opacity") || style.getPropertyValue("--recovery-opacity"),
      fill: node.style.getPropertyValue("--recovery-fill") || style.getPropertyValue("--recovery-fill"),
      noData: node.classList.contains("no-data")
    });
  });
  return map;
}

function applyStyles(root, styles) {
  root.querySelectorAll("[data-recovery-muscle]").forEach(node => {
    const state = styles.get(node.dataset.recoveryMuscle);
    if (!state) return;
    if (state.opacity) node.style.setProperty("--recovery-opacity", state.opacity);
    if (state.fill) node.style.setProperty("--recovery-fill", state.fill);
    node.classList.toggle("no-data", state.noData);
  });
}

function backMarkup() {
  const paths = Object.entries(BACK_REGIONS).flatMap(([muscle, ids]) =>
    ids.map(id => {
      const href = `${BACK_ASSET}#${id}`;
      return `<use href="${href}" xlink:href="${href}" data-recovery-muscle="${muscle}" class="recovery-user-muscle recovery-user-fill"/>`;
    })
  ).join("");

  return `<svg class="recovery-user-back-svg" viewBox="960 0 960 1920" role="img" aria-label="Back muscle recovery map" xmlns:xlink="http://www.w3.org/1999/xlink">
    <image href="${BACK_ASSET}" xlink:href="${BACK_ASSET}" x="960" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
    ${paths}
  </svg>`;
}

function installUserBack() {
  document.querySelectorAll(".muscle-recovery-map-view").forEach(view => {
    const root = view.querySelector("[data-recovery-body-back]");
    if (!root || root.dataset.userBackSvg === "true") return;
    const styles = copyStyles(root);
    root.innerHTML = backMarkup();
    root.dataset.userBackSvg = "true";
    root.dataset.designedRecoveryAsset = "true";
    root.classList.add("recovery-user-back-wrap");
    applyStyles(root, styles);
  });
}

document.addEventListener("click", event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    requestAnimationFrame(installUserBack);
  }
}, true);

const content = document.getElementById("content");
if (content) {
  new MutationObserver(installUserBack).observe(content, { childList: true, subtree: true });
}

window.setTimeout(installUserBack, 0);
