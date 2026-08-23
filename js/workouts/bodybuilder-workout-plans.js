const exercise = (id, sets, reps) => ({ id, sets, reps });
const day = (name, exercises) => ({ name, exercises });

export const bodybuilderWorkoutPlans = [
    {
        id: "golden-era-antagonist-supersets", name: "Golden Era Antagonist Supersets", daysPerWeek: 4,
        estimatedMinutes: "60-75", level: "Advanced", trainingType: "Hypertrophy",
        catalogueCategory: "bodybuilding", sourceLabel: "Documented Routine",
        sourceUrl: "https://www.muscleandfitness.com/workouts/workout-routines/ultimate-arnold-training-guide/",
        description: "A recoverable four-day adaptation of Arnold Schwarzenegger's documented chest/back antagonist supersets and high-volume bodybuilding approach.",
        days: [
            day("Day 1 - Chest and Back Supersets", [exercise("barbell-bench-press",4,"6-10"),exercise("pull-up",4,"6-12"),exercise("incline-barbell-press",3,"8-12"),exercise("barbell-row",3,"8-12"),exercise("cable-fly",3,"12-15"),exercise("seated-cable-row",3,"10-15"),exercise("lat-pulldown",2,"12-15","Pump finisher: controlled stretch and squeeze; stop 1-2 reps before form breaks.")]),
            day("Day 2 - Legs", [exercise("back-squat",4,"6-10"),exercise("romanian-deadlift",3,"8-12"),exercise("leg-press",3,"10-15"),exercise("leg-curl",3,"10-15"),exercise("standing-calf-raise",4,"12-20","Calf finisher: use the final set as a controlled high-rep burn set.")]),
            day("Day 3 - Shoulders and Arms", [exercise("overhead-press",4,"6-10"),exercise("lateral-raise",4,"12-20"),exercise("rear-delt-fly",3,"12-20"),exercise("barbell-curl",3,"8-12"),exercise("close-grip-bench-press",3,"8-12"),exercise("dumbbell-curl",2,"12-15"),exercise("tricep-pushdown",2,"12-15","Arm finisher: alternate curls and pushdowns with short, controlled rests.")]),
            day("Day 4 - Chest and Back Volume", [exercise("incline-dumbbell-press",4,"8-12"),exercise("lat-pulldown",4,"8-12"),exercise("dumbbell-bench-press",3,"10-15"),exercise("barbell-row",3,"8-12"),exercise("pec-deck",3,"12-20"),exercise("chest-supported-row",3,"10-15","Back finisher: pause each final-set rep at peak contraction.")])
        ]
    },
    {
        id: "high-intensity-mass-rotation", name: "High-Intensity Mass Rotation", daysPerWeek: 4,
        estimatedMinutes: "45-60", level: "Advanced", trainingType: "Hypertrophy",
        catalogueCategory: "bodybuilding", sourceLabel: "Documented Routine",
        sourceUrl: "https://www.boostcamp.app/users/6YxQD1-blood-and-guts-or-dorian-yates",
        description: "A Dorian Yates-inspired low-volume split: warm up thoroughly, then make a small number of hard working sets count without forced reps.",
        days: [
            day("Day 1 - Chest and Biceps", [exercise("barbell-bench-press",2,"6-10"),exercise("incline-dumbbell-press",2,"8-10"),exercise("pec-deck",2,"10-12"),exercise("dumbbell-curl",2,"8-12"),exercise("barbell-curl",2,"8-12","Biceps finisher: one controlled final set near technical failure; no forced reps.")]),
            day("Day 2 - Back", [exercise("straight-arm-pulldown",2,"8-12"),exercise("lat-pulldown",2,"8-12"),exercise("single-arm-dumbbell-row",2,"8-12 each side"),exercise("chest-supported-row",2,"8-12"),exercise("conventional-deadlift",2,"5-8","Posterior-chain finisher: finish with clean reps only; do not grind through spinal-position loss.")]),
            day("Day 3 - Delts and Triceps", [exercise("dumbbell-shoulder-press",2,"6-10"),exercise("lateral-raise",2,"10-15"),exercise("reverse-pec-deck",2,"10-15"),exercise("tricep-pushdown",2,"8-12"),exercise("skull-crusher",2,"8-12","Triceps finisher: controlled eccentric on the final set.")]),
            day("Day 4 - Legs", [exercise("leg-extension",2,"10-15"),exercise("leg-press",2,"8-12"),exercise("hack-squat",2,"8-12"),exercise("leg-curl",2,"10-15"),exercise("romanian-deadlift",2,"8-12"),exercise("standing-calf-raise",2,"10-15","Calf finisher: one rest-pause only after a safe technical-failure set.")])
        ]
    },
    {
        id: "eight-time-heavy-mass", name: "Eight-Time Heavy Mass", daysPerWeek: 5,
        estimatedMinutes: "60-75", level: "Advanced", trainingType: "Hypertrophy",
        catalogueCategory: "bodybuilding", sourceLabel: "Bodybuilder Inspired",
        sourceUrl: "https://www.youtube.com/@RonnieColeman8",
        description: "Heavy free-weight bodybuilding inspired by Ronnie Coleman's documented training footage, scaled down from professional-level loading and volume.",
        days: [
            day("Day 1 - Back Thickness", [exercise("conventional-deadlift",3,"5-8"),exercise("barbell-row",4,"6-10"),exercise("chest-supported-row",3,"8-12"),exercise("single-arm-dumbbell-row",3,"8-12 each side"),exercise("lat-pulldown",3,"10-15","Lat finisher: strict reps with a full stretch—no torso swinging.")]),
            day("Day 2 - Chest and Triceps", [exercise("barbell-bench-press",4,"6-10"),exercise("incline-dumbbell-press",4,"8-12"),exercise("machine-chest-press",3,"8-12"),exercise("cable-fly",3,"12-15"),exercise("skull-crusher",3,"8-12"),exercise("tricep-pushdown",2,"12-20","Chest/triceps finisher: pair the final fly and pushdown sets with a short rest.")]),
            day("Day 3 - Quads and Calves", [exercise("back-squat",4,"5-10"),exercise("leg-press",4,"10-15"),exercise("hack-squat",3,"8-12"),exercise("leg-extension",3,"12-20"),exercise("standing-calf-raise",4,"10-20","Quad finisher: final leg-extension set uses slow, controlled reps.")]),
            day("Day 4 - Shoulders and Arms", [exercise("dumbbell-shoulder-press",4,"6-10"),exercise("lateral-raise",4,"12-20"),exercise("reverse-pec-deck",3,"12-20"),exercise("barbell-curl",3,"8-12"),exercise("close-grip-bench-press",3,"8-12"),exercise("hammer-curl",2,"12-15","Arm finisher: strict hammer curls without momentum.")]),
            day("Day 5 - Hamstrings and Back Width", [exercise("romanian-deadlift",4,"6-10"),exercise("leg-curl",4,"10-15"),exercise("pull-up",4,"6-12"),exercise("lat-pulldown",3,"8-12"),exercise("seated-cable-row",3,"10-15","Back finisher: final cable-row set with a one-second squeeze.")])
        ]
    },
    {
        id: "classic-physique-ppl", name: "Classic Physique PPL", daysPerWeek: 6,
        estimatedMinutes: "50-70", level: "Intermediate / Advanced", trainingType: "Hypertrophy",
        catalogueCategory: "bodybuilding", sourceLabel: "Bodybuilder Inspired",
        sourceUrl: "https://www.youtube.com/channel/UC4514FwdRy5gI6CdC9GPb0w",
        description: "A balanced push/pull/legs rotation inspired by Chris Bumstead's publicly documented off-season training, with extra upper-chest, back and hamstring work.",
        days: [
            day("Day 1 - Push A", [exercise("incline-dumbbell-press",4,"6-10"),exercise("machine-chest-press",3,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("lateral-raise",4,"12-20"),exercise("tricep-pushdown",3,"10-15","Delt finisher: final lateral-raise set uses partials only after full-ROM reps.")]),
            day("Day 2 - Pull A", [exercise("pull-up",4,"6-12"),exercise("barbell-row",3,"6-10"),exercise("single-arm-dumbbell-row",3,"8-12"),exercise("reverse-pec-deck",3,"12-20"),exercise("dumbbell-curl",3,"10-15","Biceps finisher: alternate arms without swinging.")]),
            day("Day 3 - Legs A", [exercise("back-squat",4,"6-10"),exercise("romanian-deadlift",4,"8-12"),exercise("leg-press",3,"10-15"),exercise("leg-curl",3,"10-15"),exercise("standing-calf-raise",4,"12-20","Calf finisher: pause in the stretched and shortened positions.")]),
            day("Day 4 - Push B", [exercise("incline-barbell-press",4,"6-10"),exercise("dumbbell-bench-press",3,"8-12"),exercise("machine-shoulder-press",3,"8-12"),exercise("cable-lateral-raise",3,"12-20"),exercise("overhead-tricep-extension",3,"10-15","Triceps finisher: one high-rep cable set with strict form.")]),
            day("Day 5 - Pull B", [exercise("lat-pulldown",4,"8-12"),exercise("chest-supported-row",4,"8-12"),exercise("seated-cable-row",3,"10-15"),exercise("face-pull",3,"12-20"),exercise("preacher-curl",3,"8-12","Back finisher: final row set includes a one-second peak contraction.")]),
            day("Day 6 - Legs B", [exercise("hack-squat",4,"8-12"),exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("seated-leg-curl",4,"10-15"),exercise("hip-thrust",3,"8-12"),exercise("seated-calf-raise",4,"12-20"),exercise("leg-extension",1,"15-25","Leg finisher: one controlled high-rep leg-extension set.")])
        ]
    },
    {
        id: "olympia-delt-specialization", name: "Olympia Delt Specialization", daysPerWeek: 4,
        estimatedMinutes: "45-60", level: "Intermediate / Advanced", trainingType: "Hypertrophy",
        catalogueCategory: "bodybuilding", sourceLabel: "Documented Session",
        sourceUrl: "https://www.youtube.com/watch?v=dFpzAhDWQus",
        description: "A four-day physique plan built around Dana Linn Bailey's documented cable lateral, shoulder-press and rear-delt supersets.",
        days: [
            day("Day 1 - Delt Specialization", [exercise("cable-lateral-raise",4,"10-15"),exercise("machine-shoulder-press",4,"8-12"),exercise("lateral-raise",3,"12-20"),exercise("chest-supported-row",3,"10-15"),exercise("reverse-pec-deck",4,"12-20","Rear-delt finisher: after full-ROM reps, add only controlled partials if pain-free.")]),
            day("Day 2 - Lower Body", [exercise("back-squat",4,"6-10"),exercise("romanian-deadlift",3,"8-12"),exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("leg-curl",3,"10-15"),exercise("standing-calf-raise",3,"12-20","Leg finisher: final calf set uses a slow stretch and pause.")]),
            day("Day 3 - Back and Arms", [exercise("pull-up",4,"6-12"),exercise("chest-supported-row",4,"8-12"),exercise("lat-pulldown",3,"8-12"),exercise("dumbbell-curl",3,"10-15"),exercise("tricep-pushdown",3,"10-15","Arm finisher: alternate the final curl and pushdown sets.")]),
            day("Day 4 - Chest and Delts", [exercise("incline-dumbbell-press",4,"8-12"),exercise("machine-chest-press",3,"8-12"),exercise("cable-fly",3,"12-15"),exercise("cable-lateral-raise",3,"12-20"),exercise("rear-delt-fly",3,"12-20","Delt finisher: controlled rear-delt reps with no upper-trap shrugging.")])
        ]
    }
];
