import { $, esc } from '../util.js';
import { icon } from '../icons.js';
import { SONGS, SONG, songNotes } from '../songs.js';
import { Player } from '../player.js';
import { getBest } from '../progress.js';

export default {
  render(el, q) {
    const s = SONG[q._[0]] || null;
    if (!s) {
      el.innerHTML = `
      <div class="page-h"><h1>Belajar Lagu</h1><p>Lagu domain publik dengan not jatuh (falling notes). Mulai dengan mode <b>Dengar</b>, lalu <b>Tunggu</b> (lagu menunggu Anda menekan tuts yang benar), per tangan, lalu dua tangan, terakhir <b>Main + skor</b> di tempo penuh.</p></div>
      <div class="songs">${['Pemula', 'Pemula+', 'Menengah'].map(l => `<h2 class="tier-h">${l}</h2><div class="grid3">${SONGS.filter(x => x.lvl === l).map(x => {
        const b = getBest(`song:${x.id}:play:RL`) ?? getBest(`song:${x.id}:play:R`) ?? getBest(`song:${x.id}:wait:R`);
        return `<a class="song glass" href="#/lagu/${x.id}">${icon('music')}<div><b>${esc(x.title)}</b><span>${esc(x.by)}</span><small>${x.meter}/4 · ${x.bpm} bpm · ${x.key}${b != null ? ` · terbaik ${b}%` : ''}</small></div></a>`;
      }).join('')}</div>`).join('')}</div>
      <section class="card glass"><h2>Cara berlatih lagu baru</h2><ol class="list">
        <li><b>Dengar</b> 1–2 kali sambil mengikuti tuts yang menyala.</li>
        <li><b>Tunggu · tangan kanan</b> pada tempo 60–75% sampai tanpa salah.</li>
        <li><b>Tunggu · tangan kiri</b>, lalu <b>dua tangan</b>.</li>
        <li><b>Main + skor</b> dengan metronom; naikkan tempo bertahap sampai 100%.</li>
        <li>Bagian sulit? Geser penggeser posisi ke birama itu dan ulangi bagian itu saja.</li></ol></section>`;
      return;
    }
    el.innerHTML = `
      <div class="page-h row between"><div><a href="#/lagu" class="back">← Semua lagu</a><h1>${esc(s.title)}</h1><p>${esc(s.by)} · ${s.lvl} · ${s.meter}/4 · kunci ${s.key}</p></div></div>
      <div class="card glass"><p class="info">${esc(s.info)}</p><div id="pl"></div></div>`;
    const p = new Player($('#pl', el), { notes: songNotes(s), bpm: s.bpm, meter: s.meter, id: s.id });
    return () => p.destroy();
  },
};
