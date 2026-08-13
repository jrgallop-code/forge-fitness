const HERO_URL = "assets/workout-complete-arm.webp?v=2";

function installStyles() {
  if (document.querySelector("style[data-recap-arm-hero-style]")) return;
  const style = document.createElement("style");
  style.dataset.recapArmHeroStyle = "true";
  style.textContent = `
    .workout-complete-recap__body-glow.is-arm-hero {
      width:min(94vw,520px)!important;
      min-height:300px;
      margin:4px auto 8px!important;
      display:flex;
      align-items:center;
      justify-content:center;
      position:relative;
      isolation:isolate;
    }
    .workout-complete-recap__body-glow.is-arm-hero::before {
      content:"";
      position:absolute;
      width:72%;
      aspect-ratio:1;
      left:50%;
      top:50%;
      transform:translate(-50%,-48%);
      border-radius:50%;
      background:radial-gradient(circle,rgba(47,125,246,.26) 0%,rgba(47,125,246,.09) 40%,transparent 72%);
      filter:blur(10px);
      z-index:-1;
    }
    .workout-complete-recap__body-glow.is-arm-hero::after {
      left:18%!important;
      right:18%!important;
      bottom:2%!important;
      height:8px!important;
      opacity:.55!important;
    }
    .workout-complete-recap__arm-hero {
      display:block;
      width:100%;
      max-width:520px;
      height:auto;
      object-fit:contain;
      filter:drop-shadow(0 16px 20px rgba(0,0,0,.6)) drop-shadow(0 0 13px rgba(47,125,246,.22));
      transform:translateZ(0);
    }
    @media(max-width:520px){
      .workout-complete-recap__hero{padding-top:18px!important}
      .workout-complete-recap__crushing{margin-bottom:-2px!important}
      .workout-complete-recap__body-glow.is-arm-hero{width:min(96vw,430px)!important;min-height:250px;margin-top:-2px!important}
      .workout-complete-recap__arm-hero{max-height:390px}
      .workout-complete-recap__levelup{margin-top:-2px!important}
    }
  `;
  document.head.appendChild(style);
}

function replaceHero(root) {
  if (!root || root.dataset.armHeroInstalled === "true" || root.dataset.armHeroLoading === "true") return;
  root.dataset.armHeroLoading = "true";

  const image = new Image();
  image.className = "workout-complete-recap__arm-hero";
  image.alt = "Muscular arm holding a dumbbell";
  image.decoding = "async";
  image.onload = () => {
    if (!root.isConnected) return;
    root.classList.add("is-arm-hero");
    root.replaceChildren(image);
    root.dataset.armHeroInstalled = "true";
    delete root.dataset.armHeroLoading;
  };
  image.onerror = () => {
    console.warn("Workout complete hero failed to load");
    delete root.dataset.armHeroLoading;
  };
  image.src = HERO_URL;
}

function installArmHero() {
  installStyles();
  document.querySelectorAll(".workout-complete-recap__body-glow").forEach(replaceHero);
}

new MutationObserver(installArmHero).observe(document.documentElement, { childList:true, subtree:true });
window.addEventListener("focus", installArmHero);
document.addEventListener("visibilitychange", () => { if (!document.hidden) installArmHero(); });
window.setTimeout(installArmHero, 0);
