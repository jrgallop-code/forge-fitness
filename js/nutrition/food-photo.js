// Match the named food, never a broad API category. Unknown items use a neutral placeholder.
const rules = [
 [/\b(?:chicken\s+)?(?:burger|hamburger|cheeseburger)s?\b/i, 9],
 [/\bblueberr(?:y|ies)\b/i, 16], [/\bstrawberr(?:y|ies)\b/i, 17],
 [/\bbananas?\b/i, 18], [/\bapples?\b/i, 19],
 [/\b(?:cheddar|hard cheese)\b/i, 20], [/\b(?:oatmeal|porridge|cooked oats)\b/i, 21],
 [/\b(?:shrimp|prawns?)\b/i, 22], [/\b(?:black coffee|coffee, brewed|brewed coffee)\b/i, 23],
 [/\b(?:whole|skim|skimmed|2%|1%|cow'?s?)\s+milk\b/i, 24],
 [/\bchicken\s+breasts?\b/i, 0], [/\b(?:beef steak|steak|sirloin|ribeye)\b/i, 1],
 [/\bsalmon\b/i, 2], [/\b(?:eggs?|fried eggs?)\b/i, 3],
 [/\b(?:white rice|rice, white|cooked rice)\b/i, 4], [/\bspaghetti\b/i, 5],
 [/\b(?:bread|toast)\b/i, 6], [/\b(?:mixed fruit|fruit salad)\b/i, 7],
 [/\bmixed vegetables?\b/i, 8], [/\b(?:plain|greek)\s+yo(?:gurt|ghurt)\b/i, 10],
 [/\bmixed nuts\b/i, 11], [/\bolive oil\b/i, 12],
 [/\blemon water\b/i, 13], [/\bchocolate chip cookies?\b/i, 14]
];
export function foodPhotoIndex(food = {}) {
 const name = String(food.name || '').trim();
 // These preparations/composite foods need their own photos; a named ingredient is insufficient.
 if (/\b(?:powder|supplement|protein bar|protein shake|smoothie|muffin|cake|pie|wrap|sandwich|pizza|nuggets?|breaded|sauce|juice|jam|jelly|flavou?red)\b/i.test(name)) return null;
 if (/\braw\b/i.test(name) && /\b(?:chicken|beef|steak|salmon|eggs?|shrimp)\b/i.test(name)) return null;
 if (/\b(?:blueberr(?:y|ies)|strawberr(?:y|ies)|bananas?|apples?)\b/i.test(name) && /\b(?:yogurt|yoghurt|milk|oatmeal|bread|cereal|ice cream)\b/i.test(name)) return null;
 const matches=rules.filter(([pattern]) => pattern.test(name));
 return matches.length===1 ? matches[0][1] : null;
}
