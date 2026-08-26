import test from "node:test";
import assert from "node:assert/strict";

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}

globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = memoryStorage();
globalThis.CustomEvent = class CustomEvent {
    constructor(type) { this.type = type; }
};
globalThis.window = { dispatchEvent() {} };

const {
    beginDeloadWorkoutPreview,
    endDeloadWorkoutPreview,
    getDeloadPreviewRequest
} = await import("../js/more/adaptive-guidance-settings.js");

test("deload preview restores an active workout exactly", () => {
    const original = JSON.stringify({
        id: "active-1",
        status: "in_progress",
        exercises: [{ sets: [{ weight: 100, reps: 10 }] }]
    });
    localStorage.setItem("level_up_active_workout", original);

    assert.equal(beginDeloadWorkoutPreview(), true);
    assert.equal(getDeloadPreviewRequest().originalActiveSerialized, original);

    localStorage.setItem("level_up_active_workout", JSON.stringify({ id: "changed-in-preview" }));
    assert.equal(endDeloadWorkoutPreview(), true);
    assert.equal(localStorage.getItem("level_up_active_workout"), original);
    assert.equal(getDeloadPreviewRequest(), null);
});

test("deload preview removes a temporary workout when none existed before", () => {
    localStorage.removeItem("level_up_active_workout");

    assert.equal(beginDeloadWorkoutPreview(), true);
    localStorage.setItem("level_up_active_workout", JSON.stringify({ id: "preview-only" }));
    assert.equal(endDeloadWorkoutPreview(), true);
    assert.equal(localStorage.getItem("level_up_active_workout"), null);
});
