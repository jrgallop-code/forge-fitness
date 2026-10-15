import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceIngredients,accurateVoiceMatch,voicePortion,replacementVoicePortion} from '../js/nutrition/voice-food-model.js';
import {createFoodSpeechSession} from '../js/nutrition/food-speech.js';
const food=(name,brand='',calories=60)=>({name,brand,portions:[{label:'100 g',grams:100,nutrition:{calories,protein:1,carbs:10,fat:1}}]});
test('spoken decimals, hundreds, fractions, separate foods and cooking qualifiers survive parsing',()=>{
 const rows=voiceIngredients('I had two bananas and one hundred and fifty grams of Kirkland blueberries, 200.5 grams Greek yogurt and half a cup of milk');
 assert.deepEqual(rows.map(r=>[r.name,r.amount,r.unit]),[['bananas',2,'item'],['Kirkland blueberries',150,'g'],['Greek yogurt',200.5,'g'],['milk',.5,'cup']]);
 assert.equal(voiceIngredients('one and a half cups milk')[0].amount,1.5);
 assert.equal(voiceIngredients('200 grams chicken breast cooked')[0].name,'chicken breast cooked');
});
test('matching rejects a wrong brand or a composite food rather than guessing',()=>{
 const query=voiceIngredients('100 grams Kirkland blueberries')[0];
 assert.equal(accurateVoiceMatch(query,[food('Blueberries','Other brand')]),null);
 assert.equal(accurateVoiceMatch(voiceIngredients('100 grams blueberries')[0],[food('Blueberry muffins')]),null);
 const chosen=food('Blueberries','Kirkland Signature');assert.equal(accurateVoiceMatch(query,[food('Blueberry muffins','Kirkland'),chosen]),chosen);
});
test('weight and volume requests without a conversion remain unresolved',()=>{
 const noMeasure={name:'Test',portions:[{label:'1 serving',nutrition:{calories:100}}]};
 assert.equal(voicePortion({amount:100,unit:'g'},noMeasure),null);
 assert.equal(voicePortion({amount:1,unit:'cup'},food('Blueberries')),null);
});
test('swapping a brand preserves entered mass and uses the replacement nutrition',()=>{
 const original=food('Blueberries','Wrong brand');
 const entry={name:'Blueberries',food:original,quantity:1.5,servingLabel:'100 g',voiceIngredient:{name:'blueberries',amount:100,unit:'g'}};
 const selection=replacementVoicePortion(entry,food('Blueberries','Correct brand',70));
 assert.equal(selection.quantity*selection.portion.grams,150);
 assert.ok(Math.abs(selection.quantity*selection.portion.nutrition.calories-105)<1e-8);
});
test('native speech finalizes once, and cancelled sessions ignore late transcription',async()=>{
 const old=globalThis.window;let listener,removed=0,cancelled=0;const ends=[],texts=[];
 const native={addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{removed++;}};},start:async()=>{},stop:async()=>{},cancel:async()=>{cancelled++;}};
 globalThis.window={Capacitor:{isNativePlatform:()=>true,Plugins:{LevelUpFoodSpeech:native}}};
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{language:'en-CA'}});
 try{
  let id;native.start=async args=>{id=args.sessionID;};
  const session=createFoodSpeechSession({onText:t=>texts.push(t),onEnd:t=>ends.push(t),onError:()=>{}});await session.start();
  listener({sessionID:id,transcript:'two bananas',final:false});listener({sessionID:id,transcript:'two bananas',final:true});listener({sessionID:id,transcript:'duplicate',final:true});
  assert.deepEqual(ends,['two bananas']);assert.equal(removed,1);
  const next=createFoodSpeechSession({onText:t=>texts.push(t),onEnd:t=>ends.push(t),onError:()=>{}});await next.start();next.abort();listener({sessionID:id,transcript:'late',final:true});
  assert.deepEqual(ends,['two bananas']);assert.equal(cancelled,1);assert.equal(texts.includes('late'),false);
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});

