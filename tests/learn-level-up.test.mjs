import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("More exposes one compact Tutorials entry", async () => {
    const source = await read("js/more/more-ui-v2.js");
    assert.match(source, /data-more-page="learn"/);
    assert.match(source, />Tutorials</);
    assert.match(source, /openLessonLibrary\(\)/);
});

test("walkthrough library covers the primary app workflows", async () => {
    const source = await read("js/more/learn-level-up.js");
    for (const lesson of ["getting-started", "build-plan", "log-workout", "progressive-overload", "log-food", "nutrition-goals", "read-progress", "cardio"]) {
        assert.match(source, new RegExp(`id: "${lesson}"`));
    }
    assert.match(source, /level_up_completed_lessons_v1/);
    assert.match(source, /data-open-lesson-feature/);
    assert.match(source, /CONTEXTUAL_TUTORIALS/);
    assert.match(source, /data-contextual-tutorial/);
    assert.match(source, /restartTutorial\(tutorial\.id\)/);
    assert.match(source, /In-app tutorials/);
    assert.match(source, /nav-btn\[data-page=/);
    assert.match(source, /WHERE TO FIND IT/);
    assert.match(source, /Bottom bar → Nutrition → Food Log/);
    assert.match(source, /Bottom bar → Progress → Lifting → Exercises/);
    assert.match(source, /Program result → bottom → Save Plan/);
});

test("walkthrough styling stays isolated from the rest of the app", async () => {
    const [source, styles] = await Promise.all([
        read("js/more/learn-level-up.js"),
        read("css/learn-level-up.css")
    ]);
    assert.match(source, /data-learn-level-up-styles/);
    assert.match(source, /css\/learn-level-up\.css\?v=macro-breakdown-only-1/);
    assert.match(styles, /\.learn-lesson-list/);
    assert.match(styles, /\.learn-contextual-section/);
    assert.match(styles, /\.learn-step-card/);
    assert.match(styles, /\.learn-step-location/);
    assert.match(styles, /padding-bottom:112px/);
});
