import { $, $$, esc, options } from '../util.js';
import { icon } from '../icons.js';
import { audio } from '../audio.js';
import { Piano } from '../piano.js';
import { staffSVG } from '../staff.js';
import {
  ROOTS, nice, pcOf, IV, INTERVALS, SCALES, SCALE, scaleNotes, scaleSpell, scaleFingers, CHORD, chordName, chordSpell, voice,
  DIATONIC, spell, CIRCLE, midiName, ivLabel, voiceDist,
} from '../theory.js';

const TABS = [['tuts', 'Tuts & nama nada'], ['ritme', 'Ritme & notasi'], ['interval', 'Interval'], ['tangga', 'Tangga nada'], ['chord', 'Membangun chord'], ['diatonik', 'Chord diatonik'], ['kwint', 'Lingkaran kwint'], ['voicing', 'Voicing jazz']];

export default {
  render(el, q) {
    const tab = TABS.some(t => t[0] === q._[0]) ? q._[0] : 'tuts';
    el.innerHTML = `
    <div class="page-h"><h1>Teori Dasar → Lanjut</h1><p>Semua konsep bisa didengar dan dilihat langsung di keyboard. Klik tombol ▶ di setiap contoh.</p></div>
    <div class="tabs">${TABS.map(([k, t]) => `<a href="#/teori/${k}" class="${k === tab ? 'on' : ''}">${t}</a>`).join('')}</div>
    <div id="tbody"></div>`;
    const body = $('#tbody', el);
    return VIEWS[tab](body, q);
  },
};

const card = (h, inner, cls = '') => `<section class="card glass ${cls}"><h2>${h}</h2>${inner}</section>`;
const pbtn = (data, label = '') => `<button class="ib sm" data-p='${JSON.stringify(data)}' title="Dengar">${icon('play')}</button>${label}`;
function bindPlays(root, kb) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const d = JSON.parse(b.dataset.p);
    if (d.seq) { audio.arp(d.seq, d.step || 0.35, null, 0.7, d.hold ?? 0.3); }
    else audio.chord(d.n, d.dur || 1.6, null, 0.72, d.strum || 0.01);
    if (kb) kb.markNotes(d.seq || d.n, 'tone', null, d.root ?? null);
  });
}

