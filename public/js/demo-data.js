/**
 * Data demo untuk uji alur Pendanaan Termin -> Laporan Termin -> Monev -> PDF.
 * Semua id diawali "demo-" sehingga dapat dihapus tanpa menyentuh data asli (hapusDemo()).
 * Menambah skenario = tambah satu objek di DEMO.proposal.
 */
const DEMO = {
  pass: 'demo123',
  users: [
    { u: 'demo.budi', nama: 'Dr. Budi Santoso, M.T.', role: 'dosen', pend: 'S3', jab: 'Lektor Kepala', prodi: 'Teknik Informatika', sinta: '6012001' },
    { u: 'demo.siti', nama: 'Siti Rahmawati, M.Kom.', role: 'dosen', pend: 'S2', jab: 'Lektor', prodi: 'Teknik Industri', sinta: '6012002' },
    { u: 'demo.andi', nama: 'Andi Pratama, M.M.', role: 'dosen', pend: 'S2', jab: 'Asisten Ahli', prodi: 'Manajemen', sinta: '6012003' },
    { u: 'demo.reviewer', nama: 'Prof. Dr. Ratna Dewi (Reviewer Demo)', role: 'reviewer', pend: 'S3', jab: 'Guru Besar', prodi: 'Teknik Sipil', sinta: '6012004' },
  ],
  /* lap[n]: laporan termin n+1 -> [uraian, fraksi realisasi dari dana termin, kendala] (null = belum lapor)
     mv[n] : monev termin n+1   -> [tujuan, capaian, anggaran, dokumen, indeks rekomendasi, catatan] (null = belum dimonev)
     tin   : jumlah termin yang sudah dicairkan */
  proposal: [
    { skema: 'pdp', tahun: 2026, semester: 'Ganjil', st: 'pelaksanaan', tin: 1, ketua: 'demo.andi', ag: ['demo.siti'], mhs: 2,
      judul: 'Sistem Informasi Monitoring Praktikum Mahasiswa Berbasis Web', lokasi: 'Kampus Universitas IPWIJA, Jakarta',
      rab: { alat: 2e6, jalan: 1.5e6, atk: 1e6, lap: 1.5e6 },
      lap: [['Instrumen pengumpulan data telah disusun dan diuji pada 2 kelas praktikum. Prototipe modul presensi selesai 70%.', 0.9, 'Jadwal praktikum bentrok dengan UTS.']],
      mv: [[88, 82, 90, 85, 0, 'Progres sesuai jadwal. Segera lengkapi dokumentasi uji coba.']] },
    { skema: 'pkmu', tahun: 2026, semester: 'Ganjil', st: 'diseminasi', tin: 2, ketua: 'dosen', ag: ['demo.budi', { nama: 'Rina Marlina, S.E.', tugas: 'Pendamping kelompok usaha', prodi: 'Manajemen' }], mhs: 3,
      judul: 'Pelatihan Pemasaran Digital bagi UMKM Kuliner Binaan', lokasi: 'Kelurahan Cipinang, Jakarta Timur', mitra: 'Kelompok UMKM Cipinang Mandiri',
      rab: { alat: 4e6, jalan: 3e6, atk: 2e6, lap: 3e6 },
      lap: [['Survei kebutuhan 25 pelaku UMKM dan pelatihan dasar foto produk serta marketplace telah dilaksanakan.', 0.95, 'Sebagian peserta belum memiliki akun marketplace.'],
            ['Pendampingan 4 sesi, 18 UMKM aktif berjualan online. Omzet rata-rata mitra naik sekitar 15%.', 0.88, '']],
      mv: [[90, 85, 88, 90, 0, 'Kegiatan terarah dan partisipasi mitra baik.'], null] },
    { skema: 'pt', tahun: 2026, semester: 'Ganjil', st: 'laporan', tin: 1, ketua: 'demo.budi', ag: ['demo.siti', 'demo.andi'], mhs: 2,
      judul: 'Prediksi Kebutuhan Material Proyek Konstruksi dengan Machine Learning', lokasi: 'Laboratorium Komputasi UNIP',
      rab: { alat: 8e6, jalan: 4e6, atk: 3e6, lap: 5e6 },
      lap: [null], mv: [null] },
    { skema: 'pin', tahun: 2025, semester: 'Ganjil', st: 'selesai', tin: 3, ketua: 'demo.siti', ag: ['demo.budi'], mhs: 2, mitra: 'PT Karya Mandiri Teknik',
      judul: 'Alat Pemantau Kualitas Udara Dalam Ruang Berbiaya Rendah', lokasi: 'Workshop Teknik Industri UNIP',
      rab: { alat: 10e6, jalan: 3e6, atk: 2e6, lap: 5e6 }, publikasi: 'Prosiding Seminar Nasional Teknologi 2025 (SINTA 3) - bukti accepted terlampir',
      lap: [['Desain purwarupa dan kalibrasi sensor selesai.', 0.92, ''], ['Uji lapangan di 3 ruang kerja mitra, akurasi 94%.', 0.9, 'Sensor perlu kalibrasi ulang.'], ['Draf paten sederhana didaftarkan, artikel prosiding accepted.', 0.97, '']],
      mv: [[85, 80, 88, 82, 0, 'Desain jelas.'], [87, 86, 85, 88, 0, 'Uji lapangan memadai.'], [92, 90, 91, 94, 0, 'Seluruh luaran wajib terpenuhi.']] },
    { skema: 'pd', tahun: 2025, semester: 'Genap', st: 'kontrak', tin: 0, ketua: 'demo.siti', ag: ['demo.andi'], mhs: 1,
      judul: 'Analisis Faktor Produktivitas Pekerja Proyek Gedung', lokasi: 'Proyek gedung mitra, Jakarta Selatan',
      rab: { alat: 3e6, jalan: 2e6, atk: 2e6, lap: 3e6 }, lap: [], mv: [] },
    { skema: 'pkmdb', tahun: 2026, semester: 'Ganjil', st: 'review', tin: 0, ketua: 'demo.budi', ag: ['demo.andi'], mhs: 2, mitra: 'Desa Binaan Sukamaju',
      judul: 'Penerapan Teknologi Tepat Guna Pengolahan Sampah Organik Desa', lokasi: 'Desa Sukamaju, Kabupaten Bogor',
      rab: { alat: 9e6, jalan: 4e6, atk: 3e6, lap: 4e6 }, lap: [], mv: [] },
  ],
};

