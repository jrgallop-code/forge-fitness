import { buildTrainingAIExport } from "../core/training-ai-export.js?v=ask-ai-mvp-1";

const CARD_SELECTOR = "[data-ask-ai-card]";
let modal = null;
let currentExport = null;
let queued = false;

function ensureAskAICard() {
    const lifting = document.getElementById("lifting-progress");
    const summary = lifting?.querySelector(".training-summary-grid");
    if (!lifting || !summary) return;

    const exportData = buildTrainingAIExport({ analysisType: "overall_progress" });
    const signature = JSON.stringify(exportData.metadata);
    let card = lifting.querySelector(CARD_SELECTOR);

    if (!card) {
        card = document.createElement("section");
        card.className = "ask-ai-card";
        card.dataset.askAiCard = "true";
        summary.insertAdjacentElement("afterend", card);
    }

    if (card.dataset.signature !== signature) {
        card.dataset.signature = signature;
        renderCard(card, exportData);
    }

    if (card.dataset.analyticsViewed !== "true") {
        card.dataset.analyticsViewed = "true";
        trackAIExportEvent("ai_export_card_viewed");
    }
}

function renderCard(card, exportData) {
    const { workoutCount, exerciseCount, workingSetCount } = exportData.metadata;
    const hasData = workoutCount > 0;

    card.innerHTML = `
        <div class="ask-ai-card-icon" aria-hidden="true">AI</div>
        <div class="ask-ai-card-copy">
            <span class="eyebrow">ASK AI</span>
            <h4>Analyze your recent training</h4>
            <p>Prepare a clean training report for ChatGPT, Claude, or another AI assistant.</p>
            <div class="ask-ai-card-stats" aria-label="Training data available for AI export">
                <span><strong>8</strong><small>week max</small></span>
                <span><strong>${workoutCount}</strong><small>workouts</small></span>
                <span><strong>${exerciseCount}</strong><small>exercises</small></span>
                <span><strong>${workingSetCount}</strong><small>working sets</small></span>
            </div>
            <p class="ask-ai-card-message" data-ask-ai-message ${hasData ? "hidden" : ""}>You need at least one completed workout before Level Up can prepare a training analysis.</p>
        </div>
        <button class="primary-btn ask-ai-card-action" type="button" data-ask-ai-open ${hasData ? "" : "disabled"}>Analyze My Training</button>
    `;
}

function openIntro() {
    currentExport = buildTrainingAIExport({ analysisType: "overall_progress" });
    if (!currentExport.metadata.workoutCount) {
        const message = document.querySelector(`${CARD_SELECTOR} [data-ask-ai-message]`);
        if (message) message.hidden = false;
        return;
    }

    trackAIExportEvent("ai_export_opened");
    ensureModal();
    modal.hidden = false;
    document.body.classList.add("ask-ai-modal-open");

    const body = modal.querySelector("[data-ask-ai-modal-body]");
    body.innerHTML = `
        <div class="ask-ai-modal-heading">
            <span class="eyebrow">ANALYZE MY TRAINING</span>
            <h3>Prepare your training report</h3>
            <p>Level Up will format up to your latest 8 weeks of completed training for an AI assistant.</p>
        </div>

        <div class="ask-ai-inclusion-grid">
            <div>
                <strong>Included</strong>
                <ul>
                    <li>Exercises</li>
                    <li>Working sets, reps and load</li>
                    <li>RIR when recorded</li>
                    <li>Muscle volume</li>
                    <li>Progress trends</li>
                </ul>
            </div>
            <div>
                <strong>Not included</strong>
                <ul class="is-private">
                    <li>Name</li>
                    <li>Email</li>
                    <li>Account information</li>
                    <li>Location or device identifiers</li>
                </ul>
            </div>
        </div>

        <div class="ask-ai-privacy-note">
            Level Up does not send this data automatically. You choose whether to copy or share it.
        </div>

        <button class="primary-btn ask-ai-wide-action" type="button" data-ask-ai-preview>Preview Training Data</button>
    `;
}

