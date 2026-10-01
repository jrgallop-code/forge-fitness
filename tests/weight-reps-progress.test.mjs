import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = { getItem() { return null; } };
const { selectWeightSet } = await import('../js/progress/exercise-progress-v2.js');
const { supportsEquipmentProfiles } = await import('../js/workouts/equipment-profiles.js');
test('weight milestone follows load when estimated strength is flat', () => {
    const before = selectWeightSet([{weight:50,reps:12},{weight:45,reps:14}]);
    const after = selectWeightSet([{weight:55,reps:8},{weight:50,reps:10}]);
    assert.equal(after.weight - before.weight, 5);
    assert.equal(after.reps, 8);
    assert.ok(Math.abs(55*(1+8/30)-50*(1+12/30)) < 1);
});
test('rep progression uses most reps at heaviest load and ignores warmups and drop rows', () => {
    assert.deepEqual(selectWeightSet([{weight:100,reps:1,isWarmup:true},{weight:90,reps:2,setType:'dropset'},{weight:55,reps:8},{weight:55,reps:10},{weight:50,reps:15}]), {weight:55,reps:10});
    assert.equal(selectWeightSet([{weight:50,reps:0}]), null);
});
test('machine selector applies to machines and cables only', () => {
    for (const equipment of ['Barbell','Dumbbells','Bodyweight','Kettlebell']) assert.equal(supportsEquipmentProfiles({equipment}), false);
    for (const equipment of ['Machine','Cable']) assert.equal(supportsEquipmentProfiles({equipment}), true);
});
