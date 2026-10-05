import './exercise-library-expansion.js?v=exercise-library-expansion-1';
import { getExerciseById } from './exercise-library.js?v=exercise-library-catalogue-2';
const makeCircuit = (id, name, description, equipment, rounds, restSeconds, items) => ({
 id, circuitId:id, trainingContext:'circuit', name, description, sourceLabel:'Level Up circuit',
 trainingType:'circuit', catalogueCategory:'circuit', level:'Beginner / Intermediate', equipment,
 daysPerWeek:1, durationMinutes:20, rounds, circuitRestSeconds:restSeconds,
 days:[{name:'Circuit',exercises:items.map(([exerciseId,reps])=>({id:exerciseId,name:getExerciseById(exerciseId)?.name,sets:rounds,reps:String(reps) + (["single-arm-dumbbell-row","dead-bug"].includes(exerciseId) ? " / side" : ""),supersetGroup:id,circuitId:id,trainingContext:'circuit'}))}]
});
export const circuitTemplates = [
 makeCircuit('level-up-circuit-dumbbells','Full-Body Dumbbell Circuit','Squat, push, hinge and pull. Use controlled reps and a manageable load.','Dumbbells',4,90,[['goblet-squat',10],['push-up',10],['dumbbell-romanian-deadlift',10],['single-arm-dumbbell-row',10]]),
 makeCircuit('level-up-circuit-bodyweight','Bodyweight Circuit','A simple equipment-free circuit with controlled reps.','Bodyweight',3,60,[['bodyweight-squat',12],['push-up',8],['glute-bridge',12],['dead-bug',10]]),
 makeCircuit('level-up-circuit-upper','Upper-Body Dumbbell Circuit','A compact circuit for shoulders, back and arms.','Dumbbells',3,90,[['dumbbell-shoulder-press',10],['single-arm-dumbbell-row',10],['dumbbell-curl',12],['lateral-raise',12]])
];
