import test from 'node:test';
import assert from 'node:assert/strict';
import { recordedSetDefaults } from '../js/workouts/recorded-set-defaults.js';
test('completion copies recorded sets, never recommendations', () => {
 const logged = {weight:50,reps:10,completed:true};
 assert.equal(recordedSetDefaults([logged,{}],1),logged);
 assert.equal(recordedSetDefaults([{},{}],1,[logged,logged]),logged);
 assert.equal(recordedSetDefaults([{targetWeight:50,targetReps:10}],0),null);
 assert.equal(recordedSetDefaults([{...logged,completed:false},{}],1),null);
 assert.equal(recordedSetDefaults([{}],0,[{...logged,weight:0}]).weight,0);
 assert.equal(recordedSetDefaults([{}],0,[{...logged,reps:0}]),null);
});

