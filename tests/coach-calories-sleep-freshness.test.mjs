import test from "node:test";
import assert from "node:assert/strict";
import {coachClientDataRoute} from "../cloud/src/coach-client-data.js";
test("reports correct app food totals plus completed and partial logs, with latest synced sleep date",async()=>{
 const data={data:{level_up_food_log_v1:{"2026-11-14":[{nutrition:{calories:1200}},{nutrition:{calories:1300}}],"2026-11-16":[{nutrition:{calories:500}},{nutrition:{calories:700}}]},level_up_food_log_complete_days_v1:{"2026-11-14":true},level_up_sleep_entries:[{date:"2026-08-17",duration:7.5},{date:"2026-08-19",duration:8.0}]}};
 const user={id:"email:self",email:"coach@example.com"};
 const db={prepare:sql=>({bind:()=>({first:async()=>sql.includes("FROM users")?{id:user.id,display_name:"Self",email:user.email}:sql.includes("FROM backups")?{payload:JSON.stringify(data),version:1,updated_at:"2026-11-16T12:00:00Z"}:null})})};
 const url=new URL("https://example.com/v1/coach/clients/email%3Aself/summary");
 const response=await coachClientDataRoute({request:new Request(url),env:{DB:db,ADMIN_EMAILS:user.email},user,url});
 assert.equal(response.status,200);const payload=await response.json();
 assert.equal(payload.nutrition.latestCalorieDay.calories,1200);
 assert.equal(payload.nutrition.latestCalorieDay.complete,false);
 assert.equal(payload.nutrition.latestCompletedCalorieDay.calories,2500);
 assert.equal(payload.nutrition.latestCompletedCalorieDay.complete,true);
 assert.equal(payload.dailyMetrics.sleep.latestDate,"2026-08-19");
});
