import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("More exposes one compact Learn Level Up entry", async () => {
    const source = await read("js/more/more-ui-v2.js");
    assert.match(source, /data-more-page="learn"/);
    assert.match(source, />Learn Level Up</);
    assert.match(source, /openLessonLibrary\(\)/);
});

test("walkthrough library covers the primary app workflows", async () => {
    const source = await read("js/more/learn-level-up.js");
    for (const lesson of ["getting-started", "build-plan", "log-workout", "progressive-overload", "log-food", "nutrition-goals", "read-progress", "cardio"]) {
        assert.match(source, new RegExp(`id: "${lesson}"`));
    }
    assert.match(source, /level_up_completed_lessons_v1/);
    assert.match(source, /data-open-lesson-feature/);
    assert.match(source, /nav-btn\[data-page=/);
});

test("walkthrough styling stays isolated from the rest of the app", async () => {
    const [source, styles] = await Promise.all([
        read("js/more/learn-level-up.js"),
        read("css/learn-level-up.css")
    ]);
    assert.match(source, /data-learn-level-up-styles/);
    assert.match(source, /css\/learn-level-up\.css\?v=learn-level-up-1/);
    assert.match(styles, /\.learn-lesson-list/);
    assert.match(styles, /\.learn-step-card/);
    assert.match(styles, /padding-bottom:112px/);
});
