import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("js/account/cloud-background-sync.js", "utf8");

test("an earlier backup cannot be postponed by later UI activity", () => {
    assert.match(source, /backupDueAt <= dueAt\) return/);
    assert.match(source, /const CRITICAL_BACKUP_DELAY_MS = 350/);
    assert.match(source, /"levelup:food-log-updated"/);
    assert.match(source, /"levelup:nutrition-updated"/);
    assert.match(source, /"levelup:weight-updated"/);
    assert.match(source, /"levelup:measurements-updated"/);
    assert.match(source, /"levelup:sleep-updated"/);
    assert.match(source, /scheduleBackup\(CRITICAL_BACKUP_DELAY_MS\)/);
});

test("changes made during an upload trigger a follow-up backup", () => {
    assert.match(source, /backupRequestedWhileInFlight = true/);
    assert.match(source, /if \(backupRequestedWhileInFlight\)/);
    assert.match(source, /scheduleBackup\(delay\)/);
});

test("backgrounding starts backup immediately instead of relying on a timer", () => {
    assert.match(source, /visibilitychange/);
    assert.match(source, /pagehide/);
    assert.match(source, /appStateChange/);
    assert.match(source, /else \{[\s\S]*void runAutomaticBackup\(\)/);
});

test("backup recovers when a renewed cloud token is observed", () => {
    assert.match(source, /function recoverSessionIfChanged\(\)/);
    assert.match(source, /currentToken === rejectedSessionToken/);
});

test("transient errors automatically request a bounded retry", () => {
    assert.match(source, /scheduleRetryAfterFailure\(\)/);
    assert.match(source, /pendingRetryDelayMs \?\? 1_000/);
});

test("remote versions are adopted only if backup contents match", () => {
    assert.match(source, /remoteFingerprint === fingerprint/);
    assert.match(source, /verifyBackupSnapshot\(saved\.backup\)/);
});
