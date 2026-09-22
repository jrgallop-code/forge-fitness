import {
    canonicalMass,
    displayMass,
    massUnit,
    UNIT_KINDS
} from "../core/unit-system.js?v=granular-units-1";

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


let activeObjectUrls = [];
let visiblePhotos = [];
let selectedPhotoIds = [];
let activePhotoId = "";
let galleryMode = "single";
let selectedMonth = "all";
let comparisonZoom = 1;


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

                <div id="photo-zoom-controls" class="photo-zoom-controls" hidden>
                    <button type="button" data-photo-zoom="out" aria-label="Zoom out">−</button>
                    <input id="photo-zoom-range" type="range" min="1" max="3" step="0.25" value="1" aria-label="Comparison zoom">
                    <button type="button" data-photo-zoom="in" aria-label="Zoom in">＋</button>
                    <button type="button" data-photo-zoom="reset">Reset</button>
                    <span id="photo-zoom-value">100%</span>
                </div>

                <div id="photo-gallery-carousel" class="photo-gallery-carousel" aria-label="Progress photo carousel"></div>
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

    document.querySelectorAll("[data-photo-view]").forEach(button =>
        button.addEventListener("click", () => setGalleryMode(button.dataset.photoView))
    );

    document.querySelectorAll("[data-photo-zoom]").forEach(button =>
        button.addEventListener("click", () => changePhotoZoom(button.dataset.photoZoom))
    );

    document.getElementById("photo-zoom-range")?.addEventListener("input", event => {
        comparisonZoom = clampZoom(event.target.value);
        applyPhotoZoom();
    });

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
    comparisonZoom = 1;
    document.documentElement.classList.add("photo-gallery-open");
    document.getElementById("photo-journal-list-screen")?.setAttribute("hidden", "");
    document.getElementById("photo-gallery-screen")?.removeAttribute("hidden");
    renderPhotos();
    requestAnimationFrame(() => document.getElementById("photo-gallery-screen")?.scrollIntoView({ block: "start" }));
}


function closeGallery() {
    document.getElementById("photo-gallery-screen")?.setAttribute("hidden", "");
    document.getElementById("photo-journal-list-screen")?.removeAttribute("hidden");
    document.documentElement.classList.remove("photo-gallery-open");
    comparisonZoom = 1;
    renderPhotos();
}


function setGalleryMode(mode) {
    galleryMode = mode === "compare" ? "compare" : "single";
    comparisonZoom = 1;
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
        const anchor = activePhotoId && activePhotoId !== id ? activePhotoId : selectedPhotoIds[0];
        selectedPhotoIds = [anchor, id].filter(Boolean);
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
    const zoomControls = document.getElementById("photo-zoom-controls");
    if (!stage || !carousel || !zoomControls) return;

    document.querySelectorAll("[data-photo-view]").forEach(button => {
        const active = button.dataset.photoView === galleryMode;
        button.setAttribute("aria-pressed", String(active));
        button.disabled = button.dataset.photoView === "compare" && visiblePhotos.length < 2;
    });

    zoomControls.hidden = galleryMode !== "compare" || selectedPhotoIds.length !== 2;

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
    applyPhotoZoom();
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
    stage.innerHTML = `<div class="photo-viewer-compare" style="--photo-zoom:${comparisonZoom}">
        ${photos.map((photo, index) => {
            const url = createObjectUrl(photo.image);
            return `<figure>
                <div class="photo-zoom-pane" data-photo-zoom-pane>
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
    panes.forEach(pane => {
        pane.addEventListener("dblclick", () => {
            comparisonZoom = comparisonZoom > 1 ? 1 : 2.5;
            applyPhotoZoom();
        });
    });
    let syncingScroll = false;
    panes.forEach((pane, index) => {
        pane.addEventListener("scroll", () => {
            if (syncingScroll) return;
            const other = panes[index === 0 ? 1 : 0];
            if (!other) return;
            syncingScroll = true;
            const horizontal = pane.scrollWidth > pane.clientWidth
                ? pane.scrollLeft / (pane.scrollWidth - pane.clientWidth)
                : 0;
            const vertical = pane.scrollHeight > pane.clientHeight
                ? pane.scrollTop / (pane.scrollHeight - pane.clientHeight)
                : 0;
            other.scrollLeft = horizontal * Math.max(0, other.scrollWidth - other.clientWidth);
            other.scrollTop = vertical * Math.max(0, other.scrollHeight - other.clientHeight);
            requestAnimationFrame(() => { syncingScroll = false; });
        }, { passive: true });
    });
}


function changePhotoZoom(action) {
    if (action === "reset") comparisonZoom = 1;
    else comparisonZoom = clampZoom(comparisonZoom + (action === "in" ? .25 : -.25));
    applyPhotoZoom();
}


function clampZoom(value) {
    return Math.min(3, Math.max(1, Number(value) || 1));
}


function applyPhotoZoom() {
    const viewer = document.querySelector(".photo-viewer-compare");
    const range = document.getElementById("photo-zoom-range");
    const value = document.getElementById("photo-zoom-value");
    viewer?.style.setProperty("--photo-zoom", comparisonZoom);
    if (range) range.value = String(comparisonZoom);
    if (value) value.textContent = `${Math.round(comparisonZoom * 100)}%`;
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
