// Slovak translations for quotes, keyed by quote id. Merged over the English
// quote when language === 'sk'. Genres are translated in batches; any id not
// present here falls back to the original English (graceful).
import type { Quote, Language } from '../types';

export interface QuoteSK {
  text: string;
  deepDive: string;
}

// Returns the quote with Slovak text/deep-dive when language is 'sk' and a
// translation exists; otherwise the original. Source is kept as-is.
export function localizeQuote(q: Quote, lang: Language): Quote {
  if (lang !== 'sk') return q;
  const sk = QUOTES_SK[q.id];
  return sk ? { ...q, text: sk.text, deepDive: sk.deepDive } : q;
}

export const QUOTES_SK: Record<string, QuoteSK> = {
  // ---- Stoic (1–50) ----
  'stoic-1': { text: 'Máš moc nad svojou mysľou — nie nad vonkajšími udalosťami. Uvedom si to a nájdeš silu.', deepDive: 'Jediná spoľahlivá páka, ktorú držíš, je tvoj vlastný úsudok. Keď zlyhá séria, udalosť je daná — tvoja reakcia nie.' },
  'stoic-2': { text: 'Nikto nie je slobodný, kto nie je pánom sám nad sebou.', deepDive: 'Ovládnutie seba — tlačidla odloženia budíka, vynechaného tréningu — sa skladá do skutočnej slobody.' },
  'stoic-3': { text: 'Trpíme častejšie v predstavách než v skutočnosti.', deepDive: 'Séria, ktorej sa bojíš, je málokedy taká zlá ako jej očakávanie. Vopred si ju predstav a činka zľahne.' },
  'stoic-4': { text: 'Prekážka v ceste posúva čin vpred. To, čo stojí v ceste, sa stáva cestou.', deepDive: 'Stagnácia nie je múr, ale pokyn: zmeň podnet, urob deload, zaútoč na slabinu.' },
  'stoic-5': { text: 'Najprv si povedz, čím chceš byť; potom rob to, čo musíš.', deepDive: 'Identita predchádza činu. Rozhodni sa, že si človek, ktorý trénuje — a tréning prestane byť vyjednávaním.' },
  'stoic-6': { text: 'Ťažkosti posilňujú myseľ, tak ako práca posilňuje telo.', deepDive: 'Myseľ sa, ako sval, prispôsobuje záťaži. Vyber si ťažké veci zámerne a v dávkach, presne ako pridávaš váhu.' },
  'stoic-7': { text: 'Nestrácaj čas debatami o tom, aký má byť dobrý človek. Buď ním.', deepDive: 'Nekonečné plánovanie dokonalého programu je sofistikované vyhýbanie sa. Choď pod činku ešte dnes.' },
  'stoic-8': { text: 'Kto sa bojí smrti, nikdy neurobí nič hodné živého človeka.', deepDive: 'Strach z neúspechu pred ostatnými ti zmenšuje výkon. Riskni dôstojný pokus; strach je menší nepriateľ.' },
  'stoic-9': { text: 'Ako dlho budeš čakať, kým si začneš žiadať to najlepšie pre seba?', deepDive: 'Niet neutrálneho čakania — telo, ktoré dnes zanedbávaš, je východiskom, s ktorým zajtra bojuješ.' },
  'stoic-10': { text: 'Ak to nie je správne, nerob to; ak to nie je pravda, nehovor to.', deepDive: 'Dvojitý filter integrity: žiadne nebezpečné egolifty a žiadne čísla, ktoré si si nezaslúžil.' },
  'stoic-11': { text: 'Najlepšia pomsta je nebyť ako ten, kto ti ublížil.', deepDive: 'Nenechaj správanie iných určovať tvoju latku. Trénuj pre to, kým sa chceš stať.' },
  'stoic-12': { text: 'Začni žiť hneď a každý deň počítaj ako samostatný život.', deepDive: 'Každý deň je úplný sám o sebe — jedna sústredená séria je celoživotná dávka dobre odvedenej práce.' },
  'stoic-13': { text: 'Šťastie je to, čo vznikne, keď sa príprava stretne s príležitosťou.', deepDive: 'Osobák, ktorý si „mal šťastie“, postavili mesiace neviditeľných sérií. Pripravuj sa neúnavne.' },
  'stoic-14': { text: 'Nie je to tak, že máme málo času — len veľa z neho premárnime.', deepDive: 'Čas nechýba; chýba pozornosť. Hodina v posilňovni je získaný, nie stratený čas.' },
  'stoic-15': { text: 'Nikto nemôže mať všetko, čo chce, ale môže si neželať to, čo nemá.', deepDive: 'Spokojnosť sa trénuje. Chci telo, ktoré si dokážeš postaviť, nie to, ktoré ti predal filter.' },
  'stoic-16': { text: 'Človek dobýva svet tým, že dobyje sám seba.', deepDive: 'Séria je vyhratá ešte predtým, než chytíš činku. Každé vonkajšie víťazstvo začína vnútri.' },
  'stoic-17': { text: 'Nevysvetľuj svoju filozofiu. Stelesni ju.', deepDive: 'Reči o disciplíne nepresvedčia nikoho. Nech je tvoja dôslednosť jediným argumentom.' },
  'stoic-18': { text: 'Nezáleží na tom, čo sa ti stane, ale ako na to zareaguješ.', deepDive: 'Zlyhaný spoj, zlý spánok, zranenie — udalosť je neutrálna. Tvoja reakcia je celá hra.' },
  'stoic-19': { text: 'Najlepšie využi to, čo je v tvojej moci, a zvyšok ber, ako príde.', deepDive: 'Riaď svoje úsilie, spánok a jedlo; zvyšok pusť. Genetika a načasovanie nie sú tvoje páky.' },
  'stoic-20': { text: 'Ochotných osud vedie, zdráhajúcich vlečie.', deepDive: 'Trénovať budeš tak či tak — vyber si to ochotne a tá istá práca je zmysel, nie trest.' },
  'stoic-21': { text: 'Drahokam sa nevyleští bez trenia, ani človek bez skúšok.', deepDive: 'Odpor je mechanizmus, nie prekážka. Záťaž, ktorá ťa drví, je tá, ktorá ťa formuje.' },
  'stoic-22': { text: 'Stýkaj sa s ľuďmi, ktorí ťa pravdepodobne zlepšia.', deepDive: 'Tvoji tréningoví parťáci určujú tvoj strop. Obklop sa silnejšími a disciplinovanejšími.' },
  'stoic-23': { text: 'Častejšie sa ľakáme, než nás zraní; viac trpíme z predstáv než zo skutočnosti.', deepDive: 'Hrôza pred ťažkým singlom je horšia než samotný single. Vojdi s tým, že ho čakáš.' },
  'stoic-24': { text: 'Hoď ma vlkom a vrátim sa ako vodca svorky.', deepDive: 'Zvládnutá ťažkosť sa mení na získané vodcovstvo. Najťažšie bloky kujú najsilnejšiu verziu teba.' },
  'stoic-25': { text: 'Disciplína sa rovná slobode.', deepDive: 'Štruktúra plánu ťa neobmedzuje — oslobodzuje ťa od vyjednávania a vrtochov motivácie.' },
  'stoic-26': { text: 'Stávaš sa tým, čomu venuješ pozornosť.', deepDive: 'Pozornosť je surovina identity. Sleduj svoje série a návyky a rastú; ignoruj ich a miznú.' },
  'stoic-27': { text: 'Prekážka na ceste sa stáva cestou.', deepDive: 'Slabé miesto nie je obchádzka pokroku — práca naň je tým pokrokom.' },
  'stoic-28': { text: 'Koľko trápenia ušetrí ten, kto sa nepozerá, čo robí jeho sused.', deepDive: 'Porovnávanie kradne sústredenie. Bež svoj program; lifter vedľa teba je pre tvoj ďalší spoj nepodstatný.' },
  'stoic-29': { text: 'Nič veľké nevznikne náhle, rovnako ako strapec hrozna či figa.', deepDive: 'Postava a sila dozrievajú v biologickom čase. Žiadaj plod pred sezónou a nedostaneš nič.' },
  'stoic-30': { text: 'Trpí viac, než treba, kto trpí skôr, než treba.', deepDive: 'Úzkosť pred ťažkým tréningom je vypožičané utrpenie. Šetri energiu na skutočnú prácu.' },
  'stoic-31': { text: 'Kým čakáme na život, život uteká.', deepDive: 'Niet dokonalého momentu na štart. Telo, ktoré stále odkladáš, je jediné, ktoré medzitým starne.' },
  'stoic-32': { text: 'Dobrý charakter je jedinou zárukou trvalého, bezstarostného šťastia.', deepDive: 'Disciplína vykutá v posilňovni je skúškou charakteru budovaného všade inde.' },
  'stoic-33': { text: 'Znášať skúšky s pokojnou mysľou oberá nešťastie o jeho silu.', deepDive: 'Zranenia a stagnácie strácajú polovicu sily vo chvíli, keď prestaneš panikáriť a začneš upravovať.' },
  'stoic-34': { text: 'Nikto nemôže mať všetko, čo si želá, ale môže prestať túžiť po nedosiahnuteľnom.', deepDive: 'Trénuj telo, ktoré máš, k tomu, čím sa môže stať; závisť na cudzej genetike je premárnená energia.' },
  'stoic-35': { text: 'Myseľ úzkostná z budúcich udalostí je nešťastná.', deepDive: 'Strachovať sa, či o šesť týždňov zdvihneš váhu, nepomôže ničomu. Urob dobre dnešnú sériu.' },
  'stoic-36': { text: 'Buď zhovievavý k iným a prísny na seba.', deepDive: 'Drž vysokú latku pre vlastné úsilie a dôslednosť; tvrdé súdy si nechaj pre nikoho.' },
  'stoic-37': { text: 'Šťastie tvojho života závisí od kvality tvojich myšlienok.', deepDive: 'Príbeh, ktorý si počas série hovoríš — „dám to“ vs. „nezvládnem“ — potichu rozhoduje o výsledku.' },
  'stoic-38': { text: 'Obmedz sa na prítomnosť.', deepDive: 'Jeden spoj, jedna séria, jeden tréning. Celý program je len stoh dobre odvedených prítomných okamihov.' },
  'stoic-39': { text: 'To, čo stojí v ceste, sa stáva cestou.', deepDive: 'Zopakované zámerne: každé obmedzenie je prestrojený tréningový cieľ.' },
  'stoic-40': { text: 'Protivenstvo zoznámi človeka so sebou samým.', deepDive: 'Kto si, sa dozvieš v ťažké dni, nie v ľahké. Vitaj záťaž, ktorá ťa skúša.' },
  'stoic-41': { text: 'Odmietni pocit krivdy a krivda sama zmizne.', deepDive: 'Doráňané ego po zmeškanom spoji je voliteľné. Pusti krivdu a ostane len lekcia.' },
  'stoic-42': { text: 'Je v moci mysle byť neporaziteľná.', deepDive: 'Svaly unavia; odhodlanie nemusí. Posledný spoj je zvyčajne rozhodnutie, nie kapacita.' },
  'stoic-43': { text: 'Drž sa svojho mladíckeho nadšenia — v staršom veku ho využiješ lepšie.', deepDive: 'Trénuj na desaťročia, nie na leto. Kapacita budovaná teraz je dar pre tvoje budúce ja.' },
  'stoic-44': { text: 'Každý nový začiatok pochádza z konca iného začiatku.', deepDive: 'Koniec jedného bloku je semenom ďalšieho. Dokonči ho a začni znova ostrejšie.' },
  'stoic-45': { text: 'Bohatstvo nespočíva vo veľkom majetku, ale v malom množstve potrieb.', deepDive: 'Sila, ako spokojnosť, pochádza z ovládnutia chúťok — budíka, vynechanej série, nezdravého jedla.' },
  'stoic-46': { text: 'Najprv pochop význam toho, čo hovoríš, a potom hovor.', deepDive: 'Než budeš naháňať „1RM“, pochop cenu skutočne maximálneho úsilia. Trénuj princíp, nie heslo.' },
  'stoic-47': { text: 'Ťažkosti odhalia človeku jeho charakter.', deepDive: 'Deload alebo tvrdohlavá stagnácia sú zrkadlo. To, čo urobíš ďalej, ťa definuje viac než osobák.' },
  'stoic-48': { text: 'Ak sa chceš zlepšiť, zmier sa s tým, že ťa budú mať za hlupáka.', deepDive: 'Dvíhať ľahko kvôli technike, pýtať sa „samozrejmé“ otázky — vyzerať ako začiatočník je cena za to stať sa pokročilým.' },
  'stoic-49': { text: 'Nešťastie nezlomí nikoho, koho najprv neoklamala prosperita.', deepDive: 'Nedovoľ, aby ťa ľahké obdobie zmäkčilo. Drž disciplínu vysoko aj keď je motivácia, aby ťa ťažké dni nezlomili.' },
  'stoic-50': { text: 'Niekedy je aj žiť aktom odvahy.', deepDive: 'V dni, keď je výhrou už len prísť, počítaj to ako víťazstvo. Odvaha je často tichá a nenápadná.' },
};
