const groupMuscles = {
    Chest: { primary: ["Chest"], secondary: ["Triceps", "Front Delts"] },
    Back: { primary: ["Lats", "Upper Back"], secondary: ["Biceps", "Rear Delts"] },
    Shoulders: { primary: ["Side Delts", "Front Delts"], secondary: ["Triceps"] },
    "Rear Delts": { primary: ["Rear Delts"], secondary: ["Upper Back"] },
    Biceps: { primary: ["Biceps"], secondary: ["Forearms"] },
    Triceps: { primary: ["Triceps"], secondary: ["Chest", "Front Delts"] },
    Quads: { primary: ["Quads"], secondary: ["Glutes", "Adductors"] },
    Hamstrings: { primary: ["Hamstrings"], secondary: ["Glutes", "Spinal Erectors"] },
    Glutes: { primary: ["Glutes"], secondary: ["Hamstrings"] },
    Calves: { primary: ["Calves"], secondary: [] }
};

const make = (muscles, setup, execution, cues, mistakes) => ({ ...muscles, setup, execution, cues, mistakes });

function horizontalPress(exercise) {
    const incline = exercise.id.includes("incline");
    const machine = exercise.equipment === "Machine";
    const dumbbells = exercise.equipment === "Dumbbells";
    const bodyweight = exercise.id === "push-up";
    const setup = bodyweight
        ? ["Place the hands slightly wider than shoulder width.", "Set the feet or knees securely and keep the body in a comfortable straight line.", "Brace before lowering."]
        : [
            `${machine ? "Adjust the seat" : "Set up on the bench"} so the handles or load align with the ${incline ? "upper chest" : "mid chest"}.`,
            dumbbells ? "Plant the feet and bring both dumbbells into a stable starting position." : "Use a comfortable grip and keep the upper back supported.",
            "Keep the wrists stacked over the forearms."
        ];
    return make(groupMuscles.Chest, setup, [
        `Lower ${bodyweight ? "the chest toward the floor" : machine ? "the handles" : "the load"} with control.`,
        "Keep the elbows moving through a comfortable path.",
        `Press ${bodyweight ? "the floor away" : "back to the start"} without bouncing or losing position.`
    ], ["Stable base", "Controlled lower", "Wrists stacked"], ["Flaring the elbows beyond a comfortable path", "Losing upper-back or trunk position", "Rushing the bottom of the repetition"]);
}

function chestFly(exercise) {
    const cable = exercise.equipment === "Cable";
    return make({ primary: ["Chest"], secondary: ["Front Delts"] }, [
        cable ? "Set both pulleys evenly and stand in a stable staggered stance." : "Adjust the seat so the handles align near chest height.",
        "Begin with a soft, fixed bend in the elbows.",
        "Use a range that keeps the shoulders comfortable."
    ], ["Bring the upper arms toward one another in a wide arc.", "Pause briefly as the chest shortens.", "Return slowly without letting the shoulders roll forward."], ["Soft elbows", "Wide arc", "Controlled stretch"], ["Turning the movement into a press", "Forcing an excessive stretch", "Using momentum"]);
}

function verticalPull(exercise) {
    const bodyweight = ["pull-up", "weighted-pull-up", "chin-up"].includes(exercise.id);
    const chin = exercise.id === "chin-up";
    return make({ primary: ["Lats"], secondary: ["Upper Back", "Biceps", "Forearms"] }, [
        bodyweight ? `Take a secure ${chin ? "underhand" : "comfortable"} grip and begin from a controlled hang.` : "Adjust the thigh pad and take a secure, comfortable grip.",
        "Keep the ribcage and pelvis organized before pulling.",
        bodyweight ? "Use assistance when needed to keep repetitions consistent." : "Sit tall with the cable directly above the torso."
    ], ["Drive the elbows down toward the sides.", `Bring the ${bodyweight ? "upper chest toward the bar" : "bar toward the upper chest"} without forcing the neck forward.`, "Return under control until the arms are long."], ["Elbows down", "Chest tall", "Controlled return"], ["Swinging or leaning excessively", "Shrugging throughout the pull", "Dropping quickly into the stretched position"]);
}

