-- Jalankan sekali pada DB yang sudah ada:
-- wrangler d1 execute ppm-db --remote --file=migrations/002_monev.sql
CREATE TABLE IF NOT EXISTS monev(id TEXT PRIMARY KEY,proposal_id TEXT REFERENCES proposal(id) ON DELETE CASCADE,termin_id TEXT REFERENCES termin(id) ON DELETE CASCADE,termin INTEGER,uraian TEXT /* laporan termin (ketua) */,realisasi REAL,kendala TEXT,tgl_lapor TEXT,penilai_id TEXT,detail TEXT /* JSON skor per kriteria */,nilai REAL,rekomendasi TEXT,catatan TEXT,tgl_monev TEXT);
CREATE INDEX IF NOT EXISTS ix_monev_prop ON monev(proposal_id);
CREATE INDEX IF NOT EXISTS ix_monev_termin ON monev(termin_id);
