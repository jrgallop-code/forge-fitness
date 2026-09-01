import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";

const currentByDay = new Map();
const countByDay = new Map();
let queued = false;

const css = `
#plan-builder.manual-catalogue .manual-ex-head{display:none!important}
#plan-builder.manual-catalogue .exercise-builder-list{display:block}
#plan-builder.manual-catalogue .exercise-builder-row{display:none!important}
#plan-builder.manual-catalogue .exercise-builder-row.manual-setup-current{display:grid!important;gap:9px;padding:12px 10px;margin:0;background:var(--card,#18181d);border:1px solid var(--card-border,rgba(255,255,255,.08));border-radius:14px;color:var(--text,#f7f7f8)}
#plan-builder.manual-catalogue .exercise-recommendation{display:none!important}
#plan-builder.manual-catalogue .manual-setup-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
#plan-builder.manual-catalogue .manual-setup-copy{min-width:0}.manual-setup-copy h4{margin:0;color:var(--heading,#f7f7f8);font-size:1.08rem;line-height:1.18}.manual-setup-copy small{display:block;margin-top:3px;color:var(--muted,#92929c);font-size:.7rem}
#plan-builder.manual-catalogue .manual-setup-head button{min-height:32px;padding:6px 9px;border-radius:9px;font-size:.72rem}
#plan-builder.manual-catalogue .manual-setup-target{margin:0;color:var(--text-secondary,#a6a6af);font-size:.72rem}
#plan-builder.manual-catalogue .manual-setup-sets{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center;padding:9px;background:var(--surface-raised,#0e0e11);border:1px solid var(--line,rgba(255,255,255,.07));border-radius:10px}
#plan-builder.manual-catalogue .manual-setup-sets button{min-height:36px;padding:6px 10px;border-radius:8px;font-weight:900}.manual-setup-set-count{text-align:center;color:var(--heading,#fff);font-size:.82rem;font-weight:800}
#plan-builder.manual-catalogue .exercise-prescription:not(.cardio-prescription){display:block;margin:0}
#plan-builder.manual-catalogue .exercise-prescription:not(.cardio-prescription)>label:first-child{display:none!important}
#plan-builder.manual-catalogue .exercise-prescription:not(.cardio-prescription)>label:last-child{display:grid;grid-template-columns:auto minmax(120px,1fr);gap:10px;align-items:center;margin:0;color:var(--text-secondary,#d7d7dc);font-size:.72rem;font-weight:800}
#plan-builder.manual-catalogue .exercise-reps{min-width:0;min-height:38px;padding:7px 9px;text-align:center;background:var(--input-bg,#202027);border:1px solid var(--line,rgba(255,255,255,.09));border-radius:8px;color:var(--text,#fff);font-size:.9rem}
#plan-builder.manual-catalogue .builder-exercise-guide{width:100%;min-height:38px;margin:0;padding:7px 10px;border:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:9px;background:var(--accent-soft);color:var(--accent-text);font-size:.72rem}
#plan-builder.manual-catalogue .remove-exercise-btn{width:100%;min-height:36px;margin:0;padding:6px 10px;color:var(--danger-text,#ff6268);background:transparent;border-color:color-mix(in srgb,var(--danger) 32%,var(--line));font-size:.72rem}
#plan-builder.manual-catalogue .manual-setup-carousel{margin:7px 0 9px}.manual-setup-carousel button{min-height:38px;padding:7px 9px;font-size:.72rem}.manual-setup-carousel .exercise-carousel-position strong{font-size:.78rem}.manual-setup-carousel .exercise-carousel-position small{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#plan-builder.manual-catalogue .workout-day-card{padding:11px;background:var(--surface-raised,rgba(255,255,255,.018));border:1px solid var(--line,rgba(255,255,255,.08));border-radius:16px;color:var(--text)}
#plan-builder.manual-catalogue .day-name-input{min-height:44px;padding:8px 10px;font-size:1.02rem;font-weight:800;background:var(--input-bg,#101012);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:11px;color:var(--text)}
@media(max-width:520px){#plan-builder.manual-catalogue .workout-day-card{padding:9px}#plan-builder.manual-catalogue .exercise-builder-row.manual-setup-current{padding:11px 8px}#plan-builder.manual-catalogue .exercise-prescription:not(.cardio-prescription)>label:last-child{grid-template-columns:1fr;gap:5px}}
`;

