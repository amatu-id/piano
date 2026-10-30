// Lagu latihan — semuanya domain publik (aransemen sederhana untuk belajar).
// Notasi: "C4/1" = nada + durasi (ketukan), durasi terbawa ke token berikutnya;
// "r/1" = istirahat; "C3+G3/4" = chord; "^3" = nomor jari; "|" = garis birama (diabaikan).
import { parseNote, scaleNotes, scaleFingers, pcOf } from './theory.js';

export function parseTrack(str, hand) {
  const out = []; let t = 0, d = 1;
  for (const tok of str.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const m = /^([^/^]+)(?:\/([\d.]+))?(?:\^(\d))?$/.exec(tok);
    if (!m) continue;
    if (m[2]) d = parseFloat(m[2]);
    if (m[1] !== 'r') for (const n of m[1].split('+')) { const midi = parseNote(n); if (midi != null) out.push({ t, d, m: midi, h: hand, f: m[3] ? +m[3] : null }); }
    t += d;
  }
  return out;
}

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const whiteIdx = m => { const o = Math.floor(m / 12), i = WHITE.indexOf(m % 12); return i < 0 ? null : o * 7 + i; };
function autoFinger(notes, base, hand) {
  const b = whiteIdx(parseNote(base));
  const byT = new Map(); notes.forEach(n => byT.set(n.t, (byT.get(n.t) || 0) + 1));
  for (const n of notes) {
    if (n.f || byT.get(n.t) > 1) continue;
    const w = whiteIdx(n.m); if (w == null) continue;
    const d = w - b;
    if (d >= 0 && d <= 4) n.f = hand === 'R' ? d + 1 : 5 - d;
  }
}

export function songNotes(s) {
  if (s.gen) return s.gen();
  const R = s.R ? parseTrack(s.R, 'R') : [], L = s.L ? parseTrack(s.L, 'L') : [];
  if (s.fpos?.R) autoFinger(R, s.fpos.R, 'R');
  if (s.fpos?.L) autoFinger(L, s.fpos.L, 'L');
  return [...R, ...L].sort((a, b) => a.t - b.t || a.m - b.m);
}

function hanon1() {
  const C = [0, 2, 4, 5, 7, 9, 11];
  const deg = (base, i) => base + Math.floor(i / 7) * 12 + C[((i % 7) + 7) % 7];
  const out = []; let t = 0; const d = 0.25;
  const up = [0, 2, 3, 4, 5, 4, 3, 2], fR = [1, 2, 3, 4, 5, 4, 3, 2], fL = [5, 4, 3, 2, 1, 2, 3, 4];
  for (let s = 0; s <= 13; s++) up.forEach((o, i) => { out.push({ t, d, m: deg(60, s + o), h: 'R', f: fR[i] }, { t, d, m: deg(48, s + o), h: 'L', f: fL[i] }); t += d; });
  for (let s = 18; s >= 5; s--) up.forEach((o, i) => { out.push({ t, d, m: deg(60, s - o), h: 'R', f: fL[i] }, { t, d, m: deg(48, s - o), h: 'L', f: fR[i] }); t += d; });
  out.push({ t, d: 2, m: 60, h: 'R', f: 1 }, { t, d: 2, m: 48, h: 'L', f: 5 });
  return out;
}

export function scaleExercise(root, scaleId, octaves, hands = 'RL', step = 0.5) {
  const out = []; let t = 0;
  const pc = pcOf(root);
  const baseR = 60 + pc - (pc > 7 ? 12 : 0), baseL = baseR - 12;
  const add = (hand, base) => {
    const up = scaleNotes(root, scaleId, octaves, base);
    const fu = scaleFingers(root, scaleId, hand === 'R' ? 'RH' : 'LH', up.length);
    const seq = [...up, ...up.slice(0, -1).reverse()];
    const fs = fu ? [...fu, ...fu.slice(0, -1).reverse()] : null;
    seq.forEach((m, i) => out.push({ t: i * step, d: i === seq.length - 1 ? step * 2 : step, m, h: hand, f: fs ? fs[i] : null }));
    t = Math.max(t, seq.length * step);
  };
  if (hands.includes('R')) add('R', baseR);
  if (hands.includes('L')) add('L', baseL);
  return out.sort((a, b) => a.t - b.t || a.m - b.m);
}

