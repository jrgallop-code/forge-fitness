/* Assigned programs are opt-in copies, never overwrites of training history. */
import { importSharedWorkoutPackage } from "../workouts/workout-sharing.js?v=pwa-share-workout-1";
import { getAllExercises } from "../workouts/exercise-library.js?v=exercise-library-catalogue-2";
import "../workouts/exercise-library-expansion.js?v=exercise-library-expansion-1";

function readStored(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function hasTarget(value) { return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)); }
function validTarget(value, min, max) { return hasTarget(value) && Number(value) >= min && Number(value) <= max; }
function coachTargets(plan) {
    const raw = plan?.nutrition || {};
    const targets = {};
    if (validTarget(raw.calorieTarget, 500, 10000)) targets.calories = Math.round(Number(raw.calorieTarget));
    const macros = ["protein", "carbs", "fat"];
    if (macros.every(key => validTarget(raw[key], 0, 1500))) {
        targets.macros = Object.fromEntries(macros.map(key => [key, Math.round(Number(raw[key]))]));
    }
    if (validTarget(plan?.goals?.goalWeightLb, 1, 1000)) targets.goalWeightLb = Number(plan.goals.goalWeightLb);
    return targets;
}
function targetSummary(targets) {
    return [
        targets.calories ? targets.calories + " kcal/day" : "",
        targets.macros ? ["protein", "carbs", "fat"].map(k => targets.macros[k] + "g " + k).join(" · ") : "",
        targets.goalWeightLb ? "Goal weight " + targets.goalWeightLb + " lb" : ""
    ].filter(Boolean).join(" · ");
}
export function applyCoachNutritionTargets(plan, storage = localStorage) {
    const targets = coachTargets(plan);
    if (!Object.keys(targets).length) throw Error("This assignment has no usable nutrition or goal-weight targets.");
    const keys = ["level_up_nutrition_plan", "level_up_nutrition_macro", "level_up_nutrition_phases", "level_up_goal_weight", "level_up_current_goal"];
    const previous = new Map(keys.map(k => [k, storage.getItem(k)]));
    const read = key => { try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; } };
    const now = new Date().toISOString();
    try {
        if (targets.calories) {
            const current = read("level_up_nutrition_plan") || {};
            const old = Number(current.calculatedCalories ?? current.currentCalories);
            const adjustments = Array.isArray(current.adjustmentHistory) ? current.adjustmentHistory : [];
            storage.setItem("level_up_nutrition_plan", JSON.stringify({
                ...current, calculatedCalories: targets.calories, currentCalories: targets.calories,
                adjustmentHistory: old === targets.calories ? adjustments : [...adjustments, {
                    date: now, previousCalories: Number.isFinite(old) && old > 0 ? old : null,
                    newCalories: targets.calories, reason: "Coach assignment " + plan.id + " v" + plan.version
                }]
            }));
        }
        if (targets.macros) {
            const current = read("level_up_nutrition_macro") || {};
            storage.setItem("level_up_nutrition_macro", JSON.stringify({
                ...current, macroPreset: "manual", useManual: true, manualMacros: targets.macros, updatedAt: now
            }));
        }
        if (targets.goalWeightLb) {
            storage.setItem("level_up_goal_weight", String(targets.goalWeightLb));
            const goal = read("level_up_current_goal");
            if (goal && !goal.endDate && goal.status !== "archived") {
                storage.setItem("level_up_current_goal", JSON.stringify({
                    ...goal, targetWeight: targets.goalWeightLb, updatedAt: now
                }));
            }
        }
        if (targets.calories || targets.goalWeightLb) {
            const phases = read("level_up_nutrition_phases");
            if (Array.isArray(phases)) {
                const activeIndex = phases.findLastIndex(p => p && !p.endDate);
                if (activeIndex >= 0) {
                    const phase = phases[activeIndex];
                    phases[activeIndex] = {
                        ...phase,
                        ...(targets.calories ? {currentCalories: targets.calories} : {}),
                        ...(targets.goalWeightLb ? {goalWeight: targets.goalWeightLb} : {}),
                        updatedAt: now
                    };
                    storage.setItem("level_up_nutrition_phases", JSON.stringify(phases));
                }
            }
        }
    } catch (error) {
        for (const [key, value] of previous) {
            if (value === null) storage.removeItem(key);
            else storage.setItem(key, value);
        }
        throw error;
    }
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", {detail: {source: "coach-assignment", assignmentId: plan.id}}));
        window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated", {detail: {source: "coach-assignment"}}));
    }
    return targets;
}

