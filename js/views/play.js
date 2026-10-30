import { $, esc, store, options, toast } from '../util.js';
import { icon } from '../icons.js';
import { audio, Clock, at } from '../audio.js';
import { Piano, input } from '../piano.js';
import { detect, midiName, ROOTS, SCALES, SCALE, IV, pcOf, nice, scaleSpell } from '../theory.js';

const RANGES = [['37', '37 tuts (C3–C6)', 48, 84], ['49', '49 tuts (C2–C6)', 36, 84], ['61', '61 tuts (C2–C7)', 36, 96], ['76', '76 tuts (E1–G7)', 28, 103], ['88', '88 tuts (A0–C8)', 21, 108]];

export function smf(events) { // events: [{t (detik), type:'on'|'off', m, vel}]
  const tpq = 480, spb = 0.5; // 120 bpm
  const bytes = [];
  const vlq = n => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
  let last = 0;
  const ev = [...events].sort((a, b) => a.t - b.t);
  bytes.push(0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20);
  for (const e of ev) {
    const tick = Math.round(e.t / spb * tpq);
    bytes.push(...vlq(Math.max(0, tick - last))); last = tick;
    bytes.push(e.type === 'on' ? 0x90 : 0x80, e.m, e.type === 'on' ? Math.max(1, Math.round((e.vel ?? 0.8) * 127)) : 64);
  }
  bytes.push(0, 0xff, 0x2f, 0);
  const len = bytes.length;
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (tpq >> 8) & 255, tpq & 255, 0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255];
  return new Blob([new Uint8Array([...head, ...bytes])], { type: 'audio/midi' });
}

