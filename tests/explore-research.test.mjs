import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const explore = fs.readFileSync('js/more/explore-research.js', 'utf8');
const more = fs.readFileSync('js/more/more-ui-v2.js', 'utf8');
const styles = fs.readFileSync('css/explore-research.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

test('Explore is a first-class More destination with a dashboard entry', () => {
  assert.match(more, /data-more-page="explore"/);
  assert.match(more, /openExploreResearch\(\)/);
  assert.match(explore, /data-dashboard-explore-research/);
  assert.match(explore, /NEW IN RESEARCH/);
  assert.match(index, /explore-research\.css\?v=explore-research-1/);
  assert.match(index, /explore-research\.js\?v=explore-research-1/);
});

test('Explore uses real publication records, evidence context and source links', () => {
  ['41343037', '41843416', '41712097', '41433021', '39903375'].forEach(pmid => assert.match(explore, new RegExp(pmid)));
  assert.match(explore, /Meta-analysis/);
  assert.match(explore, /Systematic review/);
  assert.match(explore, /Important limitations/);
  assert.match(explore, /View study ↗/);
  assert.match(explore, /Educational information only/);
});

test('Explore refreshes from Europe PMC and clearly separates unreviewed records', () => {
  assert.match(explore, /ebi\.ac\.uk\/europepmc\/webservices\/rest\/search/);
  assert.match(explore, /fetch\(EUROPE_PMC_URL/);
  assert.match(explore, /Not yet reviewed/);
  assert.match(explore, /has not yet completed an editorial review/);
  assert.match(explore, /CACHE_MAX_AGE/);
});

test('Explore supports filters, evidence guides and a saved reading list', () => {
  assert.match(explore, /data-explore-tab="new"/);
  assert.match(explore, /data-explore-tab="guides"/);
  assert.match(explore, /data-explore-tab="saved"/);
  assert.match(explore, /level_up_saved_research_v1/);
  assert.match(explore, /toggleSaved/);
  assert.match(styles, /\.explore-tabs/);
  assert.match(styles, /@media\(max-width:520px\)/);
  assert.match(worker, /2026-08-31-83/);
});

test('Explore carries the existing Level Up website athlete photography', () => {
  assert.match(explore, /pexels-photo-1547248/);
  assert.match(explore, /pexels-photo-29825216/);
  assert.match(explore, /pexels-photo-32172866/);
  assert.match(styles, /--explore-hero/);
  assert.match(styles, /--study-image/);
});
