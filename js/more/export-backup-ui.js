export function renderExportBackup() {
    return `
        <section class="dashboard-welcome">
            <div>
                <span class="eyebrow">DATA SAFETY</span>
                <h2>Exports & Backup</h2>
                <p>Keep your Level Up data portable and move it safely between devices.</p>
            </div>
        </section>

        <div class="exports-backup-page">
        <section class="section-card dashboard-backup">
            <div class="backup-icon">↓</div>
            <div class="backup-copy">
                <span class="eyebrow">LOCAL BACKUP</span>
                <h2>Backup & Restore</h2>
                <p>Export all locally saved Level Up data, including workouts, weight history, measurements, nutrition targets, phases, sleep, workout schedules, rest-timer preferences and all other settings.</p>
                <div class="backup-details">
                    <span>✓ One portable JSON file</span>
                    <span>✓ Includes all current local app data</span>
                    <span>✓ Works between phone and computer</span>
                </div>
                <div class="backup-integrity-summary">
                    <span class="eyebrow">CURRENT BACKUP CONTENTS</span>
                    <strong id="backup-summary">Checking saved data…</strong>
                </div>
            </div>
            <div class="backup-actions">
                <button id="export-backup-btn" class="primary-btn" type="button">↓ Export Backup</button>
                <button id="import-backup-btn" class="secondary-btn" type="button">↑ Restore Backup</button>
                <input id="backup-file-input" type="file" accept=".json,application/json" hidden>
                <span id="backup-message" class="backup-message" aria-live="polite"></span>
            </div>
        </section>

        <section class="section-card dashboard-backup">
            <div class="backup-icon">▦</div>
            <div class="backup-copy">
                <span class="eyebrow">READABLE DATA EXPORT</span>
                <h2>Export All Recorded Data</h2>
                <p>Download your workouts, calories, weight, measurements, sleep, water, nutrition records, plans and settings in organized files.</p>
                <div class="backup-details">
                    <span>✓ Spreadsheet with a separate tab for each category</span>
                    <span>✓ CSV bundle with one file for each category</span>
                    <span>✓ Includes a complete raw recorded-data listing</span>
                </div>
            </div>
            <div class="backup-actions">
                <button id="export-data-workbook" class="primary-btn" type="button">↓ Export Spreadsheet</button>
                <button id="export-data-csv-bundle" class="secondary-btn" type="button">↓ Export CSV Files</button>
                <span id="data-export-message" class="backup-message" aria-live="polite"></span>
            </div>
        </section>

        <section class="section-card dashboard-drive">
            <div class="backup-icon drive-icon">G</div>
            <div class="backup-copy">
                <span class="eyebrow">MULTI-DEVICE BETA</span>
                <h2>Google Drive</h2>
                <p>Connect your Google account to transfer the same complete Level Up backup between this device and a visible backup file in Google Drive.</p>
                <div class="drive-state-row">
                    <span id="google-drive-status" class="drive-status">Not connected</span>
                    <span id="google-drive-last-sync">No Drive transfer completed on this device.</span>
                </div>
                <p class="drive-safety-note">Upload copies this device to Drive. Download replaces this device with the Drive copy. Automatic merging is intentionally disabled during the first beta.</p>
            </div>
            <div class="backup-actions drive-actions">
                <button id="connect-google-drive" class="primary-btn" type="button">Connect Google Drive</button>
                <button id="upload-google-drive" class="secondary-btn" type="button" disabled>↑ Upload This Device</button>
                <button id="download-google-drive" class="secondary-btn" type="button" disabled>↓ Download to This Device</button>
                <button id="disconnect-google-drive" class="text-btn" type="button" hidden>Disconnect</button>
                <span id="google-drive-message" class="backup-message" aria-live="polite"></span>
            </div>
        </section>
        </div>
    `;
}
