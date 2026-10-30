import { $, $$, esc, store, options } from '../util.js';
import { icon } from '../icons.js';
import { audio, Clock, at } from '../audio.js';
import { Piano } from '../piano.js';
import { PROGS, ROOTS, nice, progChords, voice, voiceDist, CHORD, IV, chordName } from '../theory.js';

const STYLES = [['block', 'Blok (tahan)'], ['pop', 'Pop (ketukan)'], ['arp', 'Arpeggio'], ['alberti', 'Alberti bass'], ['ballad', 'Ballad'], ['swing', 'Swing (walking + Charleston)'], ['bossa', 'Bossa nova']];
const VOICINGS = [['basic', 'Dasar (inversi terdekat)'], ['shell', 'Shell tangan kiri'], ['rootless', 'Rootless A/B (jazz)'], ['drop2', 'Drop 2'], ['quartal', 'Kuart (modal)']];
const KEYS12 = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G'];

// susun voicing seluruh progresi dengan voice leading
function plan(chs, vmode) {
  let prev = null, out = [];
  chs.forEach((ch, i) => {
    const c = ch.c; let cands = [];
    const core = coreChord(c, vmode);
    if (vmode === 'rootless' && hasSev(c)) cands = ['rootA', 'rootB'].map(v => voice(ch.pc, core, v));
    else if (vmode === 'shell' && hasSev(c)) cands = ['shellA', 'shellB'].map(v => voice(ch.pc, core, v));
    else if (vmode === 'drop2' && hasSev(c)) cands = [voice(ch.pc, core, 'drop2'), voice(ch.pc, core, 'drop2').map(n => n + 12), voice(ch.pc, core, 'drop2').map(n => n - 12)];
    else if (vmode === 'quartal' && core.iv.includes('b3')) cands = [voice(ch.pc, CHORD.m11, 'quartal')];
    if (!cands.length) {
      const base = core.iv.filter(x => IV[x] < 12).length >= 3 ? core : CHORD[c.iv.includes('b3') ? 'm7' : c.iv.includes('b7') ? '7' : 'maj7'];
      const n = base.iv.filter(x => IV[x] < 12).length;
      const vs = ['root', 'inv1', 'inv2', 'inv3'].slice(0, n).map(v => voice(ch.pc, simplify(base), v));
      cands = vs.flatMap(v => [v, v.map(x => x + 12), v.map(x => x - 12)]).filter(v => Math.min(...v) >= 52 && Math.max(...v) <= 79);
      if (!cands.length) cands = vs;
    }
    cands = cands.filter(v => Math.min(...v) >= 40 && Math.max(...v) <= 86);
    const target = prev || (vmode === 'shell' ? [48, 52, 58] : [60, 64, 67, 71]);
    const best = cands.sort((a, b) => voiceDist(a, target) - voiceDist(b, target))[0];
    prev = best;
    const bassBase = 36 + ch.pc; const bass = bassBase > 45 ? bassBase - 12 : bassBase;
    out.push({ ...ch, rh: best, bass, shell: vmode === 'shell' });
  });
  return out;
}
const hasSev = c => c.iv.some(x => ['7', 'b7', 'bb7', '6'].includes(x));
const simplify = c => ({ ...c, iv: c.iv.filter(x => IV[x] < 12 && x !== '8') });
function coreChord(c, vmode) {
  if (vmode !== 'basic') return c;
  // dasar: batasi 4 nada (buang ekstensi)
  return { ...c, iv: c.iv.filter(x => IV[x] < 12 && x !== '8').slice(0, 4) };
}