if (!document.getElementById("manual-plan-setup-style")) {
  const style = document.createElement("style");
  style.id = "manual-plan-setup-style";
  style.textContent = css;
  document.head.appendChild(style);
}

const builder = () => document.getElementById("plan-builder");
const days = () => [...document.querySelectorAll("#workout-days>.workout-day-card")];
const day = i => days()[i] || null;
const rows = i => [...day(i)?.querySelectorAll(".exercise-builder-row") || []];
const timeTarget = value => /\b(sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(String(value || ""));
const setText = (el, value) => {
  const next = String(value ?? "");
  if (el && el.textContent !== next) el.textContent = next;
};

function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    patch();
  });
}

function patch() {
  const root = builder();
  const workoutDays = document.getElementById("workout-days");
  if (!root?.classList.contains("manual-catalogue") || root.hidden || workoutDays?.hidden) return;

  setText(root.querySelector(".builder-heading h3"), "Set Up Your Workout Plan");
  setText(root.querySelector(".builder-heading p"), "Adjust each exercise using the same compact layout as your workout logger.");

  days().forEach((card, di) => {
    const list = card.querySelector(".exercise-builder-list");
    const all = rows(di);
    const previous = countByDay.get(di);
    if (previous !== undefined && all.length > previous) currentByDay.set(di, Math.min(previous, all.length - 1));
    countByDay.set(di, all.length);

    if (!all.length) {
      card.querySelector(".manual-setup-carousel")?.remove();
      return;
    }

    let index = Number(currentByDay.get(di));
    if (!Number.isFinite(index)) index = 0;
    index = Math.max(0, Math.min(index, all.length - 1));
    currentByDay.set(di, index);

    let nav = card.querySelector(".manual-setup-carousel");
    if (!nav) {
      nav = document.createElement("div");
      nav.className = "exercise-carousel-controls manual-setup-carousel";
      nav.innerHTML = '<button class="secondary-btn" type="button" data-setup-prev>← Previous</button><span class="exercise-carousel-position"><strong data-setup-position></strong><small data-setup-name></small></span><button class="secondary-btn" type="button" data-setup-next>Next →</button>';
      list?.insertAdjacentElement("beforebegin", nav);
    }
    if (nav.dataset.day !== String(di)) nav.dataset.day = String(di);
    setText(nav.querySelector("[data-setup-position]"), `${index + 1} of ${all.length}`);
    nav.querySelector("[data-setup-prev]").disabled = index === 0;
    nav.querySelector("[data-setup-next]").disabled = index === all.length - 1;

    all.forEach((row, ei) => {
      const exercise = getExerciseById(row.querySelector(".exercise-select")?.value);
      if (!exercise) return;

      row.classList.add("manual-setup-card");
      row.classList.remove("session-exercise-card", "active-exercise-card");
      row.classList.toggle("manual-setup-current", ei === index);
      if (row.dataset.setupDay !== String(di)) row.dataset.setupDay = String(di);
      if (row.dataset.setupIndex !== String(ei)) row.dataset.setupIndex = String(ei);

      let head = row.querySelector(":scope>.manual-setup-head");
      if (!head) {
        head = document.createElement("div");
        head.className = "manual-setup-head";
        head.innerHTML = '<div class="manual-setup-copy"><h4></h4><small></small></div><button class="secondary-btn" type="button" data-manual-replace>Swap</button>';
        row.insertAdjacentElement("afterbegin", head);
      }
      setText(head.querySelector("h4"), exercise.name);
      setText(head.querySelector("small"), `${exercise.muscleGroup || "Other"} · ${exercise.equipment || "Equipment not specified"}`);
      const swap = head.querySelector("[data-manual-replace]");
      if (swap.dataset.day !== String(di)) swap.dataset.day = String(di);
      if (swap.dataset.index !== String(ei)) swap.dataset.index = String(ei);
      if (ei === index) setText(nav.querySelector("[data-setup-name]"), exercise.name);

      let target = row.querySelector(":scope>.manual-setup-target");
      if (!target) {
        target = document.createElement("p");
        target.className = "manual-setup-target";
        head.insertAdjacentElement("afterend", target);
      }

      const setInput = row.querySelector(".exercise-sets");
      const repInput = row.querySelector(".exercise-reps");
      if (exercise.trackingType === "notes") {
        setText(target, "Cardio session");
        row.querySelector(":scope>.manual-setup-sets")?.remove();
      } else {
        const setCount = Math.max(1, Number(setInput?.value) || Number(exercise.defaultSets) || 3);
        const rep = repInput?.value || exercise.recommendedReps || "8-12";
        setText(target, `${setCount} ${setCount === 1 ? "set" : "sets"} × ${timeTarget(rep) ? rep : `${rep} reps`}`);

        let stepper = row.querySelector(":scope>.manual-setup-sets");
        if (!stepper) {
          stepper = document.createElement("div");
          stepper.className = "manual-setup-sets";
          stepper.innerHTML = '<button class="secondary-btn" type="button" data-setup-minus>− Set</button><strong class="manual-setup-set-count"></strong><button class="primary-btn" type="button" data-setup-plus>+ Set</button>';
          target.insertAdjacentElement("afterend", stepper);
        }
        setText(stepper.querySelector(".manual-setup-set-count"), `${setCount} ${setCount === 1 ? "set" : "sets"}`);
        stepper.querySelector("[data-setup-minus]").disabled = setCount <= 1;
      }

      setText(row.querySelector(":scope>.builder-exercise-guide"), "View Form Guide");
      setText(row.querySelector(":scope>.remove-exercise-btn"), "Remove Exercise");
    });
  });
}

