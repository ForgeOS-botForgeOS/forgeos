import type { Goal } from '../types';

// ---- Recovery nutrients & supplements ----
// Deliberately conservative. ForgeOS is used by a 15-year-old who trains hard,
// so every entry leads with food, quotes ordinary label-level amounts (never
// therapeutic megadoses), and says plainly when the honest answer is "only if a
// blood test says so" or "ask an adult first". Nothing here is medical advice —
// the UI repeats that, loudly.

export type SupplementFlag =
  | 'lowSleep' // averaging under 7 h
  | 'hardTraining' // 4+ sessions a week
  | 'darkMonths' // Oct–Mar at Slovak latitude: little skin synthesis of vitamin D
  | 'vegetarian'
  | 'vegan'
  | 'soreness'; // recent big jump in training load

export type SupplementPriority = 'core' | 'consider' | 'situational';

export interface Supplement {
  id: string;
  name: string;
  icon: string;
  /** What it actually does, in one line. */
  what: string;
  /** Why it belongs in a *recovery* list specifically. */
  recovery: string;
  /** Food sources first — most people fix this on a plate, not in a pill. */
  foodFirst: string;
  /** Ordinary, label-level intake. Never a therapeutic dose. */
  typical: string;
  timing: string;
  /** The honest caveat. Every entry has one. */
  caution: string;
  basePriority: SupplementPriority;
  /** Bumped to 'core' when any of these apply to you. */
  raisedBy?: SupplementFlag[];
  /** Only shown at all when one of these applies. */
  onlyIf?: SupplementFlag[];
  goals?: Goal[];
}

