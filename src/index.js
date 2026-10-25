/**
 * Worker REST API untuk SIM-PPM LPPM  ->  Cloudflare D1 (binding: DB, database: ppm-db)
 *
 * Kontrak (sesuai adapter `D1` di frontend):
 *   GET    /api/:table        -> array seluruh baris
 *   PUT    /api/:table        -> upsert satu baris (body JSON, wajib ada `id`)
 *   DELETE /api/:table/:id    -> hapus baris
 *   GET    /api/health        -> cek koneksi D1
 */

// Whitelist tabel & kolom (mencegah SQL injection lewat nama tabel/kolom)
const TABLES = {
  users: ['id', 'username', 'password', 'nama', 'role', 'email', 'hp', 'nidn', 'sinta', 'pend', 'jab', 'prodi', 'aktif'],
  proposal: ['id', 'skema', 'judul', 'tahun', 'semester', 'ketua_id', 'status', 'mitra', 'jml_mahasiswa', 'anggaran', 'isi', 'created_at', 'updated_at'],
  anggota: ['id', 'proposal_id', 'nama', 'sinta', 'prodi', 'tugas', 'jenis', 'user_id', 'status', 'alasan', 'tanggal'],
  review: ['id', 'proposal_id', 'reviewer_id', 'skor', 'rekomendasi', 'catatan', 'created_at'],
  termin: ['id', 'proposal_id', 'termin', 'persen', 'jumlah', 'status', 'tanggal'],
  opsi: ['id', 'kategori', 'nilai', 'urut', 'aktif'],
  monev: ['id', 'proposal_id', 'termin_id', 'termin', 'uraian', 'realisasi', 'kendala', 'tgl_lapor', 'penilai_id', 'detail', 'nilai', 'rekomendasi', 'catatan', 'tgl_monev'],
};

const MAX_BODY = 1_000_000; // 1 MB

function cors(env) {
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
    'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(env) },
  });
}

// Normalisasi nilai agar diterima D1 (tidak boleh undefined/boolean/object)
function norm(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function listRows(env, table) {
  const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
  return results;
}

async function upsertRow(env, table, row) {
  const allowed = TABLES[table];
  const cols = Object.keys(row).filter((c) => allowed.includes(c));
  if (!cols.includes('id') || !row.id) throw new HttpError(400, 'Field "id" wajib diisi');

  const placeholders = cols.map(() => '?').join(',');
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(',');
  // ON CONFLICT (bukan INSERT OR REPLACE) agar ON DELETE CASCADE tidak menghapus baris anak
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})` +
    (updates ? ` ON CONFLICT(id) DO UPDATE SET ${updates}` : ' ON CONFLICT(id) DO NOTHING');
  await env.DB.prepare(sql).bind(...cols.map((c) => norm(row[c]))).run();
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });

    try {
      const url = new URL(request.url);
      const [, api, table, id, extra] = url.pathname.split('/').map(decodeURIComponent);
      if (api !== 'api' || extra !== undefined) throw new HttpError(404, 'Not found');

      if (table === 'health' && request.method === 'GET') {
        await env.DB.prepare('SELECT 1').first();
        return json({ ok: true, db: 'ppm-db' }, 200, env);
      }

      if (!Object.hasOwn(TABLES, table)) throw new HttpError(404, `Tabel "${table}" tidak dikenal`);

      if (request.method === 'GET' && id === undefined) {
        return json(await listRows(env, table), 200, env);
      }

      if (request.method === 'PUT' && id === undefined) {
        const text = await request.text();
        if (text.length > MAX_BODY) throw new HttpError(413, 'Payload terlalu besar');
        let row;
        try { row = JSON.parse(text); } catch { throw new HttpError(400, 'Body bukan JSON valid'); }
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new HttpError(400, 'Body harus berupa objek');
        await upsertRow(env, table, row);
        return json({ ok: true, id: row.id }, 200, env);
      }

      if (request.method === 'DELETE' && id) {
        const r = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
        return json({ ok: true, deleted: r.meta?.changes ?? 0 }, 200, env);
      }

      throw new HttpError(405, 'Method tidak didukung');
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status, env);
      const msg = String(e?.message || e);
      if (/UNIQUE constraint/i.test(msg)) return json({ error: 'Data duplikat (UNIQUE)', detail: msg }, 409, env);
      if (/(CHECK|FOREIGN KEY|NOT NULL) constraint/i.test(msg)) return json({ error: 'Data tidak valid', detail: msg }, 400, env);
      console.error(msg);
      return json({ error: 'Kesalahan server' }, 500, env);
    }
  },
};