export default {
  render(el, q) {
    const mobile = innerWidth < 700;
    let range = store.get('range', mobile ? '37' : '61');
    let scale = q.scale || '', sroot = q.root || 'C';
    el.innerHTML = `
    <div class="page-h"><h1>Keyboard</h1><p>Main bebas, lihat nama chord yang Anda tekan, tampilkan tangga nada sebagai panduan improvisasi, dan rekam permainan Anda.</p></div>
    <div class="card glass">
      <div class="toolbar">
        <label>Ukuran <select id="rng">${options(RANGES.map(r => [r[0], r[1]]), range)}</select></label>
        <label>Label <select id="lbl">${options([['none', 'Tanpa'], ['c', 'Hanya C'], ['all', 'Semua nama'], ['solf', 'Do–Re–Mi']], q.labels || store.get('labels', 'c'))}</select></label>
        <label class="chk"><input type="checkbox" id="caps" ${store.get('caps', true) ? 'checked' : ''}> Huruf keyboard</label>
        <span class="sep"></span>
        <label>Panduan tangga nada <select id="sroot">${options(ROOTS.map(r => [r, nice(r)]), sroot)}</select>
          <select id="sc">${options([['', '— mati —'], ...SCALES.map(s => [s.id, s.name])], scale)}</select></label>
      </div>
      <div class="detect">
        <div class="dn" id="dn">Tekan beberapa tuts…</div>
        <div class="dnotes" id="dnotes"></div>
      </div>
      <div id="kb" class="kb-big"></div>
      <div class="toolbar mt">
        <button class="btn" id="rec">${icon('rec')} Rekam</button>
        <button class="btn" id="rplay" disabled>${icon('play')} Putar</button>
        <button class="btn" id="rmid" disabled>${icon('dl')} Unduh MIDI</button>
        <span class="muted" id="rinfo"></span>
        <span class="sep"></span>
        <button class="btn" id="met">${icon('metro')} Metronom</button>
        <label>BPM <input type="number" id="bpm" min="30" max="240" value="${store.get('bpm', 90)}" class="num"></label>
        <span class="muted kbd-hint">Oktaf keyboard komputer: <b id="oct">${input.kbOct}</b> (Z / X)</span>
      </div>
      <p class="hint" id="schint"></p>
    </div>`;

    const kb = new Piano($('#kb', el), { from: RANGES.find(r => r[0] === range)[2], to: RANGES.find(r => r[0] === range)[3], labels: q.labels || store.get('labels', 'c'), height: mobile ? 170 : 230, minW: mobile ? 34 : 24 });
    setTimeout(() => kb.scrollTo(60), 50);
    $('#rng', el).onchange = e => { range = e.target.value; store.set('range', range); const r = RANGES.find(x => x[0] === range); kb.setRange(r[2], r[3]); applyScale(); kb.scrollTo(60); };
    $('#lbl', el).onchange = e => { store.set('labels', e.target.value); kb.setLabels(e.target.value); };
    $('#caps', el).onchange = e => { store.set('caps', e.target.checked); kb.refreshCaps(); };

    const applyScale = () => {
      const h = $('#schint', el);
      if (!scale) { kb.clear(); h.textContent = ''; return; }
      const sc = SCALE[scale]; const pc = pcOf(sroot);
      const set = new Map(sc.iv.map(iv => [(pc + IV[iv]) % 12, iv]));
      const map = new Map();
      for (let m = 21; m <= 108; m++) { const iv = set.get(m % 12); if (iv != null) map.set(m, { cls: iv === '1' ? 'scale root' : 'scale' }); }
      kb.mark(map);
      h.innerHTML = `<b>${nice(sroot)} ${esc(sc.name)}:</b> ${scaleSpell(sroot, scale).join(' · ')} — ${esc(sc.info)}`;
    };
    $('#sroot', el).onchange = e => { sroot = e.target.value; applyScale(); };
    $('#sc', el).onchange = e => { scale = e.target.value; applyScale(); };
    applyScale();

    const upd = () => {
      const ns = [...input.down].sort((a, b) => a - b);
      const d = detect(ns);
      $('#dn', el).textContent = d ? d.name : (ns.length === 1 ? midiName(ns[0]) : 'Tekan beberapa tuts…');
      $('#dn', el).classList.toggle('on', !!d);
      $('#dnotes', el).innerHTML = ns.map(m => `<span>${midiName(m)}</span>`).join('');
      $('#oct', el).textContent = input.kbOct;
    };
    // rekaman
    let rec = store.get('lastRec', null), recording = false, t0 = 0, timers = [];
    const setRecUI = () => {
      $('#rec', el).innerHTML = recording ? `${icon('stop')} Stop` : `${icon('rec')} Rekam`;
      $('#rec', el).classList.toggle('danger', recording);
      $('#rplay', el).disabled = $('#rmid', el).disabled = !rec || !rec.length;
      $('#rinfo', el).textContent = recording ? '● merekam…' : rec && rec.length ? `${rec.filter(e => e.type === 'on').length} nada · ${rec[rec.length - 1].t.toFixed(1)} dtk` : '';
    };
    setRecUI();
    const off = input.on(e => {
      upd();
      if (recording) { if (!t0) t0 = performance.now(); rec.push({ t: (performance.now() - t0) / 1000, type: e.type, m: e.m, vel: e.vel }); }
    });
    $('#rec', el).onclick = () => {
      recording = !recording;
      if (recording) { rec = []; t0 = 0; } else { store.set('lastRec', rec); }
      setRecUI();
    };
    $('#rplay', el).onclick = () => {
      timers.forEach(clearTimeout); timers = [];
      audio.init(); const base = audio.now() + 0.1;
      const ons = {};
      for (const e of rec) {
        if (e.type === 'on') ons[e.m] = e;
        else if (ons[e.m]) {
          const s = ons[e.m]; delete ons[e.m];
          audio.play(e.m, Math.max(0.05, e.t - s.t), base + s.t, s.vel);
          timers.push(at(base + s.t, () => kb.setDown(e.m, true)), at(base + e.t, () => kb.setDown(e.m, false)));
        }
      }
    };
    $('#rmid', el).onclick = () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(smf(rec)); a.download = 'rekaman-piano.mid'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('File MIDI diunduh');
    };
    // metronom
    const clock = new Clock(+$('#bpm', el).value);
    $('#met', el).onclick = () => {
      if (clock.running) { clock.stop(); $('#met', el).classList.remove('on'); return; }
      clock.bpm = +$('#bpm', el).value; clock.start((i, t) => audio.click(t, i % 4 === 0));
      $('#met', el).classList.add('on');
    };
    $('#bpm', el).onchange = e => { clock.bpm = Math.max(30, Math.min(240, +e.target.value || 90)); store.set('bpm', clock.bpm); };
    const okd = e => { if (e.code === 'KeyZ' || e.code === 'KeyX') setTimeout(upd, 0); };
    window.addEventListener('keydown', okd);
    return () => { off(); clock.stop(); kb.destroy(); timers.forEach(clearTimeout); window.removeEventListener('keydown', okd); };
  },
};
