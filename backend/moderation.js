// Logika moderasi laporan FoundIt

const STATUS = [
  'pending',
  'disetujui',
  'ditolak',
];

function cekPerubahanStatus(body = {}) {
  const { status, alasan_tolak } = body || {};

  if (!STATUS.includes(status)) {
    return `Status harus salah satu dari: ${STATUS.join(', ')}.`;
  }

  if (status === 'ditolak') {
    if (
      typeof alasan_tolak !== 'string' ||
      !alasan_tolak.trim()
    ) {
      return 'Alasan penolakan wajib diisi.';
    }

    if (alasan_tolak.length > 1000) {
      return 'Alasan penolakan maksimal 1000 karakter.';
    }
  }

  return null;
}

function ringkasStatistik(rows) {
  const hitung = (key) =>
    rows.reduce((acc, r) => {
      const k = r[key] || 'Lainnya';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, Object.create(null));

  const status = hitung('status');

  return {
    total: rows.length,
    pending: status.pending || 0,
    disetujui: status.disetujui || 0,
    ditolak: status.ditolak || 0,
    per_tipe: { ...hitung('tipe') },
    per_kategori: { ...hitung('kategori') },
  };
}

module.exports = {
  STATUS,
  cekPerubahanStatus,
  ringkasStatistik,
};