// ForgeOS vision Worker — free Cloudflare Workers AI (LLaVA, EU-permitted).
// Food: the model identifies items + portion grams; macros are computed from a
// built-in per-100g nutrition table for accuracy. Cardio: reads the console.
// Only ForgeOS origins may call this Worker from a browser — stops other sites
// embedding it to burn your free AI quota. Native app / curl ignore CORS, but
// they aren't the at-scale abuse vector; add a Cloudflare rate-limit rule for
// that (free). Add your custom domain here if you set one.
const ALLOWED_ORIGINS = [
  'https://forgeos-botforgeos.github.io',
  'http://localhost:5173',
  'https://localhost',
  'capacitor://localhost',
];
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const FOOD_PROMPT =
  'Identify EACH distinct food/drink in the photo and estimate its weight in grams ' +
  '(or ml). Respond with ONLY JSON, no prose: {"items":[{"name": string, "grams": ' +
  'number}], "confidence": number (0-1), "tip": string}. Be specific (e.g. "grilled ' +
  'chicken breast", "white rice, cooked", "olive oil").';

function cardioPrompt(source) {
  const where = source === 'watch'
    ? 'a fitness watch face or a phone running/cycling app summary screen'
    : 'a gym cardio machine console (treadmill, rower, bike, elliptical, stair climber)';
  return (
    `You are reading ${where}. Read every visible stat carefully and identify the activity. ` +
    'UNITS: distanceKm MUST be kilometres — if the screen shows miles (mi), convert with km = miles * 1.60934. ' +
    'durationMin is the TOTAL time in minutes — convert h:mm:ss or mm:ss to minutes (e.g. 1:05:30 → 65.5). ' +
    'Respond with ONLY JSON, no prose: {"machine": string (e.g. "Run","Treadmill","Cycling","Row"), ' +
    '"durationMin": number, "distanceKm": number, "calories": number, "avgPace": string (e.g. "5:30 /km"), ' +
    '"avgHr": number (average heart rate in bpm, 0 if absent), "confidence": number (0-1), "tip": string (one short coaching note)}. ' +
    'Use 0 (or "" for avgPace) for anything not visible. Read the actual digits — never invent values that are not shown.'
  );
}

