import { esc, store, today } from '../util.js';
import { icon } from '../icons.js';
import { CHORDS } from '../theory.js';
import { practiceLog, streak, doneMap, setDone } from '../progress.js';

// Kurikulum: tingkat → pelajaran → [id, teks, link]
export const LEVELS = [
  { tier: 'Pemula', n: 1, title: 'Kenal keyboard & posisi tangan', items: [
    ['l1a', 'Postur: duduk tegak, siku sejajar tuts, jari melengkung seperti memegang bola', '#/teori/tuts'],
    ['l1b', 'Nomor jari: 1 = jempol … 5 = kelingking (kedua tangan)', '#/teori/tuts'],
    ['l1c', 'Temukan semua C: di kiri kelompok 2 tuts hitam', '#/keyboard?labels=c'],
    ['l1d', 'Nama tuts putih C D E F G A B & do re mi', '#/teori/tuts'],
    ['l1e', 'Lagu: Mary Had a Little Lamb — mode Tunggu, tangan kanan', '#/lagu/mary'],
    ['l1f', 'Metronom 60 bpm: tepuk & hitung 1-2-3-4', '#/latihan/metronom'],
  ] },
  { tier: 'Pemula', n: 2, title: 'Tangga nada C & triad pertama', items: [
    ['l2a', 'Ritme: not penuh, setengah, seperempat, seperdelapan', '#/teori/ritme'],
    ['l2b', 'Tangga nada C mayor tangan kanan (jempol menyeberang di F)', '#/latihan/tangga?root=C&scale=major&hands=R'],
    ['l2c', 'Tangga nada C mayor tangan kiri', '#/latihan/tangga?root=C&scale=major&hands=L'],
    ['l2d', 'Triad mayor: C, F, G — rumus 1–3–5', '#/chord?cat=triad&root=C&id=maj'],
    ['l2e', 'Triad minor: Am, Dm, Em', '#/chord?cat=triad&root=A&id=m'],
    ['l2f', 'Lagu: Ode to Joy & Twinkle (dua tangan)', '#/lagu/ode'],
    ['l2g', 'Baca not level 1 (kunci G, posisi C)', '#/latihan/baca?lvl=1'],
  ] },
  { tier: 'Pemula', n: 3, title: 'Inversi & iringan sederhana', items: [
    ['l3a', 'Interval: sekon, terts, kuart, kwint, oktaf', '#/teori/interval'],
    ['l3b', 'Inversi triad (posisi dasar, inversi 1, 2)', '#/teori/chord'],
    ['l3c', 'Progresi I–IV–V–I dengan inversi (voice leading)', '#/progresi/145'],
    ['l3d', 'Progresi pop I–V–vi–IV, pola Pop', '#/progresi/pop'],
    ['l3e', 'Tangga nada G, D, F mayor (2 oktaf)', '#/latihan/tangga?root=G&scale=major&oct=2'],
    ['l3f', 'Lagu: Saints, Jingle Bells, Happy Birthday', '#/lagu/saints'],
    ['l3g', 'Telinga: interval level Pemula', '#/latihan/telinga?mode=interval&lvl=1'],
    ['l3h', 'Drill chord: triad mayor & minor di 12 kunci', '#/latihan/drill?lvl=1'],
  ] },
  { tier: 'Menengah', n: 4, title: 'Chord septim & harmoni', items: [
    ['l4a', 'Chord septim: maj7, 7, m7, m7♭5, dim7', '#/chord?cat=sept'],
    ['l4b', 'Chord diatonik & fungsi (Tonika–Subdominan–Dominan)', '#/teori/diatonik'],
    ['l4c', 'Progresi ii–V–I mayor', '#/progresi/251'],
    ['l4d', 'Tangga nada minor natural, harmonik, melodik', '#/teori/tangga?scale=harm&root=A'],
    ['l4e', 'Lagu: Amazing Grace, Canon in D', '#/lagu/grace'],
    ['l4f', 'Baca not level 3 (kunci F)', '#/latihan/baca?lvl=3'],
    ['l4g', 'Telinga: kualitas triad (mayor/minor/dim/aug)', '#/latihan/telinga?mode=chord&lvl=1'],
  ] },
  { tier: 'Menengah', n: 5, title: 'Blues, arpeggio & teknik', items: [
    ['l5a', '12-bar blues + tangga nada blues untuk improvisasi', '#/progresi/blues'],
    ['l5b', 'Pola iringan: arpeggio, Alberti, ballad', '#/progresi/canon?style=alberti'],
    ['l5c', 'Hanon no. 1 di 72 → 96 bpm', '#/lagu/hanon'],
    ['l5d', 'Lagu: Minuet in G, Greensleeves', '#/lagu/minuet'],
    ['l5e', 'Drill chord septim (semua kunci)', '#/latihan/drill?lvl=3'],
    ['l5f', 'Telinga: semua interval', '#/latihan/telinga?mode=interval&lvl=3'],
  ] },
  { tier: 'Menengah', n: 6, title: 'Lingkaran kwint & semua kunci', items: [
    ['l6a', 'Lingkaran kwint: tanda kunci & relatif minor', '#/teori/kwint'],
    ['l6b', 'Semua 12 tangga nada mayor, 2 oktaf, 2 tangan', '#/latihan/tangga?root=Eb&scale=major&oct=2&hands=RL'],
    ['l6c', 'Turnaround I–vi–ii–V & iii–VI–ii–V', '#/progresi/turn'],
    ['l6d', 'Lagu: Für Elise (tema)', '#/lagu/elise'],
    ['l6e', 'Baca not level 4–5 (grand staff, kres/mol)', '#/latihan/baca?lvl=4'],
  ] },
  { tier: 'Mahir / Expert', n: 7, title: 'Jazz: extended chord & voicing', items: [
    ['l7a', 'Chord 9, 11, 13 & 6/9', '#/chord?cat=ext'],
    ['l7b', 'Shell voicing tangan kiri 1–3–7 / 1–7–3', '#/teori/voicing'],
    ['l7c', 'Rootless voicing A & B pada ii–V–I', '#/progresi/251?voicing=rootless'],
    ['l7d', 'ii–V–I di 12 kunci (aktifkan Putar kunci)', '#/progresi/251?voicing=rootless&rotate=1'],
    ['l7e', 'Mode: Dorian, Mixolydian, Lydian', '#/teori/tangga?scale=dorian&root=D'],
    ['l7f', 'Comping swing pola Charleston', '#/progresi/turn?style=swing&voicing=rootless'],
  ] },
  { tier: 'Mahir / Expert', n: 8, title: 'Altered, substitusi & reharmonisasi', items: [
    ['l8a', 'Chord altered: 7♭9, 7♯9, 13♭9, 7alt', '#/chord?cat=alt'],
    ['l8b', 'ii–V–i minor (iiø7 – V7♭9 – i)', '#/progresi/251m?voicing=rootless'],
    ['l8c', 'Substitusi tritonus & backdoor ii–V', '#/progresi/tritone?voicing=rootless'],
    ['l8d', 'Upper structure triad (UST)', '#/teori/voicing'],
    ['l8e', 'Tangga nada altered, diminished, whole tone', '#/teori/tangga?scale=alt&root=G'],
    ['l8f', 'Telinga: chord septim & jazz', '#/latihan/telinga?mode=chord&lvl=3'],
  ] },
  { tier: 'Mahir / Expert', n: 9, title: 'Repertoar jazz & improvisasi', items: [
    ['l9a', 'Jazz blues di F (walking bass + comping)', '#/progresi/jblues?style=swing&voicing=rootless'],
    ['l9b', 'Rhythm changes (A) di B♭', '#/progresi/rhythm?style=swing&voicing=rootless'],
    ['l9c', 'Voicing drop 2 & kuart "So What"', '#/progresi/sowhat?voicing=quartal'],
    ['l9d', 'Improvisasi: blues scale di atas 12-bar (tangan kanan bebas)', '#/keyboard?scale=blues&root=C'],
    ['l9e', 'Drill chord jazz extended & altered', '#/latihan/drill?lvl=5'],
    ['l9f', 'Hanon 120 bpm, tangga nada 2 oktaf semua kunci ≥ 100 bpm', '#/latihan/tangga?oct=2&bpm=100'],
  ] },
];

