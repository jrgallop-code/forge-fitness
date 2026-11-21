// Recipe-specific photography registry. Local AI photo assets are preferred;
// representative photo fallback is explicit so images aren't called AI if not.
// One recipe-base ID = one photograph reused across its 20 portion variants.
// In future generated files may be placed at /assets/meal-photos/001.webp etc.
const PHOTO_IDS=[
 "photo-1484723091739-30a097e8f929", // oats berries
 "photo-1517673400267-0251440c45dc", // oats
 "photo-1525351484163-7529414344d8", // egg toast
 "photo-1488477181946-6428a0291777", // yogurt
 "photo-1490645935967-10de6ba17061", // fruit breakfast
 "photo-1567620905732-2d1ec7ab7445", // breakfast
 "photo-1467003909585-2f8a72700288", // salmon
 "photo-1547592180-85f173990554", // protein bowl
 "photo-1512621776951-a57141f2eefd", // chickpeas
 "photo-1568901346375-23c9450c58cd", // wrap
 "photo-1546069901-ba9599a7e63c", // tofu rice bowl
 "photo-1519708227418-c8fd9a32b7a2", // fish plate
 "photo-1473093295043-cdd812d0e601", // pasta
 "photo-1504674900247-0877df9cc836", // beef rice
 "photo-1519708227418-c8fd9a32b7a2", // salmon
 "photo-1476224203421-9ac39bcb3327", // stew
 "photo-1540189549336-e6e99c3679fe", // bowl
 "photo-1473093295043-cdd812d0e601", // tofu pasta
 "photo-1488477181946-6428a0291777", // fruit yogurt
 "photo-1505252585461-04db1eb84625", // apple
 "photo-1512621776951-a57141f2eefd", // hummus plate
 "photo-1488477181946-6428a0291777", // cottage cheese
 "photo-1546069901-ba9599a7e63c", // edamame
 "photo-1482049016688-2d3e1b311543", // toast
 "photo-1519708227418-c8fd9a32b7a2", // tuna snack
 "photo-1473093295043-cdd812d0e601", // italian turkey pasta
 "photo-1473093295043-cdd812d0e601", // tomato pasta
 "photo-1546069901-ba9599a7e63c", // tofu veg rice
 "photo-1547592180-85f173990554", // chicken rice
 "photo-1519708227418-c8fd9a32b7a2", // salmon rice
 "photo-1546069901-ba9599a7e63c", // tofu rice
 "photo-1504674900247-0877df9cc836", // shrimp
 "photo-1547592180-85f173990554", // chicken
 "photo-1540189549336-e6e99c3679fe", // curry
 "photo-1512621776951-a57141f2eefd", // lentils
 "photo-1517673400267-0251440c45dc", // banana apple oats
 "photo-1482049016688-2d3e1b311543", // tofu scramble
 "photo-1488477181946-6428a0291777", // berry oats
 "photo-1476224203421-9ac39bcb3327", // chickpea
 "photo-1546069901-ba9599a7e63c" // tofu skillet
];
export const PHOTO_SOURCE="representative-photography-not-ai";
export function recipeBaseIndex(recipe){
 const id=Number(String(recipe?.id||"").replace(/^lu-meal-/,""));
 return Number.isFinite(id)&&id>0?Math.min(39,Math.floor((id-1)/20)):0;
}
export function recipePhoto(recipe){
 const index=recipeBaseIndex(recipe);
 const filename=String(index+1).padStart(3,"0")+".webp";
 return {
  primary:"/assets/meal-photos/"+filename,
  fallback:"https://images.unsplash.com/"+PHOTO_IDS[index]+"?auto=format&fit=crop&w=700&q=82",
  source:PHOTO_SOURCE,
  id:index+1
 };
}
export function dietPhoto(diet){
 const ids={balanced:7,"high-protein":7,"whole-food":8,mediterranean:6,vegetarian:8,vegan:8,pescatarian:6,flexitarian:7,"low-carb":6};
 return recipePhoto({id:"lu-meal-"+String((ids[diet]||7)*20+1).padStart(3,"0")});
}
