const DAY = 86400000;
export function dateNumber(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return NaN;
    const value = Date.parse(key + 'T00:00:00Z');
    return Number.isFinite(value) && new Date(value).toISOString().slice(0,10) === key ? value : NaN;
}
export const shiftCalorieDate = (key, days) => new Date(dateNumber(key) + days * DAY).toISOString().slice(0,10);
export function calorieRangeLength(start, end) { return Math.round((dateNumber(end)-dateNumber(start))/DAY)+1; }
export function validateCalorieRange(start, end, today) {
    const length = calorieRangeLength(start,end);
    if (!Number.isFinite(length)) return 'Choose valid start and end dates.';
    if (length < 1) return 'The end date must be on or after the start date.';
    if (end > today) return 'Choose an end date on or before today.';
    if (length > 366) return 'Choose a range of up to 366 days.';
    return '';
}
export function summarizeCalorieRange(log, completed, start, end, today) {
    if (validateCalorieRange(start,end,today)) return null;
    const days=Array.from({length:calorieRangeLength(start,end)},(_,i)=>{
        const date=shiftCalorieDate(start,i), entries=Array.isArray(log?.[date])?log[date]:[];
        const complete=completed?.[date]===true;
        const calories=entries.reduce((sum,e)=>sum+Math.max(0,Number(e?.nutrition?.calories)||0),0);
        const logged=entries.length>0 || complete;
        return {date,calories,logged,complete,included:logged&&(date!==today||complete)};
    });
    const included=days.filter(d=>d.included);
    return {start,end,days,loggedDays:days.filter(d=>d.logged).length,completeDays:days.filter(d=>d.complete).length,includedDays:included.length,average:included.length?included.reduce((sum,d)=>sum+d.calories,0)/included.length:null};
}
export function compareCalorieRange(log,completed,start,end,today) {
    const current=summarizeCalorieRange(log,completed,start,end,today);
    if (!current) return null;
    const length=current.days.length;
    const previous=summarizeCalorieRange(log,completed,shiftCalorieDate(start,-length),shiftCalorieDate(start,-1),today);
    return {current,previous,difference:current.average!==null&&previous.average!==null?current.average-previous.average:null};
}
