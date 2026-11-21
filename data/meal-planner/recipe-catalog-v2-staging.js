// Original Level Up staging recipe informed by the completeness standard of
// https://mealprepmanual.com/creamy-cilantro-lime-chicken-bowls/
// Ingredient weights and instructions below are an ORIGINAL draft, not copied
// from that site. Never present source nutrition estimates as these macros.
const ingredient=(name,grams,role,shoppingCategory,state="raw",nutritionId="")=>({name,grams,role,shoppingCategory,state,nutritionId});
export const CATALOG_V2_STAGING=Object.freeze([
{
 id:"lu-original-smoky-lime-chicken-bowl-v1",
 title:"Smoky Lime Chicken, Black Bean & Rice Bowls",
 status:"draft",
 cuisine:"Mexican-inspired",
 mealSlots:["Lunch","Dinner"],
 diet:"omnivore",
 allergens:["milk"],
 yieldPortions:4,
 timing:{prepMinutes:20,cookMinutes:35},
 source:{type:"inspiration-and-format-reference",url:"https://mealprepmanual.com/creamy-cilantro-lime-chicken-bowls/",publisher:"The Meal Prep Manual",sourceTitle:"Creamy Cilantro Lime Chicken Bowls"},
 rights:{status:"original-draft-pending-review",instructionText:"Level Up original; not copied",imageUse:"No third-party images permitted"},
 components:[
  {id:"main",label:"Chicken and bowls",ingredients:[
   ingredient("Boneless skinless chicken breast",680,"protein","Meat & seafood","raw"),
   ingredient("White rice",240,"starch","Grains","dry"),
   ingredient("Black beans",360,"starch","Canned goods","drained"),
   ingredient("Red bell pepper",240,"vegetable","Produce"),
   ingredient("Red onion",120,"vegetable","Produce"),
   ingredient("Frozen corn",240,"vegetable","Frozen foods","frozen"),
   ingredient("Extra virgin olive oil",20,"oil","Oils & seasonings"),
   ingredient("Smoked paprika",6,"seasoning","Oils & seasonings"),
   ingredient("Ground cumin",5,"seasoning","Oils & seasonings"),
   ingredient("Chili powder",4,"seasoning","Oils & seasonings"),
   ingredient("Garlic powder",4,"seasoning","Oils & seasonings"),
   ingredient("Salt",4,"seasoning","Oils & seasonings"),
   ingredient("Black pepper",2,"seasoning","Oils & seasonings")
  ]},
  {id:"sauce",label:"Creamy cilantro lime yogurt sauce",ingredients:[
   ingredient("Plain Greek yogurt (2%)",200,"sauce","Dairy","refrigerated"),
   ingredient("Fresh cilantro",25,"garnish","Produce"),
   ingredient("Fresh lime juice",45,"sauce","Produce","juice"),
   ingredient("Fresh jalapeño",25,"vegetable","Produce"),
   ingredient("Garlic",8,"seasoning","Produce"),
   ingredient("Water",30,"liquid","Pantry","room temperature")
  ]}
 ],
 instructions:[
  {step:1,text:"Cook the measured dry rice until tender, following its package's water ratio and timing."},
  {step:2,text:"Combine the paprika, cumin, chili powder, garlic powder, salt and black pepper. Coat the chicken with half the oil and seasoning mixture."},
  {step:3,text:"Cook the chicken in a preheated skillet or oven, checking that the thickest portion reaches at least 74°C."},
  {step:4,text:"Sauté the sliced pepper and onion using the remaining oil. Add the corn and drained black beans; cook until heated through."},
  {step:5,text:"Blend Greek yogurt, cilantro, lime juice, jalapeño and fresh garlic with the water to make a pourable sauce."},
  {step:6,text:"Divide cooked rice, chicken and vegetables evenly among four containers; refrigerate the sauce separately and add when serving."}
 ],
 storage:{refrigerateWithinHours:2,fridgeMaxC:4,fridgeDaysConservative:2,freezerMaxC:-18,reheatC:74,sauceNote:"Store chilled sauce separately; do not heat yogurt sauce with the bowl."},
 nutrition:{verified:false,calories:null,proteinG:null,carbsG:null,fatG:null,reference:"Requires raw/dry ingredient matching and independent calculation"},
 kitchenTest:{passed:false,notes:"Test flavour, portion size, sauce stability, and day-3 reheating."},
 image:{assetId:null,ingredientReviewApproved:false,visualBrief:"Photorealistic bowl with cooked seasoned chicken breast, white rice, black beans, corn, red pepper, red onion, cilantro-lime yogurt sauce and cilantro. No avocado, cheese, tomato, sour cream, or other unlisted toppings."},
 publication:{releaseEligible:false,reason:"Source/rights, nutrient IDs, kitchen test and unique image incomplete"}
}
]);
