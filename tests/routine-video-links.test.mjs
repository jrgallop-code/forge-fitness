import test from 'node:test';import assert from 'node:assert/strict';
import {linkedRoutines,resolveRoutineVideo,renderRoutineSourceLabel,renderRoutineSourcePreview} from '../js/workouts/routine-video-links.js';
const video={id:'v1',title:'Morning workout',url:'https://www.instagram.com/reel/abc/'};
test('one video can link multiple routines by identity or canonical URL',()=>{
 const plans=[{id:'a',sourceVideo:video},{id:'b',sourceVideo:{url:video.url+'?igsh=tracking'}},{id:'c',sourceVideo:{url:'https://www.instagram.com/reel/other/'}},{id:'d'}];
 assert.deepEqual(linkedRoutines(video,plans).map(p=>p.id),['a','b']);
});
test('renaming a source updates its label, and deleted videos retain the original reference',()=>{
 globalThis.localStorage={getItem:()=>JSON.stringify([{...video,title:'Renamed workout',cover:'data:image/jpeg;base64,YQ=='}])};
 const plan={sourceVideo:video};assert.equal(resolveRoutineVideo(plan).title,'Renamed workout');
 assert.match(renderRoutineSourceLabel(plan),/From: Renamed workout/);
 assert.match(renderRoutineSourcePreview(plan),/Source video thumbnail/);assert.match(renderRoutineSourcePreview(plan),/Watch original video/);
 globalThis.localStorage={getItem:()=> '[]'};assert.equal(resolveRoutineVideo(plan).title,'Morning workout');
 assert.equal(renderRoutineSourcePreview({sourceVideo:{url:'javascript:alert(1)'}}),'');
});

test('routine cards use the current saved thumbnail and safely fall back when missing',async()=>{
 const {routineVideoThumbnail}=await import('../js/workouts/routine-video-links.js');
 globalThis.localStorage={getItem:()=>JSON.stringify([{...video,cover:'data:image/png;base64,YQ=='}])};
 assert.equal(routineVideoThumbnail({sourceVideo:video}),'data:image/png;base64,YQ==');
 globalThis.localStorage={getItem:()=> '[]'};
 assert.equal(routineVideoThumbnail({sourceVideo:{...video,cover:'javascript:alert(1)'}}),'');
});
