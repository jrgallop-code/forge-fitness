import {
    exportPhotoRecords,
    importPhotoRecords
}
from "../progress/photo-journal.js";


const BACKUP_KEYS = [
    "forge_workout_plans",
    "forge_workout_sessions",
    "level_up_active_workout",
    "forge_custom_exercises",
    "forge_weight_entries",
    "level_up_nutrition_habits",
    "level_up_water_entries",
    "level_up_sleep_entries",
    "level_up_body_measurements"
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


async function exportBackup() {

    const data = {};


    BACKUP_KEYS.forEach(key => {

        const stored =
            localStorage.getItem(
                key
            );


        if (stored === null) {

            data[key] =
                null;

            return;

        }


        try {

            data[key] =
                JSON.parse(
                    stored
                );

        }

        catch {

            data[key] =
                stored;

        }

    });


    const backup = {

        app:
            "level-up",

        formatVersion:
            1,

        exportedAt:
            new Date()
                .toISOString(),

        data,

        photos:
            await exportPhotoRecords()

    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    backup,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        `level-up-backup-${getLocalDateValue()}.json`;


    document.body.appendChild(
        link
    );


    link.click();
    link.remove();


    URL.revokeObjectURL(
        url
    );
}


async function importBackup(file, fileInput) {
    try {
        if (!file) {
            return;
        }

        if (file.size > MAX_BACKUP_SIZE) {
            throw new Error("Backup file is too large.");
        }

        const text = await file.text();
        const backup = JSON.parse(text);

        if (
            backup?.app !== "level-up" ||
            typeof backup?.data !== "object" ||
            backup.data === null
        ) {
            throw new Error("This is not a valid Level Up backup.");
        }

        const confirmed = window.confirm(
            "Import this Level Up backup? Existing local data for included sections will be replaced."
        );

        if (!confirmed) {
            return;
        }

        BACKUP_KEYS.forEach(key => {
            if (!(key in backup.data)) {
                return;
            }

            const value = backup.data[key];

            if (value === null || value === undefined) {
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
            await importPhotoRecords(backup.photos);
        }

        window.alert("Backup imported. Reloading Level Up now.");
        window.location.reload();
    }
    catch (error) {
        console.error("Backup import failed:", error);
        window.alert(error?.message || "The backup could not be imported.");
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
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
