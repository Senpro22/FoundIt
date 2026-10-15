// Logika murni halaman Detail Laporan & Hasil Matching. Dipakai DetailLaporan.tsx dan detailLogic.test.ts.
import { AMBANG_SEDANG, AMBANG_TAMPIL, AMBANG_TINGGI } from './konstanta.ts';
import type { Laporan } from './katalogLogic.ts';

// Satu baris tabel matches (backend/models/match.js).
export type Match = {
  id: number;
  lost_report_id: number;
  found_report_id: number;
  visual_score: number | null;
  text_score: number | null;
  confidence_score: number | null;
  status: string;
  createdAt?: string;
};

export type Tingkat = 'tinggi' | 'sedang' | 'rendah';

export type Kecocokan = {
  match: Match;
  lawan: Laporan; // laporan tipe sebaliknya
  skor: number; // persen bulat
  foto: number | null;
  deskripsi: number | null;
  tingkat: Tingkat;
};

export type Fakta = { nama: string; teks: string; sama: boolean };

const JAM = 60 * 60 * 1000;

// Skor AI bisa datang 0-1 atau 0-100. Hasilnya selalu persen bulat 0-100, atau null kalau kosong.
export function persen(nilai: number | null | undefined): number | null {
  if (nilai == null || Number.isNaN(Number(nilai))) return null;
  const n = Number(nilai);
  const p = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(p)));
}

export function tingkat(skor: number): Tingkat {
  if (skor >= AMBANG_TINGGI) return 'tinggi';
  if (skor >= AMBANG_SEDANG) return 'sedang';
  return 'rendah';
}

export const LABEL_TINGKAT: Record<Tingkat, string> = {
  tinggi: 'Kecocokan tinggi',
  sedang: 'Kecocokan sedang',
  rendah: 'Kecocokan rendah',
};

// Nomor laporan yang sama dengan Lapor Barang dan Dashboard Admin.
export const nomor = (id: number) => '#FI-' + String(id).padStart(5, '0');

// Kandidat untuk satu laporan: hanya pasangan dengan laporan tipe sebaliknya yang sudah disetujui,
// skor >= AMBANG_TAMPIL, satu baris per lawan (skor tertinggi), diurutkan dari skor tertinggi.
export function kecocokanUntuk(laporan: Laporan, matches: Match[], semua: Laporan[]): Kecocokan[] {
  const byId = new Map(semua.map((l) => [l.id, l]));
  const kolomSaya = laporan.tipe === 'hilang' ? 'lost_report_id' : 'found_report_id';
  const kolomLawan = laporan.tipe === 'hilang' ? 'found_report_id' : 'lost_report_id';
  const terbaik = new Map<number, Kecocokan>();
  for (const m of matches) {
    if (m[kolomSaya] !== laporan.id || m.status === 'ditolak') continue;
    const lawan = byId.get(m[kolomLawan]);
    if (!lawan || lawan.tipe === laporan.tipe || lawan.status !== 'disetujui') continue;
    const skor = persen(m.confidence_score);
    if (skor == null || skor < AMBANG_TAMPIL) continue;
    const lama = terbaik.get(lawan.id);
    if (lama && lama.skor >= skor) continue;
    terbaik.set(lawan.id, {
      match: m,
      lawan,
      skor,
      foto: persen(m.visual_score),
      deskripsi: persen(m.text_score),
      tingkat: tingkat(skor),
    });
  }
  return [...terbaik.values()].sort((a, b) => b.skor - a.skor || a.lawan.id - b.lawan.id);
}

function selisihWaktu(ms: number) {
  const jam = Math.round(Math.abs(ms) / JAM);
  if (jam < 1) return 'kurang dari 1 jam';
  if (jam < 48) return `${jam} jam`;
  return `${Math.round(jam / 24)} hari`;
}

// Alasan yang bisa dibaca orang, dari sudut pandang pemilik laporan `saya`.
export function faktaKecocokan(saya: Laporan, lawan: Laporan): Fakta[] {
  const hilang = saya.tipe === 'hilang' ? saya : lawan;
  const temuan = saya.tipe === 'hilang' ? lawan : saya;
  const fakta: Fakta[] = [];

  const lokasiSama = saya.lokasi === lawan.lokasi;
  fakta.push({ nama: 'Lokasi', teks: lokasiSama ? `sama, ${lawan.lokasi}` : `beda, ${lawan.lokasi}`, sama: lokasiSama });

  const t1 = new Date(hilang.waktu_kejadian).getTime();
  const t2 = new Date(temuan.waktu_kejadian).getTime();
  if (!Number.isNaN(t1) && !Number.isNaN(t2)) {
    const d = t2 - t1;
    fakta.push(
      d >= 0
        ? { nama: 'Waktu', teks: `ditemukan ${selisihWaktu(d)} setelah waktu kehilangan`, sama: true }
        : { nama: 'Waktu', teks: `ditemukan ${selisihWaktu(d)} sebelum waktu kehilangan`, sama: false },
    );
  }

  const kategoriSama = saya.kategori === lawan.kategori;
  fakta.push({ nama: 'Kategori', teks: kategoriSama ? `sama, ${lawan.kategori}` : `beda, ${lawan.kategori}`, sama: kategoriSama });
  return fakta;
}

// Kondisi bagian "Kemungkinan cocok".
export type KondisiCocok = 'moderasi' | 'ditolak' | 'menunggu' | 'kosong' | 'ada';
export const MENIT_PROSES = 10; // laporan baru disetujui: anggap AI masih memproses selama ini

export function kondisiCocok(laporan: Laporan & { updatedAt?: string }, jumlah: number, now = Date.now()): KondisiCocok {
  if (laporan.status === 'pending') return 'moderasi';
  if (laporan.status === 'ditolak') return 'ditolak';
  if (jumlah > 0) return 'ada';
  const acuan = new Date(laporan.updatedAt ?? laporan.createdAt).getTime();
  if (!Number.isNaN(acuan) && now - acuan < MENIT_PROSES * 60 * 1000) return 'menunggu';
  return 'kosong';
}

// Ambil id dari path /katalog/:id. Null kalau bukan angka positif.
export function idDariPath(path: string): number | null {
  const m = /^\/katalog\/(\d+)\/?$/.exec(path);
  if (!m) return null;
  const id = Number(m[1]);
  return id > 0 ? id : null;
}
