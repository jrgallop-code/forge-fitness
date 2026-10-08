import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildWorkoutLibraryRows} from '../js/workouts/workout-library-rows.js';

test('all saved routines survive catalogue limits and circuit-only browsing',()=>{
 const saved=Array.from({length:20},(_,i)=>({id:`saved-${i}`,days:[],equipment:i%2?'Bodyweight':'Gym'}));
 const catalogue=Array.from({length:30},(_,i)=>({id:`catalogue-${i}`}));
 const rows=buildWorkoutLibraryRows(saved,catalogue);
 assert.equal(rows.filter(p=>p.isSavedPlan).length,20);
 assert.equal(rows.filter(p=>!p.isSavedPlan).length,14);
 assert.equal(buildWorkoutLibraryRows(saved,[{id:'circuit-template'}]).filter(p=>p.isSavedPlan).length,20);
 assert.equal(buildWorkoutLibraryRows(saved,[saved[0]],true).length,20);
});

test('saving an Instagram circuit persists it and announces its exact destination on the current page',()=>{
 const source=readFileSync(new URL('../js/workouts/routine-importer.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function saveRoutine('),source.indexOf('\nfunction findItem('));
 let stored, closed=false, event;
 const video={title:'Home Circuit',url:'https://www.instagram.com/reel/test/'};
 const context={Date,JSON,PLAN_KEY:'forge_workout_plans',importState:{name:'Home Circuit',kind:'circuit',rounds:3,rest:30,rawText:'Squat',days:[{name:'Circuit',exercises:[{match:{exerciseId:'back-squat'},sets:3,reps:''}]}]},sourceVideo:video,canSaveImport:()=>true,readPlans:()=>[],localStorage:{setItem:(key,value)=>{stored=JSON.parse(value)}},sessionStorage:{setItem:()=>{}},window:{setTimeout:fn=>fn()},closeImporter:()=>{closed=true},document:{dispatchEvent:e=>{event=e}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}};
 vm.createContext(context);vm.runInContext(fn+'\nsaveRoutine({}, {});',context);
 assert.equal(stored[0].name,'Home Circuit');
 assert.equal(stored[0].sourceVideo.url,video.url);
 assert.equal(stored[0].trainingContext,'circuit');
 assert.equal(stored[0].rounds,3);
 assert.ok(closed);
 assert.equal(event.type,'levelup:routine-saved');
 assert.equal(event.detail.planId,stored[0].id);
});

test('iOS videos occupy a sibling tab rather than nested routine tabs',()=>{
 const separation=readFileSync(new URL('../js/workouts/workout-library-separation.js',import.meta.url),'utf8');
 const videos=readFileSync(new URL('../js/workouts/instagram-saved-videos.js',import.meta.url),'utf8');
 assert.match(separation,/data-workout-library-tab="videos">My Videos/);
 assert.match(separation,/videosPanel\.dataset\.workoutLibraryPanel = 'videos'/);
 assert.match(separation,/initializeInstagramSavedVideos\(videosPanel\)/);
 assert.doesNotMatch(videos,/tabs\.innerHTML|list\.before\(tabs\)/);
 assert.match(videos,/＋ Add Video/);
});
