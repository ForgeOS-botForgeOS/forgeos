import type { Quest } from '../types';

export const QUESTS: Quest[] = [
  // Daily (auto-assigned)
  { id: 'd-sets-12', title: 'Volume Push', description: 'Complete 12 working sets today.', scope: 'daily', xp: 120, coins: 5, target: 12, metric: 'sets' },
  { id: 'd-session', title: 'Show Up', description: 'Finish one training session today.', scope: 'daily', xp: 80, coins: 3, target: 1, metric: 'sessions' },
  { id: 'd-rpe', title: 'Honest Effort', description: 'Log RPE on 6 sets today.', scope: 'daily', xp: 60, coins: 2, target: 6, metric: 'sets' },
  { id: 'd-vol-5000', title: 'Tonnage', description: 'Move 5,000 kg of total volume today.', scope: 'daily', xp: 140, coins: 6, target: 5000, metric: 'volume' },
  { id: 'd-sets-20', title: 'Double Digits', description: 'Grind out 20 working sets today.', scope: 'daily', xp: 180, coins: 8, target: 20, metric: 'sets' },
  { id: 'd-vol-8000', title: 'Workhorse', description: 'Move 8,000 kg of volume today.', scope: 'daily', xp: 200, coins: 9, target: 8000, metric: 'volume' },
  { id: 'd-rpe-10', title: 'Dig Deep', description: 'Log RPE on 10 sets today.', scope: 'daily', xp: 90, coins: 4, target: 10, metric: 'sets' },
  { id: 'd-pr', title: 'Beat Yourself', description: 'Set a personal record today.', scope: 'daily', xp: 250, coins: 12, target: 1, metric: 'pr' },
  { id: 'd-sets-8', title: 'Quick Hit', description: 'Get 8 working sets in today.', scope: 'daily', xp: 70, coins: 3, target: 8, metric: 'sets' },
  { id: 'd-vol-3000', title: 'Warm-Up Day', description: 'Move 3,000 kg today.', scope: 'daily', xp: 80, coins: 3, target: 3000, metric: 'volume' },

  // Weekly
  { id: 'w-sessions-4', title: 'Four Pillars', description: 'Train 4 sessions this week.', scope: 'weekly', xp: 400, coins: 25, target: 4, metric: 'sessions' },
  { id: 'w-sets-60', title: 'Grinder', description: 'Accumulate 60 sets this week.', scope: 'weekly', xp: 450, coins: 28, target: 60, metric: 'sets' },
  { id: 'w-pr', title: 'New Heights', description: 'Set 1 personal record this week.', scope: 'weekly', xp: 600, coins: 40, target: 1, metric: 'pr' },
  { id: 'w-streak-7', title: 'Unbroken', description: 'Maintain a 7-day streak.', scope: 'weekly', xp: 350, coins: 30, target: 7, metric: 'streak' },

  { id: 'w-vol-30k', title: 'Heavy Week', description: 'Move 30,000 kg this week.', scope: 'weekly', xp: 500, coins: 32, target: 30000, metric: 'volume' },
  { id: 'w-sessions-5', title: 'Five Alive', description: 'Train 5 sessions this week.', scope: 'weekly', xp: 520, coins: 36, target: 5, metric: 'sessions' },
  { id: 'w-pr-2', title: 'Breakthrough', description: 'Set 2 personal records this week.', scope: 'weekly', xp: 800, coins: 55, target: 2, metric: 'pr' },
  { id: 'w-sets-80', title: 'Iron Week', description: 'Accumulate 80 sets this week.', scope: 'weekly', xp: 560, coins: 38, target: 80, metric: 'sets' },
  { id: 'w-sessions-6', title: 'No Days Off', description: 'Train 6 sessions this week.', scope: 'weekly', xp: 700, coins: 48, target: 6, metric: 'sessions' },
  { id: 'w-vol-50k', title: 'Tonnage King', description: 'Move 50,000 kg this week.', scope: 'weekly', xp: 750, coins: 50, target: 50000, metric: 'volume' },
  { id: 'w-streak-14', title: 'Two Weeks Strong', description: 'Hold a 14-day streak.', scope: 'weekly', xp: 600, coins: 45, target: 14, metric: 'streak' },

  // Recovery (need Garmin/health data; hidden while settings.recoveryEnabled is off)
  { id: 'd-sleep-8h', title: 'Recovery Priority', description: 'Sleep 8 hours tonight.', scope: 'daily', xp: 100, coins: 4, target: 480, metric: 'sleepMin' },
  { id: 'd-steps-8k', title: 'On Your Feet', description: 'Walk 8,000 steps today.', scope: 'daily', xp: 90, coins: 4, target: 8000, metric: 'steps' },
  { id: 'w-steps-50k', title: 'Wanderer', description: 'Accumulate 50,000 steps this week.', scope: 'weekly', xp: 500, coins: 30, target: 50000, metric: 'weekSteps' },
  { id: 'w-sleep-5', title: 'Sleep Champion', description: 'Five nights of 7h+ sleep this week.', scope: 'weekly', xp: 550, coins: 35, target: 5, metric: 'sleepNights' },

  // Monthly
  { id: 'm-sessions-16', title: 'Consistency King', description: 'Train 16 sessions this month.', scope: 'monthly', xp: 1800, coins: 120, target: 16, metric: 'sessions' },
  { id: 'm-streak-20', title: 'Iron Discipline', description: 'Hold a 20-day streak this month.', scope: 'monthly', xp: 1600, coins: 110, target: 20, metric: 'streak' },
  { id: 'm-vol-150k', title: 'Iron Mountain', description: 'Move 150,000 kg this month.', scope: 'monthly', xp: 2200, coins: 150, target: 150000, metric: 'volume' },
  { id: 'm-pr-3', title: 'Record Breaker', description: 'Set 3 PRs this month.', scope: 'monthly', xp: 2500, coins: 180, target: 3, metric: 'pr' },
  { id: 'm-sets-240', title: 'Volume Machine', description: 'Accumulate 240 sets this month.', scope: 'monthly', xp: 2000, coins: 140, target: 240, metric: 'sets' },
  { id: 'm-sessions-20', title: 'Twenty Strong', description: 'Train 20 sessions this month.', scope: 'monthly', xp: 2400, coins: 165, target: 20, metric: 'sessions' },
  { id: 'm-vol-250k', title: 'Quarter Million', description: 'Move 250,000 kg this month.', scope: 'monthly', xp: 3000, coins: 220, target: 250000, metric: 'volume' },
  { id: 'm-pr-5', title: 'Unstoppable', description: 'Set 5 PRs this month.', scope: 'monthly', xp: 3200, coins: 240, target: 5, metric: 'pr' },
  { id: 'm-streak-30', title: 'Perfect Month', description: 'Hold a 30-day streak.', scope: 'monthly', xp: 2800, coins: 200, target: 30, metric: 'streak' },

  // Yearly
  { id: 'y-sessions-180', title: 'The Long Game', description: 'Train 180 sessions this year.', scope: 'yearly', xp: 20000, coins: 1500, target: 180, metric: 'sessions' },
  { id: 'y-streak-100', title: 'Centurion', description: 'Hit a 100-day streak this year.', scope: 'yearly', xp: 15000, coins: 1200, target: 100, metric: 'streak' },
  { id: 'y-pr-25', title: 'Relentless', description: 'Set 25 PRs this year.', scope: 'yearly', xp: 18000, coins: 1400, target: 25, metric: 'pr' },
  { id: 'y-sessions-250', title: 'Iron Devotion', description: 'Train 250 sessions this year.', scope: 'yearly', xp: 28000, coins: 2200, target: 250, metric: 'sessions' },
  { id: 'y-vol-2m', title: 'Two Million Club', description: 'Move 2,000,000 kg this year.', scope: 'yearly', xp: 30000, coins: 2500, target: 2000000, metric: 'volume' },
  { id: 'y-streak-365', title: 'The Unbroken Year', description: 'Hold a 365-day streak.', scope: 'yearly', xp: 50000, coins: 5000, target: 365, metric: 'streak' },
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
    options: ['Powerlifting', 'Bodybuilding', 'Calisthenics', 'CrossFit-style', 'Cardio', 'Isometric', 'A bit of everything'],
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
