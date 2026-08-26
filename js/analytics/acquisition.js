const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const ACTIVE_WORKOUT_KEY = "level_up_active_workout";
const FIRST_TOUCH_KEY = "level_up_acquisition_first_touch";
const REPORTED_KEY = "level_up_acquisition_reported";
const SUBMITTED_KEY = "level_up_acquisition_submitted";
const EVENT_QUEUE_KEY = "level_up_product_event_queue";
const FUNNEL_SENT_KEY = "level_up_workout_funnel_sent";
const SOURCES = new Set(["instagram","tiktok","reddit","youtube","google_search","friend_family","app_recommendation","other","prefer_not_to_say"]);

let initialized = false;
let funnelObserver = null;

export function initializeAcquisitionTracking(){
    ensureStyles();
    captureFirstTouch();
    if(initialized)return;
    initialized=true;
    void submitAcquisition();
    void flushEventQueue();
    window.addEventListener("online",()=>{void submitAcquisition();void flushEventQueue();});
    window.addEventListener("levelup:cloud-session-started",()=>{void submitAcquisition();void flushEventQueue();syncWorkoutFunnelFromDom();});
    window.addEventListener("levelup:workout-completed",event=>{
        const detail=event.detail||{};
        trackOnce("workout_completed",String(detail.sessionId||crypto.randomUUID()),{
            planId:detail.planId||null,
            workingSets:Number(detail.workingSets)||0,
            durationMinutes:Number(detail.durationMinutes)||0
        });
    });
    document.addEventListener("click",handleWorkoutFunnelClick,true);
    funnelObserver=new MutationObserver(()=>syncWorkoutFunnelFromDom());
    funnelObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class"]});
    requestAnimationFrame(syncWorkoutFunnelFromDom);
}

function handleWorkoutFunnelClick(event){
    if(event.target.closest?.('.nav-btn[data-page="workout"]'))trackWorkoutViewed();
    if(event.target.closest?.("#begin-session-btn,.complete-set-btn"))setTimeout(syncWorkoutFunnelFromDom,0);
}

function syncWorkoutFunnelFromDom(){
    const workoutPage=document.querySelector(".workout-page");
    if(workoutPage&&isVisible(workoutPage))trackWorkoutViewed();

    const logger=document.querySelector("#workout-session-logger");
    if(!logger||logger.dataset.editingSessionId)return;

    const planName=clean(logger.querySelector(".builder-heading h3")?.textContent,120)||null;
    const beginButton=logger.querySelector("#begin-session-btn");
    if(beginButton){
        trackWorkoutViewed();
        if(!logger.dataset.funnelPlanSelectionKey)logger.dataset.funnelPlanSelectionKey=crypto.randomUUID();
        trackOnce("plan_selected",logger.dataset.funnelPlanSelectionKey,{planName});
        return;
    }

    const active=activeWorkout();
    if(!active||active.status!=="in_progress")return;
    trackWorkoutViewed();
    trackOnce("workout_started",String(active.id),{
        planId:active.planId||null,
        planName:active.planName||planName,
        trainingDayName:active.trainingDayName||null
    });

    const firstCompleted=findFirstCompletedSet(active);
    if(firstCompleted){
        trackOnce("first_set_logged",String(active.id),{
            planId:active.planId||null,
            exerciseId:firstCompleted.exerciseId||null,
            setIndex:firstCompleted.setIndex
        });
    }
}

function trackWorkoutViewed(){
    trackOnce("workout_viewed",`day:${localDateKey()}`,{});
}

function findFirstCompletedSet(active){
    for(const exercise of active?.exercises||[]){
        const sets=Array.isArray(exercise?.sets)?exercise.sets:[];
        const setIndex=sets.findIndex(set=>set?.completed===true);
        if(setIndex>=0)return{exerciseId:exercise.exerciseId||null,setIndex};
    }
    return null;
}

function trackOnce(eventName,eventKey,metadata={}){
    const marker=`${eventName}:${eventKey}`;
    const stored=safeRead(FUNNEL_SENT_KEY);
    const sent=Array.isArray(stored)?stored:[];
    if(sent.includes(marker))return false;
    sent.push(marker);
    safeSet(FUNNEL_SENT_KEY,sent.slice(-200));
    void trackProductEvent(eventName,{eventKey,metadata});
    return true;
}

function isVisible(element){
    if(!element||element.hidden)return false;
    const style=window.getComputedStyle(element);
    return style.display!=="none"&&style.visibility!=="hidden";
}

