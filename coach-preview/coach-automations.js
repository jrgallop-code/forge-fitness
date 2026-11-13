/* Coach automations + athlete notification inbox: PRIVATE UI preview only.
 * No real email/SMS/push sending and no scheduled background execution.
 * Rules use local browser storage; 'Test trigger' simulates an event synchronously. */
const KEY="levelup_coach_automation_rules_v1",INBOX_KEY="levelup_coach_notifications_preview_v1";
const $=id=>document.getElementById(id);
const e=(t,a={},children=[])=>{const n=document.createElement(t);for(const [k,v] of Object.entries(a)){if(k==="text")n.textContent=v;else if(k==="className")n.className=v;else if(k==="onClick")n.addEventListener("click",v);else n.setAttribute(k,v)}for(const x of children)n.append(x);return n};
const button=(t,fn,cls="btn light")=>e("button",{type:"button",className:cls,text:t,onClick:fn});
const input=(type,v)=>{const n=e("input",{type});if(v!=null)n.value=v;return n};
const select=(options,v)=>{const n=e("select");for(const [label,val] of options)n.append(e("option",{value:val,text:label}));if(v)n.value=v;return n};
const field=(t,control)=>e("label",{className:"automate-field"},[e("small",{text:t}),control]);
const triggers=[
["New client joins","client_joined","Welcome message and onboarding checklist"],
["Workout plan assigned","plan_assigned","Notify athlete their program is ready"],
["Workout plan updated","plan_updated","Notify athlete their workout has changed"],
["Nutrition or macro plan updated","nutrition_updated","Notify athlete their calorie or macro target has changed"],
["Coach sends a message","message_received","Notify athlete about an unread message"],
["Workout completed","workout_completed","Congratulate and prompt next steps"],
["Weekly check-in received","checkin_submitted","Queue coach review and optional reply"],
["Weekly check-in missed","checkin_missed","Send a gentle follow-up"],
["Session booked","booking_created","Appointment confirmation"],
["Appointment upcoming","booking_reminder","Session reminder"],
["Form video submitted","form_uploaded","Tell coach a form video needs review"],
["Form review completed","form_reviewed","Notify athlete of coach feedback"],
["No recent workout","inactivity","Gentle re-engagement reminder"],
["Goal weight achieved","goal_achieved","Celebrate goal progress"]];
const types=[["In-app notification","in_app"],["Coach message draft","message"],["Email (future)","email"],["Push notification (future)","push"]];
const presets=[
{title:"Welcome new client",trigger:"client_joined",action:"message",body:"Welcome to Level Up! Your coach will share your first plan shortly."},
{title:"New workout plan",trigger:"plan_assigned",action:"in_app",body:"Your coach assigned a new workout plan. Open My Coach to review it."},
{title:"Workout plan revised",trigger:"plan_updated",action:"in_app",body:"Your coach updated your workout plan. See what's changed."},
{title:"Nutrition targets changed",trigger:"nutrition_updated",action:"in_app",body:"Your coach updated your calories or macros. View your new plan."},
{title:"Unread coach message",trigger:"message_received",action:"in_app",body:"You have a new message from your coach."},
{title:"Session booking reminder",trigger:"booking_reminder",action:"in_app",body:"Your coaching session is coming up. Open your schedule for details."},
{title:"Check-in reminder",trigger:"checkin_missed",action:"message",body:"Your weekly check-in is ready whenever you have time."},
{title:"Form review ready",trigger:"form_reviewed",action:"in_app",body:"Your coach reviewed your exercise video. Tap to see their feedback."}
];
const clients=["Sarah Carter","Mike Johnson","Katie Lee"];
const now=()=>new Date().toISOString();
const uid=()=>Date.now()+"-"+Math.random().toString(36).slice(2);
const initial=()=>presets.map((p,i)=>({id:"preset-"+i,name:p.title,trigger:p.trigger,action:p.action,body:p.body,enabled:false,scope:"all",delay:0,createdAt:now()}));
const read=(key,fallback)=>{try{const result=JSON.parse(localStorage.getItem(key)||"null");return result??fallback}catch{return fallback}};
let rules=read(KEY,initial()),notifications=read(INBOX_KEY,[]);
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(rules));localStorage.setItem(INBOX_KEY,JSON.stringify(notifications));return true}catch{return false}};
const nav=$("nav"),root=$("coach-extra-views")||document.querySelector(".body");
const automationNav=e("button",{type:"button",text:"⚡ Automations","data-view":"automations"});nav.append(automationNav);
const autoPage=e("section",{className:"view",id:"automations"}),inboxPage=e("section",{className:"view",id:"notification-preview"});
root.append(autoPage,inboxPage);
const header=e("div",{className:"head"},[e("div",{},[e("span",{className:"eyebrow",text:"AUTOMATIONS"}),e("h1",{text:"Automation Center"}),e("p",{className:"muted",text:"Design client journeys, reminders and coaching notifications with reusable templates."})]),button("+ Create automation",()=>editor(), "btn")]);
const warning=e("div",{className:"hint",text:"Private demonstration: rules and notification previews are saved in this browser. No real messages, push notifications, emails or background automations run yet."});
const tabs=e("div",{className:"coach-auto-tabs"});
const table=e("div",{className:"coach-auto-layout"}),formHolder=e("div",{className:"coach-auto-editor"});
autoPage.append(header,warning,tabs,table,formHolder);
let tab="rules",editing=null;
const inboxHdr=e("div",{className:"head"},[e("div",{},[e("span",{className:"eyebrow",text:"ATHLETE APP / MY COACH"}),e("h1",{text:"Notification Preview"}),e("p",{className:"muted",text:"What the client would see when a plan changes, message arrives or a session approaches."})])]);
const inboxControls=e("div",{className:"coach-auto-actions"}),inboxItems=e("div",{className:"coach-auto-notifications"});
inboxPage.append(inboxHdr,e("div",{className:"hint",text:"This is a prototype of the notification inbox inside the existing Level Up app. No client has received these items."}),inboxControls,inboxItems);
function activate(id){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===id));document.querySelectorAll("#nav button").forEach(x=>x.classList.toggle("active",x===automationNav&&id==="automations"));$("crumb").textContent=id==="automations"?"Automations":"Notifications";window.scrollTo(0,0)}
automationNav.onclick=()=>{activate("automations");render()};
function drawTabs(){tabs.replaceChildren();for(const [id,label] of [["rules","My automations"],["templates","Automation templates"],["activity","Activity log"],["notifications","Client notification preview"]]){tabs.append(button(label,()=>{tab=id;if(id==="notifications"){activate("notification-preview");renderInbox()}else render()},tab===id?"btn":"btn light"))}}
function render(){drawTabs();table.replaceChildren();formHolder.replaceChildren();if(tab==="templates"){for(const preset of presets){const card=e("div",{className:"card coach-auto-card"},[e("h3",{text:preset.title}),e("p",{className:"sub",text:triggers.find(x=>x[1]===preset.trigger)?.[2]||""}),e("p",{text:preset.body})]);card.append(button("Use template",()=>editor({...preset,id:null})));table.append(card)}return}
if(tab==="activity"){table.append(e("div",{className:"card"},[e("h3",{text:"Automation test activity"}),e("p",{className:"sub",text:"Only test-trigger results from this browser are shown."})]));const tests=notifications.filter(x=>x.test).slice(0,40);if(!tests.length)table.append(e("p",{className:"muted",text:"No test activity yet."}));tests.forEach(x=>table.append(e("div",{className:"card"},[e("strong",{text:x.title}),e("p",{className:"sub",text:x.client+" · "+new Date(x.createdAt).toLocaleString()}),e("p",{text:x.body})])));return}
table.append(e("div",{className:"card coach-auto-summary"},[e("h3",{text:rules.length+" automation rules"}),e("p",{className:"sub",text:rules.filter(x=>x.enabled).length+" enabled locally. Real execution is disabled until secure event processing is connected."})]));
rules.forEach(rule=>{const label=triggers.find(t=>t[1]===rule.trigger)?.[0]||rule.trigger,card=e("div",{className:"card coach-auto-rule"}),toggle=input("checkbox");toggle.checked=rule.enabled;toggle.onchange=()=>{rule.enabled=toggle.checked;persist();render()};
card.append(e("div",{className:"coach-auto-rule-head"},[e("div",{},[e("h3",{text:rule.name}),e("p",{className:"sub",text:"When: "+label+" · Then: "+types.find(t=>t[1]===rule.action)?.[0]+" · "+(rule.scope==="all"?"All clients":rule.scope)})]),e("label",{className:"coach-auto-switch"},[toggle,e("span",{text:rule.enabled?"Enabled":"Disabled"})])]));
card.append(e("p",{text:rule.body}),e("div",{className:"coach-auto-actions"},[button("Edit",()=>editor(rule)),button("Test trigger",()=>testTrigger(rule)),button("Duplicate",()=>{rules.push({...structuredClone(rule),id:uid(),name:rule.name+" (Copy)",enabled:false});persist();render()}),button("Delete",()=>{if(!confirm("Delete this automation rule?"))return;rules=rules.filter(x=>x.id!==rule.id);persist();render()})]));table.append(card)})}
function editor(rule){editing=rule||null;tab="rules";drawTabs();const draft=rule||{name:"",trigger:"plan_updated",action:"in_app",scope:"all",body:"",delay:0,enabled:false};
formHolder.replaceChildren();const card=e("div",{className:"card coach-auto-edit-card"},[e("div",{className:"row between"},[e("h2",{text:rule?"Edit automation":"Create automation"}),button("Close",()=>formHolder.replaceChildren())])]),form=e("form",{className:"coach-auto-form"});
const name=input("text",draft.name),trigger=select(triggers.map(([label,id])=>[label,id]),draft.trigger),action=select(types,draft.action),scope=select([["All connected clients","all"],...clients.map(x=>[x,x])],draft.scope),delay=select([["Immediately","0"],["After 1 hour","60"],["After 24 hours","1440"]],String(draft.delay??0)),body=e("textarea",{rows:"4"}),enable=input("checkbox");body.value=draft.body;enable.checked=draft.enabled;name.maxLength=90;name.required=true;body.maxLength=600;body.required=true;
form.append(field("Name",name),field("When this happens",trigger),field("Then",action),field("Clients",scope),field("Timing",delay),field("Message / notification text",body),e("label",{className:"coach-auto-switch"},[enable,e("span",{text:"Enable rule after saving (local preview only)"})]),e("p",{className:"sub",text:"Available template variables in production: {client_name}, {coach_name}, {plan_name}, {session_time}. Notification messages will be checked and escaped before delivery."}));
const note=e("p",{className:"sub"});form.append(e("button",{type:"submit",className:"btn",text:"Save automation"}),note);form.onsubmit=ev=>{ev.preventDefault();if(!name.value.trim()||!body.value.trim())return;const obj={id:rule?.id||uid(),name:name.value.trim(),trigger:trigger.value,action:action.value,scope:scope.value,delay:Number(delay.value),body:body.value.trim(),enabled:enable.checked,createdAt:rule?.createdAt||now()};rules=rules.filter(x=>x.id!==obj.id);rules.unshift(obj);if(persist()){formHolder.replaceChildren();tab="rules";render()}else note.textContent="Could not save in this browser."};
card.append(form);formHolder.append(card);card.scrollIntoView({behavior:"smooth",block:"nearest"})}
function testTrigger(rule){const client=rule.scope==="all"?clients[0]:rule.scope;if(!client||!rule.body)return;const isManual=rule.action==="message";
const title=isManual?"Coach message draft":triggers.find(x=>x[1]===rule.trigger)?.[0]||"Update";
notifications.unshift({id:uid(),client,title,body:rule.body,trigger:rule.trigger,createdAt:now(),read:false,test:true,channel:rule.action});
persist();tab="activity";render();activate("automations")}
function renderInbox(){inboxControls.replaceChildren();const selectClient=select(clients,clients[0]);inboxControls.append(field("Demo client",selectClient),button("Mark visible as read",()=>{notifications.filter(x=>x.client===selectClient.value).forEach(x=>x.read=true);persist();draw()}),button("Create sample plan update",()=>{notifications.unshift({id:uid(),client:selectClient.value,title:"Workout plan updated",body:"Your coach updated your workout plan. Tap to see what's new.",createdAt:now(),read:false,test:true,trigger:"plan_updated",channel:"in_app"});persist();draw()}));
const draw=()=>{inboxItems.replaceChildren();const items=notifications.filter(x=>x.client===selectClient.value);const panel=e("div",{className:"card coach-auto-client-phone"},[e("div",{className:"coach-auto-phone-header"},[e("strong",{text:"LEVEL UP"}),e("span",{text:"My Coach · Notifications"})])]);if(!items.length)panel.append(e("p",{className:"muted",text:"No preview notifications for this client. Test a rule or create a sample plan update."}));items.forEach(item=>panel.append(e("button",{className:"coach-auto-message"+(item.read?" read":""),onClick:()=>{item.read=true;persist();draw()}},[e("strong",{text:item.title}),e("p",{text:item.body}),e("small",{text:new Date(item.createdAt).toLocaleString()+" · "+(item.read?"Read":"Unread")})])));inboxItems.append(panel)};selectClient.onchange=draw;draw()}
document.addEventListener("levelup:coach-save-program",event=>{const p=event.detail?.plan;if(!p)return;/* Local preview event only; do not generate pretend client notifications on save. */});
drawTabs();render();
