import { FORM_GUIDE_VIDEOS as MANIFEST_VIDEOS } from "./exercise-guide-video-manifest.js?v=form-videos-3";

const FORM_VIDEO_ORIGIN = "https://media.leveluphypertrophy.com";
const FORM_VIDEO_LIBRARY_BASE_URL = `${FORM_VIDEO_ORIGIN}/form-videos`;

// These 51 objects were uploaded through the Cloudflare R2 dashboard at the
// bucket root. Keep the legacy library under /form-videos, but prefer root for
// these newly uploaded object keys. The renderer also receives a fallback URL
// so either storage layout continues to work if objects are reorganized later.
export const ROOT_UPLOADED_OBJECT_KEYS = Object.freeze([
    "overhead-press.mp4",
    "skull-crusher.mp4",
    "dumbbell-overhead-extension.mp4",
    "dip.mp4",
    "front-squat.mp4",
    "glute-bridge.mp4",
    "plank.mp4",
    "cable-crunch.mp4",
    "incline-machine-chest-press.mp4",
    "deficit-push-up.mp4",
    "dumbbell-fly.mp4",
    "incline-dumbbell-fly.mp4",
    "single-arm-cable-lat-pulldown.mp4",
    "wide-grip-lat-pulldown.mp4",
    "underhand-lat-pulldown.mp4",
    "plate-loaded-high-row.mp4",
    "t-bar-row.mp4",
    "wide-grip-cable-row.mp4",
    "machine-lateral-raise.mp4",
    "smith-machine-shoulder-press.mp4",
    "arnold-press.mp4",
    "cable-rear-delt-fly.mp4",
    "dumbbell-shrug.mp4",
    "dumbbell-preacher-curl.mp4",
    "machine-preacher-curl.mp4",
    "cross-body-hammer-curl.mp4",
    "spider-curl.mp4",
    "cable-skull-crusher.mp4",
    "ez-bar-skull-crusher.mp4",
    "machine-dip.mp4",
    "rope-triceps-pushdown.mp4",
    "dumbbell-romanian-deadlift.mp4",
    "hip-abduction-machine.mp4",
    "hip-adduction-machine.mp4",
    "hanging-leg-raise.mp4",
    "machine-crunch.mp4",
    "wrist-curl.mp4",
    "reverse-wrist-curl.mp4",
    "elliptical.mp4",
    "single-arm-dumbbell-row.mp4",
    "neutral-grip-lat-pulldown.mp4",
    "seal-row.mp4",
    "chest-supported-rear-delt-row.mp4",
    "smith-machine-shrug.mp4",
    "smith-machine-squat.mp4",
    "single-leg-leg-curl.mp4",
    "romanian-deadlift.mp4",
    "cable-pull-through.mp4",
    "cable-glute-kickback.mp4",
    "bodyweight-squat.mp4",
    "hanging-knee-raise.mp4"
]);

const rootUploadedObjectKeys = new Set(ROOT_UPLOADED_OBJECT_KEYS);

function resolveVideo(config) {
    if (!config?.objectKey) return config || null;

    const rootSrc = `${FORM_VIDEO_ORIGIN}/${config.objectKey}`;
    const librarySrc = `${FORM_VIDEO_LIBRARY_BASE_URL}/${config.objectKey}`;
    const preferRoot = rootUploadedObjectKeys.has(config.objectKey);

    return Object.freeze({
        ...config,
        src: preferRoot ? rootSrc : librarySrc,
        fallbackSrc: preferRoot ? librarySrc : rootSrc,
        storagePath: preferRoot ? "root" : "form-videos"
    });
}

export const FORM_GUIDE_VIDEOS = Object.freeze(Object.fromEntries(
    Object.entries(MANIFEST_VIDEOS).map(([exerciseId, config]) => [
        exerciseId,
        resolveVideo(config)
    ])
));

export function getFormGuideVideo(exerciseId) {
    return FORM_GUIDE_VIDEOS[exerciseId] || null;
}
