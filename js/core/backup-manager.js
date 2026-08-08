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
    "level_up_sleep_entries"
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


    setBackupMessage(
        "Backup downloaded. Save the file somewhere secure."
    );

}


async function importBackup(
    file,
    fileInput
) {

    if (!file) {
        return;
    }


    if (
        file.size >
        MAX_BACKUP_SIZE
    ) {

        setBackupMessage(
            "That file is too large to be a Level Up backup.",
            true
        );

        resetFileInput(
            fileInput
        );

        return;

    }


    try {

        const backup =
            JSON.parse(
                await file.text()
            );


        validateBackup(
            backup
        );


        const confirmed =
            window.confirm(
                "Restore this backup? Current workout, weight and nutrition data in this browser will be replaced. This cannot be undone."
            );


        if (!confirmed) {

            resetFileInput(
                fileInput
            );

            return;

        }


        BACKUP_KEYS.forEach(key => {

            const value =
                backup.data[key];


            if (
                value ===
                null ||
                value ===
                undefined
            ) {

                localStorage.removeItem(
                    key
                );

                return;

            }


            localStorage.setItem(
                key,
                typeof value ===
                    "string"
                    ? value
                    : JSON.stringify(
                        value
                    )
            );

        });


        await importPhotoRecords(
            Array.isArray(
                backup.photos
            )
                ? backup.photos
                : []
        );


        window.alert(
            "Backup restored successfully. Level Up will now reload."
        );


        window.location.reload();

    }

    catch (error) {

        setBackupMessage(
            error instanceof Error
                ? error.message
                : "The backup could not be restored.",
            true
        );


        resetFileInput(
            fileInput
        );

    }

}


function validateBackup(
    backup
) {

    if (
        !backup ||
        typeof backup !==
            "object" ||
        backup.app !==
            "level-up" ||
        backup.formatVersion !==
            1 ||
        !backup.data ||
        typeof backup.data !==
            "object" ||
        Array.isArray(
            backup.data
        )
    ) {

        throw new Error(
            "This is not a valid Level Up backup file."
        );

    }


    const knownKeys =
        BACKUP_KEYS.filter(key =>
            Object.prototype
                .hasOwnProperty
                .call(
                    backup.data,
                    key
                )
        );


    if (!knownKeys.length) {

        throw new Error(
            "The backup file does not contain recognized Level Up data."
        );

    }

}


function setBackupMessage(
    message,
    isError = false
) {

    const element =
        document.getElementById(
            "backup-message"
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


function resetFileInput(
    fileInput
) {

    if (fileInput) {
        fileInput.value =
            "";
    }

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
