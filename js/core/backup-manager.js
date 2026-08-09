import {
    exportPhotoRecords,
    importPhotoRecords
}
from "../progress/photo-journal.js";

const MAX_BACKUP_SIZE = 100 * 1024 * 1024;

export function initializeBackupManager() {
    const exportButton = document.getElementById("export-backup-btn");
    const importButton = document.getElementById("import-backup-btn");
    const fileInput = document.getElementById("backup-file-input");

    exportButton?.addEventListener("click", exportBackup);
    importButton?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", event => importBackup(event.target.files?.[0], fileInput));
}

function getBackupKeys() {
    // Level Up owns this GitHub Pages origin, so every localStorage key on the
    // origin is app data. Exporting dynamically prevents newer features from
    // being missed when new storage keys are added later.
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key) keys.push(key);
    }
    return keys.sort();
}

function setBackupMessage(message, type = "") {
    const element = document.getElementById("backup-message");
    if (!element) return;
    element.textContent = message;
    element.dataset.status = type;
}

function readStorageValue(key) {
    const stored = localStorage.getItem(key);
    if (stored === null) return null;
    try {
        return JSON.parse(stored);
    }
    catch {
        return stored;
    }
}

async function createBackupSnapshot() {
    const keys = getBackupKeys();
    const data = {};
    keys.forEach(key => {
        data[key] = readStorageValue(key);
    });

    return {
        app: "level-up",
        formatVersion: 3,
        exportedAt: new Date().toISOString(),
        storageMode: "complete-local-storage",
        storageKeyCount: keys.length,
        data,
        photos: await exportPhotoRecords()
    };
}

async function exportBackup() {
    try {
        setBackupMessage("Preparing complete backup…");
        const backup = await createBackupSnapshot();
        const json = JSON.stringify(backup, null, 2);
        const verification = JSON.parse(json);

        if (verification?.app !== "level-up" || !verification?.data || typeof verification.data !== "object") {
            throw new Error("Backup verification failed.");
        }

        const blob = new Blob([json], { type: "application/json" });
        const filename = `level-up-backup-${getLocalDateValue()}.json`;
        const file = typeof File === "function"
            ? new File([blob], filename, { type: "application/json" })
            : null;

        if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: "Level Up Backup" });
                setBackupMessage(
                    `Complete backup ready: ${backup.storageKeyCount} data sections${backup.photos?.length ? ` + ${backup.photos.length} photo record${backup.photos.length === 1 ? "" : "s"}` : ""}.`,
                    "success"
                );
                return;
            }
            catch (error) {
                if (error?.name === "AbortError") {
                    setBackupMessage("Backup prepared. Export cancelled before saving.");
                    return;
                }
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setBackupMessage(
            `Complete backup exported: ${backup.storageKeyCount} data sections${backup.photos?.length ? ` + ${backup.photos.length} photo record${backup.photos.length === 1 ? "" : "s"}` : ""}.`,
            "success"
        );
    }
    catch (error) {
        console.error("Backup export failed:", error);
        setBackupMessage(error?.message || "The backup could not be exported.", "error");
    }
}

async function importBackup(file, fileInput) {
    try {
        if (!file) return;
        if (file.size > MAX_BACKUP_SIZE) throw new Error("Backup file is too large.");

        setBackupMessage("Checking backup…");
        const backup = JSON.parse(await file.text());
        if (backup?.app !== "level-up" || !backup?.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
            throw new Error("This is not a valid Level Up backup.");
        }

        const incomingKeys = Object.keys(backup.data);
        if (!incomingKeys.length && !Array.isArray(backup.photos)) {
            throw new Error("This backup does not contain Level Up data.");
        }

        const confirmed = window.confirm(
            `Import this Level Up backup? ${incomingKeys.length} app data sections will be restored. Existing local data for included sections will be replaced.`
        );
        if (!confirmed) {
            setBackupMessage("Restore cancelled.");
            return;
        }

        incomingKeys.forEach(key => {
            const value = backup.data[key];
            if (value === null || value === undefined) {
                localStorage.removeItem(key);
            }
            else {
                localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
            }
        });

        if (Array.isArray(backup.photos)) await importPhotoRecords(backup.photos);

        window.alert("Backup imported successfully. Level Up will reload now.");
        window.location.reload();
    }
    catch (error) {
        console.error("Backup import failed:", error);
        setBackupMessage(error?.message || "The backup could not be imported.", "error");
        window.alert(error?.message || "The backup could not be imported.");
    }
    finally {
        if (fileInput) fileInput.value = "";
    }
}

function getLocalDateValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
