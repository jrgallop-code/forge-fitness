import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("consumer app never displays owner analytics surfaces", async () => {
  const moreStyles = await read("css/more-menu-compact.css");
  assert.match(moreStyles, /\.owner-analytics-launch/);
  assert.match(moreStyles, /\[data-more-page=\"admin-analytics\"\]/);
  assert.match(moreStyles, /\.admin-analytics-page\{display:none!important\}/);
});

test("standalone owner dashboard requires Google sign-in and admin authorization", async () => {
  const [html, app, analytics] = await Promise.all([
    read("admin/index.html"),
    read("admin/app.js"),
    read("admin/admin-analytics.js")
  ]);

  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /accounts\.google\.com\/gsi\/client/);
  assert.match(app, /\/v1\/session\/google/);
  assert.match(app, /\/v1\/me/);
  assert.match(app, /user\.isAdmin/);
  assert.match(app, /level_up_owner_session/);
  assert.match(analytics, /\/v1\/admin\/analytics/);
  assert.match(analytics, /level_up_owner_session/);
});

test("cloud API accepts the private admin subdomain", async () => {
  const workerConfig = await read("cloud/wrangler.jsonc");
  assert.match(workerConfig, /https:\/\/admin\.leveluphypertrophy\.com/);
});
