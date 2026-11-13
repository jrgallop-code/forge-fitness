const exercise=(id,sets=3,reps='8-15')=>({id,sets,reps});
const day=(name,items)=>({name,exercises:items});
const plan=(id,name,daysPerWeek,estimatedMinutes,level,description,days,equipmentNotes)=>({id,name,daysPerWeek,estimatedMinutes,level,trainingType:'Hypertrophy',sourceLabel:'Level Up bodyweight',description,days,equipmentNotes});
export const bodyweightWorkoutPlans=[
 plan('bodyweight-no-equipment-foundation','Bodyweight Foundation — No Equipment',3,'20-30','Beginner',
 'Three short sessions for equipment-free strength and core training. A mat is optional. Add a pulling movement when a suitable bar is available.',[
 day('Day 1 - Full Body A',[exercise('bodyweight-squat',3,'10-20'),exercise('push-up',3,'6-15'),exercise('glute-bridge',3,'12-20'),exercise('bird-dog',2,'8-12 / side')]),
 day('Day 2 - Full Body B',[exercise('bodyweight-squat',3,'10-20'),exercise('pike-push-up',2,'6-12'),exercise('glute-bridge',3,'12-20'),exercise('dead-bug',2,'8-12 / side')]),
 day('Day 3 - Full Body C',[exercise('push-up',3,'6-15'),exercise('bodyweight-squat',3,'10-20'),exercise('glute-bridge',3,'12-20'),exercise('single-leg-calf-raise',2,'12-20 / side')])
 ],'No equipment required. Use incline push-ups against a stable surface if needed.'),
 plan('bodyweight-two-day-full-body','Bodyweight Full Body — 2 Days',2,'30-40','Beginner / Intermediate',
 'Two full-body sessions with pushing, pulling, lower-body work and core. Requires a secure pull-up bar; no external weights.',[
 day('Day 1 - Full Body A',[exercise('bodyweight-squat',3,'12-20'),exercise('pull-up',3,'3-8'),exercise('push-up',3,'8-15'),exercise('glute-bridge',3,'12-20'),exercise('dead-bug',2,'8-12 / side')]),
 day('Day 2 - Full Body B',[exercise('bodyweight-squat',3,'12-20'),exercise('chin-up',3,'3-8'),exercise('pike-push-up',3,'6-12'),exercise('glute-bridge',3,'12-20'),exercise('bird-dog',2,'8-12 / side')])
 ],'Secure pull-up bar required. Bodyweight means no external load, not necessarily no equipment.'),
 plan('bodyweight-four-day-upper-lower','Bodyweight Upper / Lower — 4 Days',4,'25-40','Intermediate',
 'An upper/lower bodyweight split with repeatable rep targets. Requires a secure pull-up bar; no dumbbells, barbells or machines.',[
 day('Day 1 - Upper A',[exercise('pull-up',3,'4-10'),exercise('push-up',3,'8-20'),exercise('pike-push-up',3,'6-12'),exercise('bird-dog',2,'8-12 / side')]),
 day('Day 2 - Lower A',[exercise('bodyweight-squat',4,'12-25'),exercise('glute-bridge',3,'12-25'),exercise('single-leg-calf-raise',3,'12-20 / side'),exercise('dead-bug',2,'8-12 / side')]),
 day('Day 3 - Upper B',[exercise('chin-up',3,'4-10'),exercise('push-up',3,'8-20'),exercise('pike-push-up',3,'6-12'),exercise('bird-dog',2,'8-12 / side')]),
 day('Day 4 - Lower B',[exercise('bodyweight-squat',4,'12-25'),exercise('glute-bridge',3,'12-25'),exercise('single-leg-calf-raise',3,'12-20 / side'),exercise('dead-bug',2,'8-12 / side')])
 ],'Secure pull-up bar required. Stop short of technique breakdown; use controlled repetitions.')
];
