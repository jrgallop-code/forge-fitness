import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reviewEligibility, appReviewCardMarkup, openAppReviews, REVIEW_URL} from '../js/feedback/app-reviews.js';
const now = Date.parse('2026-10-16T12:00:00Z');
const history = Array.from({length:5},(_,i)=>({id:`w${i}`,completedAt:new Date(now-(8-i)*86400000).toISOString(),exercises:[{sets:[{reps:10,completed:true}]}]}));
test('review milestone needs five real distinct workouts over at least seven days',()=>{
 assert.equal(reviewEligibility(history,now).eligible,true);
 assert.equal(reviewEligibility(history.slice(1),now).eligible,false);
 assert.equal(reviewEligibility([...history.slice(1),history[1]],now).eligible,false);
 assert.equal(reviewEligibility(history.map(s=>({...s,completedAt:new Date(now-86400000).toISOString()})),now).eligible,false);
 assert.equal(reviewEligibility(history.map(s=>({...s,status:'draft'})),now).eligible,false);
 assert.equal(reviewEligibility(history.map(s=>({...s,exercises:[{sets:[{reps:10,isWarmup:true}]}]})),now).eligible,false);
});
test('More review link is native iOS only and opens the explicit review destination',async()=>{
 globalThis.window={Capacitor:{getPlatform:()=> 'web'}};
 assert.equal(appReviewCardMarkup(),'');
 let opened=0;
 window.Capacitor={getPlatform:()=> 'ios',Plugins:{LevelUpAppIcon:{openReviews:async()=>{opened++;}}}};
 assert.match(appReviewCardMarkup(),/Rate Level Up/);
 await openAppReviews(); assert.equal(opened,1);
 assert.match(REVIEW_URL,/id6810024008\?action=write-review$/);
});
test('native review policy enforces cooldown, version limit, foreground scene and beta behavior',async()=>{
 const native=await readFile('ios/App/App/LevelUpAppIconPlugin.swift','utf8');
 assert.match(native,/AppStore.requestReview\(in: scene\)/);
 assert.match(native,/120 \* 86400/);
 assert.match(native,/levelUpReviewVersion/);
 assert.match(native,/sandboxReceipt/);
 assert.match(native,/foregroundActive/);
 const ui=await readFile('js/workouts/drop-set-runtime.js','utf8');
 assert.doesNotMatch(ui,/data-strength-include|Use for strength stats/);
 const css=await readFile('css/strength-context.css','utf8');
 assert.match(css,/\.exercise-volume-comparison > \.empty-state[^}]*grid-column:1\/-1/);
});

test('automatic requests wait for recap dismissal and skip Undo finish',async()=>{
 const {initializeAppReviews}=await import('../js/feedback/app-reviews.js');
 const events={},timers=[];let requests=0;
 globalThis.window={Capacitor:{getPlatform:()=> 'ios',Plugins:{LevelUpAppIcon:{requestReview:async()=>{requests++;}}}},addEventListener:(name,fn)=>events[name]=fn,setTimeout:fn=>timers.push(fn)};
 globalThis.document={hidden:false,querySelector:()=>null,addEventListener(){}};
 const liveHistory=history.map(s=>({...s,completedAt:new Date(Date.now()-9*86400000).toISOString()}));
 globalThis.localStorage={getItem:key=>key==='forge_workout_sessions'?JSON.stringify(liveHistory):null};
 initializeAppReviews();
 events['levelup:workout-completed']({detail:{sessionId:'w0'}});
 events['levelup:workout-recap-dismissed']({detail:{sessionId:'w0',resumed:true}});
 assert.equal(timers.length,0);
 events['levelup:workout-completed']({detail:{sessionId:'w0'}});
 events['levelup:workout-recap-dismissed']({detail:{sessionId:'w0'}});
 assert.equal(requests,0);assert.equal(timers.length,1);
 await timers[0]();assert.equal(requests,1);
 events['levelup:workout-recap-dismissed']({detail:{sessionId:'w0'}});
 assert.equal(timers.length,1);
});
