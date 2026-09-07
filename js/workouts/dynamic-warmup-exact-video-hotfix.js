const EXACT_WARMUP_MEDIA = Object.freeze({
  "Band Shoulder Warm-Up": { key: "band-shoulder-warm-up.mp4", driveId: "1N4jLRoIGfFEMfrsuCX31tokXTsdwOAoL" },
  "Dynamic Chest Stretch": { key: "dynamic-chest-stretch.mp4", driveId: "1GWfndBLOS4wLC8j5n6UgyHecRl8LkU8_" },
  "Reach-Up Back Rotation": { key: "reach-up-back-rotation.mp4", driveId: "1q1UhEgBm7c9ao2armFdi9gbfo8ZrfQB4" },
  "Kneeling Back Rotation": { key: "kneeling-back-rotation.mp4", driveId: "1hL2VEm4ZsvW3EMpRiRBNO82pAEqahOki" },
  "Dynamic Back Stretch": { key: "dynamic-back-stretch.mp4", driveId: "1Rl2dvlLbpWSPOVfuAgSxBDeCkAp3lzYP" },
  "Standing Back Rotation": { key: "standing-back-rotation.mp4", driveId: "1IRrxtP3G4CoEEleQw-DdDxWgeMHZ4pi4" },
  "Kneeling Lat Mobilization": { key: "kneeling-lat-mobilization.mp4", driveId: "1-umCWvcXuX1XVw97WLZW1n9pUjC2-1Wd" },
  "Scapula Dips": { key: "scapula-dips.mp4", driveId: "18dVXK4luULAIMz7iBvv7JJ_OIJE3_UQM" },
  "Wrist Circles": { key: "wrist-circles.mp4", driveId: "1IuH2K8AMfeltQq_hoq4TCuFp4MeTsuHw" },
  "Hip Circles": { key: "hip-circles.mp4", driveId: "18MzeQdVltHRFcaSPjAqYnRtaRgPlP6ZZ" },
  "Dynamic Knee Raises": { key: "dynamic-knee-raises.mp4", driveId: "1A8kN6Jq_9bEF2rcyHVfEs7jAJUSqnegY" },
  "Feet & Ankle Rotations": { key: "ankle-rotations.mp4", driveId: "1t_yo9Hv8bSLEXunb5A30rgezUUNQ3-vK" },
  "Knee Circles": { key: "knee-circles.mp4", driveId: "11m8hGT16j-UqHI32wmSWQ3q03VSIhH3C" },
  "Dynamic Side Lunges": { key: "dynamic-side-lunges.mp4", driveId: "1Q2SIu2uW6bycj7zjc1Hbi-da3IyClkJe" },
  "Bodyweight Squats": { key: "bodyweight-squats.mp4", driveId: "18Z0UWY9bYZqYJmO4BNNhsyS0S4JrEuM8" },
  "Band Hip Abduction": { key: "band-hip-abduction.mp4", driveId: "1WB8D0BUSkNprHZ1u-x110TVHgt3jEfXD" },
  "Light Band Pull-Through": { key: "band-pull-through.mp4", driveId: "1s2NKBfgUxJ9aAtycSDU_HMiN7mwqFZ04" },
  "Jumping Jacks": { key: "jumping-jacks.mp4", driveId: "1byQ2mrVPOGs2HhpznIsv7eW-T8zI9iVj" }
});

const CDN_BASE = "https://media.leveluphypertrophy.com/warmup-videos";

function labelFor(video) {
  return String(video?.getAttribute?.("aria-label") || "").replace(/\s+demonstration\s*$/i, "").trim();
}

function exactConfig(video) {
  return EXACT_WARMUP_MEDIA[labelFor(video)] || null;
}

function drivePreviewUrl(id) {
  return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : "";
}

function replaceWithExactPreview(video, config) {
  if (!video?.isConnected || !config?.driveId) return;
  const frame = document.createElement("iframe");
  frame.className = String(video.className || "").replace("dynamic-warmup-video", "dynamic-warmup-drive-preview");
  frame.src = drivePreviewUrl(config.driveId);
  frame.title = video.getAttribute("aria-label") || "Warm-up demonstration";
  frame.allow = "autoplay; fullscreen";
  frame.loading = "lazy";
  frame.dataset.exactWarmupVideo = "true";
  video.replaceWith(frame);
}

function enforceExactVideo(video) {
  const config = exactConfig(video);
  if (!config) return;
  const exactSrc = `${CDN_BASE}/${config.key}`;
  video.dataset.exactWarmupVideo = "true";
  // Remove the legacy list because it contains unrelated lifting/form videos.
  video.dataset.videoSources = encodeURIComponent(JSON.stringify([exactSrc]));
  video.dataset.sourceIndex = "0";
  video.dataset.drivePreview = drivePreviewUrl(config.driveId);
  if (video.src !== exactSrc) {
    video.src = exactSrc;
    video.load?.();
  }
}

function scan(root = document) {
  root.querySelectorAll?.("video.dynamic-warmup-video").forEach(enforceExactVideo);
  if (root.matches?.("video.dynamic-warmup-video")) enforceExactVideo(root);
}

// Capture errors before the legacy target listener can substitute a normal lifting video.
document.addEventListener("error", event => {
  const video = event.target;
  if (!(video instanceof HTMLVideoElement) || !video.classList.contains("dynamic-warmup-video")) return;
  const config = exactConfig(video);
  if (!config) return;
  event.stopImmediatePropagation();
  replaceWithExactPreview(video, config);
}, true);

const observer = new MutationObserver(records => {
  for (const record of records) {
    record.addedNodes.forEach(node => {
      if (node.nodeType === 1) scan(node);
    });
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
scan();
