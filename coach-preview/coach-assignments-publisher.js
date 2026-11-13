/* First-account Coach publishing pilot.
 * Uses an authenticated same-site Vercel proxy; the cloud Worker validates
 * signed-in coach role, assignment version, and client authorization.
 * The first pilot always targets only the coach's own Level Up account.
 */
const SESSION_KEY="levelup_coach_self_session_v1";
function session(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null")}catch{return null}}
async function remote(action,details,token){const response=await fetch("/api/levelup-self",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({action,...details}),cache:"no-store"});let data;try{data=await response.json()}catch{data={error:"Invalid Coach API response"}}if(!response.ok)throw Error(data.error||"Could not publish to Level Up cloud ("+response.status+").");return data}
function unwrapNutrition(plan){if(!plan.includeNutrition)return null;const raw=plan.nutrition||{},macros=raw.macroPlan||{},cal=raw.caloriePlan||{};const n=v=>{const x=Number(v);return Number.isFinite(x)&&x>0?x:null};return {calorieTarget:n(cal.calories)||n(cal.targetCalories)||n(cal.calorieTarget)||n(cal.calculatedCalories),protein:n(macros.protein)||n(macros.proteinGrams),carbs:n(macros.carbs)||n(macros.carbsGrams),fat:n(macros.fat)||n(macros.fatGrams),mealGuidance:String(raw.mealGuidance||"").slice(0,3000)}}
function stepGoal(plan){try{const x=JSON.parse(localStorage.getItem("levelup_coach_client_step_goal_drafts_v1")||"{}");return Number(x?.[plan.clientName]?.steps)||null}catch{return null}}
document.addEventListener("levelup:coach-publish-test-plan",async event=>{
 const plan=event.detail?.plan,status=typeof event.detail?.setStatus==="function"?event.detail.setStatus:()=>{};
 if(!plan?.training?.days?.some(day=>day.exercises?.length)){status("Add at least one exercise before publishing.");return}
 if(!plan.id){status("Save the program to a client profile before publishing.");return}
 const signed=session();if(!signed?.token||!signed.user?.id){status("First connect your own Level Up account under Clients & Analytics.");return}
 const owner=signed.user;const prompt="Publish '"+(plan.name||"this program")+"' to YOUR Level Up account ("+(owner.name||owner.email||"signed-in account")+")? This is a self-test and will not send to the selected demo client. The app must add the published plan explicitly.";
 if(!confirm(prompt))return;
 status("Checking cloud assignment version…");
 try{
  const current=await remote("assignments",{},signed.token);
  const sourcePlanId=String(plan.id),existing=(current.assignments||[]).find(x=>x.sourcePlanId===sourcePlanId&&x.coachId===owner.id);
  const result=await remote("publish",{approved:true,sourcePlanId,training:plan.training,goalWeightLb:plan.goalWeightLb||null,stepGoal:stepGoal(plan),includeNutrition:plan.includeNutrition===true,nutrition:unwrapNutrition(plan),expectedVersion:existing?existing.version:null},signed.token);
  const assignment=result.assignment;
  status("Published '"+(assignment?.name||plan.name)+"' as version "+(assignment?.version||1)+" to your Level Up cloud account. In the updated Level Up app, open More → Account & Cloud → Assigned Programs and select Add to Workout Library.");
  document.dispatchEvent(new CustomEvent("levelup:coach-test-plan-published",{detail:{assignment}}))
 }catch(error){status("Not published: "+error.message+". The new Cloudflare assignment endpoints and database migration must be deployed before this works. No athlete data was changed.")}
});
