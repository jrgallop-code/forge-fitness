// Original classic badge artwork. No background rectangle or raster matte:
// outlines and accents inherit the active appearance, including dark themes.
const ART = {
  shoe: '<path d="M20 51l8-22 12 4 5 13 19 8q8 3 8 13H18q-4-9 2-16Z"/><path d="M19 61h51M38 42l9-3m-6 11 10-3"/><path class="badge-accent" d="m64 24 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z"/>',
  dumbbells: '<g transform="rotate(-14 44 44)"><path d="M25 25h7v21h-7zm32 0h7v21h-7zM32 33h25v6H32"/><path d="M19 48h7v21h-7zm32 0h7v21h-7zM26 56h25v6H26"/></g><path class="badge-accent" d="M67 18l3-5m5 12h5"/>',
  trophy: '<path d="M28 22h32v17q0 16-16 18-16-2-16-18Zm0 6H18v9q0 12 13 12m29-21h10v9q0 12-13 12M44 57v10m-13 4h26l4 5H27Z"/><path class="badge-accent" d="m44 30 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  calendar: '<rect x="20" y="24" width="38" height="43" rx="5"/><path d="M20 37h38M29 18v12m19-12v12M60 35h9v37H39v-3"/><path class="badge-accent" d="M32 46q11-8 14 1 1 6-13 14h15"/>',
  plant: '<path d="M44 56V35q-15 1-20-16 18-3 20 16Zm0 8V41q15 0 20-17-18-3-20 17M31 67h26M24 59h7v16h-7zm33 0h7v16h-7zM31 64h26v6H31"/><path class="badge-accent" d="M30 25l10 8m18-4-11 9"/>',
  plate: '<circle cx="44" cy="44" r="29"/><circle cx="44" cy="44" r="22"/><circle cx="44" cy="37" r="6"/><path class="badge-accent" d="m33 53 4-3v14m13-14q-5 0-5 7t5 7q5 0 5-7t-5-7Z"/>'
};
export function badgeArt(kind, { locked = false, milestone = null } = {}) {
  let art=ART[kind] || ART.trophy;
  const number=Number(milestone);
  if(Number.isInteger(number) && number>0 && number<=999){
    const text=(x,y,size)=>`<text class="badge-number" x="${x}" y="${y}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="${size}" fill="currentColor" stroke="none">${number}</text>`;
    if(kind==='plate') art='<circle cx="44" cy="44" r="29"/><circle cx="44" cy="44" r="22"/><circle cx="44" cy="35" r="6"/>'+text(44,63,14);
    if(kind==='calendar') art='<rect x="20" y="24" width="48" height="43" rx="5"/><path d="M20 37h48M29 18v12m30-12v12"/>'+text(44,59,18);
  }
  return `<svg class="training-badge-art${locked ? ' is-locked' : ''}" viewBox="0 0 88 88" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><circle class="badge-rim" cx="44" cy="44" r="41"/>${art}</svg>`;
}
