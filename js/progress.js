// Catatan latihan (menit per hari, streak, checklist pelajaran) — tersimpan di localStorage.
import { store, today } from './util.js';
import { practiceActive } from './piano.js';

export const practiceLog = () => store.get('minutes', {});
setInterval(() => {
  if (!practiceActive() || document.hidden) return;
  const m = practiceLog(), d = today();
  m[d] = Math.round(((m[d] || 0) + 0.25) * 100) / 100;
  store.set('minutes', m);
}, 15000);

export function streak() {
  const m = practiceLog(); let s = 0; const d = new Date();
  if (!(m[today(d)] >= 1)) d.setDate(d.getDate() - 1);
  while (m[today(d)] >= 1) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
export const doneMap = () => store.get('done', {});
export function setDone(id, v) { const d = doneMap(); if (v) d[id] = today(); else delete d[id]; store.set('done', d); }
export function best(key, val, higher = true) {
  const b = store.get('best', {});
  const old = b[key];
  if (old == null || (higher ? val > old : val < old)) { b[key] = val; store.set('best', b); return true; }
  return false;
}
export const getBest = key => store.get('best', {})[key];
