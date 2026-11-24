// Save / load: cash, mission progress and collected packages live in
// localStorage so a session survives a reload. Everything else (world,
// traffic, wanted level) is rebuilt fresh from the seed each visit.
import { SAVE_KEY } from './config.js';

export function defaultSave() {
  return { version: 1, cash: 250, mission: 0, missionDone: false, packages: [], taxiUnlocked: false, bestWanted: 0 };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    const save = defaultSave();
    if (Number.isFinite(data.cash)) save.cash = Math.max(0, Math.floor(data.cash));
    if (Number.isInteger(data.mission)) save.mission = Math.max(0, Math.min(4, data.mission));
    if (data.missionDone === true) save.missionDone = true;
    if (Array.isArray(data.packages)) save.packages = data.packages.filter((n) => Number.isInteger(n));
    if (data.taxiUnlocked === true) save.taxiUnlocked = true;
    if (Number.isInteger(data.bestWanted)) save.bestWanted = data.bestWanted;
    return save;
  } catch {
    return null;
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage full or blocked (private mode): the game still plays, it just
    // does not persist. Never let saving break the loop.
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
