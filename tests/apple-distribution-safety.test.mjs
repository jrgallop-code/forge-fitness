import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const signing = readFileSync("scripts/app-store-signing.mjs", "utf8");
const workflow = readFileSync(".github/workflows/ios-app-store.yml", "utf8");

test("distribution certificate limit cannot trigger bulk revocation", () => {
  assert.doesNotMatch(signing, /for\s*\(const item of distributionCertificates\)/);
  assert.match(signing, /LEVEL_UP_CI_CERTIFICATE_ID_TO_REVOKE/);
  assert.match(signing, /selectedCertificateId/);
  assert.match(signing, /No certificates were revoked/);
});
test("upload failure retains certificates while App Store processes builds", () => {
  assert.match(workflow, /Leaving server-side signing assets intact/);
  assert.doesNotMatch(workflow, /node scripts\/app-store-signing\.mjs cleanup/);
});
test("failed uploads save ITMS diagnosis for review", () => {
  assert.match(workflow, /appstore-upload-error/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /ITMS-/);
});
test("the signed binary and profile must contain HealthKit", () => {
  assert.match(workflow, /signed-entitlements\.plist/);
  assert.match(workflow, /embedded\.mobileprovision/);
  assert.match(workflow, /com\.apple\.developer\.healthkit/);
});
