/* Saved coaching program drafts appear in the selected client profile.
 * This is a browser-local preview, not a live athlete assignment.
 */
const STORE="levelup_coach_client_programs_v1";
const el=(tag,props={},kids=[])=>{const node=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==="className")node.className=v;else if(k==="text")node.textContent=v;else if(k==="onClick")node.addEventListener("click",v);else node.setAttribute(k,v)}node.append(...kids);return node};
const button=(name,click,klass="btn light")=>el("button",{type:"button",className:klass,text:name,onClick:click});
const read=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||"{}");return x&&typeof x==="object"?x:{}}catch{return{}}};
function draw(container,client){container.querySelector(".coach-profile-plans")?.remove();const wrapper=el("section",{className:"card coach-profile-plans"}),title=el("div",{className:"row between"},[el("h3",{text:"Coaching Programs"}),el("span",{className:"sub",text:"Saved drafts · private preview"})]);wrapper.append(title);
const plans=read()[client]||[];if(!plans.length)wrapper.append(el("p",{className:"sub",text:"No coaching programs saved for this client yet. Create a plan in Program Builder, choose this client, and select Save to Client Profile."}));
plans.forEach(plan=>{const d=plan.training?.days||[],exercises=d.reduce((n,x)=>n+(x.exercises?.length||0),0),row=el("article",{className:"coach-profile-plan-row"},[el("div",{},[el("strong",{text:plan.name||"Untitled Program"}),el("p",{className:"sub",text:d.length+" days · "+exercises+" exercises · "+(plan.includeNutrition?"Nutrition included":"Training only")+" · Not sent to app"})]),button("View / Edit",()=>{document.dispatchEvent(new CustomEvent("levelup:coach-open-client-program",{detail:{clientName:client,id:plan.id}}));document.querySelector('[data-view="builder"]')?.click()},"btn")]);wrapper.append(row)});
container.append(wrapper)}
document.addEventListener("levelup:coach-client-profile-rendered",event=>{const {name,tab,container}=event.detail||{};if(container&&["overview","training"].includes(tab))draw(container,name)});
document.addEventListener("levelup:coach-client-program-saved",()=>{const current=document.querySelector("#clients .coach-client-tabs button.active");if(current)current.click()});
