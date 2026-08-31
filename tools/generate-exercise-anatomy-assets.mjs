import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "assets/exercise-anatomy");
const RED = "#ff315f";

const maleFront = {
  Chest:["muscle_front_011","muscle_front_012"], Shoulders:["muscle_front_009","muscle_front_010"], Biceps:["muscle_front_015","muscle_front_016"], Forearms:["muscle_front_033","muscle_front_034","muscle_front_037","muscle_front_038","muscle_front_041","muscle_front_042"], Quads:["muscle_front_049","muscle_front_050","muscle_front_051","muscle_front_052","muscle_front_067","muscle_front_068","muscle_front_069","muscle_front_070"], Core:["muscle_front_017","muscle_front_018","muscle_front_019","muscle_front_020","muscle_front_021","muscle_front_022","muscle_front_023","muscle_front_024","muscle_front_025","muscle_front_026","muscle_front_027","muscle_front_028","muscle_front_029","muscle_front_030","muscle_front_031","muscle_front_032","muscle_front_035","muscle_front_036","muscle_front_039","muscle_front_040","muscle_front_043","muscle_front_044","muscle_front_045","muscle_front_046"]
};
const maleBack = { Back:["muscle_back_012","muscle_back_013","muscle_back_020","muscle_back_021","muscle_back_022","muscle_back_023","muscle_back_028","muscle_back_029","muscle_back_050","muscle_back_051","muscle_back_074","muscle_back_075"], "Rear Delts":["muscle_back_016","muscle_back_017"], Triceps:["muscle_back_024","muscle_back_025","muscle_back_034","muscle_back_035","muscle_back_040","muscle_back_041"], Glutes:["muscle_back_078","muscle_back_079","muscle_back_080","muscle_back_081"], Hamstrings:["muscle_back_096","muscle_back_097","muscle_back_113","muscle_back_114","muscle_back_118","muscle_back_119","muscle_back_120","muscle_back_121","muscle_back_126","muscle_back_127"], Calves:["muscle_back_134","muscle_back_135","muscle_back_136","muscle_back_137","muscle_back_140","muscle_back_141","muscle_back_142","muscle_back_143","muscle_back_148","muscle_back_149"] };
const femaleFront = { Chest:["female_front_chest_l","female_front_chest_r"], Shoulders:["female_front_shoulders_l","female_front_shoulders_r"], Biceps:["female_front_biceps_l","female_front_biceps_r"], Forearms:["female_front_forearms_l","female_front_forearms_r"], Quads:["female_front_quads_l","female_front_quads_r"], Core:["female_front_core"] };
const femaleBack = { Back:["female_back_back"], "Rear Delts":["female_back_delts_l","female_back_delts_r"], Triceps:["female_back_triceps_l","female_back_triceps_r"], Glutes:["female_back_glutes_l","female_back_glutes_r"], Hamstrings:["female_back_hamstrings_l","female_back_hamstrings_r"], Calves:["female_back_calves_l","female_back_calves_r"] };
const facing = { All:"front", Chest:"front", Back:"back", Shoulders:"front", Biceps:"front", Triceps:"back", Forearms:"front", Quads:"front", Hamstrings:"back", Glutes:"back", Calves:"back", Core:"front", "Rear Delts":"back" };
const slug = value => value.toLowerCase().replaceAll(" ", "-");

fs.mkdirSync(OUTPUT, { recursive: true });
for (const sex of ["male", "female"]) {
  for (const [muscle, side] of Object.entries(facing)) {
    const sourceName = `${sex === "female" ? "female-" : ""}${side}-view.svg`;
    const source = fs.readFileSync(path.join(ROOT, "assets/recovery", sourceName), "utf8");
    const regions = muscle === "All" ? [] : (sex === "female" ? (side === "front" ? femaleFront : femaleBack) : (side === "front" ? maleFront : maleBack))[muscle] || [];
    const selectors = regions.flatMap(id => [`#${id}`, `#${id} *`]).join(",");
    const style = selectors ? `<style>${selectors}{fill:${RED}!important;stroke:${RED}!important;opacity:1!important}</style>` : "";
    const output = source.replace(/(<svg\b[^>]*>)/, `$1${style}`);
    fs.writeFileSync(path.join(OUTPUT, `${sex}-${slug(muscle)}.svg`), output);
  }
}
