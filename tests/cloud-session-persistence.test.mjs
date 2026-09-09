import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const worker = fs.readFileSync("cloud/src/index.js", "utf8");
const migration = fs.readFileSync("cloud/migrations/0017_persistent_login_sessions.sql", "utf8");
const workerConfig = JSON.parse(fs.readFileSync("cloud/wrangler.jsonc", "utf8"));
const accountCloudUi = fs.readFileSync("js/more/account-cloud-ui.js", "utf8");

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

test("Google-authenticated members can securely create an iOS app password", () => {
    const requireUser = worker.indexOf("const user = await requireUser(request, env)");
    const passwordRoute = worker.indexOf('url.pathname === "/v1/account/password"');
    assert.ok(requireUser >= 0 && passwordRoute > requireUser);
    assert.match(worker, /INSERT INTO password_credentials/);
    assert.match(worker, /A Level Up password is already configured/);
    assert.match(accountCloudUi, /Create a Level Up password/);
    assert.match(accountCloudUi, /api\("\/v1\/account\/password", \{ method: "PUT"/);
    assert.match(accountCloudUi, /!signedIn \|\| account\?\.hasPassword === true/);
});
