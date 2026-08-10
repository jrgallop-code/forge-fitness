import {
    exportPhotoRecords,
    importPhotoRecords
}
from "../progress/photo-journal.js";


const CLIENT_ID =
    "969450620287-gh455asc7c3lh67j7llq6f55rdpla0j3.apps.googleusercontent.com";

// Per-file access. Backups created by Level Up are visible in My Drive.
const DRIVE_SCOPE =
    "https://www.googleapis.com/auth/drive.file";

const DRIVE_FILE_NAME =
    "Level-Up-Backup.json";

const LAST_SYNC_KEY =
    "level_up_drive_last_sync";

const INVALID_STORAGE_KEYS = new Set(["setItem"]);

function getBackupKeys() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && !INVALID_STORAGE_KEYS.has(key)) keys.push(key);
    }
    return keys.sort();
}

let tokenClient = null;
let accessToken = null;
let pendingAction = null;
let remoteFile = null;


export function initializeGoogleDriveSync() {
    document
        .getElementById("connect-google-drive")
        ?.addEventListener("click", connectDrive);

    document
        .getElementById("upload-google-drive")
        ?.addEventListener(
            "click",
            () => authorizeThen(uploadToDrive)
        );

    document
        .getElementById("download-google-drive")
        ?.addEventListener(
            "click",
            () => authorizeThen(downloadFromDrive)
        );

    document
        .getElementById("disconnect-google-drive")
        ?.addEventListener("click", disconnectDrive);

    updateLastSyncDisplay();
    setConnectedState(Boolean(accessToken));

    if (accessToken) {
        setDriveMessage(
            remoteFile
                ? `Connected. ${DRIVE_FILE_NAME} was last updated ${formatDriveDate(remoteFile.modifiedTime)}.`
                : "Connected to Google Drive for this session."
        );
    }
}


function connectDrive() {
    authorizeThen(
        checkDriveConnection,
        true
    );
}


function authorizeThen(action, forceConsent = false) {
    if (accessToken && !forceConsent) {
        action();
        return;
    }

    if (!window.google?.accounts?.oauth2) {
        setDriveMessage(
            "Google authorization did not load. Check your connection and refresh the app.",
            true
        );
        return;
    }

    if (!tokenClient) {
        tokenClient =
            window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: DRIVE_SCOPE,
                callback: handleTokenResponse,
                error_callback: () =>
                    setDriveMessage(
                        "Google authorization was cancelled or could not open.",
                        true
                    )
            });
    }

    pendingAction = action;

    setDriveMessage(
        "Waiting for Google authorization…"
    );

    tokenClient.requestAccessToken({
        prompt: forceConsent
            ? "consent"
            : ""
    });
}


function handleTokenResponse(response) {
    if (!response?.access_token) {
        setDriveMessage(
            response?.error_description ||
            "Google Drive authorization was not completed.",
            true
        );
        pendingAction = null;
        return;
    }

    accessToken = response.access_token;
    setConnectedState(true);

    const action = pendingAction;
    pendingAction = null;
    action?.();
}


async function checkDriveConnection() {
    try {
        remoteFile = await findDriveFile();

        setDriveMessage(
            remoteFile
                ? `Connected. Visible backup ${DRIVE_FILE_NAME} was last updated ${formatDriveDate(remoteFile.modifiedTime)}.`
                : `Connected. No visible ${DRIVE_FILE_NAME} exists yet. Your first upload will create it in My Drive.`
        );
    }
    catch (error) {
        handleDriveError(error);
    }
}


