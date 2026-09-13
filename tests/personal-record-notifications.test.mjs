import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { addEventListener() {}, setTimeout() {} };
globalThis.document = {
    readyState: "complete",
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { dataset: {}, style: { setProperty() {} }, classList: { toggle() {} } },
    body: { classList: { add() {}, remove() {} } }
};
Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
globalThis.Node = { ELEMENT_NODE: 1, DOCUMENT_NODE: 9, DOCUMENT_FRAGMENT_NODE: 11 };
globalThis.MutationObserver = class { observe() {} };
globalThis.location = { search: "", href: "https://example.test/" };
globalThis.history = { state: null, replaceState() {} };
globalThis.localStorage = { getItem() { return null; }, setItem() {} };

const { buildPersonalRecordNotification } = await import("../js/notifications/personal-record-notification-model.js");
const set = (weight, reps) => ({ weight, reps, completed: true });
const session = (id, exercises) => ({ id, completedAt: `2026-09-${id}T12:00:00Z`, exercises });

test("combines all personal records from a workout into one notification", () => {
    const history = [session("01", [
        { exerciseId: "bench", exerciseName: "Bench Press", sets: [set(100, 5)] },
        { exerciseId: "curl", exerciseName: "Cable Curl", sets: [set(20, 10)] }
    ])];
    const current = session("02", [
        { exerciseId: "bench", exerciseName: "Bench Press", sets: [set(105, 5)] },
        { exerciseId: "curl", exerciseName: "Cable Curl", sets: [set(22.5, 10)] }
    ]);
    const result = buildPersonalRecordNotification(current, history);
    assert.equal(result.title, "🏆 2 new personal records!");
    assert.match(result.body, /Bench Press, Cable Curl/);
});

test("does not call a first-ever exercise result a personal record", () => {
    assert.equal(buildPersonalRecordNotification(session("01", [
        { exerciseId: "bench", exerciseName: "Bench Press", sets: [set(100, 5)] }
    ]), []), null);
});
