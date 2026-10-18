// Practice data is intentionally memory-only: never pass it to persistence or sync.
export function localDate(date) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function createNutritionDemo(today=new Date()) {
 const weights=Array.from({length:56},(_,i)=>{const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-56+i,12);return {date:localDate(d),weight:Number((178-i*.075+Math.sin(i*1.7)*.65+Math.cos(i*.6)*.25).toFixed(1))};});
 return {today:localDate(today),weights,goal:170,rate:.5,calories:2400,meal:'Dinner',items:[],range:56};
}
export const toDisplayWeight=(lb,unit)=>Number((lb*(unit==='kg'?.45359237:1)).toFixed(1));
export const toPounds=(value,unit)=>Number(value)/(unit==='kg'?.45359237:1);
export function saveDemoWeight(state,value,unit) {
 const weight=toPounds(value,unit);if(!Number.isFinite(weight)||weight<44||weight>1400)return false;
 state.weights=state.weights.filter(e=>e.date!==state.today).concat({date:state.today,weight});return true;
}
function food(id,name,grams,nutrition) {
 const portions=[{label:'serving',grams,nutrition}];
 for(const [inputUnit,size] of [['g',1],['oz',28.349523125]])portions.push({label:inputUnit,inputUnit,grams:size,nutrition:Object.fromEntries(Object.entries(nutrition).map(([k,v])=>[k,v*size/grams]))});
 return {id,name,description:name,portions};
}
export const DEMO_FOODS=[
 food('demo-yogurt','Plain Greek yogurt',170,{calories:100,protein:17,carbs:6,fat:0,calcium:190,sodium:60}),
 food('demo-blueberries','Blueberries',100,{calories:57,protein:.7,carbs:14.5,fat:.3,fiber:2.4,sugars:10,vitaminC:9.7,potassium:77}),
 food('demo-oats','Rolled oats',40,{calories:152,protein:5,carbs:27,fat:3,fiber:4,iron:1.7}),
 food('demo-chicken','Cooked chicken breast',100,{calories:165,protein:31,carbs:0,fat:3.6}),
 food('demo-rice','Cooked rice',100,{calories:130,protein:2.7,carbs:28,fat:.3}),
 food('demo-oil','Olive oil',15,{calories:133,protein:0,carbs:0,fat:15}),
 food('demo-banana','Banana',118,{calories:105,protein:1.3,carbs:27,fat:.4,fiber:3.1})
];
export function demoMealTotals(items) {
 return items.reduce((total,item)=>{const n=DEMO_FOODS[item.food].portions[item.portion].nutrition;for(const k of Object.keys(total))total[k]+=(n[k]||0)*item.quantity;return total;},{calories:0,protein:0,carbs:0,fat:0});
}

export function nutritionPracticeSeed(preferences={},today=new Date()) {
 const demo=createNutritionDemo(today),first=demo.weights[0].date;
 const foods=DEMO_FOODS.map(f=>({...f,source:'custom',catalogueId:f.id,brand:'Practice example'}));
 const log={};
 demo.weights.forEach((w,i)=>{log[w.date]=foods.map((food,j)=>({id:`practice-${i}-${j}`,source:'custom',catalogueId:food.id,name:food.name,brand:food.brand,meal:j<3?'Breakfast':j<6?'Dinner':'Snacks',quantity:[2,1.5,2,4,6,2,1][j],servingLabel:food.portions[0].label,nutrition:Object.fromEntries(Object.entries(food.portions[0].nutrition).map(([k,v])=>[k,v*[2,1.5,2,4,6,2,1][j]])),food}));});
 const phase={id:'practice-phase',goalId:'cut_gentle',type:'fat_loss',label:'Fat Loss — Gentle',startDate:first,endDate:null,startingTrendWeight:178.3,startWeight:178.3,goalWeight:170,targetWeight:170,targetWeeklyRate:-.5,maintenanceCalories:2650,startCalories:2400,currentCalories:2400,dailyCalorieAdjustment:-250,status:'active',adjustments:[]};
 const safePreferences=Object.fromEntries(['level_up_appearance_settings','level_up_unit_preferences_v2','level_up_unit_system'].filter(k=>preferences[k]!=null).map(k=>[k,preferences[k]]));
 const values={...safePreferences,level_up_guest_mode:'1',level_up_training_preferences:JSON.stringify({onboardingComplete:true,nutritionEnabled:true}),level_up_whats_new_ios_launch_2026_09_views:'1',forge_weight_entries:JSON.stringify(demo.weights),level_up_weight_chart_range:'all',level_up_food_log_v1:JSON.stringify(log),level_up_nutrition_macro:JSON.stringify({useManual:true,manualMacros:{protein:150,carbs:300,fat:67}}),level_up_food_log_complete_days_v1:JSON.stringify(Object.fromEntries(demo.weights.map(w=>[w.date,true]))),level_up_custom_foods_v1:JSON.stringify(foods),level_up_goal_weight:'170',level_up_nutrition_phases:JSON.stringify([phase]),level_up_nutrition_goal:JSON.stringify({goalId:'cut_gentle'}),level_up_nutrition_profile:JSON.stringify({age:30,sex:'female',heightCm:170,weightKg:79,activity:'moderate'}),level_up_nutrition_plan:JSON.stringify({calculatedCalories:2400,currentCalories:2400,adjustmentHistory:[]}),level_up_manual_maintenance_calories:'2650',level_up_saved_meals_v1:JSON.stringify([{id:'practice-meal',name:'Yogurt & Blueberries',items:log[demo.weights.at(-1).date].slice(0,2)}])};
 // Copy appearance/units only. Never copy sessions, cloud credentials or real records.
 return Object.fromEntries(Object.entries(values).map(([key,value])=>[key,String(value)]));
}
