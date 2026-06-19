import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CardioLog, CardioMetric, PR, SetEntry, SpotifyTrack, Workout, WorkoutExercise } from '../types';
import { e1rm, volumeOf, overloadSuggestion } from '../lib/fitness';
import { exerciseById, EXERCISES } from '../data/exercises';
import { enqueue } from '../lib/offlineQueue';
import { pushPRsRemote } from '../lib/repositories';
import { pushMyActivity } from '../lib/activitySync';
import { useGami } from './gamificationStore';

const uid = () => Math.random().toString(36).slice(2, 10);

interface WorkoutState {
  history: Workout[];
  active: Workout | null;
  prs: PR[];
  customExerciseIds: string[];

  startWorkout: (
    name: string,
    exerciseIds?: string[],
    opts?: { targets?: Record<string, { sets: number; reps: number; weightKg?: number }>; maxWeightKg?: number },
  ) => void;
  addExercise: (exerciseId: string) => void;
  addCardioToActive: (exerciseId: string, durationMin: number, note: string) => void;
  removeExercise: (workoutExerciseId: string) => void;
  swapExercise: (workoutExerciseId: string, newExerciseId: string) => void;
  addSet: (workoutExerciseId: string, seed?: Partial<SetEntry>) => void;
  updateSet: (workoutExerciseId: string, setId: string, patch: Partial<SetEntry>) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  completeSet: (workoutExerciseId: string, setId: string) => void;
  linkSuperset: (idsInOrder: string[]) => void;
  reorderExercises: (orderedIds: string[]) => void;
  finishWorkout: (track?: SpotifyTrack | null) => Workout | null;
  discardWorkout: () => void;

  updateHistoryWorkout: (id: string, w: Workout) => void;
  deleteHistoryWorkout: (id: string) => void;
  addManualWorkout: (w: Workout) => void;
  // Log a cardio session (distance + time + any custom metrics) as a first-class
  // workout. Returns whether it set a new distance / duration personal best.
  logCardio: (machine: string, distanceKm: number, durationMin: number, calories?: number, metrics?: CardioMetric[]) => { distancePR: boolean; durationPR: boolean };
  // Edit an existing cardio log in place (everything is editable after the fact).
  updateCardio: (id: string, fields: CardioLog & { date?: string }) => void;

  lastSetFor: (exerciseId: string, setIndex: number) => SetEntry | undefined;
  bestE1rm: (exerciseId: string) => number;
}

// Build a cardio workout from its log fields, keeping the derived bits (name,
// duration, the placeholder set whose reps mirror the minutes) consistent — so
// both logging and later editing produce identical, well-formed records.
function buildCardioWorkout(id: string, cardio: CardioLog, date: string): Workout {
  const { machine, distanceKm, durationMin } = cardio;
  const ex = EXERCISES.find((x) => x.category === 'Cardio' && machine.toLowerCase().includes(x.name.split(' ')[0].toLowerCase()))
    ?? EXERCISES.find((x) => x.category === 'Cardio');
  return {
    id,
    name: `${machine}${distanceKm ? ` · ${distanceKm}km` : ''}${durationMin ? ` · ${Math.round(durationMin)}min` : ''}`,
    date,
    exercises: ex ? [{ id: uid(), exerciseId: ex.id, sets: [{ id: uid(), weightKg: 0, reps: Math.round(durationMin), completed: true }] }] : [],
    durationSec: Math.round(durationMin * 60),
    completed: true,
    totalVolumeKg: 0,
    cardio,
  };
}

export function computeVolume(w: Workout): number {
  return w.exercises.reduce(
    (sum, we) => sum + we.sets.filter((s) => s.completed).reduce((a, s) => a + s.weightKg * s.reps, 0),
    0,
  );
}

function recalcVolume(w: Workout): number {
  return w.exercises.reduce(
    (sum, we) => sum + we.sets.filter((s) => s.completed).reduce((a, s) => a + volumeOf(s.weightKg, s.reps), 0),
    0,
  );
}

