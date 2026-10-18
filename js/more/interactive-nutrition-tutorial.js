import { nutritionPracticeSeed } from './nutrition-tutorial-demo.js';
import { NUTRITION_WALKTHROUGH_STEPS as steps } from './nutrition-walkthrough-steps.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=false;
export function startNutritionTutorial(){
 if(active||window.__levelUpNutritionPractice)return;active=true;
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='nutrition-practice';dialog.setAttribute('aria-label','Interactive nutrition and weight walkthrough');
 dialog.innerHTML='<header class="nt-header"><span>Practice · Example data</span><button data-nt-close aria-label="Close nutrition walkthrough">×</button></header><iframe title="Level Up nutrition practice — actual app screens" sandbox="allow-scripts allow-same-origin allow-forms" allow="camera \'none\'; microphone \'none\'"></iframe><section class="nt-coach" aria-label="Walkthrough coach"></section>';
 const frame=dialog.querySelector('iframe'),coach=dialog.querySelector('.nt-coach');
 const preferences={};for(const key of ['level_up_appearance_settings','level_up_unit_preferences_v2','level_up_unit_system']){const value=localStorage.getItem(key);if(value!==null)preferences[key]=value;}
 frame.name='level-up-nutrition-practice:'+JSON.stringify(nutritionPracticeSeed(preferences));
 let index=0,route='',generation=0,ready=false,closed=false,highlight=null,collapsed=false;
 const close=()=>{closed=true;generation++;dialog.close();frame.src='about:blank';dialog.remove();active=false;previous?.focus?.();};
 dialog.querySelector('[data-nt-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 function paint(message=''){
  const s=steps[index];coach.innerHTML=`<div class="nt-coach-heading"><small>${index+1} / ${steps.length}</small><h2>${s.title}</h2><button data-nt-collapse aria-label="${collapsed?'Expand':'Collapse'} instructions" aria-expanded="${!collapsed}">${collapsed?'+':'−'}</button></div>${collapsed?'':`<p>${s.body}</p>`}<p role="status" class="nt-status">${esc(message)}</p><nav><button data-nt-back ${index===0||!ready?'disabled':''}>Back</button><button data-nt-retry ${!ready?'disabled':''}>Show me</button><button class="nt-primary" data-nt-next ${!ready?'disabled':''}>${index===steps.length-1?'Finish':'Next'}</button></nav>`;
  coach.querySelector('[data-nt-collapse]').onclick=()=>{collapsed=!collapsed;paint();};coach.querySelector('[data-nt-back]').onclick=()=>show(index-1);coach.querySelector('[data-nt-retry]').onclick=()=>show(index);coach.querySelector('[data-nt-next]').onclick=()=>index===steps.length-1?close():show(index+1);
 }
 const doc=()=>frame.contentDocument;
 async function waitFor(selector,token){for(let n=0;n<60;n++){if(closed||token!==generation)return null;const node=doc()?.querySelector(selector);if(node && !node.closest('[hidden]'))return node;await new Promise(r=>setTimeout(r,80));}return null;}
 function click(selector){const n=doc()?.querySelector(selector);if(n&&!n.closest('[hidden]'))n.click();return n;}
 function setValue(selector,value){const n=doc()?.querySelector(selector);if(n){n.value=value;n.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));}}
 async function prepare(s,token){
  const d=doc();d.querySelectorAll('dialog[open]').forEach(n=>n.close());
  if(route!==s.route){frame.contentWindow.document.dispatchEvent(new frame.contentWindow.CustomEvent('levelup:navigate',{detail:{page:s.route}}));route=s.route;await waitFor('#content',token);d.querySelectorAll('.nav-btn[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page===s.route));}
  if(s.route==='progress'){
   click(s.prepare==='calorie-stats'?'#nutrition-progress-tab':'#weight-tab');
   if(s.prepare==='trajectory'){await waitFor('[data-weight-graph-page-v2][aria-label="Goal"]',token);click('[data-weight-graph-page-v2][aria-label="Goal"]');}
  }else{
   if(s.prepare==='plan'){click('[data-food-close]');click('[data-calories-tab="plan"]');click('[data-nutrition-view="goals"]');}
   else if(['search','food','amount'].includes(s.prepare)){
    click('[data-calories-tab="log"]');
    if(d.querySelector('[data-food-sheet]')?.hidden)click('[data-food-add]');
    if(s.prepare==='search')click('[data-food-portion-close]');
    if(['food','amount'].includes(s.prepare)&&d.querySelector('[data-food-portion]')?.hidden){click('[data-food-mode="recent"]');await waitFor('[data-food-recents] [data-food-result]',token);[...d.querySelectorAll('[data-food-recents] [data-food-result]')].find(n=>/blueberries/i.test(n.textContent))?.click();}
    if(s.prepare==='amount'&&!Number(d.querySelector('[data-food-quantity]')?.value)){click('[data-food-unit][aria-label="1 g"]');setValue('[data-food-quantity]','100');}
   }else{if(s.prepare==='review'&&!d.querySelector('[data-food-sheet]')?.hidden){click('[data-food-confirm]:not(:disabled)');}click('[data-food-close]');click('[data-calories-tab="log"]');}
  }
 }
 async function show(next){
  if(closed)return;index=Math.max(0,Math.min(steps.length-1,next));const token=++generation;
  highlight?.classList.remove('nt-live-highlight');paint('Opening this step…');
  try{await prepare(steps[index],token);const target=await waitFor(steps[index].target,token);if(closed||token!==generation)return;paint(target?'':'Explore this screen, or use Next to continue.');if(target){highlight=target;target.classList.add('nt-live-highlight');target.scrollIntoView({block:'center',behavior:'smooth'});}}
  catch{if(!closed)paint('This screen could not open. Use Show me to retry, or Next to continue.');}
 }
 frame.addEventListener('load',async()=>{
  if(closed||frame.src==='about:blank')return;
  const d=doc();if(!frame.contentWindow.__levelUpNutritionPractice){coach.textContent='Practice could not start safely. Close and try again.';return;}
  const style=d.createElement('style');style.textContent='.nt-live-highlight{outline:2px solid var(--accent)!important;outline-offset:4px;border-radius:12px}#workout-tutorial-dashboard-prompt,#levelup-install-reminder,#pwa-splash{display:none!important}html{scroll-padding-top:16px;scroll-padding-bottom:20px}';d.head.append(style);
  const token=generation;await waitFor('.nav-btn',token);if(closed)return;ready=true;
  d.addEventListener('click',e=>{
   // Explain shortcuts without requesting real camera/microphone permissions in practice.
   if(e.target.closest?.('[data-barcode-open], [data-voice-meal-open], [data-food-voice-open], [data-food-voice]')){e.preventDefault();e.stopImmediatePropagation();paint('Camera and voice are available in your own log. Practice does not record or request access.');return;}
   const selector=steps[index].advance;if(selector&&e.target.closest?.(selector)){setTimeout(()=>{if(!closed)show(index+1);},160);}
  },true);
  await show(0);
 });
 document.body.append(dialog);paint('Loading the app’s practice workspace…');dialog.showModal();dialog.querySelector('[data-nt-close]').focus();frame.src='index.html?nutrition-practice=1';
}
function install(){
 if(window.__levelUpNutritionPractice)return;
 const link=document.createElement('link');link.rel='stylesheet';link.href='css/nutrition-practice-tour.css?v=2';document.head.append(link);
 const inject=()=>{const shell=document.querySelector('.learn-shell:not(.learn-detail)');if(!shell||shell.querySelector('[data-nutrition-practice-launch]'))return;const card=document.createElement('section');card.className='nt-launch';card.innerHTML='<small>INTERACTIVE TUTORIAL</small><h3>Nutrition & Weight</h3><p>Walk through the actual food logger, goals and weight charts with eight weeks of example data. About 5 minutes.</p><button class="nt-primary" data-nutrition-practice-launch>Start nutrition walkthrough</button>';card.querySelector('button').onclick=startNutritionTutorial;shell.querySelector('.learn-library-heading')?.before(card);};inject();new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
}
if(typeof document!=='undefined')install();
