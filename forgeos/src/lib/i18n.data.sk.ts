// Slovak for labels that come from data rather than from JSX: muscle groups,
// exercise categories, filter values, tab labels and the achievement list.
// They reach the screen as t(value), so the key is the English value itself;
// anything missing here simply stays English.
export const SK_DATA: Record<string, string> = {
  // muscle groups
  Chest: 'Hrudník', Back: 'Chrbát', Shoulders: 'Ramená', Biceps: 'Biceps', Triceps: 'Triceps', Quads: 'Stehná',
  Hamstrings: 'Zadné stehná', Glutes: 'Sedacie svaly', Calves: 'Lýtka', Core: 'Stred tela', 'Full Body': 'Celé telo',
  // exercise categories
  Powerlifting: 'Silový trojboj', Bodybuilding: 'Kulturistika', Plyometrics: 'Plyometria', Calisthenics: 'Kalistenika',
  Olympic: 'Vzpieranie', CrossFit: 'CrossFit', Mobility: 'Mobilita',
  // filter and scope pills
  all: 'všetko', friends: 'priatelia', mine: 'moje', daily: 'denné', weekly: 'týždenné', monthly: 'mesačné', yearly: 'ročné',
  Any: 'Ľubovoľné', None: 'Žiadne', Tempo: 'Tempo', Band: 'Guma', Hold: 'Výdrž', Grip: 'Úchop',
  // tabs
  Feed: 'Príspevky', Friends: 'Priatelia', 'Live race': 'Preteky', Marketplace: 'Trhovisko',
  'Power-ups': 'Vylepšenia', Titles: 'Tituly', Badges: 'Odznaky', Frames: 'Rámiky', Confetti: 'Konfety', Themes: 'Témy',
  'Sub-targets': 'Podciele', 'Big weight': 'Veľká váha', 'Big reps': 'Veľké opakovania',
  // goals and training blocks
  'Lose fat': 'Schudnúť', Maintain: 'Udržať', 'Build muscle': 'Nabrať svaly', Recomp: 'Rekompozícia', 'Get stronger': 'Zosilnieť',
  hypertrophy: 'hypertrofia', strength: 'sila', deload: 'deload', 'Next block': 'Ďalší blok', 'Avg RPE': 'Priem. RPE',
  'Avg volume / wk': 'Priem. objem / týž.',
  // meals
  Breakfast: 'Raňajky', Lunch: 'Obed', Dinner: 'Večera', Snack: 'Desiata', Shake: 'Šejk',
  // readiness
  'guest account': 'účet hosťa',

  // achievements — titles
  'First Steps': 'Prvé kroky', 'Warming Up': 'Rozcvička', 'Getting Serious': 'Ide do tuhého', Committed: 'Oddaný',
  Regular: 'Štamgast', Devoted: 'Verný', Centurion: 'Centurión', 'Iron Veteran': 'Železný veterán', 'A Year of Iron': 'Rok železa',
  'Record Setter': 'Lámač rekordov', 'On a Roll': 'Na vlne', 'Breaking Limits': 'Za hranice', 'Ceiling Smasher': 'Búrač stropov',
  Limitless: 'Bez limitov', Momentum: 'Rozbeh', 'One Week Strong': 'Silný týždeň', 'Fortnight Fire': 'Dva týždne v ohni',
  'Iron Habit': 'Železný zvyk', Relentless: 'Neúnavný', Unbreakable: 'Nezlomný', Mover: 'Nosič', Workhorse: 'Ťahúň', Tonnage: 'Tonáž',
  'Quarter Million': 'Štvrť milióna', 'Half a Mountain': 'Pol hory', 'Iron Mountain': 'Železná hora', Tectonic: 'Tektonický',
  '100 Club': 'Klub 100', 'Triple Plates': 'Tri kotúče', 'Plate Mover': 'Hýbač kotúčov', 'Iron Forged': 'Ukutý zo železa',
  'Heavy Hitter': 'Ťažká váha', Titan: 'Titan', 'First Mile': 'Prvý kilometer', 'Pavement Pounder': 'Dlaždič', 'Century Rider': 'Stovkár',
  'Endurance Engine': 'Vytrvalostný motor', 'Curious Mind': 'Zvedavá myseľ', Bookworm: 'Knihomoľ', Philosopher: 'Filozof', Sage: 'Mudrc',
  'Pocket Change': 'Drobné', 'Coin Hoarder': 'Zberateľ mincí', 'Forge Banker': 'Kováčsky bankár', 'Iron Tycoon': 'Železný magnát',
  Tempered: 'Zakalený', 'Struck Gold': 'Zlatá žila', 'Forged in Platinum': 'Ukutý v platine', 'Living Legend': 'Žijúca legenda',
  'Apex Forged': 'Na vrchole', 'Strong All Round': 'Všestranne silný', 'Complete Athlete': 'Kompletný športovec',
  'Well Rested': 'Vyspatý', 'Sleep Athlete': 'Spánkový športovec', 'Recovery Master': 'Majster regenerácie', Wanderer: 'Pútnik',
  'Million Stepper': 'Milión krokov',
  // achievements — descriptions
  'Complete your first workout': 'Dokonči svoj prvý tréning', 'Complete 5 workouts': 'Dokonči 5 tréningov',
  'Complete 10 workouts': 'Dokonči 10 tréningov', 'Complete 25 workouts': 'Dokonči 25 tréningov',
  'Complete 50 workouts': 'Dokonči 50 tréningov', 'Complete 75 workouts': 'Dokonči 75 tréningov',
  'Complete 100 workouts': 'Dokonči 100 tréningov', 'Complete 200 workouts': 'Dokonči 200 tréningov',
  'Complete 365 workouts': 'Dokonči 365 tréningov', 'Set your first PR': 'Urob svoj prvý rekord', 'Set 5 PRs': 'Urob 5 rekordov',
  'Set 10 PRs': 'Urob 10 rekordov', 'Set 25 PRs': 'Urob 25 rekordov', 'Set 50 PRs': 'Urob 50 rekordov',
  '3-day streak': '3-dňová séria', '7-day streak': '7-dňová séria', '14-day streak': '14-dňová séria',
  '30-day streak': '30-dňová séria', '60-day streak': '60-dňová séria', '100-day streak': '100-dňová séria',
  'Lift 10,000 kg total': 'Zdvihni spolu 10 000 kg', 'Lift 50,000 kg total': 'Zdvihni spolu 50 000 kg',
  'Lift 100,000 kg total': 'Zdvihni spolu 100 000 kg', 'Lift 250,000 kg total': 'Zdvihni spolu 250 000 kg',
  'Lift 500,000 kg total': 'Zdvihni spolu 500 000 kg', 'Lift 1,000,000 kg total': 'Zdvihni spolu 1 000 000 kg',
  'Lift 2,500,000 kg total': 'Zdvihni spolu 2 500 000 kg', 'Complete a set at 100 kg+': 'Dokonči sériu so 100 kg a viac',
  '10 sets at 100 kg+': '10 sérií so 100 kg a viac', '25 sets at 100 kg+': '25 sérií so 100 kg a viac',
  '50 sets at 100 kg+': '50 sérií so 100 kg a viac', '100 sets at 100 kg+': '100 sérií so 100 kg a viac',
  '250 sets at 100 kg+': '250 sérií so 100 kg a viac', 'Log your first cardio km': 'Zapíš svoj prvý kardio kilometer',
  'Cover 25 km of cardio': 'Prejdi 25 km kardia', 'Cover 100 km of cardio': 'Prejdi 100 km kardia',
  'Cover 500 km of cardio': 'Prejdi 500 km kardia', 'Collect 10 quotes': 'Nazbieraj 10 citátov',
  'Collect 50 quotes': 'Nazbieraj 50 citátov', 'Collect 100 quotes': 'Nazbieraj 100 citátov',
  'Collect 200 quotes': 'Nazbieraj 200 citátov', 'Hold 100 Forge Coins': 'Maj 100 Forge mincí',
  'Hold 500 Forge Coins': 'Maj 500 Forge mincí', 'Hold 1,000 Forge Coins': 'Maj 1 000 Forge mincí',
  'Hold 2,500 Forge Coins': 'Maj 2 500 Forge mincí', 'Reach Silver rank': 'Dosiahni rank Silver',
  'Reach Gold rank': 'Dosiahni rank Gold', 'Reach Platinum rank': 'Dosiahni rank Platinum',
  'Reach Legend rank': 'Dosiahni rank Legend', 'Reach the highest rank': 'Dosiahni najvyšší rank',
  '10 PRs and 25 heavy sets': '10 rekordov a 25 ťažkých sérií',
  '50 sessions, 50 km cardio, 50 PRs': '50 tréningov, 50 km kardia, 50 rekordov',
  '7 nights of 8h+ sleep': '7 nocí s 8 a viac hodinami spánku', '30 nights of 8h+ sleep': '30 nocí s 8 a viac hodinami spánku',
  '100 nights of 8h+ sleep': '100 nocí s 8 a viac hodinami spánku',
  'Walk 100,000 steps (synced)': 'Prejdi 100 000 krokov (synchronizované)',
  'Walk 1,000,000 steps (synced)': 'Prejdi 1 000 000 krokov (synchronizované)',
};
