const unsplash = id => `https://unsplash.com/photos/${id}/download?force=true&w=1200`;

const ART_POOLS = {
  general: [
    "https://images.unsplash.com/photo-1745329532593-53a9ec306787?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1704223523204-504405c9331a?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1741478551825-e7e5c77a2247?auto=format&fit=crop&w=1200&q=82"
  ],
  bodybuilderMale: [
    unsplash("7kEpUPB8vNk"),
    unsplash("NJ_31LtPOU0"),
    unsplash("b-sz9vKfkrc"),
    unsplash("_XixBSI85gE")
  ],
  femaleStrength: [
    unsplash("SMWRje9f4uk"),
    unsplash("mZisJGLWtOM"),
    unsplash("O9PXp4h6kx4"),
    unsplash("6eRG8TFF0Iw")
  ],
  powerlifting: [
    "https://images.unsplash.com/photo-1541600383005-565c949cf777?auto=format&fit=crop&w=1200&q=82",
    unsplash("mZisJGLWtOM")
  ],
  bodyweightMale: [
    unsplash("WGPzWNn3RmY"),
    unsplash("wTWU_Rg2dWc")
  ],
  bodyweightFemale: [
    unsplash("VB6l0RBVQkc"),
    unsplash("6eRG8TFF0Iw")
  ],
  dumbbellMale: [
    unsplash("7kEpUPB8vNk"),
    unsplash("_XixBSI85gE")
  ],
  dumbbellFemale: [
    unsplash("O9PXp4h6kx4"),
    unsplash("SMWRje9f4uk")
  ],
  boxingMale: [
    unsplash("AknKXOJOsoA"),
    unsplash("fsH6E3PDpFQ")
  ],
  boxingFemale: [
    unsplash("fLFHS2RGIfk")
  ],
  athleticMale: [
    unsplash("WGPzWNn3RmY"),
    unsplash("AknKXOJOsoA"),
    "https://images.unsplash.com/photo-1772450014094-8ecd08c5a589?auto=format&fit=crop&w=1200&q=82"
  ],
  athleticFemale: [
    unsplash("VB6l0RBVQkc"),
    unsplash("SMWRje9f4uk"),
    unsplash("fLFHS2RGIfk")
  ],
  cinematicMale: [
    unsplash("NJ_31LtPOU0"),
    unsplash("b-sz9vKfkrc"),
    unsplash("7kEpUPB8vNk")
  ],
  cinematicFemale: [
    unsplash("SMWRje9f4uk"),
    unsplash("mZisJGLWtOM"),
    unsplash("6eRG8TFF0Iw")
  ],
  classicPhysique: [
    unsplash("NJ_31LtPOU0"),
    unsplash("7kEpUPB8vNk")
  ],
  backSpecialization: [
    unsplash("WGPzWNn3RmY"),
    unsplash("NJ_31LtPOU0")
  ],
  legSpecialization: [
    "https://images.unsplash.com/photo-1541600383005-565c949cf777?auto=format&fit=crop&w=1200&q=82",
    unsplash("mZisJGLWtOM")
  ]
};

