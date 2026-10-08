import { VIDEO_KEY, normalizeInstagramLink } from './instagram-video-model.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1"/></svg>';
export function linkedRoutines(video, plans) {
 const url = normalizeInstagramLink(video?.url);
 return plans.filter(plan => plan.sourceVideo && ((video?.id && plan.sourceVideo.id === video.id) || (url && normalizeInstagramLink(plan.sourceVideo.url) === url)));
}
export function resolveRoutineVideo(plan) {
 const source = plan?.sourceVideo;
 if (!normalizeInstagramLink(source?.url)) return null;
 try {
  const videos = JSON.parse(localStorage.getItem(VIDEO_KEY) || '[]');
  const current = Array.isArray(videos) && videos.find(video => (source.id && video.id === source.id) || normalizeInstagramLink(video.url) === normalizeInstagramLink(source.url));
  return current || source;
 } catch { return source; }
}
export function renderRoutineSourceLabel(plan) {
 const video = resolveRoutineVideo(plan);
 return video ? `<small class="routine-video-origin">${icon} From: ${escape(video.title || 'Instagram workout')}</small>` : '';
}
export function renderRoutineSourcePreview(plan) {
 const video = resolveRoutineVideo(plan);
 if (!video) return '';
 const thumbnail = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(video.cover || '') ? `<img src="${video.cover}" alt="Source video thumbnail">` : `<span class="routine-video-placeholder">${icon}</span>`;
 return `<aside class="routine-video-source">${thumbnail}<div><small>${icon} FROM INSTAGRAM</small><strong>${escape(video.title || 'Saved workout video')}</strong><a href="${escape(normalizeInstagramLink(video.url))}" target="_blank" rel="noopener noreferrer">Watch original video ↗</a></div></aside>`;
}
