const PHASES_KEY = "level_up_nutrition_phases";
const STYLE_ID = "phase-history-swipe-delete-styles";
const REVEAL_PX = 92;
const SWIPE_THRESHOLD = 46;

let queued = false;
let openRow = null;

function readPhases() {
    try {
        const value = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function writePhases(phases) {
    localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .nutrition-phase-history .phase-history-swipe-help{margin:8px 2px 7px;color:var(--muted,#a1a1aa);font-size:10px;line-height:1.35}
        .nutrition-phase-history-row[data-phase-swipe-ready="1"]{position:relative;overflow:hidden;padding:0!important;background:#211d1f}
        .nutrition-phase-history-row .phase-history-delete-action{position:absolute;inset:0 0 0 auto;width:${REVEAL_PX}px;border:0;border-radius:0;background:#ef181f;color:#fff;font:inherit;font-size:11px;font-weight:900;letter-spacing:.02em;cursor:pointer}
        .nutrition-phase-history-row .phase-history-swipe-content{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;box-sizing:border-box;padding:11px 12px;background:inherit;transform:translateX(0);transition:transform .18s ease;touch-action:pan-y}
        .nutrition-phase-history-row.phase-history-delete-open .phase-history-swipe-content{transform:translateX(-${REVEAL_PX}px)}
        .nutrition-phase-history-row .phase-history-swipe-content>div{min-width:0}
        .nutrition-phase-history-row.phase-history-deleting{opacity:.55;pointer-events:none}
        @media(max-width:560px){
            .nutrition-phase-history-row .phase-history-swipe-content{padding:11px 10px}
        }
    `;
    document.head.appendChild(style);
}

function completedPhaseRefs() {
    return readPhases()
        .map((phase, index) => ({ phase, index }))
        .filter(({ phase }) => phase?.endDate && phase?.startDate && phase?.goalId)
        .sort((a, b) => String(b.phase.startDate).localeCompare(String(a.phase.startDate)))
        .slice(0, 8);
}

function fingerprint(phase) {
    return [phase?.id || "", phase?.goalId || "", phase?.startDate || "", phase?.endDate || "", phase?.createdAt || ""].join("|");
}

function closeRow(row = openRow) {
    if (!row) return;
    row.classList.remove("phase-history-delete-open");
    if (openRow === row) openRow = null;
}

function openDelete(row) {
    if (openRow && openRow !== row) closeRow(openRow);
    row.classList.add("phase-history-delete-open");
    openRow = row;
}

function bindSwipe(row) {
    if (row.dataset.phaseSwipeBound === "1") return;
    row.dataset.phaseSwipeBound = "1";

    let startX = 0;
    let startY = 0;
    let tracking = false;

    row.addEventListener("touchstart", event => {
        const touch = event.touches?.[0];
        if (!touch || event.target.closest("button")) return;
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
    }, { passive: true });

    row.addEventListener("touchend", event => {
        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches?.[0];
        if (!touch) return;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
        if (dx < 0) openDelete(row);
        else closeRow(row);
    }, { passive: true });

    row.addEventListener("pointerdown", event => {
        if (event.pointerType === "touch" || event.target.closest("button")) return;
        startX = event.clientX;
        startY = event.clientY;
        tracking = true;
    });

    row.addEventListener("pointerup", event => {
        if (!tracking || event.pointerType === "touch") return;
        tracking = false;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
        if (dx < 0) openDelete(row);
        else closeRow(row);
    });
}

function decorateHistory() {
    ensureStyles();
    const details = document.querySelector("#nutrition-phase-history .nutrition-phase-history");
    if (!details) return;

    const holder = details.querySelector(":scope > div");
    if (!holder) return;

    if (!details.querySelector(".phase-history-swipe-help")) {
        const help = document.createElement("p");
        help.className = "phase-history-swipe-help";
        help.textContent = "Swipe left on an old phase to delete it.";
        holder.insertAdjacentElement("beforebegin", help);
    }

    const refs = completedPhaseRefs();
    const rows = [...holder.querySelectorAll(":scope > .nutrition-phase-history-row")];

    rows.forEach((row, position) => {
        const ref = refs[position];
        if (!ref) return;
        row.dataset.phaseSwipeReady = "1";
        row.dataset.phaseFingerprint = fingerprint(ref.phase);
        row.dataset.phaseOriginalIndex = String(ref.index);

        if (!row.querySelector(".phase-history-swipe-content")) {
            const content = document.createElement("div");
            content.className = "phase-history-swipe-content";
            while (row.firstChild) content.appendChild(row.firstChild);
            row.appendChild(content);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "phase-history-delete-action";
            button.textContent = "Delete";
            button.setAttribute("aria-label", `Delete old nutrition phase ${position + 1}`);
            row.insertBefore(button, content);
        }

        bindSwipe(row);
    });
}

function findPhaseIndexForRow(row, phases) {
    const fp = row.dataset.phaseFingerprint || "";
    if (fp) {
        const match = phases.findIndex(phase => fingerprint(phase) === fp);
        if (match >= 0) return match;
    }
    const fallback = Number(row.dataset.phaseOriginalIndex);
    return Number.isInteger(fallback) && fallback >= 0 && fallback < phases.length ? fallback : -1;
}

function deleteOldPhase(row) {
    const phases = readPhases();
    const index = findPhaseIndexForRow(row, phases);
    if (index < 0) return;

    const phase = phases[index];
    if (!phase?.endDate) {
        window.alert("The current active phase cannot be deleted from Phase History.");
        closeRow(row);
        return;
    }

    const label = phase.label || "this old phase";
    const confirmed = window.confirm(`Delete ${label}?\n\nThis removes only this saved nutrition phase. Your weigh-ins and workout data will not be deleted.`);
    if (!confirmed) {
        closeRow(row);
        return;
    }

    row.classList.add("phase-history-deleting");
    phases.splice(index, 1);
    writePhases(phases);
    closeRow(row);

    window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated", { detail: { source: "phase-history-delete" } }));
    window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "phase-history-delete" } }));
    scheduleDecorate();
}

function scheduleDecorate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        decorateHistory();
    });
}

document.addEventListener("click", event => {
    const deleteButton = event.target.closest?.(".phase-history-delete-action");
    if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        const row = deleteButton.closest(".nutrition-phase-history-row");
        if (row) deleteOldPhase(row);
        return;
    }

    if (openRow && !event.target.closest?.(".nutrition-phase-history-row")) closeRow(openRow);
});

const observer = new MutationObserver(scheduleDecorate);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener("levelup:nutrition-phase-updated", scheduleDecorate);
window.addEventListener("levelup:nutrition-updated", scheduleDecorate);
window.addEventListener("pageshow", scheduleDecorate);
scheduleDecorate();
