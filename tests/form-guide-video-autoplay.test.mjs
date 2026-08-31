import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("form guide demonstrations autoplay silently without visible controls", () => {
    const source = readFileSync("js/workouts/exercise-guide-videos.js", "utf8");

    assert.match(source, /video\.muted = true/);
    assert.match(source, /video\.loop = true/);
    assert.match(source, /video\.autoplay = true/);
    assert.match(source, /video\.playsInline = true/);
    assert.match(source, /video\.controls = false/);
    assert.match(source, /video\.removeAttribute\("controls"\)/);
    assert.match(source, /video\.setAttribute\("webkit-playsinline"/);
    assert.match(source, /video\.setAttribute\("disablepictureinpicture"/);
    assert.match(source, /webkit-media-controls-start-playback-button/);
});

test("form guide demonstrations resume after guide and app visibility changes", () => {
    const source = readFileSync("js/workouts/exercise-guide-videos.js", "utf8");

    assert.match(source, /video\.addEventListener\("canplay", resumePlayback\)/);
    assert.match(source, /if \(video\?\.paused\) void video\.play\(\)\.catch/);
    assert.match(source, /document\.addEventListener\("visibilitychange"/);
});
