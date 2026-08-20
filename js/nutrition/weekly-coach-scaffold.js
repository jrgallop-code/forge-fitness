let queued = false;

function ensureStyles() {
    if (document.getElementById("weekly-phase-coach-styles")) return;
    const style = document.createElement("style");
    style.id = "weekly-phase-coach-styles";
    style.textContent = `
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric{padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:10px;background:rgba(255,255,255,.025)}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric span{display:block;color:var(--muted,#a1a1aa);font-size:10px;text-transform:uppercase;letter-spacing:.04em}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric strong{display:block;margin-top:3px;font-size:14px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-actions{display:flex;gap:8px;margin-top:10px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-actions button{flex:1;min-height:44px}
        #goal-check-in-card[data-weekly-coach="1"] .weekly-coach-method{margin:8px 0 0;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.4}
        @media(max-width:390px){#goal-check-in-card[data-weekly-coach="1"] .weekly-coach-grid{gap:6px}#goal-check-in-card[data-weekly-coach="1"] .weekly-coach-metric{padding:9px 8px}}
    `;
    document.head.appendChild(style);
}

function ensureCoachCard() {
    ensureStyles();
    const card = document.getElementById("goal-check-in-card");
    if (!card || card.dataset.weeklyCoach === "1") return;

    card.dataset.weeklyCoach = "1";
    card.innerHTML = `
        <span class="eyebrow">PHASE CHECK-IN</span>
        <div class="goal-check-in-heading"><h3 id="weekly-coach-status">BUILDING TREND</h3><small id="weekly-coach-confidence"></small></div>
        <p id="weekly-coach-message" class="nutrition-message"></p>
        <div class="weekly-coach-grid">
            <div class="weekly-coach-metric"><span id="weekly-coach-previous-label">Previous 7-Day Avg</span><strong id="weekly-coach-previous">--</strong></div>
            <div class="weekly-coach-metric"><span>Current 7-Day Avg</span><strong id="weekly-coach-current">--</strong></div>
            <div class="weekly-coach-metric"><span>Weekly Change</span><strong id="weekly-coach-actual">--</strong></div>
            <div class="weekly-coach-metric"><span>Target</span><strong id="weekly-coach-target">--</strong></div>
        </div>
        <strong id="weekly-coach-suggestion"></strong>
        <div class="weekly-coach-actions">
            <button id="weekly-coach-apply" class="primary-btn" type="button" hidden></button>
            <button id="weekly-coach-keep" class="secondary-btn" type="button" hidden>Keep Current Target</button>
        </div>
        <p class="weekly-coach-method"></p>`;

    window.dispatchEvent(new CustomEvent("levelup:calorie-scaffold-ready"));
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        ensureCoachCard();
    });
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-updated", schedule);
window.addEventListener("levelup:nutrition-phase-updated", schedule);
window.addEventListener("pageshow", schedule);
schedule();