import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("js/account/cloud-background-sync.js", "utf8");

test("an earlier backup cannot be postponed by later UI activity", () => {
    assert.match(source, /backupDueAt <= dueAt\) return/);
    assert.match(source, /levelup:food-log-updated", \(\) => scheduleBackup\(1_000\)/);
    assert.match(source, /levelup:nutrition-updated", \(\) => scheduleBackup\(1_000\)/);
});

test("changes made during an upload trigger a follow-up backup", () => {
    assert.match(source, /backupRequestedWhileInFlight = true/);
    assert.match(source, /if \(backupRequestedWhileInFlight\)/);
    assert.match(source, /scheduleBackup\(1_000\)/);
});
