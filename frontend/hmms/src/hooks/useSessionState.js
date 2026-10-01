import { useCallback, useState } from 'react';

const KEY_PREFIX = 'hmms:';

function readSession(key) {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, quota); keep in-memory state only.
  }
}

/**
 * useState that survives navigating between pages (and reloads) within the browser tab.
 * Values are JSON-serialized in sessionStorage under "hmms:<key>".
 *
 * @param {string} key - storage key
 * @param {*} defaultValue - value (or lazy initializer) used when nothing valid is stored
 * @param {(value: *) => boolean} [isValid] - rejects stored values that no longer fit
 */
export function useSessionState(key, defaultValue, isValid = () => true) {
  const [value, setValue] = useState(() => {
    const stored = readSession(key);
    if (stored !== undefined && isValid(stored)) {
      return stored;
    }
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  });

  const setAndStore = useCallback((next) => {
    setValue((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      writeSession(key, resolved);
      return resolved;
    });
  }, [key]);

  return [value, setAndStore];
}

export const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
