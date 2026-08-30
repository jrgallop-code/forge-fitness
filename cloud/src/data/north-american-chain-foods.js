// Popular foods from major North American restaurant chains.
// Each record is tied to the restaurant's current official nutrition page or guide.
export const NORTH_AMERICAN_CHAIN_FOODS = [
    ...chain("Starbucks", "starbucks", "https://www.starbucks.com/menu", [
        food("caffe-latte-grande", "Caffè Latte - Grande", "1 grande (16 fl oz)", 190, 13, 19, 7),
        food("caramel-macchiato-grande", "Caramel Macchiato - Grande", "1 grande (16 fl oz)", 250, 10, 35, 7),
        food("chocolate-cake-pop", "Chocolate Cake Pop", "1 piece", 150, 2, 18, 8)
    ]),
    ...chain("Chick-fil-A", "chick-fil-a", "https://www.chick-fil-a.com/nutrition-allergens", [
        food("chicken-sandwich", "Chick-fil-A Chicken Sandwich", "1 sandwich", 420, 29, 41, 18, 1),
        food("nuggets-8-count", "Chick-fil-A Nuggets - 8 Count", "8 nuggets", 250, 27, 11, 11, 0),
        food("waffle-fries-medium", "Waffle Potato Fries - Medium", "1 medium order", 420, 5, 45, 24, 5)
    ]),
    ...chain("Taco Bell", "taco-bell", "https://www.tacobell.com/nutrition/info", [
        food("crunchy-taco", "Crunchy Taco", "1 taco", 170),
        food("crunchwrap-supreme", "Crunchwrap Supreme", "1 crunchwrap", 530),
        food("chicken-quesadilla", "Chicken Quesadilla", "1 quesadilla", 490)
    ]),
    ...chain("Dunkin'", "dunkin", "https://www.dunkindonuts.com/nutrition/", [
        food("glazed-donut", "Glazed Donut", "1 donut", 240, 4, 33, 11, 1),
        food("boston-kreme-donut", "Boston Kreme Donut", "1 donut", 270, 5, 39, 11, 1),
        food("hash-browns", "Hash Browns", "6 pieces", 110, 1, 13, 6, 1)
    ]),
    ...chain("Wendy's", "wendys-ca", "https://order.wendys.com/ca/en/national/menu/all-day-classics", [
        food("daves-single", "Dave's Single", "1 sandwich", 560),
        food("baconator", "Baconator", "1 sandwich", 670),
        food("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 sandwich", 450)
    ], "CA"),
    ...chain("Chipotle", "chipotle", "https://www.chipotle.com/high-protein-meals", [
        food("double-high-protein-bowl", "Double High Protein Bowl", "1 bowl", 760, 81, 0, 0, 11),
        food("high-protein-high-fiber-bowl", "High Protein-High Fiber Bowl", "1 bowl", 540, 46, 0, 0, 14),
        food("high-protein-low-calorie-salad", "High Protein-Low Calorie Salad", "1 salad", 470, 36, 0, 0, 10)
    ]),
    ...chain("Burger King", "burger-king", "https://www.bk.com/menu", [
        food("whopper", "Whopper", "1 sandwich", 670),
        food("original-chicken-sandwich", "Original Chicken Sandwich", "1 sandwich", 680),
        food("bacon-king", "Bacon King", "1 sandwich", 1200)
    ]),
    ...chain("Domino's", "dominos", "https://www.dominos.com/en/content/nutrition", [
        food("pepperoni-stuffed-cheesy-bread", "Pepperoni Stuffed Cheesy Bread", "1 piece", 170, 6, 15, 10),
        food("parmesan-bread-bites", "Parmesan Bread Bites", "4 pieces", 220, 5, 27, 10),
        food("chocolate-lava-crunch-cake", "Chocolate Lava Crunch Cake", "1 cake", 350, 4, 46, 17)
    ]),
    ...chain("Subway", "subway", "https://media.subway.com/dam/urn:aaid:aem:2278372c-147b-42f2-8edc-7d8d94d1f07e/original/as/us-nutrition-en.pdf", [
        food("6-inch-bmt", "6-Inch B.M.T.", "1 6-inch sandwich (240 g)", 610, 27, 44, 36, 2),
        food("6-inch-meatball-marinara", "6-Inch Meatball Marinara", "1 6-inch sandwich (239 g)", 570, 27, 53, 28, 4),
        food("6-inch-oven-roasted-turkey", "6-Inch Oven-Roasted Turkey", "1 6-inch sandwich (233 g)", 480, 26, 42, 23, 3)
    ]),
    ...chain("Panda Express", "panda-express", "https://www.pandaexpress.com/nutritioninformation", [
        food("orange-chicken", "The Original Orange Chicken", "1 entrée (5.92 oz)", 510, 16, 53, 24, 2),
        food("beijing-beef", "Beijing Beef", "1 entrée (5.6 oz)", 470, 14, 46, 27, 2),
        food("mushroom-chicken", "Mushroom Chicken", "1 entrée (5.7 oz)", 220, 13, 10, 14, 1)
    ]),
    ...chain("Panera Bread", "panera", "https://www.panerabread.com/content/dam/panerabread/documents/c4-26-nutrition-guide.pdf", [
        food("fuji-apple-chicken-salad", "Fuji Apple Chicken Salad - Whole", "1 salad", 710, 28, 49, 44, 5),
        food("grilled-cheese", "Grilled Cheese on Classic White Miche - Whole", "1 sandwich", 810, 33, 72, 44, 2),
        food("chicken-caesar-wrap", "Chicken Caesar Wrap", "1 wrap", 490, 32, 40, 22, 14)
    ]),
    ...chain("Texas Roadhouse", "texas-roadhouse", "https://www.texasroadhouse.com/menu", [
        food("hand-cut-sirloin-6oz", "Hand-Cut Sirloin - 6 oz", "1 steak (6 oz)", 250),
        food("grilled-bbq-chicken", "Grilled BBQ Chicken", "1 entrée", 300),
        food("grilled-salmon-5oz", "Grilled Salmon - 5 oz", "1 fillet (5 oz)", 320)
    ]),
    ...chain("Popeyes", "popeyes", "https://www.popeyes.com/nutritional-information", [
        food("classic-chicken-sandwich", "Classic Chicken Sandwich", "1 sandwich", 700),
        food("spicy-chicken-sandwich", "Spicy Chicken Sandwich", "1 sandwich", 700),
        food("cajun-fries-regular", "Cajun Fries - Regular", "1 regular order", 270)
    ]),
    ...chain("Chili's", "chilis", "https://www.chilis.com/menu", [
        food("big-qp-burger", "The Big QP Burger", "1 burger", 890),
        food("shrimp-chicken-cajun-pasta", "Shrimp & Chicken Cajun Pasta", "1 entrée", 1230),
        food("chips-salsa", "Chips & Salsa", "1 order", 910)
    ]),
    ...chain("Raising Cane's", "raising-canes", "https://www.raisingcanes.com/menu/", [
        food("chicken-finger", "Chicken Finger", "1 chicken finger", 130),
        food("canes-sauce", "Cane's Sauce", "1 serving (1.5 oz)", 190),
        food("box-combo-zero-cal-drink", "Box Combo - Zero-Calorie Drink", "1 combo", 1290)
    ]),
    ...chain("Olive Garden", "olive-garden", "https://media.olivegarden.com/en_us/pdf/olive_garden_nutrition.pdf", [
        food("tour-of-italy", "Tour of Italy", "1 entrée", 1550),
        food("fettuccine-alfredo", "Fettuccine Alfredo", "1 entrée", 1310),
        food("chicken-alfredo-grilled", "Chicken Alfredo with Grilled Chicken", "1 entrée", 1370)
    ]),
    ...chain("SONIC", "sonic", "https://www.sonicdrivein.com/menu/", [
        food("cheeseburger", "Cheeseburger", "1 burger", 400),
        food("footlong-quarter-pound-coney", "Footlong Quarter Pound Coney", "1 coney", 770),
        food("tots-medium", "Tots - Medium", "1 medium order", 360)
    ]),
    ...chain("Pizza Hut", "pizza-hut", "https://www.pizzahut.com/c/content/nutrition", [
        food("hand-tossed-pepperoni-medium-slice", "Hand-Tossed Pepperoni Pizza - Medium", "1 slice (1/8 pizza)", 230, 10, 26, 10),
        food("breadstick", "Breadstick", "1 breadstick", 140, 4, 18, 6),
        food("boneless-wings-6-piece", "Boneless Wings", "6 pieces", 350)
    ]),
    ...chain("Dairy Queen", "dairy-queen", "https://www.dairyqueen.com/en-us/nutrition/food-treats/", [
        food("original-cheeseburger", "Original Cheeseburger", "1 burger", 390, 21, 37, 18, 2),
        food("chicken-strip-basket-4pc", "Chicken Strip Basket - 4 Piece", "1 basket", 1020, 35, 111, 48, 6),
        food("vanilla-cone-small", "Vanilla Cone - Small", "1 small cone", 220, 6, 34, 7, 0)
    ])
];

function food(id, name, label, calories, protein = 0, carbs = 0, fat = 0, fiber = 0) {
    return { id, name, label, calories, protein, carbs, fat, fiber };
}

function chain(brand, slug, sourceUrl, foods, countryCode = "US") {
    return foods.map(item => ({
        ...item,
        id: `${slug}-${item.id}`,
        brand,
        countryCode,
        aliases: `${brand} restaurant north america popular menu`,
        sourceName: `${brand} official nutrition`,
        sourceUrl
    }));
}
