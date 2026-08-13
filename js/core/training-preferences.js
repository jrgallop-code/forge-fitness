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
    localStorage.setItem(TRAINING_PREFERENCES_KEY,JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("levelup:training-preferences-updated",{detail:merged}));
    return getTrainingPreferences();
}
export function markOnboardingComplete({migrated=false}={}){return saveTrainingPreferences({onboardingComplete:true,onboardingSkipped:false,onboardingMigrated:Boolean(migrated),onboardingVersion:TRAINING_PREFERENCES_SCHEMA_VERSION,onboardingHandledAt:new Date().toISOString()});}
export function markOnboardingSkipped(){return saveTrainingPreferences({onboardingComplete:false,onboardingSkipped:true,onboardingMigrated:false,onboardingVersion:TRAINING_PREFERENCES_SCHEMA_VERSION,onboardingHandledAt:new Date().toISOString()});}
export function onboardingIsHandled(){const preferences=getTrainingPreferences();return preferences.onboardingComplete||preferences.onboardingSkipped;}
