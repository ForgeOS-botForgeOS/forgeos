import type { Exercise } from '../types';

// Loaded lifts: what strength plans draw from, what a lift is swapped for, and
// what e1RM, tonnage and warm-up ladders make sense for. Cardio logs minutes
// and Mobility holds a stretch, so neither belongs in a generated push day or
// in the swap list for a bench press.
export const isLoadedLift = (e: Pick<Exercise, 'category'>): boolean => e.category !== 'Cardio' && e.category !== 'Mobility';
