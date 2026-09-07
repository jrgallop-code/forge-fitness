const STYLE_ID = "level-up-repeat-workout-day-styles";
let patchQueued = false;
let repeatBusy = false;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #plan-builder.manual-catalogue .repeat-workout-day-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin-top:12px;padding:11px 12px;border:1px solid var(--line,rgba(255,255,255,.09));border-radius:12px;background:var(--surface-raised,rgba(255,255,255,.025))}
    #plan-builder.manual-catalogue .repeat-workout-day-copy{display:grid;gap:2px;min-width:0}
    #plan-builder.manual-catalogue .repeat-workout-day-copy strong{color:var(--heading,#fff);font-size:.78rem;line-height:1.2}
    #plan-builder.manual-catalogue .repeat-workout-day-copy small{color:var(--muted,#92929c);font-size:.67rem;line-height:1.35}
    #plan-builder.manual-catalogue .repeat-workout-day-btn{min-height:40px;padding:8px 12px;border:1px solid color-mix(in srgb,var(--accent) 38%,var(--line));border-radius:10px;background:var(--accent-soft);color:var(--accent-text);font:inherit;font-size:.73rem;font-weight:850;white-space:nowrap}
    #plan-builder.manual-catalogue .repeat-workout-day-btn:disabled{opacity:.55}
    @media(max-width:520px){#plan-builder.manual-catalogue .repeat-workout-day-row{grid-template-columns:1fr}.repeat-workout-day-btn{width:100%}}
  `;
  document.head.appendChild(style);
}

const builder = () => document.getElementById("plan-builder");
const dayCards = () => [...document.querySelectorAll("#workout-days>.workout-day-card")];
const dayCard = index => dayCards()[index] || null;
const exerciseRows = card => [...card?.querySelectorAll(".exercise-builder-row") || []];

function validExerciseSnapshots(card) {
  return exerciseRows(card).map(row => ({
    id: String(row.querySelector(".exercise-select")?.value || "").trim(),
    sets: row.querySelector(".exercise-sets")?.value ?? null,
    reps: row.querySelector(".exercise-reps")?.value ?? null,
    notes: row.querySelector(".exercise-notes")?.value ?? null
  })).filter(item => item.id && item.id !== "__add_custom__");
}

function snapshotDay(card, index) {
  if (!card) return null;
  const exercises = validExerciseSnapshots(card);
  if (!exercises.length) return null;
  return {
    name: String(card.querySelector(".day-name-input")?.value || `Day ${index + 1}`).trim() || `Day ${index + 1}`,
    exercises
  };
}

function repeatName(name, existingNames) {
  const base = String(name || "Workout").replace(/\s+\(Repeat(?:\s+\d+)?\)$/i, "").trim() || "Workout";
  const first = `${base} (Repeat)`;
  if (!existingNames.has(first)) return first;
  let number = 2;
  while (existingNames.has(`${base} (Repeat ${number})`)) number += 1;
  return `${base} (Repeat ${number})`;
}

function patch() {
  patchQueued = false;
  ensureStyles();
  const root = builder();
  if (!root?.classList.contains("manual-catalogue") || root.hidden) return;

  dayCards().forEach((card, index) => {
    const snapshots = validExerciseSnapshots(card);
    const existing = card.querySelector(":scope>.repeat-workout-day-row");
    if (!snapshots.length) {
      existing?.remove();
      return;
    }
    if (existing) {
      const button = existing.querySelector("[data-repeat-workout-day]");
      if (button) button.dataset.dayIndex = String(index);
      return;
    }

    const row = document.createElement("div");
    row.className = "repeat-workout-day-row";
    row.innerHTML = `
      <span class="repeat-workout-day-copy">
        <strong>Use this workout again</strong>
        <small>Duplicate the full day with the same exercises, sets and reps.</small>
      </span>
      <button class="repeat-workout-day-btn" type="button" data-repeat-workout-day data-day-index="${index}">↻ Repeat Day</button>`;

    const addButton = card.querySelector(":scope>.add-exercise-btn");
    if (addButton) addButton.insertAdjacentElement("afterend", row);
    else card.appendChild(row);
  });
}

function queuePatch() {
  if (patchQueued) return;
  patchQueued = true;
  requestAnimationFrame(patch);
}

function waitFor(test, timeout = 2200) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    function check() {
      let value = null;
      try { value = test(); } catch {}
      if (value) return resolve(value);
      if (performance.now() - started >= timeout) return reject(new Error("repeat-timeout"));
      requestAnimationFrame(check);
    }
    check();
  });
}

function dispatchChange(input) {
  input?.dispatchEvent(new Event("change", { bubbles: true }));
}

async function addBlankExercise(targetIndex, expectedCount) {
  const button = dayCard(targetIndex)?.querySelector(".add-exercise-btn");
  if (!button) throw new Error("missing-add-exercise");
  button.click();
  await waitFor(() => exerciseRows(dayCard(targetIndex)).length >= expectedCount);
}

async function applyExercise(targetIndex, exerciseIndex, snapshot) {
  let row = exerciseRows(dayCard(targetIndex))[exerciseIndex];
  let select = row?.querySelector(".exercise-select");
  if (!select) throw new Error("missing-exercise-select");

  select.value = snapshot.id;
  dispatchChange(select);

  await waitFor(() => {
    const current = exerciseRows(dayCard(targetIndex))[exerciseIndex]?.querySelector(".exercise-select");
    return current && String(current.value) === snapshot.id ? current : null;
  });

  row = exerciseRows(dayCard(targetIndex))[exerciseIndex];
  const sets = row?.querySelector(".exercise-sets");
  const reps = row?.querySelector(".exercise-reps");
  const notes = row?.querySelector(".exercise-notes");

  if (sets && snapshot.sets !== null) {
    sets.value = snapshot.sets;
    dispatchChange(sets);
  }
  if (reps && snapshot.reps !== null) {
    reps.value = snapshot.reps;
    dispatchChange(reps);
  }
  if (notes && snapshot.notes !== null) {
    notes.value = snapshot.notes;
    dispatchChange(notes);
  }
}

async function repeatDay(sourceIndex, trigger) {
  if (repeatBusy) return;
  const sourceCard = dayCard(sourceIndex);
  const snapshot = snapshotDay(sourceCard, sourceIndex);
  if (!snapshot) return;

  const addDay = document.getElementById("add-day-btn");
  if (!addDay) return;

  repeatBusy = true;
  trigger.disabled = true;
  const originalLabel = trigger.textContent;
  trigger.textContent = "Repeating…";

  try {
    const before = dayCards().length;
    const existingNames = new Set(dayCards().map(card => String(card.querySelector(".day-name-input")?.value || "").trim()).filter(Boolean));
    addDay.click();
    await waitFor(() => dayCards().length === before + 1);
    const targetIndex = before;

    for (let index = 0; index < snapshot.exercises.length; index += 1) {
      await addBlankExercise(targetIndex, index + 1);
      await applyExercise(targetIndex, index, snapshot.exercises[index]);
    }

    const target = dayCard(targetIndex);
    const nameInput = target?.querySelector(".day-name-input");
    if (nameInput) {
      nameInput.value = repeatName(snapshot.name, existingNames);
      dispatchChange(nameInput);
    }

    queuePatch();
    requestAnimationFrame(() => {
      dayCard(targetIndex)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } catch (error) {
    console.warn("Level Up could not repeat the workout day.", error);
  } finally {
    repeatBusy = false;
    if (trigger.isConnected) {
      trigger.disabled = false;
      trigger.textContent = originalLabel;
    }
    queuePatch();
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-repeat-workout-day]");
  if (!button) return;
  const index = Number(button.dataset.dayIndex);
  if (!Number.isFinite(index)) return;
  repeatDay(index, button);
});

const observer = new MutationObserver(queuePatch);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("pageshow", queuePatch);
queuePatch();
