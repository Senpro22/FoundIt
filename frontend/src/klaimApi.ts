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

export const MODE_DUMMY = false;

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export type Klaim = {
  id: number;
  match_id: number | null;
  found_report_id?: number;
  status: StatusKlaim;
  alasan_tolak?: string | null;
  kode_serah_terima?: string | null;
  lokasi_pengambilan?: string | null;
  access_token?: string;
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

const tunggu = (ms: number) =>
  new Promise((r) => setTimeout(r, ms));

const tokenKey = (id: number) => `foundit_claim_token_${id}`;

// POST: Mengirim pengajuan klaim
export async function kirimKlaim(data: KirimKlaim): Promise<Klaim> {
  if (MODE_DUMMY) {
    await tunggu(900);

    return {
      id: 12,
      match_id: data.matchId,
      found_report_id: data.temuanId,
      status: 'menunggu',
      createdAt: new Date().toISOString(),
    };
  }

  // Validasi ID barang temuan
  if (!Number.isInteger(data.temuanId) || data.temuanId <= 0) {
    throw new Error('ID barang temuan tidak valid.');
  }

  const body = new FormData();

  // ID barang temuan wajib dikirim
  body.append('found_report_id', String(data.temuanId));

  // Match ID bersifat opsional
  if (data.matchId != null) {
    body.append('match_id', String(data.matchId));
  }

  body.append('ktm', data.ktm);

  data.bukti.forEach((f) => {
    body.append('bukti', f);
  });

  body.append('jawaban_verifikasi', data.jawabanVerifikasi);

  // Persetujuan sudah divalidasi pada form
  body.append('setuju', 'true');

  const res = await fetch(`${BASE}/api/claims`, {
    method: 'POST',
    body,
  });

  if (!res.ok) {
    const isi = (await res.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(
      isi.error || `Server menjawab ${res.status}.`
    );
  }

  const klaim = (await res.json()) as Klaim;

  // Simpan token untuk mengakses status klaim
  if (klaim.access_token) {
    sessionStorage.setItem(
      tokenKey(klaim.id),
      klaim.access_token
    );
  }

  return klaim;
}

// GET: Mengambil status klaim
export async function ambilKlaim(
  id: number,
  statusContoh: StatusKlaim = 'menunggu'
): Promise<Klaim> {
  if (MODE_DUMMY) {
    await tunggu(300);

    const dibuat = '2026-10-09T07:20:00.000Z';
    const diputus = '2026-10-10T02:05:00.000Z';

    if (statusContoh === 'diterima') {
      return {
        id,
        match_id: null,
        status: 'diterima',
        kode_serah_terima: 'K-' + String(id).padStart(4, '0'),
        lokasi_pengambilan: 'Pos Satpam Perpustakaan Pusat',
        createdAt: dibuat,
        updatedAt: diputus,
      };
    }

    if (statusContoh === 'ditolak') {
      return {
        id,
        match_id: null,
        status: 'ditolak',
        alasan_tolak:
          'Ciri di bagian dalam barang tidak sesuai dengan barang yang ditemukan.',
        createdAt: dibuat,
        updatedAt: diputus,
      };
    }

    return {
      id,
      match_id: null,
      status: 'menunggu',
      createdAt: dibuat,
    };
  }

  const token = sessionStorage.getItem(tokenKey(id));

  const headers: Record<string, string> = {};

  if (token) {
    headers['x-claim-token'] = token;
  }

  const res = await fetch(`${BASE}/api/claims/${id}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const isi = (await res.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(
      isi.error ||
        (res.status === 404
          ? 'Klaim tidak ditemukan.'
          : `Server menjawab ${res.status}.`)
    );
  }

  return res.json() as Promise<Klaim>;
}