const API="https://api.leveluphypertrophy.com";
function account(){try{return{user:JSON.parse(localStorage.getItem("level_up_cloud_account")||"null"),session:JSON.parse(localStorage.getItem("level_up_cloud_session")||"null")}}catch{return{}}}
const E=(tag,attrs={},items=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==="text")n.textContent=v;else if(k==="className")n.className=v;else if(k==="onClick")n.addEventListener("click",v);else n.setAttribute(k,v)}n.append(...items);return n};
const key=id=>"level_up_coach_program_imports_v1_"+id;
function imported(id){try{return JSON.parse(localStorage.getItem(key(id))||"{}")||{}}catch{return{}}}
export function renderCoachProgramInbox(){return '<section class="section-card coach-assigned-programs" id="coach-assigned-programs"><span class="eyebrow">MY COACH</span><h3>Assigned Programs</h3><p>Review a new program or updated version before adding it to your workout library. Your completed workouts and existing plans are never overwritten.</p><div id="coach-assigned-program-list"></div><button class="secondary-btn" type="button" id="coach-assigned-refresh">Check for New Programs</button><p id="coach-assigned-status" aria-live="polite"></p></section>'}
export function initializeCoachProgramInbox(){const host=document.getElementById("coach-assigned-programs"),list=host?.querySelector("#coach-assigned-program-list"),status=host?.querySelector("#coach-assigned-status"),refresh=host?.querySelector("#coach-assigned-refresh");if(!host||!list||!refresh)return;
async function load(){const {user,session}=account();list.replaceChildren();if(!user?.id||!session?.token){list.append(E("p",{text:"Sign in to Level Up Account & Cloud to view assigned coaching programs."}));return}
refresh.disabled=true;status.textContent="Checking for coaching programs…";
try{const response=await fetch(API+"/v1/client/coach-assignments",{headers:{Authorization:"Bearer "+session.token},cache:"no-store"}),data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||"Coach assignments are not available yet.");const assignments=Array.isArray(data.assignments)?data.assignments:[];if(!assignments.length)list.append(E("p",{text:"No coaching programs assigned yet."}));
for(const plan of assignments){const previous=Number(imported(user.id)[plan.id]?.version)||0,version=Number(plan.version)||1,card=E("article",{className:"coach-assigned-card"});card.append(E("strong",{text:plan.name||"Coach Program"}),E("p",{text:(plan.training?.days?.length||0)+" workout days · Version "+version+(previous>=version?" · Already added":previous?" · Updated version":" · New")}));
const goals=[plan.goals?.goalWeightLb?"Goal weight: "+plan.goals.goalWeightLb+" lb":"",plan.goals?.stepGoal?"Step goal: "+plan.goals.stepGoal:"",plan.includeNutrition?"Nutrition included":"Training only"].filter(Boolean);card.append(E("p",{text:goals.join(" · ")}));
const button=E("button",{className:"secondary-btn",type:"button",text:previous>=version?"Add Another Copy":previous?"Add Updated Program":"Add to Workout Library"});button.onclick=()=>{if(!confirm("Add this assigned program to your workout library? Your existing workout plans and history will not be replaced."))return;try{const known=new Set(getAllExercises().map(ex=>String(ex.id)));const missing=[...new Set((plan.training?.days||[]).flatMap(day=>day.exercises||[]).map(ex=>String(ex.id||"")).filter(id=>!known.has(id)))];if(missing.length)throw Error("This plan contains exercise IDs that aren't in your Level Up library: "+missing.slice(0,4).join(", ")+". Ask your coach to update the plan.");const packageValue={kind:"levelup-workout",version:1,plan:{...structuredClone(plan.training),sourceType:"coach-assigned",coachAssignmentId:plan.id,coachAssignmentVersion:version},customExercises:[]};const added=importSharedWorkoutPackage(packageValue),updated=imported(user.id);updated[plan.id]={version,planId:added.id,importedAt:new Date().toISOString()};localStorage.setItem(key(user.id),JSON.stringify(updated));status.textContent="Added "+added.name+" to Workout Library. Previous plans and completed workouts are unchanged.";void load()}catch(error){status.textContent="Unable to add plan: "+error.message}};card.append(button);
const targets = coachTargets(plan);
if (Object.keys(targets).length) {
    const appliedVersion = Number(imported(user.id)[plan.id]?.targetsVersion) || 0;
    card.append(E("p", {text: "Coach targets: " + targetSummary(targets)}));
    const apply = E("button", {className: "secondary-btn", type: "button", text: appliedVersion >= version ? "Reapply Coach Targets" : "Review & Apply Coach Targets"});
    apply.onclick = () => {
        const details = targetSummary(targets);
        const existingPlan = readStored("level_up_nutrition_plan") || {};
        const existingMacro = readStored("level_up_nutrition_macro") || {};
        const oldCalories = existingPlan.calculatedCalories ?? existingPlan.currentCalories;
        const oldMacros = existingMacro.useManual ? existingMacro.manualMacros : null;
        const current = [hasTarget(oldCalories) && Number(oldCalories) > 0 ? "Calories: " + oldCalories + " kcal/day" : "",
            oldMacros ? "Macros: " + ["protein","carbs","fat"].map(k=>oldMacros[k] + "g " + k).join(" · ") : "",
            localStorage.getItem("level_up_goal_weight") ? "Goal weight: " + localStorage.getItem("level_up_goal_weight") + " lb" : ""
        ].filter(Boolean).join("\n") || "No current targets found";
        if (!confirm("Review your coach's prescribed targets\n\nCURRENT\n" + current +
            "\n\nCOACH PRESCRIPTION\n" + details +
            "\n\nApply these targets? This changes current targets only; previous food logs, weigh-ins and completed workouts remain intact.")) return;
        try {
            applyCoachNutritionTargets(plan);
            const updated = imported(user.id);
            updated[plan.id] = {...(updated[plan.id]||{}), targetsVersion: version, targetsAppliedAt: new Date().toISOString()};
            localStorage.setItem(key(user.id), JSON.stringify(updated));
            status.textContent = "Coach calorie, macro and goal-weight targets applied. Previous logs and workouts are unchanged.";
            void load();
        } catch (error) { status.textContent = "Unable to apply coach targets: " + error.message; }
    };
    card.append(apply);
}
list.append(card)}status.textContent=assignments.length+" program(s) available."}catch(error){list.append(E("p",{text:error.message}));status.textContent="Could not check assignments; your data was not changed."}finally{refresh.disabled=false}}
refresh.onclick=load;const style=E("style",{text:".coach-assigned-programs{display:grid;gap:10px}.coach-assigned-card{display:grid;gap:8px;border:1px solid var(--line,#ddd);border-radius:10px;padding:14px;margin:9px 0}.coach-assigned-card p{margin:0;font-size:12px;color:var(--muted,#777)}"});host.append(style);void load()
}