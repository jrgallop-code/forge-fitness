import { spotifyStatus, connectSpotify, disconnectSpotify } from './spotify.js';
import { evaluateLiveWorkoutPrs } from '../workouts/workout-pr-badges.js?v=workout-pr-badges-4';
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const link = song => `https://open.spotify.com/track/${song.uri.split(':')[2]}`;
export function renderSpotify() {
    return `<section class="spotify-page"><button class="nutrition-planner-back" data-music-back type="button">← More</button><h2>Spotify &amp; PR Songs</h2><p>Play your music in Spotify. When you complete a set, Level Up can attach the song playing at that moment.</p><button class="primary-btn" data-music-connect type="button">Connect Spotify</button><button class="secondary-btn" data-music-disconnect type="button" hidden>Disconnect &amp; remove song tags</button><p data-music-status role="status"></p><h3>PR songs</h3><div data-music-prs></div><p><small>Song information supplied by Spotify. Tags reflect the time you log a set, which may differ from when you lifted.</small></p></section>`;
}
export function initializeSpotify({ onBack } = {}) {
    const root = document.querySelector('.spotify-page');
    if (!root) return;
    root.querySelector('[data-music-back]').onclick = onBack;
    const status = root.querySelector('[data-music-status]');
    const connect = root.querySelector('[data-music-connect]');
    const disconnect = root.querySelector('[data-music-disconnect]');
    const refresh = async () => {
        const state = await spotifyStatus().catch(() => ({ connected: false }));
        if (!root.isConnected) return;
        status.textContent = !state.configured ? 'Spotify setup is pending for this test build.' : state.connected ? (state.paused ? 'Spotify is paused. Sets will not receive song tags.' : state.track ? `Now playing on Spotify: ${state.track.title} — ${state.track.artist}` : 'Connected. Waiting for a song.') : state.message || 'Start music in Spotify, then connect here.';
        connect.disabled = !state.configured;
        connect.hidden = Boolean(state.connected);
        disconnect.hidden = !state.authorized;
        renderPrSongs(root);
    };
    connect.onclick = async () => { connect.disabled = true; try { await connectSpotify(); await refresh(); } catch (error) { status.textContent = error.message || 'Could not connect to Spotify.'; } finally { connect.disabled = false; } };
    disconnect.onclick = async () => { disconnect.disabled = true; try { await disconnectSpotify(); await refresh(); } catch { status.textContent = 'Could not disconnect. Try again.'; } finally { disconnect.disabled = false; } };
    refresh();
    const timer = setInterval(() => { if (root.isConnected) refresh(); else clearInterval(timer); }, 2500);
}
function renderPrSongs(root) {
    let sessions;
    try { sessions = JSON.parse(localStorage.getItem('forge_workout_sessions') || '[]'); } catch { sessions = []; }
    if (!Array.isArray(sessions)) sessions = [];
    const ordered = sessions.slice().sort((a, b) => String(a.completedAt || a.date).localeCompare(String(b.completedAt || b.date)));
    const history = [], entries = [];
    for (const session of ordered) {
        const result = evaluateLiveWorkoutPrs(session, history);
        for (const detail of result.details.values()) {
            const song = detail.bestSet?.music;
            if (song?.provider !== 'spotify' || !/^spotify:track:[A-Za-z0-9]+$/.test(song.uri || '')) continue;
            const exercise = session.exercises.find(e => (e.exerciseId || e.id) === detail.exerciseId);
            entries.push(`<article class="more-menu-card"><span><strong>${escape(exercise?.name || exercise?.exerciseName || 'Exercise')} PR</strong><small>${escape(session.date)} · ${escape(detail.types?.map(t => t === 'weight' ? 'Weight PR' : 'Estimated 1RM PR').join(' + ') || 'Rep PR')}</small><a href="${link(song)}" target="_blank" rel="noopener">${escape(song.title)} — ${escape(song.artist)} · Spotify</a></span></article>`);
        }
        history.push(session);
    }
    root.querySelector('[data-music-prs]').innerHTML = entries.reverse().join('') || '<p>Your tagged PRs will appear here after you connect Spotify and complete a workout.</p>';
}
