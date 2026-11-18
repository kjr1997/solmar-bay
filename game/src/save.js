// Save / load: cash, mission progress and collected packages in localStorage.
import { SAVE_KEY, START_CASH } from './config.js';

export function defaultSave() {
  return {
    cash: START_CASH,
    missionIndex: 0,
    missionsDone: [],
    packages: [],
    totalEarned: 0,
    bustedCount: 0,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    // Clamp legacy or hand-edited saves into sane ranges.
    data.cash = Math.max(0, Math.min(99999999, Math.floor(data.cash)));
    data.missionIndex = Math.max(0, Math.min(5, data.missionIndex | 0));
    return Object.assign(defaultSave(), data);
  } catch (err) {
    return null;
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (err) { /* storage may be unavailable */ }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ }
}