/* Teks bab generik per kunci (BAB[...] di index.html) */
const DEMO_BAB = {
  pendahuluan: (j) => `Latar belakang kegiatan "${j}" berangkat dari kebutuhan nyata di lingkungan mitra dan masyarakat sasaran. Tujuan khusus, urgensi, serta target capaian dirumuskan secara terukur untuk periode pelaksanaan.`,
  pustaka: () => 'Kajian pustaka memuat state of the art dari jurnal ilmiah terkini, studi pendahuluan yang telah dilakukan tim, serta peta jalan (road map) penelitian/pengabdian.',
  metode: () => 'Tahapan: persiapan dan koordinasi, pengumpulan data, pelaksanaan inti, evaluasi, serta diseminasi. Indikator capaian disusun per tahap dan dibagi jelas antaranggota tim.',
  bisnis: () => 'Gambaran proses bisnis, simulasi bisnis, dan peta jalan bisnis.',
  solusi: () => 'Solusi ditawarkan berurutan sesuai prioritas masalah mitra, masing-masing dengan luaran terukur.',
  personalia: () => 'Kepakaran tim: ketua sebagai pengarah teknis, anggota sebagai pelaksana lapangan dan pendamping mitra.',
};
const DEMO_TGL = { cair: ['06-15', '09-10', '10-05'], lap: ['06-20', '09-15', '10-10'], mv: ['06-28', '09-22', '10-18'] };

