// Gambar paranada (kunci G / F / grand staff) sebagai SVG.
const LET_PC = [0, 2, 4, 5, 7, 9, 11];
const GAP = 12;

// eja MIDI → {L, oct, acc}; preferFlat memilih ♭ untuk tuts hitam
export function spellMidi(m, preferFlat = false) {
  const pc = m % 12, oct = Math.floor(m / 12) - 1;
  let L = LET_PC.indexOf(pc), acc = 0;
  if (L < 0) { if (preferFlat) { L = LET_PC.indexOf(pc + 1); acc = -1; } else { L = LET_PC.indexOf(pc - 1); acc = 1; } }
  return { L, oct, acc };
}
const stepOf = n => n.oct * 7 + n.L;

export function staffSVG({ clef = 'treble', notes = [], width = 300, color = 'currentColor', hl = null }) {
  const grand = clef === 'grand';
  const padTop = 46;
  const trebleTop = padTop, trebleBottom = trebleTop + GAP * 4;
  const bassTop = grand ? trebleBottom + GAP * 6 : padTop, bassBottom = bassTop + GAP * 4;
  const H = (grand ? bassBottom : (clef === 'treble' ? trebleBottom : bassBottom)) + 50;
  let s = `<svg class="staff" viewBox="0 0 ${width} ${H}" width="100%" style="max-width:${width * 1.6}px" role="img" aria-label="paranada">`;
  const lines = (top) => { for (let i = 0; i < 5; i++) s += `<line x1="8" x2="${width - 8}" y1="${top + i * GAP}" y2="${top + i * GAP}" stroke="${color}" stroke-width="1.2" opacity=".75"/>`; };
  if (clef === 'treble' || grand) { lines(trebleTop); s += `<text x="12" y="${trebleBottom - GAP + 1}" class="clef" font-size="${GAP * 5.6}" fill="${color}">𝄞</text>`; }
  if (clef === 'bass' || grand) { lines(bassTop); s += `<text x="14" y="${bassTop + GAP * 3 + 2}" class="clef" font-size="${GAP * 3.4}" fill="${color}">𝄢</text>`; }
  if (grand) s += `<line x1="8" x2="8" y1="${trebleTop}" y2="${bassBottom}" stroke="${color}" stroke-width="2"/>`;

  const xs = notes.length <= 1 ? [width * 0.58] : notes.map((_, i) => 90 + i * ((width - 120) / Math.max(1, notes.length - 1)));
  notes.forEach((n, i) => {
    const st = stepOf(n);
    const onTreble = clef === 'treble' || (grand && (n.staff ? n.staff === 'treble' : st >= 28));
    const refStep = onTreble ? 30 : 18; // E4 / G2 garis bawah
    const bottom = onTreble ? trebleBottom : bassBottom;
    const y = bottom - (st - refStep) * GAP / 2;
    const x = n.x ?? xs[i];
    const col = n.color || (hl === i ? 'var(--accent)' : color);
    // garis bantu
    for (let ls = refStep - 2; ls >= st; ls -= 2) { const ly = bottom - (ls - refStep) * GAP / 2; s += `<line x1="${x - 13}" x2="${x + 13}" y1="${ly}" y2="${ly}" stroke="${color}" stroke-width="1.2"/>`; }
    for (let ls = refStep + 10; ls <= st; ls += 2) { const ly = bottom - (ls - refStep) * GAP / 2; s += `<line x1="${x - 13}" x2="${x + 13}" y1="${ly}" y2="${ly}" stroke="${color}" stroke-width="1.2"/>`; }
    if (n.acc) s += `<text x="${x - 24}" y="${y + 5}" font-size="18" fill="${col}" class="acc">${n.acc > 0 ? '♯' : '♭'}</text>`;
    s += `<ellipse cx="${x}" cy="${y}" rx="7.4" ry="5.4" transform="rotate(-20 ${x} ${y})" fill="${col}"/>`;
    if (n.stem !== false && notes.length > 1 && !n.chord) {
      const up = st < refStep + 4;
      s += up ? `<line x1="${x + 6.6}" x2="${x + 6.6}" y1="${y - 1}" y2="${y - 36}" stroke="${col}" stroke-width="1.4"/>` : `<line x1="${x - 6.6}" x2="${x - 6.6}" y1="${y + 1}" y2="${y + 36}" stroke="${col}" stroke-width="1.4"/>`;
    }
    if (n.label) s += `<text x="${x}" y="${H - 14}" font-size="12" text-anchor="middle" fill="${col}" class="nl">${n.label}</text>`;
  });
  return s + '</svg>';
}
