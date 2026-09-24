import {
    canonicalMass,
    displayMass,
    massUnit,
    UNIT_KINDS
} from "../core/unit-system.js?v=granular-units-1";
import {
    calculateTrendWeightSeries
} from "../core/weight-trend.js?v=smoothed-visible-trend-1";

const DATABASE_NAME =
    "level_up_media";

const DATABASE_VERSION =
    2;

const PHOTO_STORE =
    "journal_photos";

const MAX_IMAGE_EDGE =
    1600;

const JPEG_QUALITY =
    0.82;

const ACCOUNT_STORAGE_KEY = "level_up_cloud_account";
const SESSION_STORAGE_KEY = "level_up_cloud_session";
const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const WORKOUT_STORAGE_KEY = "forge_workout_sessions";
const PHOTO_SHARE_TEMPLATES = ["before-after", "weight", "training", "timeline", "minimal"];
const PHOTO_SHARE_FORMATS = {
    post: { width: 1080, height: 1350, label: "Post" },
    story: { width: 1080, height: 1920, label: "Story" },
    square: { width: 1080, height: 1080, label: "Square" }
};
const PHOTO_SHARE_LOGO = "assets/level-up-mark-transparent.svg";
const PHOTO_SHARE_URL = "leveluphypertrophy.com";


let activeObjectUrls = [];
let visiblePhotos = [];
let selectedPhotoIds = [];
let activePhotoId = "";
let galleryMode = "single";
let selectedMonth = "all";
let activePhotoShareTemplate = 0;
let photoShareFormat = "post";
let photoShareShowWeights = false;
const photoCropStates = new Map();


export function renderPhotoJournal() {

    return `
        <section class="photo-journal">

            <div id="photo-journal-list-screen" class="photo-journal-list-screen">
                <div class="photo-journal-heading">
                    <div>
                        <span class="eyebrow">DATED MEDIA</span>
                        <h3>Progress Photos</h3>
                        <p>Review visual changes over time and open any entry for a larger individual or side-by-side view.</p>
                    </div>
                    <span class="photo-private-badge">🔒 On this iPhone only</span>
                </div>

                <details id="photo-add-disclosure" class="photo-add-disclosure">
                    <summary>
                        <span>Add a progress photo</span>
                        <b aria-hidden="true">＋</b>
                    </summary>
                    <div class="photo-entry-panel">
                        <label>
                            Date
                            <input id="photo-journal-date" type="date">
                        </label>
                        <label>
                            Weight <span id="photo-weight-unit">(${massUnit(UNIT_KINDS.BODY_WEIGHT)})</span>
                            <input id="photo-journal-weight" type="number" min="1" max="1400" step="0.1" inputmode="decimal" data-unit-input-ignore>
                        </label>
                        <label>
                            Optional note
                            <input id="photo-journal-note" type="text" maxlength="160">
                        </label>
                        <label class="photo-file-control">
                            Photo
                            <input id="photo-journal-file" type="file" accept="image/*">
                        </label>
                        <button id="save-photo-journal-btn" class="primary-btn" type="button">Save Photo</button>
                        <span id="photo-journal-message" class="photo-journal-message" aria-live="polite"></span>
                    </div>
                </details>

                <div class="photo-entry-list-heading">
                    <div>
                        <h4>Entries</h4>
                        <span id="photo-count">0 photos</span>
                    </div>
                    <label>
                        <span>Month and year</span>
                        <select id="photo-entry-period" aria-label="Filter progress photos by month and year">
                            <option value="all">All entries</option>
                        </select>
                    </label>
                </div>

                <div id="photo-journal-entries" class="photo-journal-entries">
                    <div class="photo-empty-state">No photos saved yet.</div>
                </div>
            </div>

            <div id="photo-gallery-screen" class="photo-gallery-screen" hidden>
                <div class="photo-gallery-topbar">
                    <button id="close-photo-gallery" type="button" aria-label="Back to photo entries">‹</button>
                    <div>
                        <span class="eyebrow">PROGRESS PHOTOS</span>
                        <h3>Progress Gallery</h3>
                    </div>
                </div>

                <div class="photo-gallery-mode" role="group" aria-label="Photo viewing mode">
                    <button type="button" data-photo-view="single" aria-pressed="true">Individual</button>
                    <button type="button" data-photo-view="compare" aria-pressed="false">Compare</button>
                </div>

                <div id="photo-gallery-stage" class="photo-gallery-stage" aria-live="polite"></div>

                <p id="photo-gallery-gesture-hint" class="photo-gallery-gesture-hint" hidden>
                    Compare up to two photos. Pinch each photo to zoom and drag to inspect it.
                </p>

                <div id="photo-gallery-carousel" class="photo-gallery-carousel" aria-label="Progress photo carousel"></div>

                <button id="open-photo-share" class="primary-btn photo-share-launch" type="button" hidden>
                    Create &amp; Share
                </button>
            </div>

            <div id="photo-share-screen" class="photo-share-screen" hidden>
                <div class="photo-share-topbar">
                    <button id="close-photo-share" type="button" aria-label="Back to photo comparison">‹</button>
                    <div><span class="eyebrow">PROGRESS PHOTOS</span><h3>Customize</h3></div>
                    <button id="export-photo-share" type="button">Next</button>
                </div>

                <div id="photo-share-carousel" class="photo-share-carousel" aria-label="Progress photo share templates"></div>
                <div id="photo-share-dots" class="photo-share-dots" role="tablist" aria-label="Share card template"></div>
                <p class="photo-share-swipe-hint">Swipe to choose a layout</p>

                <section class="photo-share-options" aria-label="Share card options">
                    <div>
                        <strong>FORMAT</strong>
                        <div class="photo-share-format" role="radiogroup" aria-label="Image format">
                            ${Object.entries(PHOTO_SHARE_FORMATS).map(([value, option]) => `<button type="button" data-photo-share-format="${value}" aria-pressed="${value === "post"}">${option.label}</button>`).join("")}
                        </div>
                    </div>
                    <label>
                        <span><strong>SHOW WEIGHTS</strong><small>Include each recorded weight beneath its photo</small></span>
                        <input id="photo-share-show-weights" type="checkbox">
                    </label>
                    <p id="photo-share-status" role="status" aria-live="polite"></p>
                </section>

                <p class="photo-share-privacy">Created on this iPhone. Your photos leave Level Up only after you choose where to share them.</p>
            </div>

        </section>
    `;

}


