export const exercises = [

    // CHEST

    {
        id: "barbell-bench-press",
        name: "Barbell Bench Press",
        muscleGroup: "Chest",
        type: "compound",
        equipment: "Barbell",
        recommendedReps: "6-10",
        defaultSets: 3
    },

    {
        id: "incline-dumbbell-press",
        name: "Incline Dumbbell Press",
        muscleGroup: "Chest",
        type: "compound",
        equipment: "Dumbbells",
        recommendedReps: "8-12",
        defaultSets: 3
    },

    {
        id: "cable-fly",
        name: "Cable Fly",
        muscleGroup: "Chest",
        type: "isolation",
        equipment: "Cable",
        recommendedReps: "10-15",
        defaultSets: 3
    },


    // BACK

    {
        id: "lat-pulldown",
        name: "Lat Pulldown",
        muscleGroup: "Back",
        type: "compound",
        equipment: "Cable",
        recommendedReps: "8-12",
        defaultSets: 3
    },

    {
        id: "barbell-row",
        name: "Barbell Row",
        muscleGroup: "Back",
        type: "compound",
        equipment: "Barbell",
        recommendedReps: "6-10",
        defaultSets: 3
    },


    // LEGS

    {
        id: "back-squat",
        name: "Back Squat",
        muscleGroup: "Quads",
        type: "compound",
        equipment: "Barbell",
        recommendedReps: "6-10",
        defaultSets: 3
    },

    {
        id: "romanian-deadlift",
        name: "Romanian Deadlift",
        muscleGroup: "Hamstrings",
        type: "compound",
        equipment: "Barbell",
        recommendedReps: "6-10",
        defaultSets: 3
    },


    // SHOULDERS

    {
        id: "overhead-press",
        name: "Overhead Press",
        muscleGroup: "Shoulders",
        type: "compound",
        equipment: "Barbell",
        recommendedReps: "6-10",
        defaultSets: 3
    },

    {
        id: "lateral-raise",
        name: "Lateral Raise",
        muscleGroup: "Shoulders",
        type: "isolation",
        equipment: "Dumbbells",
        recommendedReps: "12-20",
        defaultSets: 3
    },


    // ARMS

    {
        id: "barbell-curl",
        name: "Barbell Curl",
        muscleGroup: "Biceps",
        type: "isolation",
        equipment: "Barbell",
        recommendedReps: "8-12",
        defaultSets: 3
    },

    {
        id: "tricep-pushdown",
        name: "Tricep Pushdown",
        muscleGroup: "Triceps",
        type: "isolation",
        equipment: "Cable",
        recommendedReps: "10-15",
        defaultSets: 3
    }

];


export function getExerciseById(id) {

    return exercises.find(
        exercise => exercise.id === id
    );

}