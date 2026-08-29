const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const FIRST_TOUCH_KEY = "level_up_acquisition_first_touch";
const REPORTED_KEY = "level_up_acquisition_reported";
const SUBMITTED_KEY = "level_up_acquisition_submitted";
const EVENT_QUEUE_KEY = "level_up_product_event_queue";
const FOOD_LOG_KEY = "level_up_food_log_v1";
const FOOD_RECONCILE_KEY = "level_up_food_usage_reconciled_v1";
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
    void reconcileRecentFoodLogEvents();
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

export async function trackProductEvent(eventName,{eventKey,metadata={},occurredAt}={}){
    const token=sessionToken();
    const event={eventName,eventKey:String(eventKey||crypto.randomUUID()),occurredAt:validOccurredAt(occurredAt),metadata};
    if(!token||!navigator.onLine){queueEvent(event);return false;}
    try{
        const response=await fetch(`${API_URL}/v1/events`,{method:"POST",headers:authHeaders(token),body:JSON.stringify(event)});
        if(!response.ok)queueEvent(event);
        return response.ok;
    }catch{queueEvent(event);return false;}
}

async function reconcileRecentFoodLogEvents(){
    if(localStorage.getItem(FOOD_RECONCILE_KEY)==="complete")return;
    const log=safeRead(FOOD_LOG_KEY);
    if(!log||typeof log!=="object"||Array.isArray(log)){localStorage.setItem(FOOD_RECONCILE_KEY,"complete");return;}
    const cutoff=new Date(Date.now()-31*86400000).toISOString().slice(0,10);
    const entries=Object.entries(log)
        .filter(([dateKey,items])=>dateKey>=cutoff&&Array.isArray(items))
        .flatMap(([dateKey,items])=>items.map(entry=>({dateKey,entry})))
        .filter(item=>item.entry?.id)
        .sort((a,b)=>String(b.entry.createdAt||b.dateKey).localeCompare(String(a.entry.createdAt||a.dateKey)))
        .slice(0,50);
    await Promise.all(entries.map(({dateKey,entry})=>trackProductEvent("food_logged",{
        eventKey:String(entry.id),
        occurredAt:entry.createdAt||`${dateKey}T12:00:00.000Z`,
        metadata:{dateKey,reconciled:true}
    })));
    localStorage.setItem(FOOD_RECONCILE_KEY,"complete");
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
function validOccurredAt(value){return typeof value==="string"&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():new Date().toISOString();}
function referrerHost(value){if(!value)return"";try{return clean(new URL(value).hostname,200);}catch{return"";}}