export function initializePhotoJournal() {

    if (!nativePhotoPlugin()) {
        return;
    }

    document.documentElement.classList.remove("photo-gallery-open");

    const dateInput =
        document.getElementById(
            "photo-journal-date"
        );


    if (!dateInput) {
        return;
    }


    dateInput.value =
        getLocalDateValue();

    syncWeightForDate(dateInput.value);

    dateInput.addEventListener(
        "change",
        () => syncWeightForDate(dateInput.value)
    );


    document
        .getElementById(
            "save-photo-journal-btn"
        )
        ?.addEventListener(
            "click",
            savePhoto
        );


    document.getElementById("photo-entry-period")?.addEventListener("change", event => {
        selectedMonth = event.target.value || "all";
        renderPhotos();
    });

    document.getElementById("close-photo-gallery")?.addEventListener("click", closeGallery);
    document.getElementById("open-photo-share")?.addEventListener("click", openPhotoShare);
    document.getElementById("close-photo-share")?.addEventListener("click", closePhotoShare);
    document.getElementById("export-photo-share")?.addEventListener("click", exportActivePhotoShare);
    document.getElementById("photo-share-show-weights")?.addEventListener("change", event => {
        photoShareShowWeights = event.target.checked === true;
        renderPhotoShare();
    });
    document.querySelectorAll("[data-photo-share-format]").forEach(button =>
        button.addEventListener("click", () => {
            photoShareFormat = PHOTO_SHARE_FORMATS[button.dataset.photoShareFormat]
                ? button.dataset.photoShareFormat
                : "post";
            renderPhotoShare();
        })
    );

    document.querySelectorAll("[data-photo-view]").forEach(button =>
        button.addEventListener("click", () => setGalleryMode(button.dataset.photoView))
    );

    window.addEventListener(
        "levelup:units-changed",
        () => {
            const unit = document.getElementById("photo-weight-unit");
            if (!unit) return;
            unit.textContent = `(${massUnit(UNIT_KINDS.BODY_WEIGHT)})`;
            syncWeightForDate(dateInput.value);
            renderPhotos();
        },
        { once: true }
    );


    renderPhotos();

}


export async function exportPhotoRecords() {

    const photos =
        await getAllLegacyPhotos();


    return Promise.all(
        photos.map(
            async photo => ({

                id:
                    photo.id,

                date:
                    photo.date,

                note:
                    photo.note ||
                    "",

                weight:
                    normalizedWeight(photo.weight),

                createdAt:
                    photo.createdAt,

                image:
                    await blobToDataUrl(
                        photo.image
                    )

            })
        )
    );

}


export async function importPhotoRecords(
    records
) {

    const database =
        await openDatabase();


    await new Promise(
        (resolve, reject) => {

            const transaction =
                database.transaction(
                    PHOTO_STORE,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    PHOTO_STORE
                );


            store.clear();


            (
                Array.isArray(records)
                    ? records
                    : []
            )
            .forEach(record => {

                if (
                    !record ||
                    !record.id ||
                    !record.date ||
                    !record.image
                ) {
                    return;
                }


                store.put({

                    id:
                        record.id,

                    date:
                        record.date,

                    note:
                        String(
                            record.note ||
                            ""
                        )
                        .slice(
                            0,
                            160
                        ),

                    weight:
                        normalizedWeight(record.weight),

                    createdAt:
                        record.createdAt ||
                        new Date()
                            .toISOString(),

                    image:
                        dataUrlToBlob(
                            record.image
                        )

                });

            });


            transaction.oncomplete =
                () =>
                    resolve();


            transaction.onerror =
                () =>
                    reject(
                        transaction.error
                    );

        }
    );

}


