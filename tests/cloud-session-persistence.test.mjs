import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const worker = fs.readFileSync("cloud/src/index.js", "utf8");
const migration = fs.readFileSync("cloud/migrations/0017_persistent_login_sessions.sql", "utf8");
const workerConfig = JSON.parse(fs.readFileSync("cloud/wrangler.jsonc", "utf8"));
const accountCloudUi = fs.readFileSync("js/more/account-cloud-ui.js", "utf8");
const transferMigration = fs.readFileSync("cloud/migrations/0018_account_transfer_codes.sql", "utf8");
const firstLaunchLogin = fs.readFileSync("js/account/first-launch-login.js", "utf8");

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

test("the production API accepts the Capacitor iOS origin", () => {
    const allowedOrigins = workerConfig.vars.ALLOWED_ORIGINS.split(",");
    assert.ok(allowedOrigins.includes("capacitor://localhost"));
    assert.match(worker, /origin && !allowedOrigins\(env\)\.has\(origin\)/);
});

test("Google-authenticated members can create a single-use iOS transfer code", () => {
    const requireUser = worker.indexOf("const user = await requireUser(request, env)");
    const createRoute = worker.indexOf('url.pathname === "/v1/account/transfer-code"');
    const redeemRoute = worker.indexOf('url.pathname === "/v1/session/transfer"');
    assert.ok(redeemRoute >= 0 && redeemRoute < requireUser, "redeeming must be available before authentication");
    assert.ok(createRoute > requireUser, "creating a code must require authentication");
    assert.match(transferMigration, /code_hash TEXT PRIMARY KEY/);
    assert.match(transferMigration, /used_at TEXT/);
    assert.match(worker, /TRANSFER_CODE_LIFETIME_MS = 10 \* 60 \* 1000/);
    assert.match(worker, /used_at IS NULL/);
    assert.match(worker, /Number\(consumed\?\.meta\?\.changes\) !== 1/);
    assert.match(accountCloudUi, /Generate Transfer Code/);
    assert.match(accountCloudUi, /api\("\/v1\/account\/transfer-code", \{ method: "POST"/);
    assert.match(firstLaunchLogin, /Already use Level Up on the web\?/);
    assert.match(firstLaunchLogin, /\/v1\/session\/transfer/);
    assert.match(firstLaunchLogin, /restoreTransferredBackup\(payload\.token\)/);
    assert.match(firstLaunchLogin, /restoreBackupSnapshot\(payload\.backup/);
});
