import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { parseRoutineText } from "./routine-import-parser.js?v=exercise-match-1";
import { formatSetCredits, getWeeklyPlanVolume } from "./plan-muscle-volume.js?v=plan-volume-shared-1";

const PLAN_KEY = "forge_workout_plans";
const EXAMPLE = `Push Day
Barbell Bench Press - 3x6-8
Incline Dumbbell Press - 3x8-12
Cable Fly - 3x12-15

Pull Day
Lat Pulldown - 3x8-12
Seated Cable Row - 3x8-12
Dumbbell Curl - 3x10-15`;

let importState = null;

export function initializeRoutineImporter(root = document) {
  ensureStyles();
  const workoutPage = root.querySelector(".workout-page");
  if (!workoutPage || workoutPage.dataset.routineImporterBound === "true") return;
  const launcher = workoutPage.querySelector("[data-smart-build-launcher]");
  if (!launcher) { window.setTimeout(() => initializeRoutineImporter(root), 80); return; }
  workoutPage.dataset.routineImporterBound = "true";
  launcher.querySelector(".smart-build-choice-grid")?.insertAdjacentHTML("beforeend", `<button class="smart-build-choice routine-import-launch" type="button" data-routine-import-open><span class="smart-build-choice-title">Import Routine</span><small>Paste from ChatGPT, Reddit, Notes, or anywhere else</small></button>`);
  workoutPage.insertAdjacentHTML("beforeend", renderShell());
  workoutPage.addEventListener("click", event => handleClick(event, workoutPage));
  workoutPage.addEventListener("change", event => handleChange(event, workoutPage));
  workoutPage.addEventListener("input", event => handleInput(event, workoutPage));
}

function ensureStyles() {
  if (document.querySelector('link[href*="routine-importer.css"]')) return;
  ["css/routine-importer.css?v=equal-launch-cards-1", "css/routine-importer-summary.css?v=routine-import-1"].forEach(href => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  });
}

function renderShell() {
  return `<section class="routine-import-wizard" data-routine-import-wizard hidden>
    <div class="routine-import-topbar"><div><span class="eyebrow">IMPORT ROUTINE</span><h3>Paste your routine</h3><p>Copy and paste a routine from ChatGPT, Reddit, Notes, a website, or a message. You will review everything before it is saved.</p></div><button class="secondary-btn" type="button" data-routine-import-close>Close</button></div>
    <div data-routine-import-stage>${renderPasteStage()}</div>
  </section>`;
}

function renderPasteStage() {
  return `<div class="routine-import-paste-card"><label for="routine-import-text">Routine text</label><textarea id="routine-import-text" maxlength="20000" placeholder="Paste a routine from ChatGPT or another source…&#10;&#10;Push Day&#10;Bench Press - 3x6-8&#10;Cable Fly - 3x12-15"></textarea><div class="routine-import-tools"><button class="secondary-btn" type="button" data-routine-paste>Paste from Clipboard</button><button class="routine-import-text-action" type="button" data-routine-example>Use example</button><button class="routine-import-text-action" type="button" data-routine-clear>Clear</button><small data-routine-count>0 / 20,000</small></div><p class="routine-import-message" data-routine-message aria-live="polite"></p><button class="primary-btn routine-import-build" type="button" data-routine-build>Build Pasted Routine</button></div>`;
}

function handleClick(event, page) {
  const button = event.target.closest("button");
  if (!button || !page.contains(button)) return;
  if (button.matches("[data-routine-import-open]")) return openImporter(page);
  if (button.matches("[data-routine-import-close]")) return closeImporter(page);
  if (button.matches("[data-routine-example]")) return setPasteText(page, EXAMPLE);
  if (button.matches("[data-routine-clear]")) return setPasteText(page, "");
  if (button.matches("[data-routine-paste]")) return pasteClipboard(page);
  if (button.matches("[data-routine-build]")) return buildReview(page);
  if (button.matches("[data-routine-back]")) return showPaste(page);
  if (button.matches("[data-routine-confirm]")) return confirmMatch(button, page);
  if (button.matches("[data-routine-remove]")) return removeExercise(button, page);
  if (button.matches("[data-routine-up], [data-routine-down]")) return moveExercise(button, page);
  if (button.matches("[data-routine-save]")) return saveRoutine(button, page);
}

function handleChange(event, page) {
  const select = event.target.closest("[data-routine-match]");
  if (!select || !importState) return;
  const item = findItem(select.dataset.day, select.dataset.exercise);
  if (!item) return;
  const exercise = getAllExercises().find(candidate => candidate.id === select.value);
  item.match.exerciseId = exercise?.id || null;
  item.match.exerciseName = exercise?.name || item.name;
  item.match.confirmed = true;
  renderReview(page);
}