async function savePhoto() {

    const date =
        document.getElementById(
            "photo-journal-date"
        )
        ?.value;


    const note =
        document.getElementById(
            "photo-journal-note"
        )
        ?.value
        .trim() ||
        "";

    const weightInput =
        document.getElementById(
            "photo-journal-weight"
        );

    const enteredWeight =
        weightInput?.value === ""
            ? null
            : canonicalMass(
                weightInput?.value,
                UNIT_KINDS.BODY_WEIGHT
            );

    const weight =
        normalizedWeight(enteredWeight);


    const fileInput =
        document.getElementById(
            "photo-journal-file"
        );


    const file =
        fileInput?.files?.[0];


    if (
        !date ||
        !file
    ) {

        setPhotoMessage(
            "Choose a date and photo first.",
            true
        );

        return;

    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        setPhotoMessage(
            "Please choose an image file.",
            true
        );

        return;

    }


    try {

        setPhotoMessage(
            "Preparing photo…"
        );


        const image =
            await resizeImage(
                file
            );


        await savePhotoRecord({

            id:
                `photo-${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,

            date,

            note,

            weight,

            createdAt:
                new Date()
                    .toISOString(),

            image

        });


        if (fileInput) {
            fileInput.value =
                "";
        }


        const noteInput =
            document.getElementById(
                "photo-journal-note"
            );


        if (noteInput) {
            noteInput.value =
                "";
        }

        syncWeightForDate(date);


        setPhotoMessage(
            "Photo saved."
        );

        document.getElementById("photo-add-disclosure")?.removeAttribute("open");

        await renderPhotos();

    }

    catch {

        setPhotoMessage(
            "The photo could not be saved. Try a smaller image or free some space on this iPhone.",
            true
        );

    }

}


async function renderPhotos() {
    revokeObjectUrls();
    const photos = await getAllPhotos();
    visiblePhotos = photos;
    selectedPhotoIds = selectedPhotoIds.filter(id =>
        photos.some(photo => photo.id === id)
    );
    if (!photos.some(photo => photo.id === activePhotoId)) {
        activePhotoId = photos[0]?.id || "";
    }

    const count = document.getElementById("photo-count");
    if (count) {
        count.textContent = `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;
    }
    renderPeriodOptions(photos);
    renderEntryList(photos);
    if (!document.getElementById("photo-gallery-screen")?.hidden) {
        renderGallery();
    }
}


function renderPeriodOptions(photos) {
    const select = document.getElementById("photo-entry-period");
    if (!select) return;
    const periods = [...new Set(photos.map(photo => String(photo.date).slice(0, 7)))];
    if (selectedMonth !== "all" && !periods.includes(selectedMonth)) selectedMonth = "all";
    select.innerHTML = `<option value="all">All entries</option>${periods.map(period =>
        `<option value="${escapeHtml(period)}">${escapeHtml(formatMonthYear(period))}</option>`
    ).join("")}`;
    select.value = selectedMonth;
}


function renderEntryList(photos) {
    const list = document.getElementById("photo-journal-entries");
    if (!list) return;
    const filtered = selectedMonth === "all"
        ? photos
        : photos.filter(photo => String(photo.date).startsWith(selectedMonth));

    if (!filtered.length) {
        list.innerHTML = `<div class="photo-empty-state">${photos.length ? "No photos in this month." : "No photos saved yet."}</div>`;
        return;
    }

    let lastPeriod = "";
    list.innerHTML = filtered.map(photo => {
        const period = String(photo.date).slice(0, 7);
        const heading = selectedMonth === "all" && period !== lastPeriod
            ? `<h5>${escapeHtml(formatMonthYear(period))}</h5>`
            : "";
        lastPeriod = period;
        const url = createObjectUrl(photo.image);
        return `${heading}
            <article class="photo-entry-row">
                <button class="photo-entry-open" type="button" data-photo-id="${escapeHtml(photo.id)}">
                    <span class="photo-entry-copy">
                        <strong>${escapeHtml(formatPhotoWeight(photo))}</strong>
                        <span>${escapeHtml(formatLongDate(photo.date))}</span>
                        ${photo.note ? `<small>${escapeHtml(photo.note)}</small>` : ""}
                    </span>
                    <img src="${url}" alt="Progress photo from ${escapeHtml(formatLongDate(photo.date))}">
                </button>
                <button class="remove-journal-photo" type="button" data-photo-id="${escapeHtml(photo.id)}" aria-label="Remove photo from ${escapeHtml(formatLongDate(photo.date))}">Remove</button>
            </article>`;
    }).join("");

    list.querySelectorAll(".photo-entry-open").forEach(button =>
        button.addEventListener("click", () => openGallery(button.dataset.photoId))
    );
    bindRemoveButtons(list);
}


function openGallery(id) {
    activePhotoId = id;
    galleryMode = "single";
    selectedPhotoIds = [id];
    document.documentElement.classList.add("photo-gallery-open");
    document.getElementById("photo-journal-list-screen")?.setAttribute("hidden", "");
    document.getElementById("photo-gallery-screen")?.removeAttribute("hidden");
    renderPhotos();
    requestAnimationFrame(() => document.getElementById("photo-gallery-screen")?.scrollIntoView({ block: "start" }));
}


function closeGallery() {
    document.getElementById("photo-gallery-screen")?.setAttribute("hidden", "");
    document.getElementById("photo-share-screen")?.setAttribute("hidden", "");
    document.getElementById("photo-journal-list-screen")?.removeAttribute("hidden");
    document.documentElement.classList.remove("photo-gallery-open");
    renderPhotos();
}


function setGalleryMode(mode) {
    galleryMode = mode === "compare" ? "compare" : "single";
    if (galleryMode === "compare") {
        const anchor = visiblePhotos.find(photo => photo.id === activePhotoId) || visiblePhotos[0];
        const alternate = visiblePhotos.find(photo => photo.id !== anchor?.id);
        selectedPhotoIds = [anchor?.id, alternate?.id].filter(Boolean);
        sortSelectedPhotos();
    }
    else {
        selectedPhotoIds = activePhotoId ? [activePhotoId] : [];
    }
    renderPhotos();
}


function selectGalleryPhoto(id) {
    if (galleryMode === "single") {
        activePhotoId = id;
        selectedPhotoIds = [id];
    }
    else if (!selectedPhotoIds.includes(id)) {
        const anchor = selectedPhotoIds.includes(activePhotoId)
            ? activePhotoId
            : selectedPhotoIds.at(-1);
        selectedPhotoIds = [anchor, id].filter(Boolean).slice(-2);
        sortSelectedPhotos();
    }
    renderPhotos();
}


function sortSelectedPhotos() {
    selectedPhotoIds = [...new Set(selectedPhotoIds)].sort((leftId, rightId) => {
        const left = visiblePhotos.find(photo => photo.id === leftId);
        const right = visiblePhotos.find(photo => photo.id === rightId);
        return `${left?.date || ""}|${left?.createdAt || ""}`
            .localeCompare(`${right?.date || ""}|${right?.createdAt || ""}`);
    }).slice(0, 2);
}


function renderGallery() {
    const stage = document.getElementById("photo-gallery-stage");
    const carousel = document.getElementById("photo-gallery-carousel");
    const gestureHint = document.getElementById("photo-gallery-gesture-hint");
    if (!stage || !carousel || !gestureHint) return;

    document.querySelectorAll("[data-photo-view]").forEach(button => {
        const active = button.dataset.photoView === galleryMode;
        button.setAttribute("aria-pressed", String(active));
        button.disabled = button.dataset.photoView === "compare" && visiblePhotos.length < 2;
    });

    selectedPhotoIds = selectedPhotoIds.slice(0, 2);
    gestureHint.hidden = galleryMode !== "compare" || selectedPhotoIds.length !== 2;
    const shareButton = document.getElementById("open-photo-share");
    if (shareButton) shareButton.hidden = galleryMode !== "compare" || selectedPhotoIds.length !== 2;

    if (!visiblePhotos.length) {
        stage.innerHTML = `<div class="photo-empty-state">No photos saved yet.</div>`;
        carousel.innerHTML = "";
        return;
    }

    if (galleryMode === "compare") renderCompareStage(stage);
    else renderSingleStage(stage);

    carousel.innerHTML = visiblePhotos.map(photo => {
        const url = createObjectUrl(photo.image);
        const active = galleryMode === "compare"
            ? selectedPhotoIds.includes(photo.id)
            : photo.id === activePhotoId;
        const selectionNumber = galleryMode === "compare" && active
            ? selectedPhotoIds.indexOf(photo.id) + 1
            : "";
        return `<button type="button" class="photo-gallery-thumb${active ? " is-active" : ""}" data-photo-id="${escapeHtml(photo.id)}" aria-pressed="${active}">
            <img src="${url}" alt="${escapeHtml(formatLongDate(photo.date))}">
            ${selectionNumber ? `<b>${selectionNumber}</b>` : ""}
            <span>${escapeHtml(formatShortDate(photo.date))}</span>
        </button>`;
    }).join("");

    carousel.querySelectorAll("[data-photo-id]").forEach(button =>
        button.addEventListener("click", () => selectGalleryPhoto(button.dataset.photoId))
    );
}


function renderSingleStage(stage) {
    const photo = visiblePhotos.find(item => item.id === activePhotoId) || visiblePhotos[0];
    activePhotoId = photo.id;
    const url = createObjectUrl(photo.image);
    stage.innerHTML = `<article class="photo-viewer-single">
        <div class="photo-viewer-single-frame">
            <img src="${url}" alt="Progress photo from ${escapeHtml(formatLongDate(photo.date))}">
        </div>
        <div class="photo-viewer-metadata">
            <strong>${escapeHtml(formatPhotoWeight(photo))}</strong>
            <span>${escapeHtml(formatLongDate(photo.date))}</span>
            ${photo.note ? `<p>${escapeHtml(photo.note)}</p>` : ""}
        </div>
    </article>`;
}


function renderCompareStage(stage) {
    const photos = selectedPhotoIds.map(id => visiblePhotos.find(photo => photo.id === id)).filter(Boolean);
    if (photos.length !== 2) {
        stage.innerHTML = `<div class="photo-empty-state">Choose two photos from the carousel to compare.</div>`;
        return;
    }
    stage.innerHTML = `<div class="photo-viewer-compare">
        ${photos.map((photo, index) => {
            const url = createObjectUrl(photo.image);
            return `<figure>
                <div class="photo-zoom-pane" data-photo-zoom-pane aria-label="Pinch to zoom comparison photo ${index + 1}">
                    <img src="${url}" alt="Comparison photo ${index + 1} from ${escapeHtml(formatLongDate(photo.date))}">
                </div>
                <figcaption>
                    <strong>${escapeHtml(formatPhotoWeight(photo))}</strong>
                    <span>${escapeHtml(formatLongDate(photo.date))}</span>
                </figcaption>
            </figure>`;
        }).join("")}
    </div>`;
    const panes = [...stage.querySelectorAll("[data-photo-zoom-pane]")];
    panes.forEach((pane, index) => installPhotoPinchZoom(pane, photos[index]?.id));
}


function openPhotoShare() {
    if (galleryMode !== "compare" || selectedPhotoIds.length !== 2) return;
    activePhotoShareTemplate = 0;
    document.getElementById("photo-gallery-screen")?.setAttribute("hidden", "");
    document.getElementById("photo-share-screen")?.removeAttribute("hidden");
    renderPhotoShare();
    requestAnimationFrame(() => document.getElementById("photo-share-screen")?.scrollIntoView({ block: "start" }));
}


function closePhotoShare() {
    document.getElementById("photo-share-screen")?.setAttribute("hidden", "");
    document.getElementById("photo-gallery-screen")?.removeAttribute("hidden");
    renderGallery();
}


function selectedSharePhotos() {
    return selectedPhotoIds
        .map(id => visiblePhotos.find(photo => photo.id === id))
        .filter(Boolean)
        .sort((a, b) => `${a.date}|${a.createdAt}`.localeCompare(`${b.date}|${b.createdAt}`));
}


function buildPhotoShareData() {
    const photos = selectedSharePhotos();
    const [before, after] = photos;
    if (!before || !after) return null;
    const milliseconds = new Date(`${after.date}T12:00:00`) - new Date(`${before.date}T12:00:00`);
    const days = Math.max(0, Math.round(milliseconds / 86400000));
    const trendSeries = calculateTrendWeightSeries(getWeightEntries(), { endDate: after.date, allowFuture: true });
    const beforeTrend = trendSeries.find(entry => entry.date === before.date)?.weight;
    const afterTrend = trendSeries.find(entry => entry.date === after.date)?.weight;
    const beforeRaw = normalizedWeight(before.weight) ?? weightForDate(before.date);
    const afterRaw = normalizedWeight(after.weight) ?? weightForDate(after.date);
    const hasTrend = Number.isFinite(beforeTrend) && Number.isFinite(afterTrend);
    const weightChange = hasTrend
        ? afterTrend - beforeTrend
        : Number.isFinite(beforeRaw) && Number.isFinite(afterRaw)
            ? afterRaw - beforeRaw
            : null;
    return {
        before,
        after,
        days,
        weeks: days >= 7 ? Math.max(1, Math.round(days / 7)) : 0,
        workoutCount: countWorkoutsBetween(before.date, after.date),
        weightChange,
        weightSource: hasTrend ? "Trend weight" : "Weight change",
        beforeWeight: beforeRaw,
        afterWeight: afterRaw
    };
}


function renderPhotoShare() {
    const carousel = document.getElementById("photo-share-carousel");
    const dots = document.getElementById("photo-share-dots");
    const data = buildPhotoShareData();
    if (!carousel || !dots || !data) return;

    const urls = [createObjectUrl(data.before.image), createObjectUrl(data.after.image)];
    carousel.className = `photo-share-carousel is-${photoShareFormat}`;
    carousel.innerHTML = PHOTO_SHARE_TEMPLATES.map((template, index) =>
        renderPhotoShareCard(template, index, data, urls)
    ).join("");
    dots.innerHTML = PHOTO_SHARE_TEMPLATES.map((template, index) =>
        `<button type="button" data-photo-share-dot="${index}" class="${index === activePhotoShareTemplate ? "is-active" : ""}" aria-label="Show ${escapeHtml(photoShareTemplateName(template))} template" aria-selected="${index === activePhotoShareTemplate}"></button>`
    ).join("");

    document.querySelectorAll("[data-photo-share-format]").forEach(button =>
        button.setAttribute("aria-pressed", String(button.dataset.photoShareFormat === photoShareFormat))
    );
    const checkbox = document.getElementById("photo-share-show-weights");
    if (checkbox) checkbox.checked = photoShareShowWeights;

    carousel.querySelectorAll("[data-photo-share-slide]").forEach(card =>
        card.addEventListener("click", () => setPhotoShareTemplate(Number(card.dataset.photoShareSlide)))
    );
    dots.querySelectorAll("[data-photo-share-dot]").forEach(button =>
        button.addEventListener("click", () => setPhotoShareTemplate(Number(button.dataset.photoShareDot), true))
    );
    carousel.addEventListener("scroll", syncPhotoShareTemplateFromScroll, { passive: true });
    requestAnimationFrame(() => scrollPhotoShareTemplateIntoView(false));
}


function renderPhotoShareCard(template, index, data, urls) {
    const milestone = formatWeightMilestone(data);
    const duration = formatPhotoDuration(data.days);
    const metric = template === "weight" && milestone
        ? `<div class="photo-share-card__hero"><strong>${escapeHtml(milestone.value)}</strong><span>${escapeHtml(data.weightSource.toUpperCase())} · ${escapeHtml(duration)}</span></div>`
        : template === "training"
            ? `<div class="photo-share-card__hero"><strong>${data.workoutCount}</strong><span>${data.workoutCount === 1 ? "WORKOUT" : "WORKOUTS"} COMPLETED · ${escapeHtml(duration)}</span></div>`
            : template === "timeline"
                ? `<div class="photo-share-card__hero"><strong>${data.days}</strong><span>${data.days === 1 ? "DAY" : "DAYS"} OF PROGRESS</span></div>`
                : template === "before-after"
                    ? `<div class="photo-share-card__hero"><strong>MY PROGRESS</strong><span>${escapeHtml(duration)}</span></div>`
                    : "";
    const cropBefore = photoCropStates.get(data.before.id) || { scale: 1, nx: 0, ny: 0 };
    const cropAfter = photoCropStates.get(data.after.id) || { scale: 1, nx: 0, ny: 0 };
    return `<article class="photo-share-card is-${template}${index === activePhotoShareTemplate ? " is-active" : ""}" data-photo-share-slide="${index}">
        <header><span class="photo-share-brand"><img src="${PHOTO_SHARE_LOGO}" alt=""><b><i>LEVEL</i> <em>UP</em></b></span><small>${escapeHtml(photoShareTemplateName(template).toUpperCase())}</small></header>
        ${metric}
        <div class="photo-share-card__photos">
            ${renderSharePhoto(data.before, urls[0], "BEFORE", cropBefore)}
            ${renderSharePhoto(data.after, urls[1], "AFTER", cropAfter)}
        </div>
        <footer><span>${escapeHtml(duration)}</span><strong>${PHOTO_SHARE_URL}</strong></footer>
    </article>`;
}


function renderSharePhoto(photo, url, label, crop) {
    const scale = clampZoom(crop.scale);
    const xPercent = (Number(crop.nx) || 0) * (scale - 1) * 50;
    const yPercent = (Number(crop.ny) || 0) * (scale - 1) * 50;
    const weight = normalizedWeight(photo.weight) ?? weightForDate(photo.date);
    const shownWeight = photoShareShowWeights && weight !== null
        ? `<small>${escapeHtml(formatWeightValue(weight))}</small>`
        : "";
    return `<figure><div><img src="${url}" alt="${label} progress photo" style="transform:translate(${xPercent}%,${yPercent}%) scale(${scale})"></div><figcaption><b>${label}</b><span>${escapeHtml(formatShortDateWithYear(photo.date))}</span>${shownWeight}</figcaption></figure>`;
}


function setPhotoShareTemplate(index, scroll = false) {
    activePhotoShareTemplate = Math.max(0, Math.min(PHOTO_SHARE_TEMPLATES.length - 1, Number(index) || 0));
    document.querySelectorAll("[data-photo-share-slide]").forEach(card =>
        card.classList.toggle("is-active", Number(card.dataset.photoShareSlide) === activePhotoShareTemplate)
    );
    document.querySelectorAll("[data-photo-share-dot]").forEach(button => {
        const active = Number(button.dataset.photoShareDot) === activePhotoShareTemplate;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
    });
    if (scroll) scrollPhotoShareTemplateIntoView(true);
}


function scrollPhotoShareTemplateIntoView(smooth) {
    document.querySelector(`[data-photo-share-slide="${activePhotoShareTemplate}"]`)?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        inline: "center",
        block: "nearest"
    });
}


