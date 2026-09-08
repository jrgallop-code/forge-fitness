import {
    exportPhotoRecords,
    importPhotoRecords
}
from "../progress/photo-journal.js?v=backup-provider-2";

/*
 * Persistent data stored in localStorage is backed up automatically by backup-manager.js.
 * Any user data stored somewhere else MUST be registered here in the same change that
 * introduces that storage. This keeps Export Backup complete as Level Up evolves.
 */
const BACKUP_PROVIDERS = [
    {
        id: "photos",
        label: "Photo Journal",
        storage: "IndexedDB",
        indexedDbNames: ["level_up_media"],
        // Photo Journal is no longer exposed in the app. Preserve and export
        // its legacy data when Safari makes the store available, but never
        // prevent the user's active workout and nutrition data from backing
        // up when the retired IndexedDB store is unavailable.
        allowUnavailable: true,
        legacyRootKey: "photos",
        exportData: exportPhotoRecords,
        importData: importPhotoRecords
    }
];

export function getBackupProviders() {
    return BACKUP_PROVIDERS.slice();
}
