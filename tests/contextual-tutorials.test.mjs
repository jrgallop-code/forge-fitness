import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("tutorial registry persists dismiss, resume, restart and completion states", async () => {
    const source = await read("js/core/tutorials.js");
    const values = new Map();
    globalThis.localStorage = {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value))
    };

    try {
        const registry = await import(`data:text/javascript,${encodeURIComponent(source)}`);
        assert.equal(registry.getTutorial("expenditure").steps.length, 6);
        assert.deepEqual(registry.getTutorialState("expenditure"), { status: "not-started", step: 0 });
        assert.equal(registry.shouldShowTutorial("expenditure"), true);

        registry.setTutorialStep("expenditure", 3);
        assert.deepEqual(registry.getTutorialState("expenditure"), { status: "active", step: 3 });

        registry.dismissTutorial("expenditure", 3);
        assert.deepEqual(registry.getTutorialState("expenditure"), { status: "dismissed", step: 3 });
        assert.equal(registry.shouldShowTutorial("expenditure"), false);

        registry.restartTutorial("expenditure");
        assert.deepEqual(registry.getTutorialState("expenditure"), { status: "active", step: 0 });
        assert.equal(registry.shouldShowTutorial("expenditure"), true);

        registry.completeTutorial("expenditure");
        assert.deepEqual(registry.getTutorialState("expenditure"), { status: "completed", step: 5 });
        assert.equal(registry.shouldShowTutorial("expenditure"), false);
    } finally {
        delete globalThis.localStorage;
    }
});

test("Nutrition Progress provides a persistent clickable TDEE tutorial", async () => {
    const [controller, styles, registry] = await Promise.all([
        read("js/nutrition/tdee-tutorial-controller.js"),
        read("css/calorie-stats.css"),
        read("js/core/tutorials.js")
    ]);

    assert.match(controller, /How TDEE works/);
    assert.match(controller, /data-tdee-tutorial-launch/);
    assert.match(controller, /data-tdee-tutorial-previous/);
    assert.match(controller, /data-tdee-tutorial-next/);
    assert.match(controller, /data-tdee-tutorial-close/);
    assert.match(controller, /restartTutorial\(TUTORIAL_ID\)/);
    assert.match(controller, /completeTutorial\(TUTORIAL_ID\)/);
    assert.match(controller, /pointer-events: auto !important/);
    assert.match(registry, /TDEE uses your smoothed Weekly Trend/);
    assert.match(registry, /TDEE can update each day/);
    assert.match(registry, /WEEKLY CALORIE REVIEW/);
    assert.match(styles, /\.expenditure-tutorial-card/);
    assert.match(styles, /\.expenditure-tutorial-progress/);
});

test("More can restart the contextual tutorial at its Nutrition Progress destination", async () => {
    const [more, learn] = await Promise.all([
        read("js/more/more-ui-v2.js"),
        read("js/more/learn-level-up.js")
    ]);

    assert.match(more, />Tutorials</);
    assert.match(learn, /Restart in-app tutorials/);
    assert.match(learn, /restartTutorial\(tutorial\.id\)/);
    assert.match(learn, /document\.getElementById\(tutorial\.tab\)\?\.click\(\)/);
    assert.match(learn, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
});
