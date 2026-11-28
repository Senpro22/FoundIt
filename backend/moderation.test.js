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

const moderationBE4 = require('./moderation');

const testBE4 = require('node:test');
const assertBE4 = require('node:assert/strict');

testBE4('BE4: status approved ditolak', () => {
  const result = moderationBE4.cekPerubahanStatus({
    status: 'approved',
  });

  assertBE4.notEqual(result, null);
});

testBE4('BE4: status rejected ditolak', () => {
  const result = moderationBE4.cekPerubahanStatus({
    status: 'rejected',
  });

  assertBE4.notEqual(result, null);
});

testBE4('BE4: alasan penolakan berupa angka ditolak', () => {
  const result = moderationBE4.cekPerubahanStatus({
    status: 'ditolak',
    alasan_tolak: 123,
  });

  assertBE4.equal(
    result,
    'Alasan penolakan wajib diisi.'
  );
});

testBE4('BE4: alasan penolakan terlalu panjang', () => {
  const result = moderationBE4.cekPerubahanStatus({
    status: 'ditolak',
    alasan_tolak: 'a'.repeat(1001),
  });

  assertBE4.notEqual(result, null);
});

testBE4('BE4: alasan penolakan valid diterima', () => {
  const result = moderationBE4.cekPerubahanStatus({
    status: 'ditolak',
    alasan_tolak: 'Foto tidak jelas.',
  });

  assertBE4.equal(result, null);
});

testBE4('BE4: body kosong ditolak', () => {
  const result = moderationBE4.cekPerubahanStatus();

  assertBE4.notEqual(result, null);
});

testBE4('BE4: body null ditolak', () => {
  const result = moderationBE4.cekPerubahanStatus(null);

  assertBE4.notEqual(result, null);
});