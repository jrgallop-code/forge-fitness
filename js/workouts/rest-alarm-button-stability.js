const BANNER_ID = "level-up-rest-alarm-banner";
const FIX_MARKER = "buttonStabilityFixed";

function installBannerStabilityFix() {
  const banner = document.getElementById(BANNER_ID);
  if (!banner || banner.dataset[FIX_MARKER] === "true") return;

  const descriptor =
    Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML") ||
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHTML");

  if (!descriptor?.get || !descriptor?.set) return;

  // rest-alarm-phase1 observes the whole document and also redraws this banner.
  // Without this guard, each redraw triggers the observer again, continuously
  // replacing the buttons. Mobile Safari can then lose the click between the
  // touch start and click event. Keep identical redraws as no-ops so the button
  // nodes stay stable while the user is tapping them.
  let lastAssignedHtml = descriptor.get.call(banner);

  Object.defineProperty(banner, "innerHTML", {
    configurable: true,
    get() {
      return descriptor.get.call(this);
    },
    set(value) {
      const nextHtml = String(value ?? "");
      if (nextHtml === lastAssignedHtml) return;
      lastAssignedHtml = nextHtml;
      descriptor.set.call(this, nextHtml);
    }
  });

  banner.dataset[FIX_MARKER] = "true";
  banner.style.touchAction = "manipulation";
}

installBannerStabilityFix();

// The banner is normally created before this module evaluates, but keep a tiny
// fallback for any future load-order change.
if (!document.getElementById(BANNER_ID)) {
  const observer = new MutationObserver(() => {
    if (!document.getElementById(BANNER_ID)) return;
    observer.disconnect();
    installBannerStabilityFix();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
