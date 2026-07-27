import { useMemo } from 'react';
import type { TrainerSnapshot } from '../lib/trainer/context';
import { useUser } from './userStore';
import { useSettings } from './settingsStore';
import { useWorkout } from './workoutStore';
import { useGami } from './gamificationStore';
import { useHealth } from './healthStore';
import { useNutrition } from './nutritionStore';
import { useTrainer } from './trainerStore';
import { detectPlateaus } from '../lib/analytics';
import { computeReadiness, median } from '../lib/readiness';
import { rankForXp } from '../data/ranks';
import { exerciseById } from '../data/exercises';

/**
 * Everything the trainer is allowed to know about you, gathered from every
 * store in one place. Assembling it here (rather than inside the chat screen)
 * keeps the privacy surface reviewable: this file is the *only* place that
 * decides what the model can see, and `TrainerSnapshot` is the only shape it
 * can travel in.
 */
export function useTrainerSnapshot(): TrainerSnapshot {
  const profile = useUser((s) => s.profile);
  const plans = useUser((s) => s.savedPlans);
  const language = useSettings((s) => s.language);
  const diet = useSettings((s) => s.diet);
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const xp = useGami((s) => s.xp);
  const weekStreak = useGami((s) => s.weekStreak);
  const dayStreak = useGami((s) => s.streakDays);
  const healthDays = useHealth((s) => s.days);
  const foodLog = useNutrition((s) => s.log);
  const water = useNutrition((s) => s.water);
  const memory = useTrainer((s) => s.memory);

  return useMemo(() => {
    const now = Date.now();
    const since = (days: number) => now - days * 86400000;
    const sessionsLast7 = history.filter((w) => new Date(w.date).getTime() >= since(7)).length;
    const sessionsLast28 = history.filter((w) => new Date(w.date).getTime() >= since(28)).length;

    const days = Object.values(healthDays).sort((a, b) => a.date.localeCompare(b.date));
    const sleeps = days.map((d) => d.sleepMinutes ?? 0).filter((m) => m > 0).slice(-14);
    const latest = days[days.length - 1];
    // Readiness compares today's resting HR against your own recent baseline.
    const priorRhr = days.slice(-15, -1).map((d) => d.restingHr ?? 0).filter((v) => v > 0);
    const readiness = latest
      ? computeReadiness(latest, priorRhr.length >= 3 ? median(priorRhr) : undefined)
      : null;

    const todayKey = new Date().toISOString().slice(0, 10);
    const today = foodLog.filter((e) => e.date.slice(0, 10) === todayKey);

    // First name only — never the full name the profile may hold.
    const firstName = profile?.name?.trim().split(/\s+/)[0];

    // The next planned session, named by its exercises, so "is my plan right?"
    // can actually be answered.
    const nextDay = plans?.[0]?.plan.days.find((d) => !d.rest && d.exerciseIds.length);
    const nextPlanned = nextDay
      ? `${nextDay.label}: ${nextDay.exerciseIds.slice(0, 5).map((id) => exerciseById(id)?.name).filter(Boolean).join(', ')}`
      : undefined;

    return {
      firstName,
      age: profile?.age,
      sex: profile?.sex,
      heightCm: profile?.heightCm,
      weightKg: profile?.weightKg,
      goalWeightKg: profile?.goalWeightKg,
      bodyFatPct: profile?.bodyFatPct,
      goal: profile?.goal ?? 'recomp',
      activity: profile?.activity,
      experience: profile?.experience,
      tdee: profile?.tdee,
      macros: profile?.macros,
      quizAnswers: profile?.quizAnswers,
      about: profile?.about,
      specialRequest: profile?.specialRequest,
      diet,
      language,

      sessionsLast7,
      sessionsLast28,
      weekStreak,
      dayStreak,
      recentWorkouts: history.slice(0, 6),
      topPrs: [...prs].sort((a, b) => b.e1rm - a.e1rm).slice(0, 6),
      plateauLifts: detectPlateaus(history).map((p) => p.exerciseName),
      nextPlanned,

      avgSleepH: sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length / 60 : undefined,
      readiness: readiness?.score,
      restingHr: latest?.restingHr,

      todayKcal: today.reduce((a, e) => a + e.calories, 0),
      todayProteinG: today.reduce((a, e) => a + e.proteinG, 0),
      waterMl: water[todayKey] ?? 0,

      rank: rankForXp(xp).tier.name,
      xp,
      memory,
    };
  }, [profile, plans, language, diet, history, prs, xp, weekStreak, dayStreak, healthDays, foodLog, water, memory]);
}