const VIEWS = {
  tuts(el) {
    el.innerHTML = card('Pola tuts piano', `
      <p>Keyboard terdiri dari pola <b>12 tuts</b> yang berulang: 7 tuts putih dan 5 tuts hitam. Tuts hitam berkelompok <b>2</b> dan <b>3</b>. Nada <b>C selalu berada tepat di kiri kelompok 2 tuts hitam</b> — gunakan ini sebagai patokan. C di tengah piano disebut <b>C4 (middle C)</b>.</p>
      <div class="toolbar"><div class="seg" id="lb"><button data-l="all" class="on">Nama huruf</button><button data-l="solf">Do–Re–Mi</button><button data-l="c">Hanya C</button></div></div>
      <div id="kb" class="kb-mid"></div>
      <table class="tbl compact"><thead><tr><th>Huruf</th><th>C</th><th>D</th><th>E</th><th>F</th><th>G</th><th>A</th><th>B</th></tr></thead>
      <tbody><tr><th>Solmisasi</th><td>do</td><td>re</td><td>mi</td><td>fa</td><td>sol</td><td>la</td><td>si</td></tr><tr><th>Angka</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td></tr></tbody></table>
      <p><b>Tuts hitam</b> diberi nama dengan <b>♯ (kres / naik ½)</b> atau <b>♭ (mol / turun ½)</b>. Tuts hitam di antara C dan D bisa disebut C♯ atau D♭ — satu bunyi, dua nama (<i>enharmonik</i>). Jarak dari satu tuts ke tuts tetangga terdekat (termasuk hitam) = <b>½ langkah (semitone)</b>. Perhatikan E–F dan B–C tidak punya tuts hitam di antaranya, jadi jaraknya hanya ½ langkah.</p>`) +
      `<section class="grid2">` + card('Nomor jari', `
        <svg viewBox="0 0 360 170" class="hands">${hand(20, false)}${hand(200, true)}<text x="90" y="165" text-anchor="middle">Tangan kiri</text><text x="270" y="165" text-anchor="middle">Tangan kanan</text></svg>
        <p>Jempol = <b>1</b>, telunjuk = <b>2</b>, tengah = <b>3</b>, manis = <b>4</b>, kelingking = <b>5</b> — sama untuk kedua tangan. Angka kecil di atas not balok menunjukkan jari yang dipakai.</p>`) +
      card('Postur & posisi tangan', `<ul class="list">
        <li>Duduk di <b>tengah</b> piano (sejajar middle C), setengah bagian depan kursi.</li>
        <li>Siku sedikit di depan tubuh, <b>sejajar tinggi tuts</b>; bahu rileks.</li>
        <li>Jari <b>melengkung</b> seperti memegang bola; tekan dengan ujung jari, bukan jari datar.</li>
        <li>Pergelangan lurus — tidak menukik ke bawah atau terangkat tinggi.</li>
        <li>Posisi C: jempol kanan di C4, jari 1-2-3-4-5 di C-D-E-F-G. Jempol kiri di G3, kelingking di C3.</li>
        <li>Jika tegang atau sakit: berhenti, goyangkan tangan, pelankan tempo.</li></ul>`) + `</section>`;
    const kb = new Piano($('#kb', el), { from: 48, to: 84, labels: 'all', height: 150, minW: 26 });
    $('#lb', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#lb button', el).forEach(x => x.classList.toggle('on', x === b)); kb.setLabels(b.dataset.l); };
    return () => kb.destroy();
  },

  ritme(el) {
    const rows = [['Not penuh (semibreve)', '𝅝', 4, [4]], ['Not setengah (minim)', '𝅗𝅥', 2, [2, 2]], ['Not seperempat (crotchet)', '♩', 1, [1, 1, 1, 1]], ['Not seperdelapan (quaver)', '♪', 0.5, Array(8).fill(0.5)], ['Not seperenambelas', '𝅘𝅥𝅯', 0.25, Array(16).fill(0.25)], ['Not bertitik (♩.)', '♩.', 1.5, [1.5, 0.5, 1.5, 0.5]], ['Triol seperdelapan', '♪♪♪³', 1 / 3, Array(12).fill(1 / 3)], ['Sinkopasi', '♪♩♪', null, [0.5, 1, 0.5, 0.5, 1, 0.5]]];
    el.innerHTML = card('Nilai not', `<p>Panjang not dihitung dalam <b>ketukan</b>. Di birama 4/4, satu ketukan = not seperempat. Klik ▶ untuk mendengar pola ritmenya di atas metronom.</p>
      <table class="tbl"><thead><tr><th>Not</th><th>Simbol</th><th>Ketukan (4/4)</th><th>Dengar</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${r[0]}</td><td class="sym music">${r[1]}</td><td>${r[2] == null ? 'tekanan di luar ketukan' : r[2] === 1 / 3 ? '⅓ (3 dalam 1 ketukan)' : r[2]}</td><td><button class="ib sm" data-r="${i}">${icon('play')}</button></td></tr>`).join('')}
      </tbody></table><p class="muted">Istirahat (rest) punya nilai yang sama dengan not, tapi tidak dibunyikan.</p>`) +
      `<section class="grid2">` + card('Tanda birama', `<ul class="list">
        <li><b>4/4</b> — 4 ketukan per birama (pop, rock, ballad). Hitungan: <i>1</i> 2 3 4.</li>
        <li><b>3/4</b> — 3 ketukan (waltz, minuet, Happy Birthday). <i>1</i> 2 3.</li>
        <li><b>2/4</b> — 2 ketukan (mars, polka).</li>
        <li><b>6/8</b> — 6 seperdelapan dalam 2 kelompok (<i>1</i> 2 3 <i>4</i> 5 6), terasa mengayun.</li>
        <li><b>Swing</b> — dua ♪ dimainkan panjang-pendek (seperti triol 2+1); dasar jazz.</li></ul>`) +
      card('Tempo & dinamika', `<table class="tbl compact"><tbody>
        <tr><th>Largo</th><td>40–60 bpm · sangat lambat</td></tr><tr><th>Adagio</th><td>66–76 · lambat</td></tr><tr><th>Andante</th><td>76–108 · berjalan</td></tr><tr><th>Moderato</th><td>108–120 · sedang</td></tr><tr><th>Allegro</th><td>120–156 · cepat</td></tr><tr><th>Presto</th><td>168–200 · sangat cepat</td></tr></tbody></table>
        <p><b>pp</b> sangat lembut · <b>p</b> lembut · <b>mp</b> agak lembut · <b>mf</b> agak keras · <b>f</b> keras · <b>ff</b> sangat keras. <b>Crescendo</b> = makin keras, <b>diminuendo</b> = makin lembut. <b>Legato</b> = bersambung, <b>staccato</b> = pendek terputus.</p>`) + `</section>` +
      card('Paranada (not balok)', `<div class="grid2"><div>${staffSVG({ clef: 'treble', width: 320, notes: [[4, 0], [4, 2], [4, 4], [4, 5], [4, 7], [4, 9], [4, 11], [5, 0]].map(([o, pc], i) => ({ oct: o, L: [0, 2, 4, 5, 7, 9, 11].indexOf(pc), acc: 0, label: 'CDEFGABC'[i] })) })}<p class="muted">Kunci G (treble): untuk tangan kanan. Garis dari bawah: E G B D F; spasi: F A C E.</p></div>
      <div>${staffSVG({ clef: 'bass', width: 320, notes: [[2, 0], [2, 2], [2, 4], [2, 5], [2, 7], [2, 9], [2, 11], [3, 0]].map(([o, pc], i) => ({ oct: o + 1, L: [0, 2, 4, 5, 7, 9, 11].indexOf(pc), acc: 0, label: 'CDEFGABC'[i] })) })}<p class="muted">Kunci F (bass): untuk tangan kiri. Garis dari bawah: G B D F A; spasi: A C E G.</p></div></div>`);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const pat = rows[+b.dataset.r][3]; audio.init();
      const t0 = audio.now() + 0.1, beat = 0.6;
      for (let i = 0; i < 4; i++) audio.click(t0 + i * beat, i === 0, 0.7);
      let t = 0; for (const d of pat) { audio.play(72, d * beat * 0.9, t0 + t * beat, 0.75); t += d; }
    });
  },

  interval(el) {
    let root = 'C';
    el.innerHTML = card('Interval — jarak antar dua nada', `<p>Interval diukur dalam <b>semitone</b> (½ langkah). Mengenali interval adalah kunci membaca chord dan bermain dengan telinga. Gunakan lagu referensi untuk mengingat bunyinya.</p>
      <div class="toolbar"><label>Dari nada <select id="ir">${options(ROOTS.map(r => [r, nice(r)]), root)}</select></label></div>
      <div id="kb" class="kb-mid"></div><div id="itbl"></div>`) +
      card('Konsonan & disonan', `<p><b>Konsonan</b> (stabil): unison, oktaf, kwint, kuart, terts, sekst. <b>Disonan</b> (tegang): sekon, septim, tritonus. Musik bergerak dari ketegangan ke resolusi — misalnya tritonus B–F pada G7 yang <i>resolve</i> ke C–E pada chord C.</p>
      <p><b>Inversi interval:</b> balik interval → angka saling melengkapi jadi 9 (terts ↔ sekst, sekon ↔ septim), besar ↔ kecil. Contoh: C–E (terts besar) dibalik = E–C (sekst kecil).</p>`);
    const kb = new Piano($('#kb', el), { from: 48, to: 84, labels: 'c', height: 130, minW: 22, caps: false });
    const IVN = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7', '8'];
    const draw = () => {
      const r = 60 + pcOf(root) - (pcOf(root) > 6 ? 12 : 0);
      $('#itbl', el).innerHTML = `<table class="tbl"><thead><tr><th>Semitone</th><th>Interval</th><th>Contoh</th><th>Lagu referensi</th><th>Melodis</th><th>Harmonis</th></tr></thead><tbody>${INTERVALS.map(iv => `<tr><td class="mono">${iv.st}</td><td><b>${iv.short}</b> · ${iv.name}</td><td>${nice(root)} – ${iv.st === 12 ? nice(root) : spell(root, IVN[iv.st] === '8' ? '1' : IVN[iv.st])}</td><td class="muted">${esc(iv.song)}</td><td>${pbtn({ seq: [r, r + iv.st], step: 0.5, hold: 0.5 })}</td><td>${pbtn({ n: [r, r + iv.st] })}</td></tr>`).join('')}</tbody></table>`;
    };
    $('#ir', el).onchange = e => { root = e.target.value; draw(); };
    draw(); bindPlays(el, kb);
    return () => kb.destroy();
  },

  tangga(el, q) {
    let root = q.root || 'C', sid = q.scale || 'major';
    el.innerHTML = card('Tangga nada', `<div class="toolbar">
        <label>Kunci <select id="sr">${options(ROOTS.map(r => [r, nice(r)]), root)}</select></label>
        <label>Tangga nada <select id="ss">${options(SCALES.map(s => [s.id, s.name]), sid)}</select></label>
        <button class="btn pri" id="pu">${icon('play')} Naik–turun</button>
        <a class="btn ghost" id="pr">Latih dengan penjarian →</a></div>
      <div class="big" id="sname"></div><div class="tones" id="stones"></div><p class="info" id="sinfo"></p>
      <div id="kb" class="kb-mid"></div><p class="hint" id="sfing"></p>`) +
      card('Semua tangga nada', `<table class="tbl"><thead><tr><th>Nama</th><th>Rumus</th><th>Pola langkah</th><th>Tingkat</th><th>Kegunaan</th></tr></thead><tbody>${SCALES.map(s => `<tr data-s="${s.id}" class="clk"><td><b>${esc(s.name)}</b></td><td class="mono">${s.iv.map(ivLabel).join(' ')}</td><td class="mono">${steps(s)}</td><td><span class="badge">${s.lvl}</span></td><td class="muted">${esc(s.info)}</td></tr>`).join('')}</tbody></table>`);
    const kb = new Piano($('#kb', el), { from: 48, to: 84, labels: 'c', height: 140, minW: 22, caps: false });
    const draw = () => {
      const sc = SCALE[sid], ns = scaleNotes(root, sid, 1), sp = scaleSpell(root, sid);
      $('#sname', el).textContent = `${nice(root)} ${sc.name}`;
      $('#stones', el).innerHTML = [...sc.iv, '8'].map((iv, i) => `<div class="tone ${i === 0 || iv === '8' ? 'r' : ''}"><b>${sp[i % sp.length]}</b><span>${iv === '8' ? '8' : ivLabel(iv)}</span></div>`).join('');
      $('#sinfo', el).textContent = sc.info;
      const fR = scaleFingers(root, sid, 'RH', ns.length);
      kb.mark(new Map(ns.map((m, i) => [m, { cls: i === 0 || i === ns.length - 1 ? 'root' : 'tone', finger: fR ? fR[i] : '' }])));
      $('#sfing', el).innerHTML = fR ? `Angka di tuts = penjarian tangan kanan. Tangan kiri: <b>${scaleFingers(root, sid, 'LH', ns.length).join(' ')}</b>` : 'Penjarian untuk tangan nada ini bervariasi — prinsipnya: jempol menyeberang setelah 3 atau 4 jari, hindari jempol di tuts hitam.';
      $('#pr', el).href = `#/latihan/tangga?root=${encodeURIComponent(root)}&scale=${sid}`;
      $$('tr[data-s]', el).forEach(r => r.classList.toggle('sel', r.dataset.s === sid));
    };
    $('#sr', el).onchange = e => { root = e.target.value; draw(); };
    $('#ss', el).onchange = e => { sid = e.target.value; draw(); };
    $('#pu', el).onclick = () => { const ns = scaleNotes(root, sid, 1); audio.arp([...ns, ...ns.slice(0, -1).reverse()], 0.24, null, 0.7, 0.2); };
    el.addEventListener('click', e => { const tr = e.target.closest('tr[data-s]'); if (!tr) return; sid = tr.dataset.s; $('#ss', el).value = sid; draw(); el.scrollIntoView({ behavior: 'smooth' }); });
    draw();
    return () => kb.destroy();
  },

  chord(el) {
    const ex = (root, id, vid = 'root') => ({ n: voice(pcOf(root), CHORD[id], vid), root: pcOf(root) });
    const row = (label, root, id, vid) => `<div class="exrow">${pbtn(ex(root, id, vid))}<b>${label || chordName(root, CHORD[id])}</b><span>${vid && vid !== 'root' ? '' : chordSpell(root, CHORD[id]).join(' – ')}</span></div>`;
    el.innerHTML = `<div id="kb" class="kb-mid sticky-kb"></div>` +
      `<section class="grid2">` +
      card('1 · Triad = tumpukan terts', `<p>Chord dibangun dengan menumpuk nada berjarak <b>terts</b> (lompati satu nada): C–E–G. Ada dua jenis terts: <b>besar (4 st)</b> dan <b>kecil (3 st)</b>. Kombinasinya menghasilkan 4 triad:</p>
        ${row('C mayor = M3 + m3', 'C', 'maj')}${row('C minor = m3 + M3', 'C', 'm')}${row('C diminished = m3 + m3', 'C', 'dim')}${row('C augmented = M3 + M3', 'C', 'aug')}
        <p class="muted">Variasi tanpa terts: ${pbtn(ex('C', 'sus2'))} Csus2 &nbsp; ${pbtn(ex('C', 'sus4'))} Csus4</p>`) +
      card('2 · Chord septim (4 nada)', `<p>Tambahkan terts lagi di atas triad → nada ke-7. Lima jenis septim yang wajib dikuasai:</p>
        ${row('Cmaj7 — mayor + 7 besar', 'C', 'maj7')}${row('C7 — mayor + 7 kecil (dominan)', 'C', '7')}${row('Cm7 — minor + 7 kecil', 'C', 'm7')}${row('Cm7♭5 — dim + 7 kecil', 'C', 'm7b5')}${row('Cdim7 — dim + 7 diminished', 'C', 'dim7')}`) +
      card('3 · Extension: 9, 11, 13', `<p>Terus menumpuk terts: 9 (= 2 oktaf atas), 11 (= 4), 13 (= 6). Di chord mayor/dominan, <b>11 natural bentrok</b> dengan terts → biasanya diganti <b>♯11</b> atau dihilangkan. Pada chord besar, nada <b>5</b> (bahkan akar) boleh dibuang.</p>
        ${row('', 'C', 'maj9')}${row('', 'C', '9')}${row('', 'C', 'm9')}${row('', 'C', '13')}${row('', 'C', '69')}`) +
      card('4 · Alterasi (tensi berubah)', `<p>Pada chord dominan, tensi boleh dinaikkan/diturunkan: <b>♭9 ♯9 ♯11 ♭13</b>. Ini menambah ketegangan sebelum resolusi ke chord I.</p>
        ${row('', 'G', '7b9')}${row('', 'G', '7s9')}${row('', 'G', '13b9')}${row('', 'G', 'alt')}
        <p class="muted">Dengar resolusinya: ${pbtn({ seq: [...voice(7, CHORD['alt'], 'rootB')], step: 0.02, hold: 1 })} G7alt lalu ${pbtn(ex('C', 'maj9', 'rootA'))} Cmaj9</p>`) +
      card('5 · Inversi & slash chord', `<p>Nada yang sama, urutan berbeda. <b>Posisi dasar</b>: akar di bawah. <b>Inversi 1</b>: terts di bawah (C/E). <b>Inversi 2</b>: kwint di bawah (C/G). Chord septim punya <b>inversi 3</b> (septim di bawah).</p>
        ${row('C (posisi dasar)', 'C', 'maj', 'root')}${row('C/E (inversi 1)', 'C', 'maj', 'inv1')}${row('C/G (inversi 2)', 'C', 'maj', 'inv2')}${row('Cmaj7/B (inversi 3)', 'C', 'maj7', 'inv3')}`) +
      card('6 · Voice leading', `<p>Pindah chord dengan gerakan jari <b>sesedikit mungkin</b>. Bandingkan I–IV–V–I tanpa dan dengan inversi:</p>
        <div class="exrow">${pbtn({ seq: [], n: [] })}</div>`) + `</section>`;
    // ganti contoh voice leading dengan urutan chord
    const vl = el.querySelectorAll('.exrow'); const last = vl[vl.length - 1];
    last.innerHTML = `<button class="btn" id="vl1">${icon('play')} Lompat: C – F – G – C</button><button class="btn pri" id="vl2">${icon('play')} Halus: C – F/C – G/B – C</button>`;
    const kb = new Piano($('#kb', el), { from: 36, to: 88, labels: 'c', height: 120, minW: 18, caps: false });
    bindPlays(el, kb);
    const seq = chs => { audio.init(); const t = audio.now() + 0.05; chs.forEach((c, i) => { audio.chord(c, 0.9, t + i * 0.9, 0.7); setTimeout(() => kb.markNotes(c), i * 900); }); };
    $('#vl1', el).onclick = () => seq([[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]]);
    $('#vl2', el).onclick = () => seq([[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]]);
    return () => kb.destroy();
  },

  diatonik(el) {
    let key = 'C', mode = 'major', sev = false;
    el.innerHTML = card('Chord diatonik', `<p>Setiap nada tangga nada bisa menjadi akar chord dengan hanya memakai nada dari tangga nada itu. Hasilnya 7 chord — angka Romawi menunjukkan posisinya (huruf besar = mayor, kecil = minor). Inilah "keluarga chord" sebuah lagu.</p>
      <div class="toolbar"><label>Kunci <select id="dk">${options(ROOTS.map(r => [r, nice(r)]), key)}</select></label>
      <div class="seg" id="dm"><button data-m="major" class="on">Mayor</button><button data-m="minor">Minor natural</button></div>
      <div class="seg" id="ds"><button data-s="0" class="on">Triad</button><button data-s="1">Septim</button></div>
      <button class="btn" id="cad">${icon('play')} Kadens I–IV–V–I</button></div>
      <div id="kb" class="kb-mid"></div><div id="dt"></div>`) +
      card('Fungsi harmoni', `<ul class="list"><li><b>Tonika (I, iii, vi)</b> — rumah, stabil. Lagu biasanya mulai & selesai di sini.</li>
        <li><b>Subdominan (ii, IV)</b> — bergerak menjauh dari rumah, menyiapkan dominan.</li>
        <li><b>Dominan (V, vii°)</b> — tegang, ingin kembali ke tonika. V7 → I adalah resolusi terkuat.</li>
        <li>Pola umum: <b>T → SD → D → T</b>, misalnya I – IV – V – I atau I – ii – V – I.</li>
        <li>Musisi sering memakai <b>angka Nashville</b>: 1 – 4 – 5 – 6m sehingga lagu mudah dipindah kunci.</li></ul>`);
    const kb = new Piano($('#kb', el), { from: 48, to: 84, labels: 'c', height: 130, minW: 22, caps: false });
    const draw = () => {
      const D = DIATONIC[mode]; const kpc = pcOf(key);
      $('#dt', el).innerHTML = `<table class="tbl"><thead><tr><th>Derajat</th><th>Romawi</th><th>Chord</th><th>Nada</th><th>Fungsi</th><th></th></tr></thead><tbody>${D.iv.map((iv, i) => {
        const r = spell(key, iv), id = sev ? D.sev[i] : D.tri[i], c = CHORD[id];
        const ns = voice((kpc + IV[iv]) % 12, c, 'root');
        return `<tr><td class="mono">${i + 1}</td><td><b>${sev ? D.rn7[i] : D.rn[i]}</b></td><td class="sym">${chordName(r, c)}</td><td>${chordSpell(r, c).join(' ')}</td><td class="muted">${D.fn[i]}</td><td>${pbtn({ n: ns, root: (kpc + IV[iv]) % 12 })}</td></tr>`;
      }).join('')}</tbody></table>`;
    };
    $('#dk', el).onchange = e => { key = e.target.value; draw(); };
    $('#dm', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; $$('#dm button', el).forEach(x => x.classList.toggle('on', x === b)); draw(); };
    $('#ds', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; sev = b.dataset.s === '1'; $$('#ds button', el).forEach(x => x.classList.toggle('on', x === b)); draw(); };
    $('#cad', el).onclick = () => {
      const D = DIATONIC[mode], kpc = pcOf(key); const degs = [0, 3, 4, 0];
      let prev = null; audio.init(); const t = audio.now() + 0.05;
      degs.forEach((d, i) => {
        const c = CHORD[mode === 'minor' && d === 4 ? '7' : (sev ? D.sev[d] : D.tri[d])];
        const pc = (kpc + IV[D.iv[d]]) % 12;
        const opts = ['root', 'inv1', 'inv2', 'inv3'].filter(v => v !== 'inv3' || c.iv.length > 3).map(v => voice(pc, c, v));
        const ns = prev ? opts.sort((a, b) => voiceDist(a, prev) - voiceDist(b, prev))[0] : opts[0];
        prev = ns; audio.chord([pc + 36, ...ns], 0.95, t + i, 0.7); setTimeout(() => kb.markNotes(ns, 'tone', null, pc), i * 1000);
      });
    };
    draw(); bindPlays(el, kb);
    return () => kb.destroy();
  },

  kwint(el) {
    let sel = 0;
    const R = 150, cx = 170, cy = 170;
    const seg = (i, r0, r1) => { const a0 = (i - 0.5) * Math.PI / 6 - Math.PI / 2, a1 = (i + 0.5) * Math.PI / 6 - Math.PI / 2; const p = (r, a) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; return `M${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)}Z`; };
    const lbl = (i, r) => { const a = i * Math.PI / 6 - Math.PI / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a) + 5]; };
    el.innerHTML = card('Lingkaran kwint', `<div class="circle-wrap"><svg viewBox="0 0 340 340" class="circle" id="circ">${CIRCLE.map((k, i) => {
      const [x1, y1] = lbl(i, 128), [x2, y2] = lbl(i, 86);
      return `<g data-i="${i}"><path d="${seg(i, 104, R)}" class="o"/><path d="${seg(i, 64, 104)}" class="in"/><text x="${x1}" y="${y1}" text-anchor="middle" class="tmaj">${nice(k.maj)}</text><text x="${x2}" y="${y2}" text-anchor="middle" class="tmin">${nice(k.min)}m</text></g>`;
    }).join('')}<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="cc" id="cc1"></text><text x="${cx}" y="${cy + 16}" text-anchor="middle" class="cc2" id="cc2"></text></svg>
      <div class="cinfo" id="cinfo"></div></div>
      <p>Searah jarum jam: naik <b>kwint</b> (C → G → D …), setiap langkah menambah satu ♯. Berlawanan arah: naik <b>kuart</b> (C → F → B♭ …), menambah satu ♭. Lingkaran dalam = <b>relatif minor</b> (tanda kunci sama). Kunci yang bertetangga punya chord yang paling mirip; urutan berlawanan arah jarum jam adalah urutan latihan ii–V–I di 12 kunci.</p>`) +
      `<div id="kb" class="kb-mid"></div>`;
    const kb = new Piano($('#kb', el), { from: 48, to: 84, labels: 'c', height: 120, minW: 22, caps: false });
    const SH = ['F', 'C', 'G', 'D', 'A', 'E', 'B'], FL = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
    const draw = () => {
      const k = CIRCLE[sel];
      $$('#circ g', el).forEach(g => g.classList.toggle('on', +g.dataset.i === sel));
      $('#cc1', el).textContent = nice(k.maj); $('#cc2', el).textContent = k.acc ? `${Math.abs(k.acc)}${k.acc > 0 ? '♯' : '♭'}` : 'tanpa ♯/♭';
      const accs = k.acc > 0 ? SH.slice(0, k.acc).map(n => n + '♯') : FL.slice(0, -k.acc).map(n => n + '♭');
      const D = DIATONIC.major, kpc = pcOf(k.maj);
      $('#cinfo', el).innerHTML = `<div class="big">${nice(k.maj)} mayor · ${nice(k.min)} minor</div>
        <p>Tanda kunci: <b>${accs.length ? accs.join(' ') : 'tidak ada'}</b></p>
        <p>Tangga nada: ${scaleSpell(k.maj, 'major').join(' ')}</p>
        <div class="chips">${D.iv.map((iv, i) => { const pc = (kpc + IV[iv]) % 12; return `<button class="chip" data-p='${JSON.stringify({ n: voice(pc, CHORD[D.tri[i]], 'root'), root: pc })}'><small>${D.rn[i]}</small>${chordName(spell(k.maj, iv), CHORD[D.tri[i]])}</button>`; }).join('')}</div>
        <button class="btn pri" id="kcad">${icon('play')} I – IV – V – I</button>`;
      $('#kcad', el).onclick = () => { const t = audio.now() + 0.05; [0, 5, 7, 0].forEach((o, i) => { const pc = (kpc + o) % 12; const ns = voice(pc, CHORD['maj'], ['root', 'inv2', 'inv1', 'root'][i]); audio.chord([36 + pc, ...ns], 0.9, t + i * 0.95); setTimeout(() => kb.markNotes(ns, 'tone', null, pc), i * 950); }); };
    };
    $('#circ', el).onclick = e => { const g = e.target.closest('g[data-i]'); if (!g) return; sel = +g.dataset.i; draw(); const pc = pcOf(CIRCLE[sel].maj); const ns = voice(pc, CHORD['maj'], 'root'); audio.chord(ns, 1.2); kb.markNotes(ns, 'tone', null, pc); };
    draw(); bindPlays(el, kb);
    return () => kb.destroy();
  },

  voicing(el) {
    let key = 'C';
    const SETS = [
      ['close', 'Posisi dasar (pemula)', [['m7', 'root'], ['7', 'root'], ['maj7', 'root']], 'Semua chord di posisi dasar — tangan melompat, bunyi kaku.'],
      ['shell', 'Shell voicing (tangan kiri)', [['m7', 'shellA'], ['7', 'shellB'], ['maj7', 'shellA']], 'Hanya akar + terts + septim. Bergantian 1–3–7 dan 1–7–3 sehingga terts & septim bergerak setengah langkah. Tangan kanan bebas untuk melodi.'],
      ['rootless', 'Rootless A → B → A', [['m9', 'rootA'], ['13', 'rootB'], ['maj9', 'rootA']], 'Tanpa akar (bassist yang memainkan). Bentuk A (3-5-7-9) dan B (7-9-3-5) bergantian → gerakan sangat kecil. Voicing standar Bill Evans.'],
      ['drop2', 'Drop 2', [['m7', 'drop2'], ['7', 'drop2'], ['maj7', 'drop2']], 'Ambil chord posisi rapat, turunkan nada ke-2 dari atas satu oktaf. Lebar, cocok untuk 2 tangan & melodi di atas.'],
      ['spread', 'Spread / ballad', [['m9', 'spread'], ['13', 'spread'], ['maj9', 'spread']], 'Tangan kiri akar + septim, tangan kanan terts/ekstensi. Bunyi penuh untuk balada.'],
      ['alt', 'Dengan V7alt (upper structure)', [['m9', 'rootA'], ['alt', 'ust'], ['maj9', 'rootA']], 'Pada V, tangan kiri tritonus 3–♭7, tangan kanan triad mayor ♭VI → G7alt (♭13, 1… ♯9). Ketegangan maksimum sebelum resolusi.'],
      ['tritone', 'Substitusi tritonus', [['m9', 'rootA'], ['13s11', 'rootB', 1], ['maj9', 'rootA']], 'G7 diganti D♭7 (berjarak tritonus, berbagi tritonus F–B/C♭). Bass bergerak kromatis D–D♭–C.'],
      ['quartal', 'Kuart "So What" (modal)', [['m11', 'quartal'], ['m11', 'quartal', 2], ['m11', 'quartal']], 'Tumpukan kuart + terts besar di atas (1–4–♭7–♭3–5). Bunyi modern-modal; geser setengah langkah untuk pewarnaan.'],
    ];
    el.innerHTML = card('Voicing jazz pada ii – V – I', `<p><b>Voicing</b> = cara menyusun nada chord di keyboard. Nama chord sama, tapi susunan menentukan warna & kelancaran. Pilih kunci, lalu dengarkan bagaimana ii–V–I berubah dengan tiap teknik.</p>
      <div class="toolbar"><label>Kunci <select id="vk">${options(ROOTS.map(r => [r, nice(r)]), key)}</select></label></div>
      <div class="vlist">${SETS.map(([id, n, , d]) => `<div class="vitem" data-v="${id}"><button class="ib">${icon('play')}</button><div><b>${n}</b><p>${d}</p><div class="vchords" data-c="${id}"></div></div></div>`).join('')}</div>
      <div id="kb" class="kb-mid sticky-kb"></div>`) +
      card('Tips praktik voicing', `<ul class="list"><li>Latih <b>shell</b> dulu di tangan kiri sambil tangan kanan memainkan melodi lagu.</li>
        <li>Rootless: hafalkan bentuk A untuk ii & I, bentuk B untuk V (atau sebaliknya), lalu putar di <b>12 kunci</b> berlawanan arah lingkaran kwint.</li>
        <li>Jaga voicing tangan kiri di rentang <b>D3–G4</b>: lebih rendah jadi "keruh", lebih tinggi kehilangan bobot.</li>
        <li>Coba di halaman <a href="#/progresi/251?voicing=rootless&rotate=1">Progresi → ii–V–I (putar kunci)</a> dengan pola swing.</li></ul>`);
    const kb = new Piano($('#kb', el), { from: 36, to: 88, labels: 'c', height: 130, minW: 18, caps: false });
    const build = id => {
      const set = SETS.find(s => s[0] === id); const kpc = pcOf(key);
      const degs = [2, 7, 0];
      return set[2].map(([cid, vid, alt], i) => {
        let pc = (kpc + degs[i]) % 12;
        if (alt === 1) pc = (kpc + 1) % 12;
        if (alt === 2) pc = (kpc + 3) % 12;
        if (id === 'quartal') pc = (kpc + [2, 3, 2][i]) % 12;
        const ns = voice(pc, CHORD[cid], vid);
        const bass = 36 + pc + (pc < 4 ? 12 : 0);
        const withBass = ['rootless', 'alt', 'tritone', 'drop2'].includes(id) ? [bass, ...ns] : ns;
        return { pc, cid, ns: withBass, label: chordName(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][pc], CHORD[cid]) };
      });
    };
    const draw = () => SETS.forEach(([id]) => { $(`[data-c="${id}"]`, el).innerHTML = build(id).map(c => `<span class="chip sm">${c.label}</span>`).join(''); });
    $('#vk', el).onchange = e => { key = e.target.value; draw(); };
    el.addEventListener('click', e => {
      const it = e.target.closest('.vitem'); if (!it) return;
      const chs = build(it.dataset.v); audio.init(); const t = audio.now() + 0.05;
      $$('.vitem', el).forEach(x => x.classList.toggle('on', x === it));
      chs.forEach((c, i) => { audio.chord(c.ns, i === 2 ? 2.2 : 1.15, t + i * 1.2, 0.68, 0.008); setTimeout(() => kb.markNotes(c.ns, 'tone', null, c.pc), i * 1200); });
    });
    draw();
    return () => kb.destroy();
  },
};

