// Practice data is intentionally memory-only: never pass it to persistence or sync.
export function localDate(date) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function createNutritionDemo(today=new Date()) {
 const weights=Array.from({length:56},(_,i)=>{const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-56+i,12);return {date:localDate(d),weight:Number((178-i*.075+Math.sin(i*1.7)*.65+Math.cos(i*.6)*.25).toFixed(1))};});
 return {today:localDate(today),weights,goal:170,rate:.5,calories:2400,meal:'Dinner',items:[],range:56};
}
export const toDisplayWeight=(lb,unit)=>Number((lb*(unit==='kg'?.45359237:1)).toFixed(1));
export const toPounds=(value,unit)=>Number(value)/(unit==='kg'?.45359237:1);
export function saveDemoWeight(state,value,unit) {
 const weight=toPounds(value,unit);if(!Number.isFinite(weight)||weight<44||weight>1400)return false;
 state.weights=state.weights.filter(e=>e.date!==state.today).concat({date:state.today,weight});return true;
}
function food(id,name,grams,nutrition) {
 const portions=[{label:'serving',grams,nutrition}];
 for(const [inputUnit,size] of [['g',1],['oz',28.349523125]])portions.push({label:inputUnit,inputUnit,grams:size,nutrition:Object.fromEntries(Object.entries(nutrition).map(([k,v])=>[k,v*size/grams]))});
 return {id,name,description:name,portions};
}
export const DEMO_FOODS=[
 food('demo-yogurt','Plain Greek yogurt',170,{calories:100,protein:17,carbs:6,fat:0,calcium:190,sodium:60}),
 food('demo-blueberries','Blueberries',100,{calories:57,protein:.7,carbs:14.5,fat:.3,fiber:2.4,sugars:10,vitaminC:9.7,potassium:77}),
 food('demo-oats','Rolled oats',40,{calories:152,protein:5,carbs:27,fat:3,fiber:4,iron:1.7})
];
export function demoMealTotals(items) {
 return items.reduce((total,item)=>{const n=DEMO_FOODS[item.food].portions[item.portion].nutrition;for(const k of Object.keys(total))total[k]+=(n[k]||0)*item.quantity;return total;},{calories:0,protein:0,carbs:0,fat:0});
}
