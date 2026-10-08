import { openCustomExerciseForImport } from "./workouts.js?v=saved-plan-edit-2";
import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { parseRoutineText, suggestWorkoutType } from "./routine-import-parser.js?v=exercise-match-1";
import { formatSetCredits, getWeeklyPlanVolume } from "./plan-muscle-volume.js?v=plan-volume-shared-1";
import { extractSharedWorkoutCode, getSharedWorkoutStats, importSharedWorkoutPackage, resolveSharedWorkoutFromText } from "./workout-sharing.js?v=ios-share-workout-2";

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
let sourceVideo = null;

export function openRoutineFromVideo(video) {
  const page = document.querySelector(".workout-page");
  if (!page) return;
  initializeRoutineImporter();
  openImporter(page);
  sourceVideo = { id: video.id, title: video.title, url: video.url };
  page.querySelector("[data-routine-import-wizard]")?.classList.add("ig-routine-import");
  const top = page.querySelector(".routine-import-topbar");
  top.querySelector("h3").textContent = "Create routine from workout text";
  top.querySelector("p").textContent = `Paste the written exercises, sets and reps, or import a screenshot of the text from ${video.title}. Review the draft before saving. Your Instagram video will stay attached.`;
}


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
  ["css/routine-importer.css?v=launcher-grid-hotfix-1", "css/routine-importer-summary.css?v=routine-import-1"].forEach(href => {
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
  return `<div class="routine-import-paste-card"><label>Workout type<select data-routine-kind><option value="">Choose circuit or regular workout</option><option value="circuit">Circuit — repeat the exercise list each round</option><option value="regular">Regular workout — separate sets per exercise</option></select></label><p data-routine-type-hint></p><div data-routine-circuit-options hidden><label>Rounds<input type="number" min="1" max="20" data-routine-rounds placeholder="Number of rounds"></label><label>Rest between rounds (seconds)<input type="number" min="0" max="600" data-routine-rest value="0"></label></div><label for="routine-import-text">Routine text</label><textarea id="routine-import-text" maxlength="100000" placeholder="Paste a routine from ChatGPT or another source…&#10;&#10;Push Day&#10;Bench Press - 3x6-8&#10;Cable Fly - 3x12-15"></textarea><div class="routine-import-tools"><button class="secondary-btn" type="button" data-routine-paste>Paste from Clipboard</button><button class="routine-import-text-action" type="button" data-routine-example>Use example</button><button class="routine-import-text-action" type="button" data-routine-clear>Clear</button><small data-routine-count>0 / 100,000</small></div>${window.Capacitor?.getPlatform?.() === "ios" ? `<button type="button" class="secondary-btn" data-routine-screenshot>Or import screenshot of the text</button><p>Reads written exercises on your iPhone. Review the extracted text before building.</p>` : ""}<p class="routine-import-message" data-routine-message aria-live="polite"></p><button class="primary-btn routine-import-build" type="button" data-routine-build>Build Pasted Routine</button></div>`;
}

function handleClick(event, page) {
  const button = event.target.closest("button");
  if (!button || !page.contains(button)) return;
  if (button.matches("[data-routine-import-open]")) return openImporter(page);
  if (button.matches("[data-routine-import-close]")) return closeImporter(page);
  if (button.matches("[data-routine-example]")) return setPasteText(page, EXAMPLE);
  if (button.matches("[data-routine-clear]")) return setPasteText(page, "");
  if (button.matches("[data-routine-paste]")) return pasteClipboard(page);
  if (button.matches("[data-routine-screenshot]")) return importScreenshot(page, button);
  if (button.matches("[data-routine-build]")) return buildReview(page);
  if (button.matches("[data-routine-back]")) return showPaste(page);
  if (button.matches("[data-routine-create-custom]")) return createMissingExercise(button, page);
  if (button.matches("[data-routine-confirm]")) return confirmMatch(button, page);
  if (button.matches("[data-routine-remove]")) return removeExercise(button, page);
  if (button.matches("[data-routine-up], [data-routine-down]")) return moveExercise(button, page);
  if (button.matches("[data-routine-save-shared]")) return saveSharedRoutine(button, page);
  if (button.matches("[data-routine-save]")) return saveRoutine(button, page);
}

function handleChange(event, page) {
  if (event.target.matches("[data-routine-kind]")) { page.querySelector("[data-routine-circuit-options]").hidden = event.target.value !== "circuit"; return; }
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
  if (field.matches("[data-routine-sets]")) item.sets = field.value === "" ? null : Math.max(1, Math.min(20, Number(field.value)));
  else item.reps = field.value.trim();
  updateSaveEligibility(page);
}

function openImporter(page) {
  sourceVideo = null;
  page.querySelector("[data-routine-import-wizard]")?.classList.remove("ig-routine-import");
  const top = page.querySelector(".routine-import-topbar");
  if (top) { top.querySelector("h3").textContent = "Paste your routine"; top.querySelector("p").textContent = "Paste a written routine, then review everything before saving."; }
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
  sourceVideo = null;
}

function showPaste(page) {
  page.querySelector("[data-routine-import-stage]").innerHTML = renderPasteStage();
  if (importState) {
    const textarea = page.querySelector("#routine-import-text");
    if (textarea) textarea.value = importState.rawText || "";
    page.querySelector('[data-routine-kind]').value=importState.kind || '';
    page.querySelector('[data-routine-circuit-options]').hidden=importState.kind !== 'circuit';
    page.querySelector('[data-routine-rounds]').value=importState.rounds || '';
    page.querySelector('[data-routine-rest]').value=importState.rest || 0;
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

async function buildReview(page) {
  const text = page.querySelector("#routine-import-text")?.value.trim() || "";
  const message = page.querySelector("[data-routine-message]");
  if (!text) { if (message) message.textContent = "Paste a routine first."; return; }
  const sharedCode = extractSharedWorkoutCode(text);
  try {
    const sharedPackage = await resolveSharedWorkoutFromText(text);
    if (sharedPackage) {
      importState = { rawText: text, sharedPackage };
      renderSharedWorkoutReview(page);
      return;
    }
  }
  catch (error) {
    console.error("Shared workout lookup failed:", error);
    if (sharedCode) {
      if (message) message.textContent = "That shared Level Up workout could not be loaded. Check your connection and try again.";
      return;
    }
  }
  const kind = page.querySelector('[data-routine-kind]')?.value;
  if (!kind) { if(message) message.textContent = 'Choose Circuit or Regular workout before building.'; return; }
  const rounds = Number(page.querySelector('[data-routine-rounds]')?.value);
  const rest = Number(page.querySelector('[data-routine-rest]')?.value || 0);
  if (kind === 'circuit' && (!Number.isInteger(rounds) || rounds < 1 || rounds > 20 || !Number.isFinite(rest) || rest < 0 || rest > 600)) { if(message) message.textContent = 'Enter 1–20 rounds and 0–600 seconds of rest.'; return; }
  const parsed = parseRoutineText(text, {allowExerciseLists:true});
  if (kind === 'circuit') parsed.days = [{name:'Circuit',exercises:parsed.days.flatMap(day=>day.exercises).map(item=>({...item,sets:rounds}))}].filter(day=>day.exercises.length);
  if (!parsed.days.length) { if (message) message.textContent = "No exercises were recognized. Put each exercise on its own line, such as Goblet Squat or Bench Press - 3x8-12."; return; }
  importState = { name: sourceVideo?.title || suggestedName(parsed.days), rawText: text, kind, rounds:kind === "circuit" ? rounds : null, rest, days: parsed.days, skipped: parsed.skipped };
  renderReview(page);
}

function renderSharedWorkoutReview(page) {
  const stage = page.querySelector("[data-routine-import-stage]");
  const packageValue = importState?.sharedPackage;
  if (!stage || !packageValue) return;
  const plan = packageValue.plan;
  const stats = getSharedWorkoutStats(packageValue);
  stage.innerHTML = `<div class="routine-import-review">
    <div class="routine-import-review-head">
      <div><span class="eyebrow">SHARED WORKOUT</span><h3>${escapeHtml(plan.name)}</h3><p>This is a Level Up workout package. Its template settings will be preserved when you add it.</p></div>
      <button class="secondary-btn" type="button" data-routine-back>← Back</button>
    </div>
    <div class="routine-import-summary">
      <div><span class="eyebrow">WORKOUT SUMMARY</span><h4>${stats.days} days · ${stats.exercises} exercises</h4><p>${stats.workingSets} weekly working sets</p><small>Personal workout history, PRs and previous loads are not included.</small></div>
    </div>
    <div class="routine-import-days">
      ${plan.days.map((day, dayIndex) => `<section class="routine-import-day"><div class="routine-import-day-head"><span class="eyebrow">DAY ${dayIndex + 1}</span><h4>${escapeHtml(day.name)}</h4></div><div class="routine-import-exercises">${day.exercises.map(item => `<article class="routine-import-exercise"><div class="routine-import-match"><div><strong>${escapeHtml(getAllExercises().find(exercise => exercise.id === item.id)?.name || packageValue.customExercises?.find(exercise => exercise.id === item.id)?.name || item.id)}</strong><small>${Number(item.sets) || 0} sets${item.reps ? ` · ${escapeHtml(item.reps)} reps` : ""}</small></div></div></article>`).join("")}</div></section>`).join("")}
    </div>
    <div class="routine-import-savebar">
      <div><strong>Ready to add</strong><small>An independent copy will be added to My Workouts.</small></div>
      <button class="primary-btn" type="button" data-routine-save-shared>Add to My Workouts</button>
    </div>
  </div>`;
}

function saveSharedRoutine(button, page) {
  const packageValue = importState?.sharedPackage;
  if (!packageValue) return;
  try {
    button.disabled = true;
    const imported = importSharedWorkoutPackage(packageValue);
    button.textContent = "Added ✓";
    window.setTimeout(() => {
      closeImporter(page);
      document.querySelector('.nav-btn[data-page="workout"]')?.click();
      window.setTimeout(() => {
        document.querySelector(`[data-custom-plan-id="${imported.id}"]`)?.click();
      }, 140);
    }, 220);
  }
  catch (error) {
    console.error("Shared workout import failed:", error);
    button.disabled = false;
    button.textContent = "Could not add workout";
  }
}

function renderReview(page) {
  const stage = page.querySelector("[data-routine-import-stage]");
  const total = importState.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const uncertain = importState.days.flatMap(day => day.exercises).filter(item => !item.match.confirmed).length;
  const incomplete = !canSaveImport();
  stage.innerHTML = `<div class="routine-import-review"><div class="routine-import-review-head"><div><span class="eyebrow">IMPORT REVIEW</span><h3>${importState.days.length} days · ${total} exercises</h3><p>${uncertain ? `${uncertain} match${uncertain === 1 ? "" : "es"} need your confirmation.` : (incomplete ? "Add sets and rep targets to the regular workout." : "Everything is ready to save.")}</p></div><button class="secondary-btn" type="button" data-routine-back>← Edit Paste</button></div><label class="routine-import-name">Routine name<input type="text" maxlength="80" value="${escapeHtml(importState.name)}" data-routine-name></label>${importState.skipped.length ? `<div class="routine-import-skipped"><strong>${importState.skipped.length} line${importState.skipped.length === 1 ? " was" : "s were"} not imported</strong><small>Headers, notes, and progression instructions are kept in the original import text.</small></div>` : ""}<div class="routine-import-days">${importState.days.map(renderDay).join("")}</div>${renderImportSummary()}<div class="routine-import-savebar"><div><strong>${uncertain ? "Confirm highlighted matches" : incomplete ? "Add missing sets and rep targets" : "Ready to save"}</strong><small>Your original routine remains unchanged until you save.</small></div><button class="primary-btn" type="button" data-routine-save ${incomplete ? "disabled" : ""}>Save to My Routines</button></div></div>`;
}

function renderImportSummary() {
  if(importState.kind === 'circuit')return `<section class="routine-import-summary"><h4>Circuit · ${importState.rounds} rounds</h4><p>${importState.days.flatMap(d=>d.exercises).length} exercises per round · ${importState.rest} seconds rest between rounds</p><small>Rep targets are optional. Repeat the exercise list each round.</small></section>`;
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
  return `<article class="routine-import-exercise ${uncertain ? "needs-review" : ""}"><div class="routine-import-match"><div><strong>${escapeHtml(item.name)}</strong><small>${uncertain ? (hasSuggestion ? "Check this match" : "Choose an exercise") : "Matched"}</small></div><select data-routine-match data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Exercise match for ${escapeHtml(item.name)}">${hasSuggestion ? "" : `<option value="" selected disabled>Choose an exercise</option>`}${all.map(exercise => `<option value="${exercise.id}" ${exercise.id === item.match.exerciseId ? "selected" : ""}>${escapeHtml(exercise.name)}</option>`).join("")}</select>${uncertain && hasSuggestion ? `<button type="button" data-routine-confirm data-day="${dayIndex}" data-exercise="${exerciseIndex}">Use suggestion</button>` : ""}</div><button type="button" class="secondary-btn" data-routine-create-custom data-day="${dayIndex}" data-exercise="${exerciseIndex}">Create new exercise</button><div class="routine-import-fields"><label>${importState.kind === "circuit" ? "Rounds" : "Sets"}<input ${importState.kind === "circuit" ? "readonly" : ""} type="number" min="1" max="20" value="${item.sets ?? ""}" data-routine-sets data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label><label>${importState.kind === "circuit" ? "Reps / seconds (optional)" : "Rep target"}<input type="text" maxlength="20" value="${escapeHtml(item.reps)}" data-routine-reps data-day="${dayIndex}" data-exercise="${exerciseIndex}"></label><div class="routine-import-row-actions"><button type="button" data-routine-up data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Move exercise up">↑</button><button type="button" data-routine-down data-day="${dayIndex}" data-exercise="${exerciseIndex}" aria-label="Move exercise down">↓</button><button type="button" data-routine-remove data-day="${dayIndex}" data-exercise="${exerciseIndex}">Remove</button></div></div>${item.notes ? `<p class="routine-import-note">${escapeHtml(item.notes)}</p>` : ""}</article>`;
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
  const plan = { id: `import-${Date.now()}`, name, days: importState.days.map(day => ({ name: day.name, exercises: day.exercises.map(item => ({ id: item.match.exerciseId, sets: item.sets, reps: item.reps })) })), importedRoutine: { version: 1, sourceUrl: sourceVideo?.url || null, originalText: importState.rawText, importedAt: new Date().toISOString() } };
  if (sourceVideo) { plan.sourceVideo = { ...sourceVideo }; plan.sourceType = "instagram"; plan.savedAt = new Date().toISOString(); }
  if (!canSaveImport()) return;
  if (importState.kind === 'circuit') {
    plan.id = `level-up-circuit-import-${Date.now()}`;
    Object.assign(plan,{circuitId:plan.id,trainingContext:'circuit',trainingType:'circuit',catalogueCategory:'circuit',rounds:importState.rounds,circuitRestSeconds:importState.rest,daysPerWeek:1});
    for(const day of plan.days) for(const exercise of day.exercises) Object.assign(exercise,{sets:plan.rounds,trainingContext:'circuit',circuitId:plan.id,supersetGroup:plan.id});
  }
  plan.savedAt = new Date().toISOString();
  const plans = readPlans();
  plans.push(plan);
  localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
  sessionStorage.setItem("level_up_open_my_routines_v1", "1");
  button.disabled = true;
  button.textContent = "Saved ✓";
  window.setTimeout(() => { closeImporter(page); document.dispatchEvent(new CustomEvent("levelup:routine-saved", { detail: { planId: plan.id } })); }, 250);
}

function findItem(dayIndex, exerciseIndex) { return importState?.days?.[Number(dayIndex)]?.exercises?.[Number(exerciseIndex)] || null; }
function suggestedName(days) { return days.length === 1 ? `${days[0].name} Routine` : `${days.length}-Day Imported Routine`; }
function updateCounter(page) { updateImportTypeHint(page); const text = page.querySelector("#routine-import-text")?.value || ""; const counter = page.querySelector("[data-routine-count]"); if (counter) counter.textContent = `${text.length.toLocaleString()} / 100,000`; }
function readPlans() { try { const value = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }

async function importScreenshot(page, button) {
  const message = page.querySelector('[data-routine-message]');
  button.disabled = true;
  try {
    const result = await window.Capacitor.Plugins.LevelUpInstagramShare.readWorkoutScreenshot();
    if (result.cancelled || page.querySelector('[data-routine-import-wizard]')?.hidden) return;
    if (!result.text?.trim()) throw new Error('No text found. Choose a clear screenshot of the written routine.');
    const existing = page.querySelector('#routine-import-text')?.value?.trim();
    setPasteText(page, [existing, result.text].filter(Boolean).join('\n\n'));
    if (message) message.textContent = 'Screenshot text added. Correct anything unclear, then tap Build Pasted Routine.';
  } catch (e) { if (message) message.textContent = e.message || 'Could not read this screenshot.'; }
  finally { button.disabled = false; }
}

function canSaveImport() {
 const rows=importState?.days?.flatMap(day=>day.exercises) || [];
 return rows.length > 0 && rows.every(item=>item.match.confirmed && item.match.exerciseId && (importState.kind === 'circuit' || (Number.isInteger(item.sets) && item.sets > 0 && String(item.reps || '').trim())));
}
function updateSaveEligibility(page) { const b=page.querySelector('[data-routine-save]'); if(b)b.disabled=!canSaveImport(); }
function createMissingExercise(button,page) {
 const item=findItem(button.dataset.day,button.dataset.exercise);
 if(!item)return;
 openCustomExerciseForImport({name:item.name,onSave:exercise=>{
   item.match={exerciseId:exercise.id,exerciseName:exercise.name,confirmed:true,confidence:1,alternatives:[]};
   if(importState.kind!=='circuit'){item.sets=item.sets || exercise.defaultSets;item.reps=item.reps || exercise.recommendedReps;}
   renderReview(page);
 }});
}
function updateImportTypeHint(page) {
 const text=page.querySelector('#routine-import-text')?.value || '';
 const hint=page.querySelector('[data-routine-type-hint]');
 const rounds=page.querySelector('[data-routine-rounds]');const roundMatch=text.match(/\b(\d+)\s*rounds?\b/i);if(rounds && !rounds.value && roundMatch)rounds.value=Math.min(20,Math.max(1,Number(roundMatch[1])));
 if(hint)hint.textContent=suggestWorkoutType(text)==='circuit'?'This looks like a circuit. Confirm the workout type above.':'An exercise list can be either type. Choose the format you want.';
}