// pola per birama → event [beat, notes[], durBeat, vel]
function pattern(style, p, next, beats) {
  const R = p.rh, B = p.bass, E = [];
  const fifth = B + 7, oct = B + 12;
  const lh = p.shell;
  const take = arr => arr.filter(e => e[0] < beats);
  switch (style) {
    case 'block': E.push([0, lh ? R : [B, ...R], beats * 0.95, 0.7]); break;
    case 'pop':
      E.push([0, [B, oct], beats >= 4 ? 1.9 : 0.95, 0.72]);
      if (beats >= 4) E.push([2, [fifth], 1.9, 0.6]);
      for (let b = 0; b < beats; b++) E.push([b, R, 0.45, b % 2 ? 0.55 : 0.68], [b + 0.5, R, 0.35, 0.45]);
      break;
    case 'arp': {
      E.push([0, [B], beats, 0.7]);
      const seq = [...R, R[0] + 12, ...[...R].reverse().slice(1, -1)];
      for (let i = 0; i < beats * 2; i++) E.push([i / 2, [seq[i % seq.length]], 0.9, 0.6]);
      break;
    }
    case 'alberti': {
      const low = R.map(n => n - 12).filter(n => n >= 43); const t = low.length >= 3 ? low.slice(0, 3) : R.slice(0, 3);
      const al = [t[0], t[2], t[1], t[2]];
      for (let i = 0; i < beats * 2; i++) E.push([i / 2, [al[i % 4]], 0.5, i % 4 === 0 ? 0.68 : 0.5]);
      E.push([0, [R[R.length - 1] + 12], beats * 0.95, 0.55]);
      break;
    }
    case 'ballad':
      E.push([0, [B], beats, 0.7], [0, R, beats * 0.95, 0.55], [1, [fifth], 0.9, 0.48], [2, [oct], 0.9, 0.5], [3, [fifth], 0.9, 0.45]);
      break;
    case 'swing': {
      const sw = 2 / 3;
      const nb = next ? next.bass : B;
      const walk = [B, B + (p.c.iv.includes('b3') ? 3 : 4), B + 7, nb + (nb > B ? -1 : 1)];
      if (beats === 2) { E.push([0, [B], 0.95, 0.72], [1, [nb + (nb > B ? -1 : 1)], 0.95, 0.62]); E.push([0, R, 0.5, 0.6], [1 + sw, R, 0.3, 0.5]); }
      else { walk.forEach((n, i) => E.push([i, [n], 0.95, i === 0 ? 0.74 : 0.62])); E.push([0, R, 0.6, 0.6], [1 + sw, R, 0.3, 0.52]); }
      break;
    }
    case 'bossa':
      E.push([0, [B], 1.4, 0.7], [1.5, [fifth - 12 >= 28 ? fifth - 12 : fifth], 0.45, 0.55], [2, [fifth - 12 >= 28 ? fifth - 12 : fifth], 1.4, 0.62], [3.5, [B], 0.45, 0.55]);
      [0, 1.5, 3].forEach(b => E.push([b, R, 0.4, 0.55]));
      E.push([2.5, R, 0.35, 0.45]);
      break;
  }
  return take(E);
}

