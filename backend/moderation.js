// Logika moderasi murni (tanpa DB). Dipakai routes/reports.js dan moderation.test.js.

const STATUS = ['pending', 'disetujui', 'ditolak'];

// Mengembalikan pesan error, atau null kalau perubahan status boleh dilakukan.
function cekPerubahanStatus({ status, alasan_tolak }) {
  if (!STATUS.includes(status)) return `Status harus salah satu dari: ${STATUS.join(', ')}.`;
  if (status === 'ditolak' && !String(alasan_tolak || '').trim()) return 'Alasan penolakan wajib diisi.';
  return null;
}

// ponytail: hitung di JS dari satu query. Ganti ke GROUP BY kalau laporan sudah puluhan ribu.
function ringkasStatistik(rows) {
  const hitung = (key) =>
    rows.reduce((acc, r) => {
      const k = r[key] || 'Lainnya';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  const status = hitung('status');
  return {
    total: rows.length,
    pending: status.pending || 0,
    disetujui: status.disetujui || 0,
    ditolak: status.ditolak || 0,
    per_tipe: hitung('tipe'),
    per_kategori: hitung('kategori'),
  };
}

module.exports = { STATUS, cekPerubahanStatus, ringkasStatistik };
