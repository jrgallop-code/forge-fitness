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
let comparisonMode = false;


export function renderPhotoJournal() {

    return `
        <section class="photo-journal">

            <div class="photo-journal-heading">

                <div>
                    <span class="eyebrow">
                        DATED MEDIA
                    </span>

                    <h3>
                        Progress Photos
                    </h3>

                    <p>
                        Save dated reference photos and compare any two side by side.
                        Photos stay inside Level Up on this iPhone and are never
                        included in cloud or device backups.
                    </p>
                </div>

                <span class="photo-private-badge">
                    🔒 On this iPhone only
                </span>

            </div>


            <div class="photo-entry-panel">

                <label>
                    Date
                    <input
                        id="photo-journal-date"
                        type="date"
                    >
                </label>

                <label>
                    Weight <span id="photo-weight-unit">(${massUnit(UNIT_KINDS.BODY_WEIGHT)})</span>
                    <input
                        id="photo-journal-weight"
                        type="number"
                        min="1"
                        max="1400"
                        step="0.1"
                        inputmode="decimal"
                        data-unit-input-ignore
                    >
                </label>

                <label>
                    Optional note
                    <input
                        id="photo-journal-note"
                        type="text"
                        maxlength="160"
                    >
                </label>

                <label class="photo-file-control">
                    Photo
                    <input
                        id="photo-journal-file"
                        type="file"
                        accept="image/*"
                    >
                </label>

                <button
                    id="save-photo-journal-btn"
                    class="primary-btn"
                    type="button"
                >
                    Save Photo
                </button>

                <span
                    id="photo-journal-message"
                    class="photo-journal-message"
                    aria-live="polite"
                ></span>

            </div>


            <div class="photo-gallery-heading">
                <div>
                    <h4>Progress Gallery</h4>
                    <span id="photo-count">0 photos</span>
                </div>
                <button
                    id="toggle-photo-compare"
                    class="photo-compare-action"
                    type="button"
                    disabled
                >
                    Compare Photos
                </button>
            </div>

            <div
                id="photo-selection-guide"
                class="photo-selection-guide"
                aria-live="polite"
                hidden
            >
                Select two photos to compare
            </div>

            <div
                id="photo-journal-gallery"
                class="photo-journal-gallery"
            >
                <div class="photo-empty-state">
                    No photos saved yet.
                </div>
            </div>

            <div
                id="photo-comparison"
                class="photo-comparison"
                hidden
            ></div>

        </section>
    `;

}


