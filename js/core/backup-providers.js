import {
    exportPhotoRecords,
    importPhotoRecords
}
from "../progress/photo-journal.js?v=backup-provider-1";

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
        legacyRootKey: "photos",
        exportData: exportPhotoRecords,
        importData: importPhotoRecords
    }
];

export function getBackupProviders() {
    return BACKUP_PROVIDERS.slice();
}
