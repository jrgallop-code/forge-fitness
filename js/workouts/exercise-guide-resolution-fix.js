const MUSCLE_IMAGE_PATHS = {
    "Chest": "assets/exercise-guides/chest.webp?v=1",
    "Triceps": "assets/exercise-guides/triceps.webp?v=1",
    "Front Delts": "assets/exercise-guides/front-delts.webp?v=1",
    "Side Delts": "assets/exercise-guides/side-delts.webp?v=1",
    "Rear Delts": "assets/exercise-guides/rear-delts.webp?v=1",
    "Lats": "assets/exercise-guides/lats.webp?v=1",
    "Upper Back": "assets/exercise-guides/upper-back.webp?v=1",
    "Biceps": "assets/exercise-guides/biceps.webp?v=1",
    "Forearms": "assets/exercise-guides/forearms.webp?v=1",
    "Quads": "assets/exercise-guides/quads.webp?v=1",
    "Glutes": "assets/exercise-guides/glutes.webp?v=1",
    "Adductors": "assets/exercise-guides/adductors.webp?v=1",
    "Hamstrings": "assets/exercise-guides/hamstrings.webp?v=1",
    "Spinal Erectors": "assets/exercise-guides/spinal-erectors.webp?v=1",
    "Calves": "assets/exercise-guides/calves.webp?v=1",
    "Rectus Abdominis": "assets/exercise-guides/rectus-abdominis.webp?v=1",
    "Obliques": "assets/exercise-guides/obliques.webp?v=1",
    "Deep Core": "assets/exercise-guides/deep-core.webp?v=1"
};

const CHEST_GUIDE_TITLES = new Set([
    "Barbell Bench Press",
    "Dumbbell Bench Press",
    "Incline Barbell Press",
    "Incline Dumbbell Press",
    "Machine Chest Press",
    "Cable Fly",
    "Pec Deck",
    "Push-Up"
]);