export function initializePhotoJournal() {

    if (!nativePhotoPlugin()) {
        return;
    }

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


    document
        .getElementById("toggle-photo-compare")
        ?.addEventListener("click", toggleComparisonMode);

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


    const photos =
        await getAllPhotos();

    visiblePhotos = photos;
    selectedPhotoIds = selectedPhotoIds.filter(id =>
        photos.some(photo => photo.id === id)
    );


    const gallery =
        document.getElementById(
            "photo-journal-gallery"
        );


    const count =
        document.getElementById(
            "photo-count"
        );


    if (count) {

        count.textContent =
            `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;

    }


    if (!gallery) {
        return;
    }

    gallery.classList.toggle("is-comparing", comparisonMode);


    if (!photos.length) {

        gallery.innerHTML = `
            <div class="photo-empty-state">
                No photos saved yet.
            </div>
        `;

        comparisonMode = false;
        selectedPhotoIds = [];
        updateComparisonControls();
        renderComparison();

        return;

    }


    gallery.innerHTML =
        photos.map(photo => {

            const url =
                createObjectUrl(
                    photo.image
                );


            return `
                <article
                    class="photo-journal-card${selectedPhotoIds.includes(photo.id) ? " is-selected" : ""}"
                    data-photo-id="${escapeHtml(
                        photo.id
                    )}"
                >

                    <button
                        class="photo-select-target"
                        type="button"
                        data-photo-id="${escapeHtml(photo.id)}"
                        aria-label="${selectedPhotoIds.includes(photo.id) ? "Deselect" : "Select"} photo from ${escapeHtml(formatDate(photo.date))}"
                        aria-pressed="${selectedPhotoIds.includes(photo.id) ? "true" : "false"}"
                    >
                        <img
                            src="${url}"
                            alt="Journal photo from ${escapeHtml(formatDate(photo.date))}"
                        >
                        <span class="photo-selection-number" aria-hidden="true">
                            ${selectedPhotoIds.includes(photo.id) ? selectedPhotoIds.indexOf(photo.id) + 1 : ""}
                        </span>
                    </button>

                    <div class="photo-card-copy">
                        <strong>
                            ${escapeHtml(
                                formatDate(
                                    photo.date
                                )
                            )}
                        </strong>

                        <span class="photo-card-weight">
                            ${escapeHtml(formatPhotoWeight(photo))}
                        </span>

                        <p>
                            ${photo.note
                                ? escapeHtml(
                                    photo.note
                                )
                                : "No note"}
                        </p>

                        <button
                            class="remove-journal-photo"
                            type="button"
                            data-photo-id="${escapeHtml(
                                photo.id
                            )}"
                        >
                            Remove
                        </button>
                    </div>

                </article>
            `;

        })
        .join("");


    gallery
        .querySelectorAll(
            ".photo-select-target"
        )
        .forEach(button =>
            button.addEventListener(
                "click",
                () => selectPhotoForComparison(button.dataset.photoId)
            )
        );


    gallery
        .querySelectorAll(
            ".remove-journal-photo"
        )
        .forEach(button =>
            button.addEventListener(
                "click",
                () =>
                    removePhoto(
                        button.dataset.photoId
                    )
            )
        );


    updateComparisonControls();
    renderComparison();

}


function toggleComparisonMode() {
    comparisonMode = !comparisonMode;
    selectedPhotoIds = [];
    updateComparisonControls();
    renderPhotos();
}


function selectPhotoForComparison(id) {
    if (!comparisonMode) return;

    if (selectedPhotoIds.includes(id)) {
        selectedPhotoIds = selectedPhotoIds.filter(photoId => photoId !== id);
    }
    else if (selectedPhotoIds.length < 2) {
        selectedPhotoIds.push(id);
    }
    else {
        selectedPhotoIds = [selectedPhotoIds[1], id];
    }

    if (selectedPhotoIds.length === 2) {
        selectedPhotoIds.sort((leftId, rightId) => {
            const left = visiblePhotos.find(photo => photo.id === leftId);
            const right = visiblePhotos.find(photo => photo.id === rightId);
            return `${left?.date || ""}|${left?.createdAt || ""}`
                .localeCompare(`${right?.date || ""}|${right?.createdAt || ""}`);
        });
    }

    renderPhotos();
}


function updateComparisonControls() {
    const toggle = document.getElementById("toggle-photo-compare");
    const guide = document.getElementById("photo-selection-guide");

    if (toggle) {
        toggle.disabled = visiblePhotos.length < 2;
        toggle.textContent = comparisonMode ? "Cancel" : "Compare Photos";
        toggle.classList.toggle("is-active", comparisonMode);
    }

    if (guide) {
        guide.hidden = !comparisonMode;
        guide.textContent = selectedPhotoIds.length === 0
            ? "Select two photos to compare"
            : selectedPhotoIds.length === 1
                ? "Select one more photo"
                : "Comparison ready";
    }
}


function renderComparison() {

    const container =
        document.getElementById(
            "photo-comparison"
        );


    if (!container) {
        return;
    }


    if (selectedPhotoIds.length !== 2) {
        container.hidden = true;
        container.innerHTML = "";
        return;
    }

    const [left, right] = selectedPhotoIds.map(id =>
        visiblePhotos.find(photo => photo.id === id)
    );


    if (
        !left ||
        !right
    ) {
        return;
    }


    const leftUrl = createObjectUrl(left.image);
    const rightUrl = createObjectUrl(right.image);

    container.hidden = false;
    container.innerHTML = `
        <div class="photo-comparison-heading">
            <span>PHOTO COMPARISON</span>
            <strong>${escapeHtml(formatDate(left.date))} — ${escapeHtml(formatDate(right.date))}</strong>
        </div>
        <figure>
            <img
                src="${leftUrl}"
                alt="Selected journal photo from ${escapeHtml(
                    formatDate(
                        left.date
                    )
                )}"
            >
            <figcaption>
                <strong>
                    ${escapeHtml(
                        formatDate(
                            left.date
                        )
                    )}
                </strong>
                <b>${escapeHtml(formatPhotoWeight(left))}</b>
                ${left.note ? `<span>${escapeHtml(left.note)}</span>` : ""}
            </figcaption>
        </figure>

        <figure>
            <img
                src="${rightUrl}"
                alt="Selected journal photo from ${escapeHtml(
                    formatDate(
                        right.date
                    )
                )}"
            >
            <figcaption>
                <strong>
                    ${escapeHtml(
                        formatDate(
                            right.date
                        )
                    )}
                </strong>
                <b>${escapeHtml(formatPhotoWeight(right))}</b>
                ${right.note ? `<span>${escapeHtml(right.note)}</span>` : ""}
            </figcaption>
        </figure>
    `;

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