export const SONGS = [
  {
    id: 'mary', title: 'Mary Had a Little Lamb', by: 'Lagu rakyat Amerika', lvl: 'Pemula', bpm: 96, meter: 4, key: 'C',
    info: 'Posisi C: jempol kanan di C4 (jari 1–5 = C D E F G). Hanya 4 nada untuk tangan kanan.',
    fpos: { R: 'C4' },
    R: 'E4/1 D4 C4 D4 | E4 E4 E4/2 | D4/1 D4 D4/2 | E4/1 G4 G4/2 | E4/1 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4/4',
    L: 'C3+G3/4 | C3+G3 | G2+F3 | C3+G3 | C3+G3 | C3+G3 | G2+F3 | C3+E3',
  },
  {
    id: 'twinkle', title: 'Twinkle Twinkle Little Star', by: 'Melodi Prancis abad 18', lvl: 'Pemula', bpm: 100, meter: 4, key: 'C',
    info: 'Lompatan kwint C → G pertama. Tangan kiri hanya satu nada per setengah birama.',
    R: 'C4/1 C4 G4 G4 | A4 A4 G4/2 | F4/1 F4 E4 E4 | D4 D4 C4/2 | G4/1 G4 F4 F4 | E4 E4 D4/2 | G4/1 G4 F4 F4 | E4 E4 D4/2 | C4/1 C4 G4 G4 | A4 A4 G4/2 | F4/1 F4 E4 E4 | D4 D4 C4/2',
    L: 'C3/4 | F3/2 C3 | F3 C3 | G3 C3 | C3 F3 | C3 G3 | C3 F3 | C3 G3 | C3/4 | F3/2 C3 | F3 C3 | G3 C3',
  },
  {
    id: 'ode', title: 'Ode to Joy', by: 'L. v. Beethoven (Simfoni no. 9)', lvl: 'Pemula', bpm: 100, meter: 4, key: 'C',
    info: 'Gerak melangkah (stepwise) — latihan legato. Perhatikan ritme titik (E4. D4).',
    fpos: { R: 'C4' },
    R: 'E4/1 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/.5 D4/2 | E4/1 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/.5 C4/2 | D4/1 D4 E4 C4 | D4 E4/.5 F4 E4/1 C4 | D4 E4/.5 F4 E4/1 D4 | C4 D4 G3/2 | E4/1 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/.5 C4/2',
    L: 'C3+G3/4 | G2+G3 | C3+G3 | G2+G3/2 G2+F3 | C3+G3/4 | G2+G3 | C3+G3 | G2+F3/2 C3+E3 | G2+G3/4 | G2+G3/2 C3+G3 | G2+G3/4 | C3+E3/2 G2+F3 | C3+G3/4 | G2+G3 | C3+G3 | G2+F3/2 C3+E3',
  },
  {
    id: 'saints', title: 'When the Saints Go Marching In', by: 'Spiritual Amerika', lvl: 'Pemula', bpm: 112, meter: 4, key: 'C',
    info: 'Masuk setelah istirahat (ketukan 1 kosong). Hitung "1-2-3-4" dengan metronom.',
    fpos: { R: 'C4' },
    R: 'r/1 C4/1 E4 F4 | G4/4 | r/1 C4/1 E4 F4 | G4/4 | r/1 C4/1 E4 F4 | G4/2 E4 | C4 E4 | D4/4 | r/1 E4/1 E4 D4 | C4/3 C4/1 | E4/2 G4/1 G4 | F4/4 | r/1 C4/1 E4 F4 | G4/2 E4 | C4 D4 | C4/4',
    L: 'C3+G3/4 | C3+G3 | C3+G3 | C3+G3 | C3+G3 | C3+G3 | C3+G3 | G2+F3 | C3+G3 | C3+A#3 | C3+A#3 | F3+A3 | C3+G3 | C3+G3 | G2+F3 | C3+E3+G3',
  },
  {
    id: 'jingle', title: 'Jingle Bells (reff)', by: 'J. L. Pierpont, 1857', lvl: 'Pemula+', bpm: 120, meter: 4, key: 'C',
    info: 'Not berulang dengan jari yang sama — jaga ketukan tetap rata.',
    fpos: { R: 'C4' },
    R: 'E4/1 E4 E4/2 | E4/1 E4 E4/2 | E4/1 G4 C4/1.5 D4/.5 | E4/4 | F4/1 F4 F4/1.5 F4/.5 | F4/1 E4 E4 E4/.5 E4 | E4/1 D4 D4 E4 | D4/2 G4 | E4/1 E4 E4/2 | E4/1 E4 E4/2 | E4/1 G4 C4/1.5 D4/.5 | E4/4 | F4/1 F4 F4 F4 | F4 E4 E4 E4/.5 E4 | G4/1 G4 F4 D4 | C4/4',
    L: 'C3+G3/4 | C3+G3 | C3+G3 | C3+G3 | F3+A3 | C3+G3 | D3+F#3 | G2+F3 | C3+G3 | C3+G3 | C3+G3 | C3+G3 | F3+A3 | C3+G3 | G2+F3 | C3+E3+G3',
  },
  {
    id: 'bday', title: 'Happy Birthday', by: 'Mildred & Patty Hill (domain publik)', lvl: 'Pemula+', bpm: 100, meter: 3, key: 'C',
    info: 'Birama 3/4 dengan ketukan gantung (pickup). Lompatan oktaf G4 → G5 di birama 5.',
    R: 'G4/.75 G4/.25 | A4/1 G4 C5 | B4/2 G4/.75 G4/.25 | A4/1 G4 D5 | C5/2 G4/.75 G4/.25 | G5/1 E5 C5 | B4 A4 F5/.75 F5/.25 | E5/1 C5 D5 | C5/3',
    L: 'r/1 | C3+G3/3 | G2+F3 | G2+F3 | C3+G3 | C3+G3 | F3+A3 | C3+G3/2 G2+F3/1 | C3+E3/3',
  },
  {
    id: 'grace', title: 'Amazing Grace', by: 'Lagu himne, 1779', lvl: 'Pemula+', bpm: 84, meter: 3, key: 'G',
    info: 'Birama 3/4 di G mayor (F♯). Mainkan legato dan bernyanyi di dalam hati.',
    R: 'D4/1 | G4/2 B4/.5 G4 | B4/2 A4/1 | G4/2 E4/1 | D4/2 D4/1 | G4/2 B4/.5 G4 | B4/2 A4/1 | D5/3 | D5/2 B4/1 | D5/2 B4/.5 G4 | B4/2 A4/1 | G4/2 E4/1 | D4/2 D4/1 | G4/2 B4/.5 G4 | B4/2 A4/1 | G4/3',
    L: 'r/1 | G2+D3/3 | G2+D3 | C3+G3 | G2+D3 | G2+D3 | D3+A3 | D3+A3 | G2+D3 | G2+D3 | D3+A3 | C3+G3 | G2+D3 | G2+D3 | D3+A3 | G2+D3+G3',
  },
  {
    id: 'canon', title: 'Canon in D (tema)', by: 'J. Pachelbel', lvl: 'Menengah', bpm: 72, meter: 4, key: 'D',
    info: 'Bass turun D–A–B–F♯–G–D–G–A, melodi turun bertahap. Tangan kiri pakai interval kwint.',
    R: 'F#5/2 E5 D5 C#5 B4 A4 B4 C#5 | D5 C#5 B4 A4 G4 F#4 G4 E4 | D4/1 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4 | F#4/4',
    L: 'D3+A3/2 A2+E3 B2+F#3 F#2+C#3 G2+D3 D2+A2 G2+D3 A2+E3 | D3+A3 A2+E3 B2+F#3 F#2+C#3 G2+D3 D2+A2 G2+D3 A2+E3 | D3+A3 A2+E3 B2+F#3 F#2+C#3 G2+D3 D2+A2 G2+D3 A2+E3 | D2+A2+D3/4',
  },
  {
    id: 'minuet', title: 'Minuet in G', by: 'C. Petzold (Buku Anna Magdalena Bach)', lvl: 'Menengah', bpm: 100, meter: 3, key: 'G',
    info: 'Not seperdelapan berjalan di tangan kanan; tangan kiri aransemen sederhana. Latih per tangan dulu.',
    R: 'D5/1 G4/.5 A4 B4 C5 | D5/1 G4 G4 | E5/1 C5/.5 D5 E5 F#5 | G5/1 G4 G4 | C5/1 D5/.5 C5 B4 A4 | B4/1 C5/.5 B4 A4 G4 | F#4/1 G4/.5 A4 B4 G4 | A4/3 | D5/1 G4/.5 A4 B4 C5 | D5/1 G4 G4 | E5/1 C5/.5 D5 E5 F#5 | G5/1 G4 G4 | C5/1 D5/.5 C5 B4 A4 | B4/1 C5/.5 B4 A4 G4 | A4/1 B4/.5 A4 G4 F#4 | G4/3',
    L: 'G3+B3+D4/2 A3/1 | B3/3 | C4/3 | B3/3 | A3/3 | G3/3 | D4/1 B3 G3 | D3+F#3+A3/3 | G3+B3+D4/2 A3/1 | B3/3 | C4/3 | B3/3 | A3/3 | G3/3 | C4/1 D4 D3 | G2+G3/3',
  },
  {
    id: 'green', title: 'Greensleeves', by: 'Lagu rakyat Inggris abad 16', lvl: 'Menengah', bpm: 92, meter: 3, key: 'Am',
    info: 'A minor dengan G♯ (minor harmonik). Ritme panjang-pendek (titik) khas balada.',
    R: 'A4/1 | C5/2 D5/1 | E5/1.5 F5/.5 E5/1 | D5/2 B4/1 | G4/1.5 A4/.5 B4/1 | C5/2 A4/1 | A4/1.5 G#4/.5 A4/1 | B4/2 G#4/1 | E4/2 A4/1 | C5/2 D5/1 | E5/1.5 F5/.5 E5/1 | D5/2 B4/1 | G4/1.5 A4/.5 B4/1 | C5/1.5 B4/.5 A4/1 | G#4/1.5 F#4/.5 G#4/1 | A4/3',
    L: 'r/1 | A2+E3/3 | C3+G3 | G2+D3 | E2+B2 | A2+E3 | A2+E3 | E2+B2 | E2+B2 | A2+E3 | C3+G3 | G2+D3 | E2+B2 | A2+E3 | E2+B2 | A2+E3+A3',
  },
  {
    id: 'elise', title: 'Für Elise (tema)', by: 'L. v. Beethoven', lvl: 'Menengah', bpm: 120, meter: 3, key: 'Am',
    info: 'Tempo dihitung per not seperdelapan. Tangan bergantian: kiri arpeggio, kanan melanjutkan. Jaga E–D♯ tetap ringan.',
    R: 'E5/.5 D#5 | E5 D#5 E5 B4 D5 C5 | A4/1 r/.5 C4/.5 E4 A4 | B4/1 r/.5 E4/.5 G#4 B4 | C5/1 r/.5 E4/.5 E5 D#5 | E5 D#5 E5 B4 D5 C5 | A4/1 r/.5 C4/.5 E4 A4 | B4/1 r/.5 E4/.5 C5 B4 | A4/3',
    L: 'r/1 | r/3 | A2/.5 E3 A3 r/1.5 | E2/.5 E3 G#3 r/1.5 | A2/.5 E3 A3 r/1.5 | r/3 | A2/.5 E3 A3 r/1.5 | E2/.5 E3 G#3 r/1.5 | A2+E3+A3/3',
  },
  {
    id: 'hanon', title: 'Hanon no. 1 (teknik)', by: 'C.-L. Hanon, 1873', lvl: 'Menengah', bpm: 72, meter: 4, key: 'C',
    info: 'Latihan kekuatan & kemandirian jari. Mulai 60 bpm, naikkan 4 bpm tiap hari hingga 108–120. Angkat jari, jaga pergelangan rileks.',
    gen: hanon1,
  },
];
export const SONG = Object.fromEntries(SONGS.map(s => [s.id, s]));
