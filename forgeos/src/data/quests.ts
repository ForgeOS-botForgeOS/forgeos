import type { Quest } from '../types';

export const QUESTS: Quest[] = [
  // Daily (auto-assigned)
  { id: 'd-sets-12', title: 'Volume Push', description: 'Complete 12 working sets today.', scope: 'daily', xp: 120, coins: 5, target: 12, metric: 'sets' },
  { id: 'd-session', title: 'Show Up', description: 'Finish one training session today.', scope: 'daily', xp: 80, coins: 3, target: 1, metric: 'sessions' },
  { id: 'd-rpe', title: 'Honest Effort', description: 'Log RPE on 6 sets today.', scope: 'daily', xp: 60, coins: 2, target: 6, metric: 'sets' },
  { id: 'd-vol-5000', title: 'Tonnage', description: 'Move 5,000 kg of total volume today.', scope: 'daily', xp: 140, coins: 6, target: 5000, metric: 'volume' },

  // Weekly
  { id: 'w-sessions-4', title: 'Four Pillars', description: 'Train 4 sessions this week.', scope: 'weekly', xp: 400, coins: 25, target: 4, metric: 'sessions' },
  { id: 'w-sets-60', title: 'Grinder', description: 'Accumulate 60 sets this week.', scope: 'weekly', xp: 450, coins: 28, target: 60, metric: 'sets' },
  { id: 'w-pr', title: 'New Heights', description: 'Set 1 personal record this week.', scope: 'weekly', xp: 600, coins: 40, target: 1, metric: 'pr' },
  { id: 'w-streak-7', title: 'Unbroken', description: 'Maintain a 7-day streak.', scope: 'weekly', xp: 350, coins: 30, target: 7, metric: 'streak' },

  // Monthly
  { id: 'm-sessions-16', title: 'Consistency King', description: 'Train 16 sessions this month.', scope: 'monthly', xp: 1800, coins: 120, target: 16, metric: 'sessions' },
  { id: 'm-vol-150k', title: 'Iron Mountain', description: 'Move 150,000 kg this month.', scope: 'monthly', xp: 2200, coins: 150, target: 150000, metric: 'volume' },
  { id: 'm-pr-3', title: 'Record Breaker', description: 'Set 3 PRs this month.', scope: 'monthly', xp: 2500, coins: 180, target: 3, metric: 'pr' },

  // Yearly
  { id: 'y-sessions-180', title: 'The Long Game', description: 'Train 180 sessions this year.', scope: 'yearly', xp: 20000, coins: 1500, target: 180, metric: 'sessions' },
  { id: 'y-streak-100', title: 'Centurion', description: 'Hit a 100-day streak this year.', scope: 'yearly', xp: 15000, coins: 1200, target: 100, metric: 'streak' },
];

export const ICE_BREAKER = [
  {
    id: 'why',
    q: 'What dragged you to the Forge?',
    options: ['Get visibly stronger', 'Drop body fat', 'Build the physique', 'Mental health & routine', 'Compete one day'],
  },
  {
    id: 'experience',
    q: 'How long have you been lifting, honestly?',
    options: ['Total beginner', 'On and off for a while', '1–3 solid years', '3+ years, I know my numbers'],
  },
  {
    id: 'days',
    q: 'How many days a week can you realistically train?',
    options: ['2', '3', '4', '5', '6'],
  },
  {
    id: 'style',
    q: 'Which training flavour speaks to you?',
    options: ['Powerlifting', 'Bodybuilding', 'Calisthenics', 'CrossFit-style', 'A bit of everything'],
  },
  {
    id: 'enemy',
    q: 'Your biggest training enemy is…',
    options: ['Motivation', 'Time', 'Knowing what to do', 'Plateaus', 'Recovery & sleep'],
  },
  {
    id: 'food',
    q: 'How is your nutrition right now?',
    options: ['Chaos', 'I eyeball it', 'I track sometimes', 'I weigh and log everything'],
  },
  {
    id: 'music',
    q: 'Lifting soundtrack of choice?',
    options: ['Hard rock / metal', 'Hip-hop', 'EDM', 'Whatever hits', 'Silence, I focus'],
  },
  {
    id: 'reward',
    q: 'What keeps you coming back?',
    options: ['Hitting PRs', 'Seeing the streak grow', 'Beating friends', 'The mirror', 'Just the habit'],
  },
  {
    id: 'social',
    q: 'Do you train with others?',
    options: ['Solo always', 'With a partner', 'Group classes', 'Online community'],
  },
  {
    id: 'pace',
    q: 'How aggressive do you want progress to be?',
    options: ['Slow and bulletproof', 'Balanced', 'Aggressive, I’ll grind'],
  },
];
