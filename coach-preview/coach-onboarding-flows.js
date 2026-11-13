/* Coach onboarding: one welcome message + one configurable questionnaire.
 * Draft and client preview are local only. Sending requires authenticated
 * coach-to-client invitation endpoints and a write to client profile.
 */
const KEY="levelup_coach_onboarding_flows_v2";
const LEGACY="levelup_coach_onboarding_flows_v1";
const E=(tag,props={},children=[])=>{const x=document.createElement(tag);for(const [key,value] of Object.entries(props)){if(key==="text")x.textContent=value;else if(key==="className")x.className=value;else if(key==="onClick")x.addEventListener("click",value);else if(key==="checked")x.checked=!!value;else x.setAttribute(key,value)}x.append(...children);return x};
const B=(text,fn,klass="btn light")=>E("button",{type:"button",className:klass,text,onClick:fn});
const field=(label,control)=>E("label",{className:"coach-flow-field"},[E("span",{text:label}),control]);
const box=(tag,value)=>{const v=E(tag);if(value!==undefined)v.value=value;return v};
const uid=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
const TEMPLATES=[
{id:"standard",name:"Standard Coaching",message:"Welcome to Level Up! I'm looking forward to helping you reach your goals. Please answer a few questions so I can build a program for you.",questions:[
{label:"What is your primary fitness goal?",type:"single",required:true,options:["Build muscle","Increase strength","Lose fat","Improve overall fitness"]},
{label:"How many days per week can you train?",type:"single",required:true,options:["2","3","4","5+"]},
{label:"What equipment do you have access to?",type:"single",required:true,options:["Full gym","Home gym","Dumbbells","Bodyweight only"]},
{label:"Anything else you want your coach to know?",type:"long",required:false,options:[]}]},
{id:"online",name:"Training + Nutrition",message:"Welcome aboard! Tell me about your training and nutrition preferences so we can build a plan that works for you.",questions:[
{label:"What is your main goal?",type:"single",required:true,options:["Gain muscle","Lose weight","Maintain weight","Improve performance"]},
{label:"How many training days work for you?",type:"single",required:true,options:["2","3","4","5+"]},
{label:"Would you like nutrition coaching?",type:"single",required:true,options:["Yes","No"]},
{label:"Any food preferences or dietary considerations?",type:"long",required:false,options:[]}]},
{id:"group",name:"Group Coaching",message:"Welcome to our group training program! Fill in this quick form so we can get you started.",questions:[
{label:"What days are you usually available?",type:"multiple",required:true,options:["Monday","Tuesday","Wednesday","Thursday","Friday","Weekend"]},
{label:"What is your experience level?",type:"single",required:true,options:["Beginner","Intermediate","Advanced"]},
{label:"What would you most like to improve?",type:"long",required:false,options:[]}]},
{id:"blank",name:"Blank Form",message:"Welcome! Please complete this quick onboarding form.",questions:[]}
];
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(Array.isArray(x))return x}catch{}try{const old=JSON.parse(localStorage.getItem(LEGACY)||"[]");if(Array.isArray(old)&&old.length)return old.map(p=>({id:p.id||uid(),name:p.name||p.title||"Onboarding Form",message:p.message||"",questions:(p.form||[]).map(q=>({id:uid(),label:q.title||"",type:q.type||"short",required:!!q.required,options:Array.isArray(q.options)?q.options:[]})),updatedAt:p.updatedAt||new Date().toISOString()}))}catch{}return []}
function store(){try{localStorage.setItem(KEY,JSON.stringify(forms));return true}catch{return false}}
function create(template){return{id:"onboard-"+uid(),name:template.name,message:template.message,questions:template.questions.map(q=>({...structuredClone(q),id:uid()})),updatedAt:new Date().toISOString(),status:"draft"}}
let forms=read(),active=forms[0]?.id||null;
const host=document.getElementById("coach-extra-views")||document.querySelector(".body");
if(!host)throw Error("Coach workspace not available");
const view=E("section",{id:"onboarding-forms",className:"view"}),head=E("div",{className:"head"},[E("div",{},[E("span",{className:"eyebrow",text:"CLIENT ONBOARDING"}),E("h1",{text:"Onboarding Form"}),E("p",{className:"muted",text:"One welcome message followed by your choice of questions. Start with a template or make your own."})])]);
const bar=E("div",{className:"coach-flow-toolbar"}),cards=E("div",{className:"coach-flow-list"}),editor=E("div",{className:"coach-flow-editor"});
view.append(head,E("p",{className:"sub",text:"Private preview: forms and responses are not sent to the Level Up app or saved to real client profiles yet."}),bar,cards,editor);host.append(view);
const nav=document.getElementById("nav"),link=B("Onboarding Form",open,"coach-onboard-nav");nav?.append(link);
function open(){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x===view));document.querySelectorAll("#nav button").forEach(x=>x.classList.toggle("active",x===link));const crumb=document.getElementById("crumb");if(crumb)crumb.textContent="Onboarding Form";render();view.scrollIntoView({block:"start"})}
function chosen(){return forms.find(x=>x.id===active)}
function change(f){f.updatedAt=new Date().toISOString();store()}
function createNew(t){const p=create(t);forms.unshift(p);active=p.id;store();render()}
function list(){cards.replaceChildren();for(const p of forms){const row=E("div",{className:"coach-flow-row"+(p.id===active?" active":"")},[E("div",{},[E("strong",{text:p.name}),E("p",{className:"sub",text:p.questions.length+" questions · Draft · "+new Date(p.updatedAt).toLocaleDateString()})]),B("Edit",()=>{active=p.id;render()}),B("Preview",()=>preview(p)),B("Duplicate",()=>{const copy=structuredClone(p);copy.id=uid();copy.name+=" (Copy)";copy.questions.forEach(q=>q.id=uid());forms.unshift(copy);active=copy.id;store();render()}),B("Delete",()=>{if(!confirm("Delete this onboarding draft?"))return;forms=forms.filter(x=>x.id!==p.id);active=forms[0]?.id||null;store();render()})]);cards.append(row)}}
function render(){bar.replaceChildren();editor.replaceChildren();for(const t of TEMPLATES)bar.append(B("+ "+t.name,()=>createNew(t),t.id==="standard"?"btn":"btn light"));list();const flow=chosen();if(!flow){editor.append(E("p",{className:"sub",text:"Choose a template above to create your onboarding form."}));return}
const body=E("div",{className:"card coach-flow-builder"}),heading=E("div",{className:"row between"},[E("h2",{text:"Edit your onboarding form"}),E("span",{className:"sub",text:"Draft · local only"})]);body.append(heading);
const name=box("input",flow.name);name.maxLength=110;name.oninput=()=>{flow.name=name.value;change(flow)};body.append(field("Form name",name));
const message=box("textarea",flow.message);message.rows=5;message.placeholder="Write the message your client will see first…";message.oninput=()=>{flow.message=message.value;change(flow)};
body.append(E("section",{className:"coach-flow-stage"},[E("div",{},[E("h3",{text:"1. Welcome message"}),E("p",{className:"sub",text:"This appears before the questions."})]),field("Message",message)]));
const questionSection=E("section",{className:"coach-flow-stage"}),questionHost=E("div",{className:"coach-flow-stage-body"});
questionSection.append(E("div",{},[E("h3",{text:"2. Questions"}),E("p",{className:"sub",text:"Add, edit, reorder or remove questions. Only required questions must be answered."})]),questionHost);body.append(questionSection);
function questions(){questionHost.replaceChildren();flow.questions.forEach((q,index)=>{const card=E("div",{className:"coach-flow-question"}),title=box("input",q.label),type=E("select"),types=[["short","Short answer"],["long","Long answer"],["single","Single choice"],["multiple","Multiple choices"],["number","Number"]];types.forEach(([v,label])=>type.append(E("option",{value:v,text:label})));type.value=q.type||"short";const required=E("input",{type:"checkbox",checked:!!q.required}),opts=box("textarea",(q.options||[]).join("\n"));opts.rows=3;opts.placeholder="One option per line";title.placeholder="Type your question";title.oninput=()=>{q.label=title.value;change(flow)};type.onchange=()=>{q.type=type.value;change(flow);questions()};required.onchange=()=>{q.required=required.checked;change(flow)};opts.oninput=()=>{q.options=opts.value.split("\n").map(x=>x.trim()).filter(Boolean).slice(0,30);change(flow)};
const actions=E("div",{className:"row between"},[E("strong",{text:"Question "+(index+1)}),E("div",{className:"coach-flow-question-actions"},[B("↑",()=>move(index,-1)),B("↓",()=>move(index,1)),B("Remove",()=>{flow.questions.splice(index,1);change(flow);questions()})])]);
card.append(actions,field("Question",title),field("Answer type",type),E("label",{className:"coach-flow-required"},[required,E("span",{text:"Required"})]));if(["single","multiple"].includes(q.type))card.append(field("Answer choices (one per line)",opts));questionHost.append(card)});questionHost.append(B("+ Add question",()=>{flow.questions.push({id:uid(),label:"",type:"short",required:false,options:[]});change(flow);questions()},"btn"))}
function move(i,n){const j=i+n;if(j<0||j>=flow.questions.length)return;[flow.questions[i],flow.questions[j]]=[flow.questions[j],flow.questions[i]];change(flow);questions()}questions();
const status=E("p",{role:"status",className:"sub"}),footer=E("div",{className:"coach-flow-footer"},[B("Save Draft",()=>{status.textContent=store()?"Form saved in this browser. Not sent to any client.":"Could not save form."},"btn"),B("Preview as Client",()=>preview(flow)),B("Send to Client",()=>{status.textContent="Not sent. Client invitation, app questionnaire screen and authorized profile-response storage still need to be connected."})]);body.append(footer,status);editor.append(body)}
const overlay=E("div",{className:"coach-form-preview-overlay",hidden:""}),modal=E("div",{className:"coach-form-preview-modal"});overlay.append(modal);document.body.append(overlay);overlay.addEventListener("click",event=>{if(event.target===overlay)closePreview()});
function closePreview(){overlay.hidden=true;modal.replaceChildren()}
function preview(flow){modal.replaceChildren();overlay.hidden=false;const header=E("div",{className:"row between"},[E("div",{},[E("span",{className:"eyebrow",text:"CLIENT VIEW · PREVIEW"}),E("h2",{text:flow.name})]),B("Close",closePreview)]),form=E("form",{className:"coach-preview-form"}),intro=E("div",{className:"coach-form-preview-welcome"},[E("strong",{text:"Welcome!"}),E("p",{text:flow.message||"Welcome to your coaching program."})]);modal.append(header,intro,form);
flow.questions.forEach((q,index)=>{const question=E("fieldset",{className:"coach-preview-question"}),legend=E("legend",{text:(index+1)+". "+(q.label||"Question")+(q.required?" *":"")});question.append(legend);const id="q-"+index,options=(q.options||[]).filter(Boolean);
if(q.type==="single"||q.type==="multiple"){if(!options.length)question.append(E("p",{className:"sub",text:"Add answer choices in the editor."}));for(const choice of options){const item=E("input",{type:q.type==="single"?"radio":"checkbox",name:id,value:choice});question.append(E("label",{className:"coach-preview-choice"},[item,E("span",{text:choice})]))}}else{const control=q.type==="long"?box("textarea",""):box("input","");if(q.type==="number")control.type="number";if(q.required)control.required=true;control.setAttribute("aria-label",q.label||"Question");question.append(control)}form.append(question)});
const note=E("p",{className:"sub",role:"status",text:"Preview only. Answers are not saved to a real client profile."});form.append(E("button",{type:"submit",className:"btn",text:"Submit Preview"}),note);form.onsubmit=event=>{event.preventDefault();for(const [index,q] of flow.questions.entries()){if(q.required&&(q.type==="single"||q.type==="multiple")&&!form.querySelector('[name="q-'+index+'"]:checked')){note.textContent="Please answer question "+(index+1)+".";return}}note.textContent="Preview completed. In the live workflow, your answers would be saved to your Level Up client profile and shown to your coach."}}
render();
