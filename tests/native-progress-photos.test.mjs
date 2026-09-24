import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const journal = fs.readFileSync("js/progress/photo-journal.js", "utf8");
const progress = fs.readFileSync("js/progress/cardio-analytics.js", "utf8");
const progressUi = fs.readFileSync("js/progress/progress-ui.js", "utf8");
const app = fs.readFileSync("js/app.js", "utf8");
const styles = fs.readFileSync("css/styles.css", "utf8");
const plugin = fs.readFileSync("ios/App/App/LevelUpProgressPhotosPlugin.swift", "utf8");
const providers = fs.readFileSync("js/core/backup-providers.js", "utf8");

test("progress photos are shown only in the native iOS progress navigation", () => {
    assert.match(progress, /isNativeIos\(\) && photoButton/);
    assert.match(progress, /📷 Photos/);
    assert.match(progress, /tabs\.insertBefore\(photoButton, nutritionButton\.nextElementSibling\)/);
    assert.match(progress, /photoButton\?\.remove\(\)/);
});

test("native progress photos use protected account-isolated files excluded from backup", () => {
    assert.match(plugin, /FileProtectionType\.complete/);
    assert.match(plugin, /completeFileProtection/);
    assert.match(plugin, /isExcludedFromBackup = true/);
    assert.match(plugin, /SHA256\.hash/);
    assert.match(journal, /LevelUpProgressPhotos/);
    assert.match(journal, /getAllLegacyPhotos/);
    assert.doesNotMatch(providers, /LevelUpProgressPhotos/);
});

test("native progress photo entry supports the library and keeps the form aligned", () => {
    assert.match(progressUi, /📷 Photos/);
    assert.match(app, /"📷":STROKE_ICON/);
    assert.doesNotMatch(journal, /capture="environment"/);
    assert.doesNotMatch(journal, /placeholder="Equipment setup/);
    assert.match(styles, /#photo-journal-date\s*\{[\s\S]*max-inline-size:100%;[\s\S]*height:44px;[\s\S]*appearance:none/);
    assert.match(styles, /#photo-journal-date::\-webkit-date-and-time-value\s*\{[\s\S]*text-align:left/);
    assert.match(styles, /\.photo-entry-panel input\s*\{[\s\S]*box-sizing:border-box;[\s\S]*max-width:100%/);
});

test("progress photos use an entry list and a two-photo gallery with independent pinch zoom", () => {
    assert.match(journal, /id="photo-journal-list-screen"/);
    assert.match(journal, /id="photo-entry-period"/);
    assert.match(journal, /formatMonthYear\(period\)/);
    assert.match(journal, /id="photo-gallery-screen"/);
    assert.match(journal, /data-photo-view="single"/);
    assert.match(journal, /data-photo-view="compare"/);
    assert.match(journal, /id="photo-gallery-carousel"/);
    assert.match(journal, /Compare up to two photos/);
    assert.match(journal, /selectedPhotoIds = selectedPhotoIds\.slice\(0, 2\)/);
    assert.match(journal, /panes\.forEach\(\(pane, index\) => installPhotoPinchZoom\(pane, photos\[index\]\?\.id\)\)/);
    assert.match(journal, /pointerdown/);
    assert.match(journal, /pointermove/);
    assert.match(journal, /Math\.hypot/);
    assert.doesNotMatch(journal, /id="photo-zoom-range"/);
    assert.doesNotMatch(journal, /data-photo-zoom=/);
    assert.doesNotMatch(journal, /id="compare-photo-left"/);
    assert.doesNotMatch(journal, /id="compare-photo-right"/);
    assert.match(styles, /\.photo-gallery-carousel\s*\{[\s\S]*overflow-x:auto;[\s\S]*scroll-snap-type:x mandatory/);
    assert.match(styles, /\.photo-viewer-compare\s*\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
    assert.match(styles, /\.photo-zoom-pane\s*\{[\s\S]*aspect-ratio:3 \/ 4;[\s\S]*touch-action:none/);
    assert.match(styles, /\.photo-zoom-pane img\s*\{[\s\S]*object-fit:cover;[\s\S]*will-change:transform/);
    assert.match(styles, /\.photo-viewer-single-frame\s*\{[\s\S]*64dvh/);
});

test("progress photo metadata includes body weight with legacy weight fallback", () => {
    assert.match(journal, /id="photo-journal-weight"/);
    assert.match(journal, /id="photo-journal-weight"[\s\S]*data-unit-input-ignore/);
    assert.match(journal, /WEIGHT_STORAGE_KEY = "forge_weight_entries"/);
    assert.match(journal, /formatPhotoWeight\(photo\)/);
    assert.match(plugin, /let weight: Double\?/);
    assert.match(plugin, /payload\["weight"\] = weight/);
});

test("two-photo comparisons create branded on-device share cards", () => {
    assert.match(journal, /id="open-photo-share"/);
    assert.match(journal, /id="photo-share-carousel"/);
    assert.match(journal, /PHOTO_SHARE_TEMPLATES = \["before-after", "weight", "training", "timeline", "minimal"\]/);
    assert.match(journal, /calculateTrendWeightSeries/);
    assert.match(journal, /countWorkoutsBetween/);
    assert.match(journal, /leveluphypertrophy\.com/);
    assert.match(journal, /navigator\.share/);
    assert.match(journal, /LevelUpInstagramShare/);
    assert.match(journal, /photoCropStates/);
    assert.match(styles, /\.photo-share-carousel\s*\{[\s\S]*scroll-snap-type:x mandatory/);
    assert.match(styles, /\.photo-share-card\s*\{[\s\S]*aspect-ratio:4 \/ 5/);
});
