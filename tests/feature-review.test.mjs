import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { featureBoard } from '../cloud/src/feature-board.js';
import { renderFeatureRequests } from '../admin/feature-requests.js';

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,display_name TEXT,email TEXT);
    INSERT INTO users VALUES('owner','John Gallop','owner@example.com'),('member','Alex Member','member@example.com'),('other','Sam Other','other@example.com');
    CREATE TABLE feature_requests(id TEXT PRIMARY KEY,user_id TEXT,title TEXT,body TEXT,status TEXT DEFAULT 'Under review',published INTEGER DEFAULT 0,created_at TEXT);
    CREATE TABLE feature_votes(request_id TEXT,user_id TEXT,PRIMARY KEY(request_id,user_id));
    CREATE TABLE feature_comments(id TEXT,request_id TEXT,user_id TEXT,body TEXT,parent_id TEXT,created_at TEXT);
    CREATE TABLE feature_reports(comment_id TEXT,user_id TEXT);`);
  const env = { DB: { prepare(sql) {
    const statement = db.prepare(sql);
    return { bind(...values) { this.values = values; return this; },
      async first() { return statement.get(...(this.values || [])); },
      async all() { return { results: statement.all(...(this.values || [])) }; },
      async run() { return statement.run(...(this.values || [])); } };
  } } };
  const call = (path = '', method = 'GET', user = null, admin = false, body) => featureBoard(new Request('https://api.leveluphypertrophy.com/v1/features' + path, { method }), env, user && { id: user }, admin, async () => body);
  const insert = (id, published = 0, date = '2026-10-01T00:00:00.000Z') => db.prepare('INSERT INTO feature_requests(id,user_id,title,body,published,created_at) VALUES(?,?,?,?,?,?)').run(id,'member','Quick workout','Adapt to available time',published,date);
  return { db, call, insert };
}

test('pending queue is owner-only, ordered oldest first and paginated independently of popular public ideas', async () => {
  const { db, call, insert } = setup();
  try {
    for (let i = 0; i < 210; i++) insert('public-' + i, 1);
    for (let i = 0; i < 51; i++) insert('pending-' + String(i).padStart(2, '0'), 0, new Date(Date.UTC(2026, 8, 1 + i)).toISOString());
    assert.equal((await call('?view=pending')).status,403);
    assert.equal((await call('?view=pending','GET','member')).status,403);
    const first = await call('?view=pending','GET','owner',true);
    assert.equal(first.data.requests.length,50);
    assert.equal(first.data.requests[0].id,'pending-00');
    assert.equal(first.data.hasMore,true);
    assert.deepEqual({...first.data.counts},{total:261,pending:51,published:210});
    const last = await call('?view=pending&offset=50','GET','owner',true);
    assert.equal(last.data.requests[0].id,'pending-50');
    assert.equal(last.data.hasMore,false);
    assert.equal((await call('?view=pending&offset=-1','GET','owner',true)).status,400);
    assert.equal((await call('?view=unknown','GET','owner',true)).status,400);
    assert.equal((await call()).data.requests.some(r => !r.published),false);
    assert.equal((await call()).data.counts,undefined);
  } finally { db.close(); }
});

test('owner publication opens visibility and voting; unpublishing preserves votes and hides the idea', async () => {
  const { db, call, insert } = setup();
  try {
    insert('idea');
    assert.equal((await call()).data.requests.length,0);
    assert.equal((await call('','GET','member')).data.requests[0].own,true);
    assert.equal((await call('/idea/vote','PUT','member',false,{voted:true})).status,403);
    assert.equal((await call('/idea','PATCH','member',false,{status:'Planned',published:true})).status,403);
    assert.equal((await call('/idea','PATCH','owner',true,{status:'Planned',published:'false'})).status,400);
    assert.equal((await call('/idea','PATCH','owner',true,{status:'Planned',published:true})).status,200);
    assert.equal((await call()).data.requests[0].status,'Planned');
    await call('/idea/vote','PUT','other',false,{voted:true});
    await call('/idea/vote','PUT','other',false,{voted:true});
    assert.equal((await call()).data.requests[0].votes,1);
    assert.equal((await call('?view=pending','GET','owner',true)).data.requests.length,0);
    await call('/idea','PATCH','owner',true,{status:'Under review',published:false});
    assert.equal((await call()).data.requests.length,0);
    assert.equal((await call('/idea/vote','PUT','other',false,{voted:true})).status,404);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM feature_votes').get().n,1);
    assert.equal((await call('?view=pending','GET','owner',true)).data.requests[0].votes,1);
  } finally { db.close(); }
});

test('owner console exposes review and published queues with explicit voting action guidance', () => {
  const html = renderFeatureRequests();
  assert.match(html,/Awaiting review/);
  assert.match(html,/Published/);
  assert.match(html,/Publish a request to show it in the app and open voting/);
  assert.match(html,/Next page/);
});
