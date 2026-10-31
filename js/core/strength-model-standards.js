import { FITNESSVOLT_MODEL_EXERCISES } from './strength-model-catalog.js';
import { strengthComparisonsEnabled, getGymComparison } from './strength-comparisons.js';

export const MODEL_TIERS=['Beginner','Novice','Intermediate','Advanced','Elite'];
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const catalogue=new Map(FITNESSVOLT_MODEL_EXERCISES.map(([slug,name])=>[normalize(name),slug]));
const slugs=new Set(FITNESSVOLT_MODEL_EXERCISES.map(([slug])=>slug));
const aliases={
 'barbell bench press':'bench-press','barbell flat bench press':'bench-press','bench press barbell':'bench-press',
 'barbell squat':'squat','back squat':'squat','barbell back squat':'squat','back squat barbell':'squat',
 'barbell deadlift':'deadlift','conventional deadlift':'deadlift','barbell conventional deadlift':'deadlift',
 'dumbbell incline press':'incline-dumbbell-bench-press','incline dumbbell press':'incline-dumbbell-bench-press',
 'incline dumbbell bench press':'incline-dumbbell-bench-press','dumbbell incline bench press':'dumbbell-incline-bench-press',
 'incline smith machine bench press':'smith-incline-bench-press','smith machine incline bench press':'smith-incline-bench-press',
 'smith machine chest press':'smith-machine-bench-press','standing barbell overhead press':'shoulder-press',
 'overhead press':'shoulder-press','barbell overhead press':'shoulder-press','barbell standing shoulder press':'shoulder-press',
 'dumbbell romanian deadlift':'dumbbell-romanian-deadlift','romanian deadlift dumbbells':'dumbbell-romanian-deadlift'
};
export function modelExercise(item) {
 const name=normalize(item.name), equipment=normalize(item.equipment);
 if(/assisted|assistance/.test(name)||equipment.includes('bodyweight'))return null;
 // Explicit equipment variants must never collapse into a different lift.
 const candidate=aliases[name]||catalogue.get(name);
 if(candidate&&slugs.has(candidate)) {
  for(const q of ['dumbbell','smith','cable','kettlebell'])if(equipment.includes(q)&&!candidate.includes(q)){const exact=catalogue.get(normalize(q+' '+name))||catalogue.get(normalize(name+' '+q));return exact||null;}
  return candidate;
 }
 for(const qualifier of ['barbell','dumbbell','smith machine','cable']){
  if(equipment.includes(qualifier)){
   const qualified=catalogue.get(normalize(qualifier+' '+name))||catalogue.get(normalize(name+' '+qualifier));
   if(qualified)return qualified;
  }
 }
 const id=String(item.exerciseId||item.id||'');
 // IDs are an exact fallback only when no differing equipment is declared.
 if(slugs.has(id)&&(!equipment||!(/dumbbell|smith|cable|machine/.test(equipment))||normalize(id).includes(equipment)))return id;
 return null;
}
export function parseModelTables(html) {
 if(typeof html!=='string'||!html.includes('BW (lbs)'))return null;
 const result={};
 for(const sex of ['male','female']){
  const body=html.match(new RegExp('<tbody[^>]*id=["\\\']bw-'+sex+'["\\\'][^>]*>([\\s\\S]*?)<\\/tbody>','i'))?.[1];
  if(!body)return null;
  const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match=>[...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>Number(cell[1].replace(/<[^>]+>/g,'').replace(/&[^;]+;|,/g,'').trim())));
  if(rows.length<2||rows.some(row=>row.length!==6||row.some(n=>!Number.isFinite(n)||n<=0)||row.slice(2).some((n,i)=>n<=row[i+1])))return null;
  rows.sort((a,b)=>a[0]-b[0]);
  if(rows.some((row,i)=>i&&row[0]<=rows[i-1][0]))return null;
  result[sex]=rows;
 }
 return result;
}
export function modelProfileReady(profile) {const bw=Number(profile?.weightLb)||Number(profile?.weightKg)*2.2046226218;return ['male','female'].includes(profile?.sex)&&Number.isFinite(bw)&&bw>0;}
export function evaluateModel(tables,item,profile) {
 const weight=Number(item.estimatedOneRepMax),bw=Number(profile?.weightLb)||Number(profile?.weightKg)*2.2046226218;
 const rows=tables?.[profile?.sex];
 if(!Array.isArray(rows)||!rows.length||rows.some(row=>!Array.isArray(row)||row.length!==6||row.some(n=>!Number.isFinite(n)||n<=0))||!Number.isFinite(bw)||bw<=0||!Number.isFinite(weight)||weight<=0||item.comparisonEligible===false)return null;
 // Same nearest-bodyweight-row rule as FitnessVolt's published methodology.
 // The logger stores dumbbell load per hand; do not double it for this comparison.
 const row=rows.reduce((best,curr)=>Math.abs(curr[0]-bw)<Math.abs(best[0]-bw)?curr:best);
 let index=0;for(let i=0;i<5;i++)if(weight>=row[i+1])index=i;
 return {tier:MODEL_TIERS[index],tierIndex:index,model:true,source:'FitnessVolt model standard',
  referenceBodyweight:row[0],belowBeginner:weight<row[1],
  nextTier:index<4?MODEL_TIERS[index+1]:null,nextWeight:index<4?row[index+2]:null,
  percentile:null,sampleSize:null};
}
const memory=new Map();
async function loadModel(slug) {
 const key='level_up_fv_model_v1_'+slug;
 if(memory.has(slug))return memory.get(slug);
 let stored;
 try {stored=JSON.parse(localStorage.getItem(key)||'null');if(stored?.tables&&Date.now()-stored.saved<7*86400000)return stored.tables;}catch{}
 const promise=(async()=>{
  try {
   const url='https://fitnessvolt.com/strength-standards/'+slug+'/';
   // Download a public reference page only. No bodyweight, age, sex or lift
   // performance is sent. Native HTTP avoids WKWebView cross-origin restrictions.
   const cap=globalThis.Capacitor;
   const http=cap?.Plugins?.CapacitorHttp||(cap?.isNativePlatform?.()?cap.registerPlugin?.('CapacitorHttp'):null);
   let html;
   if(http?.get){const r=await http.get({url,responseType:'text',connectTimeout:15000,readTimeout:15000});if(r.status!==200)return stored?.tables||null;html=r.data;}
   else {const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)return stored?.tables||null;html=await r.text();}finally{clearTimeout(timer);}}
   const canonical=typeof html==='string'?html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]:null;
   if(!canonical||new URL(canonical).pathname.replace(/\/$/,'')!==new URL(url).pathname.replace(/\/$/,''))return stored?.tables||null;
   const tables=parseModelTables(html);if(!tables)return stored?.tables||null;
   try{localStorage.setItem(key,JSON.stringify({tables,saved:Date.now()}));}catch{}
   return tables;
  }catch{return stored?.tables||null;}
 })();
 memory.set(slug,promise);const tables=await promise;if(!tables)memory.delete(slug);return tables;
}
export async function getStrengthComparison(item,profile) {
 if(!strengthComparisonsEnabled()||!modelProfileReady(profile)||item.comparisonEligible===false||!Number.isInteger(Number(item.reps))||item.reps<1||item.reps>30)return null;
 const slug=modelExercise(item);
 // Model level is independent from the optional population percentile.
 const [tables,gym]=await Promise.all([slug?loadModel(slug):null,getGymComparison(item,profile)]);
 if(!strengthComparisonsEnabled())return null;
 const model=evaluateModel(tables,item,profile);
 if(model)return {...model,sourceUrl:'https://fitnessvolt.com/strength-standards/'+slug+'/',percentile:gym?.percentile??null,sampleSize:gym?.sampleSize??null};
 return gym?{...gym,model:false}:null;
}
