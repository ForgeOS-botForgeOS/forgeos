import type { Quote } from '../types';

export const QUOTES: Quote[] = [
  {
    id: 'stoic-1',
    genre: 'stoic',
    text: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
    source: 'Marcus Aurelius, Meditations',
    deepDive:
      'Aurelius wrote this to himself on campaign, not for an audience. The point is leverage: the only reliable lever you hold is your own judgement. When a lift fails or the scale stalls, the event is fixed — your response is not. Training is a daily rehearsal of exactly this discipline: discomfort arrives, and you choose the next rep anyway.',
  },
  {
    id: 'stoic-2',
    genre: 'stoic',
    text: 'No man is free who is not master of himself.',
    source: 'Epictetus',
    deepDive:
      'Epictetus was born a slave and became the most influential Stoic teacher of his era — he knew the difference between external and internal freedom intimately. Mastery here is not domination of others but governance of your own impulses: the snooze button, the skipped session, the extra plate of comfort. Each small self-command compounds into autonomy.',
  },
  {
    id: 'stoic-3',
    genre: 'stoic',
    text: 'We suffer more often in imagination than in reality.',
    source: 'Seneca, Letters',
    deepDive:
      'Seneca observed that dread inflates the cost of action. The set you fear is rarely as bad as the anticipation. Stoic practice — premeditatio malorum — is to rehearse the hard thing in advance so the real thing shrinks. Walk into the session having already imagined the heavy single; the bar feels lighter for it.',
  },
  {
    id: 'stoic-4',
    genre: 'stoic',
    text: 'The impediment to action advances action. What stands in the way becomes the way.',
    source: 'Marcus Aurelius',
    deepDive:
      'The obstacle is the curriculum. A plateau is not a wall but a prompt: change the stimulus, deload, attack a weakness. Every stall in your training is information about what to do next. The Stoic reframes friction as direction.',
  },
  {
    id: 'biblical-1',
    genre: 'biblical',
    text: 'I can do all things through Christ who strengthens me.',
    source: 'Philippians 4:13',
    deepDive:
      'Paul wrote this from prison, having "learned in whatsoever state I am, therewith to be content." The verse is about sufficiency under hardship, not unlimited capability. Applied to training: strength is received and stewarded, not merely manufactured. Show up, do the work, and trust the process beyond your own will.',
  },
  {
    id: 'biblical-2',
    genre: 'biblical',
    text: 'Do you not know that your bodies are temples of the Holy Spirit?',
    source: '1 Corinthians 6:19',
    deepDive:
      'Paul frames the body as entrusted, not owned — a stewardship. This reframes nutrition and training away from vanity and toward care. You discipline the body not to punish it but because it was given to you to keep well.',
  },
  {
    id: 'biblical-3',
    genre: 'biblical',
    text: 'Let us run with perseverance the race marked out for us.',
    source: 'Hebrews 12:1',
    deepDive:
      'The metaphor is explicitly athletic — the writer assumes readers know the discipline of the runner. "The race marked out for us" implies a course you did not choose but must run faithfully. Consistency over intensity; the long obedience in the same direction.',
  },
  {
    id: 'biblical-4',
    genre: 'biblical',
    text: 'Iron sharpens iron, so one person sharpens another.',
    source: 'Proverbs 27:17',
    deepDive:
      'Sharpening requires friction and a counterpart of equal hardness. Training partners, rivals on the leaderboard, the friend who out-lifts you — these are the iron. Isolation dulls; competition and community sharpen. Seek people who make the work harder, not easier.',
  },
  {
    id: 'stoic-5',
    genre: 'stoic',
    text: 'First say to yourself what you would be; and then do what you have to do.',
    source: 'Epictetus, Discourses',
    deepDive:
      'Identity precedes action. Decide you are the kind of person who trains — then the session is no longer a negotiation, it is simply what that person does. Epictetus puts the vision first and lets behaviour follow, which is exactly how durable habits form: through identity, not willpower.',
  },
  {
    id: 'stoic-6',
    genre: 'stoic',
    text: 'Difficulties strengthen the mind, as labour does the body.',
    source: 'Seneca',
    deepDive:
      'Seneca draws the training metaphor explicitly: the mind, like a muscle, adapts to the load placed on it. Comfort produces nothing. Voluntary hardship — the heavy set, the cold morning, the last rep — is how resilience is manufactured. Choose difficulty deliberately and in measured doses, exactly as you progress weight.',
  },
  {
    id: 'biblical-5',
    genre: 'biblical',
    text: 'She sets about her work vigorously; her arms are strong for her tasks.',
    source: 'Proverbs 31:17',
    deepDive:
      'Physical capacity is praised here as a virtue tied to diligence. Strength is not vanity but readiness — the ability to meet the demands of your life and the people who depend on you. Train so that when the task comes, your arms are equal to it.',
  },
  {
    id: 'biblical-6',
    genre: 'biblical',
    text: 'Everyone who competes in the games goes into strict training.',
    source: '1 Corinthians 9:25',
    deepDive:
      'Paul invokes the athlete as a model of disciplined restraint — "strict training" for a crown that won’t last, to argue for greater discipline toward what does. The lesson cuts both ways: take your training seriously enough to deny yourself, and keep it in proportion to what matters most.',
  },
];

export function quotesByGenre(genre: 'stoic' | 'biblical') {
  return QUOTES.filter((q) => q.genre === genre);
}
