export function renderExportBackup() {
    return `
        <section class="dashboard-welcome">
            <div>
                <span class="eyebrow">DATA SAFETY</span>
                <h2>Exports & Backup</h2>
                <p>Keep your Level Up data portable and move it safely between devices.</p>
            </div>
        </section>

        <section class="section-card dashboard-backup">
            <div class="backup-icon">↓</div>
            <div class="backup-copy">
                <span class="eyebrow">LOCAL BACKUP</span>
                <h2>Backup & Restore</h2>
                <p>Download a copy of your workout plans, completed sessions, custom exercises, weight entries and nutrition data.</p>
                <div class="backup-details">
                    <span>✓ One portable JSON file</span>
                    <span>✓ Works between phone and computer</span>
                    <span>✓ Stored only where you choose</span>
                </div>
            </div>
            <div class="backup-actions">
                <button id="export-backup-btn" class="primary-btn" type="button">↓ Export Backup</button>
                <button id="import-backup-btn" class="secondary-btn" type="button">↑ Restore Backup</button>
                <input id="backup-file-input" type="file" accept=".json,application/json" hidden>
                <span id="backup-message" class="backup-message" aria-live="polite"></span>
            </div>
        </section>

        <section class="section-card dashboard-drive">
            <div class="backup-icon drive-icon">G</div>
            <div class="backup-copy">
                <span class="eyebrow">MULTI-DEVICE BETA</span>
                <h2>Google Drive</h2>
                <p>Connect your Google account to transfer Level Up data between this device and your private app-data folder in Google Drive.</p>
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
    `;
}