const FAMILY_BY_ID = {
  "full-body-foundation": "general",
  "upper-lower-balanced": "general",
  "ppl-compact": "general",
  "two-day-full-body-gym-hypertrophy": "general",
  "two-day-dumbbell-only-full-body": "dumbbellMale",
  "two-day-bodyweight-strength-foundation": "bodyweightMale",

  "fight-club-lean-definition": "boxingMale",
  "bronze-age-warrior-mass": "cinematicMale",
  "philadelphia-boxer-conditioning": "boxingMale",
  "jungle-veteran-strength": "athleticMale",
  "metropolis-hero-mass": "cinematicMale",
  "monster-slayer-athletic": "cinematicMale",
  "first-avenger-build": "cinematicMale",
  "mercenary-hero-muscle": "cinematicMale",
  "galactic-titan-mass": "bodybuilderMale",
  "star-lord-athletic-muscle": "athleticMale",
  "road-house-fighter": "boxingMale",
  "southpaw-boxing-strength": "boxingMale",
  "mma-warrior-build": "boxingMale",
  "masked-villain-strength": "powerlifting",
  "secret-agent-athletic": "athleticMale",
  "reacher-power-build": "bodybuilderMale",
  "jungle-lord-athletic": "cinematicMale",
  "cosmic-king-muscle": "cinematicMale",
  "martial-arts-hero-strength": "athleticMale",
  "beast-back-specialization": "backSpecialization",

  "cosmic-captain-strength": "cinematicFemale",
  "amazon-warrior-conditioning": "cinematicFemale",
  "mighty-heroine-strength": "cinematicFemale",
  "widow-combat-athletic": "boxingFemale",
  "assassin-strength-conditioning": "boxingFemale",
  "vampire-hunter-athletic": "athleticFemale",
  "comic-vigilante-strength": "cinematicFemale",
  "wakandan-queen-strength": "cinematicFemale",
  "boxing-corner-athletic": "boxingFemale",
  "galactic-warrior-conditioning": "cinematicFemale",

  "four-time-olympia-volume": "bodybuilderMale",
  "seven-time-physique-detail": "bodybuilderMale",
  "eight-time-symmetry-split": "classicPhysique",
  "aesthetic-golden-proportions": "classicPhysique",
  "myth-era-mass": "bodybuilderMale",
  "heavy-duty-rotation": "powerlifting",
  "quad-legend-specialization": "legSpecialization",
  "hulking-classic-mass": "bodybuilderMale",
  "sardinian-power-physique": "classicPhysique",
  "silver-era-powerbuilding": "powerlifting",
  "blade-consistency-split": "bodybuilderMale",
  "predator-back-detail": "backSpecialization",
  "sultan-symmetry-split": "classicPhysique",
  "classic-stage-detail": "classicPhysique",
  "fullness-and-density": "bodybuilderMale"
};

function hashText(value) {
  return [...String(value || "")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function inferFamily(plan) {
  const id = String(plan?.id || "").toLowerCase();
  const name = String(plan?.name || "").toLowerCase();
  const source = String(plan?.sourceLabel || "").toLowerCase();
  const type = String(plan?.trainingType || "").toLowerCase();
  const text = `${id} ${name} ${source} ${type}`;

  if (FAMILY_BY_ID[id]) return FAMILY_BY_ID[id];
  if (/woman|female|heroine|amazon|widow|queen|captain marvel|wonder woman/.test(text)) return "femaleStrength";
  if (/box|fighter|fight|mma|combat|martial/.test(text)) return /woman|female|heroine|queen|widow|amazon/.test(text) ? "boxingFemale" : "boxingMale";
  if (/bodyweight|calisthenic/.test(text)) return "bodyweightMale";
  if (/dumbbell/.test(text)) return "dumbbellMale";
  if (/powerbuild|powerlifting|5x5|strength/.test(text)) return "powerlifting";
  if (/quad|leg specialization/.test(text)) return "legSpecialization";
  if (/back specialization|back detail/.test(text)) return "backSpecialization";
  if (/bodybuilder|olympia|mass|physique|classic|symmetry|golden/.test(text)) return "bodybuilderMale";
  if (/hero|warrior|vigilante|cosmic|avenger|metropolis|titan|monster|slayer/.test(text)) return "cinematicMale";
  if (/athletic|conditioning|hybrid|cardio/.test(text)) return "athleticMale";
  return "general";
}

export function getPlanArtwork(plan, index = 0) {
  const family = inferFamily(plan);
  const pool = ART_POOLS[family] || ART_POOLS.general;
  const position = Math.abs(hashText(`${plan?.id || plan?.name || index}:${index}`)) % pool.length;
  return { src: pool[position], family };
}

export function getPlanArtFamily(plan) {
  return inferFamily(plan);
}