async function uploadToDrive() {
    setButtonsDisabled(true);

    try {
        remoteFile = await findDriveFile();

        if (
            remoteFile &&
            !window.confirm(
                `Replace the existing ${DRIVE_FILE_NAME} in Google Drive with the data currently on this device?`
            )
        ) {
            setDriveMessage(
                "Upload cancelled. The Drive copy was not changed."
            );
            return;
        }

        setDriveMessage(
            "Preparing your complete Level Up backup for upload…"
        );

        const backup = await createBackupSnapshot();

        remoteFile = await saveDriveFile(
            backup,
            remoteFile?.id
        );

        const completedAt =
            new Date().toISOString();

        localStorage.setItem(
            LAST_SYNC_KEY,
            completedAt
        );

        updateLastSyncDisplay();

        setDriveMessage(
            `Upload complete. ${DRIVE_FILE_NAME} is now visible in My Drive and includes all current Level Up app data and settings.`
        );
    }
    catch (error) {
        handleDriveError(error);
    }
    finally {
        setButtonsDisabled(false);
    }
}


async function downloadFromDrive() {
    setButtonsDisabled(true);

    try {
        remoteFile = await findDriveFile();

        if (!remoteFile) {
            setDriveMessage(
                `No visible ${DRIVE_FILE_NAME} was found for Level Up. Upload from the device that contains your data first.`,
                true
            );
            return;
        }

        if (
            !window.confirm(
                "Download the Google Drive copy to this device? Current Level Up data in this browser will be replaced."
            )
        ) {
            setDriveMessage(
                "Download cancelled. This device was not changed."
            );
            return;
        }

        setDriveMessage(
            "Downloading and restoring your Drive copy…"
        );

        const response = await driveFetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteFile.id)}?alt=media`
        );

        const backup = await response.json();
        await restoreBackupSnapshot(backup);

        localStorage.setItem(
            LAST_SYNC_KEY,
            new Date().toISOString()
        );

        window.alert(
            "Google Drive data restored. Level Up will reload."
        );

        window.location.reload();
    }
    catch (error) {
        handleDriveError(error);
    }
    finally {
        setButtonsDisabled(false);
    }
}


function disconnectDrive() {
    if (accessToken) {
        window.google?.accounts?.oauth2?.revoke(
            accessToken,
            () => {}
        );
    }

    accessToken = null;
    pendingAction = null;
    remoteFile = null;

    setConnectedState(false);
    setDriveMessage(
        "Disconnected from Google Drive. Data already stored on this device was not changed."
    );
}


async function findDriveFile() {
    const parameters =
        new URLSearchParams({
            q: `name = '${DRIVE_FILE_NAME}' and trashed = false`,
            fields: "files(id,name,modifiedTime,size,parents)",
            orderBy: "modifiedTime desc",
            pageSize: "10"
        });

    const response = await driveFetch(
        `https://www.googleapis.com/drive/v3/files?${parameters.toString()}`
    );

    const result = await response.json();

    return Array.isArray(result.files)
        ? result.files[0] || null
        : null;
}


async function saveDriveFile(backup, fileId) {
    const boundary =
        `level_up_${Date.now()}`;

    // No parent is supplied for a new file, so Drive places it in My Drive.
    const metadata = {
        name: DRIVE_FILE_NAME,
        mimeType: "application/json"
    };

    const body = new Blob(
        [
            `--${boundary}\r\n`,
            "Content-Type: application/json; charset=UTF-8\r\n\r\n",
            JSON.stringify(metadata),
            `\r\n--${boundary}\r\n`,
            "Content-Type: application/json\r\n\r\n",
            JSON.stringify(backup, null, 2),
            `\r\n--${boundary}--`
        ],
        {
            type: `multipart/related; boundary=${boundary}`
        }
    );

    const endpoint = fileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,modifiedTime,size,parents`
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,parents";

    const response = await driveFetch(
        endpoint,
        {
            method: fileId
                ? "PATCH"
                : "POST",
            headers: {
                "Content-Type":
                    `multipart/related; boundary=${boundary}`
            },
            body
        }
    );

    return response.json();
}


async function driveFetch(url, options = {}) {
    const response = await fetch(
        url,
        {
            ...options,
            headers: {
                ...options.headers,
                Authorization:
                    `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        let details = "";

        try {
            const error = await response.json();
            details = error?.error?.message || "";
        }
        catch {
            // HTTP status below is still useful.
        }

        const failure = new Error(
            details ||
            `Google Drive request failed (${response.status}).`
        );

        failure.status = response.status;
        throw failure;
    }

    return response;
}