function steps(s) {
  const st = [...s.iv.map(iv => IV[iv]), 12];
  return st.slice(1).map((v, i) => ({ 1: 'H', 2: 'W', 3: 'W½', 4: '2W' }[v - st[i]] || '?')).join('-');
}

function hand(x0, right) {
  const fingers = right ? [[28, 70, 1], [52, 30, 2], [74, 22, 3], [96, 30, 4], [116, 46, 5]] : [[24, 46, 5], [44, 30, 4], [66, 22, 3], [88, 30, 2], [112, 70, 1]];
  let s = `<rect x="${x0 + 18}" y="80" width="110" height="65" rx="26" class="palm"/>`;
  fingers.forEach(([dx, top, n]) => {
    const thumb = n === 1, w = thumb ? 20 : 18, h = thumb ? 48 : 70;
    const fx = x0 + dx - w / 2 + (thumb ? (right ? -12 : 12) : 0);
    s += `<rect x="${fx}" y="${top + 6}" width="${w}" height="${h}" rx="9" class="fin" ${thumb ? `transform="rotate(${right ? -28 : 28} ${fx + w / 2} ${top + 50})"` : ''}/>`;
    s += `<circle cx="${fx + w / 2 + (thumb ? (right ? -8 : 8) : 0)}" cy="${top + 18}" r="9" class="fn"/><text x="${fx + w / 2 + (thumb ? (right ? -8 : 8) : 0)}" y="${top + 22}" text-anchor="middle" class="fnt">${n}</text>`;
  });
  return s;
}
