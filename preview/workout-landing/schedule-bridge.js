const content = document.getElementById("content");

if (content) {
  const observer = new MutationObserver(() => mountPrototypeSchedule());
  observer.observe(content, { childList: true, subtree: true });
  mountPrototypeSchedule();
  window.setTimeout(mountPrototypeSchedule, 80);
  window.setTimeout(mountPrototypeSchedule, 300);
}

function mountPrototypeSchedule() {
  const landing = content?.querySelector("[data-preview-landing]");
  const page = content?.querySelector(".workout-page");
  if (!landing || !page) return;

  let section = landing.querySelector("[data-prototype-schedule]");
  if (!section) {
    section = document.createElement("section");
    section.className = "prototype-section prototype-schedule-section";
    section.dataset.prototypeSchedule = "";
    section.innerHTML = `
      <div class="prototype-section-heading prototype-schedule-heading">
        <div>
          <h2>Workout Schedule</h2>
          <p>Your week at a glance.</p>
        </div>
      </div>
      <div class="prototype-schedule-slot" data-prototype-schedule-slot></div>
    `;

    const filters = landing.querySelector(".prototype-filter-strip");
    if (filters) filters.insertAdjacentElement("afterend", section);
    else landing.prepend(section);
  }

  const slot = section.querySelector("[data-prototype-schedule-slot]");
  if (!slot) return;

  const shell = page.querySelector(".workout-schedule-shell");
  if (shell && shell.parentElement !== slot) slot.appendChild(shell);

  if (!shell) {
    slot.innerHTML = `<div class="prototype-schedule-loading">Loading your schedule…</div>`;
  } else {
    slot.querySelector(".prototype-schedule-loading")?.remove();
  }

  bindScheduleStart(section, landing);
}

function bindScheduleStart(section, landing) {
  section.querySelectorAll("[data-schedule-start]").forEach(button => {
    if (button.dataset.prototypeStartBound === "true") return;
    button.dataset.prototypeStartBound = "true";
    button.addEventListener("click", () => {
      window.setTimeout(() => {
        landing.hidden = true;
        const logger = content.querySelector("#workout-session-logger, .workout-session-logger, #workout-session-screen");
        logger?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    });
  });
}
