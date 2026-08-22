const exercise = (id, sets, reps) => ({ id, sets, reps });
const day = (name, exercises) => ({ name, exercises });

export const celebrityWorkoutPlans = [
    {
        id: "amazon-hero-athletic-strength", name: "Amazon Hero Athletic Strength", daysPerWeek: 5,
        estimatedMinutes: "45-60", level: "Intermediate", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "A full-body strength, mobility and athletic-conditioning plan inspired by Gal Gadot and Magnus Lygdback's documented Wonder Woman preparation.",
        days: [
            day("Day 1 - Legs and Core", [exercise("front-squat",4,"6-10"),exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("romanian-deadlift",3,"8-12"),exercise("standing-calf-raise",3,"12-20"),exercise("pallof-press",3,"10-15 each side")]),
            day("Day 2 - Chest and Back", [exercise("dumbbell-bench-press",4,"8-12"),exercise("pull-up",4,"6-12"),exercise("incline-dumbbell-press",3,"8-12"),exercise("single-arm-dumbbell-row",3,"8-12 each side"),exercise("face-pull",3,"12-20")]),
            day("Day 3 - Shoulders and Arms", [exercise("dumbbell-shoulder-press",4,"8-12"),exercise("lateral-raise",3,"12-20"),exercise("rear-delt-fly",3,"12-20"),exercise("dumbbell-curl",3,"10-15"),exercise("tricep-pushdown",3,"10-15"),exercise("hanging-knee-raise",3,"10-15")]),
            day("Day 4 - Lower Athletic Strength", [exercise("trap-bar-deadlift",4,"5-8"),exercise("step-up",3,"10 each leg"),exercise("hip-thrust",3,"8-12"),exercise("lunge",3,"10 each leg"),exercise("side-plank",3,"30-45 sec each")]),
            day("Day 5 - Upper Athletic Conditioning", [exercise("push-up",4,"10-20"),exercise("chin-up",4,"6-12"),exercise("dumbbell-shoulder-press",3,"10"),exercise("seated-cable-row",3,"10-15"),exercise("indoor-rower",1,"12-15 min intervals")])
        ]
    },
    {
        id: "cosmic-hero-foundation", name: "Cosmic Hero Strength Foundation", daysPerWeek: 4,
        estimatedMinutes: "45-60", level: "Beginner / Intermediate", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "Progressive full-body strength and calisthenics inspired by Brie Larson and Jason Walsh's documented Captain Marvel training foundation.",
        days: [
            day("Day 1 - Lower-Body Foundation", [exercise("goblet-squat",4,"8-12"),exercise("romanian-deadlift",3,"8-12"),exercise("reverse-lunge",3,"8-12 each leg"),exercise("hip-thrust",3,"8-12"),exercise("plank",3,"30-60 sec")]),
            day("Day 2 - Upper-Body Foundation", [exercise("dumbbell-bench-press",4,"8-12"),exercise("lat-pulldown",4,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("seated-cable-row",3,"8-12"),exercise("pallof-press",3,"10-15 each side")]),
            day("Day 3 - Unilateral Strength", [exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("single-leg-romanian-deadlift",3,"8-12 each leg"),exercise("step-up",3,"10 each leg"),exercise("single-arm-dumbbell-row",3,"8-12 each side"),exercise("side-plank",3,"30-45 sec each")]),
            day("Day 4 - Hero Calisthenics", [exercise("lat-pulldown",4,"8-12"),exercise("push-up",4,"8-20"),exercise("goblet-squat",3,"12-15"),exercise("dumbbell-shoulder-press",3,"10-15"),exercise("hanging-knee-raise",3,"8-15"),exercise("indoor-rower",1,"10-15 min intervals")])
        ]
    },
    {
        id: "god-of-thunder-mass", name: "God of Thunder Mass", daysPerWeek: 5,
        estimatedMinutes: "55-70", level: "Intermediate / Advanced", trainingType: "Hypertrophy",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "A mass-building adaptation inspired by Chris Hemsworth's publicly documented superhero training.",
        days: [
            day("Day 1 - Push", [exercise("barbell-bench-press",4,"6-10"),exercise("incline-dumbbell-press",3,"8-12"),exercise("overhead-press",3,"6-10"),exercise("lateral-raise",3,"12-20"),exercise("tricep-pushdown",3,"10-15")]),
            day("Day 2 - Pull", [exercise("weighted-pull-up",4,"5-10"),exercise("barbell-row",4,"6-10"),exercise("lat-pulldown",3,"8-12"),exercise("face-pull",3,"12-20"),exercise("barbell-curl",3,"8-12")]),
            day("Day 3 - Legs and Core", [exercise("back-squat",4,"6-10"),exercise("romanian-deadlift",3,"8-12"),exercise("leg-press",3,"10-15"),exercise("leg-curl",3,"10-15"),exercise("hanging-knee-raise",3,"10-15")]),
            day("Day 4 - Upper Body", [exercise("incline-barbell-press",3,"6-10"),exercise("chest-supported-row",3,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("chin-up",3,"6-12"),exercise("dumbbell-curl",2,"10-15"),exercise("overhead-tricep-extension",2,"10-15")]),
            day("Day 5 - Functional Full Body", [exercise("trap-bar-deadlift",4,"5-8"),exercise("goblet-squat",3,"10-15"),exercise("push-up",3,"10-20"),exercise("single-arm-dumbbell-row",3,"8-12"),exercise("indoor-rower",1,"10-15 min intervals")])
        ]
    },
    {
        id: "ringside-champion", name: "Ringside Champion", daysPerWeek: 4,
        estimatedMinutes: "60-75", level: "Intermediate / Advanced", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Documented Routine",
        description: "Adapted from the four-day routine published for Michael B. Jordan's boxing preparation.",
        days: [
            day("Day 1 - Chest, Back and Arms", [exercise("incline-dumbbell-press",3,"12"),exercise("dumbbell-bench-press",3,"12"),exercise("dumbbell-curl",3,"12"),exercise("tricep-pushdown",3,"15"),exercise("dip",3,"8-15")]),
            day("Day 2 - Back, Biceps and Triceps", [exercise("single-arm-dumbbell-row",3,"12"),exercise("lat-pulldown",3,"12"),exercise("barbell-row",3,"12"),exercise("barbell-curl",3,"12"),exercise("hammer-curl",3,"12")]),
            day("Day 3 - Legs and Abs", [exercise("lunge",3,"12 each leg"),exercise("romanian-deadlift",3,"12"),exercise("leg-curl",3,"12"),exercise("back-squat",3,"8-12"),exercise("cable-crunch",3,"15-20")]),
            day("Day 4 - Chest, Arms and Conditioning", [exercise("incline-barbell-press",4,"15, 12, 12, 10"),exercise("cable-fly",3,"15, 12, 10"),exercise("close-grip-bench-press",4,"10"),exercise("barbell-curl",4,"10"),exercise("indoor-rower",1,"15-20 min intervals")])
        ]
    },
    {
        id: "mutant-strength", name: "Mutant Strength", daysPerWeek: 4,
        estimatedMinutes: "55-70", level: "Advanced", trainingType: "Hypertrophy",
        catalogueCategory: "movie", sourceLabel: "Documented Routine",
        description: "Built around the four-lift progression publicly described by Hugh Jackman's trainer David Kingsbury.",
        days: [
            day("Day 1 - Deadlift and Back", [exercise("conventional-deadlift",4,"3-5"),exercise("barbell-row",4,"6-10"),exercise("lat-pulldown",3,"8-12"),exercise("face-pull",3,"12-20")]),
            day("Day 2 - Bench and Chest", [exercise("barbell-bench-press",4,"3-5"),exercise("incline-dumbbell-press",4,"8-12"),exercise("dip",3,"8-15"),exercise("cable-fly",3,"12-15"),exercise("tricep-pushdown",3,"10-15")]),
            day("Day 3 - Squat and Legs", [exercise("back-squat",4,"3-5"),exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("romanian-deadlift",3,"8-12"),exercise("leg-extension",3,"12-15"),exercise("standing-calf-raise",4,"10-20")]),
            day("Day 4 - Weighted Pull-Ups and Arms", [exercise("weighted-pull-up",4,"3-5"),exercise("chest-supported-row",3,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("barbell-curl",3,"8-12"),exercise("skull-crusher",3,"8-12")])
        ]
    },
    {
        id: "monster-hunter-athletic-muscle", name: "Monster Hunter Athletic Muscle", daysPerWeek: 4,
        estimatedMinutes: "50-65", level: "Intermediate", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "Inspired by Henry Cavill and Dave Rienzi's documented posterior-chain, shoulder and core training.",
        days: [
            day("Day 1 - Posterior Chain", [exercise("romanian-deadlift",3,"10 slow reps"),exercise("back-extension",3,"10-15"),exercise("hip-thrust",3,"8-12"),exercise("seated-leg-curl",3,"10-15"),exercise("side-plank",3,"30-45 sec each")]),
            day("Day 2 - Push and Shoulders", [exercise("incline-dumbbell-press",4,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("lateral-raise",3,"12-20"),exercise("rear-delt-fly",3,"12-20"),exercise("dip",3,"8-15")]),
            day("Day 3 - Pull and Arms", [exercise("pull-up",4,"6-12"),exercise("barbell-row",3,"6-10"),exercise("single-arm-dumbbell-row",3,"8-12"),exercise("dumbbell-curl",3,"10 each arm"),exercise("face-pull",3,"12-20")]),
            day("Day 4 - Full Body and Core", [exercise("front-squat",4,"6-10"),exercise("trap-bar-deadlift",3,"5-8"),exercise("push-up",3,"10-20"),exercise("chin-up",3,"6-12"),exercise("pallof-press",3,"10-15 each side")])
        ]
    },
    {
        id: "ocean-warrior-strength", name: "Ocean Warrior Strength", daysPerWeek: 4,
        estimatedMinutes: "50-65", level: "Intermediate", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "Functional strength inspired by Jason Momoa and Mark Twight's published chest, leg and climbing sessions.",
        days: [
            day("Day 1 - Chest and Pressing", [exercise("incline-barbell-press",4,"6-10"),exercise("dumbbell-bench-press",3,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("push-up",3,"10-20"),exercise("cable-fly",3,"12-15")]),
            day("Day 2 - Legs and Hips", [exercise("front-squat",4,"6-10"),exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("romanian-deadlift",3,"8-12"),exercise("step-up",3,"10 each leg"),exercise("standing-calf-raise",3,"12-20")]),
            day("Day 3 - Pull and Climbing Strength", [exercise("pull-up",5,"5-10"),exercise("single-arm-dumbbell-row",4,"8-12"),exercise("chin-up",3,"6-12"),exercise("face-pull",3,"12-20"),exercise("hammer-curl",3,"10-15")]),
            day("Day 4 - Functional Conditioning", [exercise("trap-bar-deadlift",4,"5-8"),exercise("goblet-squat",3,"12-15"),exercise("push-up",3,"10-20"),exercise("indoor-rower",1,"12-20 min intervals"),exercise("hanging-knee-raise",3,"10-15")])
        ]
    },
    {
        id: "relic-raider-athletic", name: "Relic Raider Athletic", daysPerWeek: 5,
        estimatedMinutes: "45-60", level: "Intermediate", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "An adaptation of the strength, climbing and conditioning documented by Alicia Vikander's trainer Magnus Lygdback.",
        days: [
            day("Day 1 - Legs", [exercise("front-squat",4,"8-10"),exercise("lunge",3,"10 each leg"),exercise("romanian-deadlift",3,"8-12"),exercise("step-up",3,"10 each leg"),exercise("standing-calf-raise",3,"12-20")]),
            day("Day 2 - Chest and Front Shoulders", [exercise("dumbbell-bench-press",4,"8-12"),exercise("incline-dumbbell-press",3,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("push-up",3,"10-20"),exercise("lateral-raise",3,"12-20")]),
            day("Day 3 - Back and Rear Shoulders", [exercise("pull-up",4,"6-12"),exercise("single-arm-dumbbell-row",3,"8-12"),exercise("lat-pulldown",3,"8-12"),exercise("rear-delt-fly",3,"12-20"),exercise("face-pull",3,"12-20")]),
            day("Day 4 - Arms and Core", [exercise("dumbbell-curl",3,"10-15"),exercise("hammer-curl",3,"10-15"),exercise("tricep-pushdown",3,"10-15"),exercise("overhead-tricep-extension",3,"10-15"),exercise("hanging-knee-raise",3,"10-15"),exercise("pallof-press",3,"10-15 each side")]),
            day("Day 5 - Athletic Conditioning", [exercise("goblet-squat",4,"12"),exercise("push-up",4,"10-20"),exercise("single-leg-romanian-deadlift",3,"10 each leg"),exercise("indoor-rower",1,"15-20 min intervals"),exercise("side-plank",3,"30-45 sec each")])
        ]
    },
    {
        id: "spartan-300-challenge", name: "Spartan 300 Challenge", daysPerWeek: 3,
        estimatedMinutes: "45-65", level: "Advanced", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "A progressive plan leading toward the documented 300-repetition cast benchmark.",
        days: [
            day("Day 1 - Warrior Strength", [exercise("conventional-deadlift",4,"5"),exercise("pull-up",4,"6-12"),exercise("front-squat",4,"6-10"),exercise("overhead-press",3,"6-10"),exercise("hanging-knee-raise",3,"10-15")]),
            day("Day 2 - Functional Conditioning", [exercise("goblet-squat",4,"15"),exercise("push-up",4,"15-25"),exercise("step-up",4,"12 each leg"),exercise("indoor-rower",1,"15 min intervals"),exercise("plank",3,"45-60 sec")]),
            day("Day 3 - 300 Benchmark Preparation", [exercise("pull-up",2,"25 total"),exercise("conventional-deadlift",5,"10"),exercise("push-up",5,"10"),exercise("step-up",5,"10 each leg"),exercise("hanging-knee-raise",5,"10"),exercise("dumbbell-shoulder-press",5,"10"),exercise("pull-up",2,"25 total")])
        ]
    },
    {
        id: "lifeguard-physique", name: "Lifeguard Physique", daysPerWeek: 3,
        estimatedMinutes: "50-65", level: "Intermediate", trainingType: "Hypertrophy",
        catalogueCategory: "movie", sourceLabel: "Documented Routine",
        description: "Adapted from the three-day resistance split published by Zac Efron's trainer Patrick Murphy.",
        days: [
            day("Day 1 - Back and Biceps", [exercise("pull-up",4,"6-12"),exercise("lat-pulldown",3,"8-12"),exercise("single-arm-dumbbell-row",3,"8-12"),exercise("seated-cable-row",3,"8-12"),exercise("dumbbell-curl",3,"10-15"),exercise("hammer-curl",3,"10-15")]),
            day("Day 2 - Legs", [exercise("back-squat",4,"6-10"),exercise("romanian-deadlift",3,"8-12"),exercise("leg-press",3,"10-15"),exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("leg-curl",3,"10-15"),exercise("standing-calf-raise",3,"12-20")]),
            day("Day 3 - Chest, Shoulders and Arms", [exercise("dumbbell-bench-press",4,"8-12"),exercise("incline-dumbbell-press",3,"8-12"),exercise("dumbbell-shoulder-press",3,"8-12"),exercise("lateral-raise",3,"12-20"),exercise("dip",3,"8-15"),exercise("cable-curl",3,"10-15")])
        ]
    },
    {
        id: "web-slinger-athletic-strength", name: "Web-Slinger Athletic Strength", daysPerWeek: 4,
        estimatedMinutes: "45-60", level: "Intermediate", trainingType: "Hybrid",
        catalogueCategory: "movie", sourceLabel: "Movie Inspired",
        description: "Lean muscle and calisthenics inspired by Tom Holland and George Ashwell's documented superhero preparation.",
        days: [
            day("Day 1 - Full Body Strength", [exercise("conventional-deadlift",4,"5-8"),exercise("incline-dumbbell-press",3,"8-12"),exercise("weighted-pull-up",3,"5-10"),exercise("bulgarian-split-squat",3,"8-12 each leg"),exercise("hanging-knee-raise",3,"10-15")]),
            day("Day 2 - Calisthenics", [exercise("pull-up",4,"6-12"),exercise("push-up",4,"10-20"),exercise("dip",3,"8-15"),exercise("bodyweight-squat",4,"15-25"),exercise("plank",3,"45-60 sec")]),
            day("Day 3 - Legs and Core", [exercise("front-squat",4,"6-10"),exercise("single-leg-romanian-deadlift",3,"8-12 each leg"),exercise("step-up",3,"10 each leg"),exercise("hanging-knee-raise",3,"10-15"),exercise("pallof-press",3,"10-15 each side")]),
            day("Day 4 - Athletic Circuit", [exercise("goblet-squat",4,"12"),exercise("dumbbell-shoulder-press",4,"10"),exercise("single-arm-dumbbell-row",4,"10 each side"),exercise("push-up",4,"10-20"),exercise("indoor-rower",1,"12-15 min intervals")])
        ]
    }
];
