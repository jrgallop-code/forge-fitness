import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { applyAdaptiveFeedbackEdits } from "../js/workouts/adaptive-guidance-feedback.js";

const guidanceUi = fs.readFileSync("js/workouts/adaptive-guidance.js", "utf8");
const themeStyles = fs.readFileSync("css/theme-surface-audit.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");

test("submitted feedback edits replace survey answers without changing workout data", () => {
    const session = {
        id: "session-1",
        exercises: [{ exerciseId: "row", sets: [{ reps: 10, completed: true }] }],
        adaptiveGuidance: {
            recovery: { Back: { status: "fatigued", previousSessionId: "prior-1", recordedAt: "2026-09-01T10:00:00.000Z" } },
            difficulty: "too-hard",
            discomfort: "significant",
            discomfortExerciseId: "row",
            recommendations: [{ id: "old", type: "hold" }]
        }
    };
    const edited = applyAdaptiveFeedbackEdits(session, {
        recovery: { Back: "ready" },
        difficulty: "right",
        discomfort: "none",
        discomfortExerciseId: "row"
    }, "2026-09-01T12:00:00.000Z");

    assert.deepEqual(edited.exercises, session.exercises);
    assert.equal(edited.adaptiveGuidance.recovery.Back.status, "ready");
    assert.equal(edited.adaptiveGuidance.recovery.Back.previousSessionId, "prior-1");
    assert.equal(edited.adaptiveGuidance.difficulty, "right");
    assert.equal(edited.adaptiveGuidance.discomfort, "none");
    assert.equal(edited.adaptiveGuidance.discomfortExerciseId, null);
    assert.equal(edited.adaptiveGuidance.feedbackEditedAt, "2026-09-01T12:00:00.000Z");
});

test("completed recap exposes a prefilled editor and recalculates recommendations", () => {
    assert.match(guidanceUi, /data-adaptive-edit-feedback/);
    assert.match(guidanceUi, /data-adaptive-edit-recovery-status/);
    assert.match(guidanceUi, /data-adaptive-edit-difficulty/);
    assert.match(guidanceUi, /data-adaptive-edit-discomfort/);
    assert.match(guidanceUi, /data-adaptive-save-feedback/);
    assert.match(guidanceUi, /buildAdaptiveRecommendations\(\{/);
    assert.match(guidanceUi, /levelup:adaptive-feedback-updated/);
});

test("recap contrast stays legible across appearance themes", () => {
    assert.match(themeStyles, /\.workout-complete-recap__insight p\s*\{[\s\S]*color:\s*var\(--text\)\s*!important/);
    assert.match(themeStyles, /\.workout-complete-recap__levelup-title strong/);
    assert.match(themeStyles, /\.workout-complete-recap__win b/);
    assert.match(themeStyles, /color:\s*#fff\s*!important/);
    assert.match(themeStyles, /\.adaptive-feedback-edit-button/);
});

test("feedback editor assets are cache-busted", () => {
    assert.match(html, /adaptive-guidance\.css\?v=adaptive-feedback-edit-1/);
    assert.match(html, /theme-surface-audit\.css\?v=theme-surface-audit-11/);
    assert.match(html, /adaptive-guidance\.js\?v=adaptive-feedback-edit-1/);
});
