import test from "node:test";
import assert from "node:assert/strict";
import { phaseWeightInsight } from "../js/nutrition/weight-phase-insight.js";

const phase = { type: "lean-bulk", targetWeeklyRate: 1.51 };

test("a slower gain is compared with the numeric goal, not merely its direction", () => {
    const [heading, copy] = phaseWeightInsight({ phase, rate: 1.18, loggedCount: 6 });
    assert.equal(heading, "Below goal pace");
    assert.match(copy, /\+1\.18 lb\/week versus a goal of \+1\.51 lb\/week/);
    assert.match(copy, /revisit calorie intake at your next check-in/);
});

test("near-goal and sparse-data states avoid premature calorie changes", () => {
    assert.equal(phaseWeightInsight({ phase, rate: 1.42, loggedCount: 6 })[0], "Near goal pace");
    assert.equal(phaseWeightInsight({ phase, rate: 1.18, loggedCount: 2 })[0], "More data needed");
});

test("a faster cut is above goal pace, while slower loss is below", () => {
    const cut = { type: "cut", targetWeeklyRate: -0.5 };
    assert.equal(phaseWeightInsight({ phase: cut, rate: -0.9, loggedCount: 6 })[0], "Above goal pace");
    assert.equal(phaseWeightInsight({ phase: cut, rate: -0.1, loggedCount: 6 })[0], "Below goal pace");
});