function row(exercise) {
    const oneArm = exercise.id === "single-arm-dumbbell-row";
    const supported = ["chest-supported-row", "machine-row"].includes(exercise.id);
    return make({ primary: ["Upper Back", "Lats"], secondary: ["Rear Delts", "Biceps"] }, [
        oneArm ? "Support the free hand and foot securely while keeping a stable torso." : supported ? "Adjust the support and handles so the chest stays comfortably braced." : "Use a stable stance and establish a torso position you can maintain.",
        "Begin with the arms long and shoulders controlled.",
        "Choose a load that does not require excessive body movement."
    ], ["Pull the elbow back toward the lower ribs.", "Keep the torso controlled as the shoulder blade moves naturally.", "Lower until the arm is long again without losing position."], ["Stable torso", "Elbow toward ribs", "Slow return"], ["Shrugging toward the ears", "Using momentum", "Shortening the return"]);
}

function latIsolation(exercise) {
    return make({ primary: ["Lats"], secondary: ["Triceps", "Deep Core"] }, ["Set the cable high and take a stable stance.", "Begin with the arms long and a soft elbow bend.", "Brace so the torso remains steady."], ["Sweep the arms down toward the thighs.", "Keep the elbows nearly fixed while the shoulders do the work.", "Return slowly until the lats are comfortably lengthened."], ["Long arms", "Ribs controlled", "Sweep toward thighs"], ["Turning it into a triceps extension", "Rocking the torso", "Using too much load to reach the thighs"]);
}

function backExtension() {
    return make({ primary: ["Spinal Erectors", "Glutes"], secondary: ["Hamstrings"] }, ["Adjust the pad so the hips can move freely.", "Secure the feet and begin with a comfortable neutral spine.", "Cross the arms or hold a light load close to the chest."], ["Hinge forward through the hips under control.", "Reverse the motion by extending the hips.", "Finish in line with the legs without leaning far backward."], ["Hinge at hips", "Move smoothly", "Finish neutral"], ["Hyperextending at the top", "Rounding rapidly", "Using momentum"]);
}

function shoulderPress(exercise) {
    const pike = exercise.id === "pike-push-up";
    return make({ primary: ["Front Delts", "Side Delts"], secondary: ["Triceps"] }, [
        pike ? "Set the hands securely and raise the hips into a stable pike position." : exercise.equipment === "Machine" ? "Adjust the seat so the handles begin near shoulder height." : "Set the feet and trunk securely with the load at shoulder height.",
        "Use a comfortable grip and keep the forearms near vertical.",
        "Brace before pressing."
    ], [pike ? "Lower the head between and slightly ahead of the hands." : "Press the load upward through a comfortable path.", "Keep the trunk steady rather than leaning farther back.", pike ? "Push the floor away to return." : "Lower under control to the starting position."], ["Stable trunk", "Forearms stacked", "Controlled lower"], ["Overarching the lower back", "Flaring the elbows excessively", "Using a range that causes shoulder discomfort"]);
}

function lateralRaise(exercise) {
    return make({ primary: ["Side Delts"], secondary: ["Front Delts"] }, [exercise.equipment === "Cable" ? "Set the pulley low and stand far enough away to keep light tension." : "Stand tall with the dumbbells resting by the sides.", "Keep a soft bend in the elbows.", "Use a load that permits a quiet torso."], ["Raise the upper arms out and slightly forward.", "Stop near a comfortable shoulder-height position.", "Lower slowly until the delts remain controlled."], ["Lead with elbows", "Quiet torso", "Slow lower"], ["Shrugging the shoulders", "Swinging the load", "Raising far beyond a comfortable range"]);
}

function uprightRow() {
    return make({ primary: ["Side Delts", "Upper Back"], secondary: ["Biceps"] }, ["Set the cable low and take a comfortable grip.", "Stand tall with the handle near the thighs.", "Choose a grip and range that feel comfortable at the shoulders."], ["Lead the elbows upward while keeping the handle close.", "Stop before the shoulders feel pinched or the wrists lose position.", "Lower with control."], ["Elbows lead", "Comfortable height", "Handle close"], ["Pulling higher than comfortable", "Letting the wrists fold", "Using torso momentum"]);
}

