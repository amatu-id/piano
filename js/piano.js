// Komponen keyboard piano + bus input (mouse/sentuh, keyboard komputer, MIDI).
import { audio } from './audio.js';
import { isBlack, PC_SHARP, PC_FLAT, SOLFEGE } from './theory.js';
import { store } from './util.js';

const boards = new Set();

export const input = {
  listeners: new Set(),
  down: new Set(),
  kbOct: store.get('kbOct', 4),
  mute: false,
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  press(m, vel = 0.8, src = 'ui') {
    if (m < 21 || m > 108) return;
    if (!this.mute) audio.noteOn(m, vel);
    this.down.add(m);
    boards.forEach(b => b.setDown(m, true));
    this.listeners.forEach(f => f({ type: 'on', m, vel, src }));
    activity();
  },
  release(m, src = 'ui') {
    if (!this.down.has(m)) return;
    audio.noteOff(m);
    this.down.delete(m);
    boards.forEach(b => b.setDown(m, false));
    this.listeners.forEach(f => f({ type: 'off', m, src }));
  },
  releaseAll() { [...this.down].forEach(m => this.release(m)); },
};

// waktu latihan: dihitung saat ada aktivitas memainkan nada
let lastAct = 0;
function activity() { lastAct = Date.now(); }
export const practiceActive = () => Date.now() - lastAct < 45000;
export const markActivity = activity;

// ---------- keyboard komputer ----------
const KEYMAP = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17, BracketRight: 18 };
export const KEYCAP = { 0: 'A', 1: 'W', 2: 'S', 3: 'E', 4: 'D', 5: 'F', 6: 'T', 7: 'G', 8: 'Y', 9: 'H', 10: 'U', 11: 'J', 12: 'K', 13: 'O', 14: 'L', 15: 'P', 16: ';', 17: "'" };
const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(a.type) || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
const kbHeld = new Map();
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || typing()) return;
  if (e.code === 'Space' && !e.repeat) { if (e.target.tagName === 'BUTTON') return; e.preventDefault(); audio.setSustain(true); return; }
  if (e.code === 'KeyZ' || e.code === 'KeyX') {
    if (e.repeat) return;
    input.kbOct = Math.max(1, Math.min(7, input.kbOct + (e.code === 'KeyZ' ? -1 : 1)));
    store.set('kbOct', input.kbOct); boards.forEach(b => b.refreshCaps());
    return;
  }
  const off = KEYMAP[e.code];
  if (off == null || e.repeat || kbHeld.has(e.code)) return;
  e.preventDefault();
  const m = (input.kbOct + 1) * 12 + off;
  kbHeld.set(e.code, m);
  input.press(m, 0.78, 'kb');
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') { audio.setSustain(false); return; }
  const m = kbHeld.get(e.code);
  if (m != null) { kbHeld.delete(e.code); input.release(m, 'kb'); }
});
window.addEventListener('blur', () => { kbHeld.forEach(m => input.release(m, 'kb')); kbHeld.clear(); });

// ---------- MIDI ----------
export const midi = { status: 'off', name: '', listeners: new Set() };
export async function connectMIDI() {
  if (!navigator.requestMIDIAccess) { midi.status = 'unsupported'; midi.listeners.forEach(f => f()); return false; }
  try {
    const acc = await navigator.requestMIDIAccess();
    const bind = () => {
      const names = [];
      acc.inputs.forEach(inp => {
        names.push(inp.name);
        inp.onmidimessage = ev => {
          const [st, d1, d2] = ev.data; const cmd = st & 0xf0;
          audio.init();
          if (cmd === 0x90 && d2 > 0) input.press(d1, d2 / 127, 'midi');
          else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) input.release(d1, 'midi');
          else if (cmd === 0xb0 && d1 === 64) audio.setSustain(d2 >= 64);
        };
      });
      midi.status = names.length ? 'on' : 'nodev'; midi.name = names.join(', ');
      midi.listeners.forEach(f => f());
    };
    acc.onstatechange = bind; bind();
    return true;
  } catch (e) { midi.status = 'denied'; midi.listeners.forEach(f => f()); return false; }
}