export default {
  render(el, q) {
    let cur = PROGS.find(p => p.id === q._[0]) || PROGS[0];
    let key = cur.key;
    const st = { style: q.style || store.get('pStyle', 'block'), voicing: q.voicing || (cur.lvl.match(/Mahir|Expert/) ? 'rootless' : 'basic'), bpm: +(q.bpm || store.get('pBpm', 84)), loop: true, rotate: q.rotate === '1', click: false };
    el.innerHTML = `
    <div class="page-h"><h1>Progresi Chord</h1><p>Pilih progresi, kunci, pola iringan dan voicing. Mainkan melodi atau improvisasi di atasnya dengan keyboard Anda sendiri.</p></div>
    <div class="prog-layout">
      <aside class="card glass plist" id="plist">${['Pemula', 'Pemula+', 'Menengah', 'Mahir', 'Expert'].map(l => {
        const ps = PROGS.filter(p => p.lvl === l); if (!ps.length) return '';
        return `<h3>${l}</h3>${ps.map(p => `<a href="#/progresi/${p.id}" data-id="${p.id}" class="${p === cur ? 'on' : ''}">${esc(p.name)}</a>`).join('')}`;
      }).join('')}</aside>
      <section class="card glass">
        <div class="card-h"><h2 id="pname"></h2><span class="badge" id="plvl"></span></div>
        <p class="info" id="pinfo"></p>
        <div class="toolbar">
          <label>Kunci <select id="pkey">${options(ROOTS.map(r => [r, nice(r) + (cur.minor ? 'm' : '')]), key)}</select></label>
          <label>Pola <select id="pst">${options(STYLES, st.style)}</select></label>
          <label>Voicing <select id="pvo">${options(VOICINGS, st.voicing)}</select></label>
          <label>BPM <input type="range" id="pbpm" min="40" max="200" value="${st.bpm}"><b id="pbv">${st.bpm}</b></label>
        </div>
        <div class="toolbar">
          <button class="btn pri big-btn" id="pgo">${icon('play')} Putar</button>
          <label class="chk"><input type="checkbox" id="ploop" checked> Ulang</label>
          <label class="chk"><input type="checkbox" id="prot" ${st.rotate ? 'checked' : ''}> Putar kunci (lingkaran kuart, 12 kunci)</label>
          <label class="chk"><input type="checkbox" id="pclk"> Metronom</label>
        </div>
        <div class="chips prog-chips" id="pch"></div>
        <div id="kb" class="kb-mid"></div>
        <p class="hint">Klik chip chord untuk mendengar satu per satu. Tangan kanan Anda tetap bisa bermain di keyboard (mouse, keyboard komputer, atau MIDI) saat progresi berjalan.</p>
      </section>
    </div>`;
    const kb = new Piano($('#kb', el), { from: 28, to: 91, labels: 'c', height: 140, minW: 17 });
    let P = [], clock = new Clock(st.bpm, 2), timers = [];

    const build = () => {
      const chs = progChords(cur, key);
      P = plan(chs, st.voicing);
      $('#pname', el).textContent = `${cur.name} — ${nice(key)}${cur.minor ? ' minor' : ''}`;
      $('#plvl', el).textContent = cur.lvl;
      $('#pinfo', el).textContent = cur.info;
      $('#pch', el).innerHTML = P.map((p, i) => `<button class="chip" data-i="${i}" style="flex-grow:${p.beats}"><small>${p.rn}</small>${chordName(p.root, p.c)}</button>`).join('');
    };
    const show = i => {
      $$('#pch .chip', el).forEach((c, j) => c.classList.toggle('on', j === i));
      const p = P[i]; if (!p) return;
      const map = new Map(); map.set(p.bass, { cls: 'lh' }); p.rh.forEach(n => map.set(n, { cls: n % 12 === p.pc ? 'root' : 'tone' }));
      kb.mark(map);
    };
    const stop = () => { clock.stop(); timers.forEach(clearTimeout); timers = []; $('#pgo', el).innerHTML = `${icon('play')} Putar`; $('#pgo', el).classList.remove('on'); };
    const start = () => {
      build();
      audio.init();
      // jadwalkan dalam satuan setengah ketukan
      let stepIdx = 0, h = 0, keyIdx = Math.max(0, KEYS12.indexOf(key)), ended = false;
      clock.bpm = st.bpm;
      clock.start((tick, t) => {
        if (ended) return;
        if (tick > 0 && ++h >= P[stepIdx].beats * 2) {
          h = 0; stepIdx++;
          if (stepIdx >= P.length) {
            if (!st.loop) { ended = true; timers.push(at(t, stop)); return; }
            stepIdx = 0;
            if (st.rotate) { keyIdx = (keyIdx + 1) % 12; key = KEYS12[keyIdx]; build(); $('#pkey', el).value = key; }
          }
        }
        if (st.click && h % 2 === 0) audio.click(t, h === 0, 0.6);
        if (h !== 0) return;
        const pp = P[stepIdx], nx = P[(stepIdx + 1) % P.length];
        const spb = 60 / st.bpm;
        for (const [b, ns, d, v] of pattern(st.style, pp, nx, pp.beats)) ns.forEach(n => audio.play(n, d * spb, t + b * spb, v));
        const si = stepIdx; timers.push(at(t, () => show(si)));
        if (timers.length > 200) timers = timers.slice(-50);
      });
      $('#pgo', el).innerHTML = `${icon('stop')} Stop`; $('#pgo', el).classList.add('on');
    };
    $('#pgo', el).onclick = () => clock.running ? stop() : start();
    const rebuild = () => { const was = clock.running; if (was) stop(); build(); if (was) start(); };
    $('#pkey', el).onchange = e => { key = e.target.value; rebuild(); };
    $('#pst', el).onchange = e => { st.style = e.target.value; store.set('pStyle', st.style); };
    $('#pvo', el).onchange = e => { st.voicing = e.target.value; rebuild(); };
    $('#pbpm', el).oninput = e => { st.bpm = +e.target.value; $('#pbv', el).textContent = st.bpm; clock.bpm = st.bpm; store.set('pBpm', st.bpm); };
    $('#ploop', el).onchange = e => st.loop = e.target.checked;
    $('#prot', el).onchange = e => st.rotate = e.target.checked;
    $('#pclk', el).onchange = e => st.click = e.target.checked;
    $('#pch', el).onclick = e => {
      const c = e.target.closest('.chip'); if (!c) return;
      const p = P[+c.dataset.i]; audio.chord([p.bass, ...p.rh], 1.4, null, 0.7, 0.01); show(+c.dataset.i);
    };
    build(); show(0);
    return () => { stop(); kb.destroy(); };
  },
};
