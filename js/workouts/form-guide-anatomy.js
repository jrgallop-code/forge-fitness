const FRONT_ASSET = "assets/recovery/front-view.svg?v=recovery-front-vector-2";
const BACK_ASSET = "assets/recovery/back-view.svg?v=recovery-back-vector-1";
const TARGET_FILL = "#ff315f";
import { getAnatomyConfig } from "../core/anatomy-profile.js?v=female-anatomy-1";

const CORE_ALL = [
    "muscle_front_017", "muscle_front_018", "muscle_front_019", "muscle_front_020",
    "muscle_front_021", "muscle_front_022", "muscle_front_023", "muscle_front_024",
    "muscle_front_025", "muscle_front_026", "muscle_front_027", "muscle_front_028",
    "muscle_front_029", "muscle_front_030", "muscle_front_031", "muscle_front_032",
    "muscle_front_035", "muscle_front_036", "muscle_front_039", "muscle_front_040",
    "muscle_front_043", "muscle_front_044", "muscle_front_045", "muscle_front_046"
];

const BACK_ALL = [
    "muscle_back_012", "muscle_back_013", "muscle_back_020", "muscle_back_021",
    "muscle_back_022", "muscle_back_023", "muscle_back_028", "muscle_back_029",
    "muscle_back_050", "muscle_back_051", "muscle_back_074", "muscle_back_075"
];

const CROP_VIEWBOXES = {
    "front-upper": "250 330 460 575",
    "front-arms": "180 500 600 750",
    "front-torso": "320 500 320 400",
    "front-thighs": "305 850 350 438",
    "back-upper": "1200 330 480 600",
    "back-mid": "1236 430 400 500",
    "back-hips": "1256 760 360 450",
    "back-thighs": "1260 930 350 438",
    "back-calves": "1232 1240 408 510"
};

const FORM_GUIDE_MUSCLES = {
    "Chest": {
        view: "front",
        ids: ["muscle_front_011", "muscle_front_012"],
        crop: "upper"
    },
    "Shoulders": {
        view: "front",
        ids: ["muscle_front_009", "muscle_front_010"],
        crop: "upper"
    },
    "Front Delts": {
        view: "front",
        ids: ["muscle_front_009", "muscle_front_010"],
        crop: "upper"
    },
    "Side Delts": {
        view: "front",
        ids: ["muscle_front_009", "muscle_front_010"],
        crop: "upper"
    },
    "Rear Delts": {
        view: "back",
        ids: ["muscle_back_016", "muscle_back_017"],
        crop: "upper"
    },
    "Biceps": {
        view: "front",
        ids: ["muscle_front_015", "muscle_front_016"],
        crop: "upper"
    },
    "Triceps": {
        view: "back",
        ids: [
            "muscle_back_024", "muscle_back_025", "muscle_back_034",
            "muscle_back_035", "muscle_back_040", "muscle_back_041"
        ],
        crop: "upper"
    },
    "Forearms": {
        view: "front",
        ids: [
            "muscle_front_033", "muscle_front_034", "muscle_front_037",
            "muscle_front_038", "muscle_front_041", "muscle_front_042"
        ],
        crop: "arms"
    },
    "Lats": {
        view: "back",
        ids: ["muscle_back_028", "muscle_back_029", "muscle_back_074", "muscle_back_075"],
        crop: "mid"
    },
    "Upper Back": {
        view: "back",
        ids: [
            "muscle_back_012", "muscle_back_013", "muscle_back_020",
            "muscle_back_021", "muscle_back_022", "muscle_back_023"
        ],
        crop: "upper"
    },
    "Spinal Erectors": {
        view: "back",
        ids: ["muscle_back_050", "muscle_back_051"],
        crop: "mid"
    },
    "Back": {
        view: "back",
        ids: BACK_ALL,
        crop: "mid"
    },
    "Rectus Abdominis": {
        view: "front",
        ids: [
            "muscle_front_019", "muscle_front_020", "muscle_front_029", "muscle_front_030",
            "muscle_front_039", "muscle_front_040", "muscle_front_045", "muscle_front_046"
        ],
        crop: "torso"
    },
    "Obliques": {
        view: "front",
        ids: [
            "muscle_front_017", "muscle_front_018", "muscle_front_021", "muscle_front_022",
            "muscle_front_023", "muscle_front_024", "muscle_front_025", "muscle_front_026",
            "muscle_front_027", "muscle_front_028", "muscle_front_031", "muscle_front_032",
            "muscle_front_035", "muscle_front_036", "muscle_front_043", "muscle_front_044"
        ],
        crop: "torso"
    },
    "Deep Core": {
        view: "front",
        ids: CORE_ALL,
        crop: "torso"
    },
    "Core": {
        view: "front",
        ids: CORE_ALL,
        crop: "torso"
    },
    "Quads": {
        view: "front",
        ids: [
            "muscle_front_051", "muscle_front_052", "muscle_front_067",
            "muscle_front_068", "muscle_front_069", "muscle_front_070"
        ],
        crop: "thighs"
    },
    "Adductors": {
        view: "front",
        ids: ["muscle_front_049", "muscle_front_050"],
        crop: "thighs"
    },
    "Glutes": {
        view: "back",
        ids: ["muscle_back_078", "muscle_back_079", "muscle_back_080", "muscle_back_081"],
        crop: "hips"
    },
    "Hamstrings": {
        view: "back",
        ids: [
            "muscle_back_096", "muscle_back_097", "muscle_back_113", "muscle_back_114",
            "muscle_back_118", "muscle_back_119", "muscle_back_120", "muscle_back_121",
            "muscle_back_126", "muscle_back_127"
        ],
        crop: "thighs"
    },
    "Calves": {
        view: "back",
        ids: [
            "muscle_back_134", "muscle_back_135", "muscle_back_136", "muscle_back_137",
            "muscle_back_140", "muscle_back_141", "muscle_back_142", "muscle_back_143",
            "muscle_back_148", "muscle_back_149"
        ],
        crop: "calves"
    }
};