function syncPhotoShareTemplateFromScroll(event) {
    const carousel = event.currentTarget;
    cancelAnimationFrame(carousel._photoShareFrame);
    carousel._photoShareFrame = requestAnimationFrame(() => {
        const center = carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
        const slides = [...carousel.querySelectorAll("[data-photo-share-slide]")];
        const closest = slides.reduce((best, slide) => {
            const rect = slide.getBoundingClientRect();
            const distance = Math.abs(rect.left + rect.width / 2 - center);
            return !best || distance < best.distance ? { index: Number(slide.dataset.photoShareSlide), distance } : best;
        }, null);
        if (closest) setPhotoShareTemplate(closest.index);
    });
}


function photoShareTemplateName(template) {
    return ({
        "before-after": "Before & After",
        weight: "Weight Milestone",
        training: "Training Milestone",
        timeline: "Consistency",
        minimal: "Minimal"
    })[template] || "Progress";
}


async function exportActivePhotoShare() {
    const button = document.getElementById("export-photo-share");
    const status = document.getElementById("photo-share-status");
    const data = buildPhotoShareData();
    if (!button || !status || !data) return;
    button.disabled = true;
    status.textContent = "Preparing your progress card…";
    try {
        const blob = await createPhotoShareImage(data, activePhotoShareTemplate, photoShareFormat);
        const file = new File([blob], `level-up-progress-${data.before.date}-to-${data.after.date}.png`, { type: "image/png" });
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            await navigator.share({
                title: "My Level Up progress",
                text: `${formatPhotoDuration(data.days)} of progress with Level Up. https://${PHOTO_SHARE_URL}`,
                files: [file]
            });
            status.textContent = "Progress card shared.";
        }
        else if (await savePhotoShareToPhotos(blob)) {
            status.textContent = "Progress card saved to Photos.";
        }
        else {
            downloadPhotoShare(blob, file.name);
            status.textContent = "Progress card downloaded.";
        }
    }
    catch (error) {
        status.textContent = error?.name === "AbortError"
            ? "Sharing cancelled."
            : "The progress card could not be prepared. Please try again.";
    }
    finally {
        button.disabled = false;
    }
}


