// Sharp, uniquely matched local illustrations for food-choice cards.
// Avoids the reused stock-photo/category thumbnails that confused broccoli
// with blueberries. All marks render as native vector/emoji glyphs (no JPG zoom).
const FOOD_ART={
 Apple:["🍎","#b3393c"],Blueberries:["🫐","#353d98"],Banana:["🍌","#e5bb43"],
 Pineapple:["🍍","#c3a14e"],Broccoli:["🥦","#357a52"],Spinach:["🥬","#418560"],
 Zucchini:["🥒","#44845e"],"Bell pepper":["🫑","#ca553e"],Tomato:["🍅","#b94143"],
 Cucumber:["🥒","#367d61"],Avocado:["🥑","#7e9940"],"Sweet potato":["🍠","#a86748"],
 "Chicken breast":["🍗","#c18a5b"],"Turkey breast":["🍗","#b97858"],
 Beef:["🥩","#b74b43"],Salmon:["🐟","#db865e"],Tuna:["🐟","#6885a1"],
 Shrimp:["🦐","#ca7459"],Cod:["🐟","#809fbe"],
 Egg:["🥚","#d5a85c"],Tofu:["🧈","#e0be7d"],
 Oats:["🥣","#b3a081"],Rice:["🍚","#f0d4a4"],Quinoa:["🌾","#ac9b5e"],
 Yogurt:["🥛","#9cabbe"],Lentils:["🫘","#99714c"],
 Chickpeas:["🫘","#b39564"],Potato:["🥔","#b99168"],Beans:["🫘","#986445"],
 "Olive oil":["🫒","#71934f"],"Greek yogurt":["🥛","#b6c8cc"]
};
const DIET_ART={
 balanced:{icon:"🥗",support:"🍗",color:"#417967"},
 "high-protein":{icon:"🍗",support:"🥚",color:"#995f42"},
 "whole-food":{icon:"🥕",support:"🍎",color:"#7c8749"},
 mediterranean:{icon:"🫒",support:"🐟",color:"#467c8e"},
 vegetarian:{icon:"🥚",support:"🥬",color:"#5c8a53"},
 vegan:{icon:"🥑",support:"🥦",color:"#508e6d"},
 pescatarian:{icon:"🐟",support:"🥗",color:"#3b829b"},
 flexitarian:{icon:"🥗",support:"🍗",color:"#6b8844"},
 "low-carb":{icon:"🥩",support:"🥑",color:"#925a50"}
};
const encode=(s)=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const art=(icon,second,color,label)=>{
 const safe=encode(label),base=encode(color),glyph=encode(icon),secondary=encode(second||"");
 return '<span class="mp-illustration" role="img" aria-label="'+safe+'" style="--mp-illustration-color:'+base+'">'+
 '<span class="mp-illustration-glow" aria-hidden="true"></span>'+
 '<span class="mp-illustration-icon" aria-hidden="true">'+glyph+'</span>'+
 (secondary?'<span class="mp-illustration-accent" aria-hidden="true">'+secondary+'</span>':'')+'</span>';
};
export function ingredientIllustration(food){
 const name=String(food||"");
 const exact=FOOD_ART[name]||FOOD_ART[Object.keys(FOOD_ART).find(x=>name.toLowerCase().includes(x.toLowerCase()))];
 const [icon,color]=exact||["🍽️","#67788d"];
 return art(icon,"",color,name);
}
export function dietIllustration(id,label){
 const d=DIET_ART[id]||DIET_ART.balanced;
 return art(d.icon,d.support,d.color,label||id);
}
export const FOOD_ART_NAMES=Object.freeze(Object.keys(FOOD_ART));
export const DIET_ART_NAMES=Object.freeze(Object.keys(DIET_ART));
