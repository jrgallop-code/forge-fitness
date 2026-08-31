// Popular Canadian restaurant foods verified against each chain's official nutrition pages.
// A&W pages expose calories but not a complete macro panel, so those records deliberately
// remain calories-only rather than filling missing nutrients with estimates.
export const CANADIAN_CHAIN_EXPANSION = [
    ...aw([
        item("teen-burger", "Teen Burger", "1 burger", 500, "https://web.aw.ca/en/our-menu/burgers/teen-burger"),
        item("mozza-burger", "Mozza Burger", "1 burger", 620, "https://web.aw.ca/en/our-menu/burgers/mozza-burger"),
        item("mama-burger", "Mama Burger", "1 burger", 400, "https://web.aw.ca/en/our-menu/burgers/mama-burger"),
        item("baby-burger", "Baby Burger", "1 burger", 240, "https://web.aw.ca/en/our-menu/burgers/baby-burger"),
        item("double-buddy-burger", "Double Buddy Burger", "1 burger", 435, "https://web.aw.ca/en/our-menu/burgers/double-buddy-burger"),
        item("cheddar-bacon-uncle-burger", "Cheddar Bacon Uncle Burger", "1 burger", 740, "https://web.aw.ca/en/our-menu/burgers/cheddar-bacon-uncle-burger"),
        item("chubby-chicken-burger", "Chubby Chicken Burger", "1 burger", 490, "https://web.aw.ca/en/our-menu/chicken/chubby-chicken-burger"),
        item("double-chicken-buddy-burger", "Double Chicken Buddy Burger", "1 burger", 480, "https://web.aw.ca/en/our-menu/chicken/double-chicken-buddy-burger"),
        item("spicy-habanero-chicken-burger", "Spicy Habanero Chicken Burger", "1 burger", 550, "https://web.aw.ca/en/our-menu/chicken/spicy-habanero-chicken-burger"),
        item("onion-rings", "Onion Rings", "1 order", 520, "https://web.aw.ca/en/our-menu/sides/onion-rings"),
        item("russet-thick-cut-fries", "Russet Thick-Cut Fries", "1 order", 340, "https://web.aw.ca/en/our-menu/sides/russet-thick-cut-fries"),
        item("bacon-egger", "Bacon & Egger English Muffin", "1 sandwich", 400, "https://web.aw.ca/en/our-menu/breakfast/bacon-egger"),
        item("sausage-egger", "Sausage & Egger English Muffin", "1 sandwich", 530, "https://web.aw.ca/en/our-menu/breakfast/sausage-egger"),
        item("breakfast-wrap", "Breakfast Wrap", "1 wrap", 230, "https://web.aw.ca/en/our-menu/breakfast/breakfast-wrap"),
        item("all-canadian-special", "All-Canadian Special", "1 meal", 860, "https://web.aw.ca/en/our-menu/breakfast/all-canadian-special")
    ]),
    ...harveys([
        full("angus-burger", "Angus Burger", "1 burger (157 g)", 157, 410, 18, 32, 23, 1),
        full("angus-burger-cheese", "Angus Burger with Cheese", "1 burger (174 g)", 174, 470, 21, 34, 27, 1),
        full("angus-burger-cheese-bacon", "Angus Burger with Cheese and Bacon", "1 burger (187 g)", 187, 520, 25, 35, 31, 1),
        full("original-burger", "Original Burger", "1 burger (145 g)", 145, 380, 17, 33, 20, 1),
        full("original-burger-cheese", "Original Burger with Cheese", "1 burger (162 g)", 162, 440, 20, 35, 24, 1),
        full("original-burger-cheese-bacon", "Original Burger with Cheese and Bacon", "1 burger (175 g)", 175, 490, 25, 35, 28, 1),
        full("junior-burger", "Junior Burger", "1 burger (93 g)", 93, 250, 10, 27, 11, 1),
        full("junior-burger-cheese", "Junior Burger with Cheese", "1 burger (110 g)", 110, 300, 13, 29, 15, 1),
        full("big-harv-angus", "Big Harv - Angus", "1 burger (281 g)", 281, 750, 36, 39, 50, 2),
        full("big-harv-original", "Big Harv - Original", "1 burger (257 g)", 257, 690, 35, 39, 44, 1),
        full("veggie-burger", "Veggie Burger", "1 burger (142 g)", 142, 330, 20, 32, 14, 4),
        full("buffalo-chicken-sandwich", "Buffalo Chicken Sandwich", "1 sandwich (279 g)", 279, 660, 25, 66, 33, 2),
        full("chicken-strips-2", "Chicken Strips - 2 Piece", "2 pieces (87 g)", 87, 200, 12, 15, 11, 1),
        full("chicken-strips-4", "Chicken Strips - 4 Piece", "4 pieces (175 g)", 175, 400, 23, 29, 22, 2),
        full("crispy-chicken-sandwich", "Crispy Chicken Sandwich", "1 sandwich (212 g)", 212, 560, 25, 51, 29, 2),
        full("crispy-chicken-wrap", "Crispy Chicken Wrap", "1 wrap (251 g)", 251, 700, 27, 70, 36, 3),
        full("grilled-chicken-salad", "Grilled Chicken Salad", "1 salad (528 g)", 528, 180, 26, 16, 3, 5),
        full("grilled-chicken-sandwich", "Grilled Chicken Sandwich", "1 sandwich (169 g)", 169, 270, 28, 29, 5, 2),
        full("grilled-chicken-wrap", "Grilled Chicken Wrap", "1 wrap (208 g)", 208, 420, 30, 49, 13, 2),
        full("hot-dog", "Hot Dog", "1 hot dog (147 g)", 147, 340, 17, 37, 14, 2),
        full("junior-crispy-chicken", "Junior Crispy Chicken", "1 sandwich (118 g)", 118, 290, 13, 33, 12, 1),
        full("entree-salad-crispy-chicken", "Entrée Salad with Crispy Chicken", "1 salad (571 g)", 571, 460, 23, 36, 26, 7),
        full("chicken-nuggets-5", "Chicken Nuggets - 5 Piece", "5 pieces (121 g)", 121, 330, 15, 16, 23, 1),
        full("chicken-nuggets-8", "Chicken Nuggets - 8 Piece", "8 pieces (194 g)", 194, 530, 24, 25, 37, 1),
        full("classic-poutine-regular", "Classic Poutine - Regular", "1 order (308 g)", 308, 700, 22, 73, 36, 7),
        full("fries-regular", "Fries - Regular", "1 order (154 g)", 154, 430, 6, 65, 18, 6)
    ])
];

function item(id, name, label, calories, sourceUrl) {
    return { id, name, label, calories, protein: 0, carbs: 0, fat: 0, fiber: 0, sourceUrl };
}

function full(id, name, label, grams, calories, protein, carbs, fat, fiber) {
    return { id, name, label, grams, calories, protein, carbs, fat, fiber };
}

function aw(foods) {
    return foods.map(food => ({ ...food, id: `aw-ca-${food.id}`, brand: "A&W Canada", countryCode: "CA", aliases: "a&w aw canada restaurant popular menu", sourceName: "A&W Canada official menu" }));
}

function harveys(foods) {
    return foods.map(food => ({ ...food, id: `harveys-ca-${food.id}`, brand: "Harvey's", countryCode: "CA", aliases: "harveys canada restaurant popular menu", sourceName: "Harvey's official nutrition", sourceUrl: "https://www.harveys.ca/en/nutrition.html" }));
}
