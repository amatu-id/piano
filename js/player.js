// Pemutar lagu/latihan dengan "falling notes": mode Dengar, Tunggu (menunggu tuts benar), Main (dengan skor).
import { $, esc, store, options } from './util.js';
import { icon } from './icons.js';
import { audio } from './audio.js';
import { Piano, input, markActivity } from './piano.js';
import { isBlack, PC_SHARP } from './theory.js';
import { best, getBest } from './progress.js';

export class Player {
  constructor(el, o) {
    this.el = el;
    this.o = Object.assign({ bpm: 90, meter: 4, id: 'x', hands: 'R', mode: 'wait', title: '' }, o);
    this.notes = o.notes.map((n, i) => ({ ...n, i }));
    this.total = Math.max(...this.notes.map(n => n.t + n.d));
    this.mode = store.get('plMode', this.o.mode);
    this.hands = this.notes.some(n => n.h === 'L') ? store.get('plHands', 'R') : 'R';
    this.pct = 1; this.metro = store.get('plMetro', false); this.loop = false; this.labelMode = store.get('plLbl', 'name');
    this.pos = 0; this.playing = false; this.raf = null;
    this.build();
  }
  get bps() { return this.o.bpm * this.pct / 60; }
  isUser(n) { return this.mode !== 'listen' && this.hands.includes(n.h); }
  build() {
    const hasL = this.notes.some(n => n.h === 'L');
    this.el.innerHTML = `
      <div class="pl-ctrl">
        <button class="btn pri big-btn" data-a="play">${icon('play')} Mulai</button>
        <button class="ib" data-a="restart" title="Ulang dari awal">${icon('repeat')}</button>
        <div class="seg" data-g="mode"><button data-v="listen">Dengar</button><button data-v="wait">Tunggu</button><button data-v="play">Main + skor</button></div>
        ${hasL ? `<div class="seg" data-g="hands"><button data-v="L">Kiri</button><button data-v="R">Kanan</button><button data-v="RL">Dua tangan</button></div>` : ''}
        <label>Tempo <select data-k="pct">${options([[0.5, '50%'], [0.6, '60%'], [0.75, '75%'], [0.9, '90%'], [1, '100%'], [1.15, '115%'], [1.3, '130%']], 1)}</select> <span class="muted" data-k="bpmv"></span></label>
        <label class="chk"><input type="checkbox" data-k="metro" ${this.metro ? 'checked' : ''}> Metronom</label>
        <label class="chk"><input type="checkbox" data-k="loop"> Ulang</label>
        <label>Label <select data-k="lbl">${options([['name', 'Nama nada'], ['finger', 'Nomor jari'], ['none', 'Tanpa']], this.labelMode)}</select></label>
      </div>
      <div class="pl-status"><span data-k="msg"></span><span data-k="score" class="score"></span></div>
      <input type="range" class="pl-seek" min="0" max="${this.total}" step="0.25" value="0">
      <div class="pl-stage"><canvas></canvas></div>
      <div class="pl-kb"></div>`;
    const q = s => this.el.querySelector(s);
    this.cv = q('canvas'); this.ctx2 = this.cv.getContext('2d');
    this.seek = q('.pl-seek');
    const ms = this.notes.map(n => n.m);
    let lo = Math.min(...ms) - 3, hi = Math.max(...ms) + 3;
    while (hi - lo < 25) { lo -= 1; hi += 1; }
    while (isBlack(lo)) lo--; while (isBlack(hi)) hi++;
    this.kb = new Piano(q('.pl-kb'), { from: Math.max(21, lo), to: Math.min(108, hi), labels: 'c', height: innerWidth < 700 ? 130 : 160, minW: innerWidth < 700 ? 30 : 22, caps: true });
    this.kb.el.addEventListener('scroll', () => this.draw());
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(q('.pl-stage'));
    this.el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (a) { if (a.dataset.a === 'play') this.toggle(); else this.restart(); return; }
      const b = e.target.closest('[data-g] button'); if (!b) return;
      const g = b.closest('[data-g]').dataset.g;
      if (g === 'mode') { this.mode = b.dataset.v; store.set('plMode', this.mode); }
      if (g === 'hands') { this.hands = b.dataset.v; store.set('plHands', this.hands); }
      this.syncUI(); this.seekTo(this.pos);
    });
    q('[data-k=pct]').onchange = e => { this.reanchor(); this.pct = +e.target.value; this.syncUI(); };
    q('[data-k=metro]').onchange = e => { this.metro = e.target.checked; store.set('plMetro', this.metro); };
    q('[data-k=loop]').onchange = e => { this.loop = e.target.checked; };
    q('[data-k=lbl]').onchange = e => { this.labelMode = e.target.value; store.set('plLbl', this.labelMode); this.lastMark = ''; this.draw(); };
    this.seek.oninput = () => { this.seekTo(+this.seek.value); };
    this.off = input.on(e => this.onInput(e));
    this.syncUI(); this.seekTo(0);
  }
  syncUI() {
    this.el.querySelectorAll('[data-g=mode] button').forEach(b => b.classList.toggle('on', b.dataset.v === this.mode));
    this.el.querySelectorAll('[data-g=hands] button').forEach(b => b.classList.toggle('on', b.dataset.v === this.hands));
    this.el.querySelector('[data-k=bpmv]').textContent = `${Math.round(this.o.bpm * this.pct)} bpm`;
    const play = this.el.querySelector('[data-a=play]');
    play.innerHTML = this.playing ? `${icon('pause')} Jeda` : `${icon('play')} ${this.pos > 0 ? 'Lanjut' : 'Mulai'}`;
    const hint = { listen: 'Dengarkan & perhatikan tuts yang menyala.', wait: 'Lagu berhenti sampai Anda menekan tuts yang benar (hijau).', play: 'Lagu berjalan terus — tekan tepat waktu untuk skor.' }[this.mode];
    if (!this.playing) this.msg(hint);
  }
  msg(t) { this.el.querySelector('[data-k=msg]').textContent = t; }
  resize() {
    const st = this.el.querySelector('.pl-stage');
    const dpr = devicePixelRatio || 1;
    this.W = st.clientWidth; this.H = st.clientHeight;
    this.cv.width = this.W * dpr; this.cv.height = this.H * dpr;
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    this.ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.geo = null; this.draw();
  }
  seekTo(p) {
    this.pos = p; this.reanchor();
    this.si = this.notes.findIndex(n => n.t >= p - 1e-6); if (this.si < 0) this.si = this.notes.length;
    this.gates = [...new Set(this.notes.filter(n => this.isUser(n) && n.t >= p - 1e-6).map(n => n.t))].sort((a, b) => a - b);
    this.gi = 0; this.waiting = false; this.got = new Set();
    if (p <= 0) this.wrong = 0;
    this.notes.forEach(n => { if (n.t >= p - 1e-6) n.r = null; });
    this.nextBeat = Math.ceil(p - 1e-6);
    this.seek.value = Math.max(0, p);
    this.updScore(); this.draw();
  }
  reanchor() { this.startPos = this.pos; this.startTime = audio.now(); }
  toggle() { this.playing ? this.pause() : this.start(); }
  start() {
    audio.init(); markActivity();
    if (this.pos >= this.total) this.seekTo(0);
    if (this.pos <= 0 && this.mode !== 'wait') { this.seekTo(-this.o.meter); this.countIn = true; }
    this.playing = true; this.reanchor(); this.startTime += 0.08;
    this.syncUI(); this.msg(this.mode === 'wait' ? 'Tekan tuts yang menyala hijau…' : 'Bermain…');
    const loop = () => { this.tick(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  pause() {
    this.playing = false; cancelAnimationFrame(this.raf);
    audio.stopAll(); this.seekTo(Math.max(0, this.pos)); this.syncUI();
  }
  restart() { const p = this.playing; if (p) this.pause(); this.notes.forEach(n => n.r = null); this.seekTo(0); if (p) this.start(); }
  tick() {
    const now = audio.now(), bps = this.bps, spb = 1 / bps;
    if (!this.waiting) this.pos = this.startPos + Math.max(0, now - this.startTime) * bps;
    const gateT = this.mode === 'wait' ? this.gates[this.gi] : undefined;
    if (gateT != null && !this.waiting && this.pos >= gateT) {
      this.pos = gateT; this.waiting = true; this.got = new Set();
      this.need = new Set(this.notes.filter(n => n.t === gateT && this.isUser(n)).map(n => n.m));
    }
    const horizon = this.pos + 0.15 * bps;
    // jadwalkan nada otomatis
    while (this.si < this.notes.length) {
      const n = this.notes[this.si];
      if (n.t >= horizon) break;
      if (gateT != null && n.t >= gateT - 1e-6 && !(this.gateCleared === gateT)) break;
      if (!this.isUser(n) && n.t >= 0) {
        const when = this.startTime + (n.t - this.startPos) * spb;
        audio.play(n.m, Math.max(0.08, n.d * spb * 0.96), Math.max(now, when), n.v ?? (n.h === 'L' ? 0.58 : 0.7));
      }
      this.si++;
    }
    // metronom & hitungan awal
    if ((this.metro || this.pos < 0) && !this.waiting) {
      while (this.nextBeat < horizon) {
        const when = this.startTime + (this.nextBeat - this.startPos) * spb;
        if (when >= now - 0.02) audio.click(when, ((this.nextBeat % this.o.meter) + this.o.meter) % this.o.meter === 0, 0.7);
        this.nextBeat++;
      }
    } else this.nextBeat = Math.max(this.nextBeat, Math.ceil(this.pos));
    // mode main: tandai nada yang terlewat
    if (this.mode === 'play') {
      const late = 0.3 * bps;
      for (const n of this.notes) if (this.isUser(n) && !n.r && n.t < this.pos - late) n.r = 'miss';
      this.updScore();
    }
    if (this.pos >= 0) this.seek.value = this.pos;
    if (this.pos > this.total + 0.5) this.finish();
    this.draw();
  }
  onInput(e) {
    if (e.type !== 'on') return;
    if (this.playing) this.tick();
    if (this.mode === 'wait') {
      if (!this.playing) return;
      if (this.waiting && this.need.has(e.m)) {
        this.got.add(e.m);
        this.notes.forEach(n => { if (n.t === this.gates[this.gi] && n.m === e.m && this.isUser(n)) n.r = 'hit'; });
        if ([...this.need].every(m => this.got.has(m))) {
          this.gateCleared = this.gates[this.gi]; this.gi++; this.waiting = false;
          this.startPos = this.pos; this.startTime = audio.now();
        }
      } else if (this.waiting) { this.kb.flash(e.m, 'bad'); this.wrong = (this.wrong || 0) + 1; }
      this.updScore();
    } else if (this.mode === 'play' && this.playing) {
      const win = 0.22 * this.bps;
      const n = this.notes.find(n => this.isUser(n) && !n.r && n.m === e.m && Math.abs(n.t - this.pos) <= win);
      if (n) n.r = 'hit'; else { this.kb.flash(e.m, 'bad'); this.wrong = (this.wrong || 0) + 1; }
      this.updScore();
    }
  }
  updScore() {
    const el = this.el.querySelector('[data-k=score]');
    if (this.mode === 'listen') { el.textContent = ''; return; }
    const us = this.notes.filter(n => this.isUser(n));
    const hit = us.filter(n => n.r === 'hit').length, miss = us.filter(n => n.r === 'miss').length;
    const b = getBest(`song:${this.o.id}:${this.mode}:${this.hands}`);
    el.innerHTML = this.mode === 'play'
      ? `Tepat <b>${hit}</b> · Terlewat <b>${miss}</b> · Salah <b>${this.wrong || 0}</b>${b != null ? ` · Terbaik ${b}%` : ''}`
      : `Benar <b>${hit}</b>/${us.length} · Salah <b>${this.wrong || 0}</b>${b != null ? ` · Terbaik ${b}%` : ''}`;
  }
  finish() {
    const us = this.notes.filter(n => this.isUser(n));
    let acc = null;
    if (this.mode !== 'listen' && us.length) {
      const hit = us.filter(n => n.r === 'hit').length;
      acc = Math.round(hit / (us.length + (this.wrong || 0) * 0.5) * 100);
      const rec = best(`song:${this.o.id}:${this.mode}:${this.hands}`, acc);
      this.msg(`Selesai! Akurasi ${acc}%${rec ? ' — rekor baru!' : ''}`);
    }
    if (this.loop) { this.wrong = 0; this.notes.forEach(n => n.r = null); this.seekTo(0); this.reanchor(); this.startTime += 0.1; return; }
    this.playing = false; cancelAnimationFrame(this.raf);
    this.wrong = 0;
    this.pos = this.total; this.syncUI();
    if (acc != null) this.msg(`Selesai! Akurasi ${acc}%. Tekan Mulai untuk mengulang.`);
  }
  draw() {
    const c = this.ctx2; if (!c || !this.W) return;
    const W = this.W, H = this.H, bps = this.bps;
    const sl = this.kb.el.scrollLeft;
    const look = 3.2; const ppb = H / (look * bps);
    const css = getComputedStyle(document.documentElement);
    c.clearRect(0, 0, W, H);
    // garis birama
    c.lineWidth = 1;
    const m = this.o.meter;
    for (let b = Math.floor(this.pos); b < this.pos + look * bps + 1; b++) {
      const y = H - (b - this.pos) * ppb;
      c.strokeStyle = b % m === 0 ? css.getPropertyValue('--line-strong') : css.getPropertyValue('--line');
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    const colR = css.getPropertyValue('--rh').trim(), colL = css.getPropertyValue('--lh').trim();
    const active = new Map();
    c.font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const n of this.notes) {
      if (n.t + n.d < this.pos - 0.05 || n.t > this.pos + look * bps) continue;
      const box = this.kb.keyBox(n.m); if (!box) continue;
      const x = box.x - sl + (box.black ? 0 : 2), w = box.w - (box.black ? 0 : 4);
      const y1 = H - (n.t - this.pos) * ppb, y0 = H - (n.t + n.d - this.pos) * ppb;
      const user = this.isUser(n);
      let col = n.h === 'L' ? colL : colR;
      if (n.r === 'hit') col = css.getPropertyValue('--ok').trim();
      else if (n.r === 'miss') col = css.getPropertyValue('--bad').trim();
      c.globalAlpha = user || this.mode === 'listen' ? 1 : 0.42;
      rr(c, x, y0 + 1, w, Math.max(4, y1 - y0 - 2), Math.min(6, w / 2));
      c.fillStyle = col; c.fill();
      const lab = this.labelMode === 'finger' ? (n.f || '') : this.labelMode === 'name' ? PC_SHARP[n.m % 12].replace('♯', '#') : '';
      if (lab && y1 - y0 > 15 && w > 11) { c.fillStyle = '#fff'; c.fillText(String(lab), x + w / 2, Math.min(H - 9, y1 - 9)); }
      c.globalAlpha = 1;
      if (n.t <= this.pos + 1e-6 && this.pos < n.t + n.d) active.set(n.m, n);
    }
    // keyboard: nada aktif + petunjuk
    const marks = new Map();
    active.forEach((n, mm) => marks.set(mm, { cls: n.h === 'L' ? 'lh' : 'rh', finger: n.f || '' }));
    if (this.mode === 'wait') {
      const gt = this.gates[this.gi];
      if (gt != null && gt - this.pos < 0.6) this.notes.forEach(n => { if (n.t === gt && this.isUser(n)) marks.set(n.m, { cls: this.got?.has(n.m) ? 'ok' : 'hint', finger: n.f || '' }); });
    }
    const key = [...marks].map(([k, v]) => k + v.cls + v.finger).join(',');
    if (key !== this.lastMark) { this.lastMark = key; this.kb.mark(marks); }
    if (this.playing && this.pos > 0) {
      // ikuti nada: gulir keyboard bila nada keluar layar
      const first = [...marks.keys()][0];
      if (first != null && this.kb.el.classList.contains('scrolls')) {
        const b = this.kb.keyBox(first); if (b && (b.x < sl + 20 || b.x > sl + this.W - 40)) this.kb.scrollTo(first);
      }
    }
  }
  destroy() { this.playing = false; cancelAnimationFrame(this.raf); this.off(); this.ro.disconnect(); this.kb.destroy(); }
}

function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
