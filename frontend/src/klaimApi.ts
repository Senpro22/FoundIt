// Akses API klaim. Endpoint klaim (Issue #13) masih dikerjakan backend, jadi untuk sementara
// MODE_DUMMY = true: kirimKlaim/ambilKlaim tidak memanggil server. Setelah endpoint siap,
// ubah ke false dan pastikan bentuk request/response di bawah sama dengan backend.
//
// Usulan kontrak (mengikuti tabel claims di ERD):
//   POST /api/claims   multipart/form-data
//     match_id            number   (claims.match_id)
//     ktm                 file     (disimpan ke claims.bukti_kepemilikan_url)
//     bukti[]             file     opsional, maks 3
//     jawaban_verifikasi  string   JSON [{ pertanyaan, jawaban }]
//   -> 201 { id, match_id, status: 'menunggu', createdAt }
//   GET  /api/claims/:id
//   -> 200 { id, match_id, status: 'menunggu' | 'diterima' | 'ditolak', alasan_tolak?, kode_serah_terima?,
//            lokasi_pengambilan?, createdAt, updatedAt }
import type { StatusKlaim } from './klaimLogic.ts';

export const MODE_DUMMY = true;

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export type Klaim = {
  id: number;
  match_id: number | null;
  status: StatusKlaim;
  alasan_tolak?: string | null;
  kode_serah_terima?: string | null;
  lokasi_pengambilan?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type KirimKlaim = {
  matchId: number | null;
  temuanId: number;
  ktm: File;
  bukti: File[];
  jawabanVerifikasi: string;
};

const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function kirimKlaim(data: KirimKlaim): Promise<Klaim> {
  if (MODE_DUMMY) {
    await tunggu(900);
    return { id: 12, match_id: data.matchId, status: 'menunggu', createdAt: new Date().toISOString() };
  }
  const body = new FormData();
  if (data.matchId != null) body.append('match_id', String(data.matchId));
  body.append('ktm', data.ktm);
  data.bukti.forEach((f) => body.append('bukti', f));
  body.append('jawaban_verifikasi', data.jawabanVerifikasi);
  const res = await fetch(`${BASE}/api/claims`, { method: 'POST', body });
  if (!res.ok) {
    const isi = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(isi.error || `Server menjawab ${res.status}.`);
  }
  return res.json() as Promise<Klaim>;
}

// statusContoh hanya dipakai di MODE_DUMMY, supaya ketiga status bisa dilihat lewat ?status=.
export async function ambilKlaim(id: number, statusContoh: StatusKlaim = 'menunggu'): Promise<Klaim> {
  if (MODE_DUMMY) {
    await tunggu(300);
    const dibuat = '2026-10-09T07:20:00.000Z';
    const diputus = '2026-10-10T02:05:00.000Z';
    if (statusContoh === 'diterima')
      return { id, match_id: null, status: 'diterima', kode_serah_terima: 'K-' + String(id).padStart(4, '0'), lokasi_pengambilan: 'Pos Satpam Perpustakaan Pusat', createdAt: dibuat, updatedAt: diputus };
    if (statusContoh === 'ditolak')
      return { id, match_id: null, status: 'ditolak', alasan_tolak: 'Ciri di bagian dalam barang tidak sesuai dengan barang yang ditemukan.', createdAt: dibuat, updatedAt: diputus };
    return { id, match_id: null, status: 'menunggu', createdAt: dibuat };
  }
  const res = await fetch(`${BASE}/api/claims/${id}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'Klaim tidak ditemukan.' : `Server menjawab ${res.status}.`);
  return res.json() as Promise<Klaim>;
}
