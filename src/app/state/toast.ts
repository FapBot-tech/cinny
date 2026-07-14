import { atom } from 'jotai';

export interface Toast {
  id: string;
  title: string;
  body: string;
  icon?: string;
  colorId?: string;
  fallback?: string;
  onClick?: () => void;
}

export const toastsAtom = atom<Toast[]>([]);

export const addToastAtom = atom(null, (get, set, toast: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast = { ...toast, id };
  set(toastsAtom, (prev) => [...prev, newToast]);
  setTimeout(() => {
    set(toastsAtom, (prev) => prev.filter((t) => t.id !== id));
  }, 5000);
});
