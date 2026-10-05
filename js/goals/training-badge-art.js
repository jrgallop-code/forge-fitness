// Artwork recreated from the approved faceted concept using image_gen.
// Transparent WebP assets keep the selected colours across every appearance.
const ART = {shoe:'dumbbell',dumbbells:'dumbbell',trophy:'plate',calendar:'calendar',plant:'calendar',plate:'bear'};
export function badgeArt(kind, { locked = false, milestone = null, metric = null } = {}) {
  const number=Number(milestone);
  let asset=ART[kind] || 'plate';
  if(metric==='circuits') asset='circuit';
  else if(metric==='prs') asset='plate';
  else if(metric==='weeks') asset='calendar';
  else if(metric==='sessions') asset=number>=50?'mountain':number>=10?'bear':'dumbbell';
  const marker=Number.isInteger(number) && number>0 && number<=999
    ? `<g class="badge-milestone"><rect x="34" y="77" width="32" height="20" rx="7" fill="#111a32" stroke="#ccd5ed" stroke-width="1"/><text class="badge-number" x="50" y="91" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="12" fill="#ffffff" stroke="none">${number}</text></g>` : '';
  return `<svg class="training-badge-art${locked ? ' is-locked' : ''}" viewBox="0 0 100 100" aria-hidden="true"><image href="assets/training-badges/${asset}-faceted-v1.webp" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>${marker}</svg>`;
}