function normalizeName(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\bform guide\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function guide(name, primary, secondary, setup, execution, cues, mistakes) {
    return { name, primary, secondary, setup, execution, cues, mistakes };
}

function rowGuide(name) {
    return guide(name, ["Upper Back", "Lats"], ["Rear Delts", "Biceps"], [
        "Set the seat, support or stance so the torso can stay stable through the full set.",
        "Begin with the arms long and shoulders controlled rather than shrugged.",
        "Choose a load that does not require body momentum to start the pull."
    ], [
        "Pull the elbows back toward the ribs while keeping the torso controlled.",
        "Let the shoulder blades move naturally as the handles or load approach the body.",
        "Return slowly until the arms are long and the upper back is comfortably lengthened."
    ], ["Stable torso", "Elbows back", "Control the reach"], [
        "Using torso momentum to move the load",
        "Shrugging the shoulders toward the ears",
        "Shortening the controlled return"
    ]);
}

function pulldownGuide(name) {
    return guide(name, ["Lats"], ["Biceps", "Upper Back", "Forearms"], [
        "Secure the lower body and take a comfortable grip on the bar or handles.",
        "Sit tall beneath the cable with the arms long.",
        "Begin with the shoulders controlled rather than shrugged."
    ], [
        "Drive the elbows down toward the sides while bringing the bar or handles toward the upper torso.",
        "Keep the torso mostly still instead of leaning farther back to finish the repetition.",
        "Return slowly until the arms are long and the lats are comfortably stretched."
    ], ["Elbows down", "Chest tall", "Slow return"], [
        "Turning the repetition into a large torso lean",
        "Pulling mainly with the hands instead of the elbows",
        "Letting the cable snap upward"
    ]);
}

function chestPressGuide(name) {
    return guide(name, ["Chest"], ["Triceps", "Front Delts"], [
        "Set the bench, seat or hand position so the load lines up comfortably with the chest.",
        "Plant the feet or hands securely and keep the upper back or trunk stable.",
        "Keep the wrists stacked over the forearms."
    ], [
        "Lower the load or body with control through a comfortable range.",
        "Keep the elbows moving through a repeatable path.",
        "Press smoothly back to the start without bouncing or losing position."
    ], ["Stable base", "Wrists stacked", "Controlled lower"], [
        "Flaring the elbows beyond a comfortable path",
        "Losing upper-back or trunk position",
        "Rushing the bottom of the repetition"
    ]);
}

function chestFlyGuide(name) {
    return guide(name, ["Chest"], ["Front Delts"], [
        "Set the seat, bench or cables so the arms can move through a comfortable chest-height arc.",
        "Keep a soft, fixed bend in the elbows.",
        "Use a range that keeps the shoulders comfortable."
    ], [
        "Bring the upper arms toward one another in a wide arc.",
        "Pause briefly as the chest shortens.",
        "Return slowly without letting the shoulders roll forward."
    ], ["Soft elbows", "Wide arc", "Controlled stretch"], [
        "Turning the movement into a press",
        "Forcing an excessive stretch",
        "Using momentum"
    ]);
}

function shoulderPressGuide(name) {
    return guide(name, ["Front Delts", "Side Delts"], ["Triceps"], [
        "Set the load or body position at about shoulder height with a stable base.",
        "Use a comfortable grip and keep the forearms near vertical.",
        "Brace the trunk before pressing."
    ], [
        "Press upward through a comfortable path.",
        "Keep the trunk steady rather than leaning farther back.",
        "Lower under control to the starting position."
    ], ["Stable trunk", "Forearms stacked", "Controlled lower"], [
        "Overarching the lower back",
        "Flaring the elbows excessively",
        "Using a range that causes shoulder discomfort"
    ]);
}

function lateralRaiseGuide(name) {
    return guide(name, ["Side Delts"], ["Front Delts"], [
        "Stand or sit tall with a soft bend in the elbows.",
        "Let the arms begin comfortably by the sides or slightly in front.",
        "Use a load that allows a quiet torso."
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

function rearDeltGuide(name) {
    return guide(name, ["Rear Delts"], ["Upper Back"], [
        "Set the machine, cables or torso position so the arms can move freely at shoulder level.",
        "Keep a soft bend in the elbows.",
        "Begin with the shoulders relaxed away from the ears."
    ], [
        "Move the upper arms outward and back in a wide arc.",
        "Keep the torso still and avoid shrugging.",
        "Return slowly to the start."
    ], ["Wide elbows", "Shoulders down", "Control the return"], [
        "Shrugging",
        "Using excessive load",
        "Turning the movement into a heavy row"
    ]);
}

function curlGuide(name) {
    return guide(name, ["Biceps"], ["Forearms"], [
        "Stand or sit in a stable position with the elbows near the sides.",
        "Use the grip required by the variation and keep the wrists controlled.",
        "Choose a load that lets the upper arms stay mostly still."
    ], [
        "Bend the elbows to raise the load.",
        "Keep the upper arms controlled as the biceps shorten.",
        "Lower slowly until the elbows are comfortably extended."
    ], ["Elbows quiet", "Full control", "Slow lower"], [
        "Swinging the torso",
        "Letting the elbows drift excessively",
        "Dropping the load on the return"
    ]);
}

function tricepsGuide(name) {
    const compound = /\bdip\b|close grip.*bench/.test(normalizeName(name));
    return guide(name, ["Triceps"], compound ? ["Chest", "Front Delts"] : [], [
        compound ? "Set the hands or grip securely and keep the shoulders supported." : "Set the cable, dumbbell or bar so the elbows can move through a comfortable range.",
        "Keep the upper arms controlled and use a stable stance or bench position.",
        "Choose a load that allows smooth elbow movement."
    ], [
        compound ? "Lower under control by bending the elbows through a comfortable range." : "Extend the elbows until the arms are nearly straight.",
        "Keep the upper arms controlled throughout the repetition.",
        compound ? "Press smoothly back to the start." : "Return slowly into a comfortable stretch."
    ], ["Upper arms controlled", "Smooth extension", "Controlled return"], [
        "Using momentum",
        "Flaring the elbows excessively",
        "Forcing a painful range"
    ]);
}

function squatGuide(name) {
    return guide(name, ["Quads"], ["Glutes", "Adductors"], [
        "Choose a stable stance or machine position with the feet planted securely.",
        "Align the knees with the direction of the feet.",
        "Brace before descending or lowering the platform."
    ], [
        "Bend the knees and hips together while keeping pressure through the feet.",
        "Use the deepest range you can control comfortably.",
        "Stand or press back up smoothly without bouncing."
    ], ["Whole foot planted", "Knees track with feet", "Control the bottom"], [
        "Rushing the descent",
        "Letting the heels lift",
        "Using a range that changes the movement pattern"
    ]);
}

function legExtensionGuide(name) {
    return guide(name, ["Quads"], [], [
        "Adjust the machine so the knee joint lines up with the machine pivot.",
        "Set the shin pad comfortably above the ankles.",
        "Sit back and keep the hips supported."
    ], [
        "Extend the knees smoothly.",
        "Pause briefly without snapping into lockout.",
        "Lower under control to a comfortable knee bend."
    ], ["Smooth extension", "Quiet hips", "Slow lower"], [
        "Kicking the pad",
        "Lifting the hips",
        "Dropping the weight stack"
    ]);
}

function hingeGuide(name) {
    return guide(name, ["Hamstrings", "Glutes"], ["Spinal Erectors", "Forearms"], [
        "Set the feet securely and keep the load close to the body.",
        "Brace before moving and use a soft bend in the knees where appropriate.",
        "Choose a range that allows a stable spine and hips."
    ], [
        "Send the hips back while the torso inclines forward, or push through the floor for a deadlift from the bottom.",
        "Keep the load close and move smoothly.",
        "Extend the hips to finish tall without leaning backward."
    ], ["Hips move back", "Load stays close", "Finish tall"], [
        "Letting the load drift forward",
        "Rounding to gain extra range",
        "Hyperextending at the top"
    ]);
}

function hipExtensionGuide(name) {
    return guide(name, ["Glutes"], ["Hamstrings"], [
        "Set the feet securely and position the load, bench or cable comfortably.",
        "Brace the trunk before beginning.",
        "Use padding or a range that remains comfortable."
    ], [
        "Drive through the feet and extend the hips, or hinge back before driving the hips forward for a cable variation.",
        "Finish with the torso and thighs aligned without leaning backward.",
        "Return under control."
    ], ["Drive through feet", "Finish with glutes", "Ribs controlled"], [
        "Overarching the lower back",
        "Pushing mainly through the toes",
        "Using momentum"
    ]);
}

function legCurlGuide(name) {
    return guide(name, ["Hamstrings"], [], [
        "Align the machine pivot with the knee joint.",
        "Adjust the pad comfortably above the ankles.",
        "Keep the hips or thighs securely supported."
    ], [
        "Bend the knees to pull the pad through a comfortable range.",
        "Pause briefly as the hamstrings shorten.",
        "Return slowly without letting the stack drop."
    ], ["Hips stay down", "Smooth curl", "Slow return"], [
        "Lifting the hips",
        "Jerking the pad",
        "Dropping the weight stack"
    ]);
}

function calfGuide(name) {
    return guide(name, ["Calves"], [], [
        "Place the balls of the feet securely on the platform or floor.",
        "Use support so balance does not limit the set.",
        "Keep the knee position appropriate for the variation."
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

function coreGuide(name) {
    return guide(name, ["Rectus Abdominis", "Deep Core"], ["Obliques"], [
        "Choose a stable starting position that lets the trunk stay controlled.",
        "Brace gently before beginning the repetition or hold.",
        "Use a range that does not force the lower back out of position."
    ], [
        "Move slowly while keeping the ribcage and pelvis controlled.",
        "Use only the range you can own without swinging or compensating.",
        "Return to the start under control or end the hold when position changes."
    ], ["Brace and breathe", "Control the pelvis", "Own the range"], [
        "Using momentum",
        "Holding the breath unnecessarily",
        "Continuing after trunk position changes substantially"
    ]);
}

function resolveOrphanGuide(rawName) {
    const name = String(rawName || "").trim();
    const n = normalizeName(name);
    if (!n) return null;
    if (/row|t bar|seal row/.test(n)) return rowGuide(name);
    if (/pulldown|pull down|pullup|pull up|chinup|chin up/.test(n)) return pulldownGuide(name);
    if (/rear delt|reverse fly|reverse pec|face pull/.test(n)) return rearDeltGuide(name);
    if (/lateral raise|side raise|upright row/.test(n)) return lateralRaiseGuide(name);
    if (/shoulder press|overhead press|military press|arnold press|pike push/.test(n)) return shoulderPressGuide(name);
    if (/fly|flye|pec deck|crossover/.test(n) && !/reverse/.test(n)) return chestFlyGuide(name);
    if (/bench press|chest press|push up|pushup/.test(n)) return chestPressGuide(name);
    if (/curl/.test(n) && !/leg curl|hamstring curl/.test(n)) return curlGuide(name);
    if (/tricep|triceps|pushdown|push down|skull crusher|jm press|\bdip\b/.test(n)) return tricepsGuide(name);
    if (/leg extension|knee extension/.test(n)) return legExtensionGuide(name);
    if (/leg curl|hamstring curl/.test(n)) return legCurlGuide(name);
    if (/hip thrust|glute bridge|pull through|glute kickback|hip extension/.test(n)) return hipExtensionGuide(name);
    if (/deadlift|\brdl\b|romanian|good morning|stiff leg/.test(n)) return hingeGuide(name);
    if (/squat|leg press|lunge|split squat|step up|stepup/.test(n)) return squatGuide(name);
    if (/calf|heel raise/.test(n)) return calfGuide(name);
    if (/crunch|plank|ab wheel|rollout|knee raise|leg raise|pallof|dead bug|bird dog|sit up|situp/.test(n)) return coreGuide(name);
    return null;
}

function ensureStyles() {
    if (document.getElementById("exercise-guide-resolution-fix-styles")) return;
    const style = document.createElement("style");
    style.id = "exercise-guide-resolution-fix-styles";
    style.textContent = `
        .exercise-guide-hero-figure.exercise-guide-anatomy-overview{margin:14px 0 12px;padding:12px;overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:#050506}
        .exercise-guide-anatomy-overview figcaption{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 2px 10px}
        .exercise-guide-anatomy-overview figcaption strong{font-size:13px;letter-spacing:.02em}.exercise-guide-anatomy-overview figcaption small{color:#a0a0a0;font-size:10px}
        .exercise-guide-anatomy-strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scroll-snap-type:x proximity;scrollbar-width:thin}
        .exercise-guide-anatomy-tile{flex:0 0 min(36vw,132px);min-width:104px;padding:7px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:#0b0b0d;scroll-snap-align:start}
        .exercise-guide-anatomy-tile img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;object-position:center;border-radius:8px;background:#000}
        .exercise-guide-anatomy-tile strong,.exercise-guide-anatomy-tile small{display:block}.exercise-guide-anatomy-tile strong{margin-top:7px;font-size:11px;line-height:1.2}
        .exercise-guide-anatomy-tile small{margin-top:3px;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.exercise-guide-anatomy-tile small.primary{color:#ff4d55}.exercise-guide-anatomy-tile small.secondary{color:#ffad5c}
        @media(max-width:390px){.exercise-guide-anatomy-tile{flex-basis:112px}}
    `;
    document.head.appendChild(style);
}

function anatomyItems(primary = [], secondary = []) {
    return [...primary.map(name => ({ name, role: "primary" })), ...secondary.map(name => ({ name, role: "secondary" }))]
        .filter(item => MUSCLE_IMAGE_PATHS[item.name]);
}

function createAnatomyCarousel(items) {
    if (!items.length) return null;
    ensureStyles();
    const figure = document.createElement("figure");
    figure.className = "exercise-guide-hero-figure exercise-guide-anatomy-overview";
    figure.innerHTML = `<figcaption><strong>Muscle diagram</strong><small>Primary + secondary muscles</small></figcaption><div class="exercise-guide-anatomy-strip">${items.map(item => `<div class="exercise-guide-anatomy-tile"><img src="${escapeHtml(MUSCLE_IMAGE_PATHS[item.name])}" alt="${escapeHtml(item.name)} highlighted" loading="eager" decoding="async"><strong>${escapeHtml(item.name)}</strong><small class="${item.role}">${item.role}</small></div>`).join("")}</div>`;
    return figure;
}

function convertChestGuideToCarousel(screen) {
    if (!(screen instanceof Element) || !screen.matches(".exercise-guide-screen")) return;
    const title = screen.querySelector(".exercise-guide-header h2")?.textContent?.trim();
    if (!CHEST_GUIDE_TITLES.has(title) || screen.dataset.standardCarouselReady === "1") return;
    const items = [...screen.querySelectorAll(".exercise-muscle-card")].map(card => ({
        name: card.querySelector("strong")?.textContent?.trim(),
        image: card.querySelector("img")?.getAttribute("src"),
        role: card.querySelector("span.primary") ? "primary" : "secondary"
    })).filter(item => item.name && item.image);
    if (!items.length) return;
    ensureStyles();
    screen.querySelectorAll(".exercise-guide-hero-figure").forEach(node => node.remove());
    const header = screen.querySelector(".exercise-guide-header");
    if (!header) return;
    const figure = document.createElement("figure");
    figure.className = "exercise-guide-hero-figure exercise-guide-anatomy-overview";
    figure.innerHTML = `<figcaption><strong>Muscle diagram</strong><small>Primary + secondary muscles</small></figcaption><div class="exercise-guide-anatomy-strip">${items.map(item => `<div class="exercise-guide-anatomy-tile"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)} highlighted" loading="eager" decoding="async"><strong>${escapeHtml(item.name)}</strong><small class="${item.role}">${item.role}</small></div>`).join("")}</div>`;
    header.insertAdjacentElement("afterend", figure);
    screen.dataset.standardCarouselReady = "1";
}

function renderOrphanGuide(guideData) {
    const sourceScreen = document.querySelector("#workout-plan-detail-screen");
    const page = sourceScreen?.closest(".workout-page");
    if (!sourceScreen || !page) return;
    const previousScrollY = window.scrollY;
    page.querySelector(".exercise-guide-screen")?.remove();
    const screen = document.createElement("section");
    screen.className = "exercise-guide-screen";
    screen.dataset.aliasGuide = normalizeName(guideData.name);
    screen.innerHTML = `<button class="plan-detail-back exercise-guide-back" type="button">← Workout Plan</button><header class="exercise-guide-header"><span class="eyebrow">EXERCISE GUIDE</span><h2>${escapeHtml(guideData.name)}</h2><p>Use these instructions as general technique guidance. Choose a comfortable range of motion and stop if an exercise causes pain.</p></header><section class="exercise-guide-section"><h3>Setup</h3><ol>${guideData.setup.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section><section class="exercise-guide-section"><h3>How to Perform It</h3><ol>${guideData.execution.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section><section class="exercise-guide-section exercise-cue-section"><h3>Key Cues</h3><div class="exercise-cue-list">${guideData.cues.map(cue => `<span>${escapeHtml(cue)}</span>`).join("")}</div></section><section class="exercise-guide-section"><h3>Common Mistakes</h3><ul>${guideData.mistakes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
    const carousel = createAnatomyCarousel(anatomyItems(guideData.primary, guideData.secondary));
    const header = screen.querySelector(".exercise-guide-header");
    if (carousel && header) header.insertAdjacentElement("afterend", carousel);
    sourceScreen.hidden = true;
    sourceScreen.insertAdjacentElement("beforebegin", screen);
    screen.querySelector(".exercise-guide-back")?.addEventListener("click", () => {
        screen.remove();
        sourceScreen.hidden = false;
        requestAnimationFrame(() => window.scrollTo({ top: previousScrollY, behavior: "auto" }));
    });
    requestAnimationFrame(() => screen.scrollIntoView({ behavior: "auto", block: "start" }));
}

function enhanceOrphanRows(root = document) {
    root.querySelectorAll?.(".plan-detail-exercise-row:not([data-alias-guide-ready])").forEach(row => {
        if (row.classList.contains("has-exercise-guide")) return;
        const nameNode = row.querySelector(".plan-detail-exercise-name");
        if (!nameNode) return;
        const guideData = resolveOrphanGuide(nameNode.textContent);
        if (!guideData) return;
        row.dataset.aliasGuideReady = "1";
        row.classList.add("has-exercise-guide", "has-generated-exercise-guide");
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `Open ${guideData.name} exercise guide`);
        if (!nameNode.querySelector(".exercise-guide-label")) nameNode.insertAdjacentHTML("beforeend", '<span class="exercise-guide-label">Form guide</span>');
        const open = event => { event?.preventDefault?.(); renderOrphanGuide(guideData); };
        row.addEventListener("click", open);
        row.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            open(event);
        });
    });
}

function processAddedNode(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(".exercise-guide-screen")) convertChestGuideToCarousel(node);
    node.querySelectorAll?.(".exercise-guide-screen").forEach(convertChestGuideToCarousel);
    enhanceOrphanRows(node);
}

const observer = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(processAddedNode)));
observer.observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll(".exercise-guide-screen").forEach(convertChestGuideToCarousel);
enhanceOrphanRows();

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
