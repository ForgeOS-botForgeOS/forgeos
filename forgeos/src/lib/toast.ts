import { create } from 'zustand';
import { haptic } from './haptics';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface ToastState {
  toasts: Toast[];
  celebrating: number; // increments to trigger a confetti burst
  push: (message: string, type?: Toast['type']) => void;
  dismiss: (id: number) => void;
  celebrate: () => void;
}

let n = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  celebrating: 0,
  push: (message, type = 'success') => {
    const id = ++n;
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismiss(id), 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  celebrate: () => set({ celebrating: get().celebrating + 1 }),
}));

/** Show a smooth in-app toast (replaces window.alert). */
export const toast = (message: string, type: Toast['type'] = 'success') => useToast.getState().push(message, type);

/** Fire a one-off confetti burst from anywhere. */
export const celebrate = () => {
  haptic('success');
  useToast.getState().celebrate();
};