test('recording another batch retains reviewed items and unresolved foods, and unresolved foods block saving',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const {withFoodWeightUnits}=await import('../js/nutrition/food-portion-units.js');
 const {ingredientPortionSelection,parseIngredientText,chooseIngredientFood}=await import('../js/nutrition/ingredient-paste-parser.js');
 const source=readFileSync('js/nutrition/food-log.js','utf8');
 const start=source.indexOf('async function importPastedIngredients()');const end=source.indexOf('\nfunction compressMealPhoto(',start);
 const sandbox={AbortController,voiceIngredients,accurateVoiceMatch,ingredientPortionSelection,parseIngredientText,chooseIngredientFood,withFoodWeightUnits,withUsefulLiquidPortions:f=>f,selectedMeal:'Lunch',mealImportController:null,document:{querySelector:()=>null},renderMealBuilder(){},sessionToken:()=>null,matchingLoggedFoods:()=>[food('Blueberries')],createLogEntry:({food,portion,quantity,meal})=>({name:food.name,quantity,meal,food,nutrition:portion.nutrition}),mealDraft:{voiceMode:true,items:[{name:'Manually adjusted item',quantity:2}],importUnresolved:['Unmatched food'],pasteText:'100 g blueberries'}};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end)+'\nglobalThis.importBatch=importPastedIngredients;',sandbox);
 await sandbox.importBatch();assert.equal(sandbox.mealDraft.items.length,2);assert.equal(sandbox.mealDraft.items[0].quantity,2);assert.ok(sandbox.mealDraft.importUnresolved.includes('Unmatched food'));
 sandbox.mealDraft.pasteText='50 g blueberries';await sandbox.importBatch();assert.equal(sandbox.mealDraft.items.length,3);
 const saveStart=source.indexOf('function saveMealDraft()');const saveEnd=source.indexOf('\nfunction renderSavedMeals()',saveStart);let saves=0;
 sandbox.saveEntries=()=>{saves++;};vm.runInContext(source.slice(saveStart,saveEnd)+'\nglobalThis.save=saveMealDraft;',sandbox);sandbox.save();assert.equal(saves,0);
});

test('native speech source is registered once with unique Xcode object identifiers',async()=>{
 const {readFileSync}=await import('node:fs');
 const project=readFileSync('ios/App/App.xcodeproj/project.pbxproj','utf8');
 const ids=[...project.matchAll(/^\s*([A-F0-9]{24})(?:\s+\/\*.*?\*\/)?\s*=\s*\{\s*isa\s*=/gm)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 assert.match(project,/LevelUpFoodSpeechPlugin.swift in Sources/);
 assert.match(readFileSync('ios/App/App/LevelUpBridgeViewController.swift','utf8'),/registerPluginInstance\(LevelUpFoodSpeechPlugin\(\)\)/);
});

test('spoken counts use item counts rather than multiplying multi-item serving counts',()=>{
 const bread={name:'Bread',portions:[{label:'2 slices (70 g)',grams:70,nutrition:{calories:180}}]};
 const picked=voicePortion({name:'bread',amount:2,unit:'slice'},bread);
 assert.equal(picked.quantity*picked.portion.nutrition.calories,180);
 assert.equal(voicePortion({name:'blueberries',amount:2,unit:'item'},{name:'Blueberries',portions:[{label:'1 serving',nutrition:{calories:70}}]}),null);
});

test('speech lists split each new quantity without requiring and or punctuation',()=>{
 assert.deepEqual(voiceIngredients('two bananas 100 grams blueberries 200.5 grams Greek yogurt').map(i=>[i.name,i.amount,i.unit]),[['bananas',2,'item'],['blueberries',100,'g'],['Greek yogurt',200.5,'g']]);
 assert.deepEqual(voiceIngredients('100 grams blueberries two eggs').map(i=>i.name),['blueberries','eggs']);
});

test('native completed phrases are delivered once while later partials retain the full transcript',async()=>{
 const old=globalThis.window,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');let listener,id;const utterances=[],texts=[],ends=[];
 const native={addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{}};},start:async args=>{id=args.sessionID;},cancel:async()=>{}};
 globalThis.window={Capacitor:{isNativePlatform:()=>true,Plugins:{LevelUpFoodSpeech:native}}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{language:'en-CA'}});
 try{
  const session=createFoodSpeechSession({onText:t=>texts.push(t),onUtterance:t=>utterances.push(t),onEnd:(t,p)=>ends.push([t,p]),onError:()=>{}});await session.start();
  const first={sessionID:id,transcript:'two bananas',pendingTranscript:'',utteranceID:1,utteranceText:'two bananas',final:false};listener(first);listener(first);
  listener({sessionID:id,transcript:'two bananas; 100 grams blueberries',pendingTranscript:'100 grams blueberries',final:false});
  listener({sessionID:id,transcript:'two bananas; 100 grams blueberries',pendingTranscript:'100 grams blueberries',final:true});
  assert.deepEqual(utterances,['two bananas']);assert.equal(texts.at(-1),'two bananas; 100 grams blueberries');assert.deepEqual(ends,[['two bananas; 100 grams blueberries','100 grams blueberries']]);
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});