function activeWorkout(){
    const value=safeRead(ACTIVE_WORKOUT_KEY);
    return value&&typeof value==="object"?value:null;
}

function localDateKey(){
    const now=new Date();
    const year=now.getFullYear();
    const month=String(now.getMonth()+1).padStart(2,"0");
    const day=String(now.getDate()).padStart(2,"0");
    return `${year}-${month}-${day}`;
}

function ensureStyles(){
    if(document.querySelector('link[data-acquisition-styles]'))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/acquisition.css?v=acquisition-funnel-1";
    link.dataset.acquisitionStyles="1";
    document.head.appendChild(link);
}

export function saveReportedSource(source,otherText=""){
    const normalized=SOURCES.has(source)?source:"";
    if(!normalized)return Promise.resolve(false);
    const record={source:normalized,otherText:normalized==="other"?clean(otherText,80):"",answeredAt:new Date().toISOString()};
    safeSet(REPORTED_KEY,record);
    localStorage.removeItem(SUBMITTED_KEY);
    return submitAcquisition();
}

export async function trackProductEvent(eventName,{eventKey,metadata={}}={}){
    const token=sessionToken();
    const event={eventName,eventKey:String(eventKey||crypto.randomUUID()),occurredAt:new Date().toISOString(),metadata};
    if(!token||!navigator.onLine){queueEvent(event);return false;}
    try{
        const response=await fetch(`${API_URL}/v1/events`,{method:"POST",headers:authHeaders(token),body:JSON.stringify(event)});
        if(!response.ok)queueEvent(event);
        return response.ok;
    }catch{queueEvent(event);return false;}
}

async function flushEventQueue(){
    const token=sessionToken(),queue=safeRead(EVENT_QUEUE_KEY);
    if(!token||!navigator.onLine||!Array.isArray(queue)||!queue.length)return;
    const remaining=[];
    for(const event of queue){
        try{
            const response=await fetch(`${API_URL}/v1/events`,{method:"POST",headers:authHeaders(token),body:JSON.stringify(event)});
            if(!response.ok)remaining.push(event);
        }catch{remaining.push(event);}
    }
    safeSet(EVENT_QUEUE_KEY,remaining);
}

function queueEvent(event){
    const queue=safeRead(EVENT_QUEUE_KEY);
    const next=Array.isArray(queue)?queue:[];
    if(!next.some(item=>item.eventName===event.eventName&&item.eventKey===event.eventKey))next.push(event);
    safeSet(EVENT_QUEUE_KEY,next.slice(-100));
}

function captureFirstTouch(){
    if(safeRead(FIRST_TOUCH_KEY))return;
    const params=new URLSearchParams(window.location.search),referrer=referrerHost(document.referrer);
    safeSet(FIRST_TOUCH_KEY,{utmSource:clean(params.get("utm_source"),120),utmMedium:clean(params.get("utm_medium"),120),utmCampaign:clean(params.get("utm_campaign"),120),utmContent:clean(params.get("utm_content"),120),referrer,firstLandingPath:clean(window.location.pathname,200)||"/",firstSeenAt:new Date().toISOString()});
}

async function submitAcquisition(){
    const token=sessionToken(),first=safeRead(FIRST_TOUCH_KEY),reported=safeRead(REPORTED_KEY);
    if(!token||!first||!navigator.onLine)return false;
    const fingerprint=JSON.stringify([token.slice(-12),first,reported]);
    if(localStorage.getItem(SUBMITTED_KEY)===fingerprint)return true;
    try{
        const response=await fetch(`${API_URL}/v1/acquisition`,{method:"PUT",headers:authHeaders(token),body:JSON.stringify({...first,reportedSource:reported?.source||null,otherText:reported?.otherText||null,answeredAt:reported?.answeredAt||null})});
        if(!response.ok)return false;
        localStorage.setItem(SUBMITTED_KEY,fingerprint);
        return true;
    }catch{return false;}
}

function sessionToken(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")?.token||"";}catch{return"";}}
function authHeaders(token){return{"Content-Type":"application/json","Authorization":`Bearer ${token}`};}
function safeRead(key){try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}}
function safeSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function clean(value,max){return typeof value==="string"?value.trim().slice(0,max):"";}
function referrerHost(value){if(!value)return"";try{return clean(new URL(value).hostname,200);}catch{return"";}}
