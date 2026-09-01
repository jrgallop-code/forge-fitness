import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/ios-capacitor.yml", import.meta.url), "utf8");

test("iOS cloud builds use the free standard macOS 26 runner", () => {
    assert.match(workflow, /runs-on:\s*macos-26/);
    assert.doesNotMatch(workflow, /macos-26-(?:large|xlarge)/);
    assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
});

test("iOS cloud builds sync Capacitor before compiling without signing", () => {
    const sync = workflow.indexOf("npm run cap:sync:ios");
    const compile = workflow.indexOf("Compile unsigned iOS Simulator app");
    assert.ok(sync >= 0 && compile > sync);
    assert.match(workflow, /CODE_SIGNING_ALLOWED=NO/);
    assert.match(workflow, /generic\/platform=iOS Simulator/);
});

test("the public validation workflow never references Apple secrets", () => {
    assert.doesNotMatch(workflow, /secrets\./);
    assert.doesNotMatch(workflow, /authenticationKey|provisioning|certificate/i);
});
