import test from "node:test";
import assert from "node:assert/strict";
import { chooseMonthlyReportPrompt } from "../js/progress/monthly-report-lifecycle.js";
const base = { current:"2026-10", previous:"2026-09", previousHasData:true, currentHasData:true, previousDismissed:false, currentDismissed:false };
test("completed report takes priority even with current-month logs", () => {
    for (const day of [1,7]) assert.equal(chooseMonthlyReportPrompt({...base,now:new Date(2026,9,day)}),"2026-09");
});
test("completed prompt expires after day seven without exposing live report before review", () => {
    assert.equal(chooseMonthlyReportPrompt({...base,now:new Date(2026,9,8)}),null);
});
test("reviewing and closing completed report unlocks live prompt", () => {
    assert.equal(chooseMonthlyReportPrompt({...base,now:new Date(2026,9,1),previousDismissed:true}),"2026-10");
});
test("no prior data allows live prompt; no current data or dismissed live hides it", () => {
    assert.equal(chooseMonthlyReportPrompt({...base,now:new Date(2026,9,1),previousHasData:false}),"2026-10");
    assert.equal(chooseMonthlyReportPrompt({...base,now:new Date(2026,9,1),previousDismissed:true,currentHasData:false}),null);
    assert.equal(chooseMonthlyReportPrompt({...base,now:new Date(2026,9,1),previousDismissed:true,currentDismissed:true}),null);
});
