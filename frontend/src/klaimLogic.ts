// Logika murni form Verifikasi Klaim (FR 11-13). Dipakai KlaimKepemilikan.tsx dan klaimLogic.test.ts.
import { validateFoto, type BerkasFoto } from './formLogic.ts';

export const MAKS_JAWABAN = 300;
export const MAKS_BUKTI = 3;

// Pertanyaan soal ciri yang tidak tampil di katalog, per kategori barang.
export const PERTANYAAN: Record<string, [string, string]> = {
  'Dompet & Kartu': ['Apa saja isi dompet saat hilang?', 'Ada tanda khusus di bagian dalam dompet?'],
  Elektronik: ['Apa merek dan tipe barangnya?', 'Ada tanda khusus, misalnya casing, stiker, atau goresan?'],
  Kunci: ['Ada gantungan atau aksesori apa di kuncinya?', 'Kunci apa saja yang ada di rangkaian itu?'],
  Tas: ['Apa saja isi tas saat hilang?', 'Ada tanda khusus di bagian dalam atau luar tas?'],
  Pakaian: ['Apa merek dan ukurannya?', 'Ada tanda khusus, misalnya noda, jahitan, atau nama?'],
  Dokumen: ['Dokumen apa saja yang ada di dalamnya?', 'Atas nama siapa dokumennya?'],
};
const PERTANYAAN_UMUM: [string, string] = ['Sebutkan ciri barang yang tidak terlihat di foto.', 'Ada tanda khusus yang hanya kamu tahu?'];

export const pertanyaanUntuk = (kategori: string) => PERTANYAAN[kategori] ?? PERTANYAAN_UMUM;

export const CONTOH_JAWABAN: Record<string, [string, string]> = {
  'Dompet & Kartu': [
    'Misal: KTM, kartu ATM bank apa, kartu e-money, uang tunai kira-kira berapa',
    'Misal: sobekan, tulisan nama, stiker, atau warna lapisan dalam',
  ],
};
export const contohJawaban = (kategori: string): [string, string] =>
  CONTOH_JAWABAN[kategori] ?? ['Tulis sedetail yang kamu ingat', 'Tulis "tidak ingat" kalau memang tidak ada'];

export type NilaiKlaim = {
  ktm: BerkasFoto | null;
  jawaban: [string, string];
  bukti: BerkasFoto[];
  setuju: boolean;
};

export type FieldKlaim = 'ktm' | 'jawaban-1' | 'jawaban-2' | 'bukti' | 'setuju';
export type ErrorKlaim = { field: FieldKlaim; message: string };

export function validateKtm(file: BerkasFoto | null): ErrorKlaim | null {
  if (!file) return { field: 'ktm', message: 'Unggah foto KTM dulu supaya petugas bisa memastikan identitasmu.' };
  const cek = validateFoto(file);
  return cek.ok ? null : { field: 'ktm', message: cek.text };
}

export function validateKlaim(v: NilaiKlaim): ErrorKlaim[] {
  const errors: ErrorKlaim[] = [];
  const ktm = validateKtm(v.ktm);
  if (ktm) errors.push(ktm);
  v.jawaban.forEach((j, i) => {
    const field = `jawaban-${i + 1}` as FieldKlaim;
    if (!j.trim()) errors.push({ field, message: 'Pertanyaan ini wajib dijawab. Kalau tidak ingat, tulis "tidak ingat".' });
    else if (j.length > MAKS_JAWABAN) errors.push({ field, message: `Jawaban maksimal ${MAKS_JAWABAN} karakter.` });
  });
  if (v.bukti.length > MAKS_BUKTI) errors.push({ field: 'bukti', message: `Bukti tambahan maksimal ${MAKS_BUKTI} foto.` });
  else {
    const salah = v.bukti.map(validateFoto).find((c) => !c.ok);
    if (salah && !salah.ok) errors.push({ field: 'bukti', message: salah.text });
  }
  if (!v.setuju) errors.push({ field: 'setuju', message: 'Centang pernyataan ini untuk melanjutkan.' });
  return errors;
}

// Ringkasan banner, misal "foto KTM, jawaban pertanyaan kedua, dan pernyataan kepemilikan".
const NAMA_FIELD: Record<FieldKlaim, string> = {
  ktm: 'foto KTM',
  'jawaban-1': 'jawaban pertanyaan pertama',
  'jawaban-2': 'jawaban pertanyaan kedua',
  bukti: 'bukti tambahan',
  setuju: 'pernyataan kepemilikan',
};
export function ringkasError(errors: ErrorKlaim[]) {
  const nama = errors.map((e) => NAMA_FIELD[e.field]);
  if (nama.length <= 1) return nama.join('');
  return nama.slice(0, -1).join(', ') + ', dan ' + nama[nama.length - 1];
}

// Isi kolom claims.jawaban_verifikasi (text): pasangan pertanyaan-jawaban dalam JSON.
export function jawabanVerifikasi(kategori: string, jawaban: [string, string]) {
  const q = pertanyaanUntuk(kategori);
  return JSON.stringify(q.map((pertanyaan, i) => ({ pertanyaan, jawaban: jawaban[i].trim() })));
}

export type StatusKlaim = 'menunggu' | 'diterima' | 'ditolak';
export const statusValid = (s: string | null): s is StatusKlaim => s === 'menunggu' || s === 'diterima' || s === 'ditolak';
export const nomorKlaim = (id: number) => '#K-' + String(id).padStart(4, '0');