// ---------- komponen ----------
export class Piano {
  constructor(el, o = {}) {
    this.el = el;
    this.o = Object.assign({ from: 48, to: 84, labels: store.get('labels', 'c'), minW: 26, height: null, interactive: true, onPress: null, flat: false, caps: true }, o);
    this.keys = new Map();
    this.marks = new Map();
    this.ptr = new Map();
    this.build();
    boards.add(this);
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(el);
  }
  destroy() { boards.delete(this); this.ro.disconnect(); this.ptr.forEach(m => input.release(m)); this.el.innerHTML = ''; }
  setRange(from, to) { this.o.from = from; this.o.to = to; this.build(); }
  setLabels(mode) { this.o.labels = mode; this.refreshCaps(); }
  build() {
    const { from, to } = this.o;
    this.el.classList.add('piano-wrap');
    this.el.innerHTML = '<div class="piano"></div>';
    this.inner = this.el.firstChild;
    if (this.o.height) this.inner.style.height = this.o.height + 'px';
    this.keys.clear();
    const whites = []; for (let m = from; m <= to; m++) if (!isBlack(m)) whites.push(m);
    this.W = whites.length;
    let wi = 0;
    for (let m = from; m <= to; m++) {
      const k = document.createElement('div');
      const blk = isBlack(m);
      k.className = 'key ' + (blk ? 'blk' : 'wht');
      k.dataset.m = m;
      const pct = 100 / this.W;
      if (blk) { k.style.left = `calc(${wi * pct}% - ${pct * 0.31}%)`; k.style.width = pct * 0.62 + '%'; }
      else { k.style.left = wi * pct + '%'; k.style.width = pct + '%'; wi++; }
      k.innerHTML = '<span class="fg"></span><span class="lb"></span><span class="cap"></span>';
      this.inner.appendChild(k);
      this.keys.set(m, k);
      if (input.down.has(m)) k.classList.add('down');
    }
    if (this.o.interactive) this.bindPointer();
    this.layout();
    this.refreshCaps();
    this.marks.forEach((v, m) => this.applyMark(m));
  }
  layout() {
    const w = Math.max(this.el.clientWidth, this.W * this.o.minW);
    this.inner.style.width = w + 'px';
    this.el.classList.toggle('scrolls', w > this.el.clientWidth + 1);
  }
  labelText(m) {
    const pc = m % 12, mode = this.o.labels, names = this.o.flat ? PC_FLAT : PC_SHARP;
    if (mode === 'all') return isBlack(m) ? names[pc] : names[pc] + (Math.floor(m / 12) - 1);
    if (mode === 'c' && pc === 0) return 'C' + (Math.floor(m / 12) - 1);
    if (mode === 'solf' && !isBlack(m)) return SOLFEGE[pc];
    return '';
  }
  refreshCaps() {
    const showCaps = this.o.caps && store.get('caps', true) && matchMedia('(hover:hover)').matches;
    this.keys.forEach((k, m) => {
      const v = this.marks.get(m);
      k.querySelector('.lb').textContent = v && v.text != null ? v.text : this.labelText(m);
      const off = m - (input.kbOct + 1) * 12;
      k.querySelector('.cap').textContent = showCaps && KEYCAP[off] ? KEYCAP[off] : '';
    });
  }
  bindPointer() {
    const el = this.inner;
    const keyAt = (x, y) => { const t = document.elementFromPoint(x, y); const k = t && t.closest && t.closest('.key'); return k && el.contains(k) ? +k.dataset.m : null; };
    const velFrom = (e, m) => {
      const k = this.keys.get(m); if (!k) return 0.75;
      const r = k.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height;
      return Math.max(0.35, Math.min(1, 0.45 + y * 0.6));
    };
    el.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      const m = keyAt(e.clientX, e.clientY); if (m == null) return;
      e.preventDefault();
      audio.init();
      el.setPointerCapture?.(e.pointerId);
      this.ptr.set(e.pointerId, m);
      this.hit(m, velFrom(e, m));
    });
    el.addEventListener('pointermove', e => {
      if (!this.ptr.has(e.pointerId)) return;
      const m = keyAt(e.clientX, e.clientY); const old = this.ptr.get(e.pointerId);
      if (m == null || m === old) return;
      this.unhit(old); this.ptr.set(e.pointerId, m); this.hit(m, velFrom(e, m));
    });
    const up = e => { const m = this.ptr.get(e.pointerId); if (m == null) return; this.ptr.delete(e.pointerId); this.unhit(m); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  hit(m, vel) { if (this.o.onPress && this.o.onPress(m, true) === false) return; input.press(m, vel, 'ui'); }
  unhit(m) { if (this.o.onPress && this.o.onPress(m, false) === false) return; input.release(m, 'ui'); }
  setDown(m, on) { const k = this.keys.get(m); if (k) k.classList.toggle('down', on); }
  // tandai tuts: map m -> {cls:'tone'|'root'|'hint'|'ok'|'bad'|'dim'|'lh'|'rh', text, finger}
  mark(map, keep = false) {
    if (!keep) { const old = [...this.marks.keys()]; this.marks.clear(); old.forEach(m => this.applyMark(m)); }
    for (const [m, v] of (map instanceof Map ? map : Object.entries(map))) { this.marks.set(+m, v); this.applyMark(+m); }
  }
  markNotes(ms, cls = 'tone', texts = null, root = null) {
    const map = new Map();
    ms.forEach((m, i) => map.set(m, { cls: root != null && m % 12 === root ? 'root' : cls, text: texts ? texts[i] : null }));
    this.mark(map);
  }
  unmark(m) { this.marks.delete(m); this.applyMark(m); }
  clear() { this.mark(new Map()); }
  applyMark(m) {
    const k = this.keys.get(m); if (!k) return;
    const v = this.marks.get(m);
    k.classList.remove('tone', 'root', 'hint', 'ok', 'bad', 'dimk', 'lh', 'rh', 'scale');
    const fg = k.querySelector('.fg'), lb = k.querySelector('.lb');
    fg.textContent = v && v.finger ? v.finger : '';
    if (v) (v.cls || 'tone').split(' ').forEach(c => k.classList.add(c));
    lb.textContent = v && v.text != null ? v.text : this.labelText(m);
  }
  keyBox(m) { // posisi relatif terhadap .piano (px)
    const k = this.keys.get(m); if (!k) return null;
    return { x: k.offsetLeft, w: k.offsetWidth, black: isBlack(m) };
  }
  scrollTo(m) {
    const b = this.keyBox(m); if (!b) return;
    this.el.scrollTo({ left: Math.max(0, b.x - this.el.clientWidth / 2), behavior: 'smooth' });
  }
  flash(m, cls = 'ok', ms = 450) {
    const k = this.keys.get(m); if (!k) return;
    k.classList.add('fl-' + cls); setTimeout(() => k.classList.remove('fl-' + cls), ms);
  }
}

// keyboard kecil statis (non-interaktif) dalam bentuk string HTML — untuk tabel
export function miniKeys(ms, from = null, to = null, root = null) {
  const lo = from ?? (Math.floor(Math.min(...ms) / 12) * 12);
  const hi = to ?? Math.max(lo + 23, Math.ceil((Math.max(...ms) + 1) / 12) * 12 - 1);
  const set = new Set(ms);
  const whites = []; for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const W = whites.length; const pct = 100 / W;
  let wi = 0, h = '';
  for (let m = lo; m <= hi; m++) {
    const on = set.has(m) ? (root != null && m % 12 === root ? ' r' : ' on') : '';
    if (isBlack(m)) h += `<i class="b${on}" style="left:${wi * pct - pct * 0.3}%;width:${pct * 0.6}%"></i>`;
    else { h += `<i class="w${on}" style="left:${wi * pct}%;width:${pct}%"></i>`; wi++; }
  }
  return `<span class="mini">${h}</span>`;
}