async function createBackupSnapshot() {
    const data = {};

    const keys = getBackupKeys();

    keys.forEach(key => {
        const stored =
            localStorage.getItem(key);

        if (stored === null) {
            data[key] = null;
            return;
        }

        try {
            data[key] = JSON.parse(stored);
        }
        catch {
            data[key] = stored;
        }
    });

    return {
        app: "level-up",
        formatVersion: 3,
        storageMode: "complete-local-storage",
        storageKeyCount: keys.length,
        exportedAt: new Date().toISOString(),
        source: "google-drive-visible",
        data,
        photos: await exportPhotoRecords()
    };
}


async function restoreBackupSnapshot(backup) {
    validateBackup(backup);

    Object.keys(backup.data)
        .filter(key => !INVALID_STORAGE_KEYS.has(key))
        .forEach(key => {
        const value = backup.data[key];

        if (
            value === null ||
            value === undefined
        ) {
            // Older backups did not contain every newer Level Up key.
            // Do not erase newer local data simply because the old backup lacks it.
            return;
        }

        localStorage.setItem(
            key,
            typeof value === "string"
                ? value
                : JSON.stringify(value)
        );
    });

    await importPhotoRecords(
        Array.isArray(backup.photos)
            ? backup.photos
            : []
    );
}


function validateBackup(backup) {
    if (
        !backup ||
        typeof backup !== "object" ||
        backup.app !== "level-up" ||
        ![1, 2, 3, 4].includes(backup.formatVersion) ||
        !backup.data ||
        typeof backup.data !== "object" ||
        Array.isArray(backup.data)
    ) {
        throw new Error(
            "The Google Drive file is not a valid Level Up backup."
        );
    }
}


function handleDriveError(error) {
    if (error?.status === 401) {
        accessToken = null;
        setConnectedState(false);
        setDriveMessage(
            "Your Google authorization expired. Connect Google Drive again and retry.",
            true
        );
        return;
    }

    if (error?.status === 403) {
        setDriveMessage(
            "Google Drive denied this request. Disconnect, reconnect Google Drive, approve the new file permission, and try again.",
            true
        );
        return;
    }

    setDriveMessage(
        error instanceof Error
            ? error.message
            : "Google Drive synchronization failed.",
        true
    );
}


function setConnectedState(connected) {
    const status =
        document.getElementById("google-drive-status");

    if (status) {
        status.textContent = connected
            ? "Connected for this session"
            : "Not connected";

        status.classList.toggle(
            "connected",
            connected
        );
    }

    document
        .getElementById("upload-google-drive")
        ?.toggleAttribute(
            "disabled",
            !connected
        );

    document
        .getElementById("download-google-drive")
        ?.toggleAttribute(
            "disabled",
            !connected
        );

    document
        .getElementById("disconnect-google-drive")
        ?.toggleAttribute(
            "hidden",
            !connected
        );
}


function setButtonsDisabled(disabled) {
    [
        "connect-google-drive",
        "upload-google-drive",
        "download-google-drive"
    ].forEach(id =>
        document
            .getElementById(id)
            ?.toggleAttribute(
                "disabled",
                disabled
            )
    );
}


function setDriveMessage(message, isError = false) {
    const element =
        document.getElementById("google-drive-message");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.classList.toggle(
        "error",
        isError
    );
}


function updateLastSyncDisplay() {
    const element =
        document.getElementById("google-drive-last-sync");

    if (!element) {
        return;
    }

    const value =
        localStorage.getItem(LAST_SYNC_KEY);

    element.textContent = value
        ? `Last transfer: ${formatDriveDate(value)}`
        : "No Drive transfer completed on this device.";
}


function formatDriveDate(value) {
    if (!value) {
        return "an unknown date";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(new Date(value));
}
