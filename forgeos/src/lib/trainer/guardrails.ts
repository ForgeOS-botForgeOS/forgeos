// ---- Guardrails ----
// Screening that happens BEFORE a question reaches any model, because a system
// prompt is a request and this is a rule. The user is 15; these are the topics
// where a confident wrong answer does real harm, so they get a fixed response
// from the app rather than whatever a model generates today.

export type GuardCategory =
  | 'medical'
  | 'disordered-eating'
  | 'peds'
  | 'extreme-cut'
  | 'off-topic'
  | 'crisis';

export interface GuardVerdict {
  /** false = do not call the model at all; show `reply` instead. */
  allow: boolean;
  category?: GuardCategory;
  reply?: string;
  /** true = allowed through, but the model gets an extra instruction. */
  note?: string;
}

interface Rule {
  category: GuardCategory;
  test: RegExp;
  reply: string;
}

// Order matters: crisis first, then the topics we refuse, then the softer ones.
const RULES: Rule[] = [
  {
    category: 'crisis',
    test: /\b(kill myself|suicid|end my life|self.?harm|want to die|hurt myself)\b/i,
    reply:
      "I'm not the right help for this, and I'm not going to pretend otherwise. Please talk to someone today — a parent, a teacher, or your doctor. In Slovakia you can call the Linka detskej istoty on 116 111, free, any time. If you are in immediate danger, call 112. I'll be here for training whenever you want it.",
  },
  {
    category: 'disordered-eating',
    test: /\b(purge|purging|vomit after|make myself sick|laxative|starv(e|ing) myself|anorexi|bulimi|not eat(ing)? (for|at all)|skip(ping)? (all )?meals? to lose|thinspo|hate my body)\b/i,
    reply:
      "I'm not going to help with that, and I'd be a bad trainer if I did. What you're describing is the kind of thing that needs a person, not an app — please talk to a parent or your doctor about it. What I can do is help you eat enough to train well and get stronger, which is a better route to how you want to look than anything restrictive. Want to start there?",
  },
  {
    category: 'peds',
    test: /\b(steroid|steroids|anabolic|testosterone|test cycle|trt|sarm|sarms|clen(buterol)?|dnp|hgh|growth hormone|peptide|winstrol|dianabol|tren(bolone)?|juice up|gear cycle)\b/i,
    reply:
      "Not something I'll advise on — and at 15 it isn't a close call: those drugs interfere with growth and development, and most are illegal to buy without a prescription. The honest answer is that you haven't come close to your natural ceiling yet. Ask me about progression, protein or sleep instead — that's where your next 20 kg actually comes from.",
  },
  {
    category: 'medical',
    test: /\b(diagnos|my (knee|shoulder|back|elbow|wrist|hip|ankle) (hurts|is injured|clicks|pops)|sharp pain|torn|tear|sprain|strain(ed)? my|fracture|tendonitis|tendinitis|impingement|hernia|concussion|medication|antibiotic|prescri|physio(therapy)? plan|rehab protocol)\b/i,
    reply:
      "That's past where a trainer should be guessing — pain and injuries need someone who can actually look at you. Please see a doctor or a physiotherapist about it. Two things I can help with in the meantime: keeping your other training going around it, and not losing your streak while you sort it out. Want that?",
  },
  {
    category: 'extreme-cut',
    test: /\b(lose \d{2,} ?(kg|kilos) in (a|1|2|3) (week|weeks|month)|(\d{3,}) ?(kcal|calories) a day|800 ?(kcal|calories)|water fast|dry fast|72.hour fast|crash diet|drop \d{2,} ?kg fast)\b/i,
    reply:
      "I won't build you that. Cuts that fast cost you muscle and, at your age, they can affect growth and recovery — and the weight comes back. What I will do is set a moderate deficit that keeps your lifts going: usually 0.5% of body weight a week, protein high, training unchanged. Say the word and I'll work it out from your numbers.",
  },
  {
    category: 'off-topic',
    test: /\b(write my (essay|homework)|solve this equation|who should i vote|crypto|bitcoin|hack|girlfriend|boyfriend|python code|write code|javascript)\b/i,
    reply:
      "That's outside what I'm here for — I only cover training, nutrition, recovery and how ForgeOS works. Ask me about any of those and I'm genuinely useful.",
  },
];

// Softer signals: let them through, but tell the specialist to tread carefully.
const NOTES: { test: RegExp; note: string }[] = [
  {
    test: /\b(sore|soreness|doms|stiff|tight)\b/i,
    note: 'They mention soreness. Ordinary soreness gets practical advice; if anything sounds like sharp pain, swelling or an injury, send them to a professional instead of coaching through it.',
  },
  {
    test: /\b(fat|skinny|weight|look|body ?fat|abs)\b/i,
    note: 'Body-image adjacent. Stay factual and performance-focused, never comment on appearance, and do not estimate body fat.',
  },
  {
    test: /\b(supplement|creatine|vitamin|pill|powder)\b/i,
    note: 'Supplement question from a minor: food first, ordinary label-level amounts only, and tell them to check with a parent or pharmacist. Point at Food → Nutrition plan → Recovery & vitamins.',
  },
];

/**
 * Screen a question. `allow: false` means the app answers it directly and never
 * sends it to a provider — which also means those topics never leave the device.
 */
export function screenQuestion(question: string): GuardVerdict {
  const q = question || '';
  for (const rule of RULES) {
    if (rule.test.test(q)) return { allow: false, category: rule.category, reply: rule.reply };
  }
  const notes = NOTES.filter((n) => n.test.test(q)).map((n) => n.note);
  return notes.length ? { allow: true, note: notes.join(' ') } : { allow: true };
}
