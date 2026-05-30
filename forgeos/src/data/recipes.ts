import type { Goal } from '../types';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Shake';

export interface Recipe {
  id: string;
  name: string;
  meal: MealType;
  goals: Goal[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  minutes: number;
  ingredients: string[];
  steps: string;
}

let n = 0;
function r(
  name: string,
  meal: MealType,
  goals: Goal[],
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  minutes: number,
  ingredients: string[],
  steps: string,
): Recipe {
  n += 1;
  return { id: `rec-${n}`, name, meal, goals, kcal, protein, carbs, fat, minutes, ingredients, steps };
}

// 50+ goal-aligned recipes. Macros are per serving (metric).
export const RECIPES: Recipe[] = [
  // ---- Breakfast ----
  r('Protein Oats & Berries', 'Breakfast', ['gain', 'maintain', 'strength'], 430, 30, 58, 9, 8, ['80g oats', '1 scoop whey', '100g berries', '200ml milk'], 'Cook oats with milk, stir in whey off the heat, top with berries.'),
  r('Egg-White Veggie Scramble', 'Breakfast', ['lose', 'recomp'], 260, 32, 10, 9, 12, ['6 egg whites', '2 whole eggs', 'spinach', 'peppers', 'tomato'], 'Sauté veg, add eggs, scramble on low heat.'),
  r('Greek Yoghurt Power Bowl', 'Breakfast', ['lose', 'recomp', 'maintain'], 320, 28, 30, 8, 5, ['250g 0% Greek yoghurt', '30g granola', 'honey', 'berries'], 'Layer yoghurt, granola and berries; drizzle honey.'),
  r('Banana Peanut Overnight Oats', 'Breakfast', ['gain', 'strength'], 480, 20, 62, 16, 5, ['70g oats', '1 banana', '20g peanut butter', '200ml milk', 'chia'], 'Combine, refrigerate overnight, stir before eating.'),
  r('Cottage Cheese Toast', 'Breakfast', ['lose', 'recomp'], 300, 28, 30, 7, 6, ['200g cottage cheese', '2 slices rye', 'tomato', 'pepper'], 'Toast bread, top with cottage cheese and tomato.'),
  r('Spinach Feta Omelette', 'Breakfast', ['recomp', 'maintain'], 350, 26, 6, 24, 10, ['3 eggs', '30g feta', 'spinach', 'olive oil'], 'Whisk eggs, pour over wilted spinach, fold with feta.'),
  r('Tofu Scramble', 'Breakfast', ['lose', 'recomp'], 280, 24, 12, 15, 12, ['200g firm tofu', 'turmeric', 'onion', 'spinach'], 'Crumble tofu, sauté with onion and spices.'),
  r('Protein Pancakes', 'Breakfast', ['gain', 'maintain'], 410, 34, 45, 9, 15, ['50g oats', '1 scoop whey', '2 eggs', 'banana'], 'Blend, cook small pancakes on a non-stick pan.'),

  // ---- Lunch ----
  r('Chicken Rice Broccoli Bowl', 'Lunch', ['recomp', 'maintain', 'strength'], 540, 48, 55, 12, 25, ['180g chicken breast', '150g cooked rice', 'broccoli', 'olive oil'], 'Grill chicken, steam broccoli, combine over rice.'),
  r('Tuna Pasta Salad', 'Lunch', ['lose', 'recomp'], 420, 38, 45, 9, 15, ['1 can tuna', '80g pasta', 'sweetcorn', 'light mayo'], 'Cook pasta, cool, fold through tuna and corn.'),
  r('Turkey Wrap', 'Lunch', ['lose', 'maintain'], 380, 34, 38, 11, 10, ['120g turkey', 'wholemeal wrap', 'lettuce', 'mustard'], 'Layer turkey and salad in the wrap and roll.'),
  r('Lentil & Quinoa Salad', 'Lunch', ['recomp', 'maintain'], 450, 24, 60, 12, 20, ['100g lentils', '80g quinoa', 'cucumber', 'lemon'], 'Cook grains, toss with lentils and chopped veg.'),
  r('Beef & Sweet Potato', 'Lunch', ['gain', 'strength'], 620, 45, 55, 22, 30, ['180g lean beef', '250g sweet potato', 'green beans'], 'Roast potato, pan-sear beef, serve with beans.'),
  r('Salmon Poke Bowl', 'Lunch', ['recomp', 'maintain'], 560, 36, 55, 20, 20, ['150g salmon', '150g rice', 'edamame', 'soy', 'avocado'], 'Cube salmon, assemble over rice with toppings.'),
  r('Chickpea Curry & Rice', 'Lunch', ['gain', 'maintain'], 580, 22, 80, 16, 25, ['1 can chickpeas', 'coconut milk', 'curry paste', '150g rice'], 'Simmer chickpeas in sauce, serve over rice.'),
  r('Prawn Stir-Fry', 'Lunch', ['lose', 'recomp'], 360, 34, 30, 10, 18, ['180g prawns', 'mixed veg', 'noodles', 'soy'], 'Stir-fry prawns and veg, toss with noodles.'),

  // ---- Dinner ----
  r('Steak, Potatoes & Asparagus', 'Dinner', ['gain', 'strength'], 680, 50, 45, 30, 30, ['200g sirloin', '250g potatoes', 'asparagus', 'butter'], 'Sear steak, roast potatoes, griddle asparagus.'),
  r('Baked Cod & Veg', 'Dinner', ['lose', 'recomp'], 340, 40, 18, 11, 30, ['200g cod', 'courgette', 'cherry tomatoes', 'olive oil'], 'Bake cod and veg together at 200°C for 18 min.'),
  r('Chicken Fajita Bowl', 'Dinner', ['recomp', 'maintain'], 520, 44, 48, 16, 25, ['180g chicken', 'peppers', 'black beans', 'rice'], 'Sauté chicken and peppers, serve over rice and beans.'),
  r('Turkey Bolognese', 'Dinner', ['recomp', 'maintain', 'strength'], 540, 42, 58, 12, 30, ['180g turkey mince', 'pasta', 'tomato sauce', 'onion'], 'Brown mince, simmer in sauce, serve over pasta.'),
  r('Tofu Veg Stir-Fry', 'Dinner', ['lose', 'recomp'], 380, 26, 35, 16, 20, ['200g tofu', 'broccoli', 'pepper', 'rice', 'soy'], 'Crisp tofu, stir-fry veg, combine with rice.'),
  r('Salmon, Rice & Greens', 'Dinner', ['gain', 'maintain', 'strength'], 600, 40, 50, 26, 25, ['180g salmon', '150g rice', 'kale', 'lemon'], 'Bake salmon, steam rice and kale.'),
  r('Chilli Con Carne', 'Dinner', ['gain', 'strength'], 560, 40, 55, 18, 35, ['200g beef mince', 'kidney beans', 'tomatoes', 'rice'], 'Brown beef, simmer with beans and tomato, serve over rice.'),
  r('Stuffed Peppers', 'Dinner', ['lose', 'recomp'], 400, 32, 38, 12, 35, ['2 peppers', '150g turkey mince', 'rice', 'cheese'], 'Fill peppers with mince and rice, bake 25 min.'),
  r('Shrimp & Zoodles', 'Dinner', ['lose', 'recomp'], 300, 34, 14, 12, 18, ['200g prawns', '2 courgettes', 'garlic', 'chilli'], 'Spiralise courgette, sauté prawns and garlic, toss.'),
  r('Chicken Tikka & Cauliflower Rice', 'Dinner', ['lose', 'recomp'], 380, 42, 18, 14, 30, ['200g chicken', 'tikka paste', 'cauliflower', 'yoghurt'], 'Marinate chicken, grill, serve with riced cauliflower.'),

  // ---- Snacks ----
  r('Rice Cakes & Peanut Butter', 'Snack', ['gain', 'strength'], 250, 8, 28, 12, 3, ['2 rice cakes', '20g peanut butter'], 'Spread peanut butter over rice cakes.'),
  r('Cottage Cheese & Pineapple', 'Snack', ['lose', 'recomp'], 180, 22, 16, 3, 3, ['200g cottage cheese', 'pineapple'], 'Combine and serve.'),
  r('Boiled Eggs & Apple', 'Snack', ['lose', 'maintain'], 240, 18, 20, 11, 12, ['3 boiled eggs', '1 apple'], 'Boil eggs 8 min; serve with sliced apple.'),
  r('Beef Jerky & Almonds', 'Snack', ['lose', 'recomp', 'strength'], 280, 26, 8, 16, 1, ['40g jerky', '20g almonds'], 'Portion and enjoy.'),
  r('Protein Yoghurt & Honey', 'Snack', ['recomp', 'maintain'], 210, 24, 20, 3, 2, ['200g skyr', 'honey'], 'Stir honey into skyr.'),
  r('Hummus & Veg Sticks', 'Snack', ['lose', 'maintain'], 200, 8, 18, 11, 5, ['80g hummus', 'carrot', 'cucumber'], 'Cut veg into sticks, dip.'),
  r('Edamame Bowl', 'Snack', ['lose', 'recomp'], 190, 18, 14, 8, 6, ['150g edamame', 'sea salt'], 'Steam edamame, salt lightly.'),
  r('Tuna Cucumber Boats', 'Snack', ['lose', 'recomp'], 170, 26, 6, 5, 8, ['1 can tuna', '1 cucumber', 'light mayo'], 'Halve cucumber, fill with tuna.'),
  r('Dark Chocolate & Whey', 'Snack', ['maintain', 'gain'], 230, 26, 14, 7, 2, ['1 scoop whey', '15g 85% chocolate'], 'Pair a square with a shake.'),

  // ---- Shakes ----
  r('Mass Gainer Shake', 'Shake', ['gain', 'strength'], 650, 45, 80, 14, 5, ['1.5 scoops whey', 'oats', 'banana', 'peanut butter', 'milk'], 'Blend everything until smooth.'),
  r('Lean Green Protein Shake', 'Shake', ['lose', 'recomp'], 240, 30, 16, 5, 5, ['1 scoop whey', 'spinach', 'frozen berries', 'water'], 'Blend with ice.'),
  r('Peanut Banana Recovery Shake', 'Shake', ['gain', 'strength'], 420, 32, 42, 14, 5, ['1 scoop whey', 'banana', '15g peanut butter', 'milk'], 'Blend post-session.'),
  r('Cherry Tart Casein Shake', 'Shake', ['maintain', 'recomp'], 220, 28, 18, 4, 4, ['1 scoop casein', 'tart cherry juice', 'water'], 'Blend before bed for slow protein.'),
  r('Coffee Protein Frappe', 'Shake', ['lose', 'maintain'], 200, 26, 12, 4, 5, ['1 scoop whey', 'cold brew', 'ice', 'milk'], 'Blend with ice.'),
  r('Berry Oat Smoothie', 'Shake', ['gain', 'maintain'], 380, 28, 52, 7, 5, ['1 scoop whey', 'oats', 'mixed berries', 'yoghurt'], 'Blend until smooth.'),

  // ---- Extra mains to round out variety ----
  r('Pork & Apple Traybake', 'Dinner', ['gain', 'maintain'], 560, 44, 40, 24, 35, ['200g pork loin', 'apple', 'potatoes', 'rosemary'], 'Roast everything together at 200°C for 30 min.'),
  r('Falafel & Tabbouleh', 'Lunch', ['recomp', 'maintain'], 470, 20, 58, 18, 25, ['baked falafel', 'bulgur', 'parsley', 'lemon'], 'Bake falafel, toss tabbouleh, plate together.'),
  r('Egg Fried Rice with Chicken', 'Dinner', ['recomp', 'strength'], 560, 42, 60, 14, 20, ['180g chicken', '150g rice', '2 eggs', 'peas', 'soy'], 'Stir-fry day-old rice with egg, chicken and peas.'),
  r('Smoked Mackerel Salad', 'Lunch', ['recomp', 'maintain'], 480, 32, 18, 30, 12, ['150g mackerel', 'mixed leaves', 'beetroot', 'olive oil'], 'Flake mackerel over dressed salad.'),
  r('Black Bean Burrito', 'Lunch', ['gain', 'maintain'], 560, 26, 78, 16, 15, ['black beans', 'tortilla', 'rice', 'salsa', 'cheese'], 'Fill tortilla, roll, toast in a dry pan.'),
  r('Cod, Lentils & Chorizo', 'Dinner', ['recomp', 'strength'], 460, 44, 30, 18, 30, ['200g cod', 'lentils', '30g chorizo', 'spinach'], 'Simmer lentils with chorizo, top with baked cod.'),
  r('Chicken Caesar (light)', 'Lunch', ['lose', 'recomp'], 360, 40, 12, 16, 15, ['180g chicken', 'romaine', 'light caesar', 'parmesan'], 'Grill chicken, toss with leaves and dressing.'),
  r('Veggie Omelette Wrap', 'Breakfast', ['lose', 'recomp'], 320, 26, 24, 14, 12, ['3 eggs', 'wrap', 'peppers', 'spinach'], 'Make a thin omelette, fill wrap and roll.'),
  r('Quinoa Chicken Buddha Bowl', 'Lunch', ['recomp', 'maintain', 'strength'], 540, 42, 52, 16, 25, ['150g chicken', 'quinoa', 'roast veg', 'tahini'], 'Assemble bowl, drizzle tahini.'),
  r('Protein French Toast', 'Breakfast', ['gain', 'maintain'], 440, 30, 48, 13, 15, ['2 eggs', '1 scoop whey', '2 slices bread', 'cinnamon'], 'Dip bread in egg-whey mix, pan-fry.'),
  r('Sweet Potato & Black Bean Chilli', 'Dinner', ['lose', 'recomp'], 420, 20, 66, 9, 35, ['sweet potato', 'black beans', 'tomatoes', 'spices'], 'Simmer all together until thick.'),
];

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Shake'];

export function recipesForGoal(goal: Goal): Recipe[] {
  return RECIPES.filter((rec) => rec.goals.includes(goal));
}
