const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateClaim,
  validId,
  imageExtension,
} = require('./claimValidation');

const validBody = {
  found_report_id: '1',
  setuju: 'true',
  jawaban_verifikasi: JSON.stringify([
    {
      pertanyaan: 'Apa mereknya?',
      jawaban: 'Samsung',
    },
    {
      pertanyaan: 'Apa ciri khususnya?',
      jawaban: 'Casing hitam',
    },
  ]),
};

const validFiles = {
  ktm: [{ originalname: 'ktm_test.jpg' }],
  bukti: [],
};

test('klaim valid diterima', () => {
  assert.equal(
    validateClaim(validBody, validFiles),
    null
  );
});

test('KTM wajib diunggah', () => {
  assert.ok(
    validateClaim(validBody, {})
  );
});

test('ID barang tidak valid ditolak', () => {
  assert.ok(
    validateClaim(
      { ...validBody, found_report_id: '-1' },
      validFiles
    )
  );
});

test('jawaban kosong ditolak', () => {
  assert.ok(
    validateClaim(
      { ...validBody, jawaban_verifikasi: '[]' },
      validFiles
    )
  );
});

test('format JSON yang salah ditolak', () => {
  assert.ok(
    validateClaim(
      { ...validBody, jawaban_verifikasi: 'salah' },
      validFiles
    )
  );
});

test('bukti tambahan maksimal tiga', () => {
  assert.ok(
    validateClaim(validBody, {
      ...validFiles,
      bukti: [{}, {}, {}, {}],
    })
  );
});

test('pernyataan kepemilikan wajib disetujui', () => {
  assert.ok(
    validateClaim(
      { ...validBody, setuju: 'false' },
      validFiles
    )
  );
});

test('ID harus berupa bilangan bulat positif', () => {
  assert.equal(validId('10'), true);
  assert.equal(validId('1.5'), false);
  assert.equal(validId('abc'), false);
  assert.equal(validId(''), false);
});

test('file teks bukan gambar', () => {
  assert.equal(
    imageExtension(Buffer.from('file teks')),
    null
  );
});