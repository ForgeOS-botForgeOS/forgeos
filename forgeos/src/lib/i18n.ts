import { useSettings } from '../state/settingsStore';
import type { Language } from '../types';

// Key-based translations. English is the source; Slovak is the full localisation.
// t('key') returns the string for the active language, falling back to the key.
type Dict = Record<string, string>;

const EN: Dict = {
  // nav
  'nav.home': 'Home',
  'nav.train': 'Train',
  'nav.food': 'Food',
  'nav.social': 'Social',
  'nav.quests': 'Quests',
  'nav.you': 'You',
  // common
  'common.back': 'Back',
  'common.start': 'Start',
  'common.finish': 'Finish',
  'common.next': 'Next',
  'common.save': 'Save',
  'common.add': 'Add',
  'common.cancel': 'Cancel',
  'common.discard': 'Discard',
  'common.open': 'Open',
  'common.today': 'Today',
  'common.sets': 'sets',
  'common.kg': 'kg',
  // onboarding
  'ob.tagline': 'Forge a stronger you.',
  'ob.sub': '80/20 training, nutrition and gamification. Sign in to begin.',
  'ob.google': 'Continue with Google',
  'ob.apple': 'Continue with Apple',
  'ob.email': 'Continue with Email',
  'ob.guest': 'Skip — explore as guest',
  'ob.install': 'Install ForgeOS app',
  'ob.connecting': 'Connecting to Google…',
  'ob.numbers': 'Your numbers',
  'ob.metricOnly': 'Metric only — kg, cm, kcal.',
  'ob.goal': 'Goal',
  'ob.activity': 'Daily activity',
  'ob.namePlaceholder': 'What should we call you?',
  'ob.continueTest': 'Continue to fitness test',
  'ob.pickAll': 'pick all that apply',
  'ob.enter': 'Enter the Forge 🔥',
  // home
  'home.hi': 'Hi',
  'home.todayTraining': 'Today’s training',
  'home.ready': 'Ready when you are',
  'home.logged': 'Session logged ✅',
  'home.openTrain': 'Open Train',
  'home.scienceTip': 'Science tip of the day',
  'home.weeklyVolume': 'Weekly volume',
  'home.weighIn': 'Weekly weigh-in',
  'home.heatmap': 'Volume heatmap',
  'home.install': 'Install ForgeOS on your phone',
  // train
  'train.title': 'Train',
  'train.subtitle': 'Log it, beat last week.',
  'train.todaySession': 'Today’s session',
  'train.startEmpty': 'Start an empty workout',
  'train.periodisation': 'Periodisation engine',
  'train.plateau': 'Plateau breaker',
  'train.tools': 'Tools',
  'train.history': 'History',
  'train.exercise': 'Exercise',
  'train.rest': 'Rest',
  // nutrition
  'nut.title': 'Nutrition',
  'nut.scanner': 'AI macro scanner',
  'nut.scan': 'Scan a meal photo',
  'nut.analysing': 'Analysing photo…',
  'nut.recipes': 'Recipe library',
  'nut.manual': '+ Manual entry',
  'nut.foodLog': 'Food log',
  'nut.nothingLogged': 'Nothing logged yet today.',
  // quests
  'q.title': 'Quests',
  'q.subtitle': 'Rank up. Stay hungry.',
  'q.rank': 'Rank',
  'q.quests': 'Quests',
  'q.leaderboard': 'Leaderboard',
  'q.prHall': 'PR Hall',
  'q.streak': 'day streak',
  'q.coins': 'Forge Coins',
  // profile
  'p.theme': 'Theme',
  'p.quoteGenre': 'Daily quote genre',
  'p.language': 'Language',
  'p.preferences': 'Preferences',
  'p.publicLeaderboard': 'Public leaderboard',
  'p.streakGambling': 'Streak gambling',
  'p.marketplace': 'Routine marketplace',
  'p.haptics': 'Haptics',
  'p.geofence': 'Gym geofence',
  'p.editPlan': 'Edit week plan',
  'p.offlineSync': 'Offline sync',
  'p.syncNow': 'Sync now',
  'p.reset': 'Reset / sign out',
  'p.exerciseLibrary': 'Exercise library',
  'p.spotify': 'Spotify player',
};

