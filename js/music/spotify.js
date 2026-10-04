const plugin = () => globalThis.window?.Capacitor?.Plugins?.LevelUpSpotify;
const pending = new Set();
let generation = 0;
const attempts = new WeakMap();
const sessions = new Set();
export function watchMusicSession(session) { sessions.add(session); }
export function clearSetSong(set) { attempts.set(set, (attempts.get(set) || 0) + 1); delete set.music; }
export function songFromState(state, now = Date.now()) {
    const track = state?.track;
    const age = now - Number(state?.observedAt);
    if (!state?.connected || state.paused !== false || !Number.isFinite(age) || age < -1000 || age > 5000 || !/^spotify:track:[A-Za-z0-9]+$/.test(track?.uri || '') || !track.title) return null;
    return { provider: 'spotify', uri: track.uri, title: String(track.title).slice(0, 500), artist: String(track.artist || '').slice(0, 500), capturedAt: new Date(now).toISOString(), captureMethod: 'set-completion' };
}
export async function spotifyStatus() { return await plugin()?.status?.() || { connected: false, configured: false }; }
export async function connectSpotify() { return await plugin()?.connect?.({ reauthorize: true }); }
export function captureSetSong(set, persist, isCurrent = () => true) {
    clearSetSong(set);
    const attempt = attempts.get(set);
    const version = generation;
    let timeout;
    // The request starts at the tap, and never blocks the rest timer.
    const operation = Promise.race([
        Promise.resolve().then(() => plugin()?.snapshot?.()).catch(() => null),
        new Promise(resolve => { timeout = setTimeout(() => resolve(null), 1800); })
    ]).then(state => {
        if (version !== generation || attempt !== attempts.get(set) || !set.completed || !isCurrent()) return;
        const song = songFromState(state);
        if (song) { set.music = song; persist(); }
    });
    pending.add(operation);
    operation.finally(() => { clearTimeout(timeout); pending.delete(operation); });
    return operation;
}
export async function finishSongCaptures() { await Promise.all([...pending]); }
export async function disconnectSpotify() {
    generation += 1;
    await plugin()?.disconnect?.();
    // Disconnect removes Spotify-derived data from local workout records too.
    const clean = value => {
        if (!value || typeof value !== 'object') return;
        if (value.music?.provider === 'spotify') delete value.music;
        Object.values(value).forEach(clean);
    };
    sessions.forEach(clean);
    for (const key of ['level_up_active_workout', 'forge_workout_sessions']) {
        try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if (value) { clean(value); localStorage.setItem(key, JSON.stringify(value)); } } catch {}
    }
    window.dispatchEvent(new CustomEvent('levelup:spotify-disconnected'));
}
