import { getAllExercises } from "./exercise-library.js?v=exercise-library-guides-1";
import { expandedExercises } from "./exercise-library-expansion.js?v=exercise-library-expansion-video-1";
import { getFormGuideVideo } from "./exercise-guide-video-resolver.js?v=form-video-root-fallback-1";

const STYLE_ID = "level-up-form-guide-video-styles";
const failedVideos = new Set();

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .exercise-guide-video-card {
            margin: 14px 0 12px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,.11);
            border-radius: 16px;
            background: #050506;
        }

        .exercise-guide-video-label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 12px 8px;
        }

        .exercise-guide-video-label strong {
            color: #f4f4f4;
            font-size: 12px;
            line-height: 1.2;
        }

        .exercise-guide-video-label span {
            color: #8f8f94;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        .exercise-guide-video-card video {
            display: block;
            width: 100%;
            max-height: 280px;
            aspect-ratio: 16 / 9;
            object-fit: contain;
            background: #000;
        }

        .exercise-guide-video-card video::-webkit-media-controls,
        .exercise-guide-video-card video::-webkit-media-controls-enclosure,
        .exercise-guide-video-card video::-webkit-media-controls-panel,
        .exercise-guide-video-card video::-webkit-media-controls-play-button,
        .exercise-guide-video-card video::-webkit-media-controls-start-playback-button {
            display: none !important;
            -webkit-appearance: none;
        }

        @media (max-width: 430px) {
            .exercise-guide-video-card video {
                max-height: 230px;
            }
        }
    `;
    document.head.appendChild(style);
}

function normalizeGuideName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ");
}

function exerciseIdForGuide(screen) {
    const explicitId = String(screen?.dataset?.exerciseId || "").trim();
    if (explicitId) return explicitId;

    const title = screen?.querySelector(".exercise-guide-header h2")?.textContent?.trim();
    if (!title) return "";

    const normalizedTitle = normalizeGuideName(title);
    const exercise = [
        ...expandedExercises,
        ...getAllExercises()
    ].find(candidate => normalizeGuideName(candidate?.name) === normalizedTitle);

    return exercise?.id || "";
}

function createVideoCard(exerciseId, config) {
    const figure = document.createElement("figure");
    figure.className = "exercise-guide-video-card";
    figure.dataset.formGuideVideo = exerciseId;
    figure.innerHTML = `
        <figcaption class="exercise-guide-video-label">
            <strong>Form demonstration</strong>
            <span>Looping example</span>
        </figcaption>
    `;

    const video = document.createElement("video");
    video.src = config.src;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "auto";
    video.controls = false;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("disablepictureinpicture", "");
    video.removeAttribute("controls");
    video.setAttribute("aria-label", `${exerciseId.replaceAll("-", " ")} form demonstration`);

    const resumePlayback = () => {
        if (!video.isConnected) return;
        void video.play().catch(() => {});
    };

    video.addEventListener("loadeddata", () => {
        failedVideos.delete(exerciseId);
        resumePlayback();
    }, { once: true });
    video.addEventListener("canplay", resumePlayback);

    const handleVideoError = () => {
        if (
            config.fallbackSrc &&
            video.dataset.formGuideFallbackTried !== "true" &&
            video.src !== config.fallbackSrc
        ) {
            video.dataset.formGuideFallbackTried = "true";
            video.src = config.fallbackSrc;
            video.load();
            return;
        }

        failedVideos.add(exerciseId);
        figure.remove();
        video.removeEventListener("error", handleVideoError);
    };

    video.addEventListener("error", handleVideoError);

    figure.appendChild(video);
    return figure;
}

function enhanceGuide(screen) {
    if (!(screen instanceof Element) || !screen.matches(".exercise-guide-screen")) return;

    const exerciseId = exerciseIdForGuide(screen);
    const config = getFormGuideVideo(exerciseId);
    const existing = screen.querySelector(".exercise-guide-video-card");

    if (!config || failedVideos.has(exerciseId)) {
        existing?.remove();
        return;
    }

    ensureStyles();
    const header = screen.querySelector(".exercise-guide-header");
    if (!header) return;

    const card = existing?.dataset.formGuideVideo === exerciseId
        ? existing
        : createVideoCard(exerciseId, config);

    if (existing && existing !== card) existing.remove();

    // Keep the demonstration directly beneath the exercise title. Other visual
    // enhancers may also insert after the header, so re-anchoring here preserves
    // the requested video-first Form Guide layout.
    if (header.nextElementSibling !== card) {
        header.insertAdjacentElement("afterend", card);
    }

    const video = card.querySelector("video");
    if (video?.paused) void video.play().catch(() => {});
}

function enhanceGuides(root = document) {
    const screens = [];
    if (root instanceof Element && root.matches(".exercise-guide-screen")) screens.push(root);
    root.querySelectorAll?.(".exercise-guide-screen").forEach(screen => screens.push(screen));
    screens.forEach(enhanceGuide);
}

ensureStyles();
enhanceGuides(document);

let refreshQueued = false;
function queueGuideRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
        refreshQueued = false;
        enhanceGuides(document);
    });
}

const observer = new MutationObserver(mutations => {
    if (!mutations.some(mutation =>
        mutation.addedNodes.length || mutation.target.closest?.(".exercise-guide-screen")
    )) return;
    queueGuideRefresh();
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

document.addEventListener("levelup:open-exercise-guide", queueGuideRefresh);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) queueGuideRefresh();
});
