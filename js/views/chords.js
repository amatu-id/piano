import { $, $$, esc, store } from '../util.js';
import { icon } from '../icons.js';
import { audio } from '../audio.js';
import { Piano, miniKeys } from '../piano.js';
import { CHORDS, CHORD, CATS, ROOTS, IV, nice, pcOf, chordName, chordSpell, ivLabel, voice, voicingList, midiName, rootBase } from '../theory.js';

export default {
  render(el, q) {
    let root = q.root || store.get('chRoot', 'C');
    let cat = q.cat || 'all';
    let sel = q.id && CHORD[q.id] ? q.id : 'maj';
    let vid = 'root';
    let mode = q.view || 'tabel';
    let search = '';

    el.innerHTML = `
    <div class="page-h"><h1>Kamus Chord Piano</h1><p>${CHORDS.length} jenis chord dari triad dasar sampai jazz altered, di 12 kunci. Klik baris untuk melihat di keyboard, mendengar, dan mencoba inversi serta voicing.</p></div>
    <div class="card glass sticky-detail" id="det"></div>
    <div class="card glass">
      <div class="roots" id="roots">${ROOTS.map(r => `<button data-r="${r}">${nice(r)}</button>`).join('')}</div>
      <div class="toolbar">
        <div class="seg" id="cats"><button data-c="all">Semua</button>${Object.entries(CATS).map(([k, c]) => `<button data-c="${k}">${c.name}</button>`).join('')}</div>
        <input type="search" id="q" placeholder="Cari: m7, sus, 13, altered…" class="search">
        <div class="seg" id="mode"><button data-m="tabel">Tabel</button><button data-m="grid">12 kunci</button></div>
      </div>
      <div id="tbl" class="tblwrap"></div>
    </div>
    <div class="card glass">
      <h2>Cara membaca simbol chord</h2>
      <div class="grid3 small">
        <div><h3>Huruf besar = akar</h3><p><b>C</b>, <b>F♯</b>, <b>B♭</b> adalah nada dasar. Tanpa akhiran berarti mayor.</p></div>
        <div><h3>m / − = minor</h3><p><b>Cm</b> = C minor. <b>maj7 / Δ</b> = septim besar, sedangkan <b>7</b> saja = septim kecil (dominan).</p></div>
        <div><h3>Angka = nada tambahan</h3><p><b>9, 11, 13</b> ditumpuk di atas septim. <b>add9</b> = tanpa septim. <b>♭ / ♯</b> = nada diturunkan/dinaikkan.</p></div>
        <div><h3>sus = terts diganti</h3><p><b>sus2</b> / <b>sus4</b>: terts diganti nada 2 atau 4.</p></div>
        <div><h3>Garis miring = bass</h3><p><b>C/E</b> = chord C dengan nada E di bass (inversi 1). <b>D/C</b> = chord D di atas bass C.</p></div>
        <div><h3>° dan ø</h3><p><b>°7</b> = diminished 7, <b>ø7</b> = half-diminished (m7♭5).</p></div>
      </div>
    </div>`;

    const det = $('#det', el);
    det.innerHTML = `<div class="det-top"><div><div class="big" id="dname"></div><div class="muted" id="dsub"></div></div>
      <div class="det-act">
        <button class="btn pri" id="pBlock">${icon('play')} Blok</button>
        <button class="btn" id="pArp">${icon('play')} Arpeggio</button>
        <button class="btn" id="pStrum">${icon('play')} Strum</button>
        <button class="btn" id="pInv">${icon('repeat')} Semua posisi</button>
        <a class="btn ghost" id="drill">Latih →</a>
      </div></div>
      <div class="det-body"><div class="tones" id="tones"></div><p class="info" id="dinfo"></p></div>
      <div class="vchips" id="vch"></div>
      <div id="dkb" class="kb-mid"></div>`;
    const kb = new Piano($('#dkb', det), { from: 36, to: 88, labels: 'c', height: 150, minW: 22, caps: false });

    const notesNow = () => voice(pcOf(root), CHORD[sel], vid);
    const showDetail = (play = false) => {
      const c = CHORD[sel];
      if (!voicingList(c).some(v => v[0] === vid)) vid = 'root';
      $('#dname', det).textContent = chordName(root, c);
      $('#dsub', det).innerHTML = `${esc(c.name)} · <span class="badge b-${CATS[c.cat].color}">${CATS[c.cat].lvl}</span>${c.other ? ` · notasi lain: ${esc(c.other)}` : ''}`;
      const sp = chordSpell(root, c);
      $('#tones', det).innerHTML = c.iv.map((iv, i) => `<div class="tone ${iv === '1' ? 'r' : ''}"><b>${sp[i]}</b><span>${ivLabel(iv)}</span><small>${IV[iv]} st</small></div>`).join('');
      $('#dinfo', det).textContent = c.info;
      $('#vch', det).innerHTML = voicingList(c).map(([id, l]) => `<button data-v="${id}" class="${id === vid ? 'on' : ''}">${l}</button>`).join('');
      const ns = notesNow();
      const byPc = new Map(c.iv.map((iv, i) => [(pcOf(root) + IV[iv]) % 12, sp[i]]));
      kb.mark(new Map(ns.map(m => [m, { cls: m % 12 === pcOf(root) ? 'root' : 'tone', text: byPc.get(m % 12) || midiName(m).replace(/-?\d/, '') }])));
      $('#drill', det).href = `#/latihan/drill?chord=${sel}&root=${encodeURIComponent(root)}`;
      $$('#roots button', el).forEach(b => b.classList.toggle('on', b.dataset.r === root));
      $$('#tbl tr[data-id]', el).forEach(r => r.classList.toggle('sel', r.dataset.id === sel));
      kb.scrollTo(Math.round((Math.min(...ns) + Math.max(...ns)) / 2));
      if (play) audio.chord(ns, 1.8, null, 0.72, 0.012);
    };
    $('#vch', det).onclick = e => { const b = e.target.closest('button'); if (!b) return; vid = b.dataset.v; showDetail(true); };
    $('#pBlock', det).onclick = () => audio.chord(notesNow(), 2, null, 0.72, 0.01);
    $('#pArp', det).onclick = () => { const ns = notesNow(); audio.arp([...ns, ...ns.slice(0, -1).reverse()], 0.16, null, 0.65, 0.6); };
    $('#pStrum', det).onclick = () => audio.chord(notesNow(), 2.4, null, 0.7, 0.06);
    $('#pInv', det).onclick = () => {
      const vs = voicingList(CHORD[sel]); let t = audio.now() + 0.05;
      vs.forEach(([id], i) => {
        const ns = voice(pcOf(root), CHORD[sel], id);
        audio.chord(ns, 1.0, t + i * 1.1, 0.68, 0.01);
        setTimeout(() => { vid = id; showDetail(); }, i * 1100);
      });
    };

    const rows = () => CHORDS.filter(c => (cat === 'all' || c.cat === cat) && (!search || (c.sym + ' ' + c.name + ' ' + c.other + ' ' + c.id).toLowerCase().includes(search)));
    const renderTable = () => {
      const tb = $('#tbl', el);
      if (mode === 'grid') {
        tb.innerHTML = `<table class="tbl grid"><thead><tr><th>Jenis</th>${ROOTS.map(r => `<th>${nice(r)}</th>`).join('')}</tr></thead><tbody>${rows().map(c => `<tr><th><b>${c.sym || 'maj'}</b><small>${esc(c.name)}</small></th>${ROOTS.map(r => `<td data-r="${r}" data-c="${c.id}" class="${r === root && c.id === sel ? 'sel' : ''}"><b>${chordName(r, c)}</b><span>${chordSpell(r, c).join(' ')}</span></td>`).join('')}</tr>`).join('')}</tbody></table>`;
        return;
      }
      let lastCat = null;
      tb.innerHTML = `<table class="tbl"><thead><tr><th>Chord</th><th>Nama</th><th>Rumus</th><th>Nada</th><th class="hide-s">Keyboard</th><th class="hide-s">Notasi lain</th><th></th></tr></thead><tbody>${rows().map(c => {
        let h = '';
        if (c.cat !== lastCat) { lastCat = c.cat; h += `<tr class="grp"><td colspan="7"><span class="badge b-${CATS[c.cat].color}">${CATS[c.cat].lvl}</span> ${CATS[c.cat].name}</td></tr>`; }
        const ns = c.iv.map(iv => rootBase(pcOf(root)) + IV[iv]);
        return h + `<tr data-id="${c.id}" class="${c.id === sel ? 'sel' : ''}"><td class="sym">${chordName(root, c)}</td><td>${esc(c.name)}</td><td class="mono">${c.iv.map(ivLabel).join(' – ')}</td><td class="notes">${chordSpell(root, c).join(' ')}</td><td class="hide-s">${miniKeys(ns, Math.floor(rootBase(pcOf(root)) / 12) * 12, Math.floor(rootBase(pcOf(root)) / 12) * 12 + 35, pcOf(root))}</td><td class="hide-s muted">${esc(c.other)}</td><td><button class="ib sm" data-play="${c.id}" title="Dengar">${icon('play')}</button></td></tr>`;
      }).join('')}</tbody></table>`;
    };
    $('#tbl', el).onclick = e => {
      const p = e.target.closest('[data-play]');
      if (p) { e.stopPropagation(); const c = CHORD[p.dataset.play]; audio.chord(voice(pcOf(root), c, 'root'), 1.6, null, 0.7, 0.01); return; }
      const td = e.target.closest('td[data-c]');
      if (td) { root = td.dataset.r; sel = td.dataset.c; vid = 'root'; store.set('chRoot', root); $$('td.sel', el).forEach(x => x.classList.remove('sel')); td.classList.add('sel'); showDetail(true); return; }
      const tr = e.target.closest('tr[data-id]');
      if (tr) { sel = tr.dataset.id; vid = 'root'; showDetail(true); det.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    };
    $('#roots', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; root = b.dataset.r; store.set('chRoot', root); renderTable(); showDetail(true); };
    const setSeg = () => { $$('#cats button', el).forEach(b => b.classList.toggle('on', b.dataset.c === cat)); $$('#mode button', el).forEach(b => b.classList.toggle('on', b.dataset.m === mode)); };
    $('#cats', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; setSeg(); renderTable(); };
    $('#mode', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; setSeg(); renderTable(); };
    $('#q', el).oninput = e => { search = e.target.value.trim().toLowerCase(); renderTable(); };
    setSeg(); renderTable(); showDetail();
    return () => kb.destroy();
  },
};
