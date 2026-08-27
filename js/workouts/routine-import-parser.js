import "./exercise-library-expansion.js?v=exercise-library-expansion-1";
import { getAllExercises } from "./exercise-library.js?v=exercise-library-catalogue-2";

const DAY_PATTERN = /^(?:(?:day|workout|session)\s*\d+\s*[:\-–—]?\s*)?(push|pull|legs?|upper|lower|chest|back|shoulders?|arms?|full\s*body|rest)(?:\s*(?:day|workout))?\s*[:\-–—]?$/i;
const NUMBERED_DAY_PATTERN = /^(?:day|workout|session)\s*(\d+)\s*[:\-–—]\s*(.+)$/i;
const BARE_NUMBERED_DAY_PATTERN = /^(?:day|workout|session)\s*(\d+)\s*[:\-–—]?$/i;

export function parseRoutineText(text) {
  const lines = String(text || "").split(/(?:\r\n|[\n\r\u2028\u2029])/).flatMap(expandLine).map(cleanLine).filter(Boolean);
  const days = [];
  let current = null;
  const skipped = [];

  for (const line of lines) {
    const heading = parseDayHeading(line);
    if (heading) {
      current = { name: heading, exercises: [] };
      days.push(current);
      continue;
    }
    const parsed = parseExerciseLine(line);
    if (!parsed) { skipped.push(line); continue; }
    if (!current) {
      current = { name: "Workout 1", exercises: [] };
      days.push(current);
    }
    current.exercises.push({ ...parsed, match: matchExerciseName(parsed.name) });
  }

  return { days: days.filter(day => day.exercises.length), skipped };
}

export function parseExerciseLine(line) {
  const cleaned = cleanLine(line);
  const patterns = [
    /^(.*?)\s*(?:[-–—:|])\s*(\d+)\s*[x×]\s*(\d+(?:\s*[-–—]\s*\d+)?(?:\+)?)(?:\s*(?:reps?))?(.*)$/i,
    /^(.*?)\s+(\d+)\s*[x×]\s*(\d+(?:\s*[-–—]\s*\d+)?(?:\+)?)(?:\s*(?:reps?))?(.*)$/i,
    /^(.*?)\s*(?:[-–—:|])?\s*(\d+)\s*sets?\s*(?:of|x|×)?\s*(\d+(?:\s*[-–—]\s*\d+)?(?:\+)?)(?:\s*reps?)?(.*)$/i,
    /^(\d+)\s*[x×]\s*(\d+(?:\s*[-–—]\s*\d+)?(?:\+)?)\s+(.+)$/i
  ];
  for (let index = 0; index < patterns.length; index += 1) {
    const match = cleaned.match(patterns[index]);
    if (!match) continue;
    const reverse = index === patterns.length - 1;
    const name = reverse ? match[3] : match[1];
    const sets = Number(reverse ? match[1] : match[2]);
    const reps = normalizeReps(reverse ? match[2] : match[3]);
    const notes = reverse ? "" : String(match[4] || "").replace(/^\s*[-–—,;]\s*/, "").trim();
    if (!name || sets < 1 || sets > 20 || !reps) return null;
    return { name: name.trim(), sets, reps, notes };
  }
  return null;
}

export function matchExerciseName(input, catalogue = getAllExercises()) {
  const normalizedInput = normalizeExerciseName(input);
  const scored = catalogue.map(exercise => ({ exercise, score: similarity(normalizedInput, normalizeExerciseName(exercise.name)) }))
    .sort((left, right) => right.score - left.score || left.exercise.name.localeCompare(right.exercise.name));
  const best = scored[0] || null;
  return {
    exerciseId: best?.exercise.id || null,
    exerciseName: best?.exercise.name || input,
    confidence: best?.score || 0,
    confirmed: Boolean(best && best.score >= 0.84),
    alternatives: scored.slice(0, 5).map(item => ({ id: item.exercise.id, name: item.exercise.name, score: item.score }))
  };
}

export function normalizeExerciseName(value) {
  return String(value || "").toLowerCase()
    .replace(/\bdb\b/g, "dumbbell").replace(/\bbb\b/g, "barbell")
    .replace(/\bohp\b/g, "overhead press").replace(/\brdl\b/g, "romanian deadlift")
    .replace(/pulldowns?/g, "pulldown").replace(/pushdowns?/g, "pushdown")
    .replace(/flyes|flys/g, "fly").replace(/curls/g, "curl").replace(/raises/g, "raise")
    .replace(/presses/g, "press").replace(/rows/g, "row").replace(/extensions/g, "extension")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function similarity(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return Math.min(0.94, 0.78 + Math.min(left.length, right.length) / Math.max(left.length, right.length) * 0.16);
  const a = new Set(left.split(" "));
  const b = new Set(right.split(" "));
  const overlap = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size || 1;
  const tokenScore = overlap / union;
  const prefix = left.split(" ")[0] === right.split(" ")[0] ? 0.12 : 0;
  return Math.min(0.95, tokenScore * 0.88 + prefix);
}

function parseDayHeading(line) {
  const numbered = line.match(NUMBERED_DAY_PATTERN);
  if (numbered && !/\d+\s*[x×]/i.test(line)) return `Day ${numbered[1]} — ${titleCase(numbered[2])}`;
  const bareNumbered = line.match(BARE_NUMBERED_DAY_PATTERN);
  if (bareNumbered) return `Day ${bareNumbered[1]}`;
  const simple = line.match(DAY_PATTERN);
  return simple ? titleCase(simple[1]) : null;
}

function cleanLine(line) {
  return String(line || "").trim().replace(/^#{1,6}\s*/, "").replace(/^(?:[-*•·]|\d+[.)])\s+/, "").trim();
}

function expandLine(line) {
  const value = String(line || "").trim();
  if (!value) return [];
  const slashExercises = [];
  const slashPattern = /(?:^|\s)([^/]+?)\s*\/\s*(\d+)\s*[x×]\s*(\d+(?:\s*[-–—]\s*\d+)?(?:\+)?)/gi;
  let match;
  while ((match = slashPattern.exec(value))) slashExercises.push(`${match[1].trim()} - ${match[2]}x${match[3]}`);
  if (slashExercises.length >= 2) return slashExercises;

  const inlineExercises = [];
  const inlinePattern = /(.*?)\s+(?:[-–—:|]\s*)?(\d+)\s*[x×]\s*(\d+(?:\s*[-–—]\s*\d+)?(?:\+)?)(?:\s*reps?)?/gi;
  while ((match = inlinePattern.exec(value))) {
    const name = cleanInlineExerciseName(match[1]);
    if (name) inlineExercises.push(`${name} - ${match[2]}x${match[3]}`);
  }
  return inlineExercises.length >= 2 ? inlineExercises : [value];
}

function cleanInlineExerciseName(value) {
  return String(value || "").trim()
    .replace(/^[,;|\-–—]+\s*/, "")
    .replace(/^\d+(?:\.\d+)?\s*(?:RIR|RPE)\b\s*[,;|\-–—]*\s*/i, "")
    .trim();
}

function normalizeReps(value) {
  return String(value || "").replace(/[–—]/g, "-").replace(/\s+/g, "").trim();
}

function titleCase(value) {
  return String(value || "").trim().replace(/\b\w/g, character => character.toUpperCase());
}
