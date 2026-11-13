/* First-account test publisher for Level Up Coach.
 * Uses the signed-in user's own Level Up account only, never a client email.
 * The cloud assignment is stored separately from the athlete backup.
 */
import {getAllExercises} from "./js/workouts/exercise-library.js";
import "./js/workouts/exercise-library-expansion.js";
const API="/api/levelup-self",SESSION_KEY="levelup_coach_self_session_v1",PUBLISHED_KEY="levelup_coach_published_versions_v1";
const canonical=new Map(getAllExercises().filter(e=>e?.id).map(e=>[String(e.id),e]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
async function api(action,body={}){let token="";try{token=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null")?.token||""}catch{}if(!token)throw Error("First connect your Level Up account in Clients & Analytics.");const response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({action,...body}),cache:"no-store"});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||"Unable to publish the program ("+response.status+").");return data}
const normalized=(p)=>{if(!p?.training?.days?.length)throw Error("Build a workout program before publishing.");let n=0;const missing=[];
for(const day of p.training.days)for(const ex of day.exercises||[]){n++;const id=String(ex.id||"");if(!canonical.has(id))missing.push(id||"(missing ID)")}
if(!n)throw Error("Add at least one exercise before publishing.");
if(missing.length)throw Error("Some exercises are not part of the athlete's canonical library: "+[...new Set(missing)].slice(0,5).join(", ")+". Replace these exercises in Program Builder first.");
return p};
function nutritionPayload(p){const data=p.nutrition||{},cal=data.caloriePlan||{},mac=data.macroPlan||{};
return {calorieTarget:cal.calories||cal.targetCalories||cal.calorieTarget||null,mealGuidance:data.mealGuidance||"",protein:mac.protein||mac?.value?.protein||null,carbs:mac.carbs||mac?.value?.carbs||null,fat:mac.fat||mac?.value?.fat||null}}
document.addEventListener("levelup:coach-publish-test-plan",async event=>{
const report=message=>event.detail?.setStatus?.(message);
try{
const p=normalized(event.detail?.plan);const session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
if(!session?.token||!session?.user?.id)throw Error("Sign in to your Level Up account in Clients & Analytics first.");
if(!confirm("Publish “"+p.name+"” to YOUR OWN Level Up app account ("+(session.user.email||"signed-in account")+")? This does not assign a plan to the selected demo client "+p.clientName+"."))return;
report("Checking assignment versions…");
const versions=read(PUBLISHED_KEY,{}),key=session.user.id+"::"+p.id;
const current=await api("assignments");const matched=(current.assignments||[]).find(a=>a.sourcePlanId===p.id&&a.clientId===session.user.id);
const expected=matched?.version??null;
const stepsData=read("levelup_coach_client_step_goal_drafts_v1",{});const stepGoal=stepsData[p.clientName]?.steps||null;
const result=await api("publish",{approved:true,sourcePlanId:p.id,training:p.training,goalWeightLb:p.goalWeightLb||null,stepGoal,includeNutrition:p.includeNutrition===true,nutrition:p.includeNutrition?nutritionPayload(p):null,expectedVersion:expected});
const a=result.assignment;if(!a?.id)throw Error("Cloud did not confirm the assignment.");
versions[key]={id:a.id,version:a.version,at:new Date().toISOString()};write(PUBLISHED_KEY,versions);
report("Published version "+a.version+" to your Level Up account. Open Level Up → More → Account & Cloud → Assigned Programs to add it to your Workout Library. Existing completed workouts are untouched.");
document.dispatchEvent(new CustomEvent("levelup:coach-plan-published",{detail:a}))
}catch(error){report("Not published: "+(error?.message||"Unknown error")+". The Level Up cloud assignment API must be deployed before this works.")}
});