function showPreview() {
    if (!currentExport?.prompt) return;
    trackAIExportEvent("ai_export_previewed");

    const body = modal.querySelector("[data-ask-ai-modal-body]");
    body.innerHTML = `
        <div class="ask-ai-modal-heading">
            <span class="eyebrow">TRAINING DATA PREVIEW</span>
            <h3>Exactly what will be shared</h3>
            <p>Review the report before sending it anywhere.</p>
        </div>
        <div class="ask-ai-preview" data-ask-ai-preview-text tabindex="0" aria-label="Generated Level Up training analysis prompt"></div>
        <div class="ask-ai-privacy-note is-strong">
            Level Up only shares the training information shown in this preview. Your name, email, login information, and payment information are not included.
        </div>
        <p class="ask-ai-action-status" data-ask-ai-status aria-live="polite"></p>
        <div class="ask-ai-preview-actions">
            <button class="secondary-btn" type="button" data-ask-ai-copy>Copy</button>
            <button class="primary-btn" type="button" data-ask-ai-share>Share</button>
        </div>
    `;

    body.querySelector("[data-ask-ai-preview-text]").textContent = currentExport.prompt;
}

function ensureModal() {
    if (modal?.isConnected) return;

    modal = document.createElement("div");
    modal.className = "ask-ai-modal";
    modal.dataset.askAiModal = "true";
    modal.hidden = true;
    modal.innerHTML = `
        <div class="ask-ai-modal-backdrop" data-ask-ai-close></div>
        <section class="ask-ai-modal-sheet" role="dialog" aria-modal="true" aria-label="Analyze my training">
            <button class="ask-ai-modal-close" type="button" data-ask-ai-close aria-label="Close Ask AI">×</button>
            <div class="ask-ai-modal-body" data-ask-ai-modal-body></div>
        </section>
    `;
    document.body.appendChild(modal);
}

function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("ask-ai-modal-open");
    currentExport = null;
}

async function copyCurrentPrompt({ fallbackMessage = "Training report copied." } = {}) {
    if (!currentExport?.prompt) return false;

    const copied = await writeClipboard(currentExport.prompt);
    const status = modal?.querySelector("[data-ask-ai-status]");
    if (status) status.textContent = copied ? fallbackMessage : "Could not copy automatically. Select the preview text and copy it manually.";
    if (copied) trackAIExportEvent("ai_export_copied");
    return copied;
}

async function shareCurrentPrompt() {
    if (!currentExport?.prompt) return;
    const status = modal?.querySelector("[data-ask-ai-status]");

    if (typeof navigator.share !== "function") {
        await copyCurrentPrompt({ fallbackMessage: "Sharing is not available here, so the training report was copied instead." });
        return;
    }

    try {
        await navigator.share({
            title: currentExport.title,
            text: currentExport.prompt
        });
        trackAIExportEvent("ai_export_shared");
        if (status) status.textContent = "Shared from your device.";
    }
    catch (error) {
        if (error?.name === "AbortError") return;
        await copyCurrentPrompt({ fallbackMessage: "Sharing was unavailable, so the training report was copied instead." });
    }
}

async function writeClipboard(text) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    }
    catch {
        // Fall through to the legacy copy path.
    }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const copied = document.execCommand("copy");
        textarea.remove();
        return copied;
    }
    catch {
        return false;
    }
}

function trackAIExportEvent(name) {
    // Never attach the generated prompt or workout history to analytics events.
    const detail = { event: name };
    window.dispatchEvent(new CustomEvent("levelup:analytics-event", { detail }));

    if (typeof window.gtag === "function") {
        window.gtag("event", name);
    }
    else if (typeof window.analytics?.track === "function") {
        window.analytics.track(name);
    }
}

function queueEnsureCard() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        ensureAskAICard();
    });
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-ask-ai-open]")) {
        openIntro();
        return;
    }
    if (event.target.closest("[data-ask-ai-preview]")) {
        showPreview();
        return;
    }
    if (event.target.closest("[data-ask-ai-copy]")) {
        copyCurrentPrompt();
        return;
    }
    if (event.target.closest("[data-ask-ai-share]")) {
        shareCurrentPrompt();
        return;
    }
    if (event.target.closest("[data-ask-ai-close]")) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal && !modal.hidden) closeModal();
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueEnsureCard).observe(content, { childList: true });
}

window.addEventListener("focus", queueEnsureCard);
window.addEventListener("storage", event => {
    if (event.key === "forge_workout_sessions") queueEnsureCard();
});

document.addEventListener("click", event => {
    if (event.target.closest("#lifting-tab, .training-progress-tab")) {
        requestAnimationFrame(queueEnsureCard);
    }
});

queueEnsureCard();