async function createPhotoShareImage(data, index, formatName) {
    const format = PHOTO_SHARE_FORMATS[formatName] || PHOTO_SHARE_FORMATS.post;
    const canvas = document.createElement("canvas");
    canvas.width = format.width;
    canvas.height = format.height;
    const context = canvas.getContext("2d");
    const template = PHOTO_SHARE_TEMPLATES[index] || PHOTO_SHARE_TEMPLATES[0];
    const [beforeImage, afterImage, logo] = await Promise.all([
        loadPhotoShareImage(data.before.image),
        loadPhotoShareImage(data.after.image),
        loadPhotoShareImage(PHOTO_SHARE_LOGO).catch(() => null)
    ]);
    drawPhotoShareBackground(context, canvas.width, canvas.height);

    const margin = Math.round(canvas.width * .06);
    const headerHeight = Math.round(canvas.height * .095);
    const footerHeight = Math.round(canvas.height * .085);
    const metricHeight = template === "minimal" ? 0 : Math.round(canvas.height * .14);
    const photosTop = margin + headerHeight + metricHeight;
    const photosBottom = canvas.height - margin - footerHeight;
    const photoGap = Math.max(8, Math.round(canvas.width * .012));
    const photoWidth = (canvas.width - (margin * 2) - photoGap) / 2;
    const photoHeight = photosBottom - photosTop;

    drawPhotoShareHeader(context, logo, margin, margin, canvas.width - margin * 2, headerHeight, template);
    if (metricHeight) drawPhotoShareMetric(context, data, template, canvas.width / 2, margin + headerHeight, metricHeight);

    drawPhotoSharePhoto(context, beforeImage, data.before, data.beforeWeight, "BEFORE", margin, photosTop, photoWidth, photoHeight, photoCropStates.get(data.before.id));
    drawPhotoSharePhoto(context, afterImage, data.after, data.afterWeight, "AFTER", margin + photoWidth + photoGap, photosTop, photoWidth, photoHeight, photoCropStates.get(data.after.id));
    drawPhotoShareFooter(context, data, margin, photosBottom, canvas.width - margin * 2, footerHeight);

    return new Promise((resolve, reject) =>
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image export failed.")), "image/png", .96)
    );
}


