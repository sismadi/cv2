/**
 * Laporan Termin & Monev (Monitoring dan Evaluasi) — Pedoman PPM, diagram alur langkah 7 & 11.
 * Alur: dana termin dicairkan -> dosen (ketua) mengisi laporan termin -> reviewer/admin melakukan monev
 *       -> laporan termin + hasil monev diunduh sebagai PDF.
 * Memakai helper global dari index.html (C, U, save, modal, inp, ta, fs, vis, owner, rp, esc, warn, note, ...).
 * Data: tabel `monev` (satu baris per termin; id baris dibuat saat laporan pertama kali dikirim).
 */

/* Kriteria monev: "dilaksanakan berdasarkan kejelasan tujuan dan hasil" (pedoman). Ubah di sini bila rubrik berubah. */
const KRIT = [
  ['tujuan', 'Kejelasan tujuan dan hasil'],
  ['capaian', 'Capaian kegiatan sesuai jadwal'],
  ['anggaran', 'Kesesuaian penggunaan anggaran'],
  ['dokumen', 'Kelengkapan dokumen dan bukti'],
];
const REKM = ['Lanjutkan', 'Lanjutkan dengan perbaikan', 'Hentikan / evaluasi ulang'];
const MVST = {
  none: ['Dana belum cair', '#8a97a3'],
  belum: ['Belum lapor', '#6b7a88'],
  menunggu: ['Menunggu monev', '#b7791f'],
  selesai: ['Sudah dimonev', '#1e7e34'],
};

const today = () => new Date().toISOString().slice(0, 10);
const mvOf = (t) => C.monev.find((m) => m.termin_id === t.id);
const mvStat = (t, m = mvOf(t)) => t.status !== 'dicairkan' ? 'none' : !m || !m.uraian ? 'belum' : m.nilai == null ? 'menunggu' : 'selesai';
const terminRows = () => {
  const ids = new Set(vis().map((p) => p.id));
  return C.termin.filter((t) => ids.has(t.proposal_id)).sort((a, b) => a.proposal_id.localeCompare(b.proposal_id) || a.termin - b.termin);
};
const terminCtx = (tid) => {
  const t = C.termin.find((x) => x.id === tid);
  return { t, p: C.proposal.find((x) => x.id === t.proposal_id), m: mvOf(t) || {} };
};

