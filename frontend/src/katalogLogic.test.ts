// Jalankan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILTER_AWAL, adaFilter, cocokLokasi, judulKartu, saring, waktuRelatif, type Laporan } from './katalogLogic.ts';

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

const data = [
  lap(1, {}),
  lap(2, { tipe: 'hilang', kategori: 'Elektronik', lokasi: 'Kantin Fakultas Teknik', deskripsi: 'Earphone TWS putih' }),
  lap(3, { kategori: 'Kunci', lokasi: 'Parkiran motor FT', deskripsi: 'Kunci motor gantungan biru', waktu_kejadian: new Date(now - 10 * 24 * JAM).toISOString() }),
];

const ids = (xs: Laporan[]) => xs.map((x) => x.id);

test('tanpa filter semua laporan tampil', () => {
  assert.deepEqual(ids(saring(data, FILTER_AWAL, now)), [1, 2, 3]);
  assert.equal(adaFilter(FILTER_AWAL), false);
});

test('filter tipe dan kategori', () => {
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, tipe: 'hilang' }, now)), [2]);
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, kategori: 'Kunci' }, now)), [3]);
});

test('lokasi "Lainnya" menangkap lokasi bebas di luar daftar', () => {
  assert.equal(cocokLokasi('Parkiran motor FT', 'Lainnya'), true);
  assert.equal(cocokLokasi('Perpustakaan Pusat', 'Lainnya'), false);
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, lokasi: 'Lainnya' }, now)), [3]);
});

test('rentang waktu memakai waktu kejadian', () => {
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, rentang: '7h' }, now)), [1, 2]);
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, rentang: '30h' }, now)), [1, 2, 3]);
});

test('kata kunci tidak peka huruf besar dan semua kata harus ada', () => {
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, kata: 'DOMPET cokelat' }, now)), [1]);
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, kata: 'kantin' }, now)), [2]);
  assert.deepEqual(ids(saring(data, { ...FILTER_AWAL, kata: 'dompet hitam' }, now)), []);
  assert.equal(adaFilter({ ...FILTER_AWAL, kata: '  ' }), false);
});

test('judul kartu dari kalimat pertama deskripsi', () => {
  assert.equal(judulKartu({ deskripsi: 'Dompet cokelat. Isinya KTM.', kategori: 'Dompet & Kartu' }), 'Dompet cokelat');
  assert.equal(judulKartu({ deskripsi: '', kategori: 'Tas' }), 'Tas');
  assert.equal(judulKartu({ deskripsi: null, kategori: 'Tas' }), 'Tas');
  const panjang = judulKartu({ deskripsi: 'Tas ransel hitam merek lokal dengan gantungan kunci boneka beruang kecil di resleting depan', kategori: 'Tas' });
  assert.ok(panjang.length <= 61 && panjang.endsWith('…'));
});

test('waktu relatif', () => {
  assert.equal(waktuRelatif(new Date(now - 30 * 1000).toISOString(), now), 'Baru saja');
  assert.equal(waktuRelatif(new Date(now - 25 * 60 * 1000).toISOString(), now), '25 menit lalu');
  assert.equal(waktuRelatif(new Date(now - 5 * JAM).toISOString(), now), '5 jam lalu');
  assert.match(waktuRelatif(new Date('2026-10-01T09:30').toISOString(), now), /^Kemarin, 09.30$/);
  assert.match(waktuRelatif(new Date('2026-09-28T09:30').toISOString(), now), /^28 Sep, 09.30$/);
  assert.equal(waktuRelatif('bukan tanggal', now), '');
});
