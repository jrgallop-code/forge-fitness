import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const worker = fs.readFileSync("cloud/src/index.js", "utf8");
const migration = fs.readFileSync("cloud/migrations/0017_persistent_login_sessions.sql", "utf8");

test("new cloud sessions remain valid until explicitly revoked", () => {
    assert.match(worker, /const SESSION_EXPIRES_AT = "9999-12-31T23:59:59\.999Z";/);
    assert.match(worker, /const expiresAt = SESSION_EXPIRES_AT;/);
    assert.doesNotMatch(worker, /SESSION_DAYS/);

    // Retaining the expiry predicate means deleted/revoked sessions and any
    // legacy expired records still cannot authenticate.
    assert.match(worker, /sessions\.expires_at > \?/);
});

test("the migration extends only sessions that have not already expired", () => {
    assert.match(migration, /SET expires_at = '9999-12-31T23:59:59\.999Z'/);
    assert.match(migration, /WHERE datetime\(expires_at\) > datetime\('now'\)/);
});