function drawPhotoShareBackground(context, width, height) {
    context.fillStyle = "#09090b";
    context.fillRect(0, 0, width, height);
    const glow = context.createRadialGradient(width * .5, height * .35, 20, width * .5, height * .35, height * .7);
    glow.addColorStop(0, "rgba(223,20,30,.22)");
    glow.addColorStop(1, "rgba(9,9,11,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
}


function drawPhotoShareHeader(context, logo, x, y, width, height, template) {
    if (logo) context.drawImage(logo, x, y + height * .08, height * .72, height * .72);
    context.textBaseline = "middle";
    context.textAlign = "left";
    context.font = `italic 950 ${Math.round(height * .3)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    context.fillStyle = "#f7f7f8";
    context.fillText("LEVEL", x + height * .84, y + height * .43);
    const levelWidth = context.measureText("LEVEL ").width;
    context.fillStyle = "#df141e";
    context.fillText("UP", x + height * .84 + levelWidth, y + height * .43);
    context.textAlign = "right";
    context.font = `800 ${Math.round(height * .16)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    context.fillStyle = "#a8a8b1";
    context.fillText(photoShareTemplateName(template).toUpperCase(), x + width, y + height * .43);
}


function drawPhotoShareMetric(context, data, template, centerX, y, height) {
    let primary = "MY PROGRESS";
    let secondary = formatPhotoDuration(data.days).toUpperCase();
    const milestone = formatWeightMilestone(data);
    if (template === "weight" && milestone) {
        primary = milestone.value;
        secondary = `${data.weightSource.toUpperCase()} · ${secondary}`;
    }
    else if (template === "training") {
        primary = String(data.workoutCount);
        secondary = `${data.workoutCount === 1 ? "WORKOUT" : "WORKOUTS"} COMPLETED · ${secondary}`;
    }
    else if (template === "timeline") {
        primary = String(data.days);
        secondary = `${data.days === 1 ? "DAY" : "DAYS"} OF PROGRESS`;
    }
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = template === "before-after" ? "#f7f7f8" : "#df141e";
    context.font = `950 ${Math.round(height * .43)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    fitCanvasText(context, primary, centerX, y + height * .38, 920);
    context.fillStyle = "#b3b3bc";
    context.font = `800 ${Math.round(height * .14)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    context.fillText(secondary, centerX, y + height * .76);
}


function drawPhotoSharePhoto(context, image, photo, rawWeight, label, x, y, width, height, crop) {
    const captionHeight = Math.max(86, height * .12);
    const imageHeight = height - captionHeight;
    context.save();
    roundedCanvasPath(context, x, y, width, height, Math.max(18, width * .045));
    context.clip();
    context.fillStyle = "#050506";
    context.fillRect(x, y, width, imageHeight);
    drawCroppedPhoto(context, image, x, y, width, imageHeight, crop);
    context.fillStyle = "#1c1c22";
    context.fillRect(x, y + imageHeight, width, captionHeight);
    context.restore();
    context.textBaseline = "middle";
    context.textAlign = "left";
    context.fillStyle = "#df141e";
    context.font = `900 ${Math.round(captionHeight * .23)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    context.fillText(label, x + captionHeight * .22, y + imageHeight + captionHeight * .34);
    context.fillStyle = "#f7f7f8";
    context.font = `750 ${Math.round(captionHeight * .19)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    context.fillText(formatShortDateWithYear(photo.date), x + captionHeight * .22, y + imageHeight + captionHeight * .67);
    if (photoShareShowWeights && Number.isFinite(rawWeight)) {
        context.textAlign = "right";
        context.fillStyle = "#a8a8b1";
        context.fillText(formatWeightValue(rawWeight), x + width - captionHeight * .22, y + imageHeight + captionHeight * .67);
    }
}


function drawCroppedPhoto(context, image, x, y, width, height, crop = {}) {
    const scale = clampZoom(crop?.scale);
    const sourceRatio = image.width / image.height;
    const destinationRatio = width / height;
    let sourceWidth = sourceRatio > destinationRatio ? image.height * destinationRatio : image.width;
    let sourceHeight = sourceRatio > destinationRatio ? image.height : image.width / destinationRatio;
    sourceWidth /= scale;
    sourceHeight /= scale;
    const nx = Math.max(-1, Math.min(1, Number(crop?.nx) || 0));
    const ny = Math.max(-1, Math.min(1, Number(crop?.ny) || 0));
    const sourceX = Math.max(0, Math.min(image.width - sourceWidth, (image.width - sourceWidth) / 2 - nx * (image.width - sourceWidth) / 2));
    const sourceY = Math.max(0, Math.min(image.height - sourceHeight, (image.height - sourceHeight) / 2 - ny * (image.height - sourceHeight) / 2));
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}


function drawPhotoShareFooter(context, data, x, y, width, height) {
    context.strokeStyle = "#34343a";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y + height * .25);
    context.lineTo(x + width, y + height * .25);
    context.stroke();
    context.textBaseline = "middle";
    context.font = `750 ${Math.round(height * .18)}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    context.textAlign = "left";
    context.fillStyle = "#a8a8b1";
    context.fillText(formatPhotoDuration(data.days), x, y + height * .64);
    context.textAlign = "right";
    context.fillStyle = "#df141e";
    context.fillText(PHOTO_SHARE_URL, x + width, y + height * .64);
}


function roundedCanvasPath(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
}


function fitCanvasText(context, text, x, y, maxWidth) {
    while (context.measureText(text).width > maxWidth) {
        const match = context.font.match(/(\d+)px/);
        const size = Number(match?.[1]);
        if (!size || size <= 24) break;
        context.font = context.font.replace(`${size}px`, `${size - 2}px`);
    }
    context.fillText(text, x, y);
}


function loadPhotoShareImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        let url = "";
        image.onload = () => {
            if (url) URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = error => {
            if (url) URL.revokeObjectURL(url);
            reject(error);
        };
        if (source instanceof Blob) {
            url = URL.createObjectURL(source);
            image.src = url;
        }
        else image.src = String(source);
    });
}


async function savePhotoShareToPhotos(blob) {
    const plugin = window.Capacitor?.Plugins?.LevelUpInstagramShare;
    if (window.Capacitor?.isNativePlatform?.() !== true || !plugin?.saveImage) return false;
    const dataUrl = await blobToDataUrl(blob);
    const result = await plugin.saveImage({ imageData: String(dataUrl).split(",")[1] || "" });
    return result?.saved === true;
}


function downloadPhotoShare(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}


function countWorkoutsBetween(startDate, endDate) {
    let sessions = [];
    try {
        const parsed = JSON.parse(localStorage.getItem(WORKOUT_STORAGE_KEY) || "[]");
        if (Array.isArray(parsed)) sessions = parsed;
    }
    catch {}
    return sessions.filter(session => {
        if (!session?.completedAt && !session?.date) return false;
        const date = String(session.date || session.completedAt).slice(0, 10);
        return date >= startDate && date <= endDate;
    }).length;
}


function formatWeightMilestone(data) {
    if (!Number.isFinite(data.weightChange)) return null;
    const shown = Math.abs(displayMass(data.weightChange, 1, UNIT_KINDS.BODY_WEIGHT));
    const unit = massUnit(UNIT_KINDS.BODY_WEIGHT);
    if (shown < .05) return { value: "WEIGHT MAINTAINED" };
    return { value: `${shown.toFixed(1)} ${unit} ${data.weightChange < 0 ? "DOWN" : "UP"}` };
}


function formatPhotoDuration(days) {
    if (days === 0) return "Same-day comparison";
    if (days >= 14 && days % 7 === 0) return `${days / 7} weeks of progress`;
    return `${days} ${days === 1 ? "day" : "days"} of progress`;
}


function formatWeightValue(weight) {
    const shown = displayMass(weight, 1, UNIT_KINDS.BODY_WEIGHT);
    return `${Number(shown).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${massUnit(UNIT_KINDS.BODY_WEIGHT)}`;
}


function formatShortDateWithYear(value) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
        .format(new Date(`${value}T12:00:00`));
}


function clampZoom(value) {
    return Math.min(4, Math.max(1, Number(value) || 1));
}


function installPhotoPinchZoom(pane, photoId) {
    const image = pane.querySelector("img");
    if (!image) return;

    const pointers = new Map();
    const saved = photoCropStates.get(photoId) || {};
    const state = {
        scale: clampZoom(saved.scale),
        x: 0,
        y: 0,
        startScale: 1,
        startX: 0,
        startY: 0,
        startDistance: 0,
        startMidX: 0,
        startMidY: 0,
        panPointerX: 0,
        panPointerY: 0
    };

    const applyTransform = () => {
        const maxX = pane.clientWidth * (state.scale - 1) / 2;
        const maxY = pane.clientHeight * (state.scale - 1) / 2;
        if (state.restorePosition) {
            state.x = (Number(saved.nx) || 0) * maxX;
            state.y = (Number(saved.ny) || 0) * maxY;
            state.restorePosition = false;
        }
        state.x = Math.max(-maxX, Math.min(maxX, state.x));
        state.y = Math.max(-maxY, Math.min(maxY, state.y));
        if (state.scale === 1) state.x = state.y = 0;
        image.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
        if (photoId) photoCropStates.set(photoId, {
            scale: state.scale,
            nx: maxX ? state.x / maxX : 0,
            ny: maxY ? state.y / maxY : 0
        });
    };
    state.restorePosition = true;
    requestAnimationFrame(applyTransform);

    const pointerPair = () => [...pointers.values()].slice(0, 2);
    const distance = ([first, second]) => Math.hypot(second.x - first.x, second.y - first.y);
    const midpoint = ([first, second]) => ({
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2
    });

    pane.addEventListener("pointerdown", event => {
        pane.setPointerCapture?.(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 1) {
            state.startX = state.x;
            state.startY = state.y;
            state.panPointerX = event.clientX;
            state.panPointerY = event.clientY;
        }
        else if (pointers.size === 2) {
            const pair = pointerPair();
            const mid = midpoint(pair);
            state.startDistance = Math.max(1, distance(pair));
            state.startScale = state.scale;
            state.startX = state.x;
            state.startY = state.y;
            state.startMidX = mid.x;
            state.startMidY = mid.y;
        }
    });

    pane.addEventListener("pointermove", event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size >= 2) {
            const pair = pointerPair();
            const mid = midpoint(pair);
            state.scale = clampZoom(state.startScale * distance(pair) / state.startDistance);
            state.x = state.startX + mid.x - state.startMidX;
            state.y = state.startY + mid.y - state.startMidY;
        }
        else if (state.scale > 1) {
            state.x = state.startX + event.clientX - state.panPointerX;
            state.y = state.startY + event.clientY - state.panPointerY;
        }
        applyTransform();
    });

    const releasePointer = event => {
        pointers.delete(event.pointerId);
        if (pointers.size === 1) {
            const remaining = [...pointers.values()][0];
            state.startX = state.x;
            state.startY = state.y;
            state.panPointerX = remaining.x;
            state.panPointerY = remaining.y;
        }
    };
    pane.addEventListener("pointerup", releasePointer);
    pane.addEventListener("pointercancel", releasePointer);
    pane.addEventListener("lostpointercapture", releasePointer);

    pane.addEventListener("dblclick", () => {
        state.scale = 1;
        state.x = state.y = 0;
        applyTransform();
    });
}


function bindRemoveButtons(root) {
    root.querySelectorAll(".remove-journal-photo").forEach(button =>
        button.addEventListener("click", () => removePhoto(button.dataset.photoId))
    );
}


async function removePhoto(
    id
) {

    const photo =
        await getPhoto(
            id
        );


    if (!photo) {
        return;
    }


    const confirmed =
        window.confirm(
            `Remove the journal photo from ${formatDate(
                photo.date
            )}? This cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    const plugin = nativePhotoPlugin();
    if (plugin) {
        await plugin.deletePhoto({ id, owner: photoOwner() });
    }
    else {
        const database = await openDatabase();
        await requestAsPromise(
            database.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).delete(id)
        );
        database.close();
    }


    await renderPhotos();

}


async function savePhotoRecord(
    photo
) {

    const plugin = nativePhotoPlugin();
    if (plugin) {
        await plugin.savePhoto({
            id: photo.id,
            date: photo.date,
            note: photo.note || "",
            weight: normalizedWeight(photo.weight),
            createdAt: photo.createdAt,
            imageData: await blobToDataUrl(photo.image),
            owner: photoOwner()
        });
        return;
    }

    const database =
        await openDatabase();


    await requestAsPromise(
        database
            .transaction(
                PHOTO_STORE,
                "readwrite"
            )
            .objectStore(
                PHOTO_STORE
            )
            .put(
                photo
            )
    );

}


async function getAllPhotos() {

    const plugin = nativePhotoPlugin();
    if (plugin) {
        const result = await plugin.listPhotos({ owner: photoOwner() });
        return (Array.isArray(result?.photos) ? result.photos : []).map(nativePhotoRecord);
    }

    return getAllLegacyPhotos();
}


async function getAllLegacyPhotos() {

    const database =
        await openDatabase();


    let photos;

    try {
        photos =
            await requestAsPromise(
                database
                    .transaction(
                        PHOTO_STORE,
                        "readonly"
                    )
                    .objectStore(
                        PHOTO_STORE
                    )
                    .getAll()
            );
    }
    finally {
        database.close();
    }


    return photos.sort(
        (a, b) =>
            String(
                b.date
            )
            .localeCompare(
                String(
                    a.date
                )
            ) ||
            String(
                b.createdAt
            )
            .localeCompare(
                String(
                    a.createdAt
                )
            )
    );

}


async function getPhoto(
    id
) {

    const plugin = nativePhotoPlugin();
    if (plugin) {
        return (await getAllPhotos()).find(photo => photo.id === id) || null;
    }

    const database =
        await openDatabase();


    return requestAsPromise(
        database
            .transaction(
                PHOTO_STORE,
                "readonly"
            )
            .objectStore(
                PHOTO_STORE
            )
            .get(
                id
            )
    );

}


function nativePhotoPlugin() {
    if (window.Capacitor?.isNativePlatform?.() !== true || window.Capacitor?.getPlatform?.() !== "ios") return null;
    const plugin = window.Capacitor?.Plugins?.LevelUpProgressPhotos;
    return plugin?.savePhoto && plugin?.listPhotos && plugin?.deletePhoto ? plugin : null;
}


function nativePhotoRecord(record) {
    return {
        id: String(record?.id || ""),
        date: String(record?.date || ""),
        note: String(record?.note || "").slice(0, 160),
        weight: normalizedWeight(record?.weight),
        createdAt: String(record?.createdAt || ""),
        image: dataUrlToBlob(String(record?.image || ""))
    };
}


function photoOwner() {
    for (const key of [ACCOUNT_STORAGE_KEY, SESSION_STORAGE_KEY]) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            const identifier = value?.id || value?.userId || value?.email || value?.account?.id || value?.account?.email;
            if (identifier) return String(identifier);
        }
        catch {}
    }
    return "local-device-owner";
}


function openDatabase() {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    DATABASE_NAME,
                    DATABASE_VERSION
                );


            request.onupgradeneeded =
                () => {

                    const database =
                        request.result;


                    if (
                        !database
                            .objectStoreNames
                            .contains(
                                PHOTO_STORE
                            )
                    ) {

                        database.createObjectStore(
                            PHOTO_STORE,
                            {
                                keyPath:
                                    "id"
                            }
                        );

                    }

                };


            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );


            request.onerror =
                () =>
                    reject(
                        request.error
                    );


            request.onblocked =
                () =>
                    reject(
                        new Error(
                            "Photo storage is temporarily unavailable."
                        )
                    );

        }
    );

}


