export const PROGRESS_STORAGE_KEY = 'leonida-platinum-progress-v1';
export const PROGRESS_SCHEMA = 'leonida-platinum-tracker/v2';

function emptyProgress() {
  return { earned: new Set(), hideStorySpoilers: true };
}

export function createProgressStore(officialNames) {
  const validNames = new Set(officialNames);
  const state = emptyProgress();
  let writable = true;
  let lastError = null;

  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? 'null');
    const names = Array.isArray(saved) ? saved : saved?.earned;
    if (Array.isArray(names)) {
      for (const name of names) if (validNames.has(name)) state.earned.add(name);
    }
    if (typeof saved?.hideStorySpoilers === 'boolean') state.hideStorySpoilers = saved.hideStorySpoilers;
  } catch (error) {
    lastError = error;
    try { localStorage.removeItem(PROGRESS_STORAGE_KEY); } catch { writable = false; }
  }

  function orderedEarned() {
    return officialNames.filter((name) => state.earned.has(name));
  }

  function persist() {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
        schema: PROGRESS_SCHEMA,
        earned: orderedEarned(),
        hideStorySpoilers: state.hideStorySpoilers,
      }));
      writable = true;
      lastError = null;
    } catch (error) {
      writable = false;
      lastError = error;
    }
    return writable;
  }

  return {
    has: (name) => state.earned.has(name),
    count: () => state.earned.size,
    hideStorySpoilers: () => state.hideStorySpoilers,
    isPersistent: () => writable,
    status: () => writable ? 'Saved in this browser' : `Session only${lastError ? ': storage unavailable' : ''}`,
    toggle(name) {
      if (!validNames.has(name)) return false;
      if (state.earned.has(name)) state.earned.delete(name);
      else state.earned.add(name);
      return persist();
    },
    setSpoilers(hidden) {
      state.hideStorySpoilers = Boolean(hidden);
      return persist();
    },
    importProgress(payload) {
      const names = Array.isArray(payload) ? payload : payload?.earned;
      if (!Array.isArray(names) || names.some((name) => typeof name !== 'string' || !validNames.has(name))) {
        throw new Error('Choose a Leonida Platinum checklist. Unknown trophy names are rejected.');
      }
      if (!Array.isArray(payload) && payload?.schema && !String(payload.schema).startsWith('leonida-platinum-tracker/')) {
        throw new Error('This JSON belongs to a different tracker.');
      }
      state.earned = new Set(names);
      if (!Array.isArray(payload) && typeof payload?.hideStorySpoilers === 'boolean') state.hideStorySpoilers = payload.hideStorySpoilers;
      persist();
      return state.earned.size;
    },
    exportProgress() {
      return {
        schema: PROGRESS_SCHEMA,
        game: 'Grand Theft Auto VI',
        platform: 'PlayStation 5',
        earned: orderedEarned(),
        hideStorySpoilers: state.hideStorySpoilers,
      };
    },
  };
}
