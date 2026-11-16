import test from "node:test";
import assert from "node:assert/strict";
import {coachClientDataRoute} from "../cloud/src/coach-client-data.js";
test("Coach returns real workout highlights, sleep, calories and weekly expenditure without inventing steps",async()=>{
 const user={id:"email:coach",email:"coach@example.com"};
 const data={data:{
  level_up_sleep_entries:[{date:"2026-11-14",duration:7.5,bedtime:"23:00",wakeTime:"06:30"},{date:"2026-11-15",duration:8,bedtime:"22:00",wakeTime:"06:00"}],
  forge_weight_entries:[{date:"2026-11-14",weight:172},{date:"2026-11-15",weight:172.5}],
  level_up_weekly_tdee_history_v1:[{date:"2026-11-09",maintenanceCalories:2650},{date:"2026-11-16",maintenanceCalories:2725,predictedExpenditure:2750}],
  level_up_weekly_tdee_estimate_v1:{date:"2026-11-16",estimate:{maintenanceCalories:2725}},
  level_up_food_log_v1:{"2026-11-15":[{nutrition:{calories:750}},{nutrition:{calories:850}}]},
  forge_workout_sessions:[{date:"2026-11-15",durationMinutes:55,exercises:[{exerciseId:"bench",sets:[{weight:100,reps:10,completed:true},{weight:100,reps:8,completed:true}]}]}]
 }};
 const env={ADMIN_EMAILS:user.email,DB:{prepare:sql=>({bind:()=>({first:async()=>sql.includes("coach_training_links")?{training_permission:1,nutrition_permission:1}:sql.includes("FROM users")?{id:"email:athlete",email:"athlete@example.com",display_name:"Athlete"}:sql.includes("FROM backups")?{payload:JSON.stringify(data),version:1,updated_at:"2026-11-16T14:00:00Z"}:null})})}};
 const url=new URL("https://example.com/v1/coach/clients/email%3Aathlete/summary");
 const response=await coachClientDataRoute({request:new Request(url),env,user,url});
 assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.training.totalVolumeLb,1800);
 assert.equal(body.training.completedWeightedSets,2);
 assert.equal(body.training.trainingMinutes,55);
 assert.equal(body.dailyMetrics.sleep.history.length,2);
 assert.equal(body.dailyMetrics.sleep.history[1].value,8);
 assert.equal(body.dailyMetrics.expenditure.history.length,2);
 assert.equal(body.dailyMetrics.expenditure.history.at(-1).projected,2750);
 assert.equal(body.dailyMetrics.steps.history.length,0);
 assert.equal(body.dailyMetrics.steps.sourceAvailable,false);
 assert.equal(body.nutrition.calorieHistory[0].calories,1600);
});
