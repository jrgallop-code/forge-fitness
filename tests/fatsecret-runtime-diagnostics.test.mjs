import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../cloud/src/fatsecret-diagnostic-worker.js", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../cloud/wrangler.jsonc", import.meta.url), "utf8");
const client = await readFile(new URL("../js/nutrition/fatsecret-runtime-diagnostics.js", import.meta.url), "utf8");
const data = await readFile(new URL("../js/nutrition/food-log-data.js", import.meta.url), "utf8");

test("production Worker always exposes a FatSecret search diagnostic", () => {
    assert.match(wrangler, /"main": "src\/fatsecret-diagnostic-worker\.js"/);
    assert.match(worker, /credentials_missing/);
    assert.match(worker, /diagnostic_missing/);
    assert.match(worker, /FATSECRET_CLIENT_ID/);
    assert.match(worker, /FATSECRET_CLIENT_SECRET/);
});

test("food search displays safe FatSecret runtime state", async () => {
    const module = await import("../js/nutrition/fatsecret-runtime-diagnostics.js");
    assert.equal(module.formatStatus({ configured: false, error: "credentials_missing" }),
        "FatSecret: not connected — Cloudflare credentials missing");
    assert.match(module.formatStatus({
        configured: true,
        available: true,
        effectiveCountry: "CA",
        canLocalize: true,
        candidates: 8,
        usableResults: 3,
        grantedScopes: ["basic", "premier", "localization"]
    }), /FatSecret: connected · CA localized · 8 candidates · 3 usable/);
    assert.equal(module.formatStatus({ configured: true, error: "invalid_ip" }),
        "FatSecret: blocked by FatSecret IP restriction");
});

test("food log loads the runtime diagnostic module", () => {
    assert.match(data, /fatsecret-runtime-diagnostics\.js\?v=fatsecret-runtime-1/);
    assert.match(client, /window\.__levelUpFatSecretLastStatus/);
    assert.match(client, /data-fat-secret-runtime-status|fatSecretRuntimeStatus/);
});

test("FatSecret attribution is hidden from the food-sheet footer", () => {
    assert.match(client, /\.food-sheet-card \[data-fatsecret-attribution\]\{display:none!important\}/);
});
