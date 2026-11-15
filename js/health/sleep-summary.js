/* Read-only summaries from Apple Health, without persisting sleep records. */
export function sleepSummary(data) {
  const valid=(Array.isArray(data?.sleep)?data.sleep:[])
    .filter(row=>row && typeof row.date==="string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.hours !== null && row.hours !== undefined && row.hours !== "" && Number.isFinite(Number(row.hours)) && Number(row.hours)>=0)
    .map(row=>({date:row.date,hours:Number(row.hours)}))
    .sort((a,b)=>a.date.localeCompare(b.date));
  // HealthKit may include more than one item per day; keep latest day values
  // rather than counting duplicate dates as separate nights.
  const byDate=new Map(valid.map(row=>[row.date,row]));
  const recent=[...byDate.values()].slice(-7);
  const latest=recent.at(-1)??null;
  const total=recent.reduce((sum,row)=>sum+row.hours,0);
  return {latest,average:recent.length?total/recent.length:null,nights:recent.length,recent};
}
export function formatSleepDuration(hours){
  if(!Number.isFinite(hours)||hours<0)return "—";
  const minutes=Math.round(hours*60);
  return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,"0")}m`;
}
