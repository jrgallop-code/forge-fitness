export const presetPlans = [

    {
        id: "full-body-foundation",
        name: "Full Body Foundation",
        daysPerWeek: 3,
        estimatedMinutes: "45-60",
        level: "Beginner",
        trainingType: "Hypertrophy",
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
        trainingType: "Hypertrophy",
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
        trainingType: "Hypertrophy",
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
,

{
    "id": "two-day-full-body-gym-hypertrophy",
    "name": "2-Day Full-Body Gym Hypertrophy",
    "daysPerWeek": 2,
    "estimatedMinutes": "45-60",
    "level": "Beginner / Intermediate",
    "trainingType": "Hypertrophy",
    "description": "Two comprehensive gym sessions covering every major muscle group.",
    "days": [
        {
            "name": "Day 1 - Full Body A",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "cable-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Full Body B",
            "exercises": [
                {
                    "id": "leg-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "hip-thrust",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "face-pull",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "tricep-pushdown",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        }
    ]
},

{
    "id": "two-day-dumbbell-only-full-body",
    "name": "2-Day Dumbbell-Only Full Body",
    "daysPerWeek": 2,
    "estimatedMinutes": "30-45",
    "level": "Beginner",
    "trainingType": "Hypertrophy",
    "description": "A compact home-friendly plan requiring only dumbbells and a bench.",
    "days": [
        {
            "name": "Day 1 - Dumbbell Full Body A",
            "exercises": [
                {
                    "id": "front-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-bench-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-leg-romanian-deadlift",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 2,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 2 - Dumbbell Full Body B",
            "exercises": [
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "hammer-curl",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "dumbbell-overhead-extension",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        }
    ]
},

{
    "id": "two-day-bodyweight-strength-foundation",
    "name": "2-Day Bodyweight Strength Foundation",
    "daysPerWeek": 2,
    "estimatedMinutes": "30-45",
    "level": "Beginner",
    "trainingType": "Hypertrophy",
    "description": "A no-gym resistance plan built around controlled bodyweight progressions.",
    "days": [
        {
            "name": "Day 1 - Push and Legs",
            "exercises": [
                {
                    "id": "push-up",
                    "sets": 4,
                    "reps": "8-20"
                },
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-15"
                },
                {
                    "id": "dip",
                    "sets": 3,
                    "reps": "6-12"
                },
                {
                    "id": "glute-bridge",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "plank",
                    "sets": 3,
                    "reps": "30-60 sec"
                }
            ]
        },
        {
            "name": "Day 2 - Pull and Posterior Chain",
            "exercises": [
                {
                    "id": "pull-up",
                    "sets": 4,
                    "reps": "5-12"
                },
                {
                    "id": "back-extension",
                    "sets": 3,
                    "reps": "10-20"
                },
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "chin-up",
                    "sets": 2,
                    "reps": "5-12"
                },
                {
                    "id": "single-leg-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "side-plank",
                    "sets": 3,
                    "reps": "20-45 sec"
                }
            ]
        }
    ]
},

{
    "id": "two-day-strength-cardio-starter",
    "name": "2-Day Strength and Cardio Starter",
    "daysPerWeek": 2,
    "estimatedMinutes": "45-60",
    "level": "Beginner",
    "trainingType": "Hybrid",
    "description": "Two balanced sessions combining full-body resistance work with accessible cardio.",
    "days": [
        {
            "name": "Day 1 - Full Body and Bike",
            "exercises": [
                {
                    "id": "leg-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-bench-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "15-20 min"
                }
            ]
        },
        {
            "name": "Day 2 - Full Body and Rower",
            "exercises": [
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "indoor-rower",
                    "sets": 1,
                    "reps": "15-20 min"
                }
            ]
        }
    ]
},

{
    "id": "three-day-full-body-home-hypertrophy",
    "name": "3-Day Full-Body Home Hypertrophy",
    "daysPerWeek": 3,
    "estimatedMinutes": "30-45",
    "level": "Beginner / Intermediate",
    "trainingType": "Hypertrophy",
    "description": "Three efficient dumbbell and bodyweight sessions for home training.",
    "days": [
        {
            "name": "Day 1 - Home Full Body A",
            "exercises": [
                {
                    "id": "front-squat",
                    "sets": 3,
                    "reps": "8-15"
                },
                {
                    "id": "dumbbell-bench-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "glute-bridge",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 2 - Home Full Body B",
            "exercises": [
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "push-up",
                    "sets": 3,
                    "reps": "8-20"
                },
                {
                    "id": "single-leg-romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "hammer-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 3 - Home Full Body C",
            "exercises": [
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "dumbbell-overhead-extension",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        }
    ]
},

{
    "id": "three-day-push-pull-legs-express",
    "name": "3-Day Push Pull Legs Express",
    "daysPerWeek": 3,
    "estimatedMinutes": "30-45",
    "level": "Intermediate",
    "trainingType": "Hypertrophy",
    "description": "A condensed gym-based push, pull and legs split.",
    "days": [
        {
            "name": "Day 1 - Push",
            "exercises": [
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "tricep-pushdown",
                    "sets": 3,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Pull",
            "exercises": [
                {
                    "id": "pull-up",
                    "sets": 3,
                    "reps": "6-12"
                },
                {
                    "id": "barbell-row",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "face-pull",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "dumbbell-curl",
                    "sets": 3,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 3 - Legs",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-extension",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "leg-curl",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "standing-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        }
    ]
},

{
    "id": "three-day-upper-lower-full-body",
    "name": "3-Day Upper Lower Full-Body Rotation",
    "daysPerWeek": 3,
    "estimatedMinutes": "45-60",
    "level": "Beginner / Intermediate",
    "trainingType": "Hypertrophy",
    "description": "An upper, lower and full-body rotation with balanced weekly coverage.",
    "days": [
        {
            "name": "Day 1 - Upper",
            "exercises": [
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-curl",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "tricep-pushdown",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Lower",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-curl",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "standing-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 3 - Full Body",
            "exercises": [
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "chest-supported-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "hip-thrust",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 2,
                    "reps": "12-20"
                }
            ]
        }
    ]
},

{
    "id": "three-day-bodyweight-home-progression",
    "name": "3-Day Bodyweight Home Progression",
    "daysPerWeek": 3,
    "estimatedMinutes": "30-45",
    "level": "Beginner / Intermediate",
    "trainingType": "Hypertrophy",
    "description": "A home plan using bodyweight progressions with minimal equipment.",
    "days": [
        {
            "name": "Day 1 - Push and Core",
            "exercises": [
                {
                    "id": "push-up",
                    "sets": 4,
                    "reps": "8-20"
                },
                {
                    "id": "dip",
                    "sets": 3,
                    "reps": "6-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-15"
                },
                {
                    "id": "plank",
                    "sets": 3,
                    "reps": "30-60 sec"
                },
                {
                    "id": "dead-bug",
                    "sets": 3,
                    "reps": "10-16"
                }
            ]
        },
        {
            "name": "Day 2 - Legs",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 4,
                    "reps": "12-25"
                },
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-16"
                },
                {
                    "id": "glute-bridge",
                    "sets": 4,
                    "reps": "12-25"
                },
                {
                    "id": "single-leg-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "side-plank",
                    "sets": 3,
                    "reps": "20-45 sec"
                }
            ]
        },
        {
            "name": "Day 3 - Pull and Posterior Chain",
            "exercises": [
                {
                    "id": "pull-up",
                    "sets": 4,
                    "reps": "5-12"
                },
                {
                    "id": "chin-up",
                    "sets": 3,
                    "reps": "5-12"
                },
                {
                    "id": "back-extension",
                    "sets": 3,
                    "reps": "10-20"
                },
                {
                    "id": "bird-dog",
                    "sets": 3,
                    "reps": "10-16"
                },
                {
                    "id": "hanging-knee-raise",
                    "sets": 3,
                    "reps": "8-15"
                }
            ]
        }
    ]
},

{
    "id": "three-day-dumbbell-upper-lower-full-body",
    "name": "3-Day Dumbbell Upper Lower Full Body",
    "daysPerWeek": 3,
    "estimatedMinutes": "45-60",
    "level": "Beginner / Intermediate",
    "trainingType": "Hypertrophy",
    "description": "A complete dumbbell plan organized into upper, lower and full-body days.",
    "days": [
        {
            "name": "Day 1 - Dumbbell Upper",
            "exercises": [
                {
                    "id": "dumbbell-bench-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "rear-delt-fly",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "hammer-curl",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "dumbbell-overhead-extension",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Dumbbell Lower",
            "exercises": [
                {
                    "id": "front-squat",
                    "sets": 4,
                    "reps": "8-15"
                },
                {
                    "id": "single-leg-romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "glute-bridge",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "single-leg-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 3 - Dumbbell Full Body",
            "exercises": [
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        }
    ]
},

{
    "id": "three-day-gym-strength-conditioning",
    "name": "3-Day Gym Strength and Conditioning",
    "daysPerWeek": 3,
    "estimatedMinutes": "45-60",
    "level": "Intermediate",
    "trainingType": "Hybrid",
    "description": "Three gym sessions blending resistance training with short cardio finishes.",
    "days": [
        {
            "name": "Day 1 - Upper and Rower",
            "exercises": [
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "barbell-row",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "indoor-rower",
                    "sets": 1,
                    "reps": "12-15 min"
                }
            ]
        },
        {
            "name": "Day 2 - Lower and Bike",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-press",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "12-15 min"
                }
            ]
        },
        {
            "name": "Day 3 - Full Body and SkiErg",
            "exercises": [
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "ski-erg",
                    "sets": 1,
                    "reps": "12-15 min"
                }
            ]
        }
    ]
},

{
    "id": "four-day-upper-lower-express",
    "name": "4-Day Upper Lower Hypertrophy Express",
    "daysPerWeek": 4,
    "estimatedMinutes": "30-45",
    "level": "Intermediate",
    "trainingType": "Hypertrophy",
    "description": "Four concise upper and lower sessions designed for shorter gym visits.",
    "days": [
        {
            "name": "Day 1 - Upper A",
            "exercises": [
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "tricep-pushdown",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Lower A",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-curl",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "standing-calf-raise",
                    "sets": 2,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 3 - Upper B",
            "exercises": [
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "face-pull",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "dumbbell-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 4 - Lower B",
            "exercises": [
                {
                    "id": "leg-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "hip-thrust",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-extension",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "seated-calf-raise",
                    "sets": 2,
                    "reps": "12-20"
                }
            ]
        }
    ]
},

{
    "id": "four-day-dumbbell-upper-lower",
    "name": "4-Day Dumbbell-Only Upper Lower",
    "daysPerWeek": 4,
    "estimatedMinutes": "30-45",
    "level": "Beginner / Intermediate",
    "trainingType": "Hypertrophy",
    "description": "A four-day upper/lower split requiring only dumbbells and a bench.",
    "days": [
        {
            "name": "Day 1 - Upper A",
            "exercises": [
                {
                    "id": "dumbbell-bench-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "hammer-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Lower A",
            "exercises": [
                {
                    "id": "front-squat",
                    "sets": 4,
                    "reps": "8-15"
                },
                {
                    "id": "single-leg-romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "single-leg-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 3 - Upper B",
            "exercises": [
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "rear-delt-fly",
                    "sets": 2,
                    "reps": "12-20"
                },
                {
                    "id": "dumbbell-overhead-extension",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 4 - Lower B",
            "exercises": [
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-leg-romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "glute-bridge",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "single-leg-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        }
    ]
},

{
    "id": "four-day-bodyweight-upper-lower",
    "name": "4-Day Home Bodyweight Upper Lower",
    "daysPerWeek": 4,
    "estimatedMinutes": "30-45",
    "level": "Beginner / Intermediate",
    "trainingType": "Hypertrophy",
    "description": "A no-gym upper/lower split using scalable bodyweight movements.",
    "days": [
        {
            "name": "Day 1 - Upper A",
            "exercises": [
                {
                    "id": "push-up",
                    "sets": 4,
                    "reps": "8-20"
                },
                {
                    "id": "pull-up",
                    "sets": 4,
                    "reps": "5-12"
                },
                {
                    "id": "dip",
                    "sets": 3,
                    "reps": "6-12"
                },
                {
                    "id": "plank",
                    "sets": 3,
                    "reps": "30-60 sec"
                }
            ]
        },
        {
            "name": "Day 2 - Lower A",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 4,
                    "reps": "15-25"
                },
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-16"
                },
                {
                    "id": "glute-bridge",
                    "sets": 4,
                    "reps": "12-25"
                },
                {
                    "id": "single-leg-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 3 - Upper B",
            "exercises": [
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 4,
                    "reps": "8-15"
                },
                {
                    "id": "chin-up",
                    "sets": 4,
                    "reps": "5-12"
                },
                {
                    "id": "push-up",
                    "sets": 3,
                    "reps": "8-20"
                },
                {
                    "id": "hanging-knee-raise",
                    "sets": 3,
                    "reps": "8-15"
                }
            ]
        },
        {
            "name": "Day 4 - Lower B",
            "exercises": [
                {
                    "id": "bulgarian-split-squat",
                    "sets": 4,
                    "reps": "8-15"
                },
                {
                    "id": "single-leg-romanian-deadlift",
                    "sets": 3,
                    "reps": "8-15"
                },
                {
                    "id": "back-extension",
                    "sets": 3,
                    "reps": "10-20"
                },
                {
                    "id": "side-plank",
                    "sets": 3,
                    "reps": "20-45 sec"
                }
            ]
        }
    ]
},

{
    "id": "four-day-gym-muscle-cardio-balance",
    "name": "4-Day Gym Muscle and Cardio Balance",
    "daysPerWeek": 4,
    "estimatedMinutes": "45-60",
    "level": "Intermediate",
    "trainingType": "Hybrid",
    "description": "Two focused lifting days, one cardio day and one combined session.",
    "days": [
        {
            "name": "Day 1 - Upper",
            "exercises": [
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                }
            ]
        },
        {
            "name": "Day 2 - Cardio",
            "exercises": [
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "30-40 min"
                }
            ]
        },
        {
            "name": "Day 3 - Lower",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 4 - Full Body and Rower",
            "exercises": [
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "chest-supported-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "indoor-rower",
                    "sets": 1,
                    "reps": "15-20 min"
                }
            ]
        }
    ]
},

{
    "id": "four-day-strength-endurance",
    "name": "4-Day Concurrent Strength and Endurance",
    "daysPerWeek": 4,
    "estimatedMinutes": "45-60",
    "level": "Intermediate",
    "trainingType": "Hybrid",
    "description": "Alternating full-body lifting and cardio sessions across four days.",
    "days": [
        {
            "name": "Day 1 - Full Body Strength A",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "barbell-row",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "plank",
                    "sets": 3,
                    "reps": "30-60 sec"
                }
            ]
        },
        {
            "name": "Day 2 - Cardio Intervals",
            "exercises": [
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "25-35 min"
                }
            ]
        },
        {
            "name": "Day 3 - Full Body Strength B",
            "exercises": [
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 4 - Steady Cardio",
            "exercises": [
                {
                    "id": "running",
                    "sets": 1,
                    "reps": "30-45 min"
                }
            ]
        }
    ]
},

{
    "id": "four-day-cardio-fitness-builder",
    "name": "4-Day Cardio Fitness Builder",
    "daysPerWeek": 4,
    "estimatedMinutes": "30-45",
    "level": "Beginner / Intermediate",
    "trainingType": "Cardio",
    "description": "A varied four-day cardio plan with easy, interval and longer sessions.",
    "days": [
        {
            "name": "Day 1 - Easy Bike",
            "exercises": [
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "30-40 min"
                }
            ]
        },
        {
            "name": "Day 2 - Rower Intervals",
            "exercises": [
                {
                    "id": "indoor-rower",
                    "sets": 1,
                    "reps": "25-35 min"
                }
            ]
        },
        {
            "name": "Day 3 - Recovery Cardio",
            "exercises": [
                {
                    "id": "running",
                    "sets": 1,
                    "reps": "20-30 min easy"
                }
            ]
        },
        {
            "name": "Day 4 - Longer Steady Session",
            "exercises": [
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "40-45 min"
                }
            ]
        }
    ]
},

{
    "id": "five-day-ppl-upper-lower",
    "name": "5-Day Push Pull Legs Upper Lower",
    "daysPerWeek": 5,
    "estimatedMinutes": "45-60",
    "level": "Intermediate",
    "trainingType": "Hypertrophy",
    "description": "A five-day gym split combining PPL with an additional upper/lower rotation.",
    "days": [
        {
            "name": "Day 1 - Push",
            "exercises": [
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "tricep-pushdown",
                    "sets": 3,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Pull",
            "exercises": [
                {
                    "id": "pull-up",
                    "sets": 3,
                    "reps": "6-12"
                },
                {
                    "id": "barbell-row",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "face-pull",
                    "sets": 3,
                    "reps": "12-20"
                },
                {
                    "id": "dumbbell-curl",
                    "sets": 3,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 3 - Legs",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-curl",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "standing-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 4 - Upper",
            "exercises": [
                {
                    "id": "incline-barbell-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "machine-shoulder-press",
                    "sets": 2,
                    "reps": "8-15"
                },
                {
                    "id": "machine-row",
                    "sets": 3,
                    "reps": "8-15"
                },
                {
                    "id": "cable-curl",
                    "sets": 2,
                    "reps": "10-15"
                },
                {
                    "id": "overhead-tricep-extension",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 5 - Lower",
            "exercises": [
                {
                    "id": "hack-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "hip-thrust",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-extension",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "seated-leg-curl",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "seated-calf-raise",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        }
    ]
},

{
    "id": "five-day-home-dumbbell-cardio",
    "name": "5-Day Home Dumbbell and Cardio Plan",
    "daysPerWeek": 5,
    "estimatedMinutes": "30-45",
    "level": "Beginner / Intermediate",
    "trainingType": "Hybrid",
    "description": "Home-friendly dumbbell training alternated with simple cardio sessions.",
    "days": [
        {
            "name": "Day 1 - Dumbbell Upper",
            "exercises": [
                {
                    "id": "dumbbell-bench-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 2,
                    "reps": "8-12"
                },
                {
                    "id": "hammer-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 2 - Easy Cardio",
            "exercises": [
                {
                    "id": "running",
                    "sets": 1,
                    "reps": "25-35 min easy"
                }
            ]
        },
        {
            "name": "Day 3 - Dumbbell Lower",
            "exercises": [
                {
                    "id": "front-squat",
                    "sets": 4,
                    "reps": "8-15"
                },
                {
                    "id": "single-leg-romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lunge",
                    "sets": 3,
                    "reps": "10-15"
                },
                {
                    "id": "glute-bridge",
                    "sets": 3,
                    "reps": "12-20"
                }
            ]
        },
        {
            "name": "Day 4 - Cardio Intervals",
            "exercises": [
                {
                    "id": "running",
                    "sets": 1,
                    "reps": "20-30 min"
                }
            ]
        },
        {
            "name": "Day 5 - Dumbbell Full Body",
            "exercises": [
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "single-arm-dumbbell-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lateral-raise",
                    "sets": 2,
                    "reps": "12-20"
                }
            ]
        }
    ]
},

{
    "id": "five-day-balanced-gym-cardio",
    "name": "5-Day Balanced Gym and Cardio Plan",
    "daysPerWeek": 5,
    "estimatedMinutes": "45-60",
    "level": "Intermediate",
    "trainingType": "Hybrid",
    "description": "Three lifting sessions and two cardio days for a balanced weekly schedule.",
    "days": [
        {
            "name": "Day 1 - Upper",
            "exercises": [
                {
                    "id": "barbell-bench-press",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "seated-cable-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "dumbbell-shoulder-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "lat-pulldown",
                    "sets": 3,
                    "reps": "8-12"
                }
            ]
        },
        {
            "name": "Day 2 - Lower",
            "exercises": [
                {
                    "id": "back-squat",
                    "sets": 3,
                    "reps": "6-10"
                },
                {
                    "id": "romanian-deadlift",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "leg-curl",
                    "sets": 2,
                    "reps": "10-15"
                }
            ]
        },
        {
            "name": "Day 3 - Cardio Intervals",
            "exercises": [
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "25-35 min"
                }
            ]
        },
        {
            "name": "Day 4 - Full Body",
            "exercises": [
                {
                    "id": "incline-dumbbell-press",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "chest-supported-row",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "bulgarian-split-squat",
                    "sets": 3,
                    "reps": "8-12"
                },
                {
                    "id": "hip-thrust",
                    "sets": 3,
                    "reps": "8-12"
                }
            ]
        },
        {
            "name": "Day 5 - Steady Cardio",
            "exercises": [
                {
                    "id": "indoor-rower",
                    "sets": 1,
                    "reps": "30-45 min"
                }
            ]
        }
    ]
},

{
    "id": "five-day-cardio-variety",
    "name": "5-Day Cardio Variety Plan",
    "daysPerWeek": 5,
    "estimatedMinutes": "30-60",
    "level": "Intermediate",
    "trainingType": "Cardio",
    "description": "A five-day rotation using varied cardio modes and session styles.",
    "days": [
        {
            "name": "Day 1 - Easy Run",
            "exercises": [
                {
                    "id": "running",
                    "sets": 1,
                    "reps": "30-40 min easy"
                }
            ]
        },
        {
            "name": "Day 2 - Bike Intervals",
            "exercises": [
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "25-35 min"
                }
            ]
        },
        {
            "name": "Day 3 - Recovery Row",
            "exercises": [
                {
                    "id": "indoor-rower",
                    "sets": 1,
                    "reps": "20-30 min easy"
                }
            ]
        },
        {
            "name": "Day 4 - SkiErg Tempo",
            "exercises": [
                {
                    "id": "ski-erg",
                    "sets": 1,
                    "reps": "25-35 min"
                }
            ]
        },
        {
            "name": "Day 5 - Longer Steady Cardio",
            "exercises": [
                {
                    "id": "stationary-bike",
                    "sets": 1,
                    "reps": "45-60 min"
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