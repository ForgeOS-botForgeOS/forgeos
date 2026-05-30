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
];

export function quotesByGenre(genre: 'stoic' | 'biblical') {
  return QUOTES.filter((q) => q.genre === genre);
}
