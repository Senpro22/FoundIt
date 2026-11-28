function validId(value) {
  const id = Number(value);

  return Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 2147483647;
}

function validateClaim(body, files = {}) {
  if (!validId(body.found_report_id)) {
    return 'ID barang temuan tidak valid.';
  }

  if (
    body.match_id != null &&
    body.match_id !== '' &&
    !validId(body.match_id)
  ) {
    return 'ID matching tidak valid.';
  }

  if (!files.ktm || files.ktm.length !== 1) {
    return 'Foto KTM wajib diunggah.';
  }

  if ((files.bukti || []).length > 3) {
    return 'Bukti tambahan maksimal 3 foto.';
  }

  if (body.setuju !== 'true') {
    return 'Pernyataan kepemilikan wajib disetujui.';
  }

  let answers;

  try {
    answers = JSON.parse(body.jawaban_verifikasi);
  } catch {
    return 'Format jawaban verifikasi tidak valid.';
  }

  if (!Array.isArray(answers) || answers.length !== 2) {
    return 'Dua pertanyaan verifikasi wajib dijawab.';
  }

  for (const item of answers) {
    if (
      !item ||
      typeof item.pertanyaan !== 'string' ||
      !item.pertanyaan.trim() ||
      item.pertanyaan.length > 300 ||
      typeof item.jawaban !== 'string' ||
      !item.jawaban.trim() ||
      item.jawaban.length > 300
    ) {
      return 'Jawaban verifikasi tidak valid.';
    }
  }

  return null;
}

function imageExtension(buffer) {
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (buffer.subarray(0, 8).equals(png)) {
    return '.png';
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return '.jpg';
  }

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return '.webp';
  }

  return null;
}

module.exports = {
  validId,
  validateClaim,
  imageExtension,
};