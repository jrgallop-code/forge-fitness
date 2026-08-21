const FAMILY_DETAILS = {
    horizontalPress: {
        setup: "Before the first rep, stabilize the shoulder blades and make sure the wrists, elbows and load are lined up in a position you can repeat.",
        execution: [
            "Keep the same foot, upper-back and trunk pressure as the load moves through the hardest part of the range.",
            "Finish the press in control, briefly stabilize at the top, then reset before the next repetition."
        ],
        mistake: "Changing your body position or bar/handle path from rep to rep as fatigue builds"
    },
    chestFly: {
        setup: "Set the shoulders comfortably back and down and choose a starting stretch you can control without the shoulders rolling forward.",
        execution: [
            "Keep the elbow angle nearly fixed so the movement comes mainly from the shoulder rather than becoming a press.",
            "Reverse the same wide arc slowly and stop the stretch before the shoulder position changes."
        ],
        mistake: "Changing the elbow bend substantially during the repetition"
    },
    verticalPull: {
        setup: "Before pulling, let the arms become long, settle any swinging, and establish a stable ribcage and pelvis position.",
        execution: [
            "Keep the torso angle mostly unchanged while the elbows continue down and the upper arms move toward the sides.",
            "At the bottom of the return, let the arms lengthen fully under control, remove any momentum, and reset before pulling again."
        ],
        mistake: "Beginning the next repetition while the body or cable is still swinging"
    },
    row: {
        setup: "Set the neck, ribs and pelvis so the torso position can remain almost unchanged for the entire set.",
        execution: [
            "Allow the shoulder blade to move naturally around the ribcage as the elbow travels back instead of forcing it to stay pinned.",
            "Reach a controlled long-arm position on the return, re-brace the torso, and begin the next pull from the same position."
        ],
        mistake: "Changing torso angle substantially between repetitions"
    },
    latIsolation: {
        setup: "Use a light enough load that the elbow angle can stay nearly fixed and the torso does not need to rock to move the handle.",
        execution: [
            "Think about moving the upper arms down toward the sides while keeping the ribs stacked over the pelvis.",
            "Let the arms travel back overhead slowly until the lats are comfortably lengthened, then reset without bouncing."
        ],
        mistake: "Bending and straightening the elbows enough to turn the movement into a triceps exercise"
    },
    backExtension: {
        setup: "Position the pad below the hip crease so the hips can hinge freely rather than forcing movement through the lower back.",
        execution: [
            "Keep the movement centered at the hips as the torso lowers instead of chasing extra depth by rounding.",
            "Finish with the torso in line with the legs, pause briefly, and avoid leaning backward past neutral."
        ],
        mistake: "Using lower-back hyperextension to create extra height at the top"
    },
    shoulderPress: {
        setup: "Brace the abdomen and control the ribs before pressing so the lower back does not become the source of extra range.",
        execution: [
            "Keep the forearms stacked beneath the hands as the load passes the face and travels overhead.",
            "Lower through the same comfortable path, settle at shoulder height, and re-brace before the next repetition."
        ],
        mistake: "Leaning farther back as the set becomes difficult"
    },
    lateralRaise: {
        setup: "Set the shoulders away from the ears and choose a load that lets the torso stay quiet from the very first repetition.",
        execution: [
            "Lead with the elbows while the hands follow naturally, rather than lifting the hands first and internally rotating the shoulders.",
            "Pause near your comfortable top position, then resist the load all the way back to the start."
        ],
        mistake: "Leading with the hands while the elbows stay low"
    },
    rearDelt: {
        setup: "Set the torso or machine support so the arms can move freely without needing to shrug or pull the shoulders toward the ears.",
        execution: [
            "Keep the elbows moving in a wide path so the rear shoulders remain the focus instead of turning the movement into a heavy row.",
            "Control the return until the rear delts are lengthened, then reset the shoulder position before repeating."
        ],
        mistake: "Pulling the elbows too close to the ribs and turning the exercise into a row"
    },
    uprightRow: {
        setup: "Choose a grip width and planned top position that feel comfortable before adding meaningful load.",
        execution: [
            "Keep the handle close while the elbows lead upward and slightly outward.",
            "Stop at the highest comfortable position, then lower slowly without letting the torso create momentum."
        ],
        mistake: "Forcing the elbows higher after the shoulders or wrists stop moving comfortably"
    },
    curl: {
        setup: "Set the shoulders and upper arms before the first rep so elbow movement—not torso movement—drives the exercise.",
        execution: [
            "Keep the wrist position controlled while the forearm approaches the upper arm and the biceps shorten.",
            "Lower until the elbow is comfortably extended, let the biceps lengthen under control, and reset the upper arm before repeating."
        ],
        mistake: "Letting the shoulders roll forward to create extra range at the top"
    },
    triceps: {
        setup: "Choose a position where the upper arms can stay controlled and the elbows can bend through a comfortable range without shoulder strain.",
        execution: [
            "Extend through the elbows while keeping the upper arms as still as practical for the variation.",
            "Return slowly into the same comfortable elbow-bent position and re-establish the upper-arm position before the next rep."
        ],
        mistake: "Moving the upper arms substantially to compensate for a load that is too heavy"
    },
    squat: {
        setup: "Before descending, establish even pressure across the whole foot and brace the trunk so your stance and balance are repeatable.",
        execution: [
            "Let the knees track in the same direction as the toes while the hips and knees continue bending together.",
            "Drive through the working foot or platform, finish balanced, and reset your breath and brace before the next repetition."
        ],
        mistake: "Losing whole-foot pressure and shifting onto the toes or inside edge of the foot"
    },
    legExtension: {
        setup: "Check that the knee joint is aligned closely with the machine pivot and that the pad sits above the ankle rather than on the foot.",
        execution: [
            "Keep the hips and thighs supported while the knees move through the middle of the repetition.",
            "Pause briefly near full extension, then lower slowly to the same comfortable starting bend."
        ],
        mistake: "Snapping aggressively into knee lockout instead of finishing under muscular control"
    },
    hinge: {
        setup: "Before moving, brace the trunk, set a soft knee bend where appropriate, and keep the load close to the body.",
        execution: [
            "Continue sending the hips backward until you reach the deepest position you can control without needing extra spinal movement.",
            "Drive the hips forward to stand tall, finish without leaning backward, and reset the brace before repeating."
        ],
        mistake: "Continuing lower after the hips stop moving by rounding the spine for extra range"
    },
    legCurl: {
        setup: "Make sure the machine pivot is close to the knee joint and the hips or thighs are firmly supported before curling.",
        execution: [
            "Keep the hips quiet as the knees continue bending and the hamstrings shorten.",
            "Pause briefly at the shortened position, then return slowly to the same comfortable stretch without letting the stack crash."
        ],
        mistake: "Lifting the hips or thighs away from the support to finish the curl"
    },
    hipExtension: {
        setup: "Set the feet securely and brace the ribs over the pelvis so the glutes—not lower-back extension—finish the movement.",
        execution: [
            "Continue extending the hips until the torso and thighs align and the glutes are strongly contracted.",
            "Hold that finish briefly without arching, then lower or hinge back under control before repeating."
        ],
        mistake: "Arching the lower back to create extra hip height at the top"
    },
    calfRaise: {
        setup: "Center pressure through the forefoot and use enough support that balance does not limit the calf movement.",
        execution: [
            "Pause briefly in the stretched bottom position rather than bouncing immediately upward.",
            "Rise as high as you can while keeping the ankle aligned, pause at the top, and lower slowly through the same path."
        ],
        mistake: "Bouncing through the bottom instead of controlling the stretched position"
    },
    core: {
        setup: "Set the ribs and pelvis before moving so you can tell when the trunk position begins to change during the set.",
        execution: [
            "Move only through the range you can control while maintaining steady abdominal tension and normal breathing.",
            "Return to the starting position slowly, re-establish the brace, and repeat without using momentum."
        ],
        mistake: "Continuing the set after trunk position changes enough that the target movement is no longer being controlled"
    },
    cardio: {
        setup: "Begin at an easy effort long enough to establish a comfortable rhythm and make any machine or position adjustments before increasing intensity.",
        execution: [
            "Build pace or resistance gradually while keeping the movement smooth and repeatable.",
            "Reduce the effort if posture, rhythm or joint comfort begins to deteriorate rather than forcing the planned pace."
        ],
        mistake: "Increasing pace or resistance faster than you can maintain the intended movement pattern"
    }
};

