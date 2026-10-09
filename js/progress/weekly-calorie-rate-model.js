import {normalizeWeightEntries,calculateVisibleWeightTrend} from '../core/weight-trend.js';
const DAY=86400000;
const ms=d=>Date.parse(d+'T12:00:00Z');
const date=t=>new Date(t).toISOString().slice(0,10);
export function buildWeeklyCalorieRate({weights=[],foodLog={},completeDays={},today,weeks=8}){
 const end=ms(today);if(!Number.isFinite(end))return [];
 const weekday=new Date(end).getUTCDay();const monday=end-((weekday+6)%7)*DAY;
 const normalized=normalizeWeightEntries(weights).filter(w=>w.date<=today);
 return Array.from({length:weeks},(_,i)=>{
  const start=monday-(weeks-1-i)*7*DAY, stop=Math.min(start+6*DAY,end);
  const startDate=date(start),endDate=date(stop);let foodDays=0,total=0;
  for(let t=start;t<=stop;t+=DAY){
   const d=date(t),entries=foodLog[d];
   if(d===today && completeDays[d]!==true)continue;
   if(!Array.isArray(entries)||!entries.length)continue;
   const calories=entries.reduce((sum,e)=>sum+Math.max(0,Number(e?.nutrition?.calories)||0),0);
   if(calories<=0)continue;foodDays++;total+=calories;
  }
  const weighIns=normalized.filter(w=>w.date>=startDate&&w.date<=endDate).length;
  const trend=calculateVisibleWeightTrend(normalized,{endDate});
  return {startDate,endDate,foodDays,weighIns,partial:endDate<date(start+6*DAY),calories:foodDays>=4?total/foodDays:null,rate:weighIns&&Number.isFinite(trend.weeklyChange)?trend.weeklyChange:null};
 });
}
