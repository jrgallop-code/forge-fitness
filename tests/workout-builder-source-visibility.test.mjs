import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("personalized workout UI does not reveal its adapted-from source", async () => {
  const [builder, details] = await Promise.all([
    read("js/workouts/smart-build.js"),
    read("js/workouts/workout-plan-details.js")
  ]);

  const result = builder.slice(builder.indexOf("function renderResultStep"), builder.indexOf("function renderExerciseRow"));
  const detail = details.slice(details.indexOf("function showPlanDetails"), details.indexOf("function closePlanDetails"));

  assert.doesNotMatch(result, /BASE TEMPLATE|View original program structure|Try Another Template/);
  assert.doesNotMatch(detail, /ADAPTED FROM|plan-adapted-source|adaptedFrom/);
  assert.match(detail, /type === "template" && plan\?\.sourceUrl/);
});
