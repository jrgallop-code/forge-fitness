const FRONT_ASSET = "assets/recovery/front-view.svg?v=recovery-front-vector-2";

const FRONT_REGIONS = {
  Shoulders: ["muscle_front_009", "muscle_front_010"],
  Chest: ["muscle_front_011", "muscle_front_012"],
  Biceps: ["muscle_front_015", "muscle_front_016"],
  Triceps: ["muscle_front_013", "muscle_front_014"],
  Forearms: [
    "muscle_front_033", "muscle_front_034", "muscle_front_037",
    "muscle_front_038", "muscle_front_041", "muscle_front_042"
  ],
  Back: ["muscle_front_007", "muscle_front_008"],
  Core: [
    "muscle_front_017", "muscle_front_018", "muscle_front_019", "muscle_front_020",
    "muscle_front_021", "muscle_front_022", "muscle_front_023", "muscle_front_024",
    "muscle_front_025", "muscle_front_026", "muscle_front_027", "muscle_front_028",
    "muscle_front_029", "muscle_front_030", "muscle_front_031", "muscle_front_032",
    "muscle_front_035", "muscle_front_036", "muscle_front_039", "muscle_front_040",
    "muscle_front_043", "muscle_front_044", "muscle_front_045", "muscle_front_046"
  ],
  Adductors: [
    "muscle_front_047", "muscle_front_048", "muscle_front_065", "muscle_front_066"
  ],
  Quads: [
    "muscle_front_049", "muscle_front_050", "muscle_front_051", "muscle_front_052",
    "muscle_front_067", "muscle_front_068", "muscle_front_069", "muscle_front_070"
  ],
  Calves: [
    "muscle_front_073", "muscle_front_074", "muscle_front_075", "muscle_front_076",
    "muscle_front_077", "muscle_front_078", "muscle_front_079", "muscle_front_080"
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

function frontMarkup() {
  const paths = Object.entries(FRONT_REGIONS).flatMap(([muscle, ids]) =>
    ids.map(id => {
      const href = `${FRONT_ASSET}#${id}`;
      return `<use href="${href}" xlink:href="${href}" data-recovery-muscle="${muscle}" class="recovery-user-muscle recovery-user-fill"/>`;
    })
  ).join("");

  return `<svg class="recovery-user-front-svg" viewBox="0 0 960 1920" role="img" aria-label="Front muscle recovery map" xmlns:xlink="http://www.w3.org/1999/xlink">
    <image href="${FRONT_ASSET}" xlink:href="${FRONT_ASSET}" x="0" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
    ${paths}
  </svg>`;
}

function installUserFront() {
  document.querySelectorAll(".muscle-recovery-map-view").forEach(view => {
    const root = view.querySelector("[data-recovery-body-front]");
    if (!root || root.dataset.userFrontSvg === "true") return;
    const styles = copyStyles(root);
    root.innerHTML = frontMarkup();
    root.dataset.userFrontSvg = "true";
    root.dataset.designedRecoveryAsset = "true";
    root.classList.add("recovery-user-front-wrap");
    applyStyles(root, styles);
  });
}

document.addEventListener("click", event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    requestAnimationFrame(installUserFront);
  }
}, true);

const content = document.getElementById("content");
if (content) {
  new MutationObserver(installUserFront).observe(content, { childList: true, subtree: true });
}

window.setTimeout(installUserFront, 0);