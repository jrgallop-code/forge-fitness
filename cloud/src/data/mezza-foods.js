// Complete Mezza Lebanese Kitchen nutrition chart, updated May 2026.
// Values are transcribed from Mezza's official chart. Keep every nutrient exact;
// do not infer, average, or back-calculate macros from calories.
const SOURCE_URL = "https://static1.squarespace.com/static/6272b45a3197ec4398631b6e/t/6a03732cf82d066a2813c461/1778610988244/Mezza_NutritionChart-May-2026.pdf";

export const MEZZA_FOODS = [
    // Wraps
    row("regular-chimi-tahini-steak-wrap", "Regular Chimi-Tahini Steak Wrap", "Wraps", "1 regular wrap (286 g)", 286, 360, 21, 29, 17, 4),
    row("large-chimi-tahini-steak-wrap", "Large Chimi-Tahini Steak Wrap", "Wraps", "1 large wrap (403 g)", 403, 560, 32, 43, 29, 5),
    row("regular-chicken-shawarma-wrap", "Regular Chicken Shawarma Wrap", "Wraps", "1 regular wrap (280 g)", 280, 470, 27, 25, 30, 3),
    row("large-chicken-shawarma-wrap", "Large Chicken Shawarma Wrap", "Wraps", "1 large wrap (441 g)", 441, 810, 40, 42, 54, 5),
    row("regular-souvlaki-wrap", "Regular Souvlaki Wrap", "Wraps", "1 regular wrap (274 g)", 274, 410, 25, 27, 23, 4),
    row("large-souvlaki-wrap", "Large Souvlaki Wrap", "Wraps", "1 large wrap (447 g)", 447, 710, 47, 43, 40, 5),
    row("regular-falafel-wrap", "Regular Falafel Wrap", "Wraps", "1 regular wrap (334 g)", 334, 380, 13, 62, 10, 7),
    row("large-falafel-wrap", "Large Falafel Wrap", "Wraps", "1 large wrap (521 g)", 521, 610, 21, 95, 18, 10),
    row("regular-donair-wrap", "Regular Donair Wrap", "Wraps", "1 regular wrap (276 g)", 276, 560, 31, 35, 34, 2),
    row("large-donair-wrap", "Large Donair Wrap", "Wraps", "1 large wrap (387 g)", 387, 790, 45, 56, 46, 2),

    // Plates with fries
    row("shawarma-plate-fries", "Shawarma Plate with Fries", "Plates with fries", "1 plate (726 g)", 726, 1840, 50, 141, 120, 15),
    row("souvlaki-plate-one-fries", "Souvlaki Plate (1 Skewer) with Fries", "Plates with fries", "1 plate (564 g)", 564, 1360, 35, 128, 81, 11),
    row("souvlaki-plate-two-fries", "Souvlaki Plate (2 Skewers) with Fries", "Plates with fries", "1 plate (614 g)", 614, 1490, 51, 129, 88, 12),
    row("falafel-plate-fries", "Falafel Plate with Fries", "Plates with fries", "1 plate (741 g)", 741, 1620, 33, 191, 84, 18),
    row("donair-plate-fries", "Donair Plate with Fries", "Plates with fries", "1 plate (674 g)", 674, 1530, 37, 144, 94, 12),
    row("mixed-grill-plate-fries", "Mixed Grill Plate with Fries", "Plates with fries", "1 plate (734 g)", 734, 1730, 72, 142, 99, 14),
    row("chimi-tahini-steak-plate-fries", "Chimi-Tahini Steak Plate with Fries", "Plates with fries", "1 plate (696 g)", 696, 1540, 42, 140, 92, 14),

    // Plates with rice
    row("shawarma-plate-rice", "Shawarma Plate with Rice", "Plates with rice", "1 plate (698 g)", 698, 1440, 47, 97, 96, 8),
    row("souvlaki-plate-one-rice", "Souvlaki Plate (1 Skewer) with Rice", "Plates with rice", "1 plate (536 g)", 536, 970, 31, 84, 57, 5),
    row("souvlaki-plate-two-rice", "Souvlaki Plate (2 Skewers) with Rice", "Plates with rice", "1 plate (586 g)", 586, 1100, 47, 84, 63, 5),
    row("falafel-plate-rice", "Falafel Plate with Rice", "Plates with rice", "1 plate (713 g)", 713, 1230, 28, 147, 59, 11),
    row("donair-plate-rice", "Donair Plate with Rice", "Plates with rice", "1 plate (646 g)", 646, 1140, 32, 100, 69, 5),
    row("mixed-grill-plate-rice", "Mixed Grill Plate with Rice", "Plates with rice", "1 plate (706 g)", 706, 1340, 67, 98, 75, 7),
    row("chimi-tahini-steak-plate-rice", "Chimi-Tahini Steak Plate with Rice", "Plates with rice", "1 plate (668 g)", 668, 1150, 37, 96, 67, 8),

    // Bowls
    row("sriracha-chicken-protein-bowl", "Sriracha Chicken Protein Bowl", "Bowls", "1 bowl (565 g)", 565, 720, 33, 70, 35, 9),
    row("shawarma-bowl", "Shawarma Bowl", "Bowls", "1 bowl (753 g)", 753, 1190, 40, 90, 76, 13),
    row("lebanese-vegan-bowl", "Lebanese Vegan Bowl", "Bowls", "1 bowl (757 g)", 757, 990, 22, 121, 50, 15),
    row("chimi-tahini-steak-bowl", "Chimi-Tahini Steak Bowl", "Bowls", "1 bowl (738 g)", 738, 790, 35, 87, 34, 11),

    // Lunch plates
    row("donair-lunch-plate", "Donair Lunch Plate", "Lunch plates", "1 lunch plate (552 g)", 552, 1280, 35, 158, 61, 12),
    row("falafel-lunch-plate", "Falafel Lunch Plate", "Lunch plates", "1 lunch plate (465 g)", 465, 840, 19, 75, 53, 7),
    row("chicken-souvlaki-lunch-plate", "Chicken Souvlaki Lunch Plate", "Lunch plates", "1 lunch plate (337 g)", 337, 670, 25, 13, 59, 3),
    row("chicken-shawarma-lunch-plate", "Chicken Shawarma Lunch Plate", "Lunch plates", "1 lunch plate (539 g)", 539, 990, 32, 93, 53, 4),
    row("steak-lunch-plate", "Steak Lunch Plate", "Lunch plates", "1 lunch plate (582 g)", 582, 790, 30, 98, 31, 10),

    // Poutines
    row("classic-poutine-regular", "Classic Poutine - Regular", "Poutines", "1 regular poutine (566 g)", 566, 1140, 25, 153, 51, 11),
    row("classic-poutine-large", "Classic Poutine - Large", "Poutines", "1 large poutine (818 g)", 818, 1650, 41, 210, 78, 15),
    row("shawarma-poutine-regular", "Shawarma Poutine - Regular", "Poutines", "1 regular poutine (664 g)", 664, 1480, 48, 154, 78, 12),
    row("shawarma-poutine-large", "Shawarma Poutine - Large", "Poutines", "1 large poutine (1025 g)", 1025, 2400, 75, 232, 136, 18),
    row("donair-poutine-regular", "Donair Poutine - Regular", "Poutines", "1 regular poutine (716 g)", 716, 1400, 41, 165, 70, 12),
    row("donair-poutine-large", "Donair Poutine - Large", "Poutines", "1 large poutine (1086 g)", 1086, 2150, 63, 251, 107, 18),

    // Salads
    row("fattoush-regular", "Fattoush Salad - Regular", "Salads", "1 regular salad (236 g)", 236, 420, 5, 20, 37, 2),
    row("fattoush-large", "Fattoush Salad - Large", "Salads", "1 large salad (372 g)", 372, 790, 7, 32, 72, 4),
    row("fattoush-side", "Fattoush Salad - Side", "Salads", "1 side salad (152 g)", 152, 370, 3, 12, 35, 2),
    row("greek-regular", "Greek Salad - Regular", "Salads", "1 regular salad (230 g)", 230, 470, 7, 8, 47, 2),
    row("greek-large", "Greek Salad - Large", "Salads", "1 large salad (362 g)", 362, 870, 10, 12, 90, 4),
    row("greek-side", "Greek Salad - Side", "Salads", "1 side salad (166 g)", 166, 420, 4, 5, 43, 2),
    row("taboule-salad", "Taboule Salad", "Salads", "1 serving (150 g)", 150, 200, 3, 10, 18, 3),

    // Desserts and extras
    row("crunch-bar", "Crunch Bar", "Desserts & extras", "1 bar (40 g)", 40, 185, 2, 17, 12, 0.5),
    row("baklava", "Baklava", "Desserts & extras", "1 piece (24 g)", 24, 120, 2, 12, 7, 0),
    row("grape-leaves-two", "Grape Leaves (2)", "Desserts & extras", "2 pieces (90 g)", 90, 70, 3, 7, 3, 1),

    // Sauces
    row("garlic-sauce", "Garlic Sauce", "Sauces", "1 serving (30 g)", 30, 190, 0, 0, 21, 0),
    row("donair-sauce", "Donair Sauce", "Sauces", "1 serving (30 g)", 30, 40, 1, 7, 1, 0),
    row("chimi-tahini-sauce", "Chimi-Tahini Sauce", "Sauces", "1 serving (30 g)", 30, 90, 3, 2, 8, 0),
    row("sriracha-garlic-sauce", "Sriracha Garlic Sauce", "Sauces", "1 serving (30 g)", 30, 160, 0, 1, 17, 0),
    row("hummus", "Hummus", "Sauces", "1 serving (30 g)", 30, 60, 2, 3, 4, 1),
    row("tahini", "Tahini", "Sauces", "1 serving (30 g)", 30, 80, 3, 2, 6, 0),
    row("tzatziki-sauce", "Tzatziki Sauce", "Sauces", "1 serving (30 g)", 30, 40, 1, 2, 2.5, 0),
    row("gravy", "Gravy", "Sauces", "1 serving (30 g)", 30, 10, 0, 2, 0, 0),
    row("fattoush-dressing", "Fattoush Dressing", "Sauces", "1 serving (30 g)", 30, 170, 0, 1, 18, 0),
    row("greek-dressing", "Greek Dressing", "Sauces", "1 serving (30 g)", 30, 190, 0, 1, 21, 0),

    // Sides
    row("white-rice", "White Rice", "Sides", "1 serving (375 g)", 375, 450, 9, 91, 3, 3),
    row("brown-rice", "Brown Rice", "Sides", "1 serving (375 g)", 375, 420, 9, 89, 5, 8),
    row("french-fries", "French Fries", "Sides", "1 serving (225 g)", 225, 270, 5, 55, 2, 2),
    row("regular-pita", "Pita - Regular", "Sides", "1 regular pita (38 g)", 38, 90, 3, 19, 0.5, 1),
    row("large-pita", "Pita - Large", "Sides", "1 large pita (60 g)", 60, 140, 5, 30, 0.5, 1),

    // Protein portions
    row("shawarma-protein", "Shawarma Protein", "Protein", "1 serving (100 g)", 100, 250, 32, 1, 12, 1),
    row("souvlaki-protein-two", "Souvlaki Protein (2)", "Protein", "2 pieces (100 g)", 100, 260, 32, 1, 13, 1),
    row("donair-protein", "Donair Protein", "Protein", "1 serving (100 g)", 100, 280, 18, 4, 22, 0),
    row("steak-protein", "Steak Protein", "Protein", "1 serving (100 g)", 100, 180, 16, 1, 12, 1),
    row("falafel-protein-two", "Falafel Protein (2)", "Protein", "2 pieces (100 g)", 100, 180, 5, 34, 3, 3),

    // Toppings
    row("feta-cheese", "Feta Cheese", "Toppings", "1 serving (16 g)", 16, 40, 3, 1, 3.5, 0),
    row("cheese-curds", "Cheese Curds (Regular Poutine)", "Toppings", "1 serving (42 g)", 42, 160, 10, 1, 13, 0),
    row("olives", "Olives", "Toppings", "1 serving (16 g)", 16, 20, 0, 1, 2, 0),
    row("lettuce", "Lettuce", "Toppings", "1 serving (30 g)", 30, 4, 0, 1, 0, 0),
    row("tomatoes", "Tomatoes", "Toppings", "1 serving (40 g)", 40, 10, 0, 2, 0, 0),
    row("pickled-turnips", "Pickled Turnips", "Toppings", "1 serving (18 g)", 18, 8, 0, 2, 0, 0),
    row("hot-peppers", "Hot Peppers", "Toppings", "1 serving (20 g)", 20, 0, 0, 1, 0, 0),
    row("fried-chickpeas", "Fried Chickpeas", "Toppings", "1 serving (25 g)", 25, 40, 1, 3, 2.5, 1),
    row("kale", "Kale", "Toppings", "1 serving (25 g)", 25, 10, 1, 2, 0, 1),
    row("onions", "Onions", "Toppings", "1 serving (20 g)", 20, 10, 0, 2, 0, 0),
    row("pita-chips", "Pita Chips", "Toppings", "1 serving (30 g)", 30, 90, 3, 14, 2.5, 0),
    row("purple-cabbage", "Purple Cabbage", "Toppings", "1 serving (25 g)", 25, 10, 0, 1, 0, 0),
    row("cucumber", "Cucumber", "Toppings", "1 serving (40 g)", 40, 10, 0, 1, 0, 0),
    row("radish", "Radish", "Toppings", "1 serving (18 g)", 18, 0, 0, 1, 0, 0),
    row("pickles", "Pickles", "Toppings", "1 serving (20 g)", 20, 0, 0, 0, 0, 0)
];

function row(id, name, menuSection, label, grams, calories, protein, carbs, fat, fiber) {
    return {
        id: `mezza-ca-${id}`,
        name,
        brand: "Mezza Lebanese Kitchen",
        aliases: `mezza mezza lebanese kitchen restaurant canada ${menuSection}`,
        menuSection,
        label,
        grams,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        nutritionScope: "full",
        countryCode: "CA",
        sourceName: "Mezza Lebanese Kitchen official nutrition chart",
        sourceUrl: SOURCE_URL
    };
}
