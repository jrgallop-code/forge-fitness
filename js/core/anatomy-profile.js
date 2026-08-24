import { getNutritionProfile } from "../nutrition/nutrition-storage.js?v=profile-appearance-1";

const MALE_FRONT = {
  Shoulders:["muscle_front_009","muscle_front_010"], Chest:["muscle_front_011","muscle_front_012"], Biceps:["muscle_front_015","muscle_front_016"], Triceps:["muscle_front_013","muscle_front_014"],
  Forearms:["muscle_front_033","muscle_front_034","muscle_front_037","muscle_front_038","muscle_front_041","muscle_front_042"], Back:["muscle_front_007","muscle_front_008"],
  Core:["muscle_front_017","muscle_front_018","muscle_front_019","muscle_front_020","muscle_front_021","muscle_front_022","muscle_front_023","muscle_front_024","muscle_front_025","muscle_front_026","muscle_front_027","muscle_front_028","muscle_front_029","muscle_front_030","muscle_front_031","muscle_front_032","muscle_front_035","muscle_front_036","muscle_front_039","muscle_front_040","muscle_front_043","muscle_front_044","muscle_front_045","muscle_front_046"],
  Adductors:["muscle_front_047","muscle_front_048","muscle_front_065","muscle_front_066"], Quads:["muscle_front_049","muscle_front_050","muscle_front_051","muscle_front_052","muscle_front_067","muscle_front_068","muscle_front_069","muscle_front_070"], Calves:["muscle_front_073","muscle_front_074","muscle_front_075","muscle_front_076","muscle_front_077","muscle_front_078","muscle_front_079","muscle_front_080"]
};
const MALE_BACK = {"Rear Delts":["muscle_back_016","muscle_back_017"],Back:["muscle_back_012","muscle_back_013","muscle_back_020","muscle_back_021","muscle_back_022","muscle_back_023","muscle_back_028","muscle_back_029","muscle_back_050","muscle_back_051","muscle_back_074","muscle_back_075"],Triceps:["muscle_back_024","muscle_back_025","muscle_back_034","muscle_back_035","muscle_back_040","muscle_back_041"],Forearms:["muscle_back_056","muscle_back_057","muscle_back_064","muscle_back_065","muscle_back_068","muscle_back_069","muscle_back_070","muscle_back_071"],Glutes:["muscle_back_078","muscle_back_079","muscle_back_080","muscle_back_081"],Hamstrings:["muscle_back_096","muscle_back_097","muscle_back_113","muscle_back_114","muscle_back_118","muscle_back_119","muscle_back_120","muscle_back_121","muscle_back_126","muscle_back_127"],Calves:["muscle_back_134","muscle_back_135","muscle_back_136","muscle_back_137","muscle_back_140","muscle_back_141","muscle_back_142","muscle_back_143","muscle_back_148","muscle_back_149"]};
const FEMALE_FRONT={Shoulders:["female_front_shoulders_l","female_front_shoulders_r"],Chest:["female_front_chest_l","female_front_chest_r"],Biceps:["female_front_biceps_l","female_front_biceps_r"],Triceps:["female_front_triceps_l","female_front_triceps_r"],Forearms:["female_front_forearms_l","female_front_forearms_r"],Back:["female_front_back_l","female_front_back_r"],Core:["female_front_core","female_front_obliques_l","female_front_obliques_r"],Adductors:["female_front_adductors_l","female_front_adductors_r"],Quads:["female_front_quads_l","female_front_quads_r"],Calves:["female_front_calves_l","female_front_calves_r"]};
const FEMALE_BACK={"Rear Delts":["female_back_delts_l","female_back_delts_r"],Back:["female_back_traps","female_back_lats_l","female_back_lats_r","female_back_erectors_l","female_back_erectors_r"],Triceps:["female_back_triceps_l","female_back_triceps_r"],Forearms:["female_back_forearms_l","female_back_forearms_r"],Glutes:["female_back_glutes_l","female_back_glutes_r"],Hamstrings:["female_back_hamstrings_l","female_back_hamstrings_r"],Calves:["female_back_calves_l","female_back_calves_r"]};

export function getAnatomySex(){
  const preview=globalThis.window?.__levelUpAnatomySexPreview;
  if(preview === "female" || preview === "male") return preview;
  return getNutritionProfile()?.sex === "female" ? "female" : "male";
}
export function getAnatomyConfig(side="front"){
  const sex=getAnatomySex(), back=side === "back";
  if(sex === "female") return {sex,side:back?"back":"front",asset:`assets/recovery/female-${back?"back":"front"}-view.svg?v=female-anatomy-1`,regions:back?FEMALE_BACK:FEMALE_FRONT,viewBox:"0 0 960 1920",imageX:0};
  return {sex,side:back?"back":"front",asset:`assets/recovery/${back?"back":"front"}-view.svg?v=${back?"recovery-back-vector-1":"recovery-front-vector-2"}`,regions:back?MALE_BACK:MALE_FRONT,viewBox:back?"960 0 960 1920":"0 0 960 1920",imageX:back?960:0};
}
