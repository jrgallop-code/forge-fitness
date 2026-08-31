import { getAllExercises, getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { matchesExerciseBrowser, renderMuscleCarousel } from "./exercise-browser.js?v=visual-muscle-browser-1";

let active = false;
let picker = null;
let bypassAdd = false;
let customDay = null;
let patchQueued = false;

const css = `
#plan-builder.manual-catalogue .exercise-select{display:none!important}
#plan-builder.manual-catalogue .exercise-builder-row{display:grid;gap:10px;padding:15px;border:1px solid rgba(255,255,255,.11);border-radius:17px;background:rgba(255,255,255,.025)}
.manual-ex-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.manual-ex-copy{display:grid;gap:3px;min-width:0}.manual-ex-copy strong{color:#f7f7f8}.manual-ex-copy small{color:#92929c;font-size:.76rem}.manual-ex-head button{padding:6px 9px;min-height:32px;font-size:.75rem}
#plan-builder.manual-catalogue .add-exercise-btn{width:100%;min-height:46px;border-style:dashed}
.manual-day-empty{padding:14px;margin:4px 0 12px;border:1px dashed rgba(255,255,255,.12);border-radius:14px;color:#8f8f98;text-align:center;font-size:.82rem}
.manual-picker{display:grid;gap:12px;min-height:60vh}
.manual-picker-head{display:flex;justify-content:space-between;gap:12px}.manual-picker-head h3{margin:4px 0}.manual-picker-head p{margin:4px 0 0;color:#94949d;font-size:.84rem}
.manual-picker-count{display:grid;place-items:center;min-width:38px;height:38px;padding:0 10px;border-radius:999px;background:rgba(255,49,95,.14);color:#ff315f;font-weight:800}
.manual-picker-search,.manual-picker select{width:100%;min-height:44px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:#111114;color:#f4f4f6;padding:0 12px}
.manual-picker-search{min-height:48px;font-size:16px}.manual-picker-filters{display:grid;grid-template-columns:1fr 1fr;gap:8px}.manual-picker-tools{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#8f8f98;font-size:.8rem}
.manual-picker-list{display:grid;gap:8px;padding-bottom:92px}
.manual-pick{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:12px 13px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#101012;color:#f5f5f7;text-align:left}
.manual-pick-copy{display:grid;gap:2px;min-width:0;padding:0;border:0;background:transparent;color:inherit;text-align:left}.manual-pick-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.manual-pick-copy small{overflow:hidden;color:#8d8d97;font-size:.74rem;text-overflow:ellipsis;white-space:nowrap}
.manual-pick-guide{min-height:32px;padding:6px 8px;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:rgba(255,255,255,.045);color:#d7d7dc;font:inherit;font-size:.64rem;font-weight:850;letter-spacing:.025em}.manual-pick-guide:active{border-color:rgba(255,49,95,.55);background:rgba(255,49,95,.12);color:#fff}
.manual-pick-mark{display:grid;place-items:center;min-width:32px;height:32px;padding:0 7px;border:1px solid rgba(255,255,255,.17);border-radius:9px;background:transparent;color:inherit;font:inherit;font-weight:800}
.manual-pick.selected{border-color:rgba(255,49,95,.75);background:rgba(255,49,95,.08)}.manual-pick.selected .manual-pick-mark{background:#ff315f;border-color:#ff315f}
.manual-pick.added .manual-pick-copy,.manual-pick.added .manual-pick-mark{opacity:.45}.manual-pick.added .manual-pick-mark{font-size:.7rem}
.manual-picker-footer{position:sticky;bottom:calc(86px + env(safe-area-inset-bottom));z-index:8;display:grid;grid-template-columns:auto 1fr;gap:8px;padding:9px;border:1px solid rgba(255,255,255,.13);border-radius:15px;background:rgba(15,15,18,.96);backdrop-filter:blur(14px)}
.manual-picker-footer .primary-btn{width:100%}.manual-picker-empty{padding:24px;color:#8f8f98;text-align:center}
@media(max-width:520px){.manual-picker-filters{grid-template-columns:1fr}.manual-picker-tools{align-items:flex-start}.manual-picker-footer{bottom:calc(90px + env(safe-area-inset-bottom))}}
`;

if (!document.getElementById("manual-builder-catalogue-css")) {
  const style = document.createElement("style");
  style.id = "manual-builder-catalogue-css";
  style.textContent = css;
  document.head.appendChild(style);
}

const planBuilder = () => document.getElementById("plan-builder");
const dayCards = () => [...document.querySelectorAll("#workout-days>.workout-day-card")];
const dayCard = i => dayCards()[i] || null;
const editor = () => document.getElementById("workout-days");
const exercises = () => getAllExercises()
  .filter(x => x?.id && x?.name)
  .sort((a,b) => String(a.muscleGroup || "").localeCompare(String(b.muscleGroup || "")) || a.name.localeCompare(b.name));
const esc = v => String(v ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const setText = (el, value) => {
  const next = String(value ?? "");
  if (el && el.textContent !== next) el.textContent = next;
};

function queuePatch() {
  if (patchQueued) return;
  patchQueued = true;
  requestAnimationFrame(() => {
    patchQueued = false;
    patchRows();
  });
}

function patchRows() {
  const root = planBuilder();
  if (!active || picker || !root || root.hidden) return;
  root.classList.add("manual-catalogue");

  dayCards().forEach((card, di) => {
    const add = card.querySelector(".add-exercise-btn");
    setText(add, "+ Add Exercises");

    const list = card.querySelector(".exercise-builder-list");
    const empty = card.querySelector(".manual-day-empty");
    if (list && !list.children.length && !empty) {
      list.insertAdjacentHTML("afterend", '<div class="manual-day-empty">No exercises yet. Browse the catalogue and select everything you want for this day.</div>');
    } else if (list?.children.length && empty) {
      empty.remove();
    }

    [...card.querySelectorAll(".exercise-builder-row")].forEach((row, ei) => {
      const ex = getExerciseById(row.querySelector(".exercise-select")?.value);
      if (!ex) return;

      let head = row.querySelector(":scope>.manual-ex-head");
      if (!head) {
        head = document.createElement("div");
        head.className = "manual-ex-head";
        head.innerHTML = '<span class="manual-ex-copy"><strong></strong><small></small></span><button class="secondary-btn" type="button" data-manual-replace>Replace</button>';
        row.insertAdjacentElement("afterbegin", head);
      }
      setText(head.querySelector("strong"), ex.name);
      setText(head.querySelector("small"), `${ex.muscleGroup || "Other"} · ${ex.equipment || "Equipment not specified"}`);
      const replace = head.querySelector("[data-manual-replace]");
      if (replace.dataset.day !== String(di)) replace.dataset.day = String(di);
      if (replace.dataset.index !== String(ei)) replace.dataset.index = String(ei);
    });
  });
}

function existingIds(di, ignore = null) {
  return new Set(
    [...dayCard(di)?.querySelectorAll(".exercise-builder-row") || []]
      .map((row, i) => i === ignore ? "" : row.querySelector(".exercise-select")?.value)
      .filter(Boolean)
  );
}

function hideEditor(value) {
  const e = editor();
  if (e) e.hidden = value;
  const footer = planBuilder()?.querySelector(":scope>.builder-footer");
  if (footer) footer.hidden = value;
}

function openPicker(di, mode = "add", ei = null) {
  if (!active || picker || !dayCard(di)) return;
  picker = { di, mode, ei, selected: new Set(), q: "", muscle: "", equipment: "" };
  hideEditor(true);
  renderPicker();
  planBuilder()?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closePicker(apply = false) {
  const state = picker;
  document.querySelector("[data-manual-picker]")?.remove();
  picker = null;
  hideEditor(false);
  if (apply && state) applySelection(state);
  queuePatch();
  dayCard(state?.di ?? 0)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPicker() {
  const e = editor();
  const state = picker;
  if (!e || !state) return;

  const all = exercises();
  const equipment = [...new Set(all.map(x => x.equipment).filter(Boolean))].sort();
  const replace = state.mode === "replace";
  const section = document.createElement("section");
  section.className = "manual-picker";
  section.dataset.manualPicker = "";
  const dayName = dayCard(state.di)?.querySelector(".day-name-input")?.value || `Day ${state.di + 1}`;

  section.innerHTML = `
    <div class="manual-picker-head">
      <div><span class="eyebrow">EXERCISE CATALOGUE</span><h3>${replace ? "Replace Exercise" : `Choose Exercises · ${esc(dayName)}`}</h3><p>${replace ? "Choose one replacement." : "Select your exercises first. Adjust sets and reps afterward."}</p></div>
      <span class="manual-picker-count" data-manual-count>0</span>
    </div>
    <input class="manual-picker-search" type="search" placeholder="Search exercises" data-manual-search>
    ${renderMuscleCarousel(state.muscle, "data-manual-muscle")}
    <div class="manual-picker-filters">
      <select data-manual-equipment><option value="">All equipment</option>${equipment.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select>
    </div>
    <div class="manual-picker-tools"><span>Tap exercises to ${replace ? "choose a replacement" : "build your day"}.</span><button class="secondary-btn" type="button" data-manual-custom>+ Custom Exercise</button></div>
    <div class="manual-picker-list" data-manual-list></div>
    <div class="manual-picker-footer"><button class="secondary-btn" type="button" data-manual-back>Back</button><button class="primary-btn" type="button" data-manual-confirm disabled>${replace ? "Replace Exercise" : "Add Exercises"}</button></div>
  `;

  e.insertAdjacentElement("beforebegin", section);
  section.querySelector("[data-manual-search]").oninput = ev => { state.q = ev.target.value; renderList(); };
  section.querySelectorAll("[data-manual-muscle]").forEach(button => button.onclick = () => {
    state.muscle = button.dataset.manualMuscle || "";
    section.querySelectorAll("[data-manual-muscle]").forEach(item => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    renderList();
  });
  section.querySelector("[data-manual-equipment]").onchange = ev => { state.equipment = ev.target.value; renderList(); };
  section.querySelector("[data-manual-back]").onclick = () => closePicker();
  section.querySelector("[data-manual-confirm]").onclick = () => closePicker(true);
  section.querySelector("[data-manual-custom]").onclick = () => startCustom(state.di);
  renderList();
}

function renderList() {
  const state = picker;
  const list = document.querySelector("[data-manual-list]");
  if (!state || !list) return;

  const used = existingIds(state.di, state.mode === "replace" ? state.ei : null);
  const q = state.q.trim().toLowerCase();
  const matches = exercises().filter(x => matchesExerciseBrowser(x, {
    muscle: state.muscle,
    equipment: state.equipment,
    query: q
  }));

  list.innerHTML = matches.length
    ? matches.map(x => {
        const added = used.has(x.id);
        const selected = state.selected.has(x.id);
        return `<div class="manual-pick ${selected ? "selected" : ""} ${added ? "added" : ""}"><button class="manual-pick-copy" type="button" data-manual-select data-id="${esc(x.id)}" ${added ? "disabled" : ""}><strong>${esc(x.name)}</strong><small>${esc(x.muscleGroup || "Other")} · ${esc(x.equipment || "Equipment not specified")}</small></button><button class="manual-pick-guide" type="button" data-manual-guide data-exercise-id="${esc(x.id)}" aria-label="Open form guide for ${esc(x.name)}">Form Guide</button><button class="manual-pick-mark" type="button" data-manual-select data-id="${esc(x.id)}" aria-label="${added ? `${esc(x.name)} already added` : `Select ${esc(x.name)}`}" ${added ? "disabled" : ""}>${added ? "Added" : selected ? "✓" : "+"}</button></div>`;
      }).join("")
    : '<div class="manual-picker-empty">No exercises match those filters.</div>';

  list.querySelectorAll("[data-manual-select]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (state.mode === "replace") state.selected = new Set([id]);
      else state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
      renderList();
    };
  });

  list.querySelectorAll("[data-manual-guide]").forEach(button => {
    button.onclick = () => {
      document.dispatchEvent(new CustomEvent("levelup:open-exercise-guide", {
        detail: {
          exerciseId: button.dataset.exerciseId,
          sourceSelector: "#plan-builder",
          backLabel: "← Exercise Catalogue",
          focusGuideStart: true
        }
      }));
    };
  });

  const n = state.selected.size;
  setText(document.querySelector("[data-manual-count]"), n);
  const confirm = document.querySelector("[data-manual-confirm]");
  if (confirm) {
    confirm.disabled = !n;
    setText(confirm, state.mode === "replace" ? "Replace Exercise" : n === 1 ? "Add 1 Exercise" : `Add ${n} Exercises`);
  }
}

function applySelection(state) {
  if (state.mode === "replace") {
    const id = [...state.selected][0];
    const select = dayCard(state.di)?.querySelectorAll(".exercise-builder-row")[state.ei]?.querySelector(".exercise-select");
    if (select && id) {
      select.value = id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return;
  }

  [...state.selected].forEach(id => {
    const add = dayCard(state.di)?.querySelector(".add-exercise-btn");
    if (!add) return;
    bypassAdd = true;
    add.click();
    bypassAdd = false;
    const rows = [...dayCard(state.di)?.querySelectorAll(".exercise-builder-row") || []];
    const select = rows.at(-1)?.querySelector(".exercise-select");
    if (select) {
      select.value = id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

function startCustom(di) {
  customDay = di;
  closePicker();
  const add = dayCard(di)?.querySelector(".add-exercise-btn");
  if (!add) return;
  bypassAdd = true;
  add.click();
  bypassAdd = false;
  const rows = [...dayCard(di)?.querySelectorAll(".exercise-builder-row") || []];
  const select = rows.at(-1)?.querySelector(".exercise-select");
  if (select) {
    select.value = "__add_custom__";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function capture(ev) {
  const t = ev.target.closest?.("button,.preset-plan-card");
  if (!t) return;

  if (t.matches(".nav-btn") || t.id === "save-plan-btn" || t.id === "close-plan-builder-btn" || t.hasAttribute("data-manual-one-off")) {
    active = false;
    return;
  }

  if (t.id === "new-plan-btn") {
    active = true;
    queueMicrotask(() => requestAnimationFrame(() => {
      queuePatch();
      if (dayCards().length) openPicker(0);
    }));
    return;
  }

  if (t.matches(".preset-plan-card[data-plan-id]")) {
    active = false;
    planBuilder()?.classList.remove("manual-catalogue");
    return;
  }

  if (t.matches("[data-custom-plan-id] button") && /edit plan/i.test(t.textContent || "")) {
    active = true;
    queueMicrotask(queuePatch);
    return;
  }

  if (t.matches("[data-custom-plan-id] button") && /log a workout/i.test(t.textContent || "")) {
    active = false;
    return;
  }

  if (!active) return;

  if (t.matches(".add-exercise-btn") && !bypassAdd) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    openPicker(Number(t.dataset.dayIndex));
    return;
  }

  if (t.id === "add-day-btn") {
    const before = dayCards().length;
    requestAnimationFrame(() => {
      if (dayCards().length > before) openPicker(dayCards().length - 1);
    });
    return;
  }

  if (t.matches("[data-manual-replace]")) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    openPicker(Number(t.dataset.day), "replace", Number(t.dataset.index));
  }
}

function bubble(ev) {
  if (!active || customDay === null) return;

  if (ev.target.closest?.("#cancel-custom-exercise-btn")) {
    const di = customDay;
    customDay = null;
    queueMicrotask(() => {
      const rows = [...dayCard(di)?.querySelectorAll(".exercise-builder-row") || []];
      const last = rows.at(-1);
      if (last?.querySelector(".exercise-select")?.value === "") last.querySelector(".remove-exercise-btn")?.click();
      queuePatch();
    });
  }

  if (ev.target.closest?.("#save-custom-exercise-btn")) {
    queueMicrotask(() => {
      if (document.getElementById("custom-exercise-form")?.hidden) {
        customDay = null;
        queuePatch();
      }
    });
  }
}

document.addEventListener("click", capture, true);
document.addEventListener("click", bubble);

const content = document.getElementById("content");
if (content) {
  new MutationObserver(mutations => {
    if (!active || picker) return;
    if (mutations.some(m => m.addedNodes.length || m.removedNodes.length)) queuePatch();
  }).observe(content, { childList: true, subtree: true });
}