// Per-100g (or 100ml) macros: [kcal, protein, carbs, fat, sugar].
const TABLE = {
  'chicken breast': [165, 31, 0, 3.6, 0], 'chicken thigh': [209, 26, 0, 11, 0], 'chicken': [190, 27, 0, 8, 0],
  'turkey': [135, 29, 0, 1, 0], 'turkey mince': [150, 27, 0, 4, 0], 'beef': [250, 26, 0, 15, 0], 'beef mince': [254, 26, 0, 17, 0],
  'steak': [271, 25, 0, 19, 0], 'sirloin': [206, 27, 0, 10, 0], 'pork': [242, 27, 0, 14, 0], 'bacon': [541, 37, 1.4, 42, 0],
  'salmon': [208, 20, 0, 13, 0], 'tuna': [132, 28, 0, 1, 0], 'cod': [82, 18, 0, 0.7, 0], 'mackerel': [262, 19, 0, 21, 0],
  'shrimp': [99, 24, 0.2, 0.3, 0], 'prawns': [99, 24, 0.2, 0.3, 0], 'egg': [143, 13, 1.1, 9.5, 1.1], 'eggs': [143, 13, 1.1, 9.5, 1.1],
  'egg white': [52, 11, 0.7, 0.2, 0.7], 'tofu': [144, 17, 3, 9, 0.6], 'tempeh': [193, 19, 9, 11, 0],
  'rice': [130, 2.7, 28, 0.3, 0.1], 'white rice': [130, 2.7, 28, 0.3, 0.1], 'brown rice': [123, 2.7, 26, 1, 0.4],
  'pasta': [158, 6, 31, 0.9, 0.6], 'spaghetti': [158, 6, 31, 0.9, 0.6], 'noodles': [138, 5, 25, 2, 0.5],
  'bread': [265, 9, 49, 3.2, 5], 'rye bread': [259, 9, 48, 3.3, 4], 'tortilla': [310, 8, 52, 8, 2], 'wrap': [310, 8, 52, 8, 2],
  'oats': [389, 17, 66, 7, 1], 'granola': [471, 10, 64, 20, 24], 'potato': [87, 2, 20, 0.1, 0.9], 'potatoes': [87, 2, 20, 0.1, 0.9],
  'fries': [312, 3.4, 41, 15, 0.3], 'sweet potato': [86, 1.6, 20, 0.1, 4.2], 'quinoa': [120, 4.4, 21, 1.9, 0.9],
  'lentils': [116, 9, 20, 0.4, 1.8], 'chickpeas': [164, 9, 27, 2.6, 5], 'black beans': [132, 9, 24, 0.5, 0.3], 'beans': [127, 8, 23, 0.5, 0.5],
  'broccoli': [34, 2.8, 7, 0.4, 1.7], 'spinach': [23, 2.9, 3.6, 0.4, 0.4], 'salad': [20, 1.2, 3.5, 0.2, 1.5], 'lettuce': [15, 1.4, 2.9, 0.2, 0.8],
  'tomato': [18, 0.9, 3.9, 0.2, 2.6], 'avocado': [160, 2, 9, 15, 0.7], 'carrot': [41, 0.9, 10, 0.2, 4.7], 'pepper': [31, 1, 6, 0.3, 4.2],
  'banana': [89, 1.1, 23, 0.3, 12], 'apple': [52, 0.3, 14, 0.2, 10], 'berries': [57, 0.7, 14, 0.3, 10], 'pineapple': [50, 0.5, 13, 0.1, 10],
  'milk': [61, 3.2, 4.8, 3.3, 5], 'greek yogurt': [59, 10, 3.6, 0.4, 3.2], 'yogurt': [61, 3.5, 4.7, 3.3, 4.7], 'skyr': [63, 11, 4, 0.2, 4],
  'cottage cheese': [98, 11, 3.4, 4.3, 2.7], 'cheese': [402, 25, 1.3, 33, 0.5], 'feta': [264, 14, 4, 21, 4], 'mozzarella': [280, 28, 3, 17, 1],
  'peanut butter': [588, 25, 20, 50, 9], 'almonds': [579, 21, 22, 50, 4], 'nuts': [607, 20, 21, 54, 4], 'olive oil': [884, 0, 0, 100, 0],
  'butter': [717, 0.9, 0.1, 81, 0.1], 'honey': [304, 0.3, 82, 0, 82], 'whey': [400, 80, 8, 6, 5], 'protein shake': [120, 24, 4, 1.5, 2],
  'pizza': [266, 11, 33, 10, 3.6], 'burger': [254, 17, 19, 13, 4], 'cheeseburger': [303, 16, 26, 15, 6], 'hot dog': [290, 10, 4, 26, 1],
  'sandwich': [250, 12, 30, 9, 4], 'sushi': [150, 6, 28, 2, 6], 'curry': [160, 8, 12, 9, 4], 'soup': [60, 3, 8, 2, 2],
  'chocolate': [546, 5, 61, 31, 48], 'dark chocolate': [598, 8, 46, 43, 24], 'ice cream': [207, 3.5, 24, 11, 21], 'cookie': [488, 5, 64, 24, 35],
  'orange': [47, 0.9, 12, 0.1, 9], 'grapes': [69, 0.7, 18, 0.2, 16], 'corn': [86, 3.2, 19, 1.2, 6.3], 'edamame': [121, 12, 9, 5, 2.2],
  'hummus': [166, 8, 14, 10, 0], 'falafel': [333, 13, 32, 18, 0], 'rice cake': [387, 8, 82, 3, 0.5], 'jerky': [410, 33, 11, 26, 9],

  // ---- Expanded database ----
  // Proteins & meat
  'ham': [145, 21, 1.5, 6, 1], 'sausage': [301, 13, 3, 27, 1], 'meatball': [197, 14, 6, 13, 1], 'lamb': [294, 25, 0, 21, 0],
  'duck': [337, 19, 0, 28, 0], 'venison': [158, 30, 0, 3.2, 0], 'ribeye': [291, 24, 0, 22, 0], 'pork chop': [231, 26, 0, 14, 0],
  'chicken wing': [203, 30, 0, 8, 0], 'chicken nugget': [296, 15, 16, 19, 0.5], 'fried chicken': [320, 22, 14, 19, 0],
  'pulled pork': [215, 22, 6, 11, 5], 'corned beef': [251, 18, 0.5, 19, 0], 'salami': [336, 22, 2, 26, 1], 'pepperoni': [504, 19, 1.4, 46, 0],
  // Fish & seafood
  'sardines': [208, 25, 0, 11, 0], 'tilapia': [129, 26, 0, 2.7, 0], 'trout': [148, 21, 0, 7, 0], 'crab': [97, 19, 0, 1.5, 0],
  'lobster': [89, 19, 0, 0.9, 0], 'scallops': [111, 21, 5, 0.8, 0], 'anchovy': [210, 29, 0, 10, 0], 'haddock': [90, 20, 0, 0.7, 0],
  'canned tuna': [116, 26, 0, 0.8, 0], 'fish fingers': [200, 12, 19, 9, 1],
  // Eggs
  'boiled egg': [155, 13, 1.1, 11, 1.1], 'scrambled egg': [166, 11, 2, 12, 1.5], 'omelette': [154, 11, 1, 12, 1], 'fried egg': [196, 14, 0.8, 15, 0.4],
  // Dairy
  'cheddar': [403, 25, 1.3, 33, 0.5], 'parmesan': [431, 38, 4, 29, 0.9], 'cream cheese': [342, 6, 4, 34, 3], 'ricotta': [174, 11, 3, 13, 0.3],
  'cream': [340, 2, 3, 36, 3], 'sour cream': [198, 2.4, 4.6, 19, 3.4], 'kefir': [41, 3.3, 4.5, 1, 4.5], 'custard': [122, 3, 17, 4, 16],
  'soy milk': [54, 3.3, 6, 1.8, 4], 'almond milk': [17, 0.6, 0.6, 1.2, 0.5], 'oat milk': [47, 1, 7, 1.5, 4], 'whipped cream': [257, 3, 12, 22, 12],
  // Plant protein / supplements
  'seitan': [141, 25, 14, 2, 0], 'protein bar': [350, 30, 35, 10, 12], 'casein': [360, 78, 7, 3, 4], 'protein pancake': [180, 14, 18, 5, 4],
  'edamame beans': [121, 12, 9, 5, 2.2], 'tofu scramble': [110, 11, 4, 6, 1],
  // Grains & carbs
  'couscous': [112, 3.8, 23, 0.2, 0], 'bulgur': [83, 3, 19, 0.2, 0.1], 'barley': [123, 2.3, 28, 0.4, 0.3], 'bagel': [250, 10, 49, 1.5, 5],
  'croissant': [406, 8, 46, 21, 11], 'pancake': [227, 6, 28, 9, 6], 'pancakes': [227, 6, 28, 9, 6], 'waffle': [291, 8, 33, 14, 6],
  'muffin': [377, 6, 51, 17, 28], 'cereal': [379, 8, 84, 4, 22], 'cornflakes': [357, 8, 84, 0.9, 8], 'crackers': [430, 9, 70, 13, 2],
  'pita': [275, 9, 55, 1.2, 1], 'naan': [310, 9, 50, 8, 4], 'ramen': [436, 10, 63, 16, 2], 'gnocchi': [133, 3, 27, 1, 0.5],
  'polenta': [85, 2, 18, 0.4, 0.2], 'popcorn': [387, 13, 78, 5, 0.9], 'mashed potato': [88, 2, 17, 1.5, 1.5], 'baked potato': [93, 2.5, 21, 0.1, 1],
  'hash browns': [265, 3, 28, 16, 0.5], 'french toast': [229, 8, 25, 11, 7], 'rice noodles': [109, 1, 25, 0.2, 0], 'macaroni': [158, 6, 31, 0.9, 0.6],
  // Legumes & veg
  'kidney beans': [127, 9, 22, 0.5, 0.3], 'pinto beans': [143, 9, 26, 0.7, 0.3], 'baked beans': [94, 5, 15, 0.6, 5], 'peas': [81, 5, 14, 0.4, 6],
  'cauliflower': [25, 1.9, 5, 0.3, 1.9], 'courgette': [17, 1.2, 3.1, 0.3, 2.5], 'zucchini': [17, 1.2, 3.1, 0.3, 2.5], 'cucumber': [15, 0.7, 3.6, 0.1, 1.7],
  'mushrooms': [22, 3.1, 3.3, 0.3, 2], 'onion': [40, 1.1, 9, 0.1, 4.2], 'kale': [49, 4.3, 9, 0.9, 2.3], 'asparagus': [20, 2.2, 3.9, 0.1, 1.9],
  'green beans': [31, 1.8, 7, 0.2, 3.3], 'brussels sprouts': [43, 3.4, 9, 0.3, 2.2], 'cabbage': [25, 1.3, 6, 0.1, 3.2], 'eggplant': [25, 1, 6, 0.2, 3.5],
  'beetroot': [43, 1.6, 10, 0.2, 8], 'pumpkin': [26, 1, 7, 0.1, 2.8], 'butternut squash': [45, 1, 12, 0.1, 2.2], 'mixed veg': [65, 3, 13, 0.5, 4],
  // Fruits
  'strawberry': [32, 0.7, 8, 0.3, 4.9], 'strawberries': [32, 0.7, 8, 0.3, 4.9], 'blueberry': [57, 0.7, 14, 0.3, 10], 'blueberries': [57, 0.7, 14, 0.3, 10],
  'raspberry': [52, 1.2, 12, 0.7, 4.4], 'mango': [60, 0.8, 15, 0.4, 14], 'watermelon': [30, 0.6, 8, 0.2, 6], 'melon': [34, 0.8, 8, 0.2, 8],
  'peach': [39, 0.9, 10, 0.3, 8], 'pear': [57, 0.4, 15, 0.1, 10], 'plum': [46, 0.7, 11, 0.3, 10], 'cherry': [50, 1, 12, 0.3, 8],
  'cherries': [50, 1, 12, 0.3, 8], 'kiwi': [61, 1.1, 15, 0.5, 9], 'grapefruit': [42, 0.8, 11, 0.1, 7], 'dates': [277, 1.8, 75, 0.2, 66],
  'raisins': [299, 3, 79, 0.5, 59], 'coconut': [354, 3.3, 15, 33, 6], 'pomegranate': [83, 1.7, 19, 1.2, 14], 'fig': [74, 0.8, 19, 0.3, 16],
  // Nuts & seeds
  'walnuts': [654, 15, 14, 65, 2.6], 'cashews': [553, 18, 30, 44, 6], 'pistachios': [560, 20, 28, 45, 8], 'peanuts': [567, 26, 16, 49, 4],
  'chia seeds': [486, 17, 42, 31, 0], 'flax seeds': [534, 18, 29, 42, 1.5], 'sunflower seeds': [584, 21, 20, 51, 2.6], 'pumpkin seeds': [559, 30, 11, 49, 1.4],
  'sesame': [573, 18, 23, 50, 0.3], 'tahini': [595, 17, 21, 54, 0.5], 'trail mix': [462, 14, 45, 29, 30], 'mixed nuts': [607, 20, 21, 54, 4],
  // Fats, oils & spreads
  'coconut oil': [892, 0, 0, 99, 0], 'mayonnaise': [680, 1, 0.6, 75, 0.6], 'ghee': [900, 0, 0, 100, 0], 'nutella': [539, 6, 58, 31, 54],
  'jam': [278, 0.4, 69, 0.1, 49], 'syrup': [260, 0, 67, 0, 60], 'sugar': [387, 0, 100, 0, 100], 'guacamole': [150, 2, 8, 13, 1],
  // Sauces & condiments
  'ketchup': [101, 1.2, 26, 0.1, 22], 'soy sauce': [53, 8, 5, 0.6, 0.4], 'bbq sauce': [172, 0.8, 41, 0.6, 33], 'pesto': [450, 5, 6, 46, 2],
  'salsa': [36, 1.5, 7, 0.2, 4], 'ranch': [430, 1, 6, 45, 4], 'gravy': [54, 2, 5, 3, 1],
  // Fast food & dishes
  'kebab': [215, 15, 12, 12, 2], 'doner': [215, 15, 12, 12, 2], 'taco': [226, 9, 20, 12, 2], 'burrito': [206, 8, 26, 8, 2], 'nachos': [343, 8, 36, 19, 2],
  'lasagna': [135, 8, 11, 6, 3], 'mac and cheese': [164, 6, 20, 6, 2], 'risotto': [140, 3, 22, 4, 1], 'paella': [156, 8, 18, 5, 1],
  'pho': [70, 5, 9, 1.5, 1], 'pad thai': [153, 7, 20, 5, 4], 'fish and chips': [195, 9, 20, 9, 0.5], 'dumpling': [180, 7, 24, 6, 1],
  'spring roll': [210, 5, 24, 10, 2], 'samosa': [262, 4, 24, 17, 2], 'quesadilla': [275, 12, 25, 14, 2], 'wrap sandwich': [230, 10, 28, 9, 3],
  // Snacks & sweets
  'chips': [536, 7, 53, 35, 0.3], 'crisps': [536, 7, 53, 35, 0.3], 'pretzels': [380, 10, 80, 3, 2], 'granola bar': [471, 8, 64, 20, 24],
  'energy bar': [350, 10, 55, 11, 30], 'donut': [452, 5, 51, 25, 22], 'doughnut': [452, 5, 51, 25, 22], 'brownie': [466, 6, 50, 28, 36],
  'cake': [350, 5, 50, 15, 35], 'cheesecake': [321, 6, 26, 22, 22], 'muesli': [362, 10, 66, 6, 16], 'porridge': [68, 2.4, 12, 1.4, 0.3],
  // Drinks
  'orange juice': [45, 0.7, 10, 0.2, 8], 'apple juice': [46, 0.1, 11, 0.1, 10], 'smoothie': [60, 1.5, 13, 0.5, 11], 'beer': [43, 0.5, 3.6, 0, 0],
  'wine': [83, 0.1, 2.6, 0, 0.6], 'cola': [42, 0, 11, 0, 11], 'soda': [42, 0, 11, 0, 11], 'energy drink': [45, 0, 11, 0, 11],
  'latte': [56, 3, 5, 2, 5], 'cappuccino': [40, 2.5, 4, 1.5, 4], 'coffee': [2, 0.1, 0, 0, 0], 'sports drink': [24, 0, 6, 0, 6],
  'coconut water': [19, 0.7, 3.7, 0.2, 2.6], 'protein coffee': [60, 10, 4, 1, 3],

  // ---- Expansion II ----
  // Meats
  'ground chicken': [143, 17, 0, 8, 0], 'rotisserie chicken': [190, 25, 0, 9, 0], 'brisket': [217, 22, 0, 14, 0], 'turkey breast': [104, 24, 0, 1, 0],
  'chorizo': [455, 24, 2, 38, 1], 'prosciutto': [195, 28, 0.5, 9, 0], 'pastrami': [147, 22, 1, 6, 0], 'liver': [135, 20, 3.9, 3.6, 0],
  'bison': [146, 28, 0, 2.4, 0], 'schnitzel': [270, 18, 16, 15, 1], 'meatloaf': [240, 17, 9, 15, 3], 'bratwurst': [333, 14, 3, 29, 1],
  'beef stew': [120, 11, 6, 5, 2], 'shepherds pie': [120, 7, 11, 6, 2], 'sausage roll': [322, 9, 25, 21, 2], 'scotch egg': [241, 12, 12, 16, 1],
  // Fish/seafood
  'herring': [203, 18, 0, 14, 0], 'sea bass': [124, 23, 0, 2.5, 0], 'swordfish': [144, 23, 0, 5, 0], 'pollock': [92, 19, 0, 1, 0],
  'smoked salmon': [117, 18, 0, 4.3, 0], 'mussels': [86, 12, 4, 2, 0], 'oysters': [81, 9, 4, 2, 0], 'squid': [92, 16, 3, 1.4, 0],
  'calamari': [175, 15, 8, 7, 0], 'octopus': [82, 15, 2, 1, 0], 'crab stick': [95, 8, 14, 0.4, 4],
  // Cheeses & dairy
  'gouda': [356, 25, 2.2, 27, 2.2], 'brie': [334, 21, 0.5, 28, 0.5], 'camembert': [300, 20, 0.5, 24, 0.5], 'blue cheese': [353, 21, 2.3, 29, 0.5],
  'halloumi': [321, 22, 2, 25, 1], 'paneer': [296, 18, 6, 22, 6], 'mascarpone': [429, 4, 4, 44, 3], 'condensed milk': [321, 8, 54, 9, 54],
  'evaporated milk': [134, 7, 10, 8, 10], 'buttermilk': [40, 3.3, 4.8, 0.9, 4.8], 'quark': [68, 12, 4, 0.3, 4], 'gelato': [216, 4, 28, 10, 24],
  'frozen yogurt': [127, 3, 22, 4, 17], 'milkshake': [112, 3.8, 18, 3, 16],
  // Plant-based
  'jackfruit': [95, 1.7, 23, 0.6, 19], 'vegan burger': [220, 18, 9, 13, 1], 'vegan sausage': [230, 15, 8, 16, 1], 'plant mince': [180, 18, 7, 9, 1],
  'nutritional yeast': [325, 50, 36, 4, 0], 'miso': [199, 12, 26, 6, 6], 'soy chunks': [345, 52, 33, 0.5, 2], 'lentil pasta': [340, 25, 56, 2, 2],
  // Grains & bread
  'farro': [127, 5, 26, 0.8, 0.4], 'millet': [119, 3.5, 23, 1, 0.1], 'buckwheat': [92, 3.4, 20, 0.6, 0], 'wild rice': [101, 4, 21, 0.3, 0.7],
  'basmati rice': [121, 3, 25, 0.4, 0], 'sushi rice': [140, 2.6, 31, 0.2, 0.1], 'semolina': [360, 13, 73, 1, 0], 'cornbread': [330, 7, 51, 11, 14],
  'focaccia': [296, 8, 45, 9, 2], 'ciabatta': [271, 9, 52, 2.5, 2], 'sourdough': [289, 12, 56, 2, 2], 'baguette': [274, 9, 55, 2, 3],
  'brioche': [340, 9, 50, 12, 9], 'breadstick': [412, 12, 72, 9, 5], 'weetabix': [362, 12, 69, 2, 4.4], 'bran flakes': [356, 10, 81, 2, 22],
  'rice krispies': [382, 6, 87, 1, 10], 'crumpet': [177, 5, 36, 0.8, 1], 'toast': [313, 9, 54, 4, 4],
  // Pasta types
  'penne': [158, 6, 31, 0.9, 0.6], 'fusilli': [158, 6, 31, 0.9, 0.6], 'ravioli': [180, 8, 26, 5, 2], 'tortellini': [220, 9, 32, 6, 2],
  'orzo': [158, 6, 31, 0.9, 0.6], 'udon': [127, 3, 27, 0.2, 0.5], 'soba': [99, 5, 21, 0.1, 0], 'lasagne': [135, 8, 11, 6, 3],
  // Legumes
  'butter beans': [115, 7, 20, 0.4, 0.5], 'cannellini beans': [114, 8, 21, 0.5, 0.3], 'fava beans': [110, 8, 18, 0.4, 1.7], 'mung beans': [105, 7, 19, 0.4, 2],
  'split peas': [118, 8, 21, 0.4, 3], 'refried beans': [90, 5, 15, 1.5, 0.5], 'soybeans': [173, 17, 10, 9, 3],
  // Vegetables
  'rocket': [25, 2.6, 3.7, 0.7, 2], 'arugula': [25, 2.6, 3.7, 0.7, 2], 'bok choy': [13, 1.5, 2.2, 0.2, 1.2], 'leek': [61, 1.5, 14, 0.3, 3.9],
  'fennel': [31, 1.2, 7, 0.2, 4], 'artichoke': [47, 3.3, 11, 0.2, 1], 'okra': [33, 1.9, 7, 0.2, 1.5], 'radish': [16, 0.7, 3.4, 0.1, 1.9],
  'parsnip': [75, 1.2, 18, 0.3, 4.8], 'turnip': [28, 0.9, 6, 0.1, 3.8], 'olives': [115, 0.8, 6, 11, 0], 'pickles': [11, 0.3, 2.3, 0.2, 1.1],
  'sauerkraut': [19, 0.9, 4.3, 0.1, 1.8], 'kimchi': [15, 1.1, 2.4, 0.5, 1.6], 'seaweed': [45, 5.8, 9, 0.6, 0.5], 'bean sprouts': [30, 3, 6, 0.2, 4],
  'coleslaw': [150, 1, 13, 11, 9], 'roasted veg': [90, 2, 12, 4, 5],
  // Fruits
  'apricot': [48, 1.4, 11, 0.4, 9], 'nectarine': [44, 1.1, 11, 0.3, 8], 'blackberry': [43, 1.4, 10, 0.5, 4.9], 'cranberry': [46, 0.4, 12, 0.1, 4],
  'passion fruit': [97, 2.2, 23, 0.7, 11], 'lychee': [66, 0.8, 17, 0.4, 15], 'papaya': [43, 0.5, 11, 0.3, 8], 'guava': [68, 2.6, 14, 1, 9],
  'clementine': [47, 0.9, 12, 0.2, 9], 'prunes': [240, 2.2, 64, 0.4, 38], 'pineapple chunks': [50, 0.5, 13, 0.1, 10], 'fruit salad': [50, 0.6, 13, 0.1, 11],
  // Nuts & seeds
  'pecans': [691, 9, 14, 72, 4], 'macadamia': [718, 8, 14, 76, 4.6], 'brazil nuts': [659, 14, 12, 67, 2.3], 'hazelnuts': [628, 15, 17, 61, 4.3],
  'pine nuts': [673, 14, 13, 68, 3.6], 'hemp seeds': [553, 32, 9, 49, 1.5], 'almond butter': [614, 21, 19, 56, 4], 'cashew butter': [587, 18, 28, 49, 5],
  // Spreads & sauces
  'maple syrup': [260, 0, 67, 0, 60], 'agave': [310, 0, 76, 0, 68], 'marmite': [250, 34, 30, 0.1, 1], 'marmalade': [266, 0.3, 66, 0.1, 60],
  'sriracha': [93, 1.9, 19, 0.9, 15], 'hot sauce': [11, 0.5, 1.8, 0.4, 1], 'teriyaki': [89, 5.9, 16, 0, 14], 'tzatziki': [104, 3, 5, 8, 3],
  'aioli': [780, 1, 2, 84, 1], 'sweet chili sauce': [230, 0.5, 57, 0.2, 50], 'balsamic': [88, 0.5, 17, 0, 15], 'vinaigrette': [330, 0.5, 10, 33, 8],
  // Dishes
  'shawarma': [210, 16, 12, 11, 2], 'gyro': [215, 15, 12, 12, 2], 'poke bowl': [150, 10, 18, 5, 4], 'buddha bowl': [140, 6, 20, 5, 4],
  'katsu curry': [180, 8, 22, 7, 4], 'tikka masala': [150, 10, 8, 9, 4], 'butter chicken': [180, 12, 7, 12, 4], 'biryani': [180, 6, 26, 6, 2],
  'fried rice': [163, 5, 24, 5, 1], 'chow mein': [150, 6, 21, 5, 2], 'gyoza': [180, 7, 24, 6, 1], 'tempura': [240, 9, 22, 13, 1],
  'bibimbap': [130, 6, 18, 4, 3], 'enchilada': [170, 8, 17, 8, 3], 'fajita': [180, 12, 15, 8, 3], 'chili con carne': [130, 9, 11, 5, 3],
  'goulash': [110, 9, 6, 5, 2], 'meat pie': [270, 8, 24, 16, 2], 'cornish pasty': [280, 7, 26, 16, 2], 'quiche': [240, 9, 16, 16, 2],
  'frittata': [155, 11, 3, 11, 2], 'shakshuka': [110, 6, 7, 7, 4], 'moussaka': [140, 7, 9, 9, 3], 'carbonara': [200, 9, 20, 10, 2],
  'pierogi': [200, 6, 32, 5, 2], 'empanada': [290, 9, 28, 16, 2], 'ratatouille': [60, 1.5, 8, 3, 5],
  // Sweets & snacks
  'tortilla chips': [490, 7, 63, 23, 1], 'cheese puffs': [560, 6, 54, 36, 3], 'rice crackers': [400, 7, 84, 4, 1], 'flapjack': [450, 5, 60, 21, 30],
  'scone': [364, 7, 54, 14, 8], 'danish': [374, 6, 47, 18, 18], 'eclair': [262, 6, 24, 16, 14], 'macaron': [404, 6, 64, 14, 58],
  'churros': [410, 5, 45, 24, 12], 'crepe': [157, 5, 20, 6, 5], 'mochi': [230, 2, 52, 1, 20], 'rice pudding': [97, 3, 16, 2, 10],
  'jelly': [62, 1, 15, 0, 14], 'gummy': [330, 6, 78, 0, 60], 'marshmallow': [318, 1.8, 81, 0.2, 58], 'fudge': [411, 2, 76, 11, 73],
  'caramel': [382, 1.8, 77, 8, 65], 'biscuit': [480, 6, 65, 22, 28], 'digestive': [471, 7, 63, 21, 17], 'oreo': [480, 5, 70, 20, 38],
  'shortbread': [523, 6, 60, 28, 18], 'gingerbread': [377, 5, 64, 11, 33], 'flan': [145, 4, 23, 4, 22], 'tiramisu': [283, 5, 30, 16, 22],
  // Drinks
  'hot chocolate': [77, 3, 11, 2.5, 9], 'matcha': [5, 0.5, 1, 0, 0], 'green tea': [1, 0, 0, 0, 0], 'iced tea': [29, 0, 7, 0, 7],
  'lemonade': [40, 0, 10, 0, 9], 'ginger ale': [38, 0, 9, 0, 9], 'kombucha': [29, 0, 7, 0, 6], 'mojito': [120, 0, 14, 0, 12],
  'cider': [49, 0, 5, 0, 5], 'champagne': [76, 0.2, 1.4, 0, 1], 'espresso': [9, 0.1, 1.7, 0.2, 0], 'mocha': [94, 3, 14, 3, 12],
  'frappuccino': [140, 3, 26, 3, 25], 'acai bowl': [120, 2, 22, 4, 14], 'overnight oats': [130, 5, 20, 4, 6],
};