export const SUPPLEMENTS: Supplement[] = [
  {
    id: 'protein',
    name: 'Protein powder (whey / plant)',
    icon: '🥛',
    what: 'Convenient protein — 20–25 g a scoop, no cooking.',
    recovery: 'Muscle repair needs a steady protein supply through the day. Powder is the easy fourth serving when appetite or time runs out.',
    foodFirst: 'Quark, skyr, cottage cheese, eggs, chicken, fish, lentils, tofu. Food wins on nutrients and fullness every time.',
    typical: '1 scoop (20–30 g protein) on days you fall short',
    timing: 'Any time it fills a gap — after training or with breakfast is easiest.',
    caution: 'It is food, not magic: hitting your protein from meals is equally good. Skip if you already hit your target.',
    basePriority: 'consider',
    raisedBy: ['hardTraining'],
  },
  {
    id: 'vitamin-d',
    name: 'Vitamin D3',
    icon: '☀️',
    what: 'A vitamin your skin makes from sunlight; most of Central Europe runs low in winter.',
    recovery: 'Low vitamin D is linked to worse muscle function, more infections and slower recovery. Sick weeks are lost training weeks.',
    foodFirst: 'Oily fish (salmon, mackerel, sardines), egg yolks, fortified milk and cereals — plus daylight on skin in summer.',
    typical: '400–1000 IU (10–25 µg) a day in the dark months, which is standard supermarket strength',
    timing: 'With a meal containing fat — it needs fat to absorb.',
    caution: 'Do not stack multiple products; vitamin D is fat-soluble and does accumulate. Never take "high strength" adult doses without a doctor.',
    basePriority: 'consider',
    raisedBy: ['darkMonths'],
  },
  {
    id: 'magnesium',
    name: 'Magnesium',
    icon: '🌿',
    what: 'A mineral used in hundreds of reactions, including muscle contraction and sleep regulation.',
    recovery: 'Hard training raises what you lose in sweat. Low magnesium shows up as cramps, twitchy muscles and poor sleep quality.',
    foodFirst: 'Pumpkin seeds, almonds, dark chocolate, oats, spinach, beans, wholegrain bread.',
    typical: '200–300 mg a day if your diet is short on nuts, seeds and greens',
    timing: 'Evening — some people find it helps them fall asleep.',
    caution: 'Too much (especially oxide) simply causes diarrhoea. Citrate or glycinate are gentler. Start at the low end.',
    basePriority: 'consider',
    raisedBy: ['lowSleep', 'hardTraining'],
  },
  {
    id: 'omega3',
    name: 'Omega-3 (EPA/DHA)',
    icon: '🐟',
    what: 'Fatty acids from oily fish that your body cannot make.',
    recovery: 'Modest but real effects on muscle soreness and joint comfort, and it supports the recovery side of hard training blocks.',
    foodFirst: 'Two portions of oily fish a week beats any capsule. Salmon, mackerel, herring, sardines.',
    typical: '1–2 g combined EPA+DHA a day if you rarely eat fish',
    timing: 'With food. Keep it in the fridge so it does not go rancid.',
    caution: 'Vegetarian? Look for algae oil — flaxseed converts to EPA/DHA very poorly.',
    basePriority: 'consider',
    raisedBy: ['soreness'],
  },
  {
    id: 'creatine',
    name: 'Creatine monohydrate',
    icon: '⚡',
    what: 'The most studied sports supplement there is: more available energy for short, hard efforts.',
    recovery: 'Better performance per session and some evidence for less damage and faster recovery between them.',
    foodFirst: 'Red meat and fish contain it, but nowhere near the amounts studied.',
    typical: '3–5 g a day, every day. No loading phase needed.',
    timing: 'Any time — consistency matters, timing does not.',
    caution: 'Under 18: research is mostly in adults, so talk to a parent and ideally a doctor or pharmacist before starting. Drink enough water. Only ever buy plain monohydrate.',
    basePriority: 'situational',
    goals: ['gain', 'strength', 'recomp'],
  },
  {
    id: 'calcium',
    name: 'Calcium',
    icon: '🦴',
    what: 'The mineral your skeleton is built from.',
    recovery: 'Teenage years are when most adult bone is laid down, and lifting only helps if the raw material is there.',
    foodFirst: 'Milk, yoghurt, quark, cheese, tinned sardines, fortified plant milks, kale.',
    typical: 'Aim for ~1000–1300 mg a day from food at your age; supplement only if dairy is out',
    timing: 'Spread over the day; large single doses absorb poorly.',
    caution: 'Vegan or dairy-free? Check that your plant milk is calcium-fortified — many cheap ones are not.',
    basePriority: 'consider',
    raisedBy: ['vegan'],
  },
  {
    id: 'b12',
    name: 'Vitamin B12',
    icon: '🧬',
    what: 'A vitamin found almost exclusively in animal foods.',
    recovery: 'Needed for red blood cells and energy metabolism. A deficiency shows up as fatigue that no amount of rest fixes.',
    foodFirst: 'Meat, fish, eggs, dairy. On a plant-based diet: fortified foods and nutritional yeast.',
    typical: 'Vegans need a supplement — commonly 10–25 µg daily or a weekly higher dose',
    timing: 'Any time, with or without food.',
    caution: 'Not optional on a vegan diet. This is the one nutrient plants genuinely cannot supply.',
    basePriority: 'situational',
    onlyIf: ['vegan', 'vegetarian'],
  },
  {
    id: 'iron',
    name: 'Iron',
    icon: '🩸',
    what: 'Carries oxygen in your blood.',
    recovery: 'Low iron destroys endurance and leaves you flat in every session — a classic hidden cause of "my training went backwards".',
    foodFirst: 'Red meat, liver, lentils, beans, tofu, spinach. Pair plant iron with vitamin C (pepper, citrus) to absorb more.',
    typical: 'Do not guess. A supplement is only sensible after a blood test shows low ferritin.',
    timing: 'If prescribed: away from tea, coffee and calcium, which block absorption.',
    caution: 'Iron overload is genuinely dangerous and unsupervised iron is a common poisoning in children. Blood test first, always.',
    basePriority: 'situational',
    raisedBy: ['vegan', 'vegetarian'],
  },
  {
    id: 'vitamin-c',
    name: 'Vitamin C',
    icon: '🍊',
    what: 'An antioxidant vitamin needed to build collagen.',
    recovery: 'Supports connective tissue and immune function through heavy training blocks.',
    foodFirst: 'Peppers, citrus, kiwi, strawberries, broccoli — a pepper has more than an orange.',
    typical: 'The RDA (~80 mg) is easy from food; no need for grams',
    timing: 'With meals, especially plant-iron meals.',
    caution: 'Very high doses around training may actually blunt some adaptations. More is not better here.',
    basePriority: 'situational',
  },
  {
    id: 'zinc',
    name: 'Zinc',
    icon: '🛡️',
    what: 'A mineral involved in immune function and tissue repair.',
    recovery: 'Lost in sweat; low intake is associated with more frequent illness.',
    foodFirst: 'Meat, shellfish, seeds, cheese, wholegrains, legumes.',
    typical: 'Around the RDA (~10 mg) at most, and only short-term',
    timing: 'With food — on an empty stomach it often causes nausea.',
    caution: 'Long-term high zinc blocks copper absorption. Do not take it continuously "just in case".',
    basePriority: 'situational',
    raisedBy: ['vegan'],
  },
  {
    id: 'electrolytes',
    name: 'Electrolytes (sodium & potassium)',
    icon: '🧂',
    what: 'The salts you sweat out.',
    recovery: 'Rehydrating with water alone after a very sweaty session leaves you flat and crampy; salt is what makes fluid stay.',
    foodFirst: 'Salt your food, and eat fruit and potatoes for potassium. A pinch of salt in your water bottle does the job.',
    typical: 'Only around long, hot or very sweaty sessions',
    timing: 'During and after training.',
    caution: 'Sports drinks are mostly sugar and marketing. You do not need them for a one-hour gym session.',
    basePriority: 'situational',
    raisedBy: ['hardTraining'],
  },
  {
    id: 'tart-cherry',
    name: 'Tart cherry',
    icon: '🍒',
    what: 'A fruit concentrate with polyphenols, sold as juice or capsules.',
    recovery: 'Among the better-evidenced foods for muscle soreness and sleep quality after hard sessions.',
    foodFirst: 'The juice itself is the food version — 150–250 ml.',
    typical: '150–250 ml juice, or a concentrate, for a few days around hard blocks',
    timing: 'Evening, or after a session that will hurt tomorrow.',
    caution: 'It is sugar-containing juice — count the calories on a cut.',
    basePriority: 'situational',
    raisedBy: ['soreness'],
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    icon: '☕',
    what: 'A stimulant that reduces perceived effort.',
    recovery: 'Improves training quality — but the recovery angle is the warning: late caffeine wrecks the sleep that recovery actually depends on.',
    foodFirst: 'Coffee or tea. Same molecule, cheaper, with company.',
    typical: 'Teens should stay well under ~100 mg a day — roughly one coffee',
    timing: 'Morning or early afternoon only.',
    caution: 'Nothing within 8 hours of bed, no pre-workout tubs, never stacked with energy drinks. Sleep beats stimulants for every goal on this list.',
    basePriority: 'situational',
  },
  {
    id: 'multivitamin',
    name: 'Multivitamin',
    icon: '💊',
    what: 'A low-dose safety net across many micronutrients.',
    recovery: 'Insurance for weeks when eating gets chaotic — exams, travel, a fussy stretch.',
    foodFirst: 'Five portions of varied fruit and veg does this better and tastes like food.',
    typical: 'One standard tablet on days your diet is genuinely poor',
    timing: 'With a meal.',
    caution: 'Not a substitute for vegetables, and do not double up with single-nutrient pills — that is how you overshoot.',
    basePriority: 'situational',
    onlyIf: ['vegan', 'vegetarian', 'hardTraining'],
  },
];

export const supplementById = (id: string) => SUPPLEMENTS.find((s) => s.id === id);

/** Shown at the top of the recovery tab, and it is not decoration. */
export const SUPPLEMENT_DISCLAIMER =
  'Food first, always — supplements fill gaps, they do not create progress. Nothing here is medical advice. You are under 18, so talk to a parent, pharmacist or doctor before starting anything, never exceed the label dose, and skip anything sold with a promise instead of a study.';