export const useWorkout = create<WorkoutState>()(
  persist(
    (set, get) => ({
      history: [],
      active: null,
      prs: [],
      customExerciseIds: [],

      startWorkout: (name, exerciseIds = [], opts = {}) => {
        const seedWeight = opts.maxWeightKg ? Math.min(20, opts.maxWeightKg) : 20;
        const history = get().history;
        // Auto-progression: find the most recent completed set for this exercise
        // and suggest the next target via progressive overload.
        const lastBest = (exerciseId: string): SetEntry | undefined => {
          for (const w of history) {
            const we = w.exercises.find((e) => e.exerciseId === exerciseId);
            const done = we?.sets.filter((s) => s.completed) ?? [];
            if (done.length) return done.reduce((a, b) => (b.weightKg * b.reps > a.weightKg * a.reps ? b : a));
          }
          return undefined;
        };
        const exercises: WorkoutExercise[] = exerciseIds.map((id) => {
          const target = opts.targets?.[id];
          const setCount = Math.max(1, target?.sets ?? 1);
          const prev = lastBest(id);
          let weightKg = seedWeight;
          let reps = target?.reps ?? 8;
          if (target?.weightKg && target.weightKg > 0) {
            // Explicit planned weight wins.
            weightKg = target.weightKg;
            reps = target?.reps ?? 8;
          } else if (prev) {
            const sug = overloadSuggestion(prev.weightKg, prev.reps, target?.reps ?? prev.reps, prev.rpe ?? 8);
            weightKg = sug.weightKg; // no cap — based on what was actually lifted
            reps = sug.reps;
          }
          return {
            id: uid(),
            exerciseId: id,
            sets: Array.from({ length: setCount }, () => ({ id: uid(), weightKg, reps, completed: false, rpe: 7 })),
            restPresetSec: 90,
          };
        });
        set({
          active: { id: uid(), name, date: new Date().toISOString(), exercises, completed: false, synced: false },
        });
        void pushMyActivity(true); // friends see "training now" while a session is live
      },

      addExercise: (exerciseId) => {
        const a = get().active;
        if (!a) return;
        const we: WorkoutExercise = {
          id: uid(),
          exerciseId,
          sets: [{ id: uid(), weightKg: 20, reps: 8, completed: false, rpe: 7 }],
          restPresetSec: 90,
        };
        set({ active: { ...a, exercises: [...a.exercises, we] } });
      },

      addCardioToActive: (exerciseId, durationMin, note) => {
        const a = get().active;
        if (!a) return;
        const we: WorkoutExercise = {
          id: uid(),
          exerciseId,
          sets: [{ id: uid(), weightKg: 0, reps: Math.round(durationMin), completed: true, note }],
          restPresetSec: 90,
        };
        set({ active: { ...a, exercises: [...a.exercises, we] } });
      },

      removeExercise: (weId) => {
        const a = get().active;
        if (!a) return;
        set({ active: { ...a, exercises: a.exercises.filter((e) => e.id !== weId) } });
      },

      swapExercise: (weId, newExerciseId) => {
        const a = get().active;
        if (!a) return;
        set({
          active: {
            ...a,
            exercises: a.exercises.map((e) => (e.id === weId ? { ...e, exerciseId: newExerciseId } : e)),
          },
        });
      },

      addSet: (weId, seed) => {
        const a = get().active;
        if (!a) return;
        set({
          active: {
            ...a,
            exercises: a.exercises.map((e) => {
              if (e.id !== weId) return e;
              const last = e.sets[e.sets.length - 1];
              return {
                ...e,
                sets: [
                  ...e.sets,
                  {
                    id: uid(),
                    weightKg: seed?.weightKg ?? last?.weightKg ?? 20,
                    reps: seed?.reps ?? last?.reps ?? 8,
                    rpe: seed?.rpe ?? last?.rpe ?? 7,
                    completed: false,
                    subKind: last?.subKind ?? 'none',
                  },
                ],
              };
            }),
          },
        });
      },

      updateSet: (weId, setId, patch) => {
        const a = get().active;
        if (!a) return;
        set({
          active: {
            ...a,
            exercises: a.exercises.map((e) =>
              e.id !== weId ? e : { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) },
            ),
          },
        });
      },

      removeSet: (weId, setId) => {
        const a = get().active;
        if (!a) return;
        set({
          active: {
            ...a,
            exercises: a.exercises.map((e) =>
              e.id !== weId ? e : { ...e, sets: e.sets.filter((s) => s.id !== setId) },
            ),
          },
        });
      },

      completeSet: (weId, setId) => {
        get().updateSet(weId, setId, { completed: true });
      },

      linkSuperset: (idsInOrder) => {
        const a = get().active;
        if (!a) return;
        const group = uid();
        set({
          active: {
            ...a,
            exercises: a.exercises.map((e) =>
              idsInOrder.includes(e.id) ? { ...e, supersetGroup: group } : e,
            ),
          },
        });
      },

      reorderExercises: (orderedIds) => {
        const a = get().active;
        if (!a) return;
        const byId = new Map(a.exercises.map((e) => [e.id, e]));
        const next = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
        set({ active: { ...a, exercises: next } });
      },

      finishWorkout: (track) => {
        const a = get().active;
        if (!a) return null;
        const totalVolumeKg = recalcVolume(a);
        const done: Workout = {
          ...a,
          completed: true,
          totalVolumeKg,
          spotifyTrack: track ?? null,
          synced: false,
        };

        // PR detection — best e1RM per exercise from completed sets.
        const newPrs: PR[] = [...get().prs];
        for (const we of a.exercises) {
          const ex = exerciseById(we.exerciseId);
          for (const s of we.sets.filter((x) => x.completed)) {
            const est = e1rm(s.weightKg, s.reps);
            const existing = newPrs.find((p) => p.exerciseId === we.exerciseId);
            if (!existing || est > existing.e1rm) {
              const pr: PR = {
                id: uid(),
                exerciseId: we.exerciseId,
                exerciseName: ex?.name ?? 'Exercise',
                weightKg: s.weightKg,
                reps: s.reps,
                e1rm: est,
                date: done.date,
                spotifyTrack: track ?? null,
              };
              const i = newPrs.findIndex((p) => p.exerciseId === we.exerciseId);
              if (i >= 0) newPrs[i] = pr;
              else newPrs.push(pr);
            }
          }
        }

        // Offline-first: queue the write, flushed by the sync engine on reconnect.
        void enqueue('workouts', done);

        set({ history: [done, ...get().history], active: null, prs: newPrs });
        void pushMyActivity(false); // session ended → clear "training now", stamp last-active
        void pushPRsRemote(newPrs); // keep friends' PR count / top lift accurate
        return done;
      },

      discardWorkout: () => { set({ active: null }); void pushMyActivity(false); },

      updateHistoryWorkout: (id, w) => {
        const updated = { ...w, totalVolumeKg: computeVolume(w) };
        set({ history: get().history.map((h) => (h.id === id ? updated : h)) });
      },
      deleteHistoryWorkout: (id) => set({ history: get().history.filter((h) => h.id !== id) }),
      addManualWorkout: (w) => {
        set({ history: [{ ...w, totalVolumeKg: computeVolume(w) }, ...get().history] });
        // A manually-registered / past-dated workout counts toward an active bet
        // (if within its window) and this week's streak — "count it as it is".
        useGami.getState().countSession(w.date);
      },

      logCardio: (machine, distanceKm, durationMin, calories, metrics) => {
        const cardioHistory = get().history.filter((w) => w.cardio);
        const prevBestDist = Math.max(0, ...cardioHistory.map((w) => w.cardio!.distanceKm));
        const prevBestDur = Math.max(0, ...cardioHistory.map((w) => w.cardio!.durationMin));
        const cardio: CardioLog = { machine, distanceKm, durationMin, calories, metrics: metrics?.length ? metrics : undefined };
        const w = buildCardioWorkout(uid(), cardio, new Date().toISOString());
        set({ history: [w, ...get().history] });
        void enqueue('workouts', w); // sync so friends' feeds/activity reflect it
        void pushMyActivity(false); // stamp last-active from this session
        return { distancePR: distanceKm > prevBestDist && distanceKm > 0, durationPR: durationMin > prevBestDur && durationMin > 0 };
      },

      updateCardio: (id, fields) => {
        set({
          history: get().history.map((h) => {
            if (h.id !== id) return h;
            const cardio: CardioLog = {
              machine: fields.machine,
              distanceKm: fields.distanceKm,
              durationMin: fields.durationMin,
              calories: fields.calories,
              metrics: fields.metrics?.length ? fields.metrics : undefined,
            };
            return buildCardioWorkout(id, cardio, fields.date ?? h.date);
          }),
        });
        const updated = get().history.find((h) => h.id === id);
        if (updated) void enqueue('workouts', updated);
      },

      lastSetFor: (exerciseId, setIndex) => {
        for (const w of get().history) {
          const we = w.exercises.find((e) => e.exerciseId === exerciseId);
          if (we && we.sets[setIndex]) return we.sets[setIndex];
        }
        return undefined;
      },

      bestE1rm: (exerciseId) => {
        const pr = get().prs.find((p) => p.exerciseId === exerciseId);
        return pr?.e1rm ?? 0;
      },
    }),
    { name: 'forge-workouts' },
  ),
);
