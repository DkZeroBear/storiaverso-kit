import { useEffect, useRef, useState } from "react";

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

/**
 * Persisted state with 2s debounced autosave.
 * onSaved is called after a successful save so the header can show timestamp.
 */
export function usePersistedState<T>(
  key: string,
  initial: () => T,
  onSaved?: () => void,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initial);
  const hydrated = useRef(false);

  // hydrate on client mount
  useEffect(() => {
    const raw = loadJSON<T | null>(key, null);
    if (raw !== null) setState(raw);
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => {
      saveJSON(key, state);
      onSaved?.();
    }, 2000);
    return () => clearTimeout(t);
  }, [state, key, onSaved]);

  return [state, setState];
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function pushLog<T extends { id: string; ts: number }>(
  arr: T[],
  entry: T,
  limit = 50,
): T[] {
  const next = [entry, ...arr];
  if (next.length > limit) next.length = limit;
  return next;
}
