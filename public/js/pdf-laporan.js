/**
 * PDFLaporan — pembuat PDF Proposal & Laporan Akhir PPM (Pedoman PPM Universitas IPWIJA 2023)
 * Dependensi: jsPDF (window.jspdf). Murni client-side, tanpa akses DOM/DB: data dikirim lewat model.
 *
 * Pemakaian:
 *   await PDFLaporan.download({ jenis:'proposal'|'laporan', p, s, bab, rab, termin, review })
 *     p      : proposal lengkap { judul, tahun, semester, anggaran, jml_mahasiswa, mitra, isi:{...}, ag:[...] }
 *     s      : konfigurasi skema (SK[p.skema])
 *     bab    : daftar bab [[kunci,label],...]    rab: [[kunci,label],...]
 *     termin : baris termin proposal             review: baris review proposal
 *
 * Menambah jenis dokumen baru = tambah entri di TEMPLATES + (jika perlu) fungsi di SECTIONS.
 */
(() => {
  const CFG = {
    page: { w: 210, h: 297 },
    m: { l: 30, r: 25, t: 25, b: 25 },          // margin mm (A4)
    font: 'times', size: 12, lh: 1.5, pt: 0.3528, // Times New Roman 12, spasi 1,5 (pedoman)
    univ: 'UNIVERSITAS IPWIJA',
    kota: 'Jakarta',
    kepalaLppm: 'Dr. Ir. Titing Widyastuti, MM.',
    logo: { src: '/img/logo-ipwija.png', size: 32, y: 20 }, // logo Universitas IPWIJA di sampul (mm)
  };

  /* ---------- logo (dimuat sekali, lalu dipakai ulang oleh semua sampul) ---------- */
  let logoData = null, logoJob = null;
  const loadLogo = () => logoJob || (logoJob = fetch(CFG.logo.src)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((b) => new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(b); }))
    .then((d) => (logoData = d))
    .catch((e) => { logoJob = null; console.warn('Logo sampul tidak termuat:', e.message); return null; }));

  /* ---------- util ---------- */
  // Font standar PDF hanya mendukung Latin-1 + tanda baca umum; karakter lain diganti agar tidak rusak.
  const clean = (s) => String(s ?? '')
    .replace(/→/g, '->').replace(/[✔✘]/g, '')
    .replace(/[^\n\t\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, '?');
  const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  const tglID = (d = new Date()) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'dokumen';
  const bersih = (label) => label.split('(')[0].trim();           // "Bab 1. Pendahuluan (…)" -> "Bab 1. Pendahuluan"
  const baris = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

  /* ---------- penulis dokumen (pagination, teks, tabel, daftar isi) ---------- */
  class Writer {
    constructor() {
      const { jsPDF } = window.jspdf;
      this.d = new jsPDF({ unit: 'mm', format: 'a4' });
      this.cw = CFG.page.w - CFG.m.l - CFG.m.r;
      this.toc = [];
      this.style();
      this.y = CFG.m.t;
    }
    style(bold = false, size = CFG.size, lh = CFG.lh) {
      this.size = size; this.lh = lh;
      this.d.setFont(CFG.font, bold ? 'bold' : 'normal');
      this.d.setFontSize(size);
    }
    get lineH() { return this.size * CFG.pt * this.lh; }
    get pages() { return this.d.internal.getNumberOfPages(); }
    addPage() { this.d.addPage(); this.y = CFG.m.t; }
    room(h) { if (this.y + h > CFG.page.h - CFG.m.b) this.addPage(); }
    gap(mm) { this.y += mm; }
    split(text, width = this.cw) { return this.d.splitTextToSize(clean(text), width); }

    /** Paragraf (mendukung \n). align: left|center */
    para(text, { bold = false, size = CFG.size, align = 'left', indent = 0, lh = CFG.lh } = {}) {
      this.style(bold, size, lh);
      const x = align === 'center' ? CFG.page.w / 2 : CFG.m.l + indent;
      for (const ln of baris(text).length ? baris(text) : ['']) {
        for (const l of this.split(ln, this.cw - indent)) {
          this.room(this.lineH);
          this.d.text(l, x, this.y + this.lineH * 0.75, align === 'center' ? { align: 'center' } : undefined);
          this.y += this.lineH;
        }
      }
      this.style();
    }

    /** Judul bab (masuk daftar isi bila level ≤ 2) */
    heading(text, level = 1) {
      this.room(this.lineH * 3);
      if (level === 1) this.toc.push({ t: text, p: this.pages, lv: 1 });
      this.para(text, { bold: true, lh: 1.3 });
      this.gap(1.5);
    }

    /** Tabel sederhana: cols=[{w:fraksi, al:'l'|'r'|'c'}], rows=[[sel,...]]; baris pertama = header bila head */
    table(cols, rows, { head = true } = {}) {
      const pad = 1.8, sz = 11, W = cols.map((c) => c.w * this.cw);
      const xs = []; W.reduce((acc, w, i) => (xs[i] = acc, acc + w), CFG.m.l);
      const draw = (r, bold) => {
        this.style(bold, sz, 1.2);
        const cells = r.map((c, i) => this.split(c, W[i] - pad * 2));
        const h = Math.max(...cells.map((c) => c.length)) * this.lineH + pad * 2;
        this.room(h);
        cells.forEach((ls, i) => {
          this.d.rect(xs[i], this.y, W[i], h);
          const al = cols[i].al || 'l';
          const x = al === 'r' ? xs[i] + W[i] - pad : al === 'c' ? xs[i] + W[i] / 2 : xs[i] + pad;
          ls.forEach((l, k) => this.d.text(l, x, this.y + pad + this.lineH * (k + 0.75), al === 'l' ? undefined : { align: al === 'r' ? 'right' : 'center' }));
        });
        this.y += h;
      };
      rows.forEach((r, i) => draw(r, head && i === 0));
      this.style(); this.gap(3);
    }

    /** Pasangan label : nilai (halaman pengesahan) */
    kv(rows, labW = 62) {
      for (const [k, v] of rows) {
        const ls = this.split(v || '-', this.cw - labW - 4), n = ls.length;
        this.room(this.lineH * n);
        this.d.text(clean(k), CFG.m.l, this.y + this.lineH * 0.75);
        this.d.text(':', CFG.m.l + labW, this.y + this.lineH * 0.75);
        ls.forEach((l, i) => this.d.text(l, CFG.m.l + labW + 4, this.y + this.lineH * (i + 0.75)));
        this.y += this.lineH * n;
      }
    }

    /** Daftar isi dengan titik-titik penghantar, ditulis ulang di halaman yang dicadangkan */
    paintToc(page) {
      this.d.setPage(page); this.y = CFG.m.t; this.style();
      this.para('DAFTAR ISI', { bold: true, align: 'center' }); this.gap(4);
      for (const e of this.toc) {
        const num = String(e.p), wNum = this.d.getTextWidth(num), wDot = this.d.getTextWidth('.');
        const lbl = this.split(e.t, this.cw - wNum - 6)[0];
        const dots = Math.max(2, Math.floor((this.cw - this.d.getTextWidth(lbl) - wNum - 3) / wDot));
        this.room(this.lineH);
        this.d.text(lbl + ' ' + '.'.repeat(dots), CFG.m.l, this.y + this.lineH * 0.75);
        this.d.text(num, CFG.page.w - CFG.m.r, this.y + this.lineH * 0.75, { align: 'right' });
        this.y += this.lineH;
      }
    }

    /** Nomor halaman di bawah tengah, kecuali sampul */
    numberPages() {
      this.style(false, 10, 1);
      for (let i = 2; i <= this.pages; i++) {
        this.d.setPage(i);
        this.d.text(String(i), CFG.page.w / 2, CFG.page.h - 12, { align: 'center' });
      }
    }
  }

  /* ---------- bagian dokumen (Lampiran 1–3 pedoman) ---------- */
  const judulDok = (m) => m.jenis === 'termin' ? [`LAPORAN TERMIN KE-${m.t.termin}`, 'MONITORING DAN EVALUASI'] : [{ proposal: 'PROPOSAL', laporan: 'LAPORAN AKHIR' }[m.jenis]];
const predikat = (n) => n >= 85 ? 'Sangat Baik' : n >= 70 ? 'Baik' : n >= 55 ? 'Cukup' : 'Kurang';

  const SECTIONS = {
    /** Sampul — Lampiran 1 (proposal) / Lampiran 3 (laporan akhir) */
    cover(w, m) {
      const { p, s, k } = m;
      if (logoData) {
        const { size, y } = CFG.logo;
        w.d.addImage(logoData, 'PNG', (CFG.page.w - size) / 2, y, size, size);
      }
      w.y = 62;
      judulDok(m).forEach((t) => w.para(t, { bold: true, size: 16, align: 'center', lh: 1.4 }));
      w.para(s.n.toUpperCase(), { bold: true, size: 16, align: 'center', lh: 1.4 });
      w.para(CFG.univ, { bold: true, size: 16, align: 'center', lh: 1.4 });
      w.gap(30);
      w.para(p.judul.toUpperCase(), { bold: true, size: 14, align: 'center', lh: 1.4 });
      w.gap(30);
      if (m.jenis === 'laporan') {
        w.para('TIM PENGUSUL', { bold: true, align: 'center' });
        const tim = [`${k.nama} (Ketua) - SINTA ID ${k.sinta || '-'}`, ...p.ag.map((a) => `${a.nama} (Anggota) - SINTA ID ${a.sinta || '-'}`)];
        tim.forEach((t) => w.para(t, { align: 'center', lh: 1.2 }));
        w.gap(20);
      }
      w.y = Math.max(w.y, 215);
      w.para(`PROGRAM STUDI ${(k.prodi || '').toUpperCase()}`, { bold: true, align: 'center', lh: 1.4 });
      w.para(CFG.univ, { bold: true, align: 'center', lh: 1.4 });
      w.para(String(p.tahun || ''), { bold: true, align: 'center', lh: 1.4 });
    },

    /** Halaman pengesahan — Lampiran 2 */
    pengesahan(w, m) {
      const { p, s, i, k } = m;
      w.addPage();
      w.para('HALAMAN PENGESAHAN', { bold: true, align: 'center', lh: 1.3 });
      w.para(s.n.toUpperCase(), { bold: true, align: 'center', lh: 1.3 });
      w.para(CFG.univ, { bold: true, align: 'center', lh: 1.3 });
      w.gap(5);
      w.style(false, 11, 1.35);
      w.kv([['Judul', p.judul], ['Manfaat sosial ekonomi', i.manfaat]]);
      w.kv([['Ketua', ''], ['  a. Nama Lengkap', k.nama], ['  b. Jabatan Fungsional', k.jab], ['  c. Program Studi', k.prodi],
        ['  d. SINTA ID', k.sinta], ['  e. Nomor HP', k.hp], ['  f. Alamat surel (e-mail)', k.email]]);
      p.ag.forEach((a, n) => w.kv([[`Anggota (${n + 1})`, ''], ['  a. Nama Lengkap', a.nama], ['  b. SINTA ID', a.sinta], ['  c. Program Studi', a.prodi]]));
      w.kv([['Jumlah mahasiswa yang terlibat', String(p.jml_mahasiswa ?? 0)], ['Jumlah alumni yang terlibat', String(i.alumni || 0)],
        ['Lokasi kegiatan', i.lokasi], ['Lama kegiatan', s.dur], ['Biaya', rp(p.anggaran)], ['Sumber dana', 'Universitas IPWIJA']]);
      w.gap(6);
      w.style(false, 11, 1.35);
      w.para(`${CFG.kota}, ${tglID()}`, { size: 11, align: 'left', indent: 100, lh: 1.35 });
      w.gap(1);
      const y0 = w.y, half = w.cw / 2, sz = 11;
      const blok = (x, jabatan, nama) => {
        w.d.text(clean(jabatan), x, y0 + 5);
        w.d.text(clean(nama), x, y0 + 36);
        w.d.text('NIDN', x, y0 + 41);
      };
      w.d.setFontSize(sz);
      blok(CFG.m.l, 'Ketua Pengusul,', k.nama);
      blok(CFG.m.l + half, 'Menyetujui,\nKepala LPPM Universitas IPWIJA,', CFG.kepalaLppm);
      w.y = y0 + 46; w.style();
    },

    /** Penanda halaman daftar isi (diisi di akhir) */
    toc(w, m) { w.addPage(); m._tocPage = w.pages; w.addPage(); },

    ringkasan(w, m) {
      w.heading(bersih(m.s.rk[0]).toUpperCase());
      w.para(m.i.ringkasan || '-');
      w.gap(2);
    },

    bab(w, m) {
      m.bab.forEach(([key, label]) => {
        w.heading(bersih(label).toUpperCase());
        w.para(m.i.bab?.[key] || '-');
        w.gap(2);
      });
    },

    /** Bab RAB + jadwal (4.1 & 4.2 pedoman) */
    rabJadwal(w, m) {
      w.heading(`BAB ${m.n()}. RENCANA ANGGARAN BIAYA DAN JADWAL`);
      SECTIONS._rab(w, m, '4.1. Rencana Anggaran Biaya');
      SECTIONS._jadwal(w, m, '4.2. Jadwal Pelaksanaan');
    },

    _rab(w, m, judul) {
      w.para(judul, { bold: true, lh: 1.3 }); w.gap(1);
      const rows = [['No.', 'Komponen', 'Biaya (Rp)'],
        ...m.rab.map(([key, label], n) => [String(n + 1), label, rp(m.i.rab?.[key])]),
        ['', 'Total', rp(m.p.anggaran)]];
      w.table([{ w: 0.1, al: 'c' }, { w: 0.6 }, { w: 0.3, al: 'r' }], rows);
    },

    _jadwal(w, m, judul) {
      w.para(judul, { bold: true, lh: 1.3 }); w.gap(1);
      w.para(m.i.jadwal || '-'); w.gap(2);
    },

    luaran(w, m) {
      w.heading(m.jenis === 'laporan' ? `BAB ${m.n()}. LUARAN DAN CAPAIAN` : 'TARGET LUARAN');
      const target = baris(m.i.luaran).length ? baris(m.i.luaran) : m.s.lu;
      target.forEach((t, n) => w.para(`${n + 1}. ${t}`, { indent: 6, lh: 1.3 }));
      if (m.jenis === 'laporan') {
        w.gap(2); w.para('Bukti publikasi / capaian:', { bold: true, lh: 1.3 });
        w.para(m.i.publikasi || 'Belum dilaporkan.');
      }
      w.gap(2);
    },

    /** Realisasi pendanaan termin (laporan akhir) */
    pendanaan(w, m) {
      w.heading(`BAB ${m.n()}. REALISASI ANGGARAN DAN PENDANAAN`);
      SECTIONS._rab(w, m, 'Rencana anggaran biaya');
      w.para('Pencairan dana per termin', { bold: true, lh: 1.3 }); w.gap(1);
      const rows = [['Termin', 'Persen', 'Jumlah (Rp)', 'Status', 'Tanggal'],
        ...m.termin.map((t) => [`T${t.termin}`, `${Number(t.persen || 0).toFixed(0)}%`, rp(t.jumlah), t.status || '-', t.tanggal || '-'])];
      w.table([{ w: 0.14, al: 'c' }, { w: 0.14, al: 'c' }, { w: 0.28, al: 'r' }, { w: 0.24 }, { w: 0.2 }], m.termin.length ? rows : [rows[0], ['-', '-', '-', '-', '-']]);
    },

    jadwal(w, m) {
      w.heading(`BAB ${m.n()}. JADWAL PELAKSANAAN`);
      w.para(m.i.jadwal || '-'); w.gap(2);
    },

    referensi(w, m) {
      w.heading('REFERENSI');
      baris(m.i.referensi).forEach((r) => w.para(r, { indent: 8, lh: 1.3 }));
      if (!baris(m.i.referensi).length) w.para('-');
    },
  };

  /* ---- Laporan Termin & Monev ---- */
  Object.assign(SECTIONS, {
    terminInfo(w, m) {
      const { p, s, k, t } = m;
      w.addPage();
      w.heading('A. IDENTITAS KEGIATAN');
      w.style(false, 11, 1.35);
      w.kv([['Judul', p.judul], ['Skema', s.n], ['Ketua pengusul', `${k.nama} (SINTA ID ${k.sinta || '-'})`], ['Program studi', k.prodi],
        ['Tahun / semester', `${p.tahun} / ${p.semester}`], ['Total anggaran', rp(p.anggaran)], ['Termin', `Termin ke-${t.termin} (${Number(t.persen).toFixed(0)}%)`],
        ['Dana termin', rp(t.jumlah)], ['Status dana', t.status === 'dicairkan' ? `Dicairkan ${t.tanggal || ''}` : 'Belum dicairkan'], ['Syarat pencairan', m.syarat]]);
      w.style(); w.gap(4);
    },

    terminLaporan(w, m) {
      const { t, mv } = m, real = Number(mv.realisasi || 0), dana = Number(t.jumlah || 0);
      w.heading('B. LAPORAN KEMAJUAN TERMIN');
      w.para(`Tanggal laporan: ${mv.tgl_lapor || '-'}`, { size: 11, lh: 1.3 });
      w.para(mv.uraian || 'Belum ada laporan.'); w.gap(2);
      w.para('Realisasi penggunaan dana', { bold: true, lh: 1.3 }); w.gap(1);
      w.table([{ w: 0.28, al: 'r' }, { w: 0.28, al: 'r' }, { w: 0.28, al: 'r' }, { w: 0.16, al: 'c' }],
        [['Dana termin (Rp)', 'Realisasi (Rp)', 'Sisa (Rp)', 'Serapan'], [rp(dana), rp(real), rp(dana - real), dana ? `${Math.round(real / dana * 100)}%` : '-']]);
      w.para('Kendala dan tindak lanjut', { bold: true, lh: 1.3 });
      w.para(mv.kendala || 'Tidak ada kendala dilaporkan.'); w.gap(2);
      w.para('Rekap pendanaan seluruh termin', { bold: true, lh: 1.3 }); w.gap(1);
      w.table([{ w: 0.14, al: 'c' }, { w: 0.14, al: 'c' }, { w: 0.28, al: 'r' }, { w: 0.24 }, { w: 0.2 }],
        [['Termin', 'Persen', 'Jumlah (Rp)', 'Status', 'Tanggal'], ...m.termin.map((x) => [(x.id === t.id ? '> ' : '') + `T${x.termin}`, `${Number(x.persen || 0).toFixed(0)}%`, rp(x.jumlah), x.status || '-', x.tanggal || '-'])]);
    },

    terminMonev(w, m) {
      const { mv, krit } = m;
      w.heading('C. HASIL MONITORING DAN EVALUASI');
      if (mv.nilai == null) { w.para('Laporan termin ini belum dimonev.'); return; }
      w.table([{ w: 0.75 }, { w: 0.25, al: 'c' }],
        [['Kriteria penilaian', 'Skor (0-100)'], ...krit.map(([key, label]) => [label, String(mv.detail?.[key] ?? '-')]), ['Nilai rata-rata', `${mv.nilai} (${predikat(mv.nilai)})`]]);
      w.kv([['Rekomendasi', mv.rekomendasi], ['Penilai', m.penilai], ['Tanggal monev', mv.tgl_monev]], 40);
      w.gap(2); w.para('Catatan monev', { bold: true, lh: 1.3 }); w.para(mv.catatan || '-');
    },

    terminTtd(w, m) {
      w.gap(4); w.room(55); w.style(false, 11, 1.2);
      w.para(`${CFG.kota}, ${tglID()}`, { size: 11, indent: 100, lh: 1.3 });
      const y0 = w.y + 2, col = w.cw / 3;
      [['Ketua Pengusul,', m.k.nama], ['Tim Monev,', m.penilai || '(.....................)'], ['Kepala LPPM,', CFG.kepalaLppm]].forEach(([jab, nama], i) => {
        const x = CFG.m.l + col * i;
        w.d.setFontSize(11); w.d.text(clean(jab), x, y0 + 5); w.d.text(clean(nama), x, y0 + 32);
      });
      w.y = y0 + 38; w.style();
    },
  });

  /** Urutan bagian tiap jenis dokumen (template). */
  const TEMPLATES = {
    proposal: ['cover', 'pengesahan', 'toc', 'ringkasan', 'bab', 'rabJadwal', 'luaran', 'referensi'],
    laporan: ['cover', 'pengesahan', 'toc', 'ringkasan', 'bab', 'luaran', 'pendanaan', 'jadwal', 'referensi'],
    termin: ['cover', 'terminInfo', 'terminLaporan', 'terminMonev', 'terminTtd'],
  };

  /* ---------- API ---------- */
  function build({ jenis = 'proposal', p, s, bab, rab, termin = [], review = [], ...ext }) {
    if (!window.jspdf) throw new Error('Pustaka jsPDF belum termuat.');
    if (!TEMPLATES[jenis]) throw new Error('Jenis dokumen tidak dikenal: ' + jenis);
    const i = p.isi || {};
    let no = bab.length;
    const m = { jenis, p, s, i, k: i.ketua || {}, bab, rab, termin, review, n: () => ++no, ...ext };
    const w = new Writer();
    TEMPLATES[jenis].forEach((sec) => SECTIONS[sec](w, m));
    if (m._tocPage) w.paintToc(m._tocPage);
    w.numberPages();
    return { doc: w.d, name: `${{ laporan: 'Laporan-Akhir', termin: `Laporan-Termin-${ext.t?.termin}`, proposal: 'Proposal' }[jenis]}_${s.n.replace(/\s+/g, '-')}_${slug(p.judul)}.pdf` };
  }

  window.PDFLaporan = {
    build,
    /** Async: memastikan logo sampul sudah termuat sebelum dokumen dibuat. */
    async download(model) { await loadLogo(); const r = build(model); r.doc.save(r.name); return r.name; },
    preload: loadLogo,
    jenis: Object.keys(TEMPLATES),
  };
})();
