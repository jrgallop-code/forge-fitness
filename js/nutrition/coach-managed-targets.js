/* Coach-managed targets are an opt-in overlay, not a rewrite of personal nutrition history.
 * Stored under the signed-in account ID to avoid cross-account leakage on a shared device.
 */
const PREFIX="level_up_coach_active_targets_v1_";
function accountId(){try{return JSON.parse(localStorage.getItem("level_up_cloud_account")||"null")?.id||null}catch{return null}}
function key(){const id=accountId();return id?PREFIX+id:null}
export function getCoachTargets(){const k=key();if(!k)return null;try{const value=JSON.parse(localStorage.getItem(k)||"null");return value?.mode==="coach"&&value?.accountId===accountId()?value:null}catch{return null}}
function integer(value,min,max){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:null}
export function validateCoachTargets(assignment){
 const nutrition=assignment?.nutrition,goals=assignment?.goals||{};
 if(!assignment?.id||!Number.isSafeInteger(Number(assignment.version))||Number(assignment.version)<1||!nutrition)throw Error("A versioned assignment with coach nutrition is required.");
 const calorieTarget=integer(nutrition.calorieTarget,500,10000);
 const protein=integer(nutrition.protein,0,1500),carbs=integer(nutrition.carbs,0,1500),fat=integer(nutrition.fat,0,1500);
 if([calorieTarget,protein,carbs,fat].some(x=>x===null))throw Error("Complete calorie and macro targets are required.");
 if(Math.abs(calorieTarget-(protein*4+carbs*4+fat*9))>25)throw Error("Macro calories must match the coach calorie target within 25 kcal.");
 const goalWeightLb=goals.goalWeightLb==null?null:Number(goals.goalWeightLb);
 if(goalWeightLb!==null&&(!Number.isFinite(goalWeightLb)||goalWeightLb<=0||goalWeightLb>1000))throw Error("Invalid goal weight.");
 return {calorieTarget,protein,carbs,fat,goalWeightLb};
}
export function activateCoachTargets(assignment){
 const k=key();if(!k)throw Error("Sign in to activate a coach nutrition plan.");
 const targets=validateCoachTargets(assignment);
 const active={mode:"coach",accountId:accountId(),assignmentId:String(assignment.id),version:Number(assignment.version),targets,activatedAt:new Date().toISOString()};
 localStorage.setItem(k,JSON.stringify(active));
 if(typeof window!=="undefined"){window.dispatchEvent(new CustomEvent("levelup:coach-targets-updated",{detail:{active:true}}));window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));window.dispatchEvent(new CustomEvent("levelup:current-goal-updated"))}
 return active;
}
export function stopCoachTargets(){
 const k=key();if(!k)return false;
 localStorage.removeItem(k);
 if(typeof window!=="undefined"){window.dispatchEvent(new CustomEvent("levelup:coach-targets-updated",{detail:{active:false}}));window.dispatchEvent(new CustomEvent("levelup:nutrition-updated"));window.dispatchEvent(new CustomEvent("levelup:current-goal-updated"))}
 return true;
}
