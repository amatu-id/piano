import { $, $$, esc, store, options, pick, shuffle } from '../util.js';
import { icon } from '../icons.js';
import { audio, Clock, at } from '../audio.js';
import { Piano, input, markActivity } from '../piano.js';
import { Player } from '../player.js';
import { scaleExercise } from '../songs.js';
import { staffSVG, spellMidi } from '../staff.js';
import { best, getBest } from '../progress.js';
import { ROOTS, nice, pcOf, CHORD, chordName, voice, IV, INTERVALS, SCALES, SCALE, isBlack, midiName, chordSpell, PC_NICE } from '../theory.js';

const TABS = [['telinga', 'Telinga', 'ear'], ['baca', 'Baca not', 'eye'], ['tangga', 'Tangga nada', 'target'], ['drill', 'Drill chord', 'chord'], ['metronom', 'Metronom', 'metro']];

export default {
  render(el, q) {
    const tab = TABS.some(t => t[0] === q._[0]) ? q._[0] : 'telinga';
    el.innerHTML = `<div class="page-h"><h1>Latihan</h1><p>Modul latihan harian — skor & rekor tersimpan di perangkat ini.</p></div>
      <div class="tabs">${TABS.map(([k, t, i]) => `<a href="#/latihan/${k}" class="${k === tab ? 'on' : ''}">${icon(i)} ${t}</a>`).join('')}</div><div id="pb"></div>`;
    return MODS[tab]($('#pb', el), q);
  },
};