export function getFormGuideMuscleVisual(muscleName) {
    const name = String(muscleName || "").trim();
    const source = FORM_GUIDE_MUSCLES[name];
    if (!source) return null;

    const anatomy = getAnatomyConfig(source.view);
    if (anatomy.sex === "female") {
        const aliases = {"Front Delts":"Shoulders","Side Delts":"Shoulders","Rear Delts":"Rear Delts","Lats":"Back","Upper Back":"Back","Spinal Erectors":"Back","Rectus Abdominis":"Core","Obliques":"Core","Deep Core":"Core"};
        const region = aliases[name] || name;
        return { muscle:name, view:source.view, ids:[...(anatomy.regions[region]||[])], crop:source.crop, anatomy };
    }
    return {
        muscle: name,
        view: source.view,
        ids: [...source.ids],
        crop: source.crop
    };
}

export function renderFormGuideMuscleSvg(configOrMuscleName) {
    const config = typeof configOrMuscleName === "string"
        ? getFormGuideMuscleVisual(configOrMuscleName)
        : configOrMuscleName;

    if (!config?.view || !Array.isArray(config.ids) || !config.ids.length) return "";

    const anatomy = config.anatomy || getAnatomyConfig(config.view);
    const asset = anatomy.asset;
    const assetX = anatomy.imageX;
    const cropKey = `${config.view}-${config.crop}`;
    const femaleCrops={"front-upper":"180 300 600 680","front-arms":"120 420 720 650","front-torso":"300 470 360 540","front-thighs":"290 900 380 570","back-upper":"180 300 600 680","back-mid":"270 420 420 600","back-hips":"280 780 400 520","back-thighs":"290 950 380 520","back-calves":"290 1250 380 620"};
    const viewBox = anatomy.sex === "female" ? (femaleCrops[cropKey]||anatomy.viewBox) : (CROP_VIEWBOXES[cropKey] || anatomy.viewBox);
    const orientation = config.view === "back" ? "back" : "front";
    const muscle = escapeXml(config.muscle || "Target muscle");
    const overlays = config.ids.map(id => {
        const href = `${asset}#${id}`;
        return `<use href="${href}" xlink:href="${href}" class="form-guide-muscle-highlight" fill="${TARGET_FILL}"/>`;
    }).join("");

    return `<svg class="form-guide-muscle-svg form-guide-muscle-svg-${orientation}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${muscle} highlighted on ${orientation} anatomy" focusable="false" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <image class="form-guide-anatomy-base" href="${asset}" xlink:href="${asset}" x="${assetX}" y="0" width="960" height="1920" preserveAspectRatio="xMidYMid meet"/>
        ${overlays}
    </svg>`;
}

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
