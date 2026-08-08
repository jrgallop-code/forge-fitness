const DATABASE_NAME =
    "level_up_media";

const DATABASE_VERSION =
    1;

const PHOTO_STORE =
    "journal_photos";

const MAX_IMAGE_EDGE =
    1600;

const JPEG_QUALITY =
    0.82;


let activeObjectUrls = [];


export function renderPhotoJournal() {

    return `
        <section class="photo-journal">

            <div class="photo-journal-heading">

                <div>
                    <span class="eyebrow">
                        DATED MEDIA
                    </span>

                    <h3>
                        Photo Journal
                    </h3>

                    <p>
                        Save private, dated reference photos and notes.
                        Images remain in this browser unless exported
                        through Backup & Restore.
                    </p>
                </div>

                <span class="photo-private-badge">
                    🔒 Private on this device
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
                    Optional note
                    <input
                        id="photo-journal-note"
                        type="text"
                        maxlength="160"
                        placeholder="Equipment setup, exercise form, session memory…"
                    >
                </label>

                <label class="photo-file-control">
                    Photo
                    <input
                        id="photo-journal-file"
                        type="file"
                        accept="image/*"
                        capture="environment"
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


            <div class="photo-compare-panel">

                <div class="photo-compare-heading">
                    <div>
                        <h4>Side-by-Side Viewer</h4>
                        <p>
                            Select any two journal images to view together.
                        </p>
                    </div>
                </div>

                <div class="photo-compare-selectors">

                    <label>
                        Left photo
                        <select id="compare-photo-left">
                            <option value="">
                                Select a photo
                            </option>
                        </select>
                    </label>

                    <label>
                        Right photo
                        <select id="compare-photo-right">
                            <option value="">
                                Select a photo
                            </option>
                        </select>
                    </label>

                </div>

                <div
                    id="photo-comparison"
                    class="photo-comparison"
                >
                    <p>
                        Choose two photos to open the side-by-side viewer.
                    </p>
                </div>

            </div>


            <div class="photo-gallery-heading">
                <h4>Journal Photos</h4>
                <span id="photo-count">0 photos</span>
            </div>

            <div
                id="photo-journal-gallery"
                class="photo-journal-gallery"
            >
                <div class="photo-empty-state">
                    No photos saved yet.
                </div>
            </div>

        </section>
    `;

}


export function initializePhotoJournal() {

    const dateInput =
        document.getElementById(
            "photo-journal-date"
        );


    if (!dateInput) {
        return;
    }


    dateInput.value =
        getLocalDateValue();


    document
        .getElementById(
            "save-photo-journal-btn"
        )
        ?.addEventListener(
            "click",
            savePhoto
        );


    document
        .getElementById(
            "compare-photo-left"
        )
        ?.addEventListener(
            "change",
            renderComparison
        );


    document
        .getElementById(
            "compare-photo-right"
        )
        ?.addEventListener(
            "change",
            renderComparison
        );


    renderPhotos();

}


export async function exportPhotoRecords() {

    const photos =
        await getAllPhotos();


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


        setPhotoMessage(
            "Photo saved."
        );


        await renderPhotos();

    }

    catch {

        setPhotoMessage(
            "The photo could not be saved. Try a smaller image or free some browser storage.",
            true
        );

    }

}


async function renderPhotos() {

    revokeObjectUrls();


    const photos =
        await getAllPhotos();


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


    updateComparisonOptions(
        photos
    );


    if (!gallery) {
        return;
    }


    if (!photos.length) {

        gallery.innerHTML = `
            <div class="photo-empty-state">
                No photos saved yet.
            </div>
        `;

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
                    class="photo-journal-card"
                    data-photo-id="${escapeHtml(
                        photo.id
                    )}"
                >

                    <img
                        src="${url}"
                        alt="Journal photo from ${escapeHtml(
                            formatDate(
                                photo.date
                            )
                        )}"
                    >

                    <div class="photo-card-copy">
                        <strong>
                            ${escapeHtml(
                                formatDate(
                                    photo.date
                                )
                            )}
                        </strong>

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


    renderComparison();

}


function updateComparisonOptions(
    photos
) {

    const selects = [
        document.getElementById(
            "compare-photo-left"
        ),
        document.getElementById(
            "compare-photo-right"
        )
    ];


    selects.forEach(select => {

        if (!select) {
            return;
        }


        const current =
            select.value;


        select.innerHTML = `
            <option value="">
                Select a photo
            </option>

            ${photos.map(photo => `
                <option value="${escapeHtml(
                    photo.id
                )}">
                    ${escapeHtml(
                        formatDate(
                            photo.date
                        )
                    )}${photo.note
                        ? ` — ${escapeHtml(
                            photo.note
                        )}`
                        : ""}
                </option>
            `).join("")}
        `;


        if (
            photos.some(photo =>
                photo.id ===
                current
            )
        ) {
            select.value =
                current;
        }

    });

}


async function renderComparison() {

    const container =
        document.getElementById(
            "photo-comparison"
        );


    if (!container) {
        return;
    }


    const leftId =
        document.getElementById(
            "compare-photo-left"
        )
        ?.value;


    const rightId =
        document.getElementById(
            "compare-photo-right"
        )
        ?.value;


    if (
        !leftId ||
        !rightId
    ) {

        container.innerHTML = `
            <p>
                Choose two photos to open the side-by-side viewer.
            </p>
        `;

        return;

    }


    const [
        left,
        right
    ] =
        await Promise.all([
            getPhoto(
                leftId
            ),
            getPhoto(
                rightId
            )
        ]);


    if (
        !left ||
        !right
    ) {
        return;
    }


    const leftUrl =
        createObjectUrl(
            left.image
        );


    const rightUrl =
        createObjectUrl(
            right.image
        );


    container.innerHTML = `
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
                <span>
                    ${escapeHtml(
                        left.note ||
                        "No note"
                    )}
                </span>
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
                <span>
                    ${escapeHtml(
                        right.note ||
                        "No note"
                    )}
                </span>
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
            .delete(
                id
            )
    );


    await renderPhotos();

}


async function savePhotoRecord(
    photo
) {

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

    const database =
        await openDatabase();


    const photos =
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