function rearDelt(exercise) {
    return make({ primary: ["Rear Delts"], secondary: ["Upper Back"] }, [exercise.equipment === "Machine" ? "Adjust the seat so the handles align with the shoulders." : exercise.equipment === "Cable" ? "Set the cable near face height and take a stable stance." : "Hinge to a stable torso angle with light dumbbells.", "Keep a soft bend in the elbows.", "Begin with the shoulders relaxed away from the ears."], [exercise.id === "face-pull" ? "Pull the rope toward the face while spreading the hands." : "Move the upper arms outward in a wide arc.", "Keep the torso still and avoid shrugging.", "Return slowly to the start."], ["Wide elbows", "Shoulders down", "Control the return"], ["Shrugging", "Using excessive load", "Turning the movement into a row"]);
}

function curl(exercise) {
    const hammer = exercise.id === "hammer-curl";
    const incline = exercise.id === "incline-dumbbell-curl";
    const preacher = exercise.id === "preacher-curl";
    return make({ primary: ["Biceps"], secondary: ["Forearms"] }, [preacher ? "Adjust the seat so the upper arms rest fully on the pad." : incline ? "Set the bench to a comfortable incline and let the arms hang naturally." : "Stand or sit tall with the elbows near the sides.", hammer ? "Use a neutral, palms-facing grip." : "Use a comfortable palm-up grip.", "Choose a load that keeps the upper arms controlled."], ["Bend the elbows to raise the load.", "Keep the upper arms mostly still as the biceps shorten.", "Lower slowly until the elbows are comfortably extended."], ["Elbows quiet", "Full control", "Slow lower"], ["Swinging the torso", "Letting elbows drift excessively", "Dropping the load"]);
}

function triceps(exercise) {
    const overhead = exercise.id.includes("overhead") || exercise.id === "skull-crusher";
    const compound = ["close-grip-bench-press", "dip"].includes(exercise.id);
    if (compound) return exercise.id === "dip" ? dipGuide() : closeGripGuide();
    return make({ primary: ["Triceps"], secondary: [] }, [overhead ? "Position the upper arms comfortably beside the head or over the shoulders." : "Set the cable high and keep the elbows near the sides.", "Use a secure grip and stable stance.", "Choose a load that allows the elbows to move smoothly."], ["Extend the elbows until the arms are nearly straight.", "Keep the upper arms controlled throughout.", "Return slowly into a comfortable stretch."], ["Upper arms still", "Smooth extension", "Controlled return"], ["Moving mainly at the shoulders", "Flaring the elbows excessively", "Using momentum"]);
}

function closeGripGuide() {
    return make({ primary: ["Triceps"], secondary: ["Chest", "Front Delts"] }, ["Lie securely with the feet planted and upper back supported.", "Use a grip narrow enough to emphasize the triceps but wide enough for comfortable wrists.", "Unrack with control."], ["Lower the bar toward the lower chest with the elbows controlled.", "Keep the wrists stacked over the forearms.", "Press smoothly to the start."], ["Comfortable close grip", "Elbows controlled", "Press smoothly"], ["Using an excessively narrow grip", "Letting wrists fold", "Bouncing the bar"]);
}

function dipGuide() {
    return make({ primary: ["Triceps"], secondary: ["Chest", "Front Delts"] }, ["Take a secure grip on the handles.", "Use assistance if needed to keep the repetitions controlled.", "Begin with the shoulders supported rather than shrugged."], ["Lower by bending the elbows through a comfortable range.", "Keep the body path consistent.", "Press the handles away to return."], ["Shoulders supported", "Controlled depth", "Smooth press"], ["Dropping too deep", "Shrugging", "Using swinging momentum"]);
}

function squatPattern(exercise) {
    const split = ["bulgarian-split-squat", "lunge", "step-up"].includes(exercise.id);
    const machine = ["leg-press", "hack-squat"].includes(exercise.id);
    const front = exercise.id === "front-squat";
    return make({ primary: ["Quads"], secondary: ["Glutes", "Adductors"] }, [
        split ? "Set the working foot securely and use support if balance limits the movement." : machine ? "Adjust the seat or platform so the hips and knees can move comfortably." : front ? "Secure the bar across the front shoulders with a comfortable grip." : exercise.id === "goblet-squat" ? "Hold one dumbbell close to the chest and choose a stable stance." : "Choose a stable stance with the feet planted.",
        "Align the knees with the direction of the feet.",
        "Brace before descending."
    ], [split ? "Lower the body by bending the working hip and knee." : "Bend the knees and hips together while keeping pressure through the feet.", "Use the deepest range you can control comfortably.", split ? "Drive through the working foot to rise." : "Stand or press back up without bouncing."], ["Whole foot planted", "Knees track with feet", "Control the bottom"], ["Rushing the descent", "Letting the heel lift", "Using a range that changes the movement pattern"]);
}