function requestAsPromise(
    request
) {

    return new Promise(
        (resolve, reject) => {

            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );


            request.onerror =
                () =>
                    reject(
                        request.error
                    );

        }
    );

}


function resizeImage(
    file
) {

    return new Promise(
        (resolve, reject) => {

            const image =
                new Image();


            const url =
                URL.createObjectURL(
                    file
                );


            image.onload =
                () => {

                    const ratio =
                        Math.min(
                            1,
                            MAX_IMAGE_EDGE /
                            Math.max(
                                image.width,
                                image.height
                            )
                        );


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        Math.round(
                            image.width *
                            ratio
                        );


                    canvas.height =
                        Math.round(
                            image.height *
                            ratio
                        );


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    canvas.toBlob(
                        blob => {

                            URL.revokeObjectURL(
                                url
                            );


                            if (blob) {
                                resolve(
                                    blob
                                );
                            }

                            else {
                                reject(
                                    new Error(
                                        "Image conversion failed."
                                    )
                                );
                            }

                        },
                        "image/jpeg",
                        JPEG_QUALITY
                    );

                };


            image.onerror =
                () => {

                    URL.revokeObjectURL(
                        url
                    );


                    reject(
                        new Error(
                            "Image loading failed."
                        )
                    );

                };


            image.src =
                url;

        }
    );

}


