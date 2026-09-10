import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Apple authorization codes are exchanged and encrypted", async () => {
    const worker = await read("cloud/src/index.js");
    assert.match(worker, /exchangeAppleAuthorizationCode\(authorizationCode, env\)/);
    assert.match(worker, /https:\/\/appleid\.apple\.com\/auth\/token/);
    assert.match(worker, /AES-GCM/);
    assert.match(worker, /APPLE_TOKEN_ENCRYPTION_KEY/);
});

test("Apple credentials are revoked before account deletion", async () => {
    const worker = await read("cloud/src/index.js");
    assert.match(worker, /await revokeStoredAppleCredential\(user\.id, env\)/);
    assert.match(worker, /https:\/\/appleid\.apple\.com\/auth\/revoke/);
    assert.match(worker, /Apple authorization could not be revoked/);
});

test("production config and migration include Apple credential storage", async () => {
    const [config, migration] = await Promise.all([
        read("cloud/wrangler.jsonc"),
        read("cloud/migrations/0019_apple_credentials.sql")
    ]);
    assert.match(config, /"APPLE_CLIENT_ID": "com\.leveluphypertrophy\.app"/);
    for (const name of ["APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY", "APPLE_TOKEN_ENCRYPTION_KEY"]) {
        assert.match(config, new RegExp(`"${name}"`));
    }
    assert.match(migration, /CREATE TABLE IF NOT EXISTS apple_credentials/);
    assert.match(migration, /ON DELETE CASCADE/);
});
