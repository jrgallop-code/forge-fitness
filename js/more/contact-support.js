import { navigate } from "../core/router.js?v=backup-coverage-1";

const SUPPORT_EMAIL = "jrgallop@gmail.com";
const SUPPORT_ICON = '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Zm2 2v9.2l2.3-1.2H18V6H6Zm5 2h2v4h-2V8Zm0 5h2v2h-2v-2Z"/></svg>';

function supportCardMarkup() {
    return `<button class="more-menu-card" type="button" data-contact-support-card><span class="more-menu-icon">${SUPPORT_ICON}</span><span><strong>Contact Support</strong><small>Report a glitch, data issue or anything that is not working as expected.</small></span></button>`;
}

function renderContactSupport() {
    return `<section class="dashboard-welcome"><div><button class="nutrition-planner-back" id="support-back-more" type="button">← More</button><span class="eyebrow">HELP & FEEDBACK</span><h2>Contact Support</h2><p>Tell us what went wrong and Level Up will prepare a support email for you.</p></div></section>
    <section class="support-report-card" aria-labelledby="support-report-title">
        <p class="support-report-intro" id="support-report-title">Use this for glitches, unexpected behavior, sync problems or anything else that does not seem to be working correctly.</p>
        <form class="support-report-form" id="support-report-form">
            <div class="support-field"><label for="support-issue-type">Issue type</label><select id="support-issue-type" required><option value="Glitch / bug">Glitch / bug</option><option value="Workout / logging issue">Workout / logging issue</option><option value="Progress / nutrition data issue">Progress / nutrition data issue</option><option value="Backup / sync issue">Backup / sync issue</option><option value="Other">Other</option></select></div>
            <div class="support-field"><label for="support-description">What happened?</label><textarea id="support-description" maxlength="2200" required placeholder="Describe what you expected to happen and what happened instead."></textarea></div>
            <div class="support-field"><label for="support-steps">Steps to reproduce · Optional</label><textarea class="support-steps" id="support-steps" maxlength="1200" placeholder="Example: Progress → Weight → Add Weight → Save"></textarea></div>
            <p class="support-form-note">Basic device/browser information will be added automatically. No workout, nutrition, backup or other Level Up data is attached. After your email app opens, you can add a screenshot if helpful.</p>
            <button class="support-send-btn" type="submit">Email Support</button>
            <p class="support-status" id="support-status" role="status" aria-live="polite"></p>
            <div class="support-email-fallback"><span>Prefer to email directly?</span><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div>
        </form>
    </section>`;
}

function openSupport() {
    const content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = renderContactSupport();
    window.scrollTo({ top: 0, behavior: "smooth" });

    content.querySelector("#support-back-more")?.addEventListener("click", () => navigate("more"));
    const form = content.querySelector("#support-report-form");
    form?.addEventListener("submit", event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const issueType = content.querySelector("#support-issue-type")?.value || "Other";
        const description = content.querySelector("#support-description")?.value.trim() || "Not provided";
        const steps = content.querySelector("#support-steps")?.value.trim() || "Not provided";
        const standalone = Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true);
        const subject = `[Level Up Support] ${issueType}`;
        const body = [
            "Level Up Support Report", "", `Issue type: ${issueType}`, "", "What happened?", description, "", "Steps to reproduce:", steps, "", "---", "App diagnostics (added automatically)",
            `Date: ${new Date().toLocaleString()}`,
            `Display mode: ${standalone ? "Installed PWA" : "Browser"}`,
            `App URL: ${window.location.href}`,
            `Device/browser: ${navigator.userAgent}`
        ].join("\n");
        const status = content.querySelector("#support-status");
        if (status) status.textContent = "Opening your email app…";
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
}

function enhanceMorePage() {
    const grid = document.querySelector("#content .more-menu-grid");
    if (!grid || grid.querySelector("[data-contact-support-card]")) return;
    grid.insertAdjacentHTML("beforeend", supportCardMarkup());
    grid.querySelector("[data-contact-support-card]")?.addEventListener("click", openSupport);
}

const content = document.getElementById("content");
if (content) {
    enhanceMorePage();
    new MutationObserver(enhanceMorePage).observe(content, { childList: true, subtree: true });
}
