-- Skema PPM-LPPM untuk Cloudflare D1 (ppm-db)
-- wrangler d1 execute ppm-db --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL /* DEMO plaintext: ganti hash di D1 */,nama TEXT,role TEXT CHECK(role IN('dosen','reviewer','admin')),email TEXT,hp TEXT,nidn TEXT,sinta TEXT,pend TEXT,jab TEXT,prodi TEXT,aktif INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS proposal(id TEXT PRIMARY KEY,skema TEXT NOT NULL,judul TEXT NOT NULL,tahun INTEGER,semester TEXT,ketua_id TEXT REFERENCES users(id),status TEXT DEFAULT 'draft',mitra TEXT,jml_mahasiswa INTEGER,anggaran REAL,isi TEXT /* JSON: ketua, ringkasan, bab, rab, jadwal, referensi */,created_at TEXT,updated_at TEXT);
CREATE TABLE IF NOT EXISTS anggota(id TEXT PRIMARY KEY,proposal_id TEXT REFERENCES proposal(id) ON DELETE CASCADE,nama TEXT,sinta TEXT,prodi TEXT,tugas TEXT,jenis TEXT DEFAULT 'dosen' CHECK(jenis IN('dosen','non')),user_id TEXT REFERENCES users(id) /* terisi jika dosen terdaftar */,status TEXT /* menunggu|setuju|tolak (dosen), kosong (non-dosen) */,alasan TEXT,tanggal TEXT);
CREATE TABLE IF NOT EXISTS review(id TEXT PRIMARY KEY,proposal_id TEXT REFERENCES proposal(id) ON DELETE CASCADE,reviewer_id TEXT,skor REAL,rekomendasi TEXT,catatan TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS termin(id TEXT PRIMARY KEY,proposal_id TEXT REFERENCES proposal(id) ON DELETE CASCADE,termin INTEGER,persen REAL,jumlah REAL,status TEXT DEFAULT 'menunggu',tanggal TEXT);
CREATE TABLE IF NOT EXISTS opsi(id TEXT PRIMARY KEY,kategori TEXT NOT NULL,nilai TEXT NOT NULL,urut INTEGER DEFAULT 0,aktif INTEGER DEFAULT 1,UNIQUE(kategori,nilai));
CREATE INDEX IF NOT EXISTS ix_prop_ketua ON proposal(ketua_id);
CREATE INDEX IF NOT EXISTS ix_ang_prop ON anggota(proposal_id);
CREATE INDEX IF NOT EXISTS ix_ang_user ON anggota(user_id);
CREATE TABLE IF NOT EXISTS monev(id TEXT PRIMARY KEY,proposal_id TEXT REFERENCES proposal(id) ON DELETE CASCADE,termin_id TEXT REFERENCES termin(id) ON DELETE CASCADE,termin INTEGER,uraian TEXT /* laporan termin (ketua) */,realisasi REAL,kendala TEXT,tgl_lapor TEXT,penilai_id TEXT,detail TEXT /* JSON skor per kriteria */,nilai REAL,rekomendasi TEXT,catatan TEXT,tgl_monev TEXT);
CREATE INDEX IF NOT EXISTS ix_monev_prop ON monev(proposal_id);
CREATE INDEX IF NOT EXISTS ix_monev_termin ON monev(termin_id);
