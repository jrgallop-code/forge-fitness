const groupMuscles = {
    Chest: { primary: ["Chest"], secondary: ["Triceps", "Front Delts"] },
    Back: { primary: ["Lats", "Upper Back"], secondary: ["Biceps", "Rear Delts"] },
    Shoulders: { primary: ["Side Delts", "Front Delts"], secondary: ["Triceps"] },
    "Rear Delts": { primary: ["Rear Delts"], secondary: ["Upper Back"] },
    Traps: { primary: ["Upper Back"], secondary: ["Rear Delts", "Forearms"] },
    Biceps: { primary: ["Biceps"], secondary: ["Forearms"] },
    Triceps: { primary: ["Triceps"], secondary: [] },
    Quads: { primary: ["Quads"], secondary: ["Glutes", "Adductors"] },
    Hamstrings: { primary: ["Hamstrings"], secondary: ["Glutes", "Spinal Erectors"] },
    Glutes: { primary: ["Glutes"], secondary: ["Hamstrings"] },
    Adductors: { primary: ["Adductors"], secondary: ["Glutes"] },
    Tibialis: { primary: ["Calves"], secondary: [] },
    Calves: { primary: ["Calves"], secondary: [] },
    Core: { primary: ["Rectus Abdominis", "Deep Core"], secondary: ["Obliques"] },
    Forearms: { primary: ["Forearms"], secondary: ["Biceps"] }
};

const make = (muscles, setup, execution, cues, mistakes) => ({
    ...muscles,
    setup,
    execution,
    cues,
    mistakes
});

