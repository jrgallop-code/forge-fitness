import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const explore = fs.readFileSync('js/more/explore-research.js', 'utf8');
const more = fs.readFileSync('js/more/more-ui-v2.js', 'utf8');
const styles = fs.readFileSync('css/explore-research.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

test('Explore remains a first-class More destination without dashboard clutter', () => {
  assert.match(more, /data-more-page="explore"/);
  assert.match(more, /openExploreResearch\(\)/);
  assert.doesNotMatch(explore, /data-dashboard-explore-research/);
  assert.doesNotMatch(explore, /NEW IN RESEARCH/);
  assert.match(index, /explore-research\.css\?v=explore-research-2/);
  assert.match(index, /explore-research\.js\?v=explore-research-2/);
});

test('Explore uses real publication records, evidence context and source links', () => {
  ['41343037', '41843416', '41712097', '41433021', '39903375', '42667675', '42616143', '42562022', '42549104', '42461790', '42514376', '42415329'].forEach(pmid => assert.match(explore, new RegExp(pmid)));
  assert.match(explore, /Meta-analysis/);
  assert.match(explore, /Systematic review/);
  assert.match(explore, /Important limitations/);
  assert.match(explore, /View study ↗/);
  assert.match(explore, /Educational information only/);
});

test('Explore publishes only completed summaries and excludes the thyroid paper', () => {
  assert.doesNotMatch(explore, /EUROPE_PMC_URL|fetchLiveArticles|Not yet reviewed|has not yet completed an editorial review/);
  assert.doesNotMatch(explore, /42557000|hypothyroid|thyroid/i);
  assert.match(explore, /No abstract-only or automatically published cards appear in Explore/);
  assert.match(explore, /What the researchers found/);
});

test('Explore supports filters, evidence guides and a saved reading list', () => {
  assert.match(explore, /data-explore-tab="new"/);
  assert.match(explore, /data-explore-tab="guides"/);
  assert.match(explore, /data-explore-tab="saved"/);
  assert.match(explore, /level_up_saved_research_v1/);
  assert.match(explore, /toggleSaved/);
  ['28698222', '38970765', '39205815'].forEach(pmid => assert.match(explore, new RegExp(pmid)));
  assert.match(explore, /guide-protein/);
  assert.match(explore, /guide-rir/);
  assert.match(explore, /guide-rest/);
  assert.match(styles, /\.explore-tabs/);
  assert.match(styles, /@media\(max-width:520px\)/);
  assert.match(worker, /2026-09-01-92/);
});

test('Explore uses diverse, topic-relevant Pexels photography', () => {
  assert.match(explore, /pexels-photo-1547248/);
  ['17959564', '3757376', '18618315', '33921585', '7041577', '8846212', '15679569', '35439074', '4378601', '36676405', '769289'].forEach(photo => assert.match(explore, new RegExp(`pexels-photo-${photo}`)));
  assert.match(styles, /--explore-hero/);
  assert.match(styles, /--study-image/);
});
