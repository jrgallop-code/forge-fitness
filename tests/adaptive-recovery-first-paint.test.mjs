import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const session = readFileSync("js/workouts/workout-session.js", "utf8");
const guidance = readFileSync("js/workouts/adaptive-guidance.js", "utf8");
const styles = readFileSync("css/adaptive-guidance.css", "utf8");

test("a required recovery check gates the logger before its exercise markup paints", () => {
    const gate = session.indexOf('logger.classList.toggle("adaptive-recovery-pending", recoveryCheckPending)');
    const exerciseMarkup = session.indexOf("container.innerHTML = `");
    assert.ok(gate >= 0);
    assert.ok(exerciseMarkup > gate);
    assert.match(session, /getAdaptiveGuidanceSettings\(\)\.enabled/);
    assert.match(session, /!session\?\.adaptiveGuidance\?\.recoveryCompleted/);
    assert.match(session, /!session\?\.adaptiveGuidance\?\.isDeload/);
    assert.match(session, /!getDeloadPreviewRequest\(\)/);
    assert.match(styles, /\.workout-session-logger\.adaptive-recovery-pending\s*\{[^}]*visibility:\s*hidden/s);
});

test("the recovery check mounts synchronously from the workout-rendered signal", () => {
    assert.match(session, /dispatchEvent\(new CustomEvent\("levelup:workout-session-rendered"/);
    const listener = guidance.match(/document\.addEventListener\("levelup:workout-session-rendered", event => \{[\s\S]*?\n\}\);/)?.[0] || "";
    assert.match(listener, /enhanceLogger\(logger\);/);
    assert.doesNotMatch(listener, /setTimeout/);
});

test("the first-paint gate is released after recovery UI mounts and has a safety fallback", () => {
    const mount = guidance.indexOf("renderRecoveryCheck(logger, readActive() || active)");
    const release = guidance.indexOf('logger.classList.remove("adaptive-recovery-pending")', mount);
    assert.ok(mount >= 0);
    assert.ok(release > mount);
    assert.match(session, /setTimeout\(\(\) => logger\.classList\.remove\("adaptive-recovery-pending"\), 1000\)/);
});