test('voice queue processes completed phrases in order and retains their visible history',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');const source=readFileSync('js/nutrition/food-log.js','utf8');
 const begin=source.indexOf('function queueVoiceFoods('),end=source.indexOf('\nfunction voiceReviewMarkup()',begin);let release;
 const draft={voiceMode:true,voiceHistory:[],voiceQueue:[],voiceQueueRunning:false,items:[],importUnresolved:[]};let calls=0;
 const sandbox={mealDraft:draft,voiceIngredients,renderMealBuilder(){},async importPastedIngredients(){calls++;if(calls===1)await new Promise(r=>{release=r;});draft.items.push(draft.pasteText);}};
 vm.createContext(sandbox);vm.runInContext(source.slice(begin,end)+'\nglobalThis.enqueue=queueVoiceFoods;',sandbox);
 sandbox.enqueue('two bananas');sandbox.enqueue('100 grams blueberries');assert.equal(calls,1);assert.equal(draft.voiceHistory.length,2);release();
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,2);assert.equal(draft.items.length,2);assert.equal(draft.voiceQueueRunning,false);assert.deepEqual(draft.voiceHistory.map(h=>h.text),['two bananas','100 grams blueberries']);
});

test('voice review uses the manual meal row with no injected image or extra action footer',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');const source=readFileSync('js/nutrition/food-log.js','utf8');
 const start=source.indexOf('function mealItemDetailsMarkup('),end=source.indexOf('\nfunction bindMealItemDetails(',start);
 const sandbox={withFoodWeightUnits:f=>f,withUsefulLiquidPortions:f=>f,mealFoodForEntry:e=>e.food,escapeHtml:s=>String(s),totalServingLabel:()=> '100 g',foodAmountMarkup:()=>'<div>Amount editor</div>',foodMacroBreakdown:()=> 'Macros'};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end)+'\nglobalThis.row=mealItemDetailsMarkup;',sandbox);
 const entry={name:'Blueberries',brand:'Example brand',quantity:1,servingLabel:'100 g',nutrition:{calories:57},food:food('Blueberries')};
 const manual=sandbox.row(entry,0),voice=sandbox.row(entry,0,{allowSwap:true});
 assert.equal(voice.replace('<button type="button" class="food-builder-item-swap" data-voice-swap="0">Swap food</button>',''),manual);
 assert.doesNotMatch(voice,/<img|food-voice-item|food-voice-thumb/);
 assert.match(voice,/<summary><span>.*<\/span><b>57 kcal<\/b><i /);
 assert.doesNotMatch(voice,/food-builder-item-editor|data-meal-item-save/);
 assert.match(source,/renderFoodPortionPanel\(mealFoodForEntry\(entry\)\)/);
 assert.doesNotMatch(source,/voiceItemMarkup|data-voice-edit|data-voice-remove/);
});

test('opening a meal item uses full food details and restores its quantity without focusing an input',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');const source=readFileSync('js/nutrition/food-log.js','utf8');
 const a=source.indexOf('function openMealItemEditor('),b=source.indexOf('\nfunction bindMealItemDetails(',a);let blurred=0,restored;
 const entry={quantity:1.4,servingLabel:'100 g',food:food('Blueberries'),voiceIngredient:{name:'blueberries',amount:140,unit:'g'}};
 const panel={setAttribute(){this.hidden=true;}};
 const sandbox={mealDraft:{items:[entry]},selectedFood:null,mealFoodForEntry:e=>e.food,document:{querySelector:()=>panel},dismissFoodKeyboard:()=>blurred++,renderFoodPortionPanel:f=>{sandbox.selectedFood=f;},restoreFoodAmount:(root,f,i,q)=>{restored={i,q};},updatePortionPreview(){}};
 vm.createContext(sandbox);vm.runInContext(source.slice(a,b)+'\nglobalThis.open=openMealItemEditor;',sandbox);sandbox.open(0);
 assert.equal(sandbox.addContext,'meal-builder');assert.equal(sandbox.editingMealItemIndex,0);assert.equal(panel.hidden,true);assert.equal(blurred,1);assert.equal(restored.i,0);assert.equal(restored.q,1.4);
});

test('opening the food sheet never schedules text-field focus',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');const source=readFileSync('js/nutrition/food-log.js','utf8');
 const a=source.indexOf('function openFoodSheet('),b=source.indexOf('\nfunction closeFoodSheet(',a);let focused=0;
 const node={setAttribute(){},focus(){focused++;},hidden:true};
 const sandbox={MEALS:['Dinner'],document:{querySelector:()=>node,body:{classList:{add(){}}}},selectTargetMeal(){},renderRecents(){},renderSavedMeals(){},renderCustomFoods(){},showFoodMode(){},window:{setTimeout:fn=>fn()}};
 vm.createContext(sandbox);vm.runInContext(source.slice(a,b)+'\nglobalThis.open=openFoodSheet;',sandbox);sandbox.open('Dinner');assert.equal(focused,0);
 const render=source.slice(source.indexOf('function renderFoodPortionPanel('),source.indexOf('\nfunction updatePortionPreview(',source.indexOf('function renderFoodPortionPanel(')));
 assert.doesNotMatch(render,/input[^\n]*\.focus|setTimeout/);assert.match(render,/dismissFoodKeyboard\(\)/);
});
