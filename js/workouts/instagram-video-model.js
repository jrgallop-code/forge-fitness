export const VIDEO_KEY = 'level_up_instagram_videos_v1';
export function normalizeInstagramLink(text) {
    const links = String(text || '').match(/https?:\/\/[^\s<>"']+/gi) || [];
    for (const link of links) {
        try {
            const url = new URL(link);
            if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname.toLowerCase()) || url.username || url.password) continue;
            const match = url.pathname.match(/^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
            if (match) return `https://www.instagram.com/${match[1] === 'reels' ? 'reel' : match[1]}/${match[2]}/`;
        } catch {}
    }
    return null;
}
export function mergeVideo(items, incoming) {
    const url = normalizeInstagramLink(incoming.url);
    if (!url) throw new Error('Use an Instagram Reel or post link.');
    const existing = items.find(item => item.url === url);
    const video = { ...existing, ...incoming, id: existing?.id || incoming.id, url };
    return existing ? items.map(item => item.id === existing.id ? video : item) : [video, ...items];
}