function legExtension() {
    return make({ primary: ["Quads"], secondary: [] }, ["Align the machine pivot with the knee joint.", "Set the shin pad comfortably above the ankles.", "Sit back and hold the handles lightly."], ["Extend the knees smoothly.", "Pause briefly without snapping into lockout.", "Lower under control to a comfortable bend."], ["Smooth extension", "Quiet hips", "Slow lower"], ["Kicking the pad", "Lifting the hips", "Dropping the weight stack"]);
}

function hinge(exercise) {
    const single = exercise.id === "single-leg-romanian-deadlift";
    const conventional = ["conventional-deadlift", "trap-bar-deadlift"].includes(exercise.id);
    return make({ primary: ["Hamstrings", "Glutes"], secondary: ["Spinal Erectors", "Forearms"] }, [single ? "Stand on one leg with a soft knee and use support if needed." : conventional ? "Set the load over the middle of the foot and take a secure grip." : "Set the feet securely with a soft bend in the knees.", "Brace and keep the load close to the body.", "Choose a range that allows a stable spine and hips."], [conventional ? "Push through the floor while the hips and knees extend together." : "Send the hips back while the torso inclines forward.", "Keep the load close and move smoothly.", conventional ? "Stand tall, then return the load with control." : "Drive the hips forward to stand without leaning backward."], ["Hips move back", "Load stays close", "Finish tall"], ["Letting the load drift forward", "Rounding to gain extra range", "Hyperextending at the top"]);
}

function legCurl(exercise) {
    return make({ primary: ["Hamstrings"], secondary: [] }, ["Align the machine pivot with the knee joint.", "Adjust the pad comfortably above the ankles.", exercise.id === "seated-leg-curl" ? "Secure the thigh pad and sit fully against the backrest." : "Keep the hips supported by the bench."], ["Bend the knees to pull the pad through a comfortable range.", "Pause briefly as the hamstrings shorten.", "Return slowly without letting the stack drop."], ["Hips stay down", "Smooth curl", "Slow return"], ["Lifting the hips", "Jerking the pad", "Dropping the weight stack"]);
}

function hipExtension(exercise) {
    const thrust = exercise.id === "hip-thrust";
    const bridge = exercise.id === "glute-bridge";
    return make({ primary: ["Glutes"], secondary: ["Hamstrings"] }, [thrust ? "Place the upper back securely on the bench and position the load over the hips." : bridge ? "Lie on the floor with the feet planted near the hips." : "Face away from a low cable with the rope passing comfortably between the legs.", "Set the feet securely and brace.", "Use padding or a range that remains comfortable."], [thrust || bridge ? "Drive through the feet and extend the hips." : "Hinge back, then drive the hips forward against the cable.", "Finish with the torso and thighs aligned without leaning backward.", "Lower or hinge back under control."], ["Drive through feet", "Finish with glutes", "Ribs controlled"], ["Overarching the lower back", "Pushing mainly through the toes", "Using momentum"]);
}

function calfRaise(exercise) {
    const seated = exercise.id === "seated-calf-raise";
    return make({ primary: ["Calves"], secondary: [] }, [exercise.id === "leg-press-calf-raise" ? "Place the balls of the feet securely on the lower platform edge." : "Position the balls of the feet securely on the platform.", seated ? "Adjust the thigh pad and keep the knees comfortably bent." : "Keep the knees softly extended without forcing lockout.", "Use support so balance does not limit the set."], ["Lower the heels into a comfortable calf stretch.", "Press through the balls of the feet to rise as high as controlled.", "Pause briefly, then lower slowly."], ["Full controlled range", "Pause at top", "Slow stretch"], ["Bouncing at the bottom", "Rolling onto the outside of the feet", "Using a shortened range"]);
}