function move(button, delta) {
  const di = Number(button.closest(".manual-setup-carousel")?.dataset.day);
  const all = rows(di);
  if (!all.length) return;
  const index = Number(currentByDay.get(di)) || 0;
  currentByDay.set(di, Math.max(0, Math.min(index + delta, all.length - 1)));
  queue();
}

function changeSets(button, delta) {
  const input = button.closest(".exercise-builder-row")?.querySelector(".exercise-sets");
  if (!input) return;
  input.value = String(Math.max(1, Math.min(10, (Number(input.value) || 1) + delta)));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  queue();
}

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.matches("[data-custom-plan-id] button") && /edit plan/i.test(button.textContent || "")) {
    currentByDay.clear();
    countByDay.clear();
    queueMicrotask(queue);
  } else if (button.matches("[data-setup-prev]")) {
    event.preventDefault();
    move(button, -1);
  } else if (button.matches("[data-setup-next]")) {
    event.preventDefault();
    move(button, 1);
  } else if (button.matches("[data-setup-minus]")) {
    event.preventDefault();
    changeSets(button, -1);
  } else if (button.matches("[data-setup-plus]")) {
    event.preventDefault();
    changeSets(button, 1);
  } else if (button.matches(".remove-exercise-btn")) {
    const row = button.closest(".exercise-builder-row");
    const di = Number(row?.dataset.setupDay);
    const ei = Number(row?.dataset.setupIndex);
    if (Number.isFinite(di)) currentByDay.set(di, Math.max(0, ei - 1));
    queueMicrotask(queue);
  } else if (button.matches(".add-exercise-btn,#add-day-btn")) {
    queueMicrotask(queue);
  }
});

document.addEventListener("change", event => {
  if (event.target.matches?.(".exercise-reps,.exercise-sets,.exercise-select,input[type='checkbox']")) queue();
});

queue();
