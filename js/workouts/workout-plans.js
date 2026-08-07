export const presetPlans = [

    {
        id: "full-body-foundation",
        name: "Full Body Foundation",
        daysPerWeek: 3,
        estimatedMinutes: "45-60",
        level: "Beginner",
        description:
            "Three balanced full-body sessions each week.",

        days: [

            {
                name: "Day 1 - Full Body A",

                exercises: [
                    {
                        id: "back-squat",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "barbell-bench-press",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "lat-pulldown",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "romanian-deadlift",
                        sets: 2,
                        reps: "8-10"
                    },
                    {
                        id: "lateral-raise",
                        sets: 2,
                        reps: "12-20"
                    }
                ]
            },


            {
                name: "Day 2 - Full Body B",

                exercises: [
                    {
                        id: "leg-press",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "dumbbell-bench-press",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "seated-cable-row",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "leg-curl",
                        sets: 2,
                        reps: "10-15"
                    },
                    {
                        id: "dumbbell-curl",
                        sets: 2,
                        reps: "10-15"
                    },
                    {
                        id: "tricep-pushdown",
                        sets: 2,
                        reps: "10-15"
                    }
                ]
            },


            {
                name: "Day 3 - Full Body C",

                exercises: [
                    {
                        id: "hack-squat",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "incline-dumbbell-press",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "chest-supported-row",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "hip-thrust",
                        sets: 2,
                        reps: "8-12"
                    },
                    {
                        id: "face-pull",
                        sets: 2,
                        reps: "12-20"
                    }
                ]
            }

        ]
    },


    {
        id: "upper-lower-balanced",
        name: "Upper / Lower Balanced",
        daysPerWeek: 4,
        estimatedMinutes: "50-60",
        level: "Beginner / Intermediate",
        description:
            "Two upper-body and two lower-body sessions each week.",

        days: [

            {
                name: "Day 1 - Upper A",

                exercises: [
                    {
                        id: "barbell-bench-press",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "seated-cable-row",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "dumbbell-shoulder-press",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "lat-pulldown",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "lateral-raise",
                        sets: 2,
                        reps: "12-20"
                    },
                    {
                        id: "tricep-pushdown",
                        sets: 2,
                        reps: "10-15"
                    },
                    {
                        id: "dumbbell-curl",
                        sets: 2,
                        reps: "10-15"
                    }
                ]
            },


            {
                name: "Day 2 - Lower A",

                exercises: [
                    {
                        id: "back-squat",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "romanian-deadlift",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "leg-extension",
                        sets: 2,
                        reps: "10-15"
                    },
                    {
                        id: "leg-curl",
                        sets: 2,
                        reps: "10-15"
                    },
                    {
                        id: "standing-calf-raise",
                        sets: 3,
                        reps: "10-20"
                    }
                ]
            },


            {
                name: "Day 3 - Upper B",

                exercises: [
                    {
                        id: "incline-dumbbell-press",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "chest-supported-row",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "overhead-press",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "pull-up",
                        sets: 3,
                        reps: "6-12"
                    },
                    {
                        id: "cable-lateral-raise",
                        sets: 2,
                        reps: "12-20"
                    },
                    {
                        id: "overhead-tricep-extension",
                        sets: 2,
                        reps: "10-15"
                    },
                    {
                        id: "hammer-curl",
                        sets: 2,
                        reps: "10-15"
                    }
                ]
            },


            {
                name: "Day 4 - Lower B",

                exercises: [
                    {
                        id: "leg-press",
                        sets: 3,
                        reps: "8-15"
                    },
                    {
                        id: "hip-thrust",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "bulgarian-split-squat",
                        sets: 2,
                        reps: "8-12"
                    },
                    {
                        id: "leg-curl",
                        sets: 2,
                        reps: "10-15"
                    },
                    {
                        id: "seated-calf-raise",
                        sets: 3,
                        reps: "10-20"
                    }
                ]
            }

        ]
    },


    {
        id: "ppl-compact",
        name: "Push / Pull / Legs Compact",
        daysPerWeek: 3,
        estimatedMinutes: "45-60",
        level: "Intermediate",
        description:
            "A compact three-day push, pull and legs split.",

        days: [

            {
                name: "Day 1 - Push",

                exercises: [
                    {
                        id: "barbell-bench-press",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "incline-dumbbell-press",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "dumbbell-shoulder-press",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "lateral-raise",
                        sets: 3,
                        reps: "12-20"
                    },
                    {
                        id: "tricep-pushdown",
                        sets: 3,
                        reps: "10-15"
                    }
                ]
            },


            {
                name: "Day 2 - Pull",

                exercises: [
                    {
                        id: "lat-pulldown",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "chest-supported-row",
                        sets: 3,
                        reps: "8-12"
                    },
                    {
                        id: "seated-cable-row",
                        sets: 2,
                        reps: "8-12"
                    },
                    {
                        id: "face-pull",
                        sets: 3,
                        reps: "12-20"
                    },
                    {
                        id: "dumbbell-curl",
                        sets: 3,
                        reps: "8-15"
                    },
                    {
                        id: "hammer-curl",
                        sets: 2,
                        reps: "10-15"
                    }
                ]
            },


            {
                name: "Day 3 - Legs",

                exercises: [
                    {
                        id: "back-squat",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "romanian-deadlift",
                        sets: 3,
                        reps: "6-10"
                    },
                    {
                        id: "leg-press",
                        sets: 3,
                        reps: "8-15"
                    },
                    {
                        id: "leg-curl",
                        sets: 3,
                        reps: "10-15"
                    },
                    {
                        id: "standing-calf-raise",
                        sets: 3,
                        reps: "10-20"
                    }
                ]
            }

        ]
    }

];


export function getPresetPlan(id) {

    return presetPlans.find(
        plan =>
            plan.id === id
    );

}