function json(body, status = 200, cors = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function bestMatch(name) {
  const n = String(name || '').toLowerCase();
  let best = null;
  for (const key of Object.keys(TABLE)) {
    if (n.includes(key) && (!best || key.length > best.length)) best = key;
  }
  return best;
}

function scale([kcal, p, c, f, s], grams) {
  const factor = (Number(grams) || 0) / 100;
  return {
    calories: Math.round(kcal * factor),
    proteinG: Math.round(p * factor),
    carbsG: Math.round(c * factor),
    fatG: Math.round(f * factor),
    sugarG: Math.round((s || 0) * factor),
  };
}

function macrosFromTable(name, grams) {
  const key = bestMatch(name);
  return key ? scale(TABLE[key], grams) : null;
}

// USDA FoodData Central — comprehensive for generic/whole foods. Free key
// (DEMO_KEY works but is rate-limited; set FDC_KEY var for higher limits).
async function usdaLookup(name, key) {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(name)}&pageSize=2&dataType=${encodeURIComponent('Foundation,SR Legacy,Survey (FNDDS)')}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    const food = (j.foods || [])[0];
    if (!food || !Array.isArray(food.foodNutrients)) return null;
    const find = (re, unit) => {
      const n = food.foodNutrients.find((x) => re.test(x.nutrientName || '') && (!unit || (x.unitName || '').toUpperCase() === unit));
      return n ? Number(n.value) || 0 : 0;
    };
    const kcal = find(/energy/i, 'KCAL');
    if (kcal <= 0 || kcal > 1000) return null;
    return [kcal, find(/protein/i), find(/carbohydrate/i), find(/total lipid|^fat/i), find(/sugars/i)];
  } catch {
    return null;
  }
}

