import { VIDEO_KEY, normalizeInstagramLink, mergeVideo } from './instagram-video-model.js';
import { openRoutineFromVideo } from './routine-importer.js?v=launcher-grid-hotfix-1';
const logo = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none"/></svg>`;
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plugin = () => window.Capacitor?.Plugins?.LevelUpInstagramShare;
const read = () => { try { const x = JSON.parse(localStorage.getItem(VIDEO_KEY) || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
let listenerBound = false;
let checking = false;

export function initializeInstagramSavedVideos(panel) {
    if (window.Capacitor?.getPlatform?.() !== 'ios' || !panel) return;
    if (!document.querySelector('link[href*="instagram-saved-videos.css"]')) {
        const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'css/instagram-saved-videos.css'; document.head.append(style);
    }
    const videos = document.createElement('section'); videos.className = 'ig-library'; panel.appendChild(videos);
    let folder = 'All';
    const render = () => {
        const items = read(); const folders = ['All', ...new Set(items.map(x => x.folder || 'Unfiled'))];
        videos.innerHTML = `<button class="ig-primary" data-add>＋ Add Video</button><div class="ig-folders">${folders.map(f => `<button class="${f === folder ? 'active' : ''}" data-folder="${esc(f)}">${esc(f)}</button>`).join('')}</div><div class="ig-cards">${items.filter(x => folder === 'All' || (x.folder || 'Unfiled') === folder).map(x => `<button class="ig-card" data-video="${esc(x.id)}"><div class="ig-cover">${cover(x)}<span class="ig-play">▶</span></div><div><small>${logo} Instagram</small><strong>${esc(x.title || 'Saved Instagram workout')}</strong><span>${esc(x.folder || 'Unfiled')}</span></div></button>`).join('') || '<div class="ig-empty"><strong>Save a workout from Instagram</strong><p>Keep your favourite Reels here, then build a routine from their written workout.</p></div>'}</div><p class="ig-message" aria-live="polite"></p>`;
        videos.querySelector('[data-add]').onclick = () => editVideo(null, render);
        videos.querySelectorAll('[data-folder]').forEach(b => b.onclick = () => { folder = b.dataset.folder; render(); });
        videos.querySelectorAll('[data-video]').forEach(b => b.onclick = () => showVideo(read().find(x => x.id === b.dataset.video), render));
    };
    panel._igRefresh = (show = true) => { render(); if (show) document.querySelector('[data-workout-library-tab="videos"]')?.click(); };
    render();
    if (!listenerBound) {
        listenerBound = true;
        document.addEventListener('visibilitychange', () => { if (!document.hidden) importPending(); });
        window.addEventListener('focus', importPending);
        window.Capacitor?.Plugins?.App?.addListener('appStateChange', ({isActive}) => { if (isActive) importPending(); });
    }
    importPending();
}
function cover(video) {
    return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(video.cover || '') ? `<img src="${video.cover}" alt="Workout video cover">` : `<div class="ig-placeholder">${logo}<span>Instagram video</span></div>`;
}
function modal(title) {
    const shell = document.createElement('dialog'); shell.className = 'ig-dialog';
    shell.innerHTML = `<div class="ig-top"><h2>${esc(title)}</h2><button aria-label="Close">✕</button></div><div data-body></div><p class="ig-message" aria-live="polite"></p>`;
    document.body.append(shell); shell.querySelector('.ig-top button').onclick = () => shell.close(); shell.onclose = () => shell.remove(); shell.showModal(); return shell;
}
function message(shell, error) { shell.querySelector('.ig-message').textContent = error?.message || String(error); }
function editVideo(video, refresh) {
    if (!video) {
        const shell = modal('Save from Instagram');
        shell.querySelector('[data-body]').innerHTML = `<div class="ig-intro"><h3>Want to save a video from Instagram?</h3><button class="ig-instagram" data-instagram>${logo}<span>Open Instagram</span></button><p>Find a Reel → Share → More → Level Up.<br>Save it, then return to Saved Videos.</p><p>Tap your saved video to rename it or move it into a folder.</p></div>`;
        shell.querySelector('[data-instagram]').onclick = async () => { try { const r = await plugin().openInstagram(); if (!r.opened) throw new Error('Instagram could not be opened.'); shell.close(); } catch (e) { message(shell,e); } };
        return;
    }
    const shell = modal('Rename and organize');
    shell.querySelector('[data-body]').innerHTML = `${!video ? `<div class="ig-intro"><h3>Want to save a video from Instagram?</h3><button class="ig-instagram" data-instagram>${logo}<span>Open Instagram</span></button><p>Find a Reel → Share → More → Level Up.<br>Save it, then return here to choose a folder.</p><p>Or copy the link and paste it below.</p></div>` : ''}<form><input name="url" type="hidden" value="${esc(video?.url)}"><button type="button" class="ig-secondary" data-preview>Get preview</button><div class="ig-cover" data-cover>${cover(video || {})}</div><label>Workout title<input name="title" maxlength="100" value="${esc(video?.title)}" placeholder="Saved Instagram workout"></label><label>Folder — choose one or type a new name<input name="folder" maxlength="60" value="${esc(video?.folder || 'Unfiled')}" list="ig-folder-options"></label><datalist id="ig-folder-options">${['Upper Body','Home Workouts','Finishers', ...new Set(read().map(x => x.folder))].filter(Boolean).map(f => `<option value="${esc(f)}">`).join('')}</datalist><label>Cover image<input name="cover" type="file" accept="image/*"></label><label>Notes<textarea name="notes" maxlength="4000">${esc(video?.notes)}</textarea></label><button class="ig-primary" type="submit">Save changes</button></form>`;
    const form = shell.querySelector('form'); let image = video?.cover || '';
    shell.querySelector('[data-instagram]')?.addEventListener('click', async () => { try { const r = await plugin().openInstagram(); if (!r.opened) throw new Error('Instagram could not be opened.'); } catch (e) { message(shell,e); } });
    shell.querySelector('[data-preview]').onclick = async event => {
        const url = normalizeInstagramLink(form.elements.url.value); if (!url) return message(shell, 'Paste an Instagram Reel or post link first.');
        const button = event.currentTarget; button.disabled = true;
        try { const result = await plugin().videoPreview({url}); if (!shell.isConnected) return; if (!form.elements.title.value) form.elements.title.value = (result.title || '').slice(0,100); if (result.cover) { image = result.cover; shell.querySelector('[data-cover]').innerHTML = cover({cover:image}); } else message(shell, 'Instagram did not provide a thumbnail. Choose a cover image below.'); }
        catch { message(shell, 'Preview unavailable. You can still save the link and choose a cover.'); } finally { button.disabled = false; }
    };
    form.elements.url.onchange = () => { if (normalizeInstagramLink(form.elements.url.value)) shell.querySelector('[data-preview]').click(); };
    form.elements.cover.onchange = async () => { try { image = await resizeCover(form.elements.cover.files[0]); shell.querySelector('[data-cover]').innerHTML = cover({cover:image}); } catch (e) { message(shell,e); } };
    form.onsubmit = event => { event.preventDefault(); try {
        const url = normalizeInstagramLink(form.elements.url.value); if (!url) throw new Error('Use an Instagram Reel or post link.');
        const item = {...video, id: video?.id || crypto.randomUUID(), url, title:form.elements.title.value.trim() || 'Saved Instagram workout', folder:form.elements.folder.value.trim() || 'Unfiled', notes:form.elements.notes.value, cover:image, savedAt:video?.savedAt || new Date().toISOString()};
        localStorage.setItem(VIDEO_KEY, JSON.stringify(mergeVideo(read(),item))); refresh(); shell.close();
        if (!item.cover) fetchIncomingPreview(item.id, item.url);
    } catch (e) { message(shell,e); } };
}
function showVideo(video, refresh) {
    if (!video) return;
    const shell = modal('Saved video');
    shell.querySelector('[data-body]').innerHTML = `<div class="ig-cover">${cover(video)}</div><h3>${esc(video.title)}</h3><p>${logo} Instagram · ${esc(video.folder)}</p><button class="ig-primary" data-watch>▶ Watch on Instagram</button><button class="ig-secondary" data-create>Create routine from text or screenshot</button><p class="ig-notes">${esc(video.notes)}</p><button class="ig-secondary" data-edit>Rename / move to folder</button><button class="ig-delete" data-delete>Delete saved video</button>`;
    shell.querySelector('[data-watch]').onclick = () => { const url = normalizeInstagramLink(video.url); if (url) window.open(url, '_blank', 'noopener,noreferrer'); };
    shell.querySelector('[data-edit]').onclick = () => { shell.close(); editVideo(video,refresh); };
    shell.querySelector('[data-create]').onclick = () => { shell.close(); openRoutineFromVideo(video); };
    shell.querySelector('[data-delete]').onclick = () => { if (!window.confirm('Delete this saved video? Attached routines will remain.')) return; try { localStorage.setItem(VIDEO_KEY, JSON.stringify(read().filter(x => x.id !== video.id))); refresh(); shell.close(); } catch (e) { message(shell,e); } };
}
async function resizeCover(file) {
    if (!file) return '';
    if (file.size > 15000000) throw new Error('Choose an image smaller than 15 MB.');
    const bitmap = await createImageBitmap(file); const ratio = Math.min(1,640/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(bitmap.width*ratio)); canvas.height = Math.max(1,Math.round(bitmap.height*ratio)); canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close(); return canvas.toDataURL('image/jpeg',.7);
}
async function importPending() {
    if (checking || !plugin()) return; checking = true;
    try {
        const {items = []} = await plugin().pendingVideos(); let changed = false;
        for (const item of items) {
            const url = normalizeInstagramLink(item.url); if (!url) continue;
            const current = read(); if (!current.some(x => x.url === url)) {
                localStorage.setItem(VIDEO_KEY, JSON.stringify(mergeVideo(current,{id:item.id,url,title:(item.title || 'Saved Instagram workout').slice(0,100),notes:item.title || '',folder:'Unfiled',cover:'',savedAt:item.createdAt})));
                changed = true;
                fetchIncomingPreview(item.id, url);
            }
            await plugin().acknowledgeVideo({id:item.id});
        }
        if (changed) {
            sessionStorage.setItem('level_up_open_my_videos_v1','1');
            document.querySelector('[data-workout-library-panel="videos"]')?._igRefresh?.();
            document.querySelector('[data-workout-library-tab="videos"]')?.click();
            document.dispatchEvent(new CustomEvent('levelup:instagram-videos-imported'));
        }
    } catch (e) { const el = document.querySelector('.ig-library .ig-message'); if (el) el.textContent = 'Could not import shared videos. They will be retried when you return.'; console.warn('Instagram inbox import unavailable',e); } finally { checking = false; }
}

async function fetchIncomingPreview(id, url) {
    try {
        const preview = await plugin().videoPreview({url});
        const items = read(); const item = items.find(x => x.id === id);
        if (!item) return;
        if (!item.cover && preview.cover) item.cover = preview.cover;
        if (item.title === 'Saved Instagram workout' && preview.title) item.title = preview.title.slice(0,100);
        localStorage.setItem(VIDEO_KEY, JSON.stringify(items));
        document.querySelector('[data-workout-library-panel="videos"]')?._igRefresh?.(false);
    } catch {}
}
