/* Exact Level Up 'level-up' fixed set-band palette without athlete-app theme services. */
export const SET_RANGE_LABELS=["0","0.5–2","2.5–4","4.5–6","6.5–8","8.5–10","10.5–12","12.5+"];
const PALETTE=["#353D49","#8170C9","#5598EC","#35C3D3","#83CF70","#F1D65A","#F3A24B","#F27768"];
export function getSetBandIndex(value){const sets=Number(value);return!Number.isFinite(sets)||sets<=0?0:Math.min(7,Math.ceil(sets/2))}
export function getSetBandColor(value){return PALETTE[getSetBandIndex(value)]}
export function renderSetRangeLegend(){return '<div class="set-range-legend" aria-label="Sets per muscle group colour ranges"><strong>Sets</strong><div>'+SET_RANGE_LABELS.map((label,index)=>'<span><b aria-hidden="true" style="background:'+PALETTE[index]+'"></b>'+label+'</span>').join("")+'</div><small>Primary muscles count as 1 set; secondary muscles as 0.5.</small></div>'}
