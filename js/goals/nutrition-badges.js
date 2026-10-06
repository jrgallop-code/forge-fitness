import { calculateTrendWeightSeries } from '../core/weight-trend.js';
import { calculateMacroTargets, poundsToKg } from '../nutrition/tdee-calculator.js';
export const NUTRITION_BADGES = [
 ['first-plate','First Plate','Mark your first food-log day complete.',1,'foodDays'],
 ['nutrition-rhythm','Finding Your Rhythm','Complete food logs on five days within any seven calendar days.',5,'foodRhythm'],
 ['nutrition-regular','Nutrition Regular','Complete 30 food-log days in total. There is no deadline.',30,'foodDays'],
 ['protein-foundation','Protein Foundation','Meet your personal protein target on five completed days within seven days. Targets are saved when each day is completed; exceeding them gives no extra credit.',5,'proteinWeek'],
 ['protein-consistency','Protein Consistency','Meet your personal protein target on 20 completed days within 30 days. Missing a day does not erase progress.',20,'proteinMonth'],
 ['plan-practice','Plan in Practice','Complete five days within 10% of your calorie target saved when logging was completed. Eating below the range does not count.',5,'calorieDays'],
 ['checkin-ready','Check-In Ready','Complete a nutrition check-in with enough data. Keeping your current calories counts too.',1,'nutritionReviews'],
 ['nutrition-awareness','Building Awareness','Review intake summaries for four different Monday–Sunday weeks.',4,'intakeWeeks'],
 ['kitchen-creator','Kitchen Creator','Save your first custom meal containing foods.',1,'savedMeals'],
 ['personal-menu','Personal Menu','Save five distinct custom meals containing foods. Duplicate meal contents count once.',5,'savedMeals'],
 ['weight-goal','Goal Reached','Reach your chosen weight goal using trend weight after your phase starts. Both gaining and losing goals count; one weigh-in alone does not.',1,'weightGoals'],
 ['steady-ground','Steady Ground','During a maintenance phase, keep trend weight within 2% of its starting weight for 28 days, with at least three weigh-ins in each seven-day block.',1,'maintenanceGoals']
].map(([id,name,description,threshold,metric])=>({id,name,description,threshold,metric,art:id,category:'Nutrition',nutrition:true,customArt:true,showMilestone:false}));
export const nutritionEnabled = storage => read(storage,'level_up_training_preferences',{}).nutritionEnabled!==false;
const read=(s,k,f)=>{try{return JSON.parse(s.getItem(k)||'null')??f;}catch{return f;}};
const day=d=>Math.floor(Date.parse(d+'T12:00:00Z')/86400000);
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const week=d=>Math.floor((day(d)-4)/7);
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(day(d))&&new Date(day(d)*86400000).toISOString().slice(0,10)===d;
const windowMax=(dates,n)=>dates.reduce((best,d)=>Math.max(best,dates.filter(x=>day(x)>=day(d)-n+1&&day(x)<=day(d)).length),0);
export function nutritionTargets(storage){
 const phases=read(storage,'level_up_nutrition_phases',[]),phase=[...phases].reverse().find(p=>!p.endDate),plan=read(storage,'level_up_nutrition_plan',{}),pref=read(storage,'level_up_nutrition_macro',{}),profile=read(storage,'level_up_nutrition_profile',{});
 const calories=Number(phase?.currentCalories??phase?.startCalories??plan.calculatedCalories??plan.currentCalories);
 let protein=Number(pref.useManual?pref.manualMacros?.protein:pref.autoBaseline?.protein);
 if(!pref.useManual&&Number(profile.age)>=18&&Number(profile.weightLb)>0&&calories>0)try{protein=calculateMacroTargets({calories,weightKg:poundsToKg(profile.weightLb),macroPreset:pref.macroPreset||'balanced'}).protein;}catch{}
 return {calories:calories>0?calories:null,protein:protein>0?protein:null};
}
let cachedSignature=null,cachedMetrics=null;
export function nutritionBadgeMetrics(storage,now,state={}){
 const signature=JSON.stringify([key(now),state.nutritionTargets,state.intakeReviewed,...['level_up_food_log_v1','level_up_food_log_complete_days_v1','level_up_saved_meals_v1','level_up_maintenance_check_in_v1','forge_weight_entries','level_up_nutrition_phases','level_up_goal_weight'].map(k=>storage.getItem(k))]);
 if(signature===cachedSignature)return {...cachedMetrics};
 const result=calculateNutritionBadgeMetrics(storage,now,state);cachedSignature=signature;cachedMetrics=result;return {...result};
}
function calculateNutritionBadgeMetrics(storage,now,state={}){
 const today=key(now),log=read(storage,'level_up_food_log_v1',{}),complete=read(storage,'level_up_food_log_complete_days_v1',{});
 const dates=Object.keys(complete).filter(d=>validDate(d)&&d<=today&&complete[d]===true&&Array.isArray(log[d])&&log[d].length);
 const snapshots=state.nutritionTargets||{},proteinDates=[],calorieDates=[];
 for(const d of dates){const entries=log[d],target=snapshots[d],protein=entries.reduce((n,e)=>n+Math.max(0,Number(e.nutrition?.protein)||0),0),calories=entries.reduce((n,e)=>n+Math.max(0,Number(e.nutrition?.calories)||0),0);
 if(target?.protein>0&&protein>=target.protein)proteinDates.push(d);
 if(target?.calories>0&&Math.abs(calories-target.calories)<=target.calories*.1)calorieDates.push(d);}
 const meals=read(storage,'level_up_saved_meals_v1',[]).filter(m=>m.items?.length);
 const distinct=new Set(meals.map(m=>JSON.stringify(m.items.map(i=>[i.foodId||i.name,i.amount,i.nutrition]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))));
 const review=read(storage,'level_up_maintenance_check_in_v1',{});
 const weights=[...new Map(read(storage,'forge_weight_entries',[]).filter(w=>validDate(w.date)&&w.date<=today&&Number(w.weight)>0).map(w=>[w.date,w])).values()];
 const trend=calculateTrendWeightSeries(weights),phases=read(storage,'level_up_nutrition_phases',[]);
 let weightGoals=0,maintenanceGoals=0;
 for(const phase of phases){if(!validDate(phase.startDate))continue;const end=phase.endDate&&phase.endDate<today?phase.endDate:today,series=trend.filter(p=>p.date>=phase.startDate&&p.date<=end),weigh=weights.filter(p=>p.date>=phase.startDate&&p.date<=end),start=Number(phase.startWeight),goal=Number(phase.goalWeight??phase.targetWeight??(!phase.endDate?storage.getItem('level_up_goal_weight'):null));
 if(start>0&&goal>0&&Math.abs(start-goal)>.1&&weigh.length>=3&&day(end)-day(phase.startDate)>=7&&series.some(p=>day(p.date)-day(phase.startDate)>=7&&(goal>start?p.weight>=goal:p.weight<=goal)))weightGoals=1;
 if(phase.type==='maintenance'&&start>0){for(const p of series){const first=day(p.date)-27;if(first<day(phase.startDate))continue;const portion=series.filter(x=>day(x.date)>=first&&day(x.date)<=day(p.date));if(portion.length===28&&portion.every(x=>Math.abs(x.weight-start)<=start*.02)&&[0,7,14,21].every(offset=>weigh.filter(x=>day(x.date)>=first+offset&&day(x.date)<first+offset+7).length>=3)){maintenanceGoals=1;break;}}}
 }
 return {foodDays:dates.length,foodRhythm:windowMax(dates,7),proteinWeek:windowMax(proteinDates,7),proteinMonth:windowMax(proteinDates,30),calorieDays:calorieDates.length,nutritionReviews:validDate(review.reviewedAt)&&review.reviewedAt<=today&&Number(review.estimate)>0?1:0,intakeWeeks:new Set((state.intakeReviewed||[]).filter(d=>validDate(d)&&d<=today).map(week)).size,savedMeals:distinct.size,weightGoals,maintenanceGoals};
}
