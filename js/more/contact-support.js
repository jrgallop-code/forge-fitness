const SUPPORT_ENDPOINT = "https://formsubmit.co/ajax/jrgallop@gmail.com";
const SUPPORT_ICON = '<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Zm2 2v9.2l2.3-1.2H18V6H6Zm5 2h2v4h-2V8Zm0 5h2v2h-2v-2Z"/></svg>';

function ensureSupportStyles() {
    if (document.querySelector('link[data-contact-support-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/more-support.css?v=contact-support-2";
    link.dataset.contactSupportStyles = "";
    document.head.appendChild(link);
}

function supportCardMarkup() {
    return `<button class="more-menu-card" type="button" data-contact-support-card><span class="more-menu-icon">${SUPPORT_ICON}</span><span><strong>Contact Support</strong><small>Report a glitch, data issue or anything that is not working as expected.</small></span></button>`;
}

function renderContactSupport() {
    return `<section class="dashboard-welcome"><div><button class="nutrition-planner-back" id="support-back-more" type="button">← More</button><span class="eyebrow">HELP & FEEDBACK</span><h2>Contact Support</h2><p>Report an issue directly from Level Up.</p></div></section>
    <section class="support-report-card" aria-labelledby="support-report-title">
        <p class="support-report-intro" id="support-report-title">Tell us what went wrong. Your report will be sent without opening your email app.</p>
        <form class="support-report-form" id="support-report-form">
            <div class="support-field"><label for="support-issue-type">Issue type</label><select id="support-issue-type" required><option value="Glitch / bug">Glitch / bug</option><option value="Workout / logging issue">Workout / logging issue</option><option value="Progress / nutrition data issue">Progress / nutrition data issue</option><option value="Backup / sync issue">Backup / sync issue</option><option value="Other">Other</option></select></div>
            <div class="support-field"><label for="support-description">What happened?</label><textarea id="support-description" maxlength="2200" required placeholder="Describe what you expected to happen and what happened instead."></textarea></div>
            <div class="support-field"><label for="support-steps">Steps to reproduce · Optional</label><textarea class="support-steps" id="support-steps" maxlength="1200" placeholder="Example: Progress → Weight → Add Weight → Save"></textarea></div>
            <div class="support-field"><label for="support-reply-email">Your email · Optional</label><input id="support-reply-email" type="email" inputmode="email" autocomplete="email" maxlength="180" placeholder="Only if you would like a reply"></div>
            <div class="support-honey" aria-hidden="true"><label for="support-website">Website</label><input id="support-website" type="text" autocomplete="off" tabindex="-1"></div>
            <p class="support-form-note">Basic device/browser information is added automatically to help diagnose the issue. Workout, nutrition, weight, backup and other stored Level Up data are not attached.</p>
            <button class="support-send-btn" type="submit">Send Report</button>
            <p class="support-status" id="support-status" role="status" aria-live="polite"></p>
        </form>
    </section>`;
}

function returnToMore() {
    const moreButton = document.querySelector('.bottom-nav .nav-btn[data-page="more"]');
    if (moreButton) {
        moreButton.click();
        return;
    }
    window.location.reload();
}

function setSupportStatus(content, message, state = "") {
    const status = content.querySelector("#support-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

async function submitSupportReport(content, form) {
    if (!form.reportValidity()) return;

    const honeypot = content.querySelector("#support-website")?.value.trim();
    if (honeypot) {
        form.reset();
        setSupportStatus(content, "Report sent. Thanks for letting us know.", "success");
        return;
    }

    const issueType = content.querySelector("#support-issue-type")?.value || "Other";
    const description = content.querySelector("#support-description")?.value.trim() || "Not provided";
    const steps = content.querySelector("#support-steps")?.value.trim() || "Not provided";
    const replyEmail = content.querySelector("#support-reply-email")?.value.trim() || "";
    const standalone = Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true);
    const sendButton = content.querySelector(".support-send-btn");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "Sending…";
    }
    setSupportStatus(content, "Sending report…", "sending");

    const payload = {
        _subject: `[Level Up Support] ${issueType}`,
        _template: "table",
        _captcha: "false",
        "Issue type": issueType,
        "What happened": description,
        "Steps to reproduce": steps,
        "Reply email": replyEmail || "Not provided",
        "Submitted": new Date().toLocaleString(),
        "Display mode": standalone ? "Installed PWA" : "Browser",
        "App URL": window.location.href,
        "Device/browser": navigator.userAgent
    };
    if (replyEmail) payload._replyto = replyEmail;

    try {
        const response = await fetch(SUPPORT_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
            throw new Error(result.message || `Support request failed (${response.status})`);
        }

        form.reset();
        setSupportStatus(content, "Report sent. Thanks for letting us know.", "success");
        if (sendButton) sendButton.textContent = "Report Sent";
        window.setTimeout(() => {
            if (!sendButton?.isConnected) return;
            sendButton.disabled = false;
            sendButton.textContent = "Send Another Report";
        }, 1800);
    } catch (error) {
        console.error("Support report failed:", error);
        const message = error?.name === "AbortError"
            ? "The report timed out. Check your connection and try again."
            : "We could not send the report. Check your connection and try again.";
        setSupportStatus(content, message, "error");
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.textContent = "Try Again";
        }
    } finally {
        window.clearTimeout(timeoutId);
    }
}

function openSupport() {
    const content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = renderContactSupport();
    window.scrollTo({ top: 0, behavior: "smooth" });

    content.querySelector("#support-back-more")?.addEventListener("click", returnToMore);
    const form = content.querySelector("#support-report-form");
    form?.addEventListener("submit", event => {
        event.preventDefault();
        void submitSupportReport(content, form);
    });
}

function enhanceMorePage() {
    const grid = document.querySelector("#content .more-menu-grid");
    if (!grid || grid.querySelector("[data-contact-support-card]")) return;
    grid.insertAdjacentHTML("beforeend", supportCardMarkup());
    grid.querySelector("[data-contact-support-card]")?.addEventListener("click", openSupport);
}

ensureSupportStyles();
const content = document.getElementById("content");
if (content) {
    enhanceMorePage();
    new MutationObserver(enhanceMorePage).observe(content, { childList: true, subtree: true });
}
