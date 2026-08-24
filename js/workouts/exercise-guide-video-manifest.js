const FORM_VIDEO_BASE_URL = "https://media.leveluphypertrophy.com/form-videos";

const entries = {
    // Chest
    "barbell-bench-press": ["barbell-bench-press.mp4", "Barbell Bench Press.mp4"],
    "dumbbell-bench-press": ["dumbbell-bench-press.mp4", "Dumbbell Bench Press.mp4"],
    "incline-barbell-press": ["incline-barbell-press.mp4", "Barbell Incline Bench Press.mp4"],
    "incline-dumbbell-press": ["incline-dumbbell-press.mp4", "Dumbbell Incline Bench Press.mp4"],
    "machine-chest-press": ["machine-chest-press.mp4", "Lever Chest Press.mp4"],
    "cable-fly": ["cable-fly.mp4", "Cable Standing Fly, Crossover fly.mp4"],
    "pec-deck": ["pec-deck.mp4", "Lever Pec Deck Fly.mp4"],
    "push-up": ["push-up.mp4", "Push-ups.mp4"],

    // Back
    "pull-up": ["pull-up.mp4", "Pull-up (shoulder grip).mp4"],
    "weighted-pull-up": ["pull-up.mp4", "Pull-up (shoulder grip).mp4"],
    "chin-up": ["chin-up.mp4", "Reverse Grip Pull-up.mp4"],
    "lat-pulldown": ["lat-pulldown.mp4", "Cable Pulldown.mp4"],
    "barbell-row": ["barbell-row.mp4", "Barbell Bent-over Row Overgrip.mp4"],
    "chest-supported-row": ["chest-supported-row.mp4", "Dumbbell Incline Row.mp4"],
    "seated-cable-row": ["seated-cable-row.mp4", "Cable Seated Row (normal grip).mp4"],
    "straight-arm-pulldown": ["straight-arm-pulldown.mp4", "Cable Straight Arm Pulldown.mp4"],
    "back-extension": ["back-extension.mp4", "45 Degree Hyperextension.mp4"],

    // Shoulders / rear delts
    "dumbbell-shoulder-press": ["dumbbell-shoulder-press.mp4", "Dumbbell Alternate Shoulder Press.mp4"],
    "machine-shoulder-press": ["machine-shoulder-press.mp4", "Smith Seated Shoulder Press.mp4"],
    "lateral-raise": ["lateral-raise.mp4", "Dumbbell Lateral Raise.mp4"],
    "cable-lateral-raise": ["cable-lateral-raise.mp4", "Cable Lateral Raise.mp4"],
    "reverse-pec-deck": ["reverse-pec-deck.mp4", "Lever Seated Reverse Fly.mp4"],
    "rear-delt-fly": ["rear-delt-fly.mp4", "Dumbbell Rear Lateral Raise.mp4"],
    "upright-row": ["upright-row.mp4", "Barbell Upright Row (wide-grip).mp4"],

    // Biceps
    "barbell-curl": ["barbell-curl.mp4", "Barbell Curl.mp4"],
    "dumbbell-curl": ["dumbbell-curl.mp4", "Dumbbell Biceps Curl.mp4"],
    "hammer-curl": ["hammer-curl.mp4", "Dumbbell Cross Body Hammer Curl.mp4"],
    "incline-dumbbell-curl": ["incline-dumbbell-curl.mp4", "Dumbbell Incline Curl.mp4"],
    "preacher-curl": ["preacher-curl.mp4", "Lever Preacher Curl.mp4"],
    "cable-curl": ["cable-curl.mp4", "Cable One Arm Curl.mp4"],

    // Triceps
    "tricep-pushdown": ["tricep-pushdown.mp4", "Cable Triceps Pushdown.mp4"],
    "overhead-tricep-extension": ["overhead-tricep-extension.mp4", "Cable Overhead Triceps Extension (rope attachment).mp4"],
    "close-grip-bench-press": ["close-grip-bench-press.mp4", "Barbell Close Grip Bench Press.mp4"],

    // Lower body
    "back-squat": ["back-squat.mp4", "Classic Barbell Squat.mp4"],
    "leg-press": ["leg-press.mp4", "Lever Horizontal Leg Press.mp4"],
    "hack-squat": ["hack-squat.mp4", "Sled Hack Squat.mp4"],
    "lunge": ["lunge.mp4", "Dumbbell Lunge.mp4"],
    "leg-extension": ["leg-extension.mp4", "Lever Leg Extension.mp4"],
    "goblet-squat": ["goblet-squat.mp4", "Dumbbell Goblet Squat.mp4"],
    "leg-curl": ["leg-curl.mp4", "Lever Lying Leg Curl.mp4"],
    "seated-leg-curl": ["seated-leg-curl.mp4", "Lever Seated Leg Curl.mp4"],

    // Calves
    "standing-calf-raise": ["standing-calf-raise.mp4", "Lever Standing Calf Raise.mp4"],
    "seated-calf-raise": ["seated-calf-raise.mp4", "Lever Seated Calf Raise.mp4"],
    "leg-press-calf-raise": ["leg-press-calf-raise.mp4", "Sled 45 Degree Calf Press.mp4"],
    "single-leg-calf-raise": ["single-leg-calf-raise.mp4", "Dumbbell Single Leg Calf Raise.mp4"],

    // Core
    "side-plank": ["side-plank.mp4", "Side Bridge - Side Plank.mp4"],

    // Cardio
    "stationary-bike": ["stationary-bike.mp4", "Stationary Bike.mp4"],
    "running": ["running.mp4", "Running.mp4"]
};

export const FORM_GUIDE_VIDEOS = Object.freeze(Object.fromEntries(
    Object.entries(entries).map(([exerciseId, [objectKey, sourceName]]) => [
        exerciseId,
        Object.freeze({
            src: `${FORM_VIDEO_BASE_URL}/${objectKey}`,
            objectKey,
            sourceName
        })
    ])
));

export function getFormGuideVideo(exerciseId) {
    return FORM_GUIDE_VIDEOS[exerciseId] || null;
}
