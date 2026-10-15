import { withCountedFoodPortions } from "./food-counted-portions.js";
// Local portion normalization: never requires a food API round-trip.
const OZ = 28.349523125;
const scale = (nutrition, factor) => Object.fromEntries(['calories','protein','carbs','fat','fiber'].map(key => [key, Math.max(0, Number(nutrition?.[key]) || 0) * factor]));
export function portionMeasure(portion, kind) {
    const stored = Number(portion?.[kind]);
    if (stored > 0 && Number.isFinite(stored)) return stored;
    const label = String(portion?.label || '');
    const match = label.match(kind === 'grams' ? /(?:^|[\s(])(\d+(?:\.\d+)?)\s*(kg|g|oz|lb)\b/i : /(?:^|[\s(])(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
    if (!match) return 0;
    const units = { g:1, kg:1000, oz:OZ, lb:OZ*16, ml:1, l:1000 };
    return Number(match[1]) * units[match[2].toLowerCase()];
}
export function withFoodWeightUnits(food) {
    let portions = (food?.portions || []).map(p => ({...p,
        ...(portionMeasure(p,'grams') ? {grams:portionMeasure(p,'grams')} : {}),
        ...(portionMeasure(p,'milliliters') ? {milliliters:portionMeasure(p,'milliliters')} : {})}));
    portions = withCountedFoodPortions({...food,portions}).portions;
    for (const [kind, measures] of [
        ['grams', [['1 g',1,'g'], ['1 oz',OZ,'oz'], ['1 lb',OZ*16,'lb']]],
        ['milliliters', [['1 mL',1,'mL']]]
    ]) {
        const basis = portions.find(p => portionMeasure(p,kind) > 0 && p.nutrition);
        if (!basis) continue;
        for (const [label, size, unit] of measures) {
            const existing = portions.find(p => p.label.toLowerCase() === label.toLowerCase());
            if (existing) { existing.inputUnit=unit; continue; }
            const factor = size/portionMeasure(basis,kind);
            const bridge = kind === 'grams' ? 'milliliters' : 'grams';
            portions.push({label, [kind]:size, inputUnit:unit,
                ...(portionMeasure(basis,bridge)>0 ? {[bridge]:portionMeasure(basis,bridge)*factor} : {}),
                nutrition:scale(basis.nutrition,factor)});
        }
    }
    return {...food, portions};
}
export function convertPortionAmount(amount, from, to, {preserveCount=true}={}) {
    if (from === to) return amount;
    if (preserveCount && from?.countUnit && from.countUnit===to?.countUnit && from.count>0 && to.count>0) return amount*from.count/to.count;
    for (const kind of ['grams','milliliters']) {
        const a=portionMeasure(from,kind), b=portionMeasure(to,kind);
        if (a>0 && b>0) return amount*a/b;
    }
    return null; // No invented slice weights or density assumptions.
}
export function directPortionSelection(food, index=0, quantity=1) {
    const portion=food.portions[index];
    if (portion?.count>1) {
        const oneIndex=food.portions.findIndex(p=>p.count===1 && p.countUnit===portion.countUnit && p.countSize===portion.countSize);
        if(oneIndex>=0)return {index:oneIndex,quantity:quantity*portion.count};
    }
    // Prefer an explicit one-item count for eggs when opening a mass-based source portion.
    if (food.portions.some(p=>p.countUnit==='egg') && /^\d+(?:\.\d+)?\s*g$/i.test(portion?.label || '')) {
        const eggIndex=food.portions.findIndex(p=>p.countUnit==='egg'&&p.count===1&&p.countSize==='large'&&Number(p.grams)>0);
        if(eggIndex>=0 && Number(portion.grams)>0)return {index:eggIndex,quantity:quantity*portion.grams/food.portions[eggIndex].grams};
    }
    // A database's 100 g basis is not a useful user-facing amount unit.
    if (/^100\s*g$/i.test(portion?.label || '')) {
        const gramsIndex=food.portions.findIndex(p=>p.inputUnit==='g');
        if(gramsIndex>=0) return {index:gramsIndex, quantity:quantity*100};
    }
    return {index,quantity};
}
export function validFoodAmount(value) {
    if (String(value).trim()==='') return false;
    const n=Number(value);
    return Number.isFinite(n) && n>=.01 && n<=10000;
}

export function formatConvertedPortionAmount(value, portion) {
    // Weight/volume entry uses useful precision; source text is retained separately for round trips.
    const decimals = ['g', 'mL'].includes(portion?.inputUnit) ? 2 : 4;
    return Number(Number(value).toFixed(decimals)).toString();
}