// ================= TELINGA =================
const EAR = {
  interval: [
    { name: 'Pemula', set: [2, 4, 7, 12] },
    { name: 'Pemula+', set: [1, 2, 3, 4, 5, 7, 9, 12] },
    { name: 'Menengah (semua)', set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  ],
  chord: [
    { name: 'Mayor / minor', set: ['maj', 'm'] },
    { name: 'Triad lengkap', set: ['maj', 'm', 'dim', 'aug', 'sus4'] },
    { name: 'Septim', set: ['maj7', '7', 'm7', 'm7b5', 'dim7'] },
    { name: 'Jazz', set: ['maj9', '9', 'm9', '13', '7b9', '7s9', 'm6', '69'] },
  ],
};
function telinga(el, q) {
  let mode = q.mode === 'chord' ? 'chord' : 'interval', lvl = Math.min(+(q.lvl || 1), EAR[mode].length) - 1;
  let dir = store.get('earDir', 'up');
  let cur = null, answered = false, stats = { ok: 0, n: 0, streak: 0 };
  el.innerHTML = `<section class="card glass ear">
    <div class="toolbar">
      <div class="seg" id="em"><button data-m="interval">Interval</button><button data-m="chord">Kualitas chord</button></div>
      <label>Tingkat <select id="el"></select></label>
      <label id="dirw">Arah <select id="ed">${options([['up', 'Naik'], ['down', 'Turun'], ['harm', 'Bersamaan'], ['mix', 'Acak']], dir)}</select></label>
    </div>
    <div class="ear-main">
      <button class="play-big" id="ep">${icon('play')}<span>Putar</span></button>
      <div class="ear-q"><div class="muted" id="eqt">Tekan Putar, dengarkan, lalu pilih jawaban.</div><div class="ans" id="ea"></div></div>
    </div>
    <div class="ear-stat" id="es"></div>
    <div id="kb" class="kb-mid"></div>
  </section>
  <section class="card glass"><h2>Tips</h2><ul class="list"><li>Interval: hubungkan dengan lagu referensi (lihat <a href="#/teori/interval">Teori → Interval</a>).</li><li>Mayor terdengar terang, minor sendu, diminished tegang/sempit, augmented mengambang.</li><li>Septim: maj7 lembut-melayang, 7 "blues" ingin resolusi, m7 hangat, m7♭5 gelap, dim7 sangat tegang.</li><li>Nyanyikan nadanya sebelum menjawab — melatih telinga dalam.</li></ul></section>`;
  const kb = new Piano($('#kb', el), { from: 48, to: 84, labels: 'c', height: 110, minW: 20, caps: false });
  const setup = () => {
    $$('#em button', el).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    $('#el', el).innerHTML = options(EAR[mode].map((l, i) => [i, l.name]), lvl);
    $('#dirw', el).style.display = mode === 'interval' ? '' : 'none';
    const set = EAR[mode][lvl].set;
    $('#ea', el).innerHTML = set.map(v => `<button data-v="${v}">${mode === 'interval' ? `<b>${INTERVALS[v].short}</b><small>${INTERVALS[v].name}</small>` : `<b>${CHORD[v].sym || 'maj'}</b><small>${CHORD[v].name}</small>`}</button>`).join('');
    cur = null; answered = false; $('#eqt', el).textContent = 'Tekan Putar, dengarkan, lalu pilih jawaban.';
    stat();
  };
  const stat = () => {
    const key = `ear:${mode}:${lvl}`; const b = getBest(key);
    $('#es', el).innerHTML = `Benar <b>${stats.ok}</b>/${stats.n} · beruntun <b>${stats.streak}</b>${b ? ` · rekor beruntun ${b}` : ''}`;
  };
  const playCur = () => {
    if (!cur) return; audio.init();
    if (mode === 'interval') {
      const d = cur.d === 'mix' ? cur.dd : cur.d;
      const a = cur.base, b = cur.base + (d === 'down' ? -cur.v : cur.v);
      if (d === 'harm') audio.chord([a, b], 1.6); else audio.arp([a, b], 0.7, null, 0.72, 0.6);
    } else audio.chord(cur.ns, 1.8, null, 0.7, 0.012);
  };
  const next = () => {
    const set = EAR[mode][lvl].set;
    let v; do { v = pick(set); } while (cur && set.length > 2 && v === cur.v);
    if (mode === 'interval') cur = { v, base: 55 + Math.floor(Math.random() * 12), d: dir, dd: pick(['up', 'down', 'harm']) };
    else { const pc = Math.floor(Math.random() * 12); cur = { v, pc, ns: voice(pc, CHORD[v], 'root') }; }
    answered = false; kb.clear(); $$('#ea button', el).forEach(b => b.className = '');
    $('#eqt', el).textContent = mode === 'interval' ? 'Interval apakah ini?' : 'Chord jenis apa ini?';
    playCur();
  };
  $('#ep', el).onclick = () => { if (!cur || answered) next(); else playCur(); };
  $('#ea', el).onclick = e => {
    const b = e.target.closest('button'); if (!b || !cur || answered) return;
    answered = true; markActivity();
    const v = mode === 'interval' ? +b.dataset.v : b.dataset.v; const ok = v === cur.v;
    stats.n++; if (ok) { stats.ok++; stats.streak++; best(`ear:${mode}:${lvl}`, stats.streak); } else stats.streak = 0;
    b.classList.add(ok ? 'ok' : 'bad');
    $$('#ea button', el).forEach(x => { if ((mode === 'interval' ? +x.dataset.v : x.dataset.v) === cur.v) x.classList.add('ok'); });
    const ns = mode === 'interval' ? [cur.base, cur.base + ((cur.d === 'mix' ? cur.dd : cur.d) === 'down' ? -cur.v : cur.v)] : cur.ns;
    kb.markNotes(ns, 'tone');
    $('#eqt', el).innerHTML = ok ? '<b class="okc">Benar!</b> Tekan Putar untuk soal berikutnya.' : `<b class="badc">Belum tepat.</b> Jawabannya ${mode === 'interval' ? INTERVALS[cur.v].name : CHORD[cur.v].name}. Dengar lagi: ▶`;
    stat();
    if (ok) setTimeout(() => { if (answered) next(); }, 1300);
  };
  $('#em', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; lvl = 0; stats = { ok: 0, n: 0, streak: 0 }; setup(); };
  $('#el', el).onchange = e => { lvl = +e.target.value; stats = { ok: 0, n: 0, streak: 0 }; setup(); };
  $('#ed', el).onchange = e => { dir = e.target.value; store.set('earDir', dir); };
  setup();
  return () => kb.destroy();
}

// ================= BACA NOT =================
const NAT = m => !isBlack(m);
const READ = [
  { name: '1 · Kunci G, posisi C (C4–G4)', clef: 'treble', pool: [60, 62, 64, 65, 67] },
  { name: '2 · Kunci G, C4–C5', clef: 'treble', pool: range(60, 72).filter(NAT) },
  { name: '3 · Kunci F, G2–C4', clef: 'bass', pool: range(43, 60).filter(NAT) },
  { name: '4 · Grand staff, A2–E5', clef: 'grand', pool: range(45, 76).filter(NAT) },
  { name: '5 · Grand staff + ♯/♭ + garis bantu', clef: 'grand', pool: range(40, 84) },
];
function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
function baca(el, q) {
  let lvl = Math.min(5, Math.max(1, +(q.lvl || store.get('readLvl', 1)))) - 1;
  let exact = store.get('readExact', false), cur = null, sp = null, stats = { ok: 0, n: 0 }, timer = null, tLeft = 0, challenge = false, t0 = 0;
  el.innerHTML = `<section class="card glass read">
    <div class="toolbar">
      <label>Tingkat <select id="rl">${options(READ.map((l, i) => [i, l.name]), lvl)}</select></label>
      <label class="chk"><input type="checkbox" id="rx" ${exact ? 'checked' : ''}> Oktaf harus tepat</label>
      <button class="btn" id="rc">${icon('target')} Tantangan 60 detik</button>
      <span class="muted" id="rt"></span>
    </div>
    <div class="read-main"><div id="rs" class="staff-box"></div><div class="read-fb" id="rf">Tekan tuts yang sesuai dengan not di paranada (atau pilih huruf).</div></div>
    <div class="ans letters" id="rlet">${['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(l => `<button data-l="${l}"><b>${l}</b><small>${{ C: 'do', D: 're', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' }[l]}</small></button>`).join('')}</div>
    <div class="ear-stat" id="rst"></div>
    <div id="kb" class="kb-mid"></div>
  </section>
  <section class="card glass"><h2>Jembatan keledai</h2><div class="grid2 small"><div><h3>Kunci G (tangan kanan)</h3><p>Garis (bawah→atas): <b>E G B D F</b> — "<i>Every Good Boy Does Fine</i>". Spasi: <b>F A C E</b>.</p></div><div><h3>Kunci F (tangan kiri)</h3><p>Garis: <b>G B D F A</b> — "<i>Good Boys Do Fine Always</i>". Spasi: <b>A C E G</b>.</p></div></div><p class="muted">Patokan: <b>middle C (C4)</b> berada di garis bantu di bawah kunci G atau di atas kunci F.</p></section>`;
  const kb = new Piano($('#kb', el), { from: 36, to: 88, labels: 'c', height: 120, minW: 18 });
  const L = 'CDEFGAB';
  const draw = (color) => { $('#rs', el).innerHTML = staffSVG({ clef: READ[lvl].clef, width: 300, notes: cur ? [{ ...sp, color }] : [] }); };
  const next = () => {
    let m; do { m = pick(READ[lvl].pool); } while (cur != null && m === cur && READ[lvl].pool.length > 1);
    cur = m; sp = spellMidi(m, Math.random() < 0.5);
    if (isBlack(m)) $('#rlet', el).classList.add('dis'); else $('#rlet', el).classList.remove('dis');
    draw(); t0 = performance.now();
  };
  const stat = () => {
    const b = getBest(`read:${lvl}`);
    $('#rst', el).innerHTML = `Benar <b>${stats.ok}</b>/${stats.n}${stats.ok ? ` · rata-rata ${(stats.time / stats.ok).toFixed(1)} dtk` : ''}${b ? ` · rekor 60 dtk: ${b}` : ''}`;
  };
  const answer = (ok, shown) => {
    stats.n++; markActivity();
    if (ok) { stats.ok++; stats.time = (stats.time || 0) + (performance.now() - t0) / 1000; }
    const name = (L[sp.L] + (sp.acc > 0 ? '♯' : sp.acc < 0 ? '♭' : '')) + sp.oct;
    $('#rf', el).innerHTML = ok ? `<b class="okc">Benar — ${name}</b>` : `<b class="badc">Bukan ${shown}.</b> Itu ${name}.`;
    kb.flash(cur, ok ? 'ok' : 'bad', 700);
    if (!ok) { draw('var(--bad)'); audio.play(cur, 0.8, null, 0.6); }
    stat();
    setTimeout(next, ok ? 350 : 1100);
  };
  const off = input.on(e => {
    if (e.type !== 'on' || cur == null) return;
    const ok = exact ? e.m === cur : e.m % 12 === cur % 12;
    answer(ok, midiName(e.m).replace(/-?\d/, '') + (exact ? Math.floor(e.m / 12) - 1 : ''));
  });
  $('#rlet', el).onclick = e => {
    const b = e.target.closest('button'); if (!b || cur == null || isBlack(cur)) return;
    const ok = L.indexOf(b.dataset.l) === sp.L && sp.acc === 0;
    audio.play(cur, 0.6, null, 0.6); answer(ok, b.dataset.l);
  };
  $('#rl', el).onchange = e => { lvl = +e.target.value; store.set('readLvl', lvl + 1); stats = { ok: 0, n: 0 }; next(); stat(); };
  $('#rx', el).onchange = e => { exact = e.target.checked; store.set('readExact', exact); };
  $('#rc', el).onclick = () => {
    if (challenge) return;
    challenge = true; stats = { ok: 0, n: 0 }; tLeft = 60; next(); stat();
    $('#rt', el).textContent = '60 dtk';
    timer = setInterval(() => {
      tLeft--; $('#rt', el).textContent = tLeft + ' dtk';
      if (tLeft <= 0) { clearInterval(timer); challenge = false; const rec = best(`read:${lvl}`, stats.ok); $('#rt', el).innerHTML = `Selesai: <b>${stats.ok}</b> benar${rec ? ' — rekor baru!' : ''}`; stat(); }
    }, 1000);
  };
  next(); stat();
  return () => { off(); clearInterval(timer); kb.destroy(); };
}

// ================= TANGGA NADA =================
function tangga(el, q) {
  let root = q.root || store.get('scRoot', 'C'), sid = q.scale || 'major', oct = +(q.oct || 1), hands = q.hands || 'R', bpm = +(q.bpm || 72);
  el.innerHTML = `<section class="card glass">
    <div class="toolbar">
      <label>Kunci <select id="tr">${options(ROOTS.map(r => [r, nice(r)]), root)}</select></label>
      <label>Tangga nada <select id="ts">${options(SCALES.map(s => [s.id, s.name]), sid)}</select></label>
      <label>Oktaf <select id="to">${options([[1, '1'], [2, '2']], oct)}</select></label>
      <label>Tangan <select id="th">${options([['R', 'Kanan'], ['L', 'Kiri'], ['RL', 'Dua tangan']], hands)}</select></label>
      <label>BPM (♩ = 2 nada) <input type="number" id="tb" class="num" min="30" max="200" value="${bpm}"></label>
    </div>
    <p class="info" id="tinfo"></p>
    <div id="tp"></div>
  </section>
  <section class="card glass"><h2>Cara melatih tangga nada</h2><ul class="list">
    <li>Mulai mode <b>Tunggu</b> per tangan sampai penjarian otomatis (angka di not & tuts).</li>
    <li>Jempol menyeberang <b>di bawah</b> jari 3 atau 4 dengan halus — tanpa memutar pergelangan.</li>
    <li>Ganti ke <b>Main + skor</b> dengan metronom. Target pemula 60, menengah 90–100, mahir 120+ (2 nada per ketukan).</li>
    <li>Urutan kunci yang disarankan: C, G, D, A, E, B, lalu F, B♭, E♭, A♭, D♭, F♯.</li></ul></section>`;
  let pl = null;
  const build = () => {
    pl && pl.destroy();
    const sc = SCALE[sid];
    $('#tinfo', el).innerHTML = `<b>${nice(root)} ${esc(sc.name)}</b> — ${esc(sc.info)}`;
    pl = new Player($('#tp', el), { notes: scaleExercise(root, sid, oct, hands, 0.5), bpm, meter: 4, id: `scale:${root}:${sid}:${oct}` });
    if (!hands.includes('L')) pl.hands = 'R'; else pl.hands = hands;
    pl.syncUI(); pl.seekTo(0);
  };
  const ch = (id, f) => $(id, el).onchange = e => { f(e.target.value); build(); };
  ch('#tr', v => { root = v; store.set('scRoot', v); }); ch('#ts', v => sid = v); ch('#to', v => oct = +v); ch('#th', v => hands = v); ch('#tb', v => bpm = Math.max(30, Math.min(200, +v || 72)));
  build();
  return () => pl && pl.destroy();
}

// ================= DRILL CHORD =================
const DRILL = [
  { name: '1 · Triad mayor & minor', set: ['maj', 'm'] },
  { name: '2 · Semua triad (dim, aug, sus)', set: ['maj', 'm', 'dim', 'aug', 'sus2', 'sus4'] },
  { name: '3 · Chord septim', set: ['maj7', '7', 'm7', 'm7b5', 'dim7'] },
  { name: '4 · Inversi triad (dengan bass)', set: ['maj', 'm'], inv: true },
  { name: '5 · Jazz extended', set: ['maj9', '9', 'm9', '13', '69', 'm6', '7sus4'], jazz: true },
  { name: '6 · Jazz altered', set: ['7b9', '7s9', '13b9', '7s11', 'alt', 'm7b5'], jazz: true },
];
function drill(el, q) {
  let lvl = Math.min(6, Math.max(1, +(q.lvl || store.get('drillLvl', 1)))) - 1;
  const focus = q.chord && CHORD[q.chord] ? q.chord : null;
  let latch = store.get('drillLatch', !matchMedia('(hover:hover)').matches), sel = new Set(), cur = null, t0 = 0, stats = { ok: 0, time: 0, skip: 0 }, done = false;
  el.innerHTML = `<section class="card glass drill">
    <div class="toolbar">
      <label>Tingkat <select id="dl">${options([...(focus ? [[-1, `Fokus: ${CHORD[focus].name} (12 kunci)`]] : []), ...DRILL.map((d, i) => [i, d.name])], focus ? -1 : lvl)}</select></label>
      <label class="chk"><input type="checkbox" id="dlt" ${latch ? 'checked' : ''}> Mode klik (tuts tetap tertekan — untuk mouse/sentuh)</label>
      <button class="btn" id="dh">Petunjuk</button><button class="btn" id="ds">Lewati</button><button class="btn" id="dc">Bersihkan</button>
    </div>
    <div class="drill-main"><div class="muted">Mainkan chord:</div><div class="target" id="dt"></div><div class="read-fb" id="df"></div></div>
    <div class="ear-stat" id="dst"></div>
    <div id="kb" class="kb-mid"></div>
  </section>
  <section class="card glass"><h2>Aturan</h2><ul class="list"><li>Oktaf bebas & nada boleh digandakan. Nada di luar chord dihitung salah.</li><li>Level inversi: nada terendah harus nada bass yang diminta (C/E → E paling bawah).</li><li>Level jazz: akar dan kwint boleh dihilangkan (seperti voicing rootless); terts, septim & tensi wajib. Untuk 7alt cukup 3, ♭7, salah satu ♭9/♯9 dan salah satu ♯11/♭13.</li><li>Pakai keyboard MIDI untuk hasil terbaik; dengan mouse aktifkan <b>mode klik</b>.</li></ul></section>`;
  const kb = new Piano($('#kb', el), {
    from: 36, to: 84, labels: 'c', height: 140, minW: 20,
    onPress: (m, down) => {
      if (!latch) return true;
      if (down) { if (sel.has(m)) { sel.delete(m); kb.setDown(m, false); } else { sel.add(m); audio.play(m, 0.9, null, 0.65); } kb.mark(new Map([...sel].map(x => [x, { cls: 'tone' }]))); check(); }
      return false;
    },
  });
  const pool = () => focus && lvl === -1 ? { set: [focus], jazz: ['ext', 'alt'].includes(CHORD[focus].cat) } : DRILL[lvl];
  const next = () => {
    const P = pool();
    let id, pc, inv = 0;
    do { id = pick(P.set); pc = Math.floor(Math.random() * 12); } while (cur && cur.id === id && cur.pc === pc);
    if (P.inv) inv = Math.floor(Math.random() * 3);
    const c = CHORD[id];
    const root = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][pc];
    const sp = chordSpell(root, c);
    const bassPc = (pc + IV[c.iv[inv]]) % 12;
    cur = { id, pc, inv, bassPc, root, label: chordName(root, c) + (inv ? '/' + sp[inv] : ''), sub: inv ? ['', 'inversi 1 (terts di bass)', 'inversi 2 (kwint di bass)'][inv] : c.name };
    $('#dt', el).innerHTML = `<b>${cur.label}</b><small>${cur.sub}</small>`;
    $('#df', el).textContent = ''; sel.clear(); kb.clear(); done = false; t0 = performance.now();
    if (latch) input.down.forEach(m => kb.setDown(m, true));
  };
  const reqs = () => {
    const c = CHORD[cur.id], P = pool();
    const all = new Set(c.iv.map(x => (cur.pc + IV[x]) % 12));
    let need = new Set(all);
    if (P.jazz) { need.delete(cur.pc); if (c.iv.includes('5')) need.delete((cur.pc + 7) % 12); }
    let any = [];
    if (c.id === 'alt') { need = new Set([(cur.pc + 4) % 12, (cur.pc + 10) % 12]); any = [[1, 3], [6, 8]].map(g => g.map(s => (cur.pc + s) % 12)); }
    return { all, need, any };
  };
  const check = () => {
    if (!cur || done) return;
    const notes = latch ? [...sel] : [...input.down];
    if (!notes.length) return;
    const pcs = new Set(notes.map(m => m % 12));
    const { all, need, any } = reqs();
    const wrong = [...pcs].filter(p => !all.has(p));
    if (wrong.length) { $('#df', el).innerHTML = `<b class="badc">Ada nada di luar chord: ${wrong.map(p => PC_NICE[p]).join(', ')}</b>`; return; }
    const okNeed = [...need].every(p => pcs.has(p)) && any.every(g => g.some(p => pcs.has(p)));
    const okBass = !cur.inv || Math.min(...notes) % 12 === cur.bassPc;
    if (okNeed && okBass && notes.length >= Math.min(3, need.size)) {
      done = true; markActivity();
      const dt = (performance.now() - t0) / 1000; stats.ok++; stats.time += dt;
      notes.forEach(m => kb.flash(m, 'ok', 600));
      $('#df', el).innerHTML = `<b class="okc">Tepat! ${dt.toFixed(1)} dtk</b>`;
      if (latch) audio.chord(notes, 1, null, 0.65);
      stat();
      setTimeout(next, 900);
    } else if (okNeed && !okBass) $('#df', el).textContent = `Nadanya benar — sekarang ${PC_NICE[cur.bassPc]} harus paling bawah.`;
    else $('#df', el).textContent = '';
  };
  const stat = () => { const avg = stats.ok ? stats.time / stats.ok : 0; if (stats.ok >= 10) best(`drill:${focus || lvl}`, -avg.toFixed(2)); const b = getBest(`drill:${focus || lvl}`); $('#dst', el).innerHTML = `Benar <b>${stats.ok}</b> · rata-rata <b>${avg.toFixed(1)}</b> dtk · dilewati ${stats.skip}${b != null ? ` · rekor rata-rata (≥10 soal) ${(-b).toFixed(1)} dtk` : ''}`; };
  const off = input.on(e => { if (!latch) check(); });
  $('#dl', el).onchange = e => { lvl = +e.target.value; if (lvl >= 0) store.set('drillLvl', lvl + 1); stats = { ok: 0, time: 0, skip: 0 }; next(); stat(); };
  $('#dlt', el).onchange = e => { latch = e.target.checked; store.set('drillLatch', latch); sel.clear(); kb.clear(); };
  $('#dh', el).onclick = () => { const c = CHORD[cur.id]; let ns = voice(cur.pc, c, cur.inv ? 'inv' + cur.inv : 'root'); kb.markNotes(ns, 'hint', chordSpell(cur.root, c).map((n, i) => n).slice(0, ns.length).map(() => null), cur.pc); audio.chord(ns, 1.4, null, 0.6); };
  $('#ds', el).onclick = () => { stats.skip++; stat(); next(); };
  $('#dc', el).onclick = () => { sel.clear(); kb.clear(); [...input.down].forEach(m => kb.setDown(m, true)); };
  if (focus) lvl = -1;
  next(); stat();
  return () => { off(); kb.destroy(); };
}

// ================= METRONOM =================
function metronom(el) {
  const st = { bpm: store.get('mBpm', 80), meter: store.get('mMeter', 4), sub: store.get('mSub', 1), accent: true, train: false, inc: 4, every: 4, max: 160 };
  el.innerHTML = `<section class="card glass metro">
    <div class="metro-top">
      <button class="ib lg" id="mm">−</button>
      <div class="bpm"><b id="mb">${st.bpm}</b><span id="mt">BPM</span></div>
      <button class="ib lg" id="mp">+</button>
    </div>
    <input type="range" id="mr" min="30" max="240" value="${st.bpm}" class="wide">
    <div class="dots" id="md"></div>
    <div class="toolbar center">
      <button class="btn pri big-btn" id="mgo">${icon('play')} Mulai</button>
      <button class="btn" id="mtap">Tap tempo</button>
      <label>Birama <select id="mme">${options([[2, '2/4'], [3, '3/4'], [4, '4/4'], [5, '5/4'], [6, '6/8'], [7, '7/8']], st.meter)}</select></label>
      <label>Subdivisi <select id="msu">${options([[1, '♩ seperempat'], [2, '♪♪ seperdelapan'], [3, 'triol'], [4, '♬ seperenambelas']], st.sub)}</select></label>
      <label class="chk"><input type="checkbox" id="mac" checked> Aksen ketukan 1</label>
    </div>
    <div class="toolbar center trainer">
      <label class="chk"><input type="checkbox" id="mtr"> Pelatih kecepatan:</label>
      <label>naik <input type="number" id="minc" class="num" value="4" min="1" max="20"> bpm</label>
      <label>tiap <input type="number" id="mev" class="num" value="4" min="1" max="32"> birama</label>
      <label>sampai <input type="number" id="mmax" class="num" value="160" min="40" max="240"> bpm</label>
    </div>
  </section>
  <section class="card glass"><h2>Kenapa metronom?</h2><p>Ketukan yang stabil lebih penting daripada kecepatan. Mulailah di tempo di mana Anda tidak membuat kesalahan, lalu gunakan <b>pelatih kecepatan</b> agar tempo naik perlahan secara otomatis. Untuk swing, set subdivisi triol dan rasakan ketukan 2 & 4.</p></section>`;
  const clock = new Clock(st.bpm, st.sub);
  const tempoName = b => b < 60 ? 'Largo' : b < 76 ? 'Adagio' : b < 108 ? 'Andante' : b < 120 ? 'Moderato' : b < 156 ? 'Allegro' : b < 176 ? 'Vivace' : 'Presto';
  const setBpm = b => { st.bpm = Math.max(30, Math.min(240, Math.round(b))); clock.bpm = st.bpm; $('#mb', el).textContent = st.bpm; $('#mr', el).value = st.bpm; $('#mt', el).textContent = `BPM · ${tempoName(st.bpm)}`; store.set('mBpm', st.bpm); };
  const dots = () => { $('#md', el).innerHTML = [...Array(st.meter)].map((_, i) => `<i class="${i === 0 && st.accent ? 'a' : ''}"></i>`).join(''); };
  dots(); setBpm(st.bpm);
  const timers = [];
  const start = () => {
    clock.sub = st.sub; let bars = 0;
    clock.start((i, t) => {
      const beat = Math.floor(i / st.sub), sub = i % st.sub, inBar = beat % st.meter;
      if (sub === 0 && inBar === 0 && i > 0) { bars++; if (st.train && bars % st.every === 0 && st.bpm < st.max) timers.push(at(t, () => setBpm(Math.min(st.max, st.bpm + st.inc)))); }
      audio.click(t, sub === 0 && inBar === 0 && st.accent, sub === 0 ? 1 : 0.45);
      if (sub === 0) timers.push(at(t, () => { $$('#md i', el).forEach((d, j) => d.classList.toggle('on', j === inBar)); }));
      if (timers.length > 64) timers.splice(0, 32);
    });
    $('#mgo', el).innerHTML = `${icon('stop')} Stop`; $('#mgo', el).classList.add('on');
  };
  const stop = () => { clock.stop(); timers.forEach(clearTimeout); $('#mgo', el).innerHTML = `${icon('play')} Mulai`; $('#mgo', el).classList.remove('on'); $$('#md i', el).forEach(d => d.classList.remove('on')); };
  $('#mgo', el).onclick = () => clock.running ? stop() : start();
  $('#mm', el).onclick = () => setBpm(st.bpm - 1); $('#mp', el).onclick = () => setBpm(st.bpm + 1);
  $('#mr', el).oninput = e => setBpm(+e.target.value);
  let taps = [];
  $('#mtap', el).onclick = () => { const n = performance.now(); taps = taps.filter(t => n - t < 2500); taps.push(n); if (taps.length >= 2) { const d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); setBpm(60000 / d); } audio.click(null, false, 0.6); };
  const restart = () => { if (clock.running) { stop(); start(); } };
  $('#mme', el).onchange = e => { st.meter = +e.target.value; store.set('mMeter', st.meter); dots(); restart(); };
  $('#msu', el).onchange = e => { st.sub = +e.target.value; store.set('mSub', st.sub); restart(); };
  $('#mac', el).onchange = e => { st.accent = e.target.checked; dots(); };
  $('#mtr', el).onchange = e => st.train = e.target.checked;
  $('#minc', el).onchange = e => st.inc = +e.target.value; $('#mev', el).onchange = e => st.every = +e.target.value; $('#mmax', el).onchange = e => st.max = +e.target.value;
  return () => stop();
}

const MODS = { telinga, baca, tangga, drill, metronom };
