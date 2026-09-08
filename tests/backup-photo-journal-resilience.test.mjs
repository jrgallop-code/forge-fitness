import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const manager = fs.readFileSync("js/core/backup-manager.js", "utf8");
const providers = fs.readFileSync("js/core/backup-providers.js", "utf8");
const photoJournal = fs.readFileSync("js/progress/photo-journal.js", "utf8");

test("a retired unavailable Photo Journal cannot block active app backups", () => {
    assert.match(providers, /allowUnavailable:\s*true/);
    assert.match(manager, /provider\.allowUnavailable/);
    assert.match(manager, /unavailable:\s*true/);
    assert.match(manager, /coverage\?\.unavailable === true/);
    assert.match(manager, /BACKUP_FORMAT_VERSION = 6/);
});

test("legacy photo storage repairs its schema and releases read connections", () => {
    assert.match(photoJournal, /DATABASE_VERSION =\s*\n\s*2/);
    assert.match(photoJournal, /request\.onblocked/);
    assert.match(photoJournal, /finally \{\s*database\.close\(\);\s*\}/);
    assert.match(photoJournal, /blob\.startsWith\("data:image\/"\)/);
});
