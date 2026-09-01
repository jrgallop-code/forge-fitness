import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/ios-capacitor.yml", import.meta.url), "utf8");
const releaseWorkflow = await readFile(new URL("../.github/workflows/ios-app-store.yml", import.meta.url), "utf8");

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

test("App Store releases are manual and protected by an environment", () => {
    assert.match(releaseWorkflow, /workflow_dispatch:/);
    assert.doesNotMatch(releaseWorkflow, /\n\s+push:/);
    assert.match(releaseWorkflow, /environment:\s*app-store/);
    assert.match(releaseWorkflow, /permissions:\s*\n\s*contents:\s*read/);
});

test("App Store releases use cloud signing and clean up the private key", () => {
    assert.match(releaseWorkflow, /-allowProvisioningUpdates/);
    assert.match(releaseWorkflow, /-authenticationKeyPath/);
    assert.match(releaseWorkflow, /xcrun altool --upload-app/);
    assert.match(releaseWorkflow, /if:\s*always\(\)/);
    assert.match(releaseWorkflow, /rm -f \"\$AUTH_KEY_PATH\"/);
});