const ROUTINES = {
  15: [['Pemanasan: tangga nada / Hanon', 4, '#/latihan/tangga'], ['Drill chord', 3, '#/latihan/drill'], ['Lagu (mode Tunggu)', 6, '#/lagu'], ['Telinga', 2, '#/latihan/telinga']],
  30: [['Pemanasan: tangga nada + arpeggio', 6, '#/latihan/tangga'], ['Teknik: Hanon dengan metronom', 4, '#/lagu/hanon'], ['Drill chord & inversi', 5, '#/latihan/drill'], ['Progresi di 2–3 kunci', 5, '#/progresi'], ['Repertoar / lagu', 7, '#/lagu'], ['Baca not & telinga', 3, '#/latihan/baca']],
  45: [['Pemanasan: tangga nada 2 tangan', 7, '#/latihan/tangga'], ['Teknik: Hanon naik 4 bpm', 5, '#/lagu/hanon'], ['Harmoni: voicing & progresi 12 kunci', 10, '#/progresi'], ['Repertoar per tangan → dua tangan', 12, '#/lagu'], ['Improvisasi bebas di atas progresi', 6, '#/keyboard'], ['Telinga + baca not', 5, '#/latihan/telinga']],
};

export default {
  render(el) {
    const done = doneMap();
    const log = practiceLog();
    const all = LEVELS.flatMap(l => l.items);
    const pct = Math.round(all.filter(i => done[i[0]]).length / all.length * 100);
    const week = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return { d, v: log[today(d)] || 0 }; });
    const maxW = Math.max(10, ...week.map(w => w.v));
    const curLv = LEVELS.find(l => l.items.some(i => !done[i[0]])) || LEVELS[LEVELS.length - 1];
    const rmin = store.get('routine', 30);
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    el.innerHTML = `<div class="pdash">
    <section class="hero glass pd-hero">
      <div class="hero-t">
        <span class="kicker">Belajar piano · dari nol sampai jazz</span>
        <h1>Main piano, pahami chord, latih telinga — semuanya di satu tempat.</h1>
        <p>Kamus chord lengkap dari triad dasar sampai voicing jazz altered, keyboard interaktif dengan suara grand piano asli, progresi yang bisa diputar di 12 kunci, latihan baca not & telinga, serta lagu dengan mode "Tunggu" yang menunggu jari Anda.</p>
        <div class="row gap">
          <a class="btn pri" href="#/keyboard">${icon('keys')} Coba keyboard</a>
          <a class="btn" href="#/chord">${icon('chord')} Kamus chord</a>
          <a class="btn" href="#/lagu">${icon('music')} Belajar lagu</a>
        </div>
        <p class="hint">Mainkan dengan mouse/sentuh, keyboard komputer (A W S E D F T G … · Z/X ganti oktaf · Spasi = sustain), atau colok keyboard MIDI.</p>
      </div>
      <div class="hero-s">
        <div class="stat"><b>${(log[today()] || 0).toFixed(log[today()] % 1 ? 1 : 0)}</b><span>menit latihan hari ini</span></div>
        <div class="stat"><b>${streak()}</b><span>hari berturut-turut</span></div>
        <div class="stat"><b>${pct}%</b><span>kurikulum selesai</span></div>
        <div class="week">${week.map(w => `<div title="${w.v.toFixed(1)} menit"><i style="height:${Math.max(3, w.v / maxW * 100)}%"></i><span>${dayNames[w.d.getDay()]}</span></div>`).join('')}</div>
      </div>
    </section>

      <div class="card glass pd-routine">
        <div class="card-h"><h2>Rutinitas latihan harian</h2>
          <div class="seg" id="rseg">${[15, 30, 45].map(m => `<button data-m="${m}" class="${m === rmin ? 'on' : ''}">${m} mnt</button>`).join('')}</div></div>
        <ol class="routine" id="routine"></ol>
        <p class="hint">Tip: latihan pendek tiap hari jauh lebih efektif daripada lama seminggu sekali. Waktu latihan dihitung otomatis saat Anda memainkan nada.</p>
      </div>
      <div class="card glass pd-next">
        <div class="card-h"><h2>Lanjutkan: Level ${curLv.n}</h2><span class="badge">${curLv.tier}</span></div>
        <p class="lead">${esc(curLv.title)}</p>
        <ul class="todo">${curLv.items.filter(i => !done[i[0]]).slice(0, 4).map(i => `<li><a href="${i[2]}">${esc(i[1])}</a></li>`).join('')}</ul>
        <div class="tips">
          <h3>Prinsip latihan</h3>
          <ul>
            <li><b>Pelan dulu, benar dulu.</b> Mulai di tempo yang tanpa salah, naikkan 4–5 bpm.</li>
            <li><b>Per tangan → dua tangan.</b> Kuasai kanan & kiri terpisah sebelum digabung.</li>
            <li><b>Potong kecil.</b> Ulangi 2–4 birama sulit, bukan seluruh lagu.</li>
            <li><b>12 kunci.</b> Chord & progresi baru → mainkan di semua kunci.</li>
          </ul>
        </div>
      </div>

    <section class="card glass pd-map">
      <div class="card-h"><h2>Peta belajar · 9 level</h2><span class="muted">Centang yang sudah dikuasai — tersimpan di perangkat ini</span></div>
      <div class="levels">${['Pemula', 'Menengah', 'Mahir / Expert'].map(t => `
        <div class="tier"><h3 class="tier-h t-${t[0]}">${t}</h3>
        ${LEVELS.filter(l => l.tier === t).map(l => {
          const n = l.items.filter(i => done[i[0]]).length;
          return `<details class="lv"><summary><span class="lvn">${l.n}</span><span class="lvt">${esc(l.title)}</span><span class="lvp">${n}/${l.items.length}</span><i class="bar"><b style="width:${n / l.items.length * 100}%"></b></i></summary>
            <ul>${l.items.map(i => `<li><label><input type="checkbox" data-id="${i[0]}" ${done[i[0]] ? 'checked' : ''}><span>${esc(i[1])}</span></label><a href="${i[2]}" class="go">Buka →</a></li>`).join('')}</ul></details>`;
        }).join('')}</div>`).join('')}
      </div>
    </section>

    <section class="grid3 pd-feat">
      <a class="feat glass" href="#/chord">${icon('chord')}<b>Kamus chord</b><span>${CHORDS.length} jenis chord × 12 kunci, rumus, ejaan nada, inversi & voicing jazz.</span></a>
      <a class="feat glass" href="#/progresi">${icon('prog')}<b>Progresi & iringan</b><span>Pop, blues, ii–V–I, tritone sub, rhythm changes — 7 pola iringan.</span></a>
      <a class="feat glass" href="#/latihan/telinga">${icon('ear')}<b>Latihan telinga</b><span>Tebak interval & kualitas chord dari suara.</span></a>
      <a class="feat glass" href="#/latihan/baca">${icon('eye')}<b>Baca not balok</b><span>Kunci G, F & grand staff, 5 tingkat, mode waktu 60 detik.</span></a>
      <a class="feat glass" href="#/latihan/tangga">${icon('target')}<b>Tangga nada</b><span>Penjarian standar, mode tunggu & metronom.</span></a>
      <a class="feat glass" href="#/lagu">${icon('music')}<b>Lagu (falling notes)</b><span>12 lagu domain publik: dengar, tunggu, atau main dengan skor.</span></a>
    </section>
    <footer class="foot">Suara grand piano: Salamander Grand Piano (Alexander Holm, CC-BY 3.0) · Semua lagu domain publik · Amatu Piano</footer></div>`;

    const routine = () => {
      const m = store.get('routine', 30);
      el.querySelector('#routine').innerHTML = ROUTINES[m].map(([t, mn, href]) => `<li><span class="mn">${mn}′</span><a href="${href}">${t}</a></li>`).join('');
    };
    routine();
    el.querySelector('#rseg').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      store.set('routine', +b.dataset.m);
      el.querySelectorAll('#rseg button').forEach(x => x.classList.toggle('on', x === b)); routine();
    };
    el.querySelectorAll('.levels input[type=checkbox]').forEach(cb => cb.onchange = () => {
      setDone(cb.dataset.id, cb.checked);
      const lv = cb.closest('.lv'); const all = lv.querySelectorAll('input'); const n = [...all].filter(x => x.checked).length;
      lv.querySelector('.lvp').textContent = `${n}/${all.length}`; lv.querySelector('.bar b').style.width = n / all.length * 100 + '%';
    });
  },
};
