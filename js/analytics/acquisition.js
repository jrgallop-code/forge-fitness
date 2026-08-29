const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const FIRST_TOUCH_KEY = "level_up_acquisition_first_touch";
const REPORTED_KEY = "level_up_acquisition_reported";
const SUBMITTED_KEY = "level_up_acquisition_submitted";
const EVENT_QUEUE_KEY = "level_up_product_event_queue";
const SOURCES = new Set(["instagram","tiktok","reddit","youtube","google_search","friend_family","app_recommendation","other","prefer_not_to_say"]);

let initialized = false;

export function initializeAcquisitionTracking(){
    ensureStyles();
    captureFirstTouch();
    if(initialized)return;
    initialized=true;
    void submitAcquisition();
    void flushEventQueue();
    window.addEventListener("online",()=>{void submitAcquisition();void flushEventQueue();});
    window.addEventListener("levelup:cloud-session-started",()=>{void submitAcquisition();void flushEventQueue();});
    window.addEventListener("levelup:workout-completed",event=>{
        const detail=event.detail||{};
        void trackProductEvent("workout_completed",{
            eventKey:String(detail.sessionId||crypto.randomUUID()),
            metadata:{planId:detail.planId||null,workingSets:Number(detail.workingSets)||0,durationMinutes:Number(detail.durationMinutes)||0}
        });
    });
    window.addEventListener("levelup:food-log-updated",event=>{
        const detail=event.detail||{};
        if(detail.action!=="foods_added")return;
        const ids=Array.isArray(detail.entryIds)?detail.entryIds:[];
        ids.forEach(entryId=>{void trackProductEvent("food_logged",{
            eventKey:String(entryId),
            metadata:{dateKey:detail.dateKey||null}
        });});
    });
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
    safeSet(EVENT_QUEUE_KEY,next.slice(-50));
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
