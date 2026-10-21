import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('www');
const types = { '.js':'text/javascript', '.html':'text/html', '.css':'text/css', '.webp':'image/webp', '.json':'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true });
await fs.mkdir('thumbnail-browser-results', { recursive:true });
try {
  const page = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });
  await page.goto(base + '/privacy.html');
  await page.evaluate(async () => {
    await import('/js/workouts/exercise-library-expansion.js');
    const { getAllExercises } = await import('/js/workouts/exercise-library.js?v=exercise-library-catalogue-2');
    const { exerciseThumbnail } = await import('/js/workouts/exercise-thumbnails.js');
    window.thumbnailAudit = { exercises:getAllExercises(), render:exerciseThumbnail };
    document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="/css/routine-builder.css"><link rel="stylesheet" href="/css/workout-plan-details.css">');
  });
  const results = [];
  for (const sex of ['male', 'female']) {
    await page.evaluate(sex => {
      window.__levelUpAnatomySexPreview = sex;
      document.body.innerHTML = `<main style="padding:16px;font:14px system-ui;display:grid;gap:8px">${window.thumbnailAudit.exercises.map(e => `<div style="display:flex;gap:12px;align-items:center">${window.thumbnailAudit.render(e)}<span>${e.name}</span></div>`).join('')}</main>`;
    }, sex);
    await page.waitForFunction(() => document.querySelectorAll('.routine-thumbnail img').length === 343 && [...document.querySelectorAll('.routine-thumbnail img')].every(img => img.complete && img.naturalWidth > 0 && getComputedStyle(img).visibility === 'visible'));
    assert.equal(await page.locator('.routine-thumbnail').count(), 343);
    assert.equal(await page.locator('.routine-thumbnail svg').count(), 343);
    await page.screenshot({ path:`thumbnail-browser-results/${sex}-mobile.png`, fullPage:true });
    results.push({ sex, loaded:343 });
  }
  // Hold requests to prove that the SVG is visible before image load.
  await page.route('**/assets/exercise-thumbnails/**', route => route.abort());
  await page.evaluate(() => {
    document.body.innerHTML = window.thumbnailAudit.render(window.thumbnailAudit.exercises[0]);
  });
  await page.waitForFunction(() => !document.querySelector('.routine-thumbnail img'));
  assert.equal(await page.locator('.routine-thumbnail svg').evaluate(el => getComputedStyle(el).visibility), 'visible');
  await page.unroute('**/assets/exercise-thumbnails/**');
  // Exercise the alternate identities stored by workout sessions and imports.
  await page.evaluate(() => {
    document.body.innerHTML = window.thumbnailAudit.exercises.map(e =>
      window.thumbnailAudit.render({ exerciseId:e.id }) +
      window.thumbnailAudit.render({ id:`imported-${e.id}`, name:e.name })
    ).join('');
  });
  await page.waitForFunction(() => document.querySelectorAll('.routine-thumbnail img').length === 686 && [...document.querySelectorAll('.routine-thumbnail img')].every(img => img.complete && img.naturalWidth > 0 && getComputedStyle(img).visibility === 'visible'));
  // A mature phase must recalculate immediately when Manual is switched back
  // to Coach, without another food entry, weigh-in, or app restart.
  await page.goto(base + '/privacy.html');
  await page.evaluate(async () => {
    localStorage.clear();
    const day = offset => {const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    localStorage.setItem('forge_weight_entries',JSON.stringify(Array.from({length:42},(_,i)=>({date:day(i-41),weight:170}))));
    const phase={id:'resume-test-phase',goalId:'bulk_standard',startDate:day(-41),targetWeeklyRate:0.5,maintenanceCalories:2500,startCalories:2750,currentCalories:2750};
    localStorage.setItem('level_up_nutrition_phases',JSON.stringify([phase]));
    const log={},complete={};for(let i=1;i<=42;i++){log[day(-i)]=[{nutrition:{calories:2750}}];complete[day(-i)]=true;}
    localStorage.setItem('level_up_food_log_v1',JSON.stringify(log));
    localStorage.setItem('level_up_food_log_complete_days_v1',JSON.stringify(complete));
    localStorage.setItem('level_up_maintenance_update_mode_v1','track');
    document.body.innerHTML='<div id="nutrition-current-phase"><div data-phase-calorie-suggestion><span></span><strong></strong><small></small></div></div>';
    window.coachMode=await import('/js/nutrition/maintenance-check-in.js?v=calendar-checkin-day-1');
    await import('/js/nutrition/calories-full-adjustment-display.js');
  });
  await page.waitForFunction(() => document.documentElement.dataset.weeklyCalorieReviewReason === 'manual');
  await page.evaluate(() => window.coachMode.setMaintenanceUpdateMode('review'));
  await page.waitForFunction(() => document.documentElement.dataset.weeklyCalorieReviewReady === 'true');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('level_up_nutrition_phases'))[0].id),'resume-test-phase');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('level_up_nutrition_phases'))[0].currentCalories),2750);
  await page.evaluate(() => window.coachMode.setMaintenanceUpdateMode('track'));
  await page.waitForFunction(() => document.documentElement.dataset.weeklyCalorieReviewReason === 'manual' && document.documentElement.dataset.weeklyCalorieReviewReady === 'false');
  await fs.writeFile('thumbnail-browser-results/results.json', JSON.stringify({ results, errorFallback:true, savedAndImportedSelections:686, coachResume:true }, null, 2));
  console.log('Browser verified: 343 male + 343 female selections loaded; SVG error fallback visible.');
} finally { await browser.close(); server.close(); }
