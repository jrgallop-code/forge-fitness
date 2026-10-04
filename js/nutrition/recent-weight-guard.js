import { calculateTrendWeightSeries, normalizeWeightEntries } from '../core/weight-trend.js?v=recent-weight-guard-1';
const DAY=86400000;
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const ms=date=>Date.parse(date+'T00:00:00Z');
const shift=(date,n)=>new Date(ms(date)+n*DAY).toISOString().slice(0,10);
export const RECENT_GUARD_THRESHOLDS={disagreement:.3,nearGoal:.2,minWeighIns:5,minFoodDays:6,maxStaleDays:2};

export function buildRecentWeightEvidence({weights=[],foodLog={},completedDays={},asOfDate,longRate,targetRate}={}) {
    const rules=RECENT_GUARD_THRESHOLDS;
    if(!Number.isFinite(ms(asOfDate)))return {confidence:'insufficient',reason:'date',recentRate:null};
    const actual=normalizeWeightEntries(weights).filter(d=>d.date<=asOfDate),end=actual.at(-1)?.date;
    const long=number(longRate),target=number(targetRate);
    if(!end)return {confidence:'insufficient',reason:'weigh-ins',recentRate:null};
    const baseline=shift(end,-7),weekStart=shift(end,-6);
    const count=actual.filter(d=>d.date>=weekStart&&d.date<=end).length;
    const baselineCovered=actual.some(d=>Math.abs(ms(d.date)-ms(baseline))<=DAY);
    const staleDays=Math.round((ms(asOfDate)-ms(end))/DAY);
    const series=calculateTrendWeightSeries(actual,{endDate:end,allowFuture:true});
    const startPoint=series.find(d=>d.date===baseline),endPoint=series.at(-1);
    const recent=startPoint&&endPoint?endPoint.weight-startPoint.weight:null;
    // Match calorie evidence to seven finished calendar days, excluding today's partial log.
    const foodEnd=shift(asOfDate,-1),foodStart=shift(foodEnd,-6);
    const foodDates=Array.from({length:7},(_,i)=>shift(foodStart,i));
    const foodDays=foodDates.filter(date=>completedDays[date]!==false&&Array.isArray(foodLog[date])&&foodLog[date].length>0).length;
    const confirmedFoodDays=foodDates.filter(date=>completedDays[date]===true&&Array.isArray(foodLog[date])&&foodLog[date].length>0).length;
    const adequate=count>=rules.minWeighIns&&baselineCovered&&staleDays<=rules.maxStaleDays&&confirmedFoodDays>=rules.minFoodDays&&recent!==null&&long!==null&&target!==null;
    const difference=recent!==null&&long!==null?Math.abs(long-recent):null;
    return {confidence:adequate?'available':'insufficient',reason:adequate?null:'coverage',recentRate:recent,longRate:long,targetRate:target,difference,recentNearGoal:recent!==null&&target!==null&&Math.abs(recent-target)<=rules.nearGoal+1e-9,disagrees:difference!==null&&difference>=rules.disagreement-1e-9,weighIns:count,baselineCovered,staleDays,foodDays,confirmedFoodDays,startDate:baseline,endDate:end};
}
export function decideRecentWeightGuard(evidence,requestedChange) {
    const direction=Math.sign(requestedChange);
    if(!direction)return {...evidence,hold:false,confidence:'no-adjustment'};
    if(!evidence||evidence.confidence==='insufficient')return {...evidence,hold:true,confidence:'insufficient'};
    const recentDirection=Math.sign(evidence.targetRate-evidence.recentRate);
    const conflict=evidence.disagrees&&(evidence.recentNearGoal||recentDirection!==direction);
    return {...evidence,hold:conflict,confidence:conflict?'conflicting':'supported'};
}
export function recentWeightGuardCopy(guard,calories) {
    if(guard?.confidence==='insufficient')return `Keep ${Math.round(calories)} kcal/day this week. Recent weigh-ins or completed food logs are too limited to confirm a calorie change. Continue logging and mark finished food days complete and reassess at your next weekly check-in.`;
    const rate=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2)+' lb/week';
    return `Your three-week trend is ${rate(guard.longRate)}, but your latest seven-day trend is ${rate(guard.recentRate)} versus a goal of ${rate(guard.targetRate)}. Recent changes can reflect water weight or a changing pace. Keep ${Math.round(calories)} kcal/day this week and reassess at your next weekly check-in.`;
}
