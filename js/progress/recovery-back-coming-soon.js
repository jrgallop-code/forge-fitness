const STYLE_ID = "recovery-back-coming-soon-style";
const PANEL_ATTR = "data-recovery-back-coming-soon-panel";
const TOAST_ID = "recovery-back-coming-soon-message";

function clearLegacyBackGate() {
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(TOAST_ID)?.remove();
  document.querySelectorAll(`[${PANEL_ATTR}]`).forEach(panel => panel.remove());
  document.querySelectorAll("[data-recovery-body-back]").forEach(back => {
    if (back.style.getPropertyPriority("display") === "important") {
      back.style.removeProperty("display");
    }
    back.removeAttribute("aria-hidden");
  });
}

const content = document.getElementById("content");
if (content) {
  new MutationObserver(clearLegacyBackGate).observe(content, { childList: true, subtree: true });
}

window.setTimeout(clearLegacyBackGate, 0);