function classifyGuide(title) {
    const name = String(title || "").toLowerCase();
    if (/indoor rower|ski erg|stationary bike|running/.test(name)) return "cardio";
    if (/plank|dead bug|bird dog|cable crunch|pallof|knee raise|ab wheel/.test(name)) return "core";
    if (/leg extension/.test(name)) return "legExtension";
    if (/leg curl/.test(name)) return "legCurl";
    if (/calf raise/.test(name)) return "calfRaise";
    if (/hip thrust|glute bridge|pull-through/.test(name)) return "hipExtension";
    if (/deadlift|romanian|good morning/.test(name)) return "hinge";
    if (/squat|leg press|lunge|step-up/.test(name)) return "squat";
    if (/triceps|tricep|skull crusher|close-grip bench|overhead cable extension|dumbbell overhead extension|bodyweight dip|assisted.*dip/.test(name)) return "triceps";
    if (/curl/.test(name)) return "curl";
    if (/upright row/.test(name)) return "uprightRow";
    if (/reverse pec deck|face pull|rear-delt|rear delt/.test(name)) return "rearDelt";
    if (/lateral raise/.test(name)) return "lateralRaise";
    if (/overhead press|shoulder press|pike push-up/.test(name)) return "shoulderPress";
    if (/back extension/.test(name)) return "backExtension";
    if (/straight-arm pulldown|lat pullover/.test(name)) return "latIsolation";
    if (/row/.test(name)) return "row";
    if (/pull-up|weighted pull-up|chin-up|pulldown/.test(name)) return "verticalPull";
    if (/cable fly|pec deck/.test(name)) return "chestFly";
    if (/bench press|chest press|push-up/.test(name)) return "horizontalPress";
    return null;
}

