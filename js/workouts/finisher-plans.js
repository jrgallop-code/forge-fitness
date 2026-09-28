export const finisherPlans = [
    {
        id: "finisher-biceps-21s",
        name: "Biceps 21s",
        daysPerWeek: 1,
        estimatedMinutes: "4-6",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Arms",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A classic biceps burnout using three curl ranges to build a big pump in minimal time.",
        days: [{
            name: "Biceps 21s",
            exercises: [{ id: "dumbbell-curl", sets: 3, reps: "21 (7+7+7)" }]
        }]
    },
    {
        id: "finisher-biceps-burnout",
        name: "Biceps Burnout",
        daysPerWeek: 1,
        estimatedMinutes: "5-7",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Arms",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A short, high-volume curl sequence that keeps the biceps under tension as fatigue builds.",
        days: [{
            name: "Biceps Burnout",
            exercises: [
                { id: "incline-dumbbell-curl", sets: 2, reps: "10-15" },
                { id: "hammer-curl", sets: 2, reps: "10-15" },
                { id: "dumbbell-curl", sets: 1, reps: "AMRAP" }
            ]
        }]
    },
    {
        id: "finisher-triceps-countdown",
        name: "Triceps Countdown",
        daysPerWeek: 1,
        estimatedMinutes: "4-5",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Arms",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A descending-rep triceps challenge that keeps tension high while the reps fall from 15 to 5.",
        days: [{
            name: "Triceps Countdown",
            exercises: [{ id: "tricep-pushdown", sets: 3, reps: "15, 10, 5" }]
        }]
    },
    {
        id: "finisher-arm-blast",
        name: "Biceps + Triceps Blast",
        daysPerWeek: 1,
        estimatedMinutes: "7-9",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Arms",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A fast arm superset pairing curls and triceps work with short rest for a high-volume pump.",
        days: [{
            name: "Biceps + Triceps Blast",
            exercises: [
                { id: "barbell-curl", sets: 3, reps: "12-15" },
                { id: "skull-crusher", sets: 3, reps: "12-15" },
                { id: "cable-curl", sets: 3, reps: "12-15" },
                { id: "tricep-pushdown", sets: 3, reps: "12-15" }
            ]
        }]
    },
    {
        id: "finisher-shoulder-shocker",
        name: "Shoulder Shocker",
        daysPerWeek: 1,
        estimatedMinutes: "6-8",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Shoulders",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A rapid shoulder finisher combining pressing and isolation work to fully fatigue the delts.",
        days: [{
            name: "Shoulder Shocker",
            exercises: [
                { id: "lateral-raise", sets: 3, reps: "15" },
                { id: "dumbbell-shoulder-press", sets: 3, reps: "10" },
                { id: "rear-delt-fly", sets: 3, reps: "15" }
            ]
        }]
    },
    {
        id: "finisher-shoulder-ladder",
        name: "4-Minute Shoulder Ladder",
        daysPerWeek: 1,
        estimatedMinutes: "4",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Shoulders",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A four-minute escalating-rep shoulder challenge designed to keep the delts working with minimal rest.",
        days: [{
            name: "4-Minute Shoulder Ladder",
            exercises: [
                { id: "lateral-raise", sets: 4, reps: "6, 8, 10, 12" }
            ]
        }]
    },
    {
        id: "finisher-leg-matrix",
        name: "Leg Matrix",
        daysPerWeek: 1,
        estimatedMinutes: "6-8",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Legs",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A high-rep leg burner combining squats and lunges to finish your lower-body session with a serious burn.",
        days: [{
            name: "Leg Matrix",
            exercises: [
                { id: "bodyweight-squat", sets: 2, reps: "24" },
                { id: "lunge", sets: 2, reps: "24" }
            ]
        }]
    },
    {
        id: "finisher-goblet-rack-run",
        name: "Goblet Rack Run",
        daysPerWeek: 1,
        estimatedMinutes: "5-7",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Legs",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A descending goblet-squat challenge that creates a fast quad and glute pump without a long setup.",
        days: [{
            name: "Goblet Rack Run",
            exercises: [{ id: "goblet-squat", sets: 4, reps: "10, 8, 6, 4" }]
        }]
    },
    {
        id: "finisher-leg-pump",
        name: "Leg Pump",
        daysPerWeek: 1,
        estimatedMinutes: "6-8",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Legs",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A short, high-volume leg finisher focused on continuous tension through the quads and hamstrings.",
        days: [{
            name: "Leg Pump",
            exercises: [
                { id: "leg-extension", sets: 2, reps: "15-20" },
                { id: "leg-curl", sets: 2, reps: "15-20" },
                { id: "leg-press", sets: 2, reps: "15-20" }
            ]
        }]
    },
    {
        id: "finisher-back-drop-set",
        name: "Back Drop Set",
        daysPerWeek: 1,
        estimatedMinutes: "5-7",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Back",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A progressive row drop set that reduces the load as fatigue builds to extend the set and finish the back hard.",
        days: [{
            name: "Back Drop Set",
            exercises: [{ id: "seated-cable-row", sets: 5, reps: "5" }]
        }]
    },
    {
        id: "finisher-lat-exhaustion",
        name: "Lat Exhaustion",
        daysPerWeek: 1,
        estimatedMinutes: "6-8",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Back",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A pulling sequence that takes the lats through vertical and straight-arm work as fatigue accumulates.",
        days: [{
            name: "Lat Exhaustion",
            exercises: [
                { id: "lat-pulldown", sets: 3, reps: "12-15" },
                { id: "straight-arm-pulldown", sets: 2, reps: "15-20" },
                { id: "pull-up", sets: 1, reps: "AMRAP" }
            ]
        }]
    },
    {
        id: "finisher-core-crusher",
        name: "Core Crusher",
        daysPerWeek: 1,
        estimatedMinutes: "5-7",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Core",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A compact core sequence combining loaded flexion, anti-extension and bracing under fatigue.",
        days: [{
            name: "Core Crusher",
            exercises: [
                { id: "ab-wheel-rollout", sets: 3, reps: "8-12" },
                { id: "dead-bug", sets: 3, reps: "10-15" },
                { id: "plank", sets: 2, reps: "30-60 sec" }
            ]
        }]
    },
    {
        id: "finisher-core-countdown",
        name: "Core Countdown",
        daysPerWeek: 1,
        estimatedMinutes: "4-6",
        level: "Intermediate",
        trainingType: "Finisher",
        finisherCategory: "Core",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A descending-rep abdominal challenge that keeps the core working continuously through the final reps.",
        days: [{
            name: "Core Countdown",
            exercises: [{ id: "cable-crunch", sets: 5, reps: "15, 12, 9, 6, 3" }]
        }]
    },
    {
        id: "finisher-5-minute-dumbbell-hell",
        name: "5-Minute Dumbbell Hell",
        daysPerWeek: 1,
        estimatedMinutes: "5",
        level: "Advanced",
        trainingType: "Finisher",
        finisherCategory: "Full Body",
        sourceLabel: "LEVEL UP FINISHER",
        description: "A five-minute full-body dumbbell burner using timed work intervals to finish the session with a fast conditioning hit.",
        days: [{
            name: "5-Minute Dumbbell Hell",
            exercises: [
                { id: "romanian-deadlift", sets: 1, reps: "45 sec" },
                { id: "dumbbell-overhead-extension", sets: 1, reps: "45 sec" },
                { id: "push-up", sets: 1, reps: "45 sec" },
                { id: "skull-crusher", sets: 1, reps: "45 sec" },
                { id: "dumbbell-shoulder-press", sets: 1, reps: "45 sec" }
            ]
        }]
    }
];

export function getFinisherPlan(id) {
    return finisherPlans.find(plan => plan.id === id);
}
