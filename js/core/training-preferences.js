import { normalizeTrainingDays } from "../workouts/onboarding-schedule.js?v=onboarding-training-days-1";

export const TRAINING_PREFERENCES_KEY = "level_up_training_preferences";
export const TRAINING_PREFERENCES_SCHEMA_VERSION = 1;

const PRIMARY_GOALS = new Set(["build_muscle","build_strength","maintain_muscle","lose_fat_maintain_muscle","track_training"]);
const EXPERIENCES = new Set(["new","intermediate","experienced","advanced"]);
const ALLOWED_DAYS = new Set([2,3,4,5,6]);
const ALLOWED_DURATIONS = new Set([30,45,60,75,90]);

function readObject(){
    try{
        const value=JSON.parse(localStorage.getItem(TRAINING_PREFERENCES_KEY)||"null");
        return value&&typeof value==="object"&&!Array.isArray(value)?value:{};
    }catch{return {};}
}
function normalizeStringArray(value){return Array.isArray(value)?[...new Set(value.map(item=>String(item||"").trim()).filter(Boolean))]:[];}

export function getTrainingPreferences(){
    const stored=readObject();
    const days=Number(stored.days),duration=Number(stored.duration);
    return {...stored,
        schemaVersion:Number(stored.schemaVersion)||TRAINING_PREFERENCES_SCHEMA_VERSION,
        primaryGoal:PRIMARY_GOALS.has(stored.primaryGoal)?stored.primaryGoal:null,
        experience:EXPERIENCES.has(stored.experience)?stored.experience:null,
        priorities:normalizeStringArray(stored.priorities),
        days:ALLOWED_DAYS.has(days)?days:null,
        trainingDays:normalizeTrainingDays(stored.trainingDays),
        duration:ALLOWED_DURATIONS.has(duration)?duration:null,
        excludedIds:normalizeStringArray(stored.excludedIds),
        onboardingComplete:stored.onboardingComplete===true,
        onboardingSkipped:stored.onboardingSkipped===true,
        onboardingMigrated:stored.onboardingMigrated===true,
        onboardingVersion:Number(stored.onboardingVersion)||0
    };
}
export function saveTrainingPreferences(patch={}){
    const current=getTrainingPreferences();
    const merged={...current,...patch,schemaVersion:TRAINING_PREFERENCES_SCHEMA_VERSION,updatedAt:new Date().toISOString()};
    if(patch.priorities!==undefined)merged.priorities=normalizeStringArray(patch.priorities);
    if(patch.excludedIds!==undefined)merged.excludedIds=normalizeStringArray(patch.excludedIds);
    if(patch.trainingDays!==undefined)merged.trainingDays=normalizeTrainingDays(patch.trainingDays);
    localStorage.setItem(TRAINING_PREFERENCES_KEY,JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("levelup:training-preferences-updated",{detail:merged}));
    return getTrainingPreferences();
}
export function markOnboardingComplete({migrated=false}={}){return saveTrainingPreferences({onboardingComplete:true,onboardingSkipped:false,onboardingMigrated:Boolean(migrated),onboardingVersion:TRAINING_PREFERENCES_SCHEMA_VERSION,onboardingHandledAt:new Date().toISOString()});}
export function markOnboardingSkipped(){return saveTrainingPreferences({onboardingComplete:false,onboardingSkipped:true,onboardingMigrated:false,onboardingVersion:TRAINING_PREFERENCES_SCHEMA_VERSION,onboardingHandledAt:new Date().toISOString()});}
export function onboardingIsHandled(){const preferences=getTrainingPreferences();return preferences.onboardingComplete||preferences.onboardingSkipped;}

// Smart Build replaces the entire input step after a preference is selected.
// Preserve the open picker/search state across that render, and make the two
// picker toggles self-healing if a delegated click is missed on mobile/iOS.
function installSmartBuildExercisePickerFix(){
    if(typeof document==="undefined")return;
    let captured=null;
    const descriptor=button=>{
        if(button?.matches?.("[data-preferred-toggle]"))return{kind:"toggle",type:"prefer"};
        if(button?.matches?.("[data-avoid-toggle]"))return{kind:"toggle",type:"avoid"};
        if(button?.dataset?.preferId)return{kind:"select",type:"prefer"};
        if(button?.dataset?.excludeId)return{kind:"select",type:"avoid"};
        return null;
    };
    const selectors=type=>type==="prefer"
        ?{panel:"[data-preferred-panel]",search:"[data-preferred-search]"}
        :{panel:"[data-avoid-panel]",search:"[data-avoid-search]"};
    const activeCard=()=>document.querySelector(".smart-build-wizard:not([hidden]) .smart-question-card");
    const dispatchSearch=input=>input?.dispatchEvent?.(new Event("input",{bubbles:true}));

    document.addEventListener("click",event=>{
        const button=event.target.closest?.("button");
        const info=descriptor(button);
        if(!info)return;
        const card=button.closest?.(".smart-question-card")||activeCard();
        const {panel,search}=selectors(info.type);
        const panelNode=card?.querySelector?.(panel);
        const searchNode=card?.querySelector?.(search);
        captured={...info,wasHidden:panelNode?.hidden!==false,query:searchNode?.value||""};
    },true);

    document.addEventListener("click",event=>{
        const button=event.target.closest?.("button");
        const info=descriptor(button);
        if(!info||!captured||captured.type!==info.type||captured.kind!==info.kind)return;
        const snapshot=captured;
        captured=null;
        const repair=()=>{
            const card=activeCard();
            if(!card)return;
            const {panel,search}=selectors(snapshot.type);
            const panelNode=card.querySelector(panel);
            const searchNode=card.querySelector(search);
            if(!panelNode)return;
            if(snapshot.kind==="toggle"){
                const expectedHidden=!snapshot.wasHidden;
                if(panelNode.hidden!==expectedHidden)panelNode.hidden=expectedHidden;
                const toggle=card.querySelector(snapshot.type==="prefer"?"[data-preferred-toggle]":"[data-avoid-toggle]");
                toggle?.setAttribute?.("aria-expanded",String(!expectedHidden));
                if(!expectedHidden){
                    dispatchSearch(searchNode);
                    searchNode?.focus?.({preventScroll:true});
                }
                return;
            }
            panelNode.hidden=false;
            if(searchNode){
                searchNode.value=snapshot.query;
                dispatchSearch(searchNode);
            }
            const toggle=card.querySelector(snapshot.type==="prefer"?"[data-preferred-toggle]":"[data-avoid-toggle]");
            toggle?.setAttribute?.("aria-expanded","true");
        };
        if(snapshot.kind==="select")setTimeout(repair,0);
        else queueMicrotask(repair);
    });
}

installSmartBuildExercisePickerFix();