async function seedDemo() {
  if (C.proposal.some((p) => p.id.startsWith('demo-'))) return warn('Data demo sudah ada. Hapus dulu jika ingin memuat ulang.');
  if (!await sure(`Muat data demo (4 akun, ${DEMO.proposal.length} proposal beserta termin, laporan termin, dan monev)?`, 'Muat data demo')) return;
  const usr = (name) => C.users.find((u) => u.username === name);
  for (const d of DEMO.users) {
    await save('users', { id: 'demo-u-' + d.u, username: d.u, password: DEMO.pass, nama: d.nama, role: d.role, email: d.u + '@ipwija.ac.id', hp: '0812000000', nidn: '0300' + d.sinta, sinta: d.sinta, pend: d.pend, jab: d.jab, prodi: d.prodi, aktif: 1 });
  }
  const rev = usr('demo.reviewer');
  for (const [i, sp] of DEMO.proposal.entries()) {
    const k = i + 1, s = SK[sp.skema], pid = `demo-p${k}`, ketua = usr(sp.ketua) || usr('demo.siti');
    const kt = { nama: ketua.nama, pend: ketua.pend || 'S2', jab: ketua.jab || '', sinta: ketua.sinta || '-', hp: ketua.hp || '', email: ketua.email || '', prodi: ketua.prodi || 'Teknik Informatika', tugas: 'Koordinasi dan penanggung jawab kegiatan' };
    const anggaran = Object.values(sp.rab).reduce((a, b) => a + b, 0), ts = `${sp.tahun}-02-01T08:00:00.000Z`;
    const bab = Object.fromEntries(BAB[s.bab].map(([key]) => [key, DEMO_BAB[key](sp.judul)]));
    const isi = { ketua: kt, alumni: 0, lokasi: sp.lokasi, manfaat: 'Meningkatkan kapasitas mitra dan menghasilkan luaran yang bermanfaat bagi masyarakat.',
      ringkasan: `Kegiatan "${sp.judul}" bertujuan menjawab permasalahan prioritas mitra melalui tahapan terukur dan luaran sesuai skema ${s.n}.`,
      bab, rab: sp.rab, jadwal: 'Bulan 1: persiapan | Bulan 2-3: pelaksanaan | Bulan 4: evaluasi | Bulan 5-6: diseminasi dan pelaporan',
      luaran: s.lu.join('\n'), referensi: 'Santoso, B. (2024). Metode terapan untuk pengembangan masyarakat. Jurnal Teknologi Terapan, 5(2), 10-20.', ...(sp.publikasi ? { publikasi: sp.publikasi } : {}) };
    await save('proposal', { id: pid, skema: sp.skema, judul: sp.judul, tahun: sp.tahun, semester: sp.semester, ketua_id: ketua.id, status: sp.st, mitra: sp.mitra || '', jml_mahasiswa: sp.mhs, anggaran, isi: JSON.stringify(isi), created_at: ts, updated_at: ts });

    for (const [j, a] of sp.ag.entries()) {
      const u = typeof a === 'string' ? usr(a) : null;
      await save('anggota', u
        ? { id: `demo-a${k}-${j}`, proposal_id: pid, nama: u.nama, sinta: u.sinta, prodi: u.prodi, tugas: 'Pelaksana kegiatan', jenis: 'dosen', user_id: u.id, status: 'setuju', alasan: '', tanggal: `${sp.tahun}-01-20` }
        : { id: `demo-a${k}-${j}`, proposal_id: pid, nama: a.nama, sinta: '', prodi: a.prodi, tugas: a.tugas, jenis: 'non', user_id: null, status: '', alasan: '', tanggal: '' });
    }
    if (rev && sp.st !== 'review') await save('review', { id: `demo-rv${k}`, proposal_id: pid, reviewer_id: rev.id, skor: 82 + k, rekomendasi: 'Layak', catatan: 'Proposal layak didanai; mohon perhatikan indikator capaian.', created_at: `${sp.tahun}-03-01T08:00:00.000Z` });

    if (['kontrak', 'pelaksanaan', 'laporan', 'diseminasi', 'luaran', 'selesai'].includes(sp.st)) {
      for (const [n, tp] of terminPlan({ skema: sp.skema, anggaran }).entries()) {
        const cair = n < sp.tin, tid = `demo-t${k}-${n}`;
        await save('termin', { id: tid, proposal_id: pid, ...tp, status: cair ? 'dicairkan' : 'menunggu', tanggal: cair ? `${sp.tahun}-${DEMO_TGL.cair[n]}` : '' });
        const lap = sp.lap[n], mv = sp.mv[n];
        if (cair && lap) {
          const row = { id: `demo-mv${k}-${n}`, proposal_id: pid, termin_id: tid, termin: n + 1, uraian: lap[0], realisasi: Math.round(tp.jumlah * lap[1]), kendala: lap[2], tgl_lapor: `${sp.tahun}-${DEMO_TGL.lap[n]}` };
          if (mv && rev) {
            const detail = Object.fromEntries(KRIT.map(([key], x) => [key, mv[x]]));
            Object.assign(row, { detail: JSON.stringify(detail), nilai: Math.round(mv.slice(0, 4).reduce((a, b) => a + b, 0) / 4 * 10) / 10, rekomendasi: REKM[mv[4]], catatan: mv[5], penilai_id: rev.id, tgl_monev: `${sp.tahun}-${DEMO_TGL.mv[n]}` });
          }
          await save('monev', row);
        }
      }
    }
  }
  await warn(`Data demo dimuat. Login demo: demo.budi / demo.siti / demo.andi (dosen) dan demo.reviewer (reviewer), password ${DEMO.pass}. Buka menu "Laporan & Monev Termin".`);
  go('monev');
}

async function hapusDemo() {
  if (!await sure('Hapus SEMUA data demo (id berawalan "demo-")? Data asli tidak terpengaruh.')) return;
  for (const t of ['monev', 'review', 'termin', 'anggota', 'proposal', 'users']) {
    for (const r of C[t].filter((x) => x.id.startsWith('demo-'))) await rm(t, r.id);
  }
  go('dbv');
}
