const FOOD_EMOJI_RULES = [
    [/(?:protein|meal replacement).*(?:shake|drink)|(?:shake|drink).*(?:protein|meal replacement)/i, "🥤"],
    [/\b(?:coffee|espresso|latte|cappuccino|americano)\b/i, "☕"],
    [/\b(?:tea|kombucha)\b/i, "🍵"],
    [/\b(?:water|seltzer|sparkling water)\b/i, "💧"],
    [/\bpizza\b/i, "🍕"],
    [/\b(?:hamburger|burger)\b/i, "🍔"],
    [/\b(?:french fries|fries)\b/i, "🍟"],
    [/\b(?:sandwich|submarine|sub sandwich|croissan'?wich|panini|clubhouse)\b/i, "🥪"],
    [/\b(?:taco|tacos)\b/i, "🌮"],
    [/\b(?:burrito|wrap)\b/i, "🌯"],
    [/\b(?:soup|stew|chowder)\b/i, "🍲"],
    [/\b(?:chicken|turkey|poultry|duck)\b/i, "🍗"],
    [/\b(?:beef|steak|veal|bison)\b/i, "🥩"],
    [/\b(?:pork|bacon|ham|sausage)\b/i, "🥓"],
    [/\b(?:salmon|tuna|cod|haddock|tilapia|trout|sardine|fish|seafood)\b/i, "🐟"],
    [/\b(?:shrimp|prawn|lobster|crab|shellfish)\b/i, "🦐"],
    [/\b(?:egg|eggs|omelet|omelette)\b/i, "🥚"],
    [/\b(?:cheese|cheddar|mozzarella|parmesan|cottage cheese)\b/i, "🧀"],
    [/\b(?:ice cream|gelato|frozen dessert)\b/i, "🍨"],
    [/\b(?:milk|yogurt|yoghurt|cream|dairy)\b/i, "🥛"],
    [/\b(?:peanut|almond|cashew|walnut|pecan|pistachio|hazelnut|nut|nuts)\b/i, "🥜"],
    [/\b(?:bean|beans|lentil|lentils|chickpea|chickpeas|legume|legumes)\b/i, "🫘"],
    [/\b(?:carrot|carrots)\b/i, "🥕"],
    [/\b(?:broccoli|leafy greens|spinach|lettuce|kale|salad|vegetable|vegetables)\b/i, "🥦"],
    [/\bcorn\b/i, "🌽"],
    [/\b(?:potato|potatoes)\b/i, "🥔"],
    [/\b(?:tomato|tomatoes)\b/i, "🍅"],
    [/\b(?:pepper|peppers|capsicum)\b/i, "🫑"],
    [/\b(?:avocado|guacamole)\b/i, "🥑"],
    [/\b(?:apple|apples)\b/i, "🍎"],
    [/\b(?:banana|bananas)\b/i, "🍌"],
    [/\b(?:orange|oranges|citrus|tangerine|mandarin)\b/i, "🍊"],
    [/\b(?:lemon|lemons|lime|limes)\b/i, "🍋"],
    [/\b(?:strawberry|strawberries)\b/i, "🍓"],
    [/\b(?:blueberry|blueberries|raspberry|raspberries|blackberry|blackberries|berries|berry)\b/i, "🫐"],
    [/\b(?:grape|grapes)\b/i, "🍇"],
    [/\b(?:watermelon|melon|cantaloupe|honeydew)\b/i, "🍉"],
    [/\bpineapple\b/i, "🍍"],
    [/\b(?:peach|peaches|nectarine)\b/i, "🍑"],
    [/\b(?:pear|pears)\b/i, "🍐"],
    [/\b(?:fruit|fruits)\b/i, "🍎"],
    [/\b(?:juice|smoothie|soft drink|soda|beverage|drink)\b/i, "🥤"],
    [/\b(?:rice|quinoa|barley|grain|grains)\b/i, "🍚"],
    [/\b(?:bread|toast|bagel|bun|roll|tortilla)\b/i, "🍞"],
    [/\b(?:pasta|spaghetti|macaroni|noodle|noodles)\b/i, "🍝"],
    [/\b(?:oat|oats|oatmeal|cereal|granola)\b/i, "🥣"],
    [/\b(?:cookie|cookies|biscuit|biscuits)\b/i, "🍪"],
    [/\b(?:chocolate|candy|confection)\b/i, "🍫"],
    [/\b(?:cake|cupcake)\b/i, "🍰"],
    [/\b(?:donut|doughnut)\b/i, "🍩"],
    [/\b(?:muffin|croissant|pastry|danish)\b/i, "🥐"],
    [/\b(?:pancake|pancakes|waffle|waffles)\b/i, "🥞"],
    [/\b(?:hot dog|hotdog)\b/i, "🌭"],
    [/\bpopcorn\b/i, "🍿"]
];

export function getFoodEmoji(food = {}) {
    const nestedFood = food?.food && typeof food.food === "object" ? food.food : {};
    const categoryValue = food.categories || food.category || food.foodCategory ||
        nestedFood.categories || nestedFood.category || nestedFood.foodCategory || "";
    const categories = Array.isArray(categoryValue) ? categoryValue.join(" ") : String(categoryValue);
    const searchable = `${String(food.name || nestedFood.name || "")} ${categories}`.trim();
    const match = FOOD_EMOJI_RULES.find(([pattern]) => pattern.test(searchable));
    return match?.[1] || "🍽️";
}
