import { dateNumber, shiftCalorieDate, validateCalorieRange } from './calorie-range-model.js?v=calorie-range-1';

export function selectCalendarDate(state, date) {
    if (!state.choosingEnd) return { start: date, end: date, choosingEnd: true };
    return { start: date < state.start ? date : state.start,
        end: date < state.start ? state.start : date, choosingEnd: false };
}
export function calendarMonthCells(month) {
    const first=month+'-01',d=new Date(dateNumber(first));
    const offset=(d.getUTCDay()+6)%7;
    const next=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1));
    const days=Math.round((next.getTime()-d.getTime())/86400000);
    return Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>i<offset||i>=offset+days?null:shiftCalorieDate(first,i-offset));
}
function shiftMonth(month, step) {
    const date=new Date(dateNumber(month+'-01'));
    return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+step,1)).toISOString().slice(0,7);
}
function label(date) {return new Date(date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
function styles(){
    if(document.getElementById('lucr-calendar-styles'))return;
    const s=document.createElement('style');s.id='lucr-calendar-styles';s.textContent=`
    .lucr-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:16px 0}.lucr-calendar-head strong{font-size:16px}.lucr-calendar-weekdays,.lucr-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0}.lucr-calendar-weekdays span{text-align:center;font-size:11px;color:var(--muted,#63718b);padding-bottom:8px}.lucr-calendar-grid>span{height:42px}.lucr-calendar-grid button{border:0;background:transparent;min-height:42px;padding:0;border-radius:0;position:relative;font-size:14px;isolation:isolate}.lucr-calendar-grid button.in-range{background:color-mix(in srgb,var(--accent,#1769df) 15%,transparent)}.lucr-calendar-grid button.endpoint{background:transparent;color:white;font-weight:700}.lucr-calendar-grid button.endpoint::after{content:'';position:absolute;inset:3px;background:var(--accent,#1769df);border-radius:50%;z-index:-1}.lucr-calendar-grid button.range-start.in-range{background:linear-gradient(to right,transparent 50%,color-mix(in srgb,var(--accent,#1769df) 15%,transparent) 50%)}.lucr-calendar-grid button.range-end.in-range{background:linear-gradient(to right,color-mix(in srgb,var(--accent,#1769df) 15%,transparent) 50%,transparent 50%)}.lucr-calendar-grid button.single{background:transparent!important}.lucr-calendar-grid button:disabled{opacity:.3}.lucr-calendar-grid button:focus-visible{outline:2px solid var(--accent,#1769df);outline-offset:-2px}.lucr-calendar-selection{margin:18px 0 8px;padding:12px;border-radius:12px;background:var(--surface-2,#edf3fb);font-size:13px;line-height:1.5}.lucr-calendar-hint{min-height:20px;margin:8px 0;font-size:12px;color:var(--muted,#63718b)}.lucr-calendar-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:18px}.lucr-calendar-actions [data-apply]{background:var(--accent,#1769df);color:white}.lucr-calendar-actions button{font-size:13px;padding:9px}.lucr-dialog h3{font-size:20px}
    `;document.head.appendChild(s);
}
export function openCalorieRangeCalendar(range,today,select) {
    styles();document.getElementById('lucr-date-dialog')?.remove();
    const trigger=document.activeElement,dialog=document.createElement('dialog');
    dialog.id='lucr-date-dialog';dialog.className='lucr-dialog';dialog.setAttribute('aria-labelledby','lucr-date-heading');
    let state={...range,choosingEnd:false},month=range.end.slice(0,7);
    function render(){
        const cells=calendarMonthCells(month);
        const monthLabel=new Date(month+'-01T12:00:00').toLocaleDateString(undefined,{month:'long',year:'numeric'});
        dialog.innerHTML=`<h3 id="lucr-date-heading">Choose dates</h3><div class="lucr-calendar-head"><button data-month="-1" aria-label="Previous month">‹</button><strong>${monthLabel}</strong><button data-month="1" aria-label="Next month" ${month>=today.slice(0,7)?'disabled':''}>›</button></div><div class="lucr-calendar-weekdays" aria-hidden="true">${['M','T','W','T','F','S','S'].map(d=>'<span>'+d+'</span>').join('')}</div><div class="lucr-calendar-grid" aria-label="${monthLabel}">${cells.map(date=>{if(!date)return '<span></span>';const start=date===state.start,end=date===state.end,inside=date>=state.start&&date<=state.end;return `<button data-calendar-date="${date}" class="${inside?'in-range ':''}${start||end?'endpoint ':''}${start?'range-start ':''}${end?'range-end ':''}${start&&end?'single':''}" aria-label="${label(date)}${start?', start date':''}${end?', end date':''}" aria-pressed="${inside}" ${date>today?'disabled':''}>${Number(date.slice(-2))}</button>`;}).join('')}</div><p class="lucr-calendar-hint" aria-live="polite">${state.choosingEnd?'Now tap an end date.':'Tap a start date, then an end date.'}</p><div class="lucr-calendar-selection">${label(state.start)} → ${label(state.end)}</div><p class="lucr-error" role="alert"></p><div class="lucr-calendar-actions"><button data-week>This week</button><button data-cancel>Cancel</button><button data-apply>Apply</button></div>`;
        dialog.querySelectorAll('[data-month]').forEach(b=>b.addEventListener('click',()=>{month=shiftMonth(month,Number(b.dataset.month));render();dialog.querySelector(`[data-month="${b.dataset.month}"]`)?.focus();}));
        dialog.querySelectorAll('[data-calendar-date]').forEach(b=>b.addEventListener('click',()=>{const date=b.dataset.calendarDate;state=selectCalendarDate(state,date);render();dialog.querySelector(`[data-calendar-date="${date}"]`)?.focus();}));
        dialog.querySelector('[data-week]').addEventListener('click',()=>{const weekday=new Date(dateNumber(today)).getUTCDay();state={start:shiftCalorieDate(today,-((weekday+6)%7)),end:today,choosingEnd:false};month=today.slice(0,7);render();});
        dialog.querySelector('[data-cancel]').addEventListener('click',()=>dialog.close());
        dialog.querySelector('[data-apply]').addEventListener('click',()=>{const error=validateCalorieRange(state.start,state.end,today);dialog.querySelector('.lucr-error').textContent=error;if(error)return;select(state.start,state.end);dialog.close();});
    }
    document.body.appendChild(dialog);render();dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();},{once:true});dialog.showModal();
}
