/* Level Up Coach private booking workspace. Browser-local scheduling only; no live notifications. */
const KEY="level_up_coach_booking_v4",TODAY=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const dateAdd=(s,n)=>{const [y,m,d]=s.split("-").map(Number);const x=new Date(y,m-1,d+n);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const pretty=(s)=>new Date(s+"T12:00:00").toLocaleDateString("en-CA",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
const mins=s=>{const [h,m]=s.split(":").map(Number);return h*60+m},time=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const E=(tag,a={},children=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(a)){if(k==="text")n.textContent=v;else if(k==="className")n.className=v;else if(k==="onClick")n.onclick=v;else if(k==="value")n.value=v;else n.setAttribute(k,v)}n.append(...children);return n};
const btn=(s,fn)=>E("button",{type:"button",className:"btn light",text:s,onClick:fn});
const field=(name,node)=>E("label",{className:"booking-field"},[E("span",{text:name}),node]);
const inp=(type,value)=>{const el=E("input",{type});if(value!=null)el.value=value;return el};
const select=(values,value)=>{const n=E("select");values.forEach(([a,b])=>n.append(E("option",{value:b,text:a})));n.value=value;return n};
const now=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);
const hours=()=>({0:null,1:[540,1020],2:[540,1020],3:[540,1020],4:[540,1020],5:[540,900],6:null});
const initial=()=>({types:[{id:"t1",name:"Personal Training",minutes:60,capacity:1,place:"Gym",archived:false},{id:"t2",name:"Nutrition Consultation",minutes:30,capacity:1,place:"Video call",archived:false},{id:"t3",name:"Form Review",minutes:30,capacity:1,place:"Video call",archived:false},{id:"t4",name:"Group Training",minutes:60,capacity:6,place:"Gym",archived:false}],coaches:[{id:"c1",name:"Head Coach",hours:hours()},{id:"c2",name:"Assistant Coach",hours:hours()}],clients:["Sarah Carter","Mike Johnson","Katie Lee"],bookings:[],activity:[]});
let store=initial();try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&Array.isArray(x.types)&&Array.isArray(x.coaches)&&Array.isArray(x.bookings))store=x}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch{}}
let view="calendar",calendarMode="month",chosen=TODAY(),coachFilter="all",clientFilter="all",archived=false;
const nav=document.getElementById("nav"),old=nav?.querySelector('[data-view="calendar"]'),page=document.getElementById("calendar");
if(!nav||!page)throw Error("Booking view unavailable");
const links=E("div",{className:"booking-nav"},[E("div",{className:"booking-nav-title",text:"BOOKING"}),...["calendar","types","availability","activities"].map((x,i)=>btn(["Calendar","Session Types","Availability","Booking Activities"][i],()=>open(x)))]);
old?.replaceWith(links);
page.replaceChildren();const title=E("div",{className:"head"}),filter=E("div",{className:"booking-filter"}),body=E("div"),message=E("p",{className:"sub",text:"Preview bookings are saved only to this browser. No clients receive real emails, push notifications or calendar invitations."});page.append(title,message,filter,body);
function open(next){view=next;document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x===page));nav.querySelectorAll("button").forEach(x=>x.classList.remove("active"));links.querySelectorAll("button").forEach((x,i)=>x.classList.toggle("active",["calendar","types","availability","activities"][i]===view));document.getElementById("crumb").textContent={calendar:"Calendar",types:"Session Types",availability:"Availability",activities:"Booking Activities"}[view];render();window.scrollTo(0,0)}
function heading(h,description,button){title.replaceChildren(E("div",{},[E("span",{className:"eyebrow",text:"BOOKING & SCHEDULING"}),E("h1",{text:h}),E("p",{className:"muted",text:description})]));if(button)title.append(button)}
function render(){filter.replaceChildren();body.replaceChildren();message.textContent="Demo-only booking calendar. Scheduled activities persist in this browser; invitations, reminders and Google Calendar sync require backend integration.";({calendar:renderCalendar,types:renderTypes,availability:renderAvailability,activities:renderActivities})[view]();}
function error(text){message.textContent=text;message.style.color="#bb4040"}
function succeeded(text){message.textContent=text;message.style.color="#28825e"}
function typeBy(id){return store.types.find(x=>x.id===id)}
function coachBy(id){return store.coaches.find(x=>x.id===id)}
function valid(b,ignored){
const type=typeBy(b.typeId),trainer=coachBy(b.coachId);if(!type||!trainer)return"Choose a session type and coach.";
if(!b.clients?.length)return"Select at least one client.";if(b.clients.length>type.capacity)return"Too many clients for session capacity.";
const d=new Date(b.date+"T12:00:00"),range=trainer.hours?.[d.getDay()],start=mins(b.start),end=start+b.minutes;
if(!range||start<range[0]||end>range[1])return"Selected coach is not available during these hours.";
if(store.bookings.some(x=>x.id!==ignored&&x.status!=="canceled"&&x.date===b.date&&start<mins(x.start)+x.minutes&&end>mins(x.start)&&(x.coachId===b.coachId||x.clients.some(c=>b.clients.includes(c)))))return"Time conflicts with an existing coach or client booking.";
return null}
function monthDays(day){const [y,m]=day.split("-").map(Number),first=new Date(y,m-1,1),start=dateAdd(day.slice(0,8)+"01",-first.getDay());return Array.from({length:42},(_,i)=>dateAdd(start,i))}
function sessions(day){return store.bookings.filter(x=>x.date===day&&x.status!=="canceled"&&(coachFilter==="all"||x.coachId===coachFilter)&&(clientFilter==="all"||x.clients.includes(clientFilter))).sort((a,b)=>a.start.localeCompare(b.start))}
function sessionButton(b){return E("button",{className:"booking-item",text:b.start+" "+typeBy(b.typeId)?.name+" · "+b.clients.map(x=>x.split(" ")[0]).join(", "),onClick:()=>editBooking(b.id)})}
function renderCalendar(){
heading("Calendar","Month, week and hourly day views with shared trainer availability.",btn("+ Book a session",()=>editBooking(null)));
const back=btn("←",()=>{chosen=dateAdd(chosen,calendarMode==="month"?-28:calendarMode==="week"?-7:-1);render()}),next=btn("→",()=>{chosen=dateAdd(chosen,calendarMode==="month"?28:calendarMode==="week"?7:1);render()}),today=btn("Today",()=>{chosen=TODAY();render()});
const mode=select([["Month","month"],["Week","week"],["Day / Hour","day"]],calendarMode);mode.onchange=()=>{calendarMode=mode.value;render()};
const coaches=select([["All coaches","all"],...store.coaches.map(x=>[x.name,x.id])],coachFilter);coaches.onchange=()=>{coachFilter=coaches.value;render()};
const clients=select([["All clients","all"],...store.clients.map(x=>[x,x])],clientFilter);clients.onchange=()=>{clientFilter=clients.value;render()};
filter.append(back,today,next,E("strong",{text:pretty(chosen)}),mode,coaches,clients);
const layout=E("div",{className:"booking-layout"}),main=E("div",{className:"card booking-main"}),sidebar=E("div",{className:"card booking-inspector"},[E("h2",{text:"Selected day"}),E("h3",{text:pretty(chosen)})]);layout.append(main,sidebar);body.append(layout);
if(calendarMode==="month"){const g=E("div",{className:"booking-month"});["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(x=>g.append(E("b",{text:x,className:"booking-weekday"})));monthDays(chosen).forEach(d=>{const cell=E("div",{className:"booking-date"}),button=btn(String(Number(d.slice(-2))),()=>{chosen=d;calendarMode="day";render()});button.className="booking-number";cell.append(button);sessions(d).slice(0,3).forEach(s=>cell.append(sessionButton(s)));g.append(cell)});main.append(g)}
if(calendarMode==="week"){const start=dateAdd(chosen,-new Date(chosen+"T12:00:00").getDay()),g=E("div",{className:"booking-week"});for(let i=0;i<7;i++){const d=dateAdd(start,i),col=E("div",{className:"booking-week-col"},[btn(d.slice(-2)+" "+["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i],()=>{chosen=d;calendarMode="day";render()})]);sessions(d).forEach(x=>col.append(sessionButton(x)));col.append(btn("+",()=>editBooking(null,d)));g.append(col)}main.append(g)}
if(calendarMode==="day"){const coaches=coachFilter==="all"?store.coaches:store.coaches.filter(x=>x.id===coachFilter),g=E("div",{className:"booking-hours"});g.style.gridTemplateColumns="75px repeat("+coaches.length+", minmax(155px,1fr))";g.append(E("strong",{text:"Time"}));coaches.forEach(c=>g.append(E("strong",{text:c.name})));
for(let t=420;t<1260;t+=30){g.append(E("span",{text:time(t),className:"booking-time"}));coaches.forEach(c=>{const range=c.hours?.[new Date(chosen+"T12:00:00").getDay()],busy=sessions(chosen).find(s=>s.coachId===c.id&&t>=mins(s.start)&&t<mins(s.start)+s.minutes);
const open=!!range&&t>=range[0]&&t+30<=range[1],block=E("button",{className:"booking-slot"+(!open?" unavailable":"")+(busy?" busy":""),text:busy?(typeBy(busy.typeId)?.name||"Booked"):(open?"+ Available":"Unavailable"),onClick:()=>{if(busy)editBooking(busy.id);else if(open)editBooking(null,chosen,time(t),c.id)}});g.append(block)})}main.append(g)}
sidebar.append(E("p",{className:"sub",text:sessions(chosen).length+" booked sessions"}));sessions(chosen).forEach(s=>sidebar.append(sessionButton(s)));sidebar.append(btn("+ Book selected date",()=>editBooking(null,chosen)),btn("Hourly availability",()=>{calendarMode="day";render()}));}
function editBooking(id=null,date=chosen,timeSlot="09:00",coachId=null){
const old=store.bookings.find(x=>x.id===id),editing=!!old;
const panel=E("div",{className:"booking-form card"}),form=E("form"),t=select(store.types.filter(x=>!x.archived||x.id===old?.typeId).map(x=>[x.name,x.id]),old?.typeId||store.types.find(x=>!x.archived)?.id);
const trainer=select(store.coaches.map(x=>[x.name,x.id]),old?.coachId||coachId||store.coaches[0]?.id);
const dateInput=inp("date",old?.date||date),start=inp("time",old?.start||timeSlot),duration=inp("number",old?.minutes||typeBy(t.value)?.minutes||60),location=inp("text",old?.location||typeBy(t.value)?.place||"Gym");
duration.min=15;duration.max=360;duration.step=15;const note=E("textarea",{rows:"3"});note.value=old?.note||"";
const attendees=E("div",{className:"booking-client-choices"});store.clients.forEach(c=>{const ch=inp("checkbox");ch.checked=old?.clients.includes(c)||false;attendees.append(E("label",{},[ch,E("span",{text:c})]))});if(!editing)attendees.querySelector("input").checked=true;
const chosenClients=()=>[...attendees.querySelectorAll("label")].filter(x=>x.querySelector("input").checked).map(x=>x.querySelector("span").textContent);
t.onchange=()=>{duration.value=typeBy(t.value)?.minutes||30;location.value=typeBy(t.value)?.place||"Gym"};
const header=E("div",{className:"row between"},[E("h2",{text:editing?"Edit booking":"Create booking"}),btn("Close",()=>panel.remove())]);panel.append(header);
form.append(E("div",{className:"booking-form-grid"},[field("Session type",t),field("Trainer",trainer),field("Date",dateInput),field("Start time",start),field("Minutes",duration),field("Location / video link",location)]),E("h3",{text:"Clients (select one or more)"}),attendees,field("Internal notes",note));
const confirmation=E("p",{className:"sub",text:"Local preview only. Saving does not send invitations or reminders."});
const saveButton=E("button",{className:"btn",type:"submit",text:editing?"Save changes":"Book session"});form.append(saveButton,confirmation);
if(editing)form.append(btn("Cancel booking",()=>{old.status="canceled";store.activity.unshift({kind:"Canceled",date:old.date,title:typeBy(old.typeId)?.name});save();panel.remove();render();succeeded("Canceled in this browser only. No client notification was sent.")}));
form.onsubmit=e=>{e.preventDefault();const obj={id:old?.id||now(),typeId:t.value,coachId:trainer.value,date:dateInput.value,start:start.value,minutes:Number(duration.value),clients:chosenClients(),location:location.value,note:note.value,status:"scheduled"};
const problem=valid(obj,old?.id);if(problem){confirmation.textContent=problem;confirmation.style.color="#b34141";return}
store.bookings=store.bookings.filter(x=>x.id!==obj.id);store.bookings.push(obj);store.activity.unshift({kind:editing?"Rescheduled":"Booked",date:obj.date,title:typeBy(obj.typeId)?.name,detail:obj.clients.join(", ")});save();chosen=obj.date;panel.remove();render();succeeded("Booking saved locally. Actual notifications and client-app scheduling require backend connection.")};
body.prepend(panel);panel.scrollIntoView({block:"nearest",behavior:"smooth"})}
function renderTypes(){heading("Session Types","Define reusable booking services, durations, locations and capacity.",btn("+ Create session type",()=>editType()));
filter.append(btn(archived?"Active":"Active session types",()=>{archived=false;render()}),btn("Archived",()=>{archived=true;render()}));
const table=E("div",{className:"card"});store.types.filter(x=>x.archived===archived).forEach(t=>table.append(E("div",{className:"booking-type-row"},[E("div",{},[E("strong",{text:t.name}),E("p",{className:"sub",text:t.minutes+" min · "+t.place+" · capacity "+t.capacity})]),btn("Edit",()=>editType(t.id)),btn(t.archived?"Restore":"Archive",()=>{t.archived=!t.archived;save();render()})])));if(!store.types.some(x=>x.archived===archived))table.append(E("p",{text:"No session types in this category."}));body.append(table)}
function editType(id){const current=store.types.find(x=>x.id===id),panel=E("div",{className:"card booking-form"}),name=inp("text",current?.name||""),duration=inp("number",current?.minutes||60),capacity=inp("number",current?.capacity||1),place=inp("text",current?.place||"Gym");name.required=true;duration.min=15;duration.max=360;capacity.min=1;capacity.max=50;
const form=E("form");form.append(E("h2",{text:current?"Edit session type":"Create session type"}),E("div",{className:"booking-form-grid"},[field("Name",name),field("Duration (minutes)",duration),field("Maximum clients",capacity),field("Location",place)]),E("button",{type:"submit",className:"btn",text:"Save session type"}),btn("Close",()=>panel.remove()));
form.onsubmit=e=>{e.preventDefault();if(!name.value.trim())return;const obj={id:current?.id||now(),name:name.value.trim(),minutes:Math.max(15,Number(duration.value)||60),capacity:Math.max(1,Number(capacity.value)||1),place:place.value,archived:current?.archived||false};store.types=store.types.filter(x=>x.id!==obj.id);store.types.push(obj);save();render()};panel.append(form);body.prepend(panel)}
function renderAvailability(){heading("Availability","Define the weekly working hours for each coach and prevent overlapping bookings.",btn("+ Add coach",()=>addCoach()));
const coach=select(store.coaches.map(x=>[x.name,x.id]),store.coaches[0].id);filter.append(field("Trainer",coach));const host=E("div",{className:"card"});body.append(host);
function showHours(){host.replaceChildren();const selected=coachBy(coach.value);const form=E("form"),lines=[];
weekdays().forEach((label,i)=>{const ranges=selected.hours[i],enabled=inp("checkbox");enabled.checked=!!ranges;const start=inp("time",time(ranges?.[0]??540)),end=inp("time",time(ranges?.[1]??1020));const row=E("div",{className:"booking-availability-row"},[E("b",{text:label}),enabled,start,end]);form.append(row);lines.push({i,enabled,start,end})});
const message=E("p",{className:"sub",text:"Times are stored in this browser only. External calendar busy times are not included."});form.append(E("button",{className:"btn",type:"submit",text:"Save availability"}),message);form.onsubmit=e=>{e.preventDefault();const obj={};for(const r of lines){if(!r.enabled.checked){obj[r.i]=null;continue}const s=mins(r.start.value),f=mins(r.end.value);if(!Number.isFinite(s)||!Number.isFinite(f)||s>=f){message.textContent="End must be after start for "+weekdays()[r.i];return}obj[r.i]=[s,f]}selected.hours=obj;save();message.textContent="Availability saved locally.";};host.append(E("h2",{text:selected.name+" · Weekly availability"}),form)}
coach.onchange=showHours;showHours()}
function weekdays(){return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]}
function addCoach(){const name=prompt("Coach display name");if(!name?.trim())return;store.coaches.push({id:now(),name:name.trim().slice(0,80),hours:hours()});save();render()}
function renderActivities(){heading("Booking Activities","Review bookings, cancellations and scheduling actions.",btn("Calendar",()=>open("calendar")));
const holder=E("div",{className:"card"});if(!store.activity.length)holder.append(E("p",{className:"sub",text:"No booking activity yet. Book a sample session in the calendar."}));store.activity.forEach(a=>holder.append(E("div",{className:"booking-activity"},[E("strong",{text:a.kind+" · "+a.title}),E("span",{className:"sub",text:a.date+(a.detail?" · "+a.detail:"")})])));body.append(holder)}
open("calendar");
