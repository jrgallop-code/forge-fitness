import { strengthComparisonsEnabled, getGymComparison, comparisonLift, STRENGTH_COMPARISONS_EVENT } from '../core/strength-comparisons.js';
import { getNutritionProfile } from '../nutrition/nutrition-storage.js?v=profile-appearance-1';
import { resolveSessionExerciseIdentity } from '../workouts/session-exercise-identity.js?v=repair-generic-exercise-1';
import { UNIT_KINDS, formatMass } from '../core/unit-system.js?v=granular-units-1';

const tierNames = ['Beginner','Novice','Intermediate','Advanced','Elite'];
const tierColors = ['#699fff','#36cbd4','#82d79b','#f4c864','#ed83b6'];
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recentComparisonSets(sessions, now=Date.now(), resolve=item=>item.name) {
  const best = new Map(), cutoff = now - 30*86400000;
  for(const session of sessions) {
    const date = Date.parse(session.completedAt || session.date);
    if(!Number.isFinite(date) || date < cutoff || date > now || session.adaptiveGuidance?.isDeload) continue;
    for(const exercise of session.exercises || []) {
      const name = resolve(exercise), lift = comparisonLift(name);
      if(!lift || exercise.trackingType==='notes') continue;
      for(const set of exercise.sets || []) {
        const weight=Number(set.weight), reps=Number(set.reps);
        if(set.completed===false || set.isWarmup || set.warmup || ['warmup','drop','drop-set'].includes(set.type) ||
            !Number.isFinite(weight) || weight<=0 || !Number.isInteger(reps) || reps<1 || reps>12) continue;
        const estimatedOneRepMax=weight*(1+reps/30);
        if(!best.has(lift) || best.get(lift).estimatedOneRepMax<estimatedOneRepMax)
          best.set(lift,{name,lift,weight,reps,estimatedOneRepMax,date:session.completedAt||session.date});
      }
    }
  }
  return [...best.values()];
}
function readSets() {
  try {const sessions=JSON.parse(localStorage.getItem('forge_workout_sessions')||'[]');
    return recentComparisonSets(Array.isArray(sessions)?sessions:[],Date.now(),item=>resolveSessionExerciseIdentity(item).name);
  } catch {return [];}
}
function ensureStyles() {
  if(document.getElementById('strength-profile-styles'))return;
  const style=document.createElement('style');style.id='strength-profile-styles';style.textContent=`
  .strength-profile,.strength-profile *{box-sizing:border-box;min-width:0}.strength-profile{width:100%;max-width:100%}
  .strength-profile-header{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
  .strength-profile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:16px;margin-top:18px}
  .strength-lift{background:var(--card,#1c1c22);border:1px solid var(--border,#34343a);border-radius:22px;padding:18px;color:var(--text,#f7f7f8);overflow:hidden}
  .strength-lift h3{font-size:17px;margin:0 0 12px}.strength-lift .strength-tier{font-size:12px;font-weight:750;display:inline-block;padding:6px 10px;border-radius:8px;background:color-mix(in srgb,var(--strength-color) 18%,var(--card,#1c1c22));color:var(--text,#f7f7f8)}
  .strength-big{font-size:clamp(30px,7vw,44px);font-weight:850;letter-spacing:-1px;margin:16px 0 4px}.strength-small{font-size:12px;color:var(--text-secondary,var(--muted,#aaaab3));line-height:1.5}
  .strength-bands{display:flex;gap:4px;margin:22px 0 12px}.strength-bands i{flex:1;height:9px;border-radius:5px;background:var(--band);opacity:.35}.strength-bands i.active{opacity:1}
  .strength-legend{display:flex;flex-wrap:wrap;gap:7px 12px;font-size:11px;margin-bottom:18px}.strength-legend span{display:flex;align-items:center;gap:4px}.strength-legend i{width:6px;height:6px;border-radius:50%;background:var(--band)}
  .strength-pages{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;scrollbar-width:none}.strength-pages>section{flex:0 0 100%;width:100%;scroll-snap-align:start;padding:0 2px}
  .strength-page-controls{display:flex;justify-content:center;gap:8px;margin-top:14px}.strength-page-controls button{min-height:36px;padding:7px 12px;border:0;border-radius:8px;background:var(--surface,var(--card,#202026));color:var(--text,#f7f7f8);font-size:12px}.strength-page-controls button[aria-pressed=true]{box-shadow:inset 0 -2px var(--strength-color)}
  .strength-curve{width:100%;height:auto;display:block;margin:16px 0}.strength-curve text{font-size:11px;fill:var(--text-secondary,var(--muted,#aaaab3))}
  .strength-dashboard-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}.strength-dashboard-slots button{font:inherit;text-align:left;background:transparent;border:0;border-left:3px solid var(--strength-color);padding:0 0 0 8px;color:var(--text,#f7f7f8)}.strength-dashboard-slots strong,.strength-dashboard-slots small{display:block;overflow-wrap:anywhere}.strength-dashboard-slots strong{font-size:12px}.strength-dashboard-slots small{font-size:11px;margin-top:4px}.strength-profile-credit{display:block;font-size:11px;color:var(--text-secondary,var(--muted,#aaaab3));margin-top:14px}.strength-profile-launch{margin:12px 0}
  `;document.head.appendChild(style);
}
export function renderStrengthProfile() {
  return `<section class="section-card strength-profile" data-strength-profile><div class="strength-profile-header"><div><span class="eyebrow">PROGRESS</span><h2>Strength Profile</h2></div><button type="button" class="secondary-btn" data-strength-back>Back to Progress</button></div>
  <p class="section-description">Best qualifying estimated 1RM from the last 30 days. Gym-lifter comparisons are optional.</p>
  <div data-strength-profile-results role="status">Loading your lifts…</div>
  <details><summary>How these comparisons work</summary><p>Ratings and percentiles here both come from FitnessVolt’s self-reported gym dataset. They are not its separate model-based level tables or competition ratings. Comparison groups use available bodyweight, sex and age information. An estimated 1RM is an estimate, not a tested maximum.</p><p>Only supported exact exercise matches and sets of 1–12 reps are compared. Warm-ups, unsupported variations and missing comparison data are omitted. A rating describes one lift, not your training experience.</p><p>The curve is a standard-normal percentile illustration. It does not show the actual distribution of weights lifted.</p></details></section>`;
}
export function percentileCurve(percentile) {
  // Invert a normal-CDF approximation to place a percentile on a schematic
  // standard-normal curve. Never imply that the underlying lift data is normal.
  const cdf=z=>{const t=1/(1+.2316419*Math.abs(z));const p=1-Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return z<0?1-p:p;};
  let lo=-3.5,hi=3.5;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(cdf(mid)<percentile/100)lo=mid;else hi=mid;}
  const z=(lo+hi)/2,x=20+(z+3.5)/7*280,y=125-Math.exp(-z*z/2)*95;
  const points=Array.from({length:101},(_,i)=>{const t=-3.5+i*.07;return [20+i*2.8,125-Math.exp(-t*t/2)*95];});
  const path=points.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ');
  const left=points.filter(p=>p[0]<x);const area='M20,125 '+left.map(p=>'L'+p.join(',')).join(' ')+` L${x},${y} L${x},125 Z`;
  return `<svg class="strength-curve" viewBox="0 0 320 155" role="img" aria-label="Schematic normal-curve illustration of the ${percentile}th percentile; not a measured lift distribution"><path d="${area}" fill="var(--strength-color)" opacity=".24"/><path d="${path}" fill="none" stroke="var(--strength-color)" stroke-width="2.5"/><path d="M${x},${y}V125" stroke="currentColor" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="4" fill="currentColor"/><text x="${x}" y="${Math.max(15,y-12)}" text-anchor="middle">You</text><text x="20" y="148">Lower</text><text x="160" y="148" text-anchor="middle">Typical</text><text x="300" y="148" text-anchor="end">Higher</text></svg>`;
}
function liftCard(item,rating) {
  const mass=formatMass(item.estimatedOneRepMax,0,UNIT_KINDS.LIFTING_WEIGHT);
  return `<article class="strength-lift" style="--strength-color:${tierColors[rating.tierIndex]}"><h3>${esc(item.name)}</h3><div class="strength-pages">
    <section aria-label="Strength level"><span class="strength-tier">${rating.tier}</span><div class="strength-big">${esc(mass)}</div><div class="strength-small">Estimated 1RM</div>
    <div class="strength-bands" aria-hidden="true">${tierColors.map((c,i)=>`<i class="${i===rating.tierIndex?'active':''}" style="--band:${c}"></i>`).join('')}</div>
    <div class="strength-legend">${tierNames.map((t,i)=>`<span style="--band:${tierColors[i]}"><i></i>${t}</span>`).join('')}</div><p class="strength-small">${esc(formatMass(item.weight,1,UNIT_KINDS.LIFTING_WEIGHT))} × ${item.reps} reps<br>Self-reported gym-lifter rating</p></section>
    <section aria-label="Percentile"><div class="strength-big">${rating.percentile}<small style="font-size:15px"> percentile</small></div>${percentileCurve(rating.percentile)}<p class="strength-small">Above approximately ${rating.percentile}% of results in the matched gym-lifter sample.</p><p class="strength-small">${rating.sampleSize.toLocaleString()} sample results · Matched using your Body Profile.</p><p class="strength-small">Schematic percentile illustration</p></section></div>
    <div class="strength-page-controls"><button type="button" data-strength-page="0" aria-pressed="true">Level</button><button type="button" data-strength-page="1" aria-pressed="false">Percentile →</button></div></article>`;
}
function bindCards(root) {
  root.querySelectorAll('.strength-lift').forEach(card=>{
    const pages=card.querySelector('.strength-pages'),buttons=[...card.querySelectorAll('[data-strength-page]')];
    buttons.forEach((button,i)=>button.addEventListener('click',()=>pages.scrollTo({left:i*pages.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})));
    pages.addEventListener('scroll',()=>{const index=Math.round(pages.scrollLeft/Math.max(1,pages.clientWidth));buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));},{passive:true});
  });
}
const credit=()=>'<a class="strength-profile-credit" href="https://fitnessvolt.com/strength-standards/" target="_blank" rel="noopener">Strength standards data by FitnessVolt</a>';
async function ratedSets(limit=Infinity) {
  const profile=getNutritionProfile(),sets=readSets().slice(0,limit);
  return (await Promise.all(sets.map(async item=>({item,rating:await getGymComparison(item,profile)})))).filter(row=>row.rating);
}
export async function initializeStrengthProfile(root,onBack) {
  ensureStyles();root.querySelector('[data-strength-back]')?.addEventListener('click',onBack);
  const host=root.querySelector('[data-strength-profile-results]');if(!host)return;
  if(!strengthComparisonsEnabled()){host.textContent='Strength comparisons are off. You can enable them in More → Strength comparisons.';return;}
  const rows=await ratedSets();if(!host.isConnected||!strengthComparisonsEnabled())return;
  host.innerHTML=rows.length?`<div class="strength-profile-grid">${rows.map(({item,rating})=>liftCard(item,rating)).join('')}</div>${credit()}`:'No comparisons available yet. Complete a supported lift and add your sex and bodyweight in More → Body Profile. If you have already done this, comparison data may be temporarily unavailable.';
  bindCards(host);
}
export function mountStrengthProfileEntry(root,open) {
  if(!strengthComparisonsEnabled())return;ensureStyles();
  const lifting=root.querySelector('#lifting-progress');if(!lifting)return;
  const button=document.createElement('button');button.type='button';button.className='secondary-btn strength-profile-launch';button.dataset.strengthComparisonUi='';button.textContent='Strength Profile →';button.addEventListener('click',open);lifting.prepend(button);
}
export async function mountStrengthDashboard(root,open) {
  if(!strengthComparisonsEnabled())return;ensureStyles();
  const sets=readSets();if(!sets.length)return;
  const section=document.createElement('section');section.className='section-card strength-profile';section.dataset.strengthComparisonUi='';section.innerHTML='<div class="strength-profile-header"><h3>Strength Profile</h3><button class="secondary-btn" type="button">View profile →</button></div><div class="strength-dashboard-slots" role="status">Loading…</div>';
  section.querySelector('button').addEventListener('click',open);
  const anchor=root.querySelector('.dashboard-detail-grid');if(anchor)anchor.before(section);else root.append(section);
  const rows=await ratedSets(3);if(!section.isConnected||!strengthComparisonsEnabled())return;
  if(!rows.length){section.remove();return;}
  section.querySelector('.strength-dashboard-slots').innerHTML=rows.map(({item,rating})=>`<button type="button" style="--strength-color:${tierColors[rating.tierIndex]}"><strong>${esc(item.name)}</strong><small>${rating.tier}</small><small>${rating.percentile} percentile</small></button>`).join('');
  section.querySelectorAll('.strength-dashboard-slots button').forEach(b=>b.addEventListener('click',open));section.insertAdjacentHTML('beforeend',credit());
}
if(typeof window!=='undefined')window.addEventListener(STRENGTH_COMPARISONS_EVENT,()=>{
  if(!strengthComparisonsEnabled())document.querySelectorAll('[data-strength-comparison-ui],[data-strength-profile]').forEach(node=>node.remove());
});
