import test from 'node:test';
import assert from 'node:assert/strict';
import { songFromState, captureSetSong, clearSetSong, finishSongCaptures, disconnectSpotify, watchMusicSession } from '../js/music/spotify.js';
import { evaluateLiveWorkoutPrs } from '../js/workouts/workout-pr-badges.js';
const state = () => ({ connected: true, paused: false, observedAt: Date.now(), track: { uri: 'spotify:track:123abc', title: 'Test Song', artist: 'Test Artist' } });
test('only fresh, playing Spotify songs can be tagged', () => {
    const playing = state();
    assert.equal(songFromState(playing).title, 'Test Song');
    for (const patch of [{ paused: true }, { connected: false }, { observedAt: Date.now() - 6000 }, { track: { uri: 'spotify:episode:abc', title: 'Podcast' } }, { track: null }]) assert.equal(songFromState({ ...playing, ...patch }), null);
});
test('song survives workout serialization and is associated with the existing PR winner', async () => {
    globalThis.window = { Capacitor: { Plugins: { LevelUpSpotify: { snapshot: async () => state() } } } };
    const set = { weight: 110, reps: 15, completed: true };
    await captureSetSong(set, () => {});
    await finishSongCaptures();
    const active = JSON.parse(JSON.stringify({ id: 's2', exercises: [{ exerciseId: 'test', sets: [set] }] }));
    const history = [{ id: 's1', exercises: [{ exerciseId: 'test', sets: [{ weight: 100, reps: 15, completed: true }] }] }];
    const pr = evaluateLiveWorkoutPrs(active, history).details.get('test');
    assert.equal(pr.bestSet.music.title, 'Test Song');
    assert.equal(pr.bestSet.music.captureMethod, 'set-completion');
    assert.equal(evaluateLiveWorkoutPrs(active, [{ exercises: [{ exerciseId: 'test', sets: [{ weight: 120, reps: 15, completed: true }] }] }]).count, 0);
});
test('undo and redo discard an earlier in-flight song request', async () => {
    let resolve;
    globalThis.window = { Capacitor: { Plugins: { LevelUpSpotify: { snapshot: () => new Promise(r => { resolve = r; }) } } } };
    const set = { completed: true };
    const capture = captureSetSong(set, () => assert.fail('undone capture persisted'));
    await Promise.resolve();
    clearSetSong(set);
    set.completed = true;
    resolve(state());
    await capture;
    assert.equal(set.music, undefined);
});
test('disconnect clears saved, active and in-memory songs while preserving PR data', async () => {
    const song = songFromState(state());
    const session = { exercises: [{ sets: [{ weight: 110, reps: 15, music: song }] }] };
    watchMusicSession(session);
    const store = new Map([['forge_workout_sessions', JSON.stringify([session])], ['level_up_active_workout', JSON.stringify(session)]]);
    globalThis.localStorage = { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) };
    globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
    globalThis.window = { dispatchEvent() {}, Capacitor: { Plugins: { LevelUpSpotify: { disconnect: async () => {} } } } };
    await disconnectSpotify();
    assert.equal(session.exercises[0].sets[0].music, undefined);
    for (const value of store.values()) { assert.ok(!value.includes('spotify')); assert.ok(value.includes('110')); }
});

test('discarded workouts cannot be revived by an in-flight song capture', async () => {
    globalThis.window = { Capacitor: { Plugins: { LevelUpSpotify: { snapshot: async () => state() } } } };
    const set = { completed: true };
    await captureSetSong(set, () => assert.fail('discarded workout saved'), () => false);
    assert.equal(set.music, undefined);
});
