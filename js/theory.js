// Teori musik: nama nada, interval, chord, tangga nada, voicing, deteksi chord.
const LETTERS = 'CDEFGAB';
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
export const PC_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const PC_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export const PC_NICE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const SOLFEGE = ['do', 'di', 're', 'ri', 'mi', 'fa', 'fi', 'sol', 'sel', 'la', 'li', 'si'];
export const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// semitone tiap nama interval (derajat 1–13)
export const IV = {
  '1': 0, 'b2': 1, '2': 2, '#2': 3, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9,
  'bb7': 9, 'b7': 10, '7': 11, '8': 12, 'b9': 13, '9': 14, '#9': 15, '11': 17, '#11': 18, 'b13': 20, '13': 21,
};
export const ivDeg = iv => parseInt(iv.replace(/[b#]/g, ''), 10);
export const ivLabel = iv => iv.replace(/bb/g, '𝄫').replace(/b/g, '♭').replace(/#/g, '♯');

export function parseName(n) {
  const L = LETTERS.indexOf(n[0].toUpperCase());
  let acc = 0;
  for (const ch of n.slice(1)) { if (ch === '#' || ch === '♯') acc++; else if (ch === 'b' || ch === '♭') acc--; }
  return { L, acc, pc: (LETTER_PC[L] + acc + 120) % 12 };
}
export const fmtName = (L, acc) => LETTERS[L] + (acc > 0 ? '♯'.repeat(acc) : acc < 0 ? '♭'.repeat(-acc) : '');
export const nice = n => n.replace(/#/g, '♯').replace(/b/g, '♭');
export const pcOf = n => parseName(n).pc;

// eja nada dari akar + interval (C + b3 = E♭, C + bb7 = B♭♭)
export function spell(root, iv) {
  const r = parseName(root);
  const deg = ivDeg(iv);
  const L = (r.L + deg - 1) % 7;
  const target = (r.pc + IV[iv]) % 12;
  let acc = ((target - LETTER_PC[L]) % 12 + 12) % 12;
  if (acc > 6) acc -= 12;
  return fmtName(L, acc);
}

export const prefersFlat = root => /b/.test(root) || ['F', 'Dm', 'Gm', 'Cm', 'Fm'].includes(root);
export function midiName(m, flat = false) {
  return (flat ? PC_FLAT : PC_SHARP)[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}
export function parseNote(s) { // 'C#4' -> 61
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(s);
  if (!m) return null;
  const pc = (LETTER_PC[LETTERS.indexOf(m[1].toUpperCase())] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return (parseInt(m[3], 10) + 1) * 12 + pc + (m[1].toUpperCase() === 'B' && m[2] === '#' ? 12 : 0) - (m[1].toUpperCase() === 'C' && m[2] === 'b' ? 12 : 0);
}
export const isBlack = m => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

// ---------------- CHORD ----------------
export const CATS = {
  triad: { name: 'Triad dasar', lvl: 'Pemula', color: 'g' },
  add: { name: 'Nada tambahan (6 & add9)', lvl: 'Pemula+', color: 'g' },
  sept: { name: 'Septim (7th)', lvl: 'Menengah', color: 'b' },
  ext: { name: 'Jazz extended (9, 11, 13)', lvl: 'Mahir', color: 'p' },
  alt: { name: 'Jazz altered', lvl: 'Expert', color: 'r' },
};

export const CHORDS = [
  { id: 'maj', sym: '', other: 'M, maj', name: 'Mayor', iv: ['1', '3', '5'], cat: 'triad', info: 'Chord paling dasar, terdengar cerah dan stabil. Terts besar (4 semitone) + terts kecil (3 semitone).' },
  { id: 'm', sym: 'm', other: 'min, −', name: 'Minor', iv: ['1', 'b3', '5'], cat: 'triad', info: 'Terdengar sendu. Dari chord mayor, turunkan nada ke-3 setengah langkah.' },
  { id: 'dim', sym: 'dim', other: '°', name: 'Diminished', iv: ['1', 'b3', 'b5'], cat: 'triad', info: 'Dua terts kecil bertumpuk; tegang, ingin "pulang". Muncul sebagai chord vii° di tangga nada mayor.' },
  { id: 'aug', sym: 'aug', other: '+', name: 'Augmented', iv: ['1', '3', '#5'], cat: 'triad', info: 'Dua terts besar bertumpuk; terdengar mengambang/misterius. Sering jadi chord jembatan (C → C+ → F).' },
  { id: 'sus2', sym: 'sus2', other: '', name: 'Suspended 2', iv: ['1', '2', '5'], cat: 'triad', info: 'Nada ke-3 diganti nada ke-2. Netral (bukan mayor/minor), terdengar terbuka & modern.' },
  { id: 'sus4', sym: 'sus4', other: 'sus', name: 'Suspended 4', iv: ['1', '4', '5'], cat: 'triad', info: 'Nada ke-3 diganti nada ke-4; biasanya "resolve" ke chord mayor (Csus4 → C).' },
  { id: '5', sym: '5', other: 'power', name: 'Power chord', iv: ['1', '5', '8'], cat: 'triad', info: 'Hanya akar + kwint (+ oktaf). Tanpa terts, cocok untuk rock dan iringan tangan kiri.' },

  { id: '6', sym: '6', other: 'add6', name: 'Mayor 6', iv: ['1', '3', '5', '6'], cat: 'add', info: 'Mayor + nada ke-6. Manis dan "vintage"; sering dipakai sebagai pengganti chord I di jazz swing.' },
  { id: 'm6', sym: 'm6', other: '', name: 'Minor 6', iv: ['1', 'b3', '5', '6'], cat: 'add', info: 'Minor + sekst besar. Warna Dorian, khas bossa nova dan film noir.' },
  { id: 'add9', sym: 'add9', other: 'add2', name: 'Add 9', iv: ['1', '3', '5', '9'], cat: 'add', info: 'Mayor + nada ke-9 (tanpa septim). Sangat populer di pop/worship.' },
  { id: 'madd9', sym: 'm(add9)', other: 'madd9', name: 'Minor add 9', iv: ['1', 'b3', '5', '9'], cat: 'add', info: 'Minor + nada ke-9. Sendu namun lebar; bagus untuk balada.' },

  { id: 'maj7', sym: 'maj7', other: 'Δ7, M7', name: 'Mayor septim', iv: ['1', '3', '5', '7'], cat: 'sept', info: 'Mayor + septim besar (setengah langkah di bawah oktaf). Lembut, jazzy; chord I dan IV di jazz.' },
  { id: '7', sym: '7', other: 'dom7', name: 'Dominan septim', iv: ['1', '3', '5', 'b7'], cat: 'sept', info: 'Mayor + septim kecil. Ada tritonus (3–♭7) yang menuntut resolusi ke chord I. Jiwa dari blues.' },
  { id: 'm7', sym: 'm7', other: '−7, min7', name: 'Minor septim', iv: ['1', 'b3', '5', 'b7'], cat: 'sept', info: 'Minor + septim kecil. Chord ii pada progresi ii–V–I.' },
  { id: 'm7b5', sym: 'm7♭5', other: 'ø7, half-dim', name: 'Half-diminished', iv: ['1', 'b3', 'b5', 'b7'], cat: 'sept', info: 'Diminished + septim kecil. Chord iiø pada ii–V–i minor.' },
  { id: 'dim7', sym: 'dim7', other: '°7', name: 'Diminished septim', iv: ['1', 'b3', 'b5', 'bb7'], cat: 'sept', info: 'Tiga terts kecil bertumpuk, simetris (hanya ada 3 dim7 berbeda). Dipakai sebagai chord penghubung.' },
  { id: 'mmaj7', sym: 'm(maj7)', other: 'mΔ7', name: 'Minor mayor septim', iv: ['1', 'b3', '5', '7'], cat: 'sept', info: 'Minor dengan septim besar; gelap & sinematik (gaya film detektif).' },
  { id: '7sus4', sym: '7sus4', other: '7sus', name: 'Dominan sus4', iv: ['1', '4', '5', 'b7'], cat: 'sept', info: 'Dominan dengan nada ke-4 menggantikan terts. Terdengar menggantung, khas gospel/fusion.' },
  { id: 'aug7', sym: '7♯5', other: '+7, aug7', name: 'Augmented septim', iv: ['1', '3', '#5', 'b7'], cat: 'sept', info: 'Dominan dengan kwint dinaikkan. Menambah dorongan menuju chord I.' },
  { id: 'maj7s5', sym: 'maj7♯5', other: 'Δ7♯5', name: 'Mayor 7 ♯5', iv: ['1', '3', '#5', '7'], cat: 'sept', info: 'Chord dari mode Lydian augmented; berkilau dan modern.' },

  { id: 'maj9', sym: 'maj9', other: 'Δ9', name: 'Mayor 9', iv: ['1', '3', '5', '7', '9'], cat: 'ext', info: 'maj7 + nada ke-9. Warna "neo-soul" yang sangat halus.' },
  { id: '9', sym: '9', other: 'dom9', name: 'Dominan 9', iv: ['1', '3', '5', 'b7', '9'], cat: 'ext', info: 'Dominan 7 + 9. Standar untuk chord V di jazz dan funk.' },
  { id: 'm9', sym: 'm9', other: '−9', name: 'Minor 9', iv: ['1', 'b3', '5', 'b7', '9'], cat: 'ext', info: 'm7 + 9. Chord ii yang sangat umum di jazz & R&B.' },
  { id: '69', sym: '6/9', other: '6add9', name: 'Enam-sembilan', iv: ['1', '3', '5', '6', '9'], cat: 'ext', info: 'Mayor 6 + 9, tanpa septim. Akhir lagu jazz klasik.' },
  { id: 'm69', sym: 'm6/9', other: '', name: 'Minor 6/9', iv: ['1', 'b3', '5', '6', '9'], cat: 'ext', info: 'Chord tonika minor yang kaya; warna Dorian.' },
  { id: '11', sym: '11', other: '9sus4', name: 'Dominan 11', iv: ['1', '5', 'b7', '9', '11'], cat: 'ext', info: 'Biasanya tanpa terts (bentrok dengan 11) → mirip 9sus4. Contoh voicing: Gm7 di atas bass C.' },
  { id: 'm11', sym: 'm11', other: '−11', name: 'Minor 11', iv: ['1', 'b3', '5', 'b7', '9', '11'], cat: 'ext', info: 'Minor bertumpuk hingga 11; dasar voicing kuart "So What".' },
  { id: 'maj7s11', sym: 'maj7♯11', other: 'Δ♯11', name: 'Lydian', iv: ['1', '3', '5', '7', '#11'], cat: 'ext', info: 'maj7 dengan 11 dinaikkan (warna mode Lydian). Elegan untuk chord IV atau akhir lagu.' },
  { id: 'maj13', sym: 'maj13', other: 'Δ13', name: 'Mayor 13', iv: ['1', '3', '5', '7', '9', '13'], cat: 'ext', info: 'maj9 + 13 (nada 11 biasanya dihilangkan).' },
  { id: '13', sym: '13', other: 'dom13', name: 'Dominan 13', iv: ['1', '3', '5', 'b7', '9', '13'], cat: 'ext', info: 'Dominan paling "gemuk". Voicing umum tangan kiri: 3–13–♭7 atau ♭7–9–3–13.' },
  { id: 'm13', sym: 'm13', other: '−13', name: 'Minor 13', iv: ['1', 'b3', '5', 'b7', '9', '13'], cat: 'ext', info: 'm9 + 13 (warna Dorian).' },
  { id: '9sus4', sym: '9sus4', other: '9sus', name: 'Dominan 9 sus4', iv: ['1', '4', '5', 'b7', '9'], cat: 'ext', info: 'Chord modern (Herbie Hancock "Maiden Voyage" style). Bisa dimainkan sebagai triad ♭VII di atas akar.' },
  { id: 'm9b5', sym: 'm9♭5', other: 'ø9', name: 'Half-dim 9', iv: ['1', 'b3', 'b5', 'b7', '9'], cat: 'ext', info: 'ø7 dengan 9 natural (dari Locrian ♮2).' },

  { id: '7b9', sym: '7♭9', other: '', name: 'Dominan ♭9', iv: ['1', '3', '5', 'b7', 'b9'], cat: 'alt', info: 'Dominan yang menuju chord minor (V7♭9 → i). Warna Spanyol/klasik.' },
  { id: '7s9', sym: '7♯9', other: 'Hendrix', name: 'Dominan ♯9', iv: ['1', '3', '5', 'b7', '#9'], cat: 'alt', info: 'Ada terts mayor & "minor" sekaligus — gritty, khas blues/funk.' },
  { id: '7b5', sym: '7♭5', other: '7(♭5)', name: 'Dominan ♭5', iv: ['1', '3', 'b5', 'b7'], cat: 'alt', info: 'Kwint diturunkan; simetris dengan substitusi tritonusnya.' },
  { id: '7s11', sym: '7♯11', other: '7(♯11)', name: 'Dominan ♯11', iv: ['1', '3', '5', 'b7', '#11'], cat: 'alt', info: 'Lydian dominan; terdengar cerah-tegang. Pasangan alami substitusi tritonus.' },
  { id: '9s11', sym: '9♯11', other: '', name: 'Dominan 9 ♯11', iv: ['1', '3', '5', 'b7', '9', '#11'], cat: 'alt', info: 'Tumpukan Lydian dominan. Bisa dimainkan: shell 3–♭7 + triad II di tangan kanan.', ust: [2, 'II'] },
  { id: '7b13', sym: '7♭13', other: '7(♭13)', name: 'Dominan ♭13', iv: ['1', '3', '5', 'b7', 'b13'], cat: 'alt', info: 'Warna mixolydian ♭6; menuju chord minor dengan lembut.' },
  { id: '13b9', sym: '13♭9', other: '', name: 'Dominan 13 ♭9', iv: ['1', '3', '5', 'b7', 'b9', '13'], cat: 'alt', info: 'Warna tangga nada diminished (setengah-penuh). Upper structure: triad VI mayor.', ust: [9, 'VI'] },
  { id: '13s11', sym: '13♯11', other: '', name: 'Dominan 13 ♯11', iv: ['1', '3', 'b7', '9', '#11', '13'], cat: 'alt', info: 'Lydian dominan penuh — dipakai pada chord ♭II7 (substitusi tritonus).', ust: [2, 'II'] },
  { id: '7s5s9', sym: '7♯5♯9', other: '7alt', name: 'Dominan ♯5 ♯9', iv: ['1', '3', '#5', 'b7', '#9'], cat: 'alt', info: 'Altered klasik bebop; resolusi kuat ke chord I minor/mayor.' },
  { id: '7b9b13', sym: '7♭9♭13', other: '', name: 'Dominan ♭9 ♭13', iv: ['1', '3', 'b7', 'b9', 'b13'], cat: 'alt', info: 'Dominan untuk ii–V–i minor (dari harmonik minor).' },
  { id: 'alt', sym: '7alt', other: 'alt', name: 'Altered', iv: ['1', '3', 'b7', 'b9', '#9', '#11', 'b13'], cat: 'alt', info: 'Semua tensi diubah (♭9 ♯9 ♯11 ♭13) dari tangga nada Altered. Upper structure: triad ♭VI mayor di atas 3–♭7.', ust: [8, '♭VI'] },
];
export const CHORD = Object.fromEntries(CHORDS.map(c => [c.id, c]));

export const chordName = (root, c) => nice(root) + (typeof c === 'string' ? CHORD[c].sym : c.sym);
export const chordSpell = (root, c) => c.iv.map(iv => spell(root, iv));
export const rootBase = pc => 48 + pc + (pc < 7 ? 12 : 0); // C4..F#3

function findIv(c, list) { for (const x of list) if (c.iv.includes(x)) return x; return null; }
const third = c => findIv(c, ['3', 'b3', '4', '2']);
const fifth = c => findIv(c, ['5', 'b5', '#5']);
const seventh = c => findIv(c, ['7', 'b7', 'bb7', '6']);
const ninth = c => findIv(c, ['9', 'b9', '#9']);
const thirteenth = c => findIv(c, ['13', 'b13']);

function stackUp(start, sts) { // sts = semitone pcs; tiap nada di atas sebelumnya
  const out = []; let prev = start - 1;
  for (const s of sts) { let n = start - ((start % 12) + 12) % 12 + s; while (n <= prev) n += 12; out.push(n); prev = n; }
  return out;
}
function place(ns, lo) { while (Math.min(...ns) < lo) ns = ns.map(n => n + 12); while (Math.min(...ns) >= lo + 12) ns = ns.map(n => n - 12); return ns; }

export function voicingList(c) {
  const v = [['root', 'Posisi dasar']];
  const simple = c.iv.every(x => IV[x] < 12);
  if (simple && c.iv.length >= 3 && c.id !== '5') for (let i = 1; i < c.iv.length; i++) v.push(['inv' + i, `Inversi ${i}`]);
  const t3 = third(c), t7 = seventh(c);
  if (t3 && t7) {
    v.push(['shellA', 'Shell 1–3–7'], ['shellB', 'Shell 1–7–3']);
    if (c.id !== 'dim7') v.push(['rootA', 'Rootless A (3-5-7-9)'], ['rootB', 'Rootless B (7-9-3-5)']);
    v.push(['drop2', 'Drop 2'], ['spread', 'Spread (2 tangan)']);
  }
  if (c.iv.includes('b3') && c.iv.includes('b7') && c.iv.includes('5')) v.push(['quartal', 'Kuart "So What"']);
  if (c.ust) v.push(['ust', `Upper structure (${c.ust[1]})`]);
  return v;
}

// kembalikan nada MIDI untuk voicing tertentu
export function voice(rootPc, c, vid = 'root') {
  const S = x => IV[x];
  const r = rootBase(rootPc);
  const pcs = iv => S(iv) % 12;
  if (vid === 'root') return c.iv.map(x => r + S(x));
  if (vid.startsWith('inv')) {
    const k = +vid.slice(3);
    let ns = c.iv.map(x => r + S(x)).sort((a, b) => a - b);
    for (let i = 0; i < k; i++) ns[i] += 12;
    ns.sort((a, b) => a - b);
    if (ns[0] > 64) ns = ns.map(n => n - 12);
    return ns;
  }
  const t3 = third(c), t5 = fifth(c), t7 = seventh(c), t9 = ninth(c), t13 = thirteenth(c);
  const lowR = 36 + rootPc + (rootPc < 5 ? 12 : 0); // C3..E3 / F2..B2
  if (vid === 'shellA') return [lowR, lowR + pcs(t3) + (S(t3) < 3 ? 12 : 0), lowR + pcs(t7)];
  if (vid === 'shellB') return [lowR, lowR + pcs(t7), lowR + 12 + pcs(t3)];
  if (vid === 'rootA' || vid === 'rootB') {
    const top5 = t13 && t13 === '13' ? t13 : (t5 || t13 || '5');
    const n9 = t9 || '9';
    const order = vid === 'rootA' ? [t3, top5, t7, n9] : [t7, n9, t3, top5];
    let ns = stackUp(rootPc + pcs(order[0]), order.map(x => (rootPc + pcs(x)) % 12));
    return place(ns, 50);
  }
  if (vid === 'drop2') {
    const tones = [t9 && c.iv.length > 4 ? t9 : '1', t3, t13 === '13' ? '13' : (t5 || '5'), t7];
    let close = stackUp(rootPc + pcs(tones[0]), tones.map(x => (rootPc + pcs(x)) % 12));
    close = place(close, 57);
    const s = [...close].sort((a, b) => a - b);
    s[2] -= 12;
    return s.sort((a, b) => a - b);
  }
  if (vid === 'spread') {
    const lo = 36 + rootPc;
    const rest = c.iv.filter(x => x !== '1' && x !== t7 && x !== '8');
    const rh = place(stackUp(rootPc + pcs(rest[0]), rest.map(x => (rootPc + pcs(x)) % 12)), 57);
    return [lo, lo + pcs(t7) + (pcs(t7) < 7 ? 12 : 0), ...rh];
  }
  if (vid === 'quartal') {
    const b = 48 + rootPc - (rootPc > 6 ? 12 : 0);
    return [b, b + 5, b + 10, b + 15, b + 19];
  }
  if (vid === 'ust') {
    const lh = place([rootPc + pcs(t3), rootPc + pcs(t3) + ((pcs(t7) - pcs(t3) + 12) % 12)], 50);
    const tr = (rootPc + c.ust[0]) % 12;
    const rh = place([tr, tr + 4, tr + 7], Math.max(...lh) + 1);
    return [...lh, ...rh];
  }
  return c.iv.map(x => r + S(x));
}

// deteksi nama chord dari kumpulan nada MIDI
export function detect(midis) {
  const ns = [...new Set(midis)].sort((a, b) => a - b);
  if (ns.length < 2) return null;
  const bass = ns[0] % 12;
  const set = new Set(ns.map(n => n % 12));
  if (set.size === 1) return { name: 'Oktaf', short: 'P8' };
  if (ns.length === 2 || set.size === 2) {
    const d = ((ns[ns.length - 1] - ns[0]) % 12 + 12) % 12 || 12;
    return { name: INTERVALS[d].name, short: INTERVALS[d].short, interval: true };
  }
  let best = null;
  for (const c of CHORDS) {
    for (let r = 0; r < 12; r++) {
      const full = new Set(c.iv.map(x => (r + IV[x]) % 12));
      const opt = new Set([...full]);
      let ok = setEq(full, set), omit = false;
      if (!ok && c.iv.length >= 4 && c.iv.includes('5')) { opt.delete((r + 7) % 12); ok = setEq(opt, set); omit = ok; }
      if (!ok) continue;
      const score = (r === bass ? 0 : 10) + (omit ? 3 : 0) + CHORDS.indexOf(c) * 0.01;
      if (!best || score < best.score) best = { score, r, c, omit };
    }
  }
  if (!best) return null;
  const rn = PC_NICE[best.r];
  let name = rn + best.c.sym;
  if (best.r !== bass) name += '/' + PC_NICE[bass];
  return { name, root: best.r, chord: best.c, bass, omit5: best.omit };
}
const setEq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

// ---------------- INTERVAL ----------------
export const INTERVALS = [
  { st: 0, short: 'P1', name: 'Unison', song: '—' },
  { st: 1, short: 'm2', name: 'Sekon kecil', song: 'Tema film "Jaws"' },
  { st: 2, short: 'M2', name: 'Sekon besar', song: '"Happy Birthday" (py → birth)' },
  { st: 3, short: 'm3', name: 'Terts kecil', song: '"Greensleeves" (A → C)' },
  { st: 4, short: 'M3', name: 'Terts besar', song: '"When the Saints" (C → E)' },
  { st: 5, short: 'P4', name: 'Kuart murni', song: '"Here Comes the Bride"' },
  { st: 6, short: 'TT', name: 'Tritonus', song: 'Tema "The Simpsons"' },
  { st: 7, short: 'P5', name: 'Kwint murni', song: '"Twinkle Twinkle" (C → G)' },
  { st: 8, short: 'm6', name: 'Sekst kecil', song: '"The Entertainer" (lompatan awal)' },
  { st: 9, short: 'M6', name: 'Sekst besar', song: '"My Bonnie Lies Over the Ocean"' },
  { st: 10, short: 'm7', name: 'Septim kecil', song: 'Tema "Star Trek" (original)' },
  { st: 11, short: 'M7', name: 'Septim besar', song: '"Take On Me" (reff)' },
  { st: 12, short: 'P8', name: 'Oktaf', song: '"Somewhere Over the Rainbow"' },
];

// ---------------- TANGGA NADA ----------------
export const SCALES = [
  { id: 'major', name: 'Mayor (Ionian)', iv: ['1', '2', '3', '4', '5', '6', '7'], lvl: 'Pemula', info: 'Pola W-W-H-W-W-W-H (W = 1 langkah, H = ½ langkah). Dasar dari semua teori.' },
  { id: 'minor', name: 'Minor natural (Aeolian)', iv: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], lvl: 'Pemula', info: 'Relatif minor: mulai dari nada ke-6 tangga nada mayor (A minor = C mayor).' },
  { id: 'harm', name: 'Minor harmonik', iv: ['1', '2', 'b3', '4', '5', 'b6', '7'], lvl: 'Menengah', info: 'Minor natural dengan nada ke-7 dinaikkan → chord V menjadi mayor (E7 → Am).' },
  { id: 'mel', name: 'Minor melodik (jazz)', iv: ['1', '2', 'b3', '4', '5', '6', '7'], lvl: 'Menengah', info: 'Nada 6 dan 7 dinaikkan. Di jazz dimainkan sama naik-turun; sumber mode altered & lydian dominan.' },
  { id: 'penta', name: 'Pentatonik mayor', iv: ['1', '2', '3', '5', '6'], lvl: 'Pemula', info: '5 nada tanpa nada "bentrok" — paling aman untuk improvisasi pertama. Tuts hitam = F♯ pentatonik.' },
  { id: 'mpenta', name: 'Pentatonik minor', iv: ['1', 'b3', '4', '5', 'b7'], lvl: 'Pemula', info: 'Dasar improvisasi rock, blues, pop.' },
  { id: 'blues', name: 'Blues', iv: ['1', 'b3', '4', 'b5', '5', 'b7'], lvl: 'Menengah', info: 'Pentatonik minor + "blue note" ♭5. Pakai di atas 12-bar blues.' },
  { id: 'dorian', name: 'Dorian', iv: ['1', '2', 'b3', '4', '5', '6', 'b7'], lvl: 'Mahir', info: 'Minor dengan 6 besar. Mode untuk chord m7 (ii) di jazz; contoh "So What".' },
  { id: 'phryg', name: 'Phrygian', iv: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'], lvl: 'Mahir', info: 'Minor dengan ♭2; nuansa Spanyol/flamenco.' },
  { id: 'lyd', name: 'Lydian', iv: ['1', '2', '3', '#4', '5', '6', '7'], lvl: 'Mahir', info: 'Mayor dengan ♯4; cerah & melayang (musik film). Untuk chord maj7♯11.' },
  { id: 'mixo', name: 'Mixolydian', iv: ['1', '2', '3', '4', '5', '6', 'b7'], lvl: 'Mahir', info: 'Mayor dengan ♭7; mode untuk chord dominan 7.' },
  { id: 'locr', name: 'Locrian', iv: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'], lvl: 'Mahir', info: 'Mode untuk chord m7♭5 (half-diminished).' },
  { id: 'bebop', name: 'Bebop dominan', iv: ['1', '2', '3', '4', '5', '6', 'b7', '7'], lvl: 'Expert', info: 'Mixolydian + nada lewat 7 besar, agar chord tone jatuh di ketukan.' },
  { id: 'whole', name: 'Whole tone', iv: ['1', '2', '3', '#4', '#5', 'b7'], lvl: 'Expert', info: 'Semua jarak 1 langkah; untuk chord 7♯5. Bunyi "mimpi" ala Debussy.' },
  { id: 'dimhw', name: 'Diminished (½–1)', iv: ['1', 'b2', '#2', '3', '#4', '5', '6', 'b7'], lvl: 'Expert', info: 'Selang-seling ½ dan 1 langkah; untuk chord 13♭9.' },
  { id: 'alt', name: 'Altered (Super Locrian)', iv: ['1', 'b2', '#2', '3', '#4', '#5', 'b7'], lvl: 'Expert', info: 'Mode ke-7 minor melodik; semua tensi altered untuk V7alt.' },
  { id: 'lyddom', name: 'Lydian dominan', iv: ['1', '2', '3', '#4', '5', '6', 'b7'], lvl: 'Expert', info: 'Mode ke-4 minor melodik; untuk 7♯11 dan substitusi tritonus.' },
];
export const SCALE = Object.fromEntries(SCALES.map(s => [s.id, s]));

// penjarian tangga nada mayor (naik, tonika → tonika)
const FING = {
  RH: { C: [1, 2, 3, 1, 2, 3, 4, 5], G: [1, 2, 3, 1, 2, 3, 4, 5], D: [1, 2, 3, 1, 2, 3, 4, 5], A: [1, 2, 3, 1, 2, 3, 4, 5], E: [1, 2, 3, 1, 2, 3, 4, 5], B: [1, 2, 3, 1, 2, 3, 4, 5], F: [1, 2, 3, 4, 1, 2, 3, 4], Bb: [4, 1, 2, 3, 1, 2, 3, 4], Eb: [3, 1, 2, 3, 4, 1, 2, 3], Ab: [3, 4, 1, 2, 3, 1, 2, 3], Db: [2, 3, 1, 2, 3, 4, 1, 2], 'F#': [2, 3, 4, 1, 2, 3, 1, 2] },
  LH: { C: [5, 4, 3, 2, 1, 3, 2, 1], G: [5, 4, 3, 2, 1, 3, 2, 1], D: [5, 4, 3, 2, 1, 3, 2, 1], A: [5, 4, 3, 2, 1, 3, 2, 1], E: [5, 4, 3, 2, 1, 3, 2, 1], B: [4, 3, 2, 1, 4, 3, 2, 1], F: [5, 4, 3, 2, 1, 3, 2, 1], Bb: [3, 2, 1, 4, 3, 2, 1, 3], Eb: [3, 2, 1, 4, 3, 2, 1, 3], Ab: [3, 2, 1, 4, 3, 2, 1, 3], Db: [3, 2, 1, 4, 3, 2, 1, 3], 'F#': [4, 3, 2, 1, 3, 2, 1, 4] },
};
const MINOR_OK = ['C', 'D', 'E', 'G', 'A']; // minor pada tuts putih: penjarian sama dengan mayor C

export function scaleFingers(root, scaleId, hand, n) {
  const sc = SCALE[scaleId];
  if (sc.iv.length !== 7) return null;
  let f = null;
  if (scaleId === 'major') f = FING[hand][root];
  else if (['minor', 'harm', 'mel', 'dorian', 'mixo'].includes(scaleId) && MINOR_OK.includes(root)) f = FING[hand].C;
  if (!f) return null;
  // n = jumlah nada naik (7*oktaf + 1)
  const out = [];
  for (let i = 0; i < n; i++) {
    const deg = i % 7, oct = Math.floor(i / 7);
    if (i === n - 1) out.push(f[7]);
    else if (deg === 0 && oct > 0 && hand === 'LH') out.push(f[7]);
    else out.push(f[deg]);
  }
  return out;
}

// nada tangga nada (MIDI), naik lalu turun
export function scaleNotes(root, scaleId, octaves = 1, start = null) {
  const sc = SCALE[scaleId];
  const base = start ?? (60 + pcOf(root) - (pcOf(root) > 7 ? 12 : 0));
  const up = [];
  for (let o = 0; o < octaves; o++) for (const iv of sc.iv) up.push(base + 12 * o + IV[iv]);
  up.push(base + 12 * octaves);
  return up;
}
export const scaleSpell = (root, scaleId) => SCALE[scaleId].iv.map(iv => spell(root, iv));

// ---------------- DIATONIK ----------------
export const DIATONIC = {
  major: {
    iv: ['1', '2', '3', '4', '5', '6', '7'],
    tri: ['maj', 'm', 'm', 'maj', 'maj', 'm', 'dim'],
    sev: ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'],
    rn: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
    rn7: ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'],
    fn: ['Tonika', 'Subdominan', 'Tonika', 'Subdominan', 'Dominan', 'Tonika', 'Dominan'],
  },
  minor: {
    iv: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
    tri: ['m', 'dim', 'maj', 'm', 'm', 'maj', 'maj'],
    sev: ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'],
    rn: ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII'],
    rn7: ['i7', 'iiø7', '♭IIImaj7', 'iv7', 'v7', '♭VImaj7', '♭VII7'],
    fn: ['Tonika', 'Subdominan', 'Tonika', 'Subdominan', 'Dominan (lemah)', 'Subdominan', 'Subtonika'],
  },
};

export const CIRCLE = [
  { maj: 'C', min: 'A', acc: 0 }, { maj: 'G', min: 'E', acc: 1 }, { maj: 'D', min: 'B', acc: 2 }, { maj: 'A', min: 'F#', acc: 3 },
  { maj: 'E', min: 'C#', acc: 4 }, { maj: 'B', min: 'G#', acc: 5 }, { maj: 'F#', min: 'D#', acc: 6 }, { maj: 'Db', min: 'Bb', acc: -5 },
  { maj: 'Ab', min: 'F', acc: -4 }, { maj: 'Eb', min: 'C', acc: -3 }, { maj: 'Bb', min: 'G', acc: -2 }, { maj: 'F', min: 'D', acc: -1 },
];

// ---------------- PROGRESI ----------------
const RN = { I: 0, bII: 1, II: 2, bIII: 3, III: 4, IV: 5, '#IV': 6, bV: 6, V: 7, bVI: 8, VI: 9, bVII: 10, VII: 11 };
export const romanOffset = r => RN[r.toUpperCase().replace('B', 'b')];
// steps: [roman, chordId, beats, label?]
export const PROGS = [
  { id: '145', name: 'I – IV – V – I', lvl: 'Pemula', key: 'C', steps: [['I', 'maj'], ['IV', 'maj'], ['V', 'maj'], ['I', 'maj']], info: 'Kadens sempurna, pondasi ribuan lagu pop, folk & gereja. Latih dengan inversi supaya tangan tidak melompat (C – C/F – B/G – C).' },
  { id: 'pop', name: 'I – V – vi – IV', lvl: 'Pemula', key: 'C', steps: [['I', 'maj'], ['V', 'maj'], ['vi', 'm'], ['IV', 'maj']], info: '"Progresi 4 chord" pop modern. Hampir semua lagu pop bisa dimainkan dengan ini.' },
  { id: '50s', name: 'I – vi – IV – V', lvl: 'Pemula', key: 'C', steps: [['I', 'maj'], ['vi', 'm'], ['IV', 'maj'], ['V', 'maj']], info: 'Progresi "doo-wop" era 50-an.' },
  { id: 'sad', name: 'vi – IV – I – V', lvl: 'Pemula', key: 'C', steps: [['vi', 'm'], ['IV', 'maj'], ['I', 'maj'], ['V', 'maj']], info: 'Versi minor dari progresi pop; terdengar emosional.' },
  { id: 'canon', name: 'Canon (Pachelbel)', lvl: 'Pemula+', key: 'D', steps: [['I', 'maj'], ['V', 'maj'], ['vi', 'm'], ['iii', 'm'], ['IV', 'maj'], ['I', 'maj'], ['IV', 'maj'], ['V', 'maj']], info: 'Progresi dari Canon in D (Pachelbel, ±1680, domain publik). Bagus untuk latihan inversi & pola arpeggio.' },
  { id: 'andal', name: 'Kadens Andalusia (minor)', lvl: 'Pemula+', key: 'A', minor: true, steps: [['i', 'm'], ['bVII', 'maj'], ['bVI', 'maj'], ['V', 'maj']], info: 'i – ♭VII – ♭VI – V. Nuansa Spanyol/flamenco. Kunci = tonika minor.' },
  { id: 'blues', name: '12-Bar Blues', lvl: 'Menengah', key: 'C', steps: [['I', '7'], ['I', '7'], ['I', '7'], ['I', '7'], ['IV', '7'], ['IV', '7'], ['I', '7'], ['I', '7'], ['V', '7'], ['IV', '7'], ['I', '7'], ['V', '7']], info: 'Struktur 12 birama blues. Improvisasi dengan tangga nada blues di kunci yang sama.' },
  { id: '251', name: 'ii – V – I mayor', lvl: 'Menengah', key: 'C', steps: [['ii', 'm7'], ['V', '7'], ['I', 'maj7'], ['I', 'maj7']], info: 'Progresi terpenting di jazz. Pelajari di 12 kunci (aktifkan "Putar kunci").' },
  { id: '251m', name: 'ii – V – i minor', lvl: 'Mahir', key: 'C', minor: true, steps: [['ii', 'm7b5'], ['V', '7b9'], ['i', 'm6'], ['i', 'm6']], info: 'iiø7 – V7♭9 – i. Versi minor; perhatikan nada ♭9 pada dominan.' },
  { id: 'turn', name: 'Turnaround I – vi – ii – V', lvl: 'Menengah', key: 'C', steps: [['I', 'maj7'], ['vi', 'm7'], ['ii', 'm7'], ['V', '7']], info: 'Mengisi akhir bagian lagu sebelum kembali ke awal.' },
  { id: '3625', name: 'iii – VI7 – ii – V – I', lvl: 'Mahir', key: 'C', steps: [['iii', 'm7'], ['VI', '7'], ['ii', 'm7'], ['V', '7'], ['I', 'maj7'], ['I', 'maj7']], info: 'VI7 adalah dominan sekunder (V/ii) — memberi dorongan kuat ke ii.' },
  { id: 'tritone', name: 'Substitusi tritonus', lvl: 'Expert', key: 'C', steps: [['ii', 'm9'], ['bII', '13s11'], ['I', 'maj9'], ['I', 'maj9']], info: 'V7 diganti chord dominan berjarak tritonus (G7 → D♭7). Bass turun kromatis D – D♭ – C.' },
  { id: 'backdoor', name: 'Backdoor ii – V', lvl: 'Expert', key: 'C', steps: [['iv', 'm7'], ['bVII', '9'], ['I', 'maj7'], ['I', 'maj7']], info: 'iv7 – ♭VII7 – I: resolusi "pintu belakang" yang manis (dipinjam dari minor).' },
  { id: 'jblues', name: 'Jazz Blues', lvl: 'Expert', key: 'F', steps: [['I', '7'], ['IV', '7'], ['I', '7'], ['v', 'm7', 2], ['I', '7', 2], ['IV', '7'], ['#IV', 'dim7'], ['I', '7'], ['VI', '7b9'], ['ii', 'm7'], ['V', '7'], ['I', '7', 2], ['VI', '7', 2], ['ii', 'm7', 2], ['V', '7', 2]], info: 'Blues dengan ii–V dan dominan sekunder; standar jam session jazz.' },
  { id: 'rhythm', name: 'Rhythm Changes (A)', lvl: 'Expert', key: 'Bb', steps: [['I', '6', 2], ['vi', 'm7', 2], ['ii', 'm7', 2], ['V', '7', 2], ['iii', 'm7', 2], ['VI', '7', 2], ['ii', 'm7', 2], ['V', '7', 2], ['I', '7', 2], ['I', '7', 2], ['IV', 'maj7', 2], ['iv', 'm6', 2], ['iii', 'm7', 2], ['VI', '7', 2], ['ii', 'm7', 2], ['V', '7', 2]], info: 'Bagian A bentuk "rhythm changes" (domain umum di jazz). Dua chord per birama — latih comping cepat.' },
  { id: 'sowhat', name: 'Modal vamp (Dorian)', lvl: 'Expert', key: 'D', minor: true, steps: [['i', 'm11'], ['i', 'm11'], ['bII', 'm11'], ['i', 'm11']], info: 'Jazz modal: chord tahan lama, improvisasi pakai Dorian; voicing kuart terdengar paling pas.' },
];

export function progChords(p, key) {
  const k = pcOf(key);
  return p.steps.map(([rn, cid, beats = 4]) => {
    const off = romanOffset(rn.replace(/[°ø]/g, ''));
    const pc = (k + off) % 12;
    const c = CHORD[cid];
    const root = nameForPc(pc, key, p.minor);
    return { rn, pc, c, beats, root, label: chordName(root, c) };
  });
}
export function nameForPc(pc, key, minor) {
  const flatKey = /b/.test(key) || ['F'].includes(key) || (minor && ['C', 'D', 'G', 'F'].includes(key));
  return (flatKey ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])[pc];
}

// jarak antar voicing (untuk voice leading)
export function voiceDist(a, b) {
  const A = [...a].sort((x, y) => x - y), B = [...b].sort((x, y) => x - y);
  let d = 0; const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) d += Math.abs((A[Math.min(i, A.length - 1)]) - (B[Math.min(i, B.length - 1)]));
  return d;
}