function handleInput(event, page) {
  if (event.target.id === "routine-import-text") updateCounter(page);
  if (!importState) return;
  const field = event.target.closest("[data-routine-sets], [data-routine-reps], [data-routine-name]");
  if (!field) return;
  if (field.matches("[data-routine-name]")) { importState.name = field.value; return; }
  const item = findItem(field.dataset.day, field.dataset.exercise);
  if (!item) return;
  if (field.matches("[data-routine-sets]")) item.sets = Math.max(1, Math.min(20, Number(field.value || 1)));
  else item.reps = field.value.trim();
}

function openImporter(page) {
  page.querySelector("[data-workout-home]")?.setAttribute("hidden", "");
  page.querySelector("[data-smart-build-wizard]")?.setAttribute("hidden", "");
  const wizard = page.querySelector("[data-routine-import-wizard]");
  if (!wizard) return;
  wizard.hidden = false;
  showPaste(page);
  wizard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeImporter(page) {
  page.querySelector("[data-routine-import-wizard]")?.setAttribute("hidden", "");
  page.querySelector("[data-workout-home]")?.removeAttribute("hidden");
  importState = null;
}

function showPaste(page) {
  page.querySelector("[data-routine-import-stage]").innerHTML = renderPasteStage();
  if (importState) {
    const textarea = page.querySelector("#routine-import-text");
    if (textarea) textarea.value = importState.rawText || "";
  }
  updateCounter(page);
}

function setPasteText(page, value) {
  const textarea = page.querySelector("#routine-import-text");
  if (textarea) textarea.value = value;
  updateCounter(page);
}

async function pasteClipboard(page) {
  const message = page.querySelector("[data-routine-message]");
  try {
    const value = await navigator.clipboard.readText();
    setPasteText(page, value);
    if (message) message.textContent = value ? "Pasted from your clipboard." : "Your clipboard is empty.";
  } catch {
    if (message) message.textContent = "Press and hold inside the box, then choose Paste.";
  }
}

function buildReview(page) {
  const text = page.querySelector("#routine-import-text")?.value.trim() || "";
  const message = page.querySelector("[data-routine-message]");
  if (!text) { if (message) message.textContent = "Paste a routine first."; return; }
  const parsed = parseRoutineText(text);
  if (!parsed.days.length) { if (message) message.textContent = "No exercises were recognized. Try lines such as Bench Press - 3x8-12."; return; }
  importState = { name: suggestedName(parsed.days), rawText: text, days: parsed.days, skipped: parsed.skipped };
  renderReview(page);
}

function renderReview(page) {
  const stage = page.querySelector("[data-routine-import-stage]");
  const total = importState.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const uncertain = importState.days.flatMap(day => day.exercises).filter(item => !item.match.confirmed).length;
  stage.innerHTML = `<div class="routine-import-review"><div class="routine-import-review-head"><div><span class="eyebrow">IMPORT REVIEW</span><h3>${importState.days.length} days · ${total} exercises</h3><p>${uncertain ? `${uncertain} match${uncertain === 1 ? "" : "es"} need your confirmation.` : "Everything is ready to save."}</p></div><button class="secondary-btn" type="button" data-routine-back>← Edit Paste</button></div><label class="routine-import-name">Routine name<input type="text" maxlength="80" value="${escapeHtml(importState.name)}" data-routine-name></label>${importState.skipped.length ? `<div class="routine-import-skipped"><strong>${importState.skipped.length} line${importState.skipped.length === 1 ? " was" : "s were"} not imported</strong><small>Headers, notes, and progression instructions are kept in the original import text.</small></div>` : ""}<div class="routine-import-days">${importState.days.map(renderDay).join("")}</div>${renderImportSummary()}<div class="routine-import-savebar"><div><strong>${uncertain ? "Confirm highlighted matches" : "Ready to save"}</strong><small>Your original routine remains unchanged until you save.</small></div><button class="primary-btn" type="button" data-routine-save ${uncertain ? "disabled" : ""}>Save Routine</button></div></div>`;
}

function renderImportSummary() {
  let workingSets = 0;
  importState.days.forEach(day => day.exercises.forEach(item => {
    const sets = Number(item.sets || 0);
    workingSets += sets;
  }));
  const plan = { days: importState.days.map(day => ({ exercises: day.exercises.map(item => ({ id: item.match.exerciseId, sets: item.sets })) })) };
  const totals = getWeeklyPlanVolume(plan);
  const rows = [...totals.entries()]
    .filter(([, sets]) => Number(sets) > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([muscle, sets]) => `<div class="${sets > 20 ? "is-high" : ""}"><span>${escapeHtml(muscle)}</span><strong>${formatSetCredits(sets)}</strong></div>`)
    .join("");
  const longest = Math.max(0, ...importState.days.map(day => day.exercises.reduce((sum, item) => sum + Number(item.sets || 0), 0)));
  return `<section class="routine-import-summary"><div><span class="eyebrow">QUICK CHECK</span><h4>Imported structure</h4><p>${workingSets} weekly working sets · longest session about ${Math.round(longest * 3)}–${Math.round(longest * 4)} min</p><small>Muscle breakdown: Primary 1.0 · Secondary 0.5</small></div><div class="routine-import-volume">${rows}</div>${[...totals.values()].some(sets => sets > 20) ? `<p class="routine-import-volume-note">High weekly volume detected. You can still save, but consider reviewing the highlighted muscle groups.</p>` : ""}</section>`;
}

function renderDay(day, dayIndex) {
  return `<section class="routine-import-day"><div class="routine-import-day-head"><span class="eyebrow">DAY ${dayIndex + 1}</span><h4>${escapeHtml(day.name)}</h4></div><div class="routine-import-exercises">${day.exercises.map((item, exerciseIndex) => renderExercise(item, dayIndex, exerciseIndex)).join("")}</div></section>`;
}

function renderExercise(item, dayIndex, exerciseIndex) {
  const uncertain = !item.match.confirmed;
  const hasSuggestion = Boolean(item.match.exerciseId);
  const all = getAllExercises().slice().sort((a, b) => a.name.localeCompare(b.name));
  return `<article class="routine-import-exercise ${uncertain ? "needs-review" : ""}"><div class="routine-import-match"><div><strong>${escapeHtml(item.name)}</strong><small>${uncertain ? (hasSuggestion ? "Check this match" : "Choose an exercise") : "Matched"}</small></div><select data-routine-match data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Exercise match for ${escapeHtml(item.name)}">${hasSuggestion ? "" : `<option value="" selected disabled>Choose an exercise</option>`}${all.map(exercise => `<option value="${exercise.id}" ${exercise.id === item.match.exerciseId ? "selected" : ""}>${escapeHtml(exercise.name)}</option>`).join("")}</select>${uncertain && hasSuggestion ? `<button type="button" data-routine-confirm data-day="${dayIndex}" data-exercise="${exerciseIndex}">Use suggestion</button>` : ""}</div><div class="routine-import-fields"><label>Sets<input type="number" min="1" max="20" value="${item.sets}" data-routine-sets data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label><label>Reps<input type="text" maxlength="20" value="${escapeHtml(item.reps)}" data-routine-reps data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label><div class="routine-import-row-actions"><button type="button" data-routine-up data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Move exercise up">↑</button><button type="button" data-routine-down data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Move exercise down">↓</button><button type="button" data-routine-remove data-day="${dayIndex}" data-exercise="${exerciseIndex}">Remove</button></div></div>${item.notes ? `<p class="routine-import-note">${escapeHtml(item.notes)}</p>` : ""}</article>`;
}

function confirmMatch(button, page) {
  const item = findItem(button.dataset.day, button.dataset.exercise);
  if (!item?.match.exerciseId) return;
  item.match.confirmed = true;
  renderReview(page);
}

function removeExercise(button, page) {
  const dayIndex = Number(button.dataset.day);
  const exerciseIndex = Number(button.dataset.exercise);
  importState.days[dayIndex]?.exercises.splice(exerciseIndex, 1);
  importState.days = importState.days.filter(day => day.exercises.length);
  renderReview(page);
}

function moveExercise(button, page) {
  const dayIndex = Number(button.dataset.day);
  const exerciseIndex = Number(button.dataset.exercise);
  const list = importState.days[dayIndex]?.exercises;
  if (!list) return;
  const target = button.matches("[data-routine-up]") ? exerciseIndex - 1 : exerciseIndex + 1;
  if (target < 0 || target >= list.length) return;
  [list[exerciseIndex], list[target]] = [list[target], list[exerciseIndex]];
  renderReview(page);
}

function saveRoutine(button, page) {
  const name = String(importState.name || "Imported Routine").trim() || "Imported Routine";
  const plan = { id: `import-${Date.now()}`, name, days: importState.days.map(day => ({ name: day.name, exercises: day.exercises.map(item => ({ id: item.match.exerciseId, sets: item.sets, reps: item.reps })) })), importedRoutine: { version: 1, sourceUrl: null, originalText: importState.rawText, importedAt: new Date().toISOString() } };
  const plans = readPlans();
  plans.push(plan);
  localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
  button.disabled = true;
  button.textContent = "Saved ✓";
  window.setTimeout(() => { closeImporter(page); document.querySelector('.nav-btn[data-page="workout"]')?.click(); }, 250);
}

function findItem(dayIndex, exerciseIndex) { return importState?.days?.[Number(dayIndex)]?.exercises?.[Number(exerciseIndex)] || null; }
function suggestedName(days) { return days.length === 1 ? `${days[0].name} Routine` : `${days.length}-Day Imported Routine`; }
function updateCounter(page) { const text = page.querySelector("#routine-import-text")?.value || ""; const counter = page.querySelector("[data-routine-count]"); if (counter) counter.textContent = `${text.length.toLocaleString()} / 20,000`; }
function readPlans() { try { const value = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
