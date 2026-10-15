// Jalankan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jawabanVerifikasi, nomorKlaim, pertanyaanUntuk, ringkasError, statusValid, validateKlaim, type NilaiKlaim } from './klaimLogic.ts';

const ktm = { name: 'ktm-raka.jpg', size: 1_100_000 };
const lengkap: NilaiKlaim = { ktm, jawaban: ['KTM, ATM BNI', 'Tulisan RK di lipatan'], bukti: [], setuju: true };

test('form lengkap lolos validasi', () => {
  assert.deepEqual(validateKlaim(lengkap), []);
});

test('field kosong menghasilkan error berurutan dari atas', () => {
  const errors = validateKlaim({ ktm: null, jawaban: ['ada', '   '], bukti: [], setuju: false });
  assert.deepEqual(errors.map((e) => e.field), ['ktm', 'jawaban-2', 'setuju']);
  assert.equal(ringkasError(errors), 'foto KTM, jawaban pertanyaan kedua, dan pernyataan kepemilikan');
});

test('KTM memakai aturan foto yang sama dengan Lapor Barang', () => {
  const format = validateKlaim({ ...lengkap, ktm: { name: 'ktm.pdf', size: 1000 } });
  assert.equal(format[0].field, 'ktm');
  assert.match(format[0].message, /\.pdf/);
  const besar = validateKlaim({ ...lengkap, ktm: { name: 'ktm.png', size: 6 * 1024 * 1024 } });
  assert.match(besar[0].message, /lebih dari 5 MB|5 MB/);
});

test('bukti tambahan maksimal 3 dan harus foto valid', () => {
  const empat = Array.from({ length: 4 }, (_, i) => ({ name: `b${i}.jpg`, size: 1000 }));
  assert.equal(validateKlaim({ ...lengkap, bukti: empat })[0].field, 'bukti');
  assert.equal(validateKlaim({ ...lengkap, bukti: [{ name: 'struk.heic', size: 1000 }] })[0].field, 'bukti');
});

test('jawaban terlalu panjang ditolak', () => {
  const errors = validateKlaim({ ...lengkap, jawaban: ['x'.repeat(301), 'ok'] });
  assert.deepEqual(errors.map((e) => e.field), ['jawaban-1']);
});

test('pertanyaan per kategori dan cadangan umum', () => {
  assert.equal(pertanyaanUntuk('Dompet & Kartu')[0], 'Apa saja isi dompet saat hilang?');
  assert.equal(pertanyaanUntuk('Payung').length, 2);
});

test('jawabanVerifikasi berisi pasangan pertanyaan-jawaban', () => {
  const isi = JSON.parse(jawabanVerifikasi('Kunci', [' gantungan biru ', 'motor dan kos']));
  assert.deepEqual(isi[0], { pertanyaan: 'Ada gantungan atau aksesori apa di kuncinya?', jawaban: 'gantungan biru' });
});

test('statusValid dan nomorKlaim', () => {
  assert.equal(statusValid('diterima'), true);
  assert.equal(statusValid('dibatalkan'), false);
  assert.equal(statusValid(null), false);
  assert.equal(nomorKlaim(12), '#K-0012');
});
