const test = require('node:test');
const assert = require('node:assert');
const { cekPerubahanStatus, ringkasStatistik } = require('./moderation');

test('status di luar daftar ditolak', () => {
  assert.ok(cekPerubahanStatus({ status: 'arsip' }));
  assert.equal(cekPerubahanStatus({ status: 'disetujui' }), null);
});

test('menolak laporan wajib pakai alasan', () => {
  assert.ok(cekPerubahanStatus({ status: 'ditolak' }));
  assert.ok(cekPerubahanStatus({ status: 'ditolak', alasan_tolak: '   ' }));
  assert.equal(cekPerubahanStatus({ status: 'ditolak', alasan_tolak: 'Foto buram' }), null);
});

test('statistik menghitung status, tipe, dan kategori', () => {
  const s = ringkasStatistik([
    { status: 'pending', tipe: 'hilang', kategori: 'Kunci' },
    { status: 'pending', tipe: 'ditemukan', kategori: 'Kunci' },
    { status: 'disetujui', tipe: 'hilang', kategori: 'Tas' },
  ]);
  assert.equal(s.total, 3);
  assert.equal(s.pending, 2);
  assert.equal(s.disetujui, 1);
  assert.equal(s.ditolak, 0);
  assert.deepEqual(s.per_tipe, { hilang: 2, ditemukan: 1 });
  assert.deepEqual(s.per_kategori, { Kunci: 2, Tas: 1 });
});
