// Original image_gen sports emblems, with transparent surrounds.
// Appearance colours are applied to the artwork by CSS without DOM rewrites.
const ART = {shoe:'dumbbell',dumbbells:'dumbbell',trophy:'plate',calendar:'calendar',plant:'calendar',plate:'bear'};
export function badgeArt(kind, { locked = false, milestone = null, metric = null, customArt = false, showMilestone = true } = {}) {
  const number=Number(milestone);
  let asset=ART[kind] || 'plate';
  if(customArt) asset=kind;
  else if(metric==='circuits') asset='circuit';
  else if(metric==='prs') asset='plate';
  else if(metric==='weeks') asset='calendar';
  else if(metric==='sessions') asset=number>=50?'mountain':number>=10?'bear':'dumbbell';
  const marker=showMilestone && Number.isInteger(number) && number>0 && number<=9999
    ? `<g class="badge-milestone"><rect x="32" y="78" width="36" height="19" rx="5" fill="var(--card)" stroke="var(--accent)" stroke-width="1"/><text class="badge-number" x="50" y="91" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${number>=1000?10:12}" fill="var(--heading)" stroke="none">${number}</text></g>` : '';
  return `<svg class="training-badge-art${locked ? ' is-locked' : ''}" viewBox="0 0 100 100" aria-hidden="true"><image href="assets/training-badges/${asset}-sports-v1.webp" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>${marker}</svg>`;
}
