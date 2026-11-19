export const PROGRESS_STORAGE_KEY = 'leonida-platinum-progress-v1';
export const PROGRESS_SCHEMA = 'leonida-platinum-tracker/v1';

function emptyProgress() {
  return { earned: new Set(), hideStorySpoilers: true };
}

export function createProgressStore(officialNames) {
  const validNames = new Set(officialNames);
  const state = emptyProgress();

  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? 'null');
    const names = Array.isArray(saved) ? saved : saved?.earned;
    if (Array.isArray(names)) {
      for (const name of names) if (validNames.has(name)) state.earned.add(name);
    }
    if (typeof saved?.hideStorySpoilers === 'boolean') state.hideStorySpoilers = saved.hideStorySpoilers;
  } catch {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  }

  function orderedEarned() {
    return officialNames.filter((name) => state.earned.has(name));
  }

  function persist() {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      schema: PROGRESS_SCHEMA,
      earned: orderedEarned(),
      hideStorySpoilers: state.hideStorySpoilers,
    }));
  }

  return {
    has: (name) => state.earned.has(name),
    count: () => state.earned.size,
    hideStorySpoilers: () => state.hideStorySpoilers,
    toggle(name) {
      if (!validNames.has(name)) return;
      if (state.earned.has(name)) state.earned.delete(name);
      else state.earned.add(name);
      persist();
    },
    setSpoilers(hidden) {
      state.hideStorySpoilers = Boolean(hidden);
      persist();
    },
    importProgress(payload) {
      const names = Array.isArray(payload) ? payload : payload?.earned;
      if (!Array.isArray(names) || names.some((name) => typeof name !== 'string' || !validNames.has(name))) {
        throw new Error('Choose a checklist exported by Leonida Platinum. Unknown trophy names are not imported.');
      }
      state.earned = new Set(names);
      if (!Array.isArray(payload) && typeof payload?.hideStorySpoilers === 'boolean') {
        state.hideStorySpoilers = payload.hideStorySpoilers;
      }
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
