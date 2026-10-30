import { $, $$, store, today, parseQuery, toast, options } from './util.js';
import { audio } from './audio.js';
import { input, connectMIDI, midi } from './piano.js';
import './progress.js';
import home from './views/home.js';
import play from './views/play.js';
import chords from './views/chords.js';
import theory from './views/theory.js';
import prog from './views/prog.js';
import practice from './views/practice.js';
import songs from './views/songs.js';
import { icon } from './icons.js';

const ROUTES = {
  '': { v: home, t: 'Beranda', s: 'Beranda', i: 'home' },
  keyboard: { v: play, t: 'Keyboard', s: 'Main', i: 'keys' },
  chord: { v: chords, t: 'Kamus Chord', s: 'Chord', i: 'chord' },
  teori: { v: theory, t: 'Teori', s: 'Teori', i: 'book' },
  progresi: { v: prog, t: 'Progresi', s: 'Progresi', i: 'prog' },
  latihan: { v: practice, t: 'Latihan', s: 'Latihan', i: 'target' },
  lagu: { v: songs, t: 'Lagu', s: 'Lagu', i: 'music' },
};

// ---------- tema ----------
const applyTheme = t => { document.documentElement.dataset.theme = t; store.set('theme', t); $('#themeBtn').innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); };

// ---------- shell ----------
function shell() {
  const nav = short => Object.entries(ROUTES).map(([k, r]) => `<a href="#/${k}" data-r="${k}">${icon(r.i)}<span>${short ? r.s : r.t}</span></a>`).join('');
  document.body.insertAdjacentHTML('afterbegin', `
  <div class="bg"><i></i><i></i><i></i></div>
  <header class="top glass">
    <a class="brand" href="#/"><span class="logo">${icon('keys')}</span><b>Amatu <em>Piano</em></b></a>
    <nav class="nav" id="nav">${nav(false)}</nav>
    <div class="tools">
      <span class="snd" id="snd" title="Status sampel piano"></span>
      <select id="inst" title="Instrumen">${options([['piano', 'Grand Piano'], ['epiano', 'Electric Piano'], ['organ', 'Organ'], ['strings', 'Strings']], audio.inst)}</select>
      <label class="volw" title="Volume">${icon('vol')}<input type="range" id="vol" min="0" max="1.2" step="0.01" value="${audio.volume}"></label>
      <button class="ib" id="pedalBtn" title="Pedal sustain (tahan Spasi)">${icon('pedal')}</button>
      <button class="ib" id="midiBtn" title="Hubungkan keyboard MIDI (USB/Bluetooth)">${icon('midi')}</button>
      <button class="ib" id="themeBtn" title="Tema terang/gelap"></button>
    </div>
  </header>
  <main id="view"></main>
  <nav class="bnav glass" id="bnav">${nav(true)}</nav>`);

  applyTheme(store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('#themeBtn').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  $('#inst').onchange = e => { audio.setInst(e.target.value); audio.init(); audio.chord([60, 64, 67], 1.2); };
  $('#vol').oninput = e => audio.setVolume(+e.target.value);
  const pedal = $('#pedalBtn');
  pedal.onclick = () => { audio.init(); audio.setSustain(!audio.sustain); };
  audio.onStatus(() => {
    pedal.classList.toggle('on', audio.sustain);
    const s = $('#snd');
    if (!audio.ctx) { s.textContent = ''; return; }
    if (audio.loaded < audio.total) { s.textContent = `Memuat suara ${Math.round(audio.loaded / audio.total * 100)}%`; s.className = 'snd ld'; }
    else { s.textContent = 'Suara siap'; s.className = 'snd ok'; setTimeout(() => s.classList.add('hide'), 2500); }
  });
  $('#midiBtn').onclick = async () => {
    audio.init();
    await connectMIDI();
  };
  midi.listeners.add(() => {
    const b = $('#midiBtn');
    b.classList.toggle('on', midi.status === 'on');
    const msg = { on: `MIDI terhubung: ${midi.name}`, nodev: 'MIDI aktif — belum ada perangkat. Colokkan keyboard.', denied: 'Akses MIDI ditolak browser.', unsupported: 'Browser ini belum mendukung Web MIDI (pakai Chrome/Edge).' }[midi.status];
    if (msg) toast(msg, 3000);
  });
  // aktifkan audio di interaksi pertama (kebijakan autoplay)
  const unlock = () => { audio.init(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
}

// ---------- router ----------
let cleanup = null;
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, q] = h.split('?');
  const [name, ...rest] = path.split('/');
  const r = ROUTES[name] || ROUTES[''];
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  audio.stopAll(); input.releaseAll();
  const el = $('#view');
  el.innerHTML = ''; el.className = 'view v-' + (name || 'home');
  $$('[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === (ROUTES[name] ? name : '')));
  document.title = (r.t === 'Beranda' ? '' : r.t + ' · ') + 'Amatu Piano — belajar piano dari dasar sampai jazz';
  const params = parseQuery(q); params._ = rest;
  cleanup = r.v.render(el, params) || null;
  window.scrollTo(0, 0);
}

shell();
window.addEventListener('hashchange', route);
route();
