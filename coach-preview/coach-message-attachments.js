/* Coach conversations: form-video requests and attachments belong to Messages.
 * This is an isolated browser-local demonstration. No outgoing message,
 * video clip, or notification reaches the Level Up athlete app.
 */
const KEY="levelup_coach_message_threads_v1",clients=["Sarah Carter","Mike Johnson","Katie Lee"];
const els=(tag,props={},children=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==="text")n.textContent=v;else if(k==="className")n.className=v;else if(k==="onClick")n.addEventListener("click",v);else n.setAttribute(k,v)}n.append(...children);return n};
const button=(text,onClick,kind="btn light")=>els("button",{type:"button",className:kind,text,onClick});
const snapshot=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}catch{return{}}};
const write=d=>{try{localStorage.setItem(KEY,JSON.stringify(d));return true}catch{return false}};
const previews=new Map();let active="Sarah Carter",requestNext=false,currentSection=null;
function addMessage(person,data){const db=snapshot(),thread=db[person]||[];thread.push({...data,id:crypto.randomUUID(),at:new Date().toISOString()});db[person]=thread.slice(-200);return write(db)}
function requestVideo(){const type=prompt("Which exercise would you like the client to record? (e.g. Barbell Squat)","Barbell Squat");if(!type?.trim())return;
const instruction="Please attach a short video of your "+type.trim()+" in this conversation so I can review your form. Ideally show your full movement from the side or a 45° angle.";
if(addMessage(active,{kind:"video_request",from:"coach",text:instruction,exercise:type.trim(),status:"local_draft"})){render();announce("Form video request saved as a demo message; it has NOT been delivered to the athlete.")}else announce("Could not save request in this browser.")}
function announce(message){const node=currentSection?.querySelector(".coach-msg-status");if(node)node.textContent=message}
function onFile(file){if(!file)return;if(!["video/mp4","video/webm","video/quicktime","image/jpeg","image/png","image/webp"].includes(file.type)){announce("Attach MP4, WebM, MOV, JPG, PNG, or WebP only.");return}if(file.size>100*1024*1024){announce("Preview file exceeds the 100 MB limit.");return}
const url=URL.createObjectURL(file),list=previews.get(active)||[];list.push({url,name:file.name,type:file.type,bytes:file.size,at:new Date().toISOString()});previews.set(active,list);render();announce("File preview added only to this browser tab. It has NOT been uploaded or delivered.");}
function render(){if(!currentSection)return;currentSection.querySelector(".msg-shell")?.remove();currentSection.querySelector(".coach-message-workspace")?.remove();
const shell=els("div",{className:"coach-message-workspace"}),left=els("nav",{className:"card coach-message-roster","aria-label":"Client conversations"}),detail=els("section",{className:"card coach-message-detail"});
const people=[...new Set([...clients,...Object.keys(snapshot()),active])];people.forEach(p=>{const count=(snapshot()[p]||[]).length;left.append(button(p+(count?" · "+count:""),()=>{active=p;render()},"coach-message-person"+(p===active?" active":"")))});
const title=els("div",{className:"coach-msg-header"},[els("div",{},[els("h2",{text:active}),els("p",{className:"sub",text:"Messages · videos · photos · exercise form feedback"})]),button("Request Form Video",requestVideo,"btn")]);
const notice=els("p",{className:"coach-msg-status sub",role:"status",text:"Private demonstration only. Messages and media are not transmitted to Level Up clients."});
const stream=els("div",{className:"coach-message-stream",role:"log","aria-label":"Conversation history"});
const messages=snapshot()[active]||[];
if(!messages.length)stream.append(els("p",{className:"sub",text:"No local messages yet. Request an exercise video to begin."}));
for(const msg of messages){const bubble=els("article",{className:"coach-msg-bubble"+(msg.from==="coach"?" outgoing":"")});
if(msg.kind==="video_request")bubble.append(els("strong",{text:"🎥 Exercise video request · "+(msg.exercise||"Form check")}));
bubble.append(els("p",{text:msg.text}),els("small",{className:"sub",text:(msg.from==="coach"?"Coach · ":"Client · ")+new Date(msg.at).toLocaleString("en-CA")+(msg.status==="local_draft"?" · Preview only":"")}));
stream.append(bubble)}
const attachments=previews.get(active)||[];
if(attachments.length){stream.append(els("h3",{text:"Local media previews (not uploaded)"}));attachments.forEach((file,index)=>{const article=els("article",{className:"coach-msg-attachment"},[els("strong",{text:file.name})]);const media=els(file.type.startsWith("video/")?"video":"img",{src:file.url});if(file.type.startsWith("video/")){media.controls=true;media.playsInline=true;media.preload="metadata"}else media.alt="Selected image attachment";article.append(media,button("Remove preview",()=>{URL.revokeObjectURL(file.url);attachments.splice(index,1);render()}));stream.append(article)})}
const input=els("textarea",{rows:"3",placeholder:"Write coaching feedback or a message…","aria-label":"New message"}),form=els("form",{className:"coach-msg-compose"}),file=els("input",{type:"file",accept:"video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp","aria-label":"Preview photo or video attachment"});file.onchange=()=>{onFile(file.files?.[0]);file.value=""};
const footer=els("div",{className:"coach-msg-compose-buttons"},[els("label",{className:"btn light coach-msg-attach"},[els("span",{text:"Attach Video / Photo"}),file]),els("button",{type:"submit",className:"btn",text:"Save Demo Message"})]);
form.append(input,footer);form.onsubmit=event=>{event.preventDefault();const msg=input.value.trim();if(!msg)return;if(addMessage(active,{from:"coach",kind:"text",text:msg,status:"local_draft"})){render();announce("Message saved as local draft. Not sent.")}else announce("Could not save message.")};
detail.append(title,notice,stream,form,els("p",{className:"sub",text:"Client-side workflow: athlete opens the same thread in Level Up, taps Attach, selects a clip, consents to upload, then the coach reviews the video and replies. Private storage, access checks, and notification delivery are still required."}));
shell.append(left,detail);currentSection.append(shell)}
document.addEventListener("levelup:coach-open-message-client",event=>{active=event.detail?.client||active;requestNext=event.detail?.requestVideo===true});
document.addEventListener("levelup:coach-messages-open",event=>{currentSection=event.detail?.section||document.getElementById("inbox");active=event.detail?.client||active;render();if(requestNext){requestNext=false;requestVideo()}});
window.addEventListener("pagehide",()=>{for(const entries of previews.values())for(const item of entries)URL.revokeObjectURL(item.url)},{once:true});
