// Original bundled category photos; never claim to depict an exact branded product.
const rules=[
 [/\b(burger|hamburger)\b/i,9], [/\b(pasta|spaghetti|noodle|macaroni)\b/i,5],
 [/\b(chicken|turkey|poultry|duck)\b/i,0], [/\b(beef|steak|pork|ham|bacon|sausage)\b/i,1],
 [/\b(fish|salmon|tuna|cod|haddock|shrimp|seafood)\b/i,2], [/\b(egg|eggs|omelet|omelette)\b/i,3],
 [/\b(rice|quinoa|barley|grain)\b/i,4], [/\b(bread|toast|bagel|bun|tortilla)\b/i,6],
 [/\b(apple|banana|orange|berry|berries|fruit|grape|melon|peach|pear)\b/i,7],
 [/\b(vegetable|salad|broccoli|spinach|carrot|pepper|tomato|potato|corn|bean|lentil)\b/i,8],
 [/\b(yogurt|yoghurt|milk|cheese|cream|dairy)\b/i,10], [/\b(nut|nuts|almond|peanut|cashew|walnut)\b/i,11],
 [/\b(oil|butter|margarine)\b/i,12], [/\b(water|drink|juice|coffee|tea|shake|soda)\b/i,13],
 [/\b(cookie|chocolate|cake|snack|bar|biscuit)\b/i,14]
];
export function foodPhotoIndex(food={}) {
 const name=String(food.name || '');
 // Do not let a broad category override a more specific food name.
 return rules.find(([pattern])=>pattern.test(name))?.[1] ?? rules.find(([pattern])=>pattern.test(String(food.category || food.categories || '')))?.[1] ?? 15;
}
export function photoPosition(index, columns=4) {
 return `${(index%columns)*100/(columns-1)}% ${Math.floor(index/columns)*100/(columns-1)}%`;
}
