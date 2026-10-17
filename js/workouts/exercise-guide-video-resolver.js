import { videoLibraryMedia } from "./video-library-media.js";
import { FORM_GUIDE_VIDEOS as MANIFEST_VIDEOS } from "./exercise-guide-video-manifest.js?v=form-videos-3";
import { getAnatomySex } from "../core/anatomy-profile.js?v=female-form-videos-1";

const FORM_VIDEO_ORIGIN = "https://media.leveluphypertrophy.com";
const FORM_VIDEO_LIBRARY_BASE_URL = `${FORM_VIDEO_ORIGIN}/form-videos`;
const FEMALE_FORM_VIDEO_BASE_URL = `${FORM_VIDEO_LIBRARY_BASE_URL}/female`;

// The female Drive library covers every currently mapped object except the
// close-grip bench press. Keep that one on the existing guide until its female
// clip is supplied, rather than showing a broken player.
export const FEMALE_MISSING_OBJECT_KEYS = Object.freeze([
    "close-grip-bench-press.mp4"
]);

const femaleMissingObjectKeys = new Set(FEMALE_MISSING_OBJECT_KEYS);

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

function resolveMaleVideo(config) {
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

function resolveVideo(config, sex = getAnatomySex()) {
    const maleVideo = resolveMaleVideo(config);
    if (!maleVideo?.objectKey || sex !== "female" || femaleMissingObjectKeys.has(maleVideo.objectKey)) {
        return maleVideo;
    }

    return Object.freeze({
        ...maleVideo,
        src: `${FEMALE_FORM_VIDEO_BASE_URL}/${maleVideo.objectKey}`,
        fallbackSrc: maleVideo.src,
        storagePath: "form-videos/female",
        sex: "female"
    });
}

export const FORM_GUIDE_VIDEOS = Object.freeze(Object.fromEntries(
    Object.entries(MANIFEST_VIDEOS).map(([exerciseId, config]) => [
        exerciseId,
        resolveMaleVideo(config)
    ])
));

// The October Drive expansion shares 15 source clips with the original library.
// Reuse those objects rather than requiring duplicate uploads under new IDs.
const normalizeSourceName = value => String(value || "").toLowerCase()
    .replace(/\s*\(\d+\)(?=\.mp4$)/, "").replace(/[^a-z0-9]/g, "");
const existingSourceVideos = new Map(Object.values(MANIFEST_VIDEOS)
    .map(config => [normalizeSourceName(config.sourceName), config]));

const UPLOADED_DEMONSTRATIONS = {
    "face-pull": { sourcePage: "https://wger.de/en/exercise/overview/222" },
    "hip-thrust": { sourcePage: "https://wger.de/en/exercise/overview/294" }
};

export function getFormGuideVideo(exerciseId) {
    const uploaded = UPLOADED_DEMONSTRATIONS[exerciseId];
    if (uploaded) return {
        provider: "mp4", objectKey: `${exerciseId}.mp4`,
        src: `${FORM_VIDEO_LIBRARY_BASE_URL}/${exerciseId}.mp4`,
        storagePath: "form-videos", sex: "male",
        credits: { ...uploaded, author: "Goulart", license: "CC BY-SA 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
            changes: "Adapted: H.264 MP4, resized to 720p, audio removed." }
    };
    const libraryVideo = videoLibraryMedia[exerciseId];
    if (libraryVideo) {
        const existing = existingSourceVideos.get(normalizeSourceName(libraryVideo.sourceName));
        if (existing) return resolveVideo(existing);

        const { male } = libraryVideo.driveVideos;
        // Only the male batch has been uploaded. Use it for either profile until
        // the female batch is available; guides without an upload have no video.
        if (male) {
            return Object.freeze({
                provider: "mp4",
                src: `${FORM_VIDEO_LIBRARY_BASE_URL}/${exerciseId}.mp4`,
                fallbackSrc: `${FORM_VIDEO_LIBRARY_BASE_URL}/male/${exerciseId}.mp4`,
                sourceName: libraryVideo.sourceName,
                objectKey: `${exerciseId}.mp4`,
                storagePath: "form-videos",
                sex: "male"
            });
        }
        // These 25 entries have female footage only. Share that demonstration
        // with either profile without duplicating or relabelling its files.
        if (libraryVideo.driveVideos.female) return Object.freeze({
            provider: "mp4",
            src: `${FEMALE_FORM_VIDEO_BASE_URL}/${exerciseId}.mp4`,
            sourceName: libraryVideo.sourceName,
            objectKey: `${exerciseId}.mp4`,
            storagePath: "form-videos/female", sex: "female"
        });
        return null;
    }
    const config = MANIFEST_VIDEOS[exerciseId];
    return config ? resolveVideo(config) : null;
}
