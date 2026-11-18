// Jalankan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faktaKecocokan, idDariPath, kecocokanUntuk, kondisiCocok, nomor, persen, tingkat, type Match } from './detailLogic.ts';
import type { Laporan } from './katalogLogic.ts';

const now = new Date('2026-10-02T15:00').getTime();
const JAM = 60 * 60 * 1000;

const lap = (id: number, isi: Partial<Laporan>): Laporan => ({
  id,
  tipe: 'ditemukan',
  kategori: 'Dompet & Kartu',
  lokasi: 'Perpustakaan Pusat',
  waktu_kejadian: new Date(now - 2 * JAM).toISOString(),
  deskripsi: 'Dompet kulit cokelat model lipat.',
  foto_url: null,
  status: 'disetujui',
  createdAt: new Date(now - JAM).toISOString(),
  ...isi,
});

const mt = (id: number, lost: number, found: number, skor: number | null, isi: Partial<Match> = {}): Match => ({
  id,
  lost_report_id: lost,
  found_report_id: found,
  visual_score: 0.91,
  text_score: 0.82,
  confidence_score: skor,
  status: 'pending',
  ...isi,
});

const hilang = lap(1, { tipe: 'hilang', waktu_kejadian: new Date(now - 5 * JAM).toISOString() });
const semua = [
  hilang,
  lap(2, {}),
  lap(3, { lokasi: 'Kantin Fakultas Teknik' }),
  lap(4, {}),
  lap(5, { status: 'pending' }),
  lap(6, { tipe: 'hilang' }),
];

test('persen menerima skala 0-1 maupun 0-100', () => {
  assert.equal(persen(0.874), 87);
  assert.equal(persen(87.4), 87);
  assert.equal(persen(1), 100);
  assert.equal(persen(null), null);
  assert.equal(persen(150), 100);
});

test('tingkat mengikuti ambang di konstanta', () => {
  assert.equal(tingkat(87), 'tinggi');
  assert.equal(tingkat(80), 'tinggi');
  assert.equal(tingkat(72), 'sedang');
  assert.equal(tingkat(54), 'rendah');
});

test('kecocokanUntuk menyaring, mengambil skor terbaik per lawan, dan mengurutkan', () => {
  const matches = [
    mt(10, 1, 2, 0.87),
    mt(11, 1, 3, 0.72),
    mt(12, 1, 4, 0.41), // di bawah ambang tampil
    mt(13, 1, 5, 0.95), // lawan belum disetujui
    mt(14, 9, 2, 0.99), // milik laporan lain
    mt(15, 1, 3, 0.65), // duplikat lawan 3 dengan skor lebih rendah
    mt(16, 1, 2, 0.9, { status: 'ditolak' }), // ditandai bukan barangnya
    mt(17, 1, 6, 0.9), // lawan bertipe sama
  ];
  const hasil = kecocokanUntuk(hilang, matches, semua);
  assert.deepEqual(hasil.map((h) => [h.lawan.id, h.skor, h.tingkat]), [[2, 87, 'tinggi'], [3, 72, 'sedang']]);
  assert.equal(hasil[0].foto, 91);
  assert.equal(hasil[0].deskripsi, 82);
});

test('kecocokanUntuk bekerja dari sisi laporan temuan', () => {
  const hasil = kecocokanUntuk(semua[1], [mt(10, 1, 2, 87)], semua);
  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].lawan.id, 1);
});

test('faktaKecocokan menjelaskan lokasi, waktu, dan kategori', () => {
  const f = faktaKecocokan(hilang, semua[1]);
  assert.deepEqual(f, [
    { nama: 'Lokasi', teks: 'Sama · Perpustakaan Pusat', sama: true },
    { nama: 'Waktu', teks: '3 jam setelah hilang', sama: true },
    { nama: 'Kategori', teks: 'Sama · Dompet & Kartu', sama: true },
  ]);
  const sebelum = faktaKecocokan(hilang, lap(7, { lokasi: 'Masjid Kampus', waktu_kejadian: new Date(now - 30 * JAM).toISOString() }));
  assert.equal(sebelum[0].sama, false);
  assert.equal(sebelum[1].teks, '25 jam sebelum hilang');
  assert.equal(sebelum[1].sama, false);
});

test('kondisiCocok', () => {
  assert.equal(kondisiCocok({ ...hilang, status: 'pending' }, 0, now), 'moderasi');
  assert.equal(kondisiCocok({ ...hilang, status: 'ditolak' }, 0, now), 'ditolak');
  assert.equal(kondisiCocok(hilang, 2, now), 'ada');
  assert.equal(kondisiCocok({ ...hilang, updatedAt: new Date(now - 3 * 60000).toISOString() }, 0, now), 'menunggu');
  assert.equal(kondisiCocok({ ...hilang, updatedAt: new Date(now - JAM).toISOString() }, 0, now), 'kosong');
});

test('idDariPath dan nomor', () => {
  assert.equal(idDariPath('/katalog/12'), 12);
  assert.equal(idDariPath('/katalog/12/'), 12);
  assert.equal(idDariPath('/katalog'), null);
  assert.equal(idDariPath('/katalog/abc'), null);
  assert.equal(idDariPath('/katalog/0'), null);
  assert.equal(nomor(7), '#FI-00007');
});
