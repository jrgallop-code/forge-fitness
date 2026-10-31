import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(){const c=vm.createContext({window:{addEventListener(){}},STRENGTH_COMPARISONS_EVENT:'change',UNIT_KINDS:{LIFTING_WEIGHT:'liftingWeight'},comparisonLift:n=>({'Bench Press':'bench-press','Deadlift':'deadlift'})[n]||null,formatMass:n=>n+' lb'});vm.runInContext(read('js/progress/strength-profile.js').replace(/^import .*;\n/gm,'').replace(/export /g,''),c);return c;}
const now=Date.parse('2026-10-31T12:00:00Z');
const session=(sets,date='2026-10-30')=>({completedAt:date,exercises:[{name:'Bench Press',sets}]});
test('recent profile takes best eligible actual set; excludes old logs, warmups, incomplete, high reps and drop sets',()=>{
 const c=load();const rows=c.recentComparisonSets([
  session([{weight:150,reps:7},{weight:1000,reps:1,isWarmup:true},{weight:900,reps:1,completed:false},{weight:800,reps:1,type:'drop'},{weight:700,reps:20}]),
  session([{weight:500,reps:1}],'2025-10-30'),session([{weight:100,reps:5}])],now);
 assert.equal(rows.length,1);assert.equal(rows[0].weight,150);assert.equal(rows[0].estimatedOneRepMax,185);
});
test('curve places median centrally and higher percentiles rightward; says schematic',()=>{
 const c=load();const x=p=>Number(c.percentileCurve(p).match(/<circle cx="([^"]+)/)[1]);
 assert.ok(Math.abs(x(50)-160)<.1);assert.ok(x(68)>x(50));assert.ok(x(90)>x(68));assert.ok(x(0)>=20);assert.ok(x(100)<=300);
 assert.ok(c.percentileCurve(68).includes('not a measured lift distribution'));
});
test('profile card includes both swipe views, explicit source, and no invented next-level targets',()=>{
 const c=load(),html=c.liftCard({name:'Bench Press',weight:150,reps:7,estimatedOneRepMax:185},{tier:'Novice',tierIndex:1,percentile:34,sampleSize:100});
 assert.ok(html.includes('data-strength-page="0"'));assert.ok(html.includes('data-strength-page="1"'));assert.ok(html.includes('matched gym-lifter sample'));assert.ok(html.includes('Self-reported gym-lifter rating'));assert.ok(!html.includes('Next level'));
});
