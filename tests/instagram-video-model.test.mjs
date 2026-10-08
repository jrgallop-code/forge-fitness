import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInstagramLink, mergeVideo } from '../js/workouts/instagram-video-model.js';

test('canonicalizes Instagram Reels and strips share tracking', () => {
    assert.equal(normalizeInstagramLink('https://www.instagram.com/reel/ABC_def-12/?igsh=abc'), 'https://www.instagram.com/reel/ABC_def-12/');
    assert.equal(normalizeInstagramLink('Check this out https://instagram.com/p/XYZ/'), 'https://www.instagram.com/p/XYZ/');
    assert.equal(normalizeInstagramLink('https://m.instagram.com/reels/XYZ/'), 'https://www.instagram.com/reel/XYZ/');
});
test('rejects other domains, profile links, scripts and credentials', () => {
    for (const value of ['https://instagram.com.evil.com/reel/X/', 'https://evil.com/instagram.com/reel/X/', 'https://instagram.com/user/', 'javascript:alert(1)', 'https://x:pass@instagram.com/reel/X/', 'https://instagram.com/reel/X/more/']) assert.equal(normalizeInstagramLink(value), null);
});
test('re-saving a tracked link updates one video and preserves its identity', () => {
    const existing = [{id:'one',url:'https://www.instagram.com/reel/ABC/',title:'Old',cover:'cover',folder:'Upper Body'}];
    const result = mergeVideo(existing,{id:'two',url:'https://instagram.com/reel/ABC/?igsh=foo',title:'New'});
    assert.equal(result.length,1); assert.equal(result[0].id,'one'); assert.equal(result[0].title,'New'); assert.equal(result[0].cover,'cover'); assert.equal(result[0].folder,'Upper Body');
    assert.equal(existing[0].title,'Old');
});
test('invalid links cannot be inserted', () => {
    assert.throws(() => mergeVideo([], {id:'x',url:'https://youtube.com/watch?v=x'}));
});
