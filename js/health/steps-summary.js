/* Read-only Apple Health step summaries. Never persist step records. */
const GOAL_KEY = "levelup_daily_steps_goal_v1";
export const DEFAULT_DAILY_STEPS_GOAL = 10000;
export function localStepsDateKey(date = new Date()) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
export function stepsForToday(data, today = new Date()) {
  const dateKey = localStepsDateKey(today);
  const record = (data?.steps || []).find(row => row?.date === dateKey);
  if (!record || record.steps === null || record.steps === undefined || !Number.isFinite(Number(record.steps)) || Number(record.steps)<0) return null;
  return Math.round(Number(record.steps));
}
export function lastSevenDaysSteps(data, today = new Date()) {
  const days = Array.from({length:7}, (_,index)=>{
    const date = new Date(today.getFullYear(),today.getMonth(),today.getDate()-6+index,12);
    return localStepsDateKey(date);
  });
  const byDate = new Map((data?.steps || []).filter(r => r && typeof r.date === "string").map(r => [r.date, r.steps]));
  const values = days.map(date => {
    const value = byDate.get(date);
    return value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value)<0 ? null : Math.round(Number(value));
  });
  const present = values.filter(x=>x !== null);
  const total = present.reduce((n,v)=>n+v,0);
  return {dates:days,values,total,average:present.length?Math.round(total/present.length):null,recordedDays:present.length,today:values.at(-1)};
}
export function getDailyStepsGoal() {
  try {
    const raw=localStorage.getItem(GOAL_KEY);
    if (raw === null) return DEFAULT_DAILY_STEPS_GOAL;
    const value=Number(raw);
    return Number.isInteger(value) && value>=1000 && value<=100000?value:DEFAULT_DAILY_STEPS_GOAL;
  } catch { return DEFAULT_DAILY_STEPS_GOAL; }
}
export function setDailyStepsGoal(value) {
  const goal=Number(value);
  if (!Number.isInteger(goal) || goal<1000 || goal>100000) return false;
  try { localStorage.setItem(GOAL_KEY,String(goal)); } catch { return false; }
  return true;
}
