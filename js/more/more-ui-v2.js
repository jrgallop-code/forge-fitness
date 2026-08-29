import "./contact-support.js?v=compact-more-groups-1";
import { navigate } from "../core/router.js?v=deload-workout-preview-1";
import { renderExportBackup } from "./export-backup-ui.js?v=full-data-export-1";
import { initializeBackupManager } from "../core/backup-manager.js?v=backup-complete-6";
import { initializeGoogleDriveSync } from "../core/google-drive-sync-v2.js?v=visible-drive-backup-3";
import { initializeDataSpreadsheetExport } from "../core/data-spreadsheet-export.js?v=full-data-export-1";
import { renderBmiCard, initializeBmiCard } from "./bmi-card.js?v=bmi-card-1";
import { renderAccountCloud, initializeAccountCloud } from "./account-cloud-ui.js?v=privacy-account-1";
import { renderUnitSettings, initializeUnitSettings } from "./unit-settings.js?v=unit-system-1";
import { renderProfileAppearance, initializeProfileAppearance } from "./profile-appearance.js?v=profile-appearance-1";
import { renderAdaptiveGuidanceSettings, initializeAdaptiveGuidanceSettings } from "./adaptive-guidance-settings.js?v=deload-workout-preview-1";
import { openLessonLibrary } from "./learn-level-up.js?v=learn-level-up-2";

const ICONS = {
    profile: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10c4.4 0 8 2.3 8 5.2V21H4v-2.8C4 15.3 7.6 13 12 13Zm-5.9 6h11.8v-.8c0-1.3-2.4-3.2-5.9-3.2s-5.9 1.9-5.9 3.2v.8Z"/></svg>',
    history: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 1 1-7.2 4.5H2l3.6-3.6L9.2 8.5H6.8A6 6 0 1 0 12 6v3l2.8 1.7-1 1.7L10 10V4h2Z"/></svg>',
    water: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2s6 6.7 6 12a6 6 0 1 1-12 0c0-5.3 6-12 6-12Zm0 16a4 4 0 0 0 4-4c0-2.4-2.2-5.7-4-7.9-1.8 2.2-4 5.5-4 7.9a4 4 0 0 0 4 4Z"/></svg>',
    sleep: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/></svg>',
    measurements: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.5 8.5 3 21 15.5 15.5 21 3 8.5Zm5-2.7L5.8 8 16 18.2l2.2-2.2L8 5.8Zm2.1 2.1 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Zm3 3 1.4-1.4 1.4 1.4-1.4 1.4-1.4-1.4Z"/></svg>',
    bmi: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18a8 8 0 1 1 16 0h-2a6 6 0 1 0-12 0H4Zm8-9 1.8 5.2-1.9.6L10.2 10 12 9Zm-6 9h12v2H6v-2Z"/></svg>',
    backup: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 0 1 4.8 3.6A4.5 4.5 0 0 1 17.5 15H14v-2h3.5a2.5 2.5 0 1 0-.6-4.9l-1.1.3-.2-1.1A3 3 0 0 0 9.8 7L9.5 8.2l-1.2-.1H8a3 3 0 0 0 0 6h2v2H8A5 5 0 0 1 7.9 6a5 5 0 0 1 4.1-3Zm-1 8h2v6.2l2.1-2.1 1.4 1.4-4.5 4.5-4.5-4.5 1.4-1.4 2.1 2.1V11Z"/></svg>',
    account: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 21v-2.5C4 15.5 7.6 13 12 13s8 2.5 8 5.5V21H4Zm2-2h12v-.5c0-1.5-2.5-3.5-6-3.5s-6 2-6 3.5v.5Z"/></svg>',
    units: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4V5Zm2 2v10h12V7H6Zm2 2h2v3H8V9Zm3 0h2v5h-2V9Zm3 0h2v3h-2V9Z"/></svg>',
    guidance: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 4 12.7V18h-2v-4.4l.5-.3A5 5 0 1 0 7 9c0 1.8.9 3.4 2.5 4.3l.5.3V18H8v-3.3A7 7 0 0 1 12 2Zm-2 18h4v2h-4v-2Zm1-13h2v4h-2V7Zm0 5h2v2h-2v-2Z"/></svg>',
    analytics: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5h2v12h14v2H4Zm3-3v-5h2v5H7Zm4 0V7h2v9h-2Zm4 0v-8h2v8h-2Z"/></svg>',
    learn: '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7c1.1 0 2 .9 2 2v14c-.6-.6-1.4-1-2.4-1H4V4Zm2 2v11h4.6c.1 0 .3 0 .4.1V6H6Zm7 0c0-1.1.9-2 2-2h5v15h-4.6c-1 0-1.8.4-2.4 1V6Zm2 0v11.1c.1-.1.3-.1.4-.1H18V6h-3Z"/></svg>'
};

