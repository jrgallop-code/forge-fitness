import {
    exportPhotoRecords,
    importPhotoRecords
}
from "../progress/photo-journal.js";


const APP_STORAGE_PREFIXES = [
    "forge_",
    "level_up_"
];

const MAX_BACKUP_SIZE =
    100 *
    1024 *
    1024;


export function initializeBackupManager() {

    const exportButton =
        document.getElementById(
            "export-backup-btn"
        );

    const importButton =
        document.getElementById(
            "import-backup-btn"
        );

    const fileInput =
        document.getElementById(
            "backup-file-input"
        );

    exportButton?.addEventListener(
        "click",
        exportBackup
    );

    importButton?.addEventListener(
        "click",
        () =>
            fileInput?.click()
    );

    fileInput?.addEventListener(
        "change",
        event =>
            importBackup(
                event.target
                    .files?.[0],
                fileInput
            )
    );

}


function isLevelUpStorageKey(key) {
    return APP_STORAGE_PREFIXES.some(prefix =>
        String(key || "").startsWith(prefix)
    );
}


function getBackupKeys() {
    const keys = [];

    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && isLevelUpStorageKey(key)) {
            keys.push(key);
        }
    }

    return keys.sort();
}


function setBackupMessage(message, type = "") {
    const element =
        document.getElementById(
            "backup-message"
        );

    if (!element) {
        return;
    }

    element.textContent = message;
    element.dataset.status = type;
}


async function exportBackup() {
    try {
        setBackupMessage(
            "Preparing backup…"
        );

        const data = {};
        const backupKeys = getBackupKeys();

        backupKeys.forEach(key => {

            const stored =
                localStorage.getItem(
                    key
                );

            if (stored === null) {
                data[key] = null;
                return;
            }

            try {
                data[key] =
                    JSON.parse(
                        stored
                    );
            }
            catch {
                data[key] = stored;
            }

        });

        const photos =
            await exportPhotoRecords();

        const backup = {
            app: "level-up",
            formatVersion: 2,
            exportedAt:
                new Date()
                    .toISOString(),
            storageKeyCount:
                backupKeys.length,
            data,
            photos
        };

        const json =
            JSON.stringify(
                backup,
                null,
                2
            );

        // Verify the payload before offering it to the user.
        const verification = JSON.parse(json);
        if (
            verification?.app !== "level-up" ||
            typeof verification?.data !== "object" ||
            verification.data === null
        ) {
            throw new Error(
                "Backup verification failed."
            );
        }

        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json"
                }
            );

        const filename =
            `level-up-backup-${getLocalDateValue()}.json`;

        const file =
            typeof File === "function"
                ? new File(
                    [blob],
                    filename,
                    {
                        type:
                            "application/json"
                    }
                )
                : null;

        // On iPhone/iPad, the native share sheet is more reliable than a
        // synthetic download and lets the user save directly to Files.
        if (
            file &&
            navigator.share &&
            navigator.canShare?.({ files: [file] })
        ) {
            try {
                await navigator.share({
                    files: [file],
                    title: "Level Up Backup"
                });

                setBackupMessage(
                    `Backup ready: ${backupKeys.length} app data sections${photos?.length ? ` + ${photos.length} photo record${photos.length === 1 ? "" : "s"}` : ""}.`,
                    "success"
                );
                return;
            }
            catch (error) {
                if (error?.name === "AbortError") {
                    setBackupMessage(
                        "Backup prepared. Export cancelled before saving."
                    );
                    return;
                }
                // Fall back to a normal browser download below.
            }
        }

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;
        link.download = filename;

        document.body.appendChild(
            link
        );

        link.click();
        link.remove();

        setTimeout(
            () => URL.revokeObjectURL(url),
            1000
        );

        setBackupMessage(
            `Backup exported: ${backupKeys.length} app data sections${photos?.length ? ` + ${photos.length} photo record${photos.length === 1 ? "" : "s"}` : ""}.`,
            "success"
        );
    }
    catch (error) {
        console.error(
            "Backup export failed:",
            error
        );

        setBackupMessage(
            error?.message ||
            "The backup could not be exported.",
            "error"
        );
    }
}


async function importBackup(file, fileInput) {
    try {
        if (!file) {
            return;
        }

        if (file.size > MAX_BACKUP_SIZE) {
            throw new Error(
                "Backup file is too large."
            );
        }

        setBackupMessage(
            "Checking backup…"
        );

        const text =
            await file.text();
        const backup =
            JSON.parse(text);

        if (
            backup?.app !== "level-up" ||
            typeof backup?.data !== "object" ||
            backup.data === null
        ) {
            throw new Error(
                "This is not a valid Level Up backup."
            );
        }

        const incomingKeys =
            Object.keys(backup.data)
                .filter(isLevelUpStorageKey);

        if (!incomingKeys.length && !Array.isArray(backup.photos)) {
            throw new Error(
                "This backup does not contain Level Up data."
            );
        }

        const confirmed =
            window.confirm(
                `Import this Level Up backup? ${incomingKeys.length} app data sections will be restored. Existing local data for included sections will be replaced.`
            );

        if (!confirmed) {
            setBackupMessage(
                "Restore cancelled."
            );
            return;
        }

        incomingKeys.forEach(key => {
            const value =
                backup.data[key];

            if (
                value === null ||
                value === undefined
            ) {
                localStorage.removeItem(key);
                return;
            }

            localStorage.setItem(
                key,
                typeof value === "string"
                    ? value
                    : JSON.stringify(value)
            );
        });

        if (Array.isArray(backup.photos)) {
            await importPhotoRecords(
                backup.photos
            );
        }

        window.alert(
            "Backup imported successfully. Level Up will reload now."
        );
        window.location.reload();
    }
    catch (error) {
        console.error(
            "Backup import failed:",
            error
        );

        setBackupMessage(
            error?.message ||
            "The backup could not be imported.",
            "error"
        );

        window.alert(
            error?.message ||
            "The backup could not be imported."
        );
    }
    finally {
        if (fileInput) {
            fileInput.value = "";
        }
    }
}


function getLocalDateValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