function normalizedName(exercise) {
    return `${exercise?.id || ""} ${exercise?.name || ""}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function horizontalPress(exercise) {
    const n = normalizedName(exercise);
    const incline = /incline/.test(n);
    const bodyweight = /push up|pushup/.test(n);
    const machine = /machine|smith|converging/.test(n) || exercise?.equipment === "Machine" || exercise?.equipment === "Smith Machine";
    const dumbbells = /dumbbell/.test(n) || exercise?.equipment === "Dumbbells";
    const setup = bodyweight
        ? [
            "Place the hands slightly wider than shoulder width and set the feet or knees securely.",
            "Keep the head, ribs and pelvis in a stable line before lowering.",
            "Choose a hand position and range that keep the shoulders comfortable."
        ]
        : [
            machine
                ? `Adjust the seat or bench so the handles or bar line up with the ${incline ? "upper chest" : "mid chest"}.`
                : `Set up on the bench so the load can travel toward the ${incline ? "upper chest" : "mid chest"}.`,
            dumbbells ? "Plant the feet and bring both dumbbells into a stable starting position." : "Use a comfortable grip and keep the upper back supported.",
            "Keep the wrists stacked over the forearms."
        ];
    return make(groupMuscles.Chest, setup, [
        `Lower ${bodyweight ? "the chest toward the floor" : machine ? "the handles or bar" : "the load"} with control.`,
        "Keep the elbows moving through a repeatable, comfortable path.",
        `Press ${bodyweight ? "the floor away" : "back to the start"} without bouncing or losing position.`
    ], ["Stable base", "Wrists stacked", "Controlled lower"], [
        "Flaring the elbows beyond a comfortable path",
        "Losing upper-back or trunk position",
        "Rushing the bottom of the repetition"
    ]);
}

function chestFly(exercise) {
    const n = normalizedName(exercise);
    const cable = /cable|crossover/.test(n) || exercise?.equipment === "Cable";
    return make({ primary: ["Chest"], secondary: ["Front Delts"] }, [
        cable ? "Set the cable height for the intended line of pull and take a stable stance." : "Set the bench or seat so the arms can move through a comfortable chest-height arc.",
        "Begin with a soft, nearly fixed bend in the elbows.",
        "Choose a range that keeps the shoulders comfortable."
    ], [
        "Bring the upper arms toward one another in a wide arc.",
        "Pause briefly as the chest shortens without turning the movement into a press.",
        "Return slowly until the chest is comfortably lengthened."
    ], ["Soft elbows", "Wide arc", "Controlled stretch"], [
        "Changing the elbow bend enough to turn the exercise into a press",
        "Forcing an excessive shoulder stretch",
        "Using torso momentum"
    ]);
}

function verticalPull(exercise) {
    const n = normalizedName(exercise);
    const bodyweight = /pull up|pullup|chin up|chinup/.test(n);
    const singleArm = /single arm|one arm/.test(n);
    return make({ primary: ["Lats"], secondary: ["Upper Back", "Biceps", "Forearms"] }, [
        bodyweight
            ? "Take a secure, comfortable grip and begin from a controlled hang."
            : singleArm
                ? "Set the cable high, secure the lower body and take the handle with one arm."
                : "Adjust the thigh pad and take a secure, comfortable grip.",
        "Keep the ribcage and pelvis controlled before pulling.",
        bodyweight ? "Use assistance when needed to keep the repetitions consistent." : "Begin with the arm or arms long and the shoulders controlled."
    ], [
        "Drive the elbow or elbows down toward the sides.",
        bodyweight ? "Bring the upper chest toward the bar without forcing the neck forward." : "Bring the handle or bar toward the upper torso while keeping the torso mostly still.",
        "Return under control until the arms are long again."
    ], ["Elbows down", "Chest tall", "Controlled return"], [
        "Swinging or leaning excessively",
        "Shrugging throughout the pull",
        "Letting the cable or body drop quickly into the stretch"
    ]);
}

function row(exercise) {
    const n = normalizedName(exercise);
    const oneArm = /single arm|one arm|meadows/.test(n);
    const supported = /chest supported|seal row|machine row|plate loaded/.test(n) || exercise?.equipment === "Machine";
    return make({ primary: ["Upper Back", "Lats"], secondary: ["Rear Delts", "Biceps"] }, [
        oneArm
            ? "Set a stable stance or support position so the torso can stay controlled."
            : supported
                ? "Adjust the support and handles so the chest or torso stays comfortably braced."
                : "Use a stable stance and establish a torso angle you can maintain.",
        "Begin with the arm or arms long and the shoulders controlled.",
        "Choose a load that does not require excessive body movement."
    ], [
        "Pull the elbow or elbows back toward the ribs through a comfortable path.",
        "Let the shoulder blades move naturally while the torso stays controlled.",
        "Return slowly until the arms are long again without losing position."
    ], ["Stable torso", "Elbows back", "Slow return"], [
        "Shrugging toward the ears",
        "Using torso momentum",
        "Shortening the controlled return"
    ]);
}

function latIsolation(exercise) {
    return make({ primary: ["Lats"], secondary: ["Triceps", "Deep Core"] }, [
        "Set the cable high and take a stable stance with the arms long.",
        "Keep a soft, nearly fixed bend in the elbows.",
        "Brace so the torso does not need to rock to move the handle."
    ], [
        "Sweep the upper arms down toward the thighs.",
        "Keep the elbow angle nearly fixed while the shoulders drive the movement.",
        "Return slowly until the lats are comfortably lengthened."
    ], ["Long arms", "Ribs controlled", "Sweep toward thighs"], [
        "Turning the exercise into a triceps extension",
        "Rocking the torso",
        "Using too much load to reach the thighs"
    ]);
}

function dumbbellPullover() {
    return make({ primary: ["Lats"], secondary: ["Chest", "Triceps"] }, [
        "Lie securely across or along a bench and hold one dumbbell over the chest with both hands.",
        "Keep the ribs controlled and maintain a soft bend in the elbows.",
        "Start with a load light enough to control the overhead range."
    ], [
        "Lower the dumbbell in an arc behind the head while keeping the elbow angle mostly unchanged.",
        "Stop when the lats and chest are comfortably lengthened without the ribs flaring excessively.",
        "Pull the upper arms back over the torso under control."
    ], ["Soft elbows", "Ribs controlled", "Smooth arc"], [
        "Turning the movement into an elbow extension",
        "Overarching the lower back to gain range",
        "Dropping too quickly into the stretch"
    ]);
}

function backExtension() {
    return make({ primary: ["Spinal Erectors", "Glutes"], secondary: ["Hamstrings"] }, [
        "Adjust the pad so the hips can hinge freely.",
        "Secure the feet and begin with a comfortable neutral spine.",
        "Cross the arms or hold a light load close to the chest."
    ], [
        "Hinge forward through the hips under control.",
        "Reverse the motion by extending the hips.",
        "Finish in line with the legs without leaning far backward."
    ], ["Hinge at hips", "Move smoothly", "Finish neutral"], [
        "Hyperextending at the top",
        "Rounding rapidly",
        "Using momentum"
    ]);
}

function shoulderPress(exercise) {
    const n = normalizedName(exercise);
    const pike = /pike push/.test(n);
    const machine = /machine|smith/.test(n) || exercise?.equipment === "Machine" || exercise?.equipment === "Smith Machine";
    return make({ primary: ["Front Delts", "Side Delts"], secondary: ["Triceps"] }, [
        pike
            ? "Set the hands securely and raise the hips into a stable pike position."
            : machine
                ? "Adjust the seat so the handles or bar begin around shoulder height."
                : "Set the feet and trunk securely with the load at shoulder height.",
        "Use a comfortable grip and keep the forearms near vertical.",
        "Brace the trunk before pressing."
    ], [
        pike ? "Lower the head between and slightly ahead of the hands." : "Press the load upward through a comfortable path.",
        "Keep the trunk steady rather than leaning farther back as effort increases.",
        pike ? "Push the floor away to return." : "Lower under control to the starting position."
    ], ["Stable trunk", "Forearms stacked", "Controlled lower"], [
        "Overarching the lower back",
        "Flaring the elbows excessively",
        "Using a range that causes shoulder discomfort"
    ]);
}

function lateralRaise(exercise) {
    const n = normalizedName(exercise);
    const cable = /cable/.test(n) || exercise?.equipment === "Cable";
    const machine = /machine/.test(n) || exercise?.equipment === "Machine";
    return make({ primary: ["Side Delts"], secondary: ["Front Delts"] }, [
        cable ? "Set the pulley low and stand far enough away to keep light tension." : machine ? "Adjust the seat and pads so the arms can move comfortably out to the sides." : "Stand or sit tall with the dumbbells resting by the sides.",
        "Keep a soft bend in the elbows.",
        "Use a load that permits a quiet torso."
    ], [
        "Raise the upper arms out and slightly forward.",
        "Stop near a comfortable shoulder-height position.",
        "Lower slowly while keeping the delts in control."
    ], ["Lead with elbows", "Quiet torso", "Slow lower"], [
        "Shrugging the shoulders",
        "Swinging the load",
        "Raising far beyond a comfortable range"
    ]);
}

function yRaise(exercise) {
    return make({ primary: ["Rear Delts", "Upper Back"], secondary: ["Side Delts"] }, [
        exercise?.equipment === "Cable" ? "Set the cables low and take a stable stance between or just ahead of the pulleys." : "Use a stable supported position with light resistance.",
        "Begin with the arms long and thumbs or palms in a comfortable neutral-to-upward position.",
        "Use a light load that allows the shoulders to move without shrugging."
    ], [
        "Raise the arms forward and outward into a Y shape.",
        "Stop at a comfortable height while keeping the ribs and torso controlled.",
        "Lower slowly through the same path."
    ], ["Light load", "Reach into a Y", "No shrugging"], [
        "Using momentum from the torso",
        "Shrugging hard toward the ears",
        "Forcing the arms higher than the shoulders can comfortably move"
    ]);
}

function uprightRow() {
    return make({ primary: ["Side Delts", "Upper Back"], secondary: ["Biceps"] }, [
        "Take a comfortable grip and stand tall with the handle or bar near the thighs.",
        "Choose a grip width and planned top position that feel comfortable.",
        "Brace before pulling."
    ], [
        "Lead the elbows upward while keeping the load close.",
        "Stop at the highest comfortable position.",
        "Lower slowly without using torso momentum."
    ], ["Elbows lead", "Comfortable height", "Load close"], [
        "Pulling higher than comfortable",
        "Letting the wrists fold excessively",
        "Using torso momentum"
    ]);
}

function rearDelt(exercise) {
    const n = normalizedName(exercise);
    const cable = /cable|face pull/.test(n) || exercise?.equipment === "Cable";
    const machine = /machine|pec deck/.test(n) || exercise?.equipment === "Machine";
    return make({ primary: ["Rear Delts"], secondary: ["Upper Back"] }, [
        machine ? "Adjust the seat so the handles line up around shoulder height." : cable ? "Set the cable around shoulder or face height and take a stable stance." : "Hinge or brace against support with light dumbbells.",
        "Keep a soft bend in the elbows.",
        "Begin with the shoulders relaxed away from the ears."
    ], [
        /face pull/.test(n) ? "Pull the rope toward the face while spreading the hands." : /row/.test(n) ? "Drive the elbows out and back in a wide path." : "Move the upper arms outward in a wide arc.",
        "Keep the torso controlled and avoid shrugging.",
        "Return slowly to the start."
    ], ["Wide elbows", "Shoulders down", "Control the return"], [
        "Shrugging",
        "Using excessive load",
        "Turning the movement into a narrow heavy row"
    ]);
}

function shrug(exercise) {
    const machine = exercise?.equipment === "Smith Machine" || /smith/.test(normalizedName(exercise));
    return make(groupMuscles.Traps, [
        machine ? "Stand centered under the bar with a stable stance and the bar close to the thighs." : "Stand tall with the dumbbells hanging beside the thighs.",
        "Keep the arms long and the head in a neutral position.",
        "Use a load that allows the shoulders to move through a controlled range."
    ], [
        "Elevate the shoulders upward without bending the elbows to lift the load.",
        "Pause briefly at the top without rolling the shoulders forward or backward.",
        "Lower slowly until the upper traps are lengthened."
    ], ["Arms long", "Shoulders straight up", "Slow lower"], [
        "Bending the elbows to help lift the load",
        "Rolling the shoulders in circles",
        "Using a bounce at the bottom"
    ]);
}

function curl(exercise) {
    const n = normalizedName(exercise);
    const hammer = /hammer/.test(n);
    const preacher = /preacher/.test(n);
    const incline = /incline/.test(n);
    const cable = /cable|bayesian/.test(n) || exercise?.equipment === "Cable";
    return make(groupMuscles.Biceps, [
        preacher ? "Adjust the support so the upper arms rest securely on the pad." : incline ? "Set the bench to a comfortable incline and let the arms hang naturally." : cable ? "Set the cable for the intended line of pull and take a stable stance." : "Stand or sit tall with the elbows near the sides.",
        hammer ? "Use a neutral, palms-facing grip." : /reverse curl/.test(n) ? "Use a palms-down grip and keep the wrists controlled." : "Use the grip required by the variation.",
        "Choose a load that keeps the upper arms controlled."
    ], [
        "Bend the elbows to raise the load.",
        "Keep the upper arms mostly still as the elbow flexes.",
        "Lower slowly until the elbows are comfortably extended."
    ], ["Elbows quiet", "Wrists controlled", "Slow lower"], [
        "Swinging the torso",
        "Letting the elbows drift excessively",
        "Dropping the load on the return"
    ]);
}

function triceps(exercise) {
    const n = normalizedName(exercise);
    const compound = /\bdip\b|close grip/.test(n);
    const overhead = /overhead|skull crusher/.test(n);
    if (compound) {
        return make({ primary: ["Triceps"], secondary: ["Chest", "Front Delts"] }, [
            /dip/.test(n) ? "Take a secure grip on the handles and use assistance if needed." : "Lie securely with the feet planted and use a comfortable close grip.",
            "Keep the shoulders supported and the wrists controlled.",
            "Choose a range that keeps the elbows and shoulders comfortable."
        ], [
            "Lower under control by bending the elbows.",
            "Keep the upper arms moving through a repeatable path.",
            "Press smoothly back to the start."
        ], ["Shoulders supported", "Elbows controlled", "Smooth press"], [
            "Dropping too deep",
            "Using an excessively narrow or uncomfortable grip",
            "Using swinging or bouncing momentum"
        ]);
    }
    return make(groupMuscles.Triceps, [
        overhead ? "Position the upper arms comfortably beside the head or over the shoulders." : "Set the cable or load so the elbows can stay near a stable position.",
        "Use a secure grip and stable stance or bench position.",
        "Choose a load that allows smooth elbow movement."
    ], [
        "Extend the elbows until the arms are nearly straight.",
        "Keep the upper arms controlled throughout the repetition.",
        "Return slowly into a comfortable stretch."
    ], ["Upper arms controlled", "Smooth extension", "Controlled return"], [
        "Moving mainly at the shoulders",
        "Flaring the elbows excessively",
        "Using momentum"
    ]);
}

function squatPattern(exercise) {
    const n = normalizedName(exercise);
    const split = /split squat|lunge|step up|single leg/.test(n);
    const machine = /leg press|hack squat|pendulum|belt squat|smith/.test(n) || exercise?.equipment === "Machine" || exercise?.equipment === "Smith Machine";
    const front = /front squat/.test(n);
    const goblet = /goblet|heel elevated/.test(n);
    const reverseNordic = /reverse nordic/.test(n);
    if (reverseNordic) {
        return make({ primary: ["Quads"], secondary: ["Deep Core"] }, [
            "Kneel on a padded surface with the knees and hips comfortably aligned.",
            "Keep the torso and thighs in one long line and brace lightly.",
            "Begin with a short range until you know how much quad tension you can control."
        ], [
            "Lean the whole body backward from the knees while keeping the hips extended.",
            "Stop before losing the straight torso-to-thigh line.",
            "Use the quads to pull the body back to upright."
        ], ["Hips extended", "Move as one unit", "Control the range"], [
            "Bending at the hips instead of leaning from the knees",
            "Dropping quickly into the bottom",
            "Forcing more range than the knees tolerate comfortably"
        ]);
    }
    return make(groupMuscles.Quads, [
        split ? "Set the working foot securely and use support if balance limits the movement." : machine ? "Adjust the machine or stance so the hips and knees can move comfortably." : front ? "Secure the bar across the front shoulders with a comfortable grip." : goblet ? "Hold the load close to the torso and choose a stable stance." : "Choose a stable stance with the feet planted.",
        "Align the knees with the direction of the feet.",
        "Brace before descending or lowering the platform."
    ], [
        split ? "Lower the body by bending the working hip and knee." : "Bend the knees and hips together while keeping pressure through the feet.",
        "Use the deepest range you can control comfortably.",
        split ? "Drive through the working foot to rise." : "Stand or press back up smoothly without bouncing."
    ], ["Whole foot planted", "Knees track with feet", "Control the bottom"], [
        "Rushing the descent",
        "Letting the heel lift or pressure shift excessively",
        "Using a range that changes the movement pattern"
    ]);
}

function legExtension() {
    return make({ primary: ["Quads"], secondary: [] }, [
        "Align the machine pivot with the knee joint.",
        "Set the shin pad comfortably above the ankles.",
        "Sit back and keep the hips supported."
    ], [
        "Extend the knees smoothly.",
        "Pause briefly without snapping aggressively into lockout.",
        "Lower under control to a comfortable knee bend."
    ], ["Smooth extension", "Quiet hips", "Slow lower"], [
        "Kicking the pad",
        "Lifting the hips",
        "Dropping the weight stack"
    ]);
}

function hinge(exercise) {
    const n = normalizedName(exercise);
    const single = /single leg/.test(n);
    const conventional = /conventional|trap bar/.test(n);
    return make(groupMuscles.Hamstrings, [
        single ? "Stand on one leg with a soft knee and use support if needed." : conventional ? "Set the load over the middle of the foot and take a secure grip." : "Set the feet securely with a soft bend in the knees.",
        "Brace and keep the load close to the body.",
        "Choose a range that allows a stable spine and hips."
    ], [
        conventional ? "Push through the floor while the hips and knees extend together." : "Send the hips back while the torso inclines forward.",
        "Keep the load close and move smoothly.",
        conventional ? "Stand tall, then return the load with control." : "Drive the hips forward to stand without leaning backward."
    ], ["Hips move back", "Load stays close", "Finish tall"], [
        "Letting the load drift forward",
        "Rounding to gain extra range",
        "Hyperextending at the top"
    ]);
}

function legCurl(exercise) {
    const n = normalizedName(exercise);
    const nordic = /nordic hamstring/.test(n);
    if (nordic) {
        return make({ primary: ["Hamstrings"], secondary: ["Glutes"] }, [
            "Secure the ankles under a stable pad or have a partner hold them firmly.",
            "Kneel on padding with the hips extended and torso aligned with the thighs.",
            "Use assistance or a shortened range if needed."
        ], [
            "Lower the body forward as one unit while resisting with the hamstrings.",
            "Use the hands only as much as needed to control the bottom.",
            "Pull or assist the body back to the starting position without snapping upward."
        ], ["Hips extended", "Resist the lower", "Use assistance as needed"], [
            "Bending sharply at the hips",
            "Dropping uncontrolled into the bottom",
            "Using a range that cannot be controlled"
        ]);
    }
    return make({ primary: ["Hamstrings"], secondary: [] }, [
        "Align the machine pivot with the knee joint.",
        "Adjust the pad comfortably above the ankles.",
        /seated/.test(n) ? "Secure the thigh pad and sit fully against the backrest." : "Keep the hips supported by the bench."
    ], [
        "Bend the knees to pull the pad through a comfortable range.",
        "Pause briefly as the hamstrings shorten.",
        "Return slowly without letting the stack drop."
    ], ["Hips stay down", "Smooth curl", "Slow return"], [
        "Lifting the hips or thighs",
        "Jerking the pad",
        "Dropping the weight stack"
    ]);
}

function gluteHamRaise() {
    return make({ primary: ["Hamstrings", "Glutes"], secondary: ["Spinal Erectors"] }, [
        "Adjust the footplate and thigh pad so the knees can bend freely while the ankles are secure.",
        "Begin with the torso and thighs in a controlled line.",
        "Use assistance or a limited range if full repetitions are not yet controlled."
    ], [
        "Lower the torso by extending the knees while keeping the hips mostly extended.",
        "Use the hamstrings to bend the knees and pull the body back up.",
        "Finish tall without hyperextending the lower back."
    ], ["Hips controlled", "Hamstrings pull", "Finish neutral"], [
        "Folding sharply at the hips",
        "Using momentum from the lower back",
        "Dropping too quickly into the bottom"
    ]);
}

function hipExtension(exercise) {
    const n = normalizedName(exercise);
    const kickback = /kickback/.test(n);
    const thrust = /hip thrust/.test(n);
    const bridge = /glute bridge/.test(n);
    return make(groupMuscles.Glutes, [
        kickback ? "Set the ankle attachment securely and hold a stable support." : thrust ? "Position the upper back securely against the bench or machine support and place the load comfortably over the hips." : bridge ? "Lie on the floor with the feet planted near the hips." : "Face away from a low cable with the rope passing comfortably between the legs.",
        "Set the feet or working leg securely and brace the ribs over the pelvis.",
        "Use padding or a range that remains comfortable."
    ], [
        kickback ? "Extend the working hip backward without rotating the pelvis." : thrust || bridge ? "Drive through the feet and extend the hips." : "Hinge back, then drive the hips forward against the cable.",
        "Finish with the glutes contracted without leaning or arching backward.",
        "Return under control."
    ], ["Glutes finish", "Ribs controlled", "Smooth return"], [
        "Overarching the lower back",
        "Rotating or shifting the pelvis",
        "Using momentum"
    ]);
}

function hipAbduction() {
    return make({ primary: ["Glutes"], secondary: [] }, [
        "Adjust the seat and pads so the hips and knees are comfortable.",
        "Sit securely with the pelvis supported against the seat.",
        "Choose a load that allows the legs to move without bouncing."
    ], [
        "Press the knees outward through a comfortable range.",
        "Pause briefly while keeping the torso and pelvis steady.",
        "Return slowly until the hips are comfortably adducted."
    ], ["Pelvis steady", "Press outward", "Slow return"], [
        "Using torso momentum",
        "Bouncing out of the stretched position",
        "Forcing a range that causes hip discomfort"
    ]);
}

function hipAdduction() {
    return make(groupMuscles.Adductors, [
        "Adjust the seat and pads so the hips and knees are comfortable.",
        "Begin with the legs apart only as far as you can control comfortably.",
        "Sit securely with the pelvis supported against the seat."
    ], [
        "Draw the legs inward by squeezing through the inner thighs.",
        "Pause briefly near the closed position without slamming the pads together.",
        "Return slowly into the stretch."
    ], ["Inner thighs squeeze", "Pelvis steady", "Slow stretch"], [
        "Using momentum from the torso",
        "Letting the stack slam",
        "Forcing an excessive starting stretch"
    ]);
}

function calfRaise(exercise) {
    const n = normalizedName(exercise);
    const seated = /seated/.test(n);
    const legPress = /leg press/.test(n);
    return make(groupMuscles.Calves, [
        legPress ? "Place the balls of the feet securely on the lower platform edge." : "Place the balls of the feet securely on the platform or floor.",
        seated ? "Adjust the thigh pad and keep the knees comfortably bent." : "Keep the knee position appropriate for the variation.",
        "Use support so balance does not limit the set."
    ], [
        "Lower the heels into a comfortable calf stretch.",
        "Press through the balls of the feet to rise as high as controlled.",
        "Pause briefly, then lower slowly."
    ], ["Full controlled range", "Pause at top", "Slow stretch"], [
        "Bouncing at the bottom",
        "Rolling onto the outside of the feet",
        "Using a shortened range"
    ]);
}

function tibialisRaise() {
    return make(groupMuscles.Tibialis, [
        "Stand with the back supported by a wall or machine and place the heels securely on the floor.",
        "Move the feet slightly forward so the toes can lift freely.",
        "Keep the knees softly bent and the heels planted."
    ], [
        "Lift the toes and forefoot toward the shins as high as controlled.",
        "Pause briefly at the top.",
        "Lower the forefoot slowly back toward the floor."
    ], ["Heels planted", "Toes up", "Slow lower"], [
        "Rocking the whole body to create momentum",
        "Letting the heels lift",
        "Dropping the toes quickly"
    ]);
}

function core(exercise) {
    const n = normalizedName(exercise);
    const plank = /plank/.test(n);
    const hanging = /hanging/.test(n);
    const machine = /machine crunch/.test(n);
    return make(groupMuscles.Core, [
        hanging ? "Take a secure grip and let the body settle before starting." : machine ? "Adjust the seat and pad so the trunk can flex comfortably." : plank ? "Set the support points securely and align the ribs and pelvis." : "Choose a stable starting position that lets the trunk stay controlled.",
        "Brace gently before beginning the repetition or hold.",
        "Use a range that does not force the lower back out of position."
    ], [
        plank ? "Hold the planned position while breathing normally and keeping the trunk steady." : hanging ? "Raise the legs or knees without swinging and gently curl the pelvis as appropriate." : "Move slowly while keeping the ribcage and pelvis controlled.",
        "Use only the range you can own without momentum or compensation.",
        plank ? "End the hold when the body position changes substantially." : "Return to the start under control."
    ], ["Brace and breathe", "Control the pelvis", "Own the range"], [
        "Using momentum",
        "Holding the breath unnecessarily",
        "Continuing after trunk position changes substantially"
    ]);
}

function copenhagenPlank() {
    return make({ primary: ["Adductors"], secondary: ["Obliques", "Deep Core"] }, [
        "Place the top leg securely on a bench with the elbow beneath the shoulder.",
        "Use a bent-knee version first if the straight-leg position is too demanding.",
        "Align the head, ribs, pelvis and legs before lifting."
    ], [
        "Lift the hips and use the top inner thigh to support the body.",
        "Keep the pelvis from rotating forward or backward.",
        "Lower with control when the target time is complete."
    ], ["Top leg drives", "Hips tall", "Stay square"], [
        "Letting the hips sag",
        "Rotating the pelvis",
        "Using a setup that causes groin or shoulder discomfort"
    ]);
}

function forearm(exercise) {
    const n = normalizedName(exercise);
    const reverse = /reverse wrist/.test(n);
    const roller = /wrist roller/.test(n);
    if (roller) {
        return make(groupMuscles.Forearms, [
            "Stand tall and hold the roller around chest or shoulder height with the arms supported as needed.",
            "Attach the load securely and begin with the rope hanging straight.",
            "Use a light enough load to keep the wrists doing the work."
        ], [
            "Alternate the hands to roll the weight upward using controlled wrist motion.",
            "Keep the elbows and shoulders as still as practical.",
            "Reverse the motion and lower the weight under control."
        ], ["Wrists work", "Arms steady", "Control both directions"], [
            "Using large shoulder movements",
            "Letting the weight free-fall on the way down",
            "Using a load too heavy for full wrist control"
        ]);
    }
    return make(groupMuscles.Forearms, [
        "Support the forearms securely on the thighs or a bench.",
        reverse ? "Hold the dumbbells with the palms facing down." : "Hold the dumbbells with the palms facing up.",
        "Let the wrists move freely beyond the support edge."
    ], [
        reverse ? "Extend the wrists to raise the backs of the hands." : "Flex the wrists to curl the palms upward.",
        "Pause briefly at the top without moving the elbows.",
        "Lower slowly through a comfortable wrist range."
    ], ["Forearms supported", "Wrists only", "Slow lower"], [
        "Moving the elbows or shoulders",
        "Using momentum",
        "Dropping quickly into the bottom range"
    ]);
}

function cardio(exercise) {
    const n = normalizedName(exercise);
    if (/indoor rower/.test(n)) {
        return make({ primary: ["Upper Back", "Quads"], secondary: ["Glutes", "Hamstrings", "Lats"] }, [
            "Secure the feet and set the monitor or resistance appropriately.",
            "Sit tall with the handle held evenly.",
            "Begin with the shins near vertical and the arms long."
        ], [
            "Drive with the legs before opening the hips and drawing the handle toward the lower ribs.",
            "Reverse the order on the recovery: arms, torso, then knees.",
            "Keep the stroke smooth and repeatable."
        ], ["Legs first", "Handle to lower ribs", "Smooth recovery"], ["Pulling early with the arms", "Rounding excessively", "Rushing the recovery"]);
    }
    if (/ski erg/.test(n)) {
        return make({ primary: ["Lats", "Rectus Abdominis"], secondary: ["Triceps"] }, [
            "Stand facing the machine with a stable stance.",
            "Reach for both handles with the arms long.",
            "Begin tall with light tension in the cords."
        ], [
            "Drive the handles down while hinging slightly and bending the knees.",
            "Finish with the hands near the thighs.",
            "Return smoothly to the tall position."
        ], ["Drive down", "Hands to thighs", "Smooth return"], ["Pulling only with the arms", "Rounding sharply", "Letting the cords snap upward"]);
    }
    if (/stationary bike/.test(n)) {
        return make({ primary: ["Quads"], secondary: ["Glutes", "Hamstrings", "Calves"] }, [
            "Adjust the seat so the knee remains slightly bent at the bottom of the pedal stroke.",
            "Place the feet securely on the pedals.",
            "Choose manageable resistance before starting."
        ], [
            "Pedal with a smooth, even cadence.",
            "Keep the hips steady on the seat.",
            "Adjust resistance or pace gradually."
        ], ["Smooth cadence", "Hips steady", "Relaxed shoulders"], ["Setting the seat too low", "Bouncing at high cadence", "Adding resistance that changes the pedal stroke"]);
    }
    if (/assault bike/.test(n)) {
        return make({ primary: ["Quads", "Glutes"], secondary: ["Upper Back", "Triceps", "Hamstrings"] }, [
            "Adjust the seat so the legs can pedal smoothly without the hips rocking.",
            "Place the feet securely on the pedals and take a relaxed grip on the handles.",
            "Begin at an easy pace before increasing effort."
        ], [
            "Push and pull the handles in rhythm with a smooth pedal stroke.",
            "Keep the torso controlled while the arms and legs share the work.",
            "Increase pace or resistance gradually rather than sprinting immediately."
        ], ["Arms + legs together", "Smooth cadence", "Build gradually"], ["Rocking the hips", "Tensing the shoulders excessively", "Starting too hard to maintain form"]);
    }
    if (/incline treadmill walk/.test(n)) {
        return make({ primary: ["Glutes", "Calves"], secondary: ["Quads", "Hamstrings"] }, [
            "Start the treadmill at a comfortable speed before increasing the incline.",
            "Stand tall enough that you do not need to hang from the handrails.",
            "Use footwear and an incline you can control comfortably."
        ], [
            "Walk with a natural stride and steady cadence.",
            "Keep the torso controlled rather than leaning heavily onto the rails.",
            "Adjust speed or incline gradually to change effort."
        ], ["Natural stride", "Light hands", "Steady cadence"], ["Holding bodyweight on the rails", "Using an incline that shortens the stride excessively", "Increasing speed too quickly"]);
    }
    if (/elliptical/.test(n)) {
        return make({ primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Calves"] }, [
            "Step onto the pedals securely and take a relaxed grip on the handles.",
            "Begin with low resistance until the movement feels smooth.",
            "Keep the feet flat and centered on the pedals."
        ], [
            "Move the pedals through a smooth continuous path.",
            "Keep the torso tall and the hips centered.",
            "Increase resistance or pace gradually."
        ], ["Smooth stride", "Hips centered", "Relaxed grip"], ["Bouncing through the stride", "Leaning heavily on the handles", "Using resistance that makes the movement jerky"]);
    }
    if (/stair climber/.test(n)) {
        return make({ primary: ["Quads", "Glutes"], secondary: ["Calves", "Hamstrings"] }, [
            "Step onto the machine securely and begin at a low speed.",
            "Use the rails lightly for balance rather than bodyweight support.",
            "Stand tall with the feet placed securely on each step."
        ], [
            "Step with a steady rhythm and control each foot placement.",
            "Keep the hips under the torso instead of hanging backward from the rails.",
            "Increase speed gradually while preserving the same posture."
        ], ["Light hands", "Full foot placement", "Steady rhythm"], ["Supporting bodyweight on the rails", "Taking steps too quickly to control", "Allowing the knees to collapse inward"]);
    }
    if (/swimming/.test(n)) {
        return make({ primary: ["Lats", "Upper Back"], secondary: ["Shoulders", "Triceps", "Core"] }, [
            "Choose a stroke and pace appropriate for your swimming ability.",
            "Begin with easy lengths to establish breathing and rhythm.",
            "Use a pool environment and lane setup that are safe for the planned session."
        ], [
            "Keep the stroke smooth and coordinate breathing with the chosen technique.",
            "Maintain a pace that preserves body position and comfortable shoulder movement.",
            "Reduce pace or rest when technique deteriorates."
        ], ["Smooth rhythm", "Controlled breathing", "Relaxed shoulders"], ["Starting too fast", "Holding the breath too long", "Continuing after technique breaks down substantially"]);
    }
    if (/running/.test(n)) {
        return make({ primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Calves"] }, [
            "Begin with an easy walk or jog.",
            "Choose a clear, appropriate surface and supportive footwear.",
            "Build pace gradually."
        ], [
            "Use a relaxed stride that lands near the body.",
            "Keep the arms moving naturally and the shoulders relaxed.",
            "Reduce pace if form or comfort changes."
        ], ["Relaxed stride", "Quiet shoulders", "Build gradually"], ["Starting too fast", "Overstriding", "Continuing through sharp or worsening pain"]);
    }
    return make({ primary: ["Quads"], secondary: ["Glutes", "Hamstrings", "Calves"] }, [
        "Begin at an easy effort and adjust the machine or position before increasing intensity.",
        "Choose a resistance or pace that allows smooth, repeatable movement.",
        "Use stable contact points and appropriate footwear or equipment."
    ], [
        "Build pace or resistance gradually.",
        "Keep the movement smooth and posture controlled.",
        "Reduce effort if rhythm, posture or joint comfort begins to deteriorate."
    ], ["Smooth rhythm", "Controlled posture", "Build gradually"], ["Starting too hard", "Using excessive resistance", "Continuing after movement quality deteriorates"]);
}

function genericGroupGuide(exercise) {
    const group = String(exercise?.muscleGroup || "");
    const muscles = groupMuscles[group] || { primary: [group || "Target muscles"], secondary: [] };
    return make(muscles, [
        "Set the equipment and body position so the movement can begin from a stable, comfortable position.",
        "Choose a load or difficulty that allows the planned range to stay controlled.",
        "Brace and establish the intended joint positions before the first repetition."
    ], [
        "Move through the intended range smoothly without using unnecessary momentum.",
        "Keep the target joints and muscles doing the work while the rest of the body stays stable.",
        "Return to the starting position under control and reset before the next repetition."
    ], ["Stable setup", "Controlled range", "Repeatable reps"], [
        "Using momentum to compensate for excessive difficulty",
        "Changing body position substantially between repetitions",
        "Forcing a painful or uncontrolled range"
    ]);
}

export function createGeneratedExerciseGuide(exercise) {
    if (!exercise) return null;
    const id = String(exercise.id || "");
    const n = normalizedName(exercise);
    const group = String(exercise.muscleGroup || "");

    // Cardio first so machine names are not mistaken for strength patterns.
    if (group === "Cardio" || exercise.trackingType === "notes") return cardio(exercise);

    // Previously missing guide families.
    if (/shrug/.test(n) || group === "Traps") return shrug(exercise);
    if (/hip abduction/.test(n)) return hipAbduction();
    if (/hip adduction/.test(n)) return hipAdduction();
    if (/tibialis/.test(n) || group === "Tibialis") return tibialisRaise();
    if (/wrist/.test(n) || group === "Forearms") return forearm(exercise);
    if (/glute ham raise/.test(n)) return gluteHamRaise();
    if (/y raise/.test(n)) return yRaise(exercise);
    if (/dumbbell pullover/.test(n)) return dumbbellPullover();

    // Canonical pattern families for the full stock library and expansion catalogue.
    if (/back extension/.test(n)) return backExtension();
    if (/copenhagen plank/.test(n)) return copenhagenPlank();
    if (/leg extension/.test(n)) return legExtension();
    if (/nordic hamstring|leg curl/.test(n)) return legCurl(exercise);
    if (/calf raise/.test(n) || group === "Calves") return calfRaise(exercise);
    if (/hip thrust|glute bridge|pull through|glute kickback/.test(n)) return hipExtension(exercise);
    if (/deadlift|romanian|good morning|\brdl\b/.test(n)) return hinge(exercise);
    if (/reverse nordic|squat|leg press|lunge|split squat|step up|stepup/.test(n)) return squatPattern(exercise);
    if (/skull crusher|tricep|triceps|pushdown|push down|overhead.*extension|\bdip\b|close grip/.test(n) || group === "Triceps") return triceps(exercise);
    if (/curl/.test(n) && !/leg curl|hamstring curl/.test(n)) return curl(exercise);
    if (/upright row/.test(n)) return uprightRow();
    if (/rear delt|reverse pec|reverse fly|face pull/.test(n) || group === "Rear Delts") return rearDelt(exercise);
    if (/y raise/.test(n)) return yRaise(exercise);
    if (/lateral raise/.test(n)) return lateralRaise(exercise);
    if (/shoulder press|overhead press|arnold press|pike push/.test(n)) return shoulderPress(exercise);
    if (/straight arm pulldown|lat pullover/.test(n)) return latIsolation(exercise);
    if (/pullover/.test(n)) return dumbbellPullover();
    if (/row/.test(n)) return row(exercise);
    if (/pulldown|pull down|pull up|pullup|chin up|chinup/.test(n)) return verticalPull(exercise);
    if (/fly|flye|pec deck|crossover/.test(n) && !/reverse/.test(n)) return chestFly(exercise);
    if (/bench press|chest press|push up|pushup/.test(n)) return horizontalPress(exercise);
    if (/plank|dead bug|bird dog|crunch|pallof|knee raise|leg raise|ab wheel|rollout/.test(n) || group === "Core") return core(exercise);

    // Muscle-group fallbacks ensure every built-in and expanded stock exercise has a usable guide.
    if (group === "Chest") return /fly|flye/.test(n) ? chestFly(exercise) : horizontalPress(exercise);
    if (group === "Back") return /row/.test(n) ? row(exercise) : verticalPull(exercise);
    if (group === "Shoulders") return /lateral/.test(n) ? lateralRaise(exercise) : shoulderPress(exercise);
    if (group === "Biceps") return curl(exercise);
    if (group === "Quads") return squatPattern(exercise);
    if (group === "Hamstrings") return /curl/.test(n) ? legCurl(exercise) : hinge(exercise);
    if (group === "Glutes") return hipExtension(exercise);
    if (group === "Adductors") return /copenhagen/.test(n) ? copenhagenPlank() : hipAdduction();

    return genericGroupGuide(exercise);
}