export function renderMore() {
    return `<section class="more-compact-header"><span class="eyebrow">SETTINGS & TOOLS</span><h2>More</h2></section>
    <section class="more-menu-grid" aria-label="More tools">
    <div class="more-menu-group" data-more-group="account"><h3>Account &amp; app</h3>
    <button class="more-menu-card" type="button" data-more-page="account-cloud"><span class="more-menu-icon">${ICONS.account}</span><span><strong>Account & Cloud</strong><small>Sign in for private beta cloud backup and device transfer.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="units"><span class="more-menu-icon">${ICONS.units}</span><span><strong>Units</strong><small>Switch between imperial and metric measurements throughout Level Up.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="adaptive-guidance"><span class="more-menu-icon">${ICONS.guidance}</span><span><strong class="adaptive-title-with-badge">Adaptive Guidance <span class="adaptive-beta-badge">BETA</span></strong><small>Optional recovery, effort, volume and deload suggestions.</small></span></button>
    <button class="more-menu-card owner-analytics-launch" id="owner-analytics-menu" type="button" data-more-page="admin-analytics" hidden><span class="more-menu-icon">${ICONS.analytics}</span><span><strong>Stats & Analytics</strong><small>Owner-only charts for growth, activity and training engagement.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="profile-setup"><span class="more-menu-icon">${ICONS.profile}</span><span><strong>Profile & Appearance</strong><small>Update your personal details, training experience and anatomy appearance.</small></span></button>
    </div>
    <div class="more-menu-group" data-more-group="health"><h3>Health &amp; records</h3>
    <button class="more-menu-card" type="button" data-more-page="history"><span class="more-menu-icon">${ICONS.history}</span><span><strong>Workout History</strong><small>Review completed workouts, summaries and training details.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="bmi"><span class="more-menu-icon">${ICONS.bmi}</span><span><strong>BMI</strong><small>View BMI calculated from your Body Profile height and weight.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="sleep"><span class="more-menu-icon">${ICONS.sleep}</span><span><strong>Sleep</strong><small>Track sleep duration, quality and recovery notes.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="measurements"><span class="more-menu-icon">${ICONS.measurements}</span><span><strong>Measurements</strong><small>Track body measurements and directional changes over time.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="water"><span class="more-menu-icon">${ICONS.water}</span><span><strong>Water Log</strong><small>Record daily water and review recent entries.</small></span></button>
    </div>
    <div class="more-menu-group" data-more-group="app-data"><h3>Support &amp; data</h3>
    <button class="more-menu-card" type="button" data-more-page="learn"><span class="more-menu-icon">${ICONS.learn}</span><span><strong>Learn Level Up</strong><small>Short walkthroughs for workouts, nutrition and progress.</small></span></button>
    <button class="more-menu-card" type="button" data-more-page="exports-backup"><span class="more-menu-icon">${ICONS.backup}</span><span><strong>Exports & Backup</strong><small>Export, restore and transfer your Level Up data with Google Drive.</small></span></button>
    </div>
    </section>`;
}

export function initializeMore() {
    revealOwnerAnalyticsMenu();
    document.querySelectorAll("[data-more-page]").forEach(button => button.addEventListener("click", () => {
        const page = button.dataset.morePage;
        if (page === "learn") {
            openLessonLibrary();
            return;
        }
        if (page === "profile-setup") {
            const content = document.getElementById("content");
            if (!content) return;
            if (!document.querySelector('link[href*="profile-appearance.css"]')) { const link=document.createElement("link");link.rel="stylesheet";link.href="css/profile-appearance.css?v=profile-appearance-1";document.head.appendChild(link); }
            const showMore=()=>{content.innerHTML=renderMore();initializeMore();window.scrollTo({top:0,behavior:"smooth"});};
            content.innerHTML=renderProfileAppearance();initializeProfileAppearance({onBack:showMore});window.scrollTo({top:0,behavior:"smooth"});
            return;
        }
        if (page === "bmi") {
            const content = document.getElementById("content");
            if (!content) return;
            content.innerHTML = `<section class="dashboard-welcome"><div><button class="nutrition-planner-back" id="bmi-back-more" type="button">← More</button><span class="eyebrow">BODY PROFILE</span><h2>BMI</h2><p>Your BMI uses the height and weight saved in Body Profile.</p></div></section>${renderBmiCard()}`;
            initializeBmiCard();
            document.getElementById("bmi-back-more")?.addEventListener("click", () => { content.innerHTML = renderMore(); initializeMore(); window.scrollTo({ top: 0, behavior: "smooth" }); });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (page === "exports-backup") {
            const content = document.getElementById("content");
            if (!content) return;
            content.innerHTML = renderExportBackup();
            initializeBackupManager();
            initializeDataSpreadsheetExport();
            initializeGoogleDriveSync();
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (page === "units") {
            const content = document.getElementById("content");
            if (!content) return;
            const showMore = () => {
                content.innerHTML = renderMore();
                initializeMore();
                window.scrollTo({ top: 0, behavior: "smooth" });
            };
            content.innerHTML = renderUnitSettings();
            initializeUnitSettings({ onBack: showMore });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (page === "adaptive-guidance") {
            const content = document.getElementById("content");
            if (!content) return;
            const showMore = () => {
                content.innerHTML = renderMore();
                initializeMore();
                window.scrollTo({ top: 0, behavior: "smooth" });
            };
            content.innerHTML = renderAdaptiveGuidanceSettings();
            initializeAdaptiveGuidanceSettings({
                onBack: showMore,
                onPreviewWorkout: () => document.querySelector('.nav-btn[data-page="workout"]')?.click()
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (page === "account-cloud") {
            const content = document.getElementById("content");
            if (!content) return;
            const showMore = () => {
                content.innerHTML = renderMore();
                initializeMore();
                window.scrollTo({ top: 0, behavior: "smooth" });
            };
            content.innerHTML = renderAccountCloud();
            initializeAccountCloud({ onBack: showMore });
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        navigate(page);
    }));
}

async function revealOwnerAnalyticsMenu() {
    const button = document.getElementById("owner-analytics-menu");
    if (!button) return;
    try {
        const token = JSON.parse(localStorage.getItem("level_up_cloud_session") || "null")?.token;
        if (!token) return;
        const response = await fetch("https://api.leveluphypertrophy.com/v1/me", { headers: { Authorization: `Bearer ${token}` } });
        const payload = await response.json();
        if (response.ok && payload.user?.isAdmin) button.hidden = false;
    } catch { /* Keep owner tools hidden when the account check is unavailable. */ }
}
