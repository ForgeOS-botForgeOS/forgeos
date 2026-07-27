import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TRAINER_AGREEMENT_VERSION } from '../data/trainerAgreement';
import type { SpecialistId } from '../lib/trainer/specialists';

const uid = () => Math.random().toString(36).slice(2, 10);

export interface TrainerMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: string; // ISO
  specialist?: SpecialistId;
  /** 'offline' | 'guardrail' | provider name — shown so it is never a mystery. */
  source?: string;
  model?: string;
}

export interface TrainerConsent {
  accepted: boolean;
  /** Which version of the agreement was accepted. */
  version: number;
  atISO: string;
}

interface TrainerState {
  messages: TrainerMessage[];
  /** Facts the user told the trainer to remember — the "learning" they control. */
  memory: string[];
  consent: TrainerConsent | null;
  /** Last provider that answered, for the transparency line. */
  lastSource?: string;

  addMessage: (m: Omit<TrainerMessage, 'id' | 'at'>) => void;
  clearMessages: () => void;
  remember: (fact: string) => boolean;
  forget: (fact: string) => void;
  clearMemory: () => void;
  acceptAgreement: () => void;
  withdrawConsent: () => void;
  /** True only for the CURRENT agreement version — a bump re-asks. */
  hasConsent: () => boolean;
  setLastSource: (s: string) => void;
}

export const useTrainer = create<TrainerState>()(
  persist(
    (set, get) => ({
      messages: [],
      memory: [],
      consent: null,

      addMessage: (m) =>
        // Cap the stored thread: this is chat history, not an archive, and it
        // rides along in backups.
        set({ messages: [...get().messages, { id: uid(), at: new Date().toISOString(), ...m }].slice(-120) }),

      clearMessages: () => set({ messages: [] }),

      remember: (fact) => {
        const clean = fact.trim().slice(0, 200);
        if (!clean) return false;
        const existing = get().memory;
        if (existing.some((f) => f.toLowerCase() === clean.toLowerCase())) return false;
        set({ memory: [...existing, clean].slice(-30) });
        return true;
      },
      forget: (fact) => set({ memory: get().memory.filter((f) => f !== fact) }),
      clearMemory: () => set({ memory: [] }),

      acceptAgreement: () =>
        set({ consent: { accepted: true, version: TRAINER_AGREEMENT_VERSION, atISO: new Date().toISOString() } }),
      withdrawConsent: () =>
        set({ consent: { accepted: false, version: TRAINER_AGREEMENT_VERSION, atISO: new Date().toISOString() } }),
      hasConsent: () => {
        const c = get().consent;
        return !!c && c.accepted && c.version === TRAINER_AGREEMENT_VERSION;
      },

      setLastSource: (s) => set({ lastSource: s }),
    }),
    { name: 'forge-trainer' },
  ),
);
