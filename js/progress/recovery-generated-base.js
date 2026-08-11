import { RECOVERY_FRONT_IMAGE, RECOVERY_BACK_IMAGE } from "./recovery-anatomy-assets.js?v=recovery-generated-base-1";

const FRONT_MUSCLES = [
  ["Shoulders","left"],["Shoulders","right"],["Chest","left"],["Chest","right"],
  ["Biceps","left"],["Biceps","right"],["Quads","left"],["Quads","right"],
  ["Calves","left"],["Calves","right"]
];
const BACK_MUSCLES = [
  ["Shoulders","left"],["Shoulders","right"],["Back","left"],["Back","right"],
  ["Triceps","left"],["Triceps","right"],["Glutes","left"],["Glutes","right"],
  ["Hamstrings","left"],["Hamstrings","right"],["Calves","left"],["Calves","right"]
];

function overlayMarkup(side, muscles) {
  return muscles.map(([muscle, position]) => `<span class="recovery-image-muscle recovery-${slug(muscle)}-${position}" data-recovery-muscle="${muscle}" aria-hidden="true"></span>`).join("");
}

function anatomyMarkup(side) {
  const front = side === "front";
  return `<div class="recovery-anatomy-stage recovery-anatomy-${side}">
    <img class="recovery-generated-anatomy" src="${front ? RECOVERY_FRONT_IMAGE : RECOVERY_BACK_IMAGE}" alt="${front ? "Front" : "Back"} anatomical recovery view">
    <div class="recovery-image-muscles" aria-hidden="true">${overlayMarkup(side, front ? FRONT_MUSCLES : BACK_MUSCLES)}</div>
  </div>`;
}

function slug(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

function ensureGeneratedAnatomy() {
  const front = document.querySelector("[data-recovery-body-front]");
  const back = document.querySelector("[data-recovery-body-back]");
  if (!front || !back) return false;
  if (!front.dataset.generatedAnatomy) {
    front.innerHTML = anatomyMarkup("front");
    front.dataset.generatedAnatomy = "true";
  }
  if (!back.dataset.generatedAnatomy) {
    back.innerHTML = anatomyMarkup("back");
    back.dataset.generatedAnatomy = "true";
  }
  front.classList.add("recovery-generated-wrap");
  back.classList.add("recovery-generated-wrap");
  syncFacing();
  return true;
}

function syncFacing(forceFacing) {
  const front = document.querySelector("[data-recovery-body-front]");
  const back = document.querySelector("[data-recovery-body-back]");
  if (!front || !back) return;
  const facing = forceFacing || document.querySelector("[data-recovery-facing].active")?.dataset.recoveryFacing || "front";
  const showFront = facing === "front";
  front.hidden = !showFront;
  back.hidden = showFront;
  front.style.display = showFront ? "grid" : "none";
  back.style.display = showFront ? "none" : "grid";
  front.setAttribute("aria-hidden", showFront ? "false" : "true");
  back.setAttribute("aria-hidden", showFront ? "true" : "false");
}

document.addEventListener("click", event => {
  const recoveryTab = event.target.closest?.('.training-progress-tab[data-view="recovery"]');
  if (recoveryTab) ensureGeneratedAnatomy();

  const facing = event.target.closest?.("[data-recovery-facing]");
  if (facing) {
    ensureGeneratedAnatomy();
    requestAnimationFrame(() => syncFacing(facing.dataset.recoveryFacing));
  }
}, true);

const observer = new MutationObserver(() => {
  if (document.querySelector(".muscle-recovery-map-view")) ensureGeneratedAnatomy();
});
const content = document.getElementById("content");
if (content) observer.observe(content, { childList: true, subtree: true });
window.setTimeout(ensureGeneratedAnatomy, 0);
