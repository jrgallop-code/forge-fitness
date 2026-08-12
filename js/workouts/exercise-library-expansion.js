import { exercises } from './exercise-library.js?v=exercise-library-catalogue-2';

export const expandedExercises = [
  { id:'smith-machine-bench-press', name:'Smith Machine Bench Press', muscleGroup:'Chest', type:'compound', equipment:'Smith Machine', recommendedReps:'6-10', defaultSets:3, trackingType:'reps' },
  { id:'smith-machine-incline-press', name:'Smith Machine Incline Press', muscleGroup:'Chest', type:'compound', equipment:'Smith Machine', recommendedReps:'6-10', defaultSets:3, trackingType:'reps' },
  { id:'incline-machine-chest-press', name:'Incline Machine Chest Press', muscleGroup:'Chest', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'converging-chest-press', name:'Converging Chest Press', muscleGroup:'Chest', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'deficit-push-up', name:'Deficit Push-Up', muscleGroup:'Chest', type:'compound', equipment:'Bodyweight', recommendedReps:'8-20', defaultSets:3, trackingType:'reps' },
  { id:'weighted-push-up', name:'Weighted Push-Up', muscleGroup:'Chest', type:'compound', equipment:'Weighted Bodyweight', recommendedReps:'6-15', defaultSets:3, trackingType:'reps' },
  { id:'dumbbell-fly', name:'Dumbbell Fly', muscleGroup:'Chest', type:'isolation', equipment:'Dumbbells', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },
  { id:'incline-dumbbell-fly', name:'Incline Dumbbell Fly', muscleGroup:'Chest', type:'isolation', equipment:'Dumbbells', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },
  { id:'low-to-high-cable-fly', name:'Low-to-High Cable Fly', muscleGroup:'Chest', type:'isolation', equipment:'Cable', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },
  { id:'high-to-low-cable-fly', name:'High-to-Low Cable Fly', muscleGroup:'Chest', type:'isolation', equipment:'Cable', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },

  { id:'single-arm-cable-lat-pulldown', name:'Single-Arm Cable Lat Pulldown', muscleGroup:'Back', type:'compound', equipment:'Cable', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'neutral-grip-lat-pulldown', name:'Neutral-Grip Lat Pulldown', muscleGroup:'Back', type:'compound', equipment:'Cable', recommendedReps:'8-12', defaultSets:3, trackingType:'reps' },
  { id:'wide-grip-lat-pulldown', name:'Wide-Grip Lat Pulldown', muscleGroup:'Back', type:'compound', equipment:'Cable', recommendedReps:'8-12', defaultSets:3, trackingType:'reps' },
  { id:'underhand-lat-pulldown', name:'Underhand Lat Pulldown', muscleGroup:'Back', type:'compound', equipment:'Cable', recommendedReps:'8-12', defaultSets:3, trackingType:'reps' },
  { id:'chest-supported-t-bar-row', name:'Chest-Supported T-Bar Row', muscleGroup:'Back', type:'compound', equipment:'Machine', recommendedReps:'8-12', defaultSets:3, trackingType:'reps' },
  { id:'plate-loaded-high-row', name:'Plate-Loaded High Row', muscleGroup:'Back', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'one-arm-machine-row', name:'One-Arm Machine Row', muscleGroup:'Back', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'dumbbell-pullover', name:'Dumbbell Pullover', muscleGroup:'Back', type:'compound', equipment:'Dumbbells', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'t-bar-row', name:'T-Bar Row', muscleGroup:'Back', type:'compound', equipment:'Landmine', recommendedReps:'6-12', defaultSets:3, trackingType:'reps' },
  { id:'seal-row', name:'Seal Row', muscleGroup:'Back', type:'compound', equipment:'Barbell', recommendedReps:'8-12', defaultSets:3, trackingType:'reps' },
  { id:'meadows-row', name:'Meadows Row', muscleGroup:'Back', type:'compound', equipment:'Landmine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'wide-grip-cable-row', name:'Wide-Grip Cable Row', muscleGroup:'Back', type:'compound', equipment:'Cable', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },

  { id:'machine-lateral-raise', name:'Machine Lateral Raise', muscleGroup:'Shoulders', type:'isolation', equipment:'Machine', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'leaning-cable-lateral-raise', name:'Leaning Cable Lateral Raise', muscleGroup:'Shoulders', type:'isolation', equipment:'Cable', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'cuffed-cable-lateral-raise', name:'Cuffed Cable Lateral Raise', muscleGroup:'Shoulders', type:'isolation', equipment:'Cable', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'smith-machine-shoulder-press', name:'Smith Machine Shoulder Press', muscleGroup:'Shoulders', type:'compound', equipment:'Smith Machine', recommendedReps:'6-12', defaultSets:3, trackingType:'reps' },
  { id:'arnold-press', name:'Arnold Press', muscleGroup:'Shoulders', type:'compound', equipment:'Dumbbells', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'cable-y-raise', name:'Cable Y-Raise', muscleGroup:'Shoulders', type:'isolation', equipment:'Cable', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'cable-rear-delt-fly', name:'Cable Rear-Delt Fly', muscleGroup:'Rear Delts', type:'isolation', equipment:'Cable', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'chest-supported-rear-delt-row', name:'Chest-Supported Rear-Delt Row', muscleGroup:'Rear Delts', type:'compound', equipment:'Dumbbells', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },
  { id:'dumbbell-shrug', name:'Dumbbell Shrug', muscleGroup:'Traps', type:'compound', equipment:'Dumbbells', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'smith-machine-shrug', name:'Smith Machine Shrug', muscleGroup:'Traps', type:'compound', equipment:'Smith Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },

  { id:'bayesian-cable-curl', name:'Bayesian Cable Curl', muscleGroup:'Biceps', type:'isolation', equipment:'Cable', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },
  { id:'dumbbell-preacher-curl', name:'Dumbbell Preacher Curl', muscleGroup:'Biceps', type:'isolation', equipment:'Dumbbells', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'ez-bar-preacher-curl', name:'EZ-Bar Preacher Curl', muscleGroup:'Biceps', type:'isolation', equipment:'EZ Bar', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'cable-preacher-curl', name:'Cable Preacher Curl', muscleGroup:'Biceps', type:'isolation', equipment:'Cable', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },
  { id:'machine-preacher-curl', name:'Machine Preacher Curl', muscleGroup:'Biceps', type:'isolation', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'cross-body-hammer-curl', name:'Cross-Body Hammer Curl', muscleGroup:'Biceps', type:'isolation', equipment:'Dumbbells', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'spider-curl', name:'Spider Curl', muscleGroup:'Biceps', type:'isolation', equipment:'Dumbbells', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },
  { id:'reverse-curl', name:'Reverse Curl', muscleGroup:'Biceps', type:'isolation', equipment:'EZ Bar', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },

  { id:'single-arm-overhead-cable-extension', name:'Single-Arm Overhead Cable Extension', muscleGroup:'Triceps', type:'isolation', equipment:'Cable', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },
  { id:'cross-body-cable-triceps-extension', name:'Cross-Body Cable Triceps Extension', muscleGroup:'Triceps', type:'isolation', equipment:'Cable', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },
  { id:'cable-skull-crusher', name:'Cable Skull Crusher', muscleGroup:'Triceps', type:'isolation', equipment:'Cable', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },
  { id:'ez-bar-skull-crusher', name:'EZ-Bar Skull Crusher', muscleGroup:'Triceps', type:'isolation', equipment:'EZ Bar', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'machine-dip', name:'Machine Dip', muscleGroup:'Triceps', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'weighted-dip', name:'Weighted Dip', muscleGroup:'Triceps', type:'compound', equipment:'Weighted Bodyweight', recommendedReps:'6-12', defaultSets:3, trackingType:'reps' },
  { id:'single-arm-triceps-pushdown', name:'Single-Arm Triceps Pushdown', muscleGroup:'Triceps', type:'isolation', equipment:'Cable', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },
  { id:'rope-triceps-pushdown', name:'Rope Triceps Pushdown', muscleGroup:'Triceps', type:'isolation', equipment:'Cable', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },

  { id:'pendulum-squat', name:'Pendulum Squat', muscleGroup:'Quads', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'smith-machine-squat', name:'Smith Machine Squat', muscleGroup:'Quads', type:'compound', equipment:'Smith Machine', recommendedReps:'6-12', defaultSets:3, trackingType:'reps' },
  { id:'reverse-nordic-curl', name:'Reverse Nordic Curl', muscleGroup:'Quads', type:'isolation', equipment:'Bodyweight', recommendedReps:'8-20', defaultSets:3, trackingType:'reps' },
  { id:'belt-squat', name:'Belt Squat', muscleGroup:'Quads', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'heel-elevated-squat', name:'Heel-Elevated Squat', muscleGroup:'Quads', type:'compound', equipment:'Dumbbells', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'walking-lunge', name:'Walking Lunge', muscleGroup:'Quads', type:'compound', equipment:'Dumbbells', recommendedReps:'8-20', defaultSets:3, trackingType:'reps' },
  { id:'reverse-lunge', name:'Reverse Lunge', muscleGroup:'Quads', type:'compound', equipment:'Dumbbells', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'single-leg-leg-press', name:'Single-Leg Leg Press', muscleGroup:'Quads', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },

  { id:'single-leg-leg-curl', name:'Single-Leg Leg Curl', muscleGroup:'Hamstrings', type:'isolation', equipment:'Machine', recommendedReps:'10-15', defaultSets:3, trackingType:'reps' },
  { id:'nordic-hamstring-curl', name:'Nordic Hamstring Curl', muscleGroup:'Hamstrings', type:'compound', equipment:'Bodyweight', recommendedReps:'5-12', defaultSets:3, trackingType:'reps' },
  { id:'smith-machine-romanian-deadlift', name:'Smith Machine Romanian Deadlift', muscleGroup:'Hamstrings', type:'compound', equipment:'Smith Machine', recommendedReps:'8-12', defaultSets:3, trackingType:'reps' },
  { id:'dumbbell-romanian-deadlift', name:'Dumbbell Romanian Deadlift', muscleGroup:'Hamstrings', type:'compound', equipment:'Dumbbells', recommendedReps:'8-12', defaultSets:3, trackingType:'reps' },
  { id:'glute-ham-raise', name:'Glute-Ham Raise', muscleGroup:'Hamstrings', type:'compound', equipment:'Machine', recommendedReps:'6-15', defaultSets:3, trackingType:'reps' },

  { id:'machine-hip-thrust', name:'Machine Hip Thrust', muscleGroup:'Glutes', type:'compound', equipment:'Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'smith-machine-hip-thrust', name:'Smith Machine Hip Thrust', muscleGroup:'Glutes', type:'compound', equipment:'Smith Machine', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'cable-glute-kickback', name:'Cable Glute Kickback', muscleGroup:'Glutes', type:'isolation', equipment:'Cable', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'hip-abduction-machine', name:'Hip Abduction Machine', muscleGroup:'Glutes', type:'isolation', equipment:'Machine', recommendedReps:'12-25', defaultSets:3, trackingType:'reps' },
  { id:'hip-adduction-machine', name:'Hip Adduction Machine', muscleGroup:'Adductors', type:'isolation', equipment:'Machine', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },
  { id:'copenhagen-plank', name:'Copenhagen Plank', muscleGroup:'Adductors', type:'isolation', equipment:'Bodyweight', recommendedReps:'20-45 sec', defaultSets:3, trackingType:'duration' },

  { id:'tibialis-raise', name:'Tibialis Raise', muscleGroup:'Tibialis', type:'isolation', equipment:'Bodyweight', recommendedReps:'15-30', defaultSets:3, trackingType:'reps' },
  { id:'hanging-leg-raise', name:'Hanging Leg Raise', muscleGroup:'Core', type:'compound', equipment:'Bodyweight', recommendedReps:'8-15', defaultSets:3, trackingType:'reps' },
  { id:'machine-crunch', name:'Machine Crunch', muscleGroup:'Core', type:'isolation', equipment:'Machine', recommendedReps:'10-20', defaultSets:3, trackingType:'reps' },

  { id:'wrist-curl', name:'Wrist Curl', muscleGroup:'Forearms', type:'isolation', equipment:'Dumbbells', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'reverse-wrist-curl', name:'Reverse Wrist Curl', muscleGroup:'Forearms', type:'isolation', equipment:'Dumbbells', recommendedReps:'12-20', defaultSets:3, trackingType:'reps' },
  { id:'wrist-roller', name:'Wrist Roller', muscleGroup:'Forearms', type:'isolation', equipment:'Other', recommendedReps:'2-4 trips', defaultSets:3, trackingType:'reps' },

  { id:'incline-treadmill-walk', name:'Incline Treadmill Walk', muscleGroup:'Cardio', type:'cardio', equipment:'Machine', recommendedReps:'', defaultSets:1, trackingType:'notes' },
  { id:'elliptical', name:'Elliptical', muscleGroup:'Cardio', type:'cardio', equipment:'Machine', recommendedReps:'', defaultSets:1, trackingType:'notes' },
  { id:'stair-climber', name:'Stair Climber', muscleGroup:'Cardio', type:'cardio', equipment:'Machine', recommendedReps:'', defaultSets:1, trackingType:'notes' },
  { id:'assault-bike', name:'Assault Bike', muscleGroup:'Cardio', type:'cardio', equipment:'Machine', recommendedReps:'', defaultSets:1, trackingType:'notes' },
  { id:'swimming', name:'Swimming', muscleGroup:'Cardio', type:'cardio', equipment:'Bodyweight', recommendedReps:'', defaultSets:1, trackingType:'notes' }
];

const existingIds = new Set(exercises.map(exercise => exercise.id));
expandedExercises.forEach(exercise => {
  if (!existingIds.has(exercise.id)) exercises.push(exercise);
});
