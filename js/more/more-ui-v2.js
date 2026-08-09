import { navigate } from "../core/router.js?v=router-more-tools-1";
import { renderExportBackup } from "./export-backup-ui.js?v=exports-backup-1";
import { initializeBackupManager } from "../core/backup-manager.js?v=backup-complete-2";
import { initializeGoogleDriveSync } from "../core/google-drive-sync-v2.js?v=visible-drive-backup-1";

const ICONS = {
    history: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 1 1-7.2 4.5H2l3.6-3.6L9.2 8.5H6.8A6 6 0 1 0 12 6v3l2.8 1.7-1 1.7L10 10V4h2Z"/></svg>',
    water: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2s6 6.7 6 12a6 6 0 1 1-12 0c0-5.3 6-12 6-12Zm0 16a4 4 0 0 0 4-4c0-2.4-2.2-5.7-4-7.9-1.8 2.2-4 5.5-4 7.9a4 4 0 0 0 4 4Z"/></svg>',
    nutrition: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C7.6 18.7 5 15.4 5 11.8 5 8 7.7 5 11.2 5c.5 0 1 .1 1.5.2C14 3.3 16.2 2 19 2c0 2.8-1.3 5-3.3 6.3.2.5.3 1 .3 1.5 0 4.6-3.4 8.6-4 11.2Z"/></svg>',
    sleep: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/></svg>',
    measurements: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.5 8.5 3 21 15.5 15.5 21 3 8.5Zm5-2.7L5.8 8 16 18.2l2.2-2.2L8 5.8Zm2.1 2.1 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Zm3 3 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Z"/></svg>',
    backup: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 0 1 4.8 3.6A4.5 4.5 0 0 1 17.5 15H14v-2h3.5a2.5 2.5 0 1 0-.6-4.9l-1.1.3-.2-1.1A3 3 0 0 0 9.8 7L9.5 8.2l-1.2-.1H8a3 3 0 0 0 0 6h2v2H8A5 5 0 0 1 7.9 6a5 5 0 0 1 4.1-3Zm-1 8h2v6.2l2.1-2.1 1.4 1.4-4.5 4.5-4.5-4.5 1.4-1.4 2.1 2.1V11Z"/></svg>'
};

export function renderMore() {
    return `<section class="dashboard-welcome"><div><span class="eyebrow">TOOLS & TRACKERS</span><h2>More</h2><p>Open a focused tool without scrolling through a long page.</p></div></section>
    <section class="more-menu-grid" aria-label="More tools">
    <button class="more-menu-card" type="button" data-more-page="history"><span class="more-menu-icon">${ICONS.history}</span><span><strong>Workout History</strong><small>Resume unfinished workouts or edit completed sessions.</small></span><span class="more-menu-arrow">›</span></button>
    <button class="more-menu-card" type="button" data-more-page="sleep"><span class="more-menu-icon">${ICONS.sleep}</span><span><strong>Sleep</strong><small>Track sleep duration, quality and recovery notes.</small></span><span class="more-menu-arrow">›</span></button>
    <button class="more-menu-card" type="button" data-more-page="measurements"><span class="more-menu-icon">${ICONS.measurements}</span><span><strong>Measurements</strong><small>Track body measurements and directional changes over time.</small></span><span class="more-menu-arrow">›</span></button>
    <button class="more-menu-card" type="button" data-more-page="water"><span class="more-menu-icon">${ICONS.water}</span><span><strong>Water Log</strong><small>Record daily water and review recent entries.</small></span><span class="more-menu-arrow">›</span></button>
    <button class="more-menu-card" type="button" data-more-page="nutrition"><span class="more-menu-icon">${ICONS.nutrition}</span><span><strong>Nutrition</strong><small>Open nutrition guidance and related tools.</small></span><span class="more-menu-arrow">›</span></button>
    <button class="more-menu-card" type="button" data-more-page="exports-backup"><span class="more-menu-icon">${ICONS.backup}</span><span><strong>Exports & Backup</strong><small>Export, restore and transfer your Level Up data with Google Drive.</small></span><span class="more-menu-arrow">›</span></button>
    </section>`;
}

export function initializeMore() {
    document.querySelectorAll("[data-more-page]").forEach(button => button.addEventListener("click", () => {
        if (button.dataset.morePage === "exports-backup") {
            const content = document.getElementById("content");
            if (!content) return;
            content.innerHTML = renderExportBackup();
            initializeBackupManager();
            initializeGoogleDriveSync();
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        navigate(button.dataset.morePage);
    }));
}