function textItems(list) {
    return [...(list?.querySelectorAll?.(":scope > li") || [])].map(item => item.textContent.trim()).filter(Boolean);
}

function renderItems(list, items) {
    if (!list) return;
    list.innerHTML = items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
}

function insertDetailedSteps(original, detail) {
    const clean = original.filter(Boolean);
    if (clean.length >= 5) return clean;
    if (clean.length >= 3) return [clean[0], detail[0], clean[1], detail[1], ...clean.slice(2)];
    return [...clean, ...detail].slice(0, 5);
}

function upgradeGuide(screen) {
    if (!(screen instanceof Element) || screen.dataset.comprehensiveSteps === "1") return;
    const title = screen.querySelector(".exercise-guide-header h2")?.textContent?.trim();
    const family = classifyGuide(title);
    const detail = family ? FAMILY_DETAILS[family] : null;
    if (!detail) return;

    const sections = [...screen.querySelectorAll(".exercise-guide-section")];
    const setupSection = sections.find(section => section.querySelector("h3")?.textContent?.trim() === "Setup");
    const executionSection = sections.find(section => section.querySelector("h3")?.textContent?.trim() === "How to Perform It");
    const mistakesSection = sections.find(section => section.querySelector("h3")?.textContent?.trim() === "Common Mistakes");

    const setupList = setupSection?.querySelector("ol");
    const setup = textItems(setupList);
    if (setupList && setup.length < 4) {
        const expandedSetup = setup.length >= 2
            ? [setup[0], setup[1], detail.setup, ...setup.slice(2)]
            : [...setup, detail.setup];
        renderItems(setupList, expandedSetup);
    }

    const executionList = executionSection?.querySelector("ol");
    const execution = textItems(executionList);
    if (executionList) renderItems(executionList, insertDetailedSteps(execution, detail.execution));

    if (executionSection && !executionSection.querySelector(".exercise-guide-step-note")) {
        const note = document.createElement("p");
        note.className = "exercise-guide-step-note";
        note.textContent = "Follow the steps in order and use a range of motion you can control consistently.";
        executionSection.querySelector("h3")?.insertAdjacentElement("afterend", note);
    }

    const mistakesList = mistakesSection?.querySelector("ul");
    const mistakes = textItems(mistakesList);
    if (mistakesList && !mistakes.includes(detail.mistake)) renderItems(mistakesList, [...mistakes, detail.mistake]);

    screen.dataset.comprehensiveSteps = "1";
}

function ensureStyles() {
    if (document.getElementById("exercise-guide-comprehensive-styles")) return;
    const style = document.createElement("style");
    style.id = "exercise-guide-comprehensive-styles";
    style.textContent = `
        .exercise-guide-step-note{margin:0 0 12px;color:#929297;font-size:12px;line-height:1.5}
        .exercise-guide-section ol li{padding-left:3px;margin-bottom:9px;line-height:1.55}
        .exercise-guide-section ol li:last-child{margin-bottom:0}
    `;
    document.head.appendChild(style);
}

function process(root) {
    if (!(root instanceof Element) && root !== document) return;
    if (root instanceof Element && root.matches(".exercise-guide-screen")) upgradeGuide(root);
    root.querySelectorAll?.(".exercise-guide-screen").forEach(upgradeGuide);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

ensureStyles();
process(document);
new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (node instanceof Element) process(node);
}))).observe(document.documentElement, { childList: true, subtree: true });
