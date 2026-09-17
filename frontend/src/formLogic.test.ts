// Jalankan: pnpm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFoto, validateForm, type NilaiForm } from './formLogic.ts';

const MB = 1024 * 1024;
const fotoOk = { name: 'dompet-coklat.jpg', size: 2.4 * MB };
const now = new Date('2026-09-15T15:00').getTime();
const lengkap: NilaiForm = {
  foto: fotoOk,
  kategori: 'Dompet & Kartu',
  lokasi: 'Perpustakaan Pusat',
  waktu: '2026-09-14T13:20',
};

test('foto valid diterima', () => {
  assert.equal(validateFoto(fotoOk).ok, true);
});

test('format dan ukuran foto ditolak dengan alasannya', () => {
  const format = validateFoto({ name: 'foto.heic', size: MB });
  const ukuran = validateFoto({ name: 'foto.jpg', size: 8.7 * MB });
  assert.equal(format.ok === false && format.kind, 'format');
  assert.equal(ukuran.ok === false && ukuran.kind, 'size');
  assert.equal(validateFoto(null).ok, false);
});

test('form lengkap tidak menghasilkan error', () => {
  assert.deepEqual(validateForm(lengkap, now), []);
});

test('semua field wajib dilaporkan saat kosong', () => {
  const errors = validateForm({ foto: null, kategori: '', lokasi: '', waktu: '' }, now);
  assert.deepEqual(errors.map((e) => e.field), ['foto', 'kategori', 'lokasi', 'waktu']);
});

test('lokasi "Lainnya" wajib punya detail', () => {
  const errors = validateForm({ ...lengkap, lokasi: 'Lainnya', lokasiDetail: '  ' }, now);
  assert.deepEqual(errors.map((e) => e.field), ['lokasi-detail']);
});

test('waktu setelah sekarang ditolak', () => {
  const errors = validateForm({ ...lengkap, waktu: '2026-09-16T08:00' }, now);
  assert.deepEqual(errors.map((e) => e.field), ['waktu']);
});
