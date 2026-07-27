import type { Recipe } from './types';

// Snacks, shakes and high-protein sweets — the small stuff that decides whether
// a protein target actually gets hit. Ids continue from EXTRA_MEALS.
export const EXTRA_FUEL: Recipe[] = [
  // ---------------- Snacks ----------------
  {
    id: 'rec-88', name: 'Quark & Cocoa Pot', meal: 'Snack', goals: ['lose', 'recomp'],
    kcal: 220, protein: 30, carbs: 14, fat: 4, minutes: 3, servings: 1,
    ingredients: ['250 g quark', '1 tsp cocoa powder', '1 tsp honey or sweetener', 'pinch of salt'],
    steps: [
      'Sift the cocoa in — dumped straight in it stays as bitter lumps.',
      'Beat with the honey and salt until it goes glossy and mousse-like.',
      'Chill 10 minutes if you can wait.',
    ],
    tags: ['high-protein', 'quick', 'no-cook', 'vegetarian', 'budget'],
    tip: '30 g of protein that tastes like pudding, for the price of a coffee.',
  },
  {
    id: 'rec-89', name: 'Protein Energy Balls', meal: 'Snack', goals: ['gain', 'strength', 'maintain'],
    kcal: 190, protein: 10, carbs: 20, fat: 8, minutes: 15, servings: 10,
    ingredients: ['150 g oats', '2 scoops whey', '120 g peanut butter', '80 g honey', '40 g dark chocolate chips', 'splash of milk'],
    steps: [
      'Mix the dry ingredients first, then work in the peanut butter and honey with a spoon.',
      'Add milk a teaspoon at a time until the mix just holds when squeezed — too wet and they slump.',
      'Roll 10 balls with damp hands.',
      'Fridge 30 minutes to firm up. They keep a week.',
    ],
    tags: ['high-protein', 'meal-prep', 'no-cook', 'vegetarian', 'post-workout'],
    tip: 'Two of these beat any shop-bought bar on both price and macros.',
  },
  {
    id: 'rec-90', name: 'Turkey & Cheese Roll-Ups', meal: 'Snack', goals: ['lose', 'recomp'],
    kcal: 200, protein: 24, carbs: 3, fat: 11, minutes: 3, servings: 1,
    ingredients: ['120 g sliced turkey', '40 g cheese sticks', 'mustard', 'pickles (optional)'],
    steps: [
      'Spread a thin line of mustard down each turkey slice.',
      'Lay a strip of cheese and a pickle spear at one end and roll it up tight.',
    ],
    tags: ['high-protein', 'low-carb', 'no-cook', 'quick'],
  },
  {
    id: 'rec-91', name: 'Greek Yoghurt Bark', meal: 'Snack', goals: ['lose', 'recomp'],
    kcal: 160, protein: 18, carbs: 16, fat: 3, minutes: 10, servings: 4,
    ingredients: ['500 g Greek yoghurt', '2 tbsp honey', '150 g berries', '20 g dark chocolate'],
    steps: [
      'Line a tray with baking paper and spread the sweetened yoghurt 1 cm thick.',
      'Press the berries in and grate the chocolate over the top.',
      'Freeze 3 hours, then snap into shards.',
      'Keep them in the freezer in a bag — they soften fast at room temperature.',
    ],
    tags: ['high-protein', 'meal-prep', 'no-cook', 'vegetarian'],
    tip: 'The ice-cream substitute that does not cost you the day.',
  },
  {
    id: 'rec-92', name: 'Cottage Cheese & Crackers', meal: 'Snack', goals: ['lose', 'maintain'],
    kcal: 230, protein: 24, carbs: 22, fat: 5, minutes: 2, servings: 1,
    ingredients: ['200 g cottage cheese', '4 rye crackers', 'radish', 'black pepper'],
    steps: ['Season the cottage cheese with pepper.', 'Spoon it onto the crackers and top with thin radish slices for bite.'],
    tags: ['high-protein', 'quick', 'no-cook', 'vegetarian', 'budget'],
  },
  {
    id: 'rec-93', name: 'Apple & Peanut Butter Slices', meal: 'Snack', goals: ['maintain', 'gain'],
    kcal: 250, protein: 8, carbs: 28, fat: 13, minutes: 4, servings: 1,
    ingredients: ['1 apple', '25 g peanut butter', 'cinnamon', '10 g crushed peanuts'],
    steps: [
      'Core the apple and cut it into thick rings — they hold the topping better than wedges.',
      'Spread the peanut butter on each ring, then dust with cinnamon and crushed peanuts.',
    ],
    tags: ['quick', 'no-cook', 'vegetarian', 'budget'],
  },
  {
    id: 'rec-94', name: 'Spiced Roasted Chickpeas', meal: 'Snack', goals: ['lose', 'maintain'],
    kcal: 180, protein: 9, carbs: 22, fat: 6, minutes: 35, servings: 3,
    ingredients: ['2 cans chickpeas', '1 tbsp olive oil', '1 tsp paprika', '½ tsp cumin', 'salt'],
    steps: [
      'Drain, rinse and dry the chickpeas thoroughly on a towel — wet ones never crisp.',
      'Toss with oil and salt only, and roast at 200 °C for 25–30 minutes, shaking twice.',
      'Add the spices AFTER roasting so they do not scorch.',
      'Cool completely before storing, or they go soft.',
    ],
    tags: ['vegan', 'budget', 'meal-prep'],
    tip: 'The crisp-crunch craving fix without the crisps.',
  },
  {
    id: 'rec-95', name: 'Skyr with Nuts & Cocoa Nibs', meal: 'Snack', goals: ['recomp', 'maintain'],
    kcal: 240, protein: 26, carbs: 16, fat: 9, minutes: 2, servings: 1,
    ingredients: ['200 g skyr', '15 g mixed nuts', '1 tsp cocoa nibs', 'honey'],
    steps: ['Spoon the skyr into a bowl.', 'Top with chopped nuts, cocoa nibs and a thin drizzle of honey.'],
    tags: ['high-protein', 'quick', 'no-cook', 'vegetarian'],
  },
  {
    id: 'rec-96', name: 'Tuna Rice Cakes', meal: 'Snack', goals: ['lose', 'recomp', 'strength'],
    kcal: 240, protein: 28, carbs: 24, fat: 4, minutes: 5, servings: 1,
    ingredients: ['1 can tuna', '3 rice cakes', '1 tbsp Greek yoghurt', 'lemon', 'black pepper'],
    steps: ['Mix the drained tuna with yoghurt, lemon and pepper.', 'Pile onto the rice cakes just before eating so they stay crisp.'],
    tags: ['high-protein', 'quick', 'no-cook', 'budget', 'post-workout'],
  },
  {
    id: 'rec-97', name: 'Edamame & Nori Snack Box', meal: 'Snack', goals: ['lose', 'recomp'],
    kcal: 210, protein: 20, carbs: 16, fat: 8, minutes: 8, servings: 1,
    ingredients: ['150 g edamame', '2 sheets nori', 'sesame seeds', 'soy sauce'],
    steps: ['Boil the edamame 4 minutes and cool them under the tap.', 'Pack with torn nori and sesame, and a small pot of soy for dipping.'],
    tags: ['vegan', 'high-protein', 'meal-prep'],
  },
  {
    id: 'rec-98', name: 'Banana Protein Muffins', meal: 'Snack', goals: ['gain', 'maintain'],
    kcal: 200, protein: 14, carbs: 24, fat: 6, minutes: 30, servings: 8,
    ingredients: ['3 ripe bananas', '2 eggs', '100 g oat flour', '2 scoops whey', '1 tsp baking powder', 'cinnamon'],
    steps: [
      'Mash the bananas properly — lumps become wet patches in the bake.',
      'Beat in the eggs, then fold in the dry ingredients until just combined (do not over-mix).',
      'Divide between 8 muffin cases and bake at 180 °C for 18–20 minutes.',
      'A skewer should come out clean. Cool on a rack so the bottoms do not sweat.',
    ],
    tags: ['high-protein', 'meal-prep', 'vegetarian', 'post-workout'],
  },
  {
    id: 'rec-99', name: 'Popcorn & Whey Combo', meal: 'Snack', goals: ['lose', 'maintain'],
    kcal: 230, protein: 27, carbs: 22, fat: 4, minutes: 6, servings: 1,
    ingredients: ['25 g popcorn kernels', '1 scoop whey', '300 ml water', 'salt'],
    steps: [
      'Pop the kernels in a covered pan with a teaspoon of oil, shaking it, until the pops slow to one every few seconds.',
      'Tip into a bowl and salt straight away while the steam is still rising — salt does not stick to cold popcorn.',
      'Shake the whey with cold water and have it alongside — volume plus protein for barely any calories.',
    ],
    tags: ['high-protein', 'quick', 'budget', 'vegetarian'],
  },

  // ---------------- Shakes ----------------
  {
    id: 'rec-100', name: 'Chocolate Peanut Protein Shake', meal: 'Shake', goals: ['gain', 'strength'],
    kcal: 480, protein: 40, carbs: 44, fat: 16, minutes: 4, servings: 1,
    ingredients: ['1.5 scoops chocolate whey', '1 banana', '20 g peanut butter', '300 ml milk', '1 tbsp cocoa'],
    steps: ['Blend the banana with the milk first so nothing stays stringy.', 'Add the rest and blend 30 seconds.'],
    tags: ['high-protein', 'high-carb', 'quick', 'post-workout', 'vegetarian'],
  },
  {
    id: 'rec-101', name: 'Mango Yoghurt Smoothie', meal: 'Shake', goals: ['maintain', 'recomp'],
    kcal: 300, protein: 26, carbs: 40, fat: 3, minutes: 4, servings: 1,
    ingredients: ['150 g frozen mango', '200 g Greek yoghurt', '1 scoop vanilla whey', '150 ml water', 'lime'],
    steps: ['Blend the frozen mango with the water until slushy.', 'Add yoghurt, whey and a squeeze of lime, and blend briefly.'],
    tags: ['high-protein', 'quick', 'no-cook', 'vegetarian'],
  },
  {
    id: 'rec-102', name: 'Oat & Date Pre-Workout Shake', meal: 'Shake', goals: ['strength', 'gain'],
    kcal: 420, protein: 22, carbs: 68, fat: 6, minutes: 5, servings: 1,
    ingredients: ['50 g oats', '3 dates', '1 scoop whey', '300 ml milk', 'pinch of salt'],
    steps: [
      'Soak the pitted dates in hot water 5 minutes so they blend smooth.',
      'Blend the oats to flour, then add everything else.',
      'Drink 60–90 minutes before training — carbs where you need them, not sitting heavy.',
    ],
    tags: ['high-carb', 'quick', 'vegetarian'],
    tip: 'The salt matters: a pinch makes carbs and fluid land better pre-session.',
  },
  {
    id: 'rec-103', name: 'Green Recovery Smoothie', meal: 'Shake', goals: ['recomp', 'maintain'],
    kcal: 320, protein: 28, carbs: 38, fat: 6, minutes: 5, servings: 1,
    ingredients: ['1 scoop whey', '1 banana', '2 handfuls spinach', '150 ml tart cherry juice', '150 ml water', 'ginger'],
    steps: [
      'Blend the spinach, water and ginger to a smooth base.',
      'Add the banana, whey and cherry juice and blend again.',
      'Best within an hour of a hard session.',
    ],
    tags: ['high-protein', 'post-workout', 'quick', 'vegetarian'],
    tip: 'Tart cherry has the most evidence of anything in this list for soreness.',
  },
  {
    id: 'rec-104', name: 'Bedtime Casein Custard', meal: 'Shake', goals: ['gain', 'recomp'],
    kcal: 280, protein: 32, carbs: 22, fat: 6, minutes: 5, servings: 1,
    ingredients: ['1 scoop casein', '200 ml milk', '1 tsp cocoa', '1 tsp chia'],
    steps: [
      'Whisk the casein and cocoa into the milk until smooth — casein clumps if you rush it.',
      'Stir in the chia and leave 10 minutes; it sets to a thick custard you can spoon.',
      'Eat 30–60 minutes before bed.',
    ],
    tags: ['high-protein', 'quick', 'no-cook', 'vegetarian'],
  },

  // ---------------- Sweets that still count ----------------
  {
    id: 'rec-105', name: 'Protein Rice Pudding', meal: 'Snack', goals: ['gain', 'maintain'],
    kcal: 340, protein: 26, carbs: 52, fat: 5, minutes: 30, servings: 2,
    ingredients: ['100 g pudding rice', '500 ml milk', '1 scoop vanilla whey', 'cinnamon', 'honey'],
    steps: [
      'Simmer the rice in the milk on LOW for 25 minutes, stirring often so it does not catch.',
      'Take it off the heat and cool for 3 minutes.',
      'Only then whisk in the whey — protein added to a boiling pan splits and goes grainy.',
      'Serve warm with cinnamon and a little honey.',
    ],
    tags: ['high-protein', 'high-carb', 'vegetarian', 'budget'],
  },
  {
    id: 'rec-106', name: 'Baked Protein Cheesecake Pot', meal: 'Snack', goals: ['recomp', 'maintain'],
    kcal: 260, protein: 28, carbs: 18, fat: 8, minutes: 35, servings: 2,
    ingredients: ['250 g quark', '1 egg', '1 scoop vanilla whey', '1 tbsp honey', '2 digestive biscuits', 'lemon zest'],
    steps: [
      'Crush the biscuits and press them into the base of two ramekins.',
      'Beat quark, egg, whey, honey and zest until completely smooth.',
      'Pour in and bake at 160 °C for 22–25 minutes — low and slow stops it cracking.',
      'Cool, then chill at least 2 hours before eating.',
    ],
    tags: ['high-protein', 'meal-prep', 'vegetarian'],
    tip: 'Dessert that lands at 28 g of protein. Make two, eat one tomorrow.',
  },
  {
    id: 'rec-107', name: 'Frozen Banana Protein Ice Cream', meal: 'Snack', goals: ['lose', 'recomp', 'maintain'],
    kcal: 230, protein: 26, carbs: 30, fat: 2, minutes: 5, servings: 1,
    ingredients: ['2 frozen bananas', '1 scoop whey', '50 ml milk', 'cocoa (optional)'],
    steps: [
      'Slice the bananas before freezing them — a whole frozen banana kills blenders.',
      'Blitz the frozen slices with the whey and just enough milk to get it moving.',
      'Stop while it is still thick and scoopable, and eat immediately.',
    ],
    tags: ['high-protein', 'quick', 'no-cook', 'vegetarian', 'budget'],
    tip: 'Keep a bag of sliced frozen banana in the freezer permanently.',
  },
];