function cardio(exercise) {
    const details = {
        "indoor-rower": { primary: ["Upper Back", "Quads"], secondary: ["Glutes", "Hamstrings", "Lats"], setup: ["Secure the feet and set the monitor or resistance appropriately.", "Sit tall with the handle held evenly.", "Begin with shins near vertical and arms long."], execution: ["Drive with the legs before opening the hips and drawing the handle toward the lower ribs.", "Reverse the order: arms, torso, then knees.", "Keep the stroke smooth and repeatable."], cues: ["Legs first", "Handle to lower ribs", "Smooth recovery"], mistakes: ["Pulling early with the arms", "Rounding excessively", "Rushing back toward the flywheel"] },
        "ski-erg": { primary: ["Lats", "Rectus Abdominis"], secondary: ["Triceps"], setup: ["Stand facing the machine with a stable stance.", "Reach for both handles with the arms long.", "Begin tall with light tension in the cords."], execution: ["Drive the handles down while hinging slightly and bending the knees.", "Finish with the hands near the thighs.", "Return smoothly to the tall position."], cues: ["Drive down", "Hands to thighs", "Smooth return"], mistakes: ["Pulling only with the arms", "Rounding sharply", "Letting the cords snap upward"] },
        "stationary-bike": { primary: ["Quads"], secondary: ["Glutes", "Hamstrings", "Calves"], setup: ["Adjust the seat so the knee remains slightly bent at the bottom of the pedal stroke.", "Place the feet securely on the pedals.", "Choose manageable resistance before starting."], execution: ["Pedal with a smooth, even cadence.", "Keep the hips steady on the seat.", "Adjust resistance or pace gradually."], cues: ["Smooth cadence", "Hips steady", "Relaxed shoulders"], mistakes: ["Setting the seat too low", "Bouncing at high cadence", "Adding resistance that changes the pedal stroke"] },
        running: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Calves"], setup: ["Begin with an easy walk or jog.", "Choose a clear, appropriate surface and supportive footwear.", "Build pace gradually."], execution: ["Use a relaxed stride that lands near the body.", "Keep the arms moving naturally and shoulders relaxed.", "Reduce pace if form or comfort changes."], cues: ["Relaxed stride", "Quiet shoulders", "Build gradually"], mistakes: ["Starting too fast", "Overstriding", "Continuing through sharp or worsening pain"] }
    };
    return details[exercise.id];
}

export function createGeneratedExerciseGuide(exercise) {
    if (!exercise) return null;
    const id = exercise.id;
    if (["dumbbell-bench-press", "incline-barbell-press", "incline-dumbbell-press", "machine-chest-press", "push-up"].includes(id)) return horizontalPress(exercise);
    if (["cable-fly", "pec-deck"].includes(id)) return chestFly(exercise);
    if (["weighted-pull-up", "chin-up", "lat-pulldown"].includes(id)) return verticalPull(exercise);
    if (["single-arm-dumbbell-row", "chest-supported-row", "seated-cable-row", "machine-row"].includes(id)) return row(exercise);
    if (["straight-arm-pulldown", "cable-lat-pullover"].includes(id)) return latIsolation(exercise);
    if (id === "back-extension") return backExtension();
    if (["overhead-press", "dumbbell-shoulder-press", "machine-shoulder-press", "pike-push-up"].includes(id)) return shoulderPress(exercise);
    if (["lateral-raise", "cable-lateral-raise"].includes(id)) return lateralRaise(exercise);
    if (id === "upright-row") return uprightRow();
    if (["reverse-pec-deck", "face-pull", "rear-delt-fly"].includes(id)) return rearDelt(exercise);
    if (exercise.muscleGroup === "Biceps") return curl(exercise);
    if (exercise.muscleGroup === "Triceps") return triceps(exercise);
    if (["front-squat", "leg-press", "hack-squat", "bulgarian-split-squat", "lunge", "step-up", "goblet-squat", "bodyweight-squat"].includes(id)) return squatPattern(exercise);
    if (id === "leg-extension") return legExtension();
    if (["romanian-deadlift", "trap-bar-deadlift", "good-morning", "single-leg-romanian-deadlift"].includes(id)) return hinge(exercise);
    if (["leg-curl", "seated-leg-curl"].includes(id)) return legCurl(exercise);
    if (["hip-thrust", "glute-bridge", "cable-pull-through"].includes(id)) return hipExtension(exercise);
    if (exercise.muscleGroup === "Calves") return calfRaise(exercise);
    if (exercise.muscleGroup === "Cardio") return cardio(exercise);
    return null;
}