// Look a food up in Open Food Facts (free, ~3M foods, no key). Returns per-100g.
async function offLookup(name) {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(url, { headers: { 'User-Agent': 'ForgeOS/1.0 (fitness app)' }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    for (const p of j.products || []) {
      const n = p.nutriments || {};
      const kcal = Number(n['energy-kcal_100g']);
      if (kcal > 0 && kcal < 1000) {
        return [kcal, Number(n.proteins_100g) || 0, Number(n.carbohydrates_100g) || 0, Number(n.fat_100g) || 0, Number(n.sugars_100g) || 0];
      }
    }
  } catch {
    /* timeout or network — fall back */
  }
  return null;
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    try {
      const { image, mode, source } = await request.json();
      if (!image) return json({ error: 'no image' }, 400, cors);
      // Reject oversized payloads (base64 ≈ 4/3 of raw bytes) — protects the free tier.
      if (typeof image !== 'string' || image.length > 9_000_000) return json({ error: 'image too large' }, 413, cors);
      const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
      const isCardio = mode === 'cardio';

      const ai = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
        prompt: isCardio ? cardioPrompt(source) : FOOD_PROMPT,
        image: [...bytes],
        max_tokens: 512,
        temperature: 0.1,
      });
      const text = (ai && (ai.description || ai.response)) || '';
      const match = text.match(/\{[\s\S]*\}/);
      let data = null;
      if (match) { try { data = JSON.parse(match[0]); } catch { /* fall through */ } }

      if (isCardio) {
        if (!data) return json({ machine: 'Cardio', durationMin: 0, distanceKm: 0, calories: 0, avgPace: '', avgHr: 0, confidence: 0.2, tip: (text || 'Could not read it — enter the numbers manually.').slice(0, 160) }, 200, cors);
        // Sanitise + derive so the app always gets clean, consistent numbers.
        const num = (v) => { const n = Number(v); return isFinite(n) && n >= 0 ? n : 0; };
        data.durationMin = Math.round(num(data.durationMin) * 10) / 10;
        data.distanceKm = Math.round(num(data.distanceKm) * 100) / 100;
        data.calories = Math.round(num(data.calories));
        data.avgHr = Math.round(num(data.avgHr));
        // Backfill pace from distance + time when the model didn't read one.
        if ((!data.avgPace || data.avgPace === '') && data.distanceKm > 0 && data.durationMin > 0) {
          const pace = data.durationMin / data.distanceKm;
          let m = Math.floor(pace);
          let s = Math.round((pace - m) * 60);
          if (s === 60) { m += 1; s = 0; }
          data.avgPace = `${m}:${String(s).padStart(2, '0')} /km`;
        }
        data.confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.5));
        return json(data, 200, cors);
      }

      // FOOD: compute macros from the table using AI-estimated grams.
      const rawItems = Array.isArray(data?.items) && data.items.length ? data.items : null;
      if (!rawItems) {
        return json({ name: 'Meal (estimate)', calories: 500, proteinG: 30, carbsG: 50, fatG: 18, sugarG: 8, confidence: 0.25, tip: (text || 'Could not identify items — edit manually.').slice(0, 160), items: [{ name: 'Meal', calories: 500, proteinG: 30, carbsG: 50, fatG: 18, sugarG: 8 }] }, 200, cors);
      }

      // Table first (fast/curated), then Open Food Facts (millions of foods), then estimate.
      const items = await Promise.all(
        rawItems.slice(0, 8).map(async (it) => {
          const grams = Number(it.grams) || 150;
          let m = macrosFromTable(it.name, grams);
          let source = m ? 'db' : '';
          if (!m) {
            const usda = await usdaLookup(it.name, env.FDC_KEY || 'DEMO_KEY');
            if (usda) { m = scale(usda, grams); source = 'usda'; }
          }
          if (!m) {
            const off = await offLookup(it.name);
            if (off) { m = scale(off, grams); source = 'off'; }
          }
          if (!m) { m = { calories: Math.round(grams * 1.5), proteinG: Math.round(grams * 0.08), carbsG: Math.round(grams * 0.15), fatG: Math.round(grams * 0.05), sugarG: 0 }; source = 'estimate'; }
          return { name: `${it.name} (${grams}g)`, ...m, _source: source };
        }),
      );
      const totals = items.reduce((a, b) => ({ calories: a.calories + b.calories, proteinG: a.proteinG + b.proteinG, carbsG: a.carbsG + b.carbsG, fatG: a.fatG + b.fatG, sugarG: a.sugarG + b.sugarG }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 });
      const matchedCount = items.filter((i) => i._source !== 'estimate').length;
      const cleanItems = items.map(({ _source, ...rest }) => rest); // eslint-disable-line no-unused-vars

      return json({
        name: rawItems.map((i) => i.name).join(', '),
        ...totals,
        items: cleanItems,
        confidence: Math.max(0.3, Math.min(0.95, matchedCount / items.length)),
        tip: `${matchedCount}/${items.length} items matched a nutrition database (built-in + Open Food Facts). Edit anything if needed.`,
      }, 200, cors);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500, cors);
    }
  },
};