/* ---- Tampilan daftar laporan termin ---- */
function monev() {
  const all = terminRows(), f = q.mf || '', l = all.filter((t) => !f || mvStat(t) === f);
  const ev = ['reviewer', 'admin'].includes(U.role);
  const rows = l.map((t) => {
    const p = C.proposal.find((x) => x.id === t.proposal_id), m = mvOf(t), st = mvStat(t), acts = [];
    if (owner(p) && U.role !== 'reviewer' && ['belum', 'menunggu'].includes(st)) acts.push(`<button class="btn sm" onclick="isiLaporan('${t.id}')">${m?.uraian ? 'Ubah' : 'Isi'} laporan</button>`);
    if (ev && ['menunggu', 'selesai'].includes(st)) acts.push(`<button class="btn sm p" onclick="isiMonev('${t.id}')">${st === 'selesai' ? 'Ubah monev' : 'Monev'}</button>`);
    if (m?.uraian) acts.push(`<button class="btn sm" onclick="unduhTermin('${t.id}')">PDF</button>`);
    return `<tr><td>${esc(p.judul)}</td><td>${SK[p.skema].n}</td><td>T${t.termin} (${t.persen.toFixed(0)}%)</td><td>${rp(t.jumlah)}</td>
      <td>${chip(MVST, st)}</td><td>${m?.nilai != null ? `<b>${m.nilai}</b> · ${esc(m.rekomendasi)}` : '–'}</td><td class="act">${acts.join(' ')}</td></tr>`;
  }).join('');
  return `<div class="stats">${Object.entries(MVST).map(([k, v]) => `<div class="panel stat"><b>${all.filter((t) => mvStat(t) === k).length}</b>${v[0]}</div>`).join('')}</div>
  <form class="bar" onsubmit="return false"><select onchange="q.mf=this.value;rerender(monev)"><option value="">Semua status</option>${Object.entries(MVST).map(([k, v]) => `<option value="${k}" ${f === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
  <span>Alur: dana termin cair → ketua mengisi laporan → reviewer/admin monev → unduh PDF.</span></form>
  <div class="tw"><table><thead><tr><th>Proposal</th><th>Skema</th><th>Termin</th><th>Dana</th><th>Status</th><th>Nilai monev</th><th>Aksi</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="7">Belum ada termin. Muat data demo di menu Basis Data (admin).</td></tr>'}</tbody></table></div>`;
}

/* ---- Form laporan termin (ketua) ---- */
async function isiLaporan(tid) {
  const { t, p, m } = terminCtx(tid);
  if (m.nilai != null) return warn('Laporan ini sudah dimonev dan tidak dapat diubah.');
  const d = await modal({
    t: `Laporan Termin ${t.termin}`, ok: 'Kirim laporan',
    html: `<p><b>${esc(p.judul)}</b><br>Dana termin: ${rp(t.jumlah)}<br><small>${TSYARAT[t.termin - 1]}</small></p>
      ${ta('Uraian kemajuan kegiatan', 'uraian', m.uraian, 5)}${inp('Realisasi penggunaan dana (Rp)', 'realisasi', m.realisasi ?? '', 'number', 'min=0 required')}${ta('Kendala / tindak lanjut', 'kendala', m.kendala, 3)}`,
    chk: (x) => !x.uraian.trim() ? 'Uraian kemajuan wajib diisi.' : x.realisasi === '' || +x.realisasi < 0 ? 'Isi realisasi dana (≥ 0).' : +x.realisasi > t.jumlah ? 'Realisasi melebihi dana termin.' : '',
  });
  if (!d) return;
  await save('monev', { ...m, id: m.id || uid(), proposal_id: p.id, termin_id: t.id, termin: t.termin, uraian: d.uraian.trim(), realisasi: +d.realisasi, kendala: d.kendala.trim(), tgl_lapor: today() });
  go('monev');
}

/* ---- Form monev (reviewer / admin) ---- */
async function isiMonev(tid) {
  const { t, p, m } = terminCtx(tid), dt = JSON.parse(m.detail || '{}');
  if (!m.uraian) return warn('Ketua belum mengirim laporan termin ini.');
  const d = await modal({
    t: `Monev Termin ${t.termin}`, ok: 'Simpan monev',
    html: `<p><b>${esc(p.judul)}</b><br>Realisasi: ${rp(m.realisasi)} dari ${rp(t.jumlah)}</p><p>${esc(m.uraian)}</p>${m.kendala ? `<p><small>Kendala: ${esc(m.kendala)}</small></p>` : ''}
      ${KRIT.map(([k, l]) => inp(`${l} (0–100)`, 's_' + k, dt[k] ?? '', 'number', 'min=0 max=100 required')).join('')}
      <div class="fg"><label>Rekomendasi</label>${fs('rek', REKM, m.rekomendasi)}</div>${ta('Catatan monev', 'cat', m.catatan, 3)}`,
    chk: (x) => KRIT.some(([k]) => x['s_' + k] === '' || +x['s_' + k] < 0 || +x['s_' + k] > 100) ? 'Semua skor harus 0–100.' : '',
  });
  if (!d) return;
  const detail = Object.fromEntries(KRIT.map(([k]) => [k, +d['s_' + k]]));
  const nilai = Math.round(Object.values(detail).reduce((a, b) => a + b, 0) / KRIT.length * 10) / 10;
  await save('monev', { ...m, detail: JSON.stringify(detail), nilai, rekomendasi: d.rek, catatan: d.cat.trim(), penilai_id: U.id, tgl_monev: today() });
  go('monev');
}

/* ---- Adapter ke PDFLaporan (template 'termin') ---- */
function unduhTermin(tid) {
  const { t, p, m } = terminCtx(tid), pf = full(p.id), s = SK[p.skema];
  try {
    PDFLaporan.download({
      jenis: 'termin', p: pf, s, bab: BAB[s.bab], rab: RAB, t, krit: KRIT, syarat: TSYARAT[t.termin - 1],
      termin: C.termin.filter((x) => x.proposal_id === p.id).sort((a, b) => a.termin - b.termin),
      mv: { ...m, detail: JSON.parse(m.detail || '{}') }, penilai: C.users.find((u) => u.id === m.penilai_id)?.nama || '',
    });
  } catch (e) { console.error(e); warn('Gagal membuat PDF: ' + e.message); }
}
