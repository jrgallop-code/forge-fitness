import {parseSpokenIngredientText,ingredientPortionSelection} from './ingredient-paste-parser.js?v=voice-food-1';
import {withFoodWeightUnits} from './food-portion-units.js';
const words=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean).map(w=>w.endsWith('ies')?w.slice(0,-3)+'y':w.endsWith('s')?w.slice(0,-1):w);
const composites=['muffin','cake','smoothie','shake','bar','juice','jam','pie','sauce','salad','cookie'];
export function voiceIngredients(text){return parseSpokenIngredientText(String(text||'').replace(/^\s*(?:i (?:had|ate)|for (?:breakfast|lunch|dinner|snacks?) i (?:had|ate))\s+/i,''));}
export function accurateVoiceMatch(ingredient,foods){
 const query=words(ingredient.name).filter(w=>!['of','the'].includes(w));if(!query.length)return null;
 return (foods||[]).filter(f=>f?.portions?.length).map((food,index)=>{
  const name=words(food.name),all=[...name,...words(food.brand)];
  if(query.some(w=>!all.includes(w)))return null;
  if(composites.some(w=>name.includes(w)&&!query.includes(w)))return null;
  const exact=name.join(' ')===query.join(' ');
  return {food,index,score:(exact?30:0)+(food.previouslyLogged?5:0)-Math.max(0,name.length-query.length)};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index)[0]?.food||null;
}
export function voicePortion(ingredient,food){return ingredientPortionSelection(ingredient,withFoodWeightUnits(food));}
export function replacementVoicePortion(entry,food){
 const ingredient=entry?.voiceIngredient;
 const source=entry?.food?.portions?.find(p=>p.label===entry.servingLabel);
 const q=Number(entry?.quantity)||1;
 if(ingredient?.unit==='item' && source && !source.inputUnit)return voicePortion({...ingredient,amount:q*(Number(source.count)||1)},food);
 if(source?.countUnit && Number(source.count)>0)return voicePortion({name:entry.name,amount:source.count*q,unit:'item'},food);
 if(Number(source?.grams)>0)return voicePortion({name:entry.name,amount:source.grams*q,unit:'g'},food);
 if(Number(source?.milliliters)>0)return voicePortion({name:entry.name,amount:source.milliliters*q,unit:'ml'},food);
 if(ingredient)return voicePortion(ingredient,food);
 return null;
}