const SK: Dict = {
  // nav
  'nav.home': 'Domov',
  'nav.train': 'Tréning',
  'nav.food': 'Strava',
  'nav.social': 'Komunita',
  'nav.quests': 'Úlohy',
  'nav.you': 'Ty',
  // common
  'common.back': 'Späť',
  'common.start': 'Štart',
  'common.finish': 'Dokončiť',
  'common.next': 'Ďalej',
  'common.save': 'Uložiť',
  'common.add': 'Pridať',
  'common.cancel': 'Zrušiť',
  'common.discard': 'Zahodiť',
  'common.open': 'Otvoriť',
  'common.today': 'Dnes',
  'common.sets': 'sérií',
  'common.kg': 'kg',
  // onboarding
  'ob.tagline': 'Vykuj si silnejšie ja.',
  'ob.sub': '80/20 tréning, výživa a hra. Prihlás sa a začni.',
  'ob.google': 'Pokračovať cez Google',
  'ob.apple': 'Pokračovať cez Apple',
  'ob.email': 'Pokračovať cez e-mail',
  'ob.guest': 'Preskočiť — preskúmať ako hosť',
  'ob.install': 'Nainštalovať appku ForgeOS',
  'ob.connecting': 'Pripájam ku Google…',
  'ob.numbers': 'Tvoje čísla',
  'ob.metricOnly': 'Iba metrické — kg, cm, kcal.',
  'ob.goal': 'Cieľ',
  'ob.activity': 'Denná aktivita',
  'ob.namePlaceholder': 'Ako ťa máme volať?',
  'ob.continueTest': 'Pokračovať na test kondície',
  'ob.pickAll': 'vyber všetko, čo platí',
  'ob.enter': 'Vstúpiť do Forge 🔥',
  // home
  'home.hi': 'Ahoj',
  'home.todayTraining': 'Dnešný tréning',
  'home.ready': 'Pripravený, keď ty',
  'home.logged': 'Tréning zaznamenaný ✅',
  'home.openTrain': 'Otvoriť tréning',
  'home.scienceTip': 'Vedecký tip dňa',
  'home.weeklyVolume': 'Týždenný objem',
  'home.weighIn': 'Týždenné váženie',
  'home.heatmap': 'Mapa objemu',
  'home.install': 'Nainštaluj si ForgeOS do telefónu',
  // train
  'train.title': 'Tréning',
  'train.subtitle': 'Zapíš to, prekonaj minulý týždeň.',
  'train.todaySession': 'Dnešná séria',
  'train.startEmpty': 'Začať prázdny tréning',
  'train.periodisation': 'Periodizačný engine',
  'train.plateau': 'Prelomenie stagnácie',
  'train.tools': 'Nástroje',
  'train.history': 'História',
  'train.exercise': 'Cvik',
  'train.rest': 'Pauza',
  // nutrition
  'nut.title': 'Výživa',
  'nut.scanner': 'AI skener makier',
  'nut.scan': 'Naskenovať foto jedla',
  'nut.analysing': 'Analyzujem fotku…',
  'nut.recipes': 'Knižnica receptov',
  'nut.manual': '+ Manuálny záznam',
  'nut.foodLog': 'Denník jedál',
  'nut.nothingLogged': 'Dnes ešte nič nezaznamenané.',
  // quests
  'q.title': 'Úlohy',
  'q.subtitle': 'Stúpaj v hodnosti. Zostaň hladný.',
  'q.rank': 'Hodnosť',
  'q.quests': 'Úlohy',
  'q.leaderboard': 'Rebríček',
  'q.prHall': 'Sieň PR',
  'q.streak': 'dní v sérii',
  'q.coins': 'Forge mince',
  // profile
  'p.theme': 'Téma',
  'p.quoteGenre': 'Žáner citátu dňa',
  'p.language': 'Jazyk',
  'p.preferences': 'Predvoľby',
  'p.publicLeaderboard': 'Verejný rebríček',
  'p.streakGambling': 'Stávky na sériu',
  'p.marketplace': 'Trhovisko plánov',
  'p.haptics': 'Vibrácie',
  'p.geofence': 'Geo-zóna posilňovne',
  'p.editPlan': 'Upraviť týždenný plán',
  'p.offlineSync': 'Offline synchronizácia',
  'p.syncNow': 'Synchronizovať',
  'p.reset': 'Reset / odhlásiť sa',
  'p.exerciseLibrary': 'Knižnica cvikov',
  'p.spotify': 'Spotify prehrávač',
};

const DICTS: Record<Language, Dict> = { en: EN, sk: SK };

export function translate(lang: Language, key: string): string {
  return DICTS[lang][key] ?? DICTS.en[key] ?? key;
}

// Hook: const t = useT(); t('nav.home')
export function useT() {
  const lang = useSettings((s) => s.language);
  return (key: string) => translate(lang, key);
}

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'sk', label: 'Slovenčina' },
];