function blobToDataUrl(
    blob
) {

    if (
        typeof blob === "string" &&
        blob.startsWith("data:image/")
    ) {
        return Promise.resolve(
            blob
        );
    }


    if (
        typeof Blob === "undefined" ||
        !(blob instanceof Blob)
    ) {
        return Promise.reject(
            new Error(
                "A Photo Journal image has an unsupported format."
            )
        );
    }

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload =
                () =>
                    resolve(
                        reader.result
                    );


            reader.onerror =
                () =>
                    reject(
                        reader.error
                    );


            reader.readAsDataURL(
                blob
            );

        }
    );

}


function dataUrlToBlob(
    dataUrl
) {

    const [
        metadata,
        encoded
    ] =
        String(
            dataUrl
        )
        .split(",");


    const mime =
        metadata.match(
            /data:(.*?);base64/
        )
        ?.[1] ||
        "image/jpeg";


    const binary =
        atob(
            encoded
        );


    const bytes =
        new Uint8Array(
            binary.length
        );


    for (
        let index = 0;
        index <
            binary.length;
        index++
    ) {

        bytes[index] =
            binary.charCodeAt(
                index
            );

    }


    return new Blob(
        [
            bytes
        ],
        {
            type:
                mime
        }
    );

}


function createObjectUrl(
    blob
) {

    const url =
        URL.createObjectURL(
            blob
        );


    activeObjectUrls.push(
        url
    );


    return url;

}


function revokeObjectUrls() {

    activeObjectUrls.forEach(
        url =>
            URL.revokeObjectURL(
                url
            )
    );


    activeObjectUrls = [];

}


function setPhotoMessage(
    message,
    isError = false
) {

    const element =
        document.getElementById(
            "photo-journal-message"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.toggle(
        "error",
        isError
    );

}


function getWeightEntries() {
    try {
        const entries = JSON.parse(localStorage.getItem(WEIGHT_STORAGE_KEY) || "[]");
        return Array.isArray(entries) ? entries : [];
    }
    catch {
        return [];
    }
}


function weightForDate(date) {
    const entry = getWeightEntries()
        .filter(item => item?.date === date && normalizedWeight(item?.weight) !== null)
        .at(-1);
    return normalizedWeight(entry?.weight);
}


function syncWeightForDate(date) {
    const input = document.getElementById("photo-journal-weight");
    if (!input) return;
    const weight = weightForDate(date);
    const shown = weight === null
        ? null
        : displayMass(weight, 1, UNIT_KINDS.BODY_WEIGHT);
    input.value = shown === null ? "" : String(shown);
}


function normalizedWeight(value) {
    const weight = Number(value);
    return Number.isFinite(weight) && weight > 0 ? weight : null;
}


function formatPhotoWeight(photo) {
    const weight = normalizedWeight(photo?.weight) ?? weightForDate(photo?.date);
    if (weight === null) return "No weight logged";
    const shown = displayMass(weight, 1, UNIT_KINDS.BODY_WEIGHT);
    return `${Number(shown).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${massUnit(UNIT_KINDS.BODY_WEIGHT)}`;
}


function formatDate(
    value
) {

    return new Intl.DateTimeFormat(
        undefined,
        {
            year:
                "numeric",

            month:
                "short",

            day:
                "numeric"
        }
    )
    .format(
        new Date(
            `${value}T12:00:00`
        )
    );

}


function formatLongDate(value) {
    return new Intl.DateTimeFormat(
        undefined,
        {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    ).format(new Date(`${value}T12:00:00`));
}


function formatShortDate(value) {
    return new Intl.DateTimeFormat(
        undefined,
        { month: "short", day: "numeric" }
    ).format(new Date(`${value}T12:00:00`));
}


function formatMonthYear(value) {
    const [year, month] = String(value).split("-").map(Number);
    if (!year || !month) return String(value || "");
    return new Intl.DateTimeFormat(
        undefined,
        { month: "long", year: "numeric" }
    ).format(new Date(year, month - 1, 1));
}


function getLocalDateValue() {

    const now =
        new Date();


    return new Date(
        now.getTime() -
        now.getTimezoneOffset() *
        60000
    )
    .toISOString()
    .slice(0, 10);

}


function escapeHtml(
    value
) {

    return String(
        value ??
        ""
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
