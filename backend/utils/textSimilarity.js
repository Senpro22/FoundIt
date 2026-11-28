function hitungTextScore(lost, found) {
  let skor = 0;

  // Kategori: cocok persis = full skor, beda = 0
  const skorKategori = lost.kategori === found.kategori ? 100 : 0;

  // Lokasi: cocok persis = full skor, beda = 0 (bisa diperhalus nanti)
  const skorLokasi = lost.lokasi === found.lokasi ? 100 : 0;

  // Waktu: makin deket jaraknya makin tinggi skornya, maks 7 hari dianggap relevan
  const selisihMs = Math.abs(new Date(lost.waktu_kejadian) - new Date(found.waktu_kejadian));
  const selisihHari = selisihMs / (1000 * 60 * 60 * 24);
  const skorWaktu = Math.max(0, 100 - (selisihHari / 7) * 100);

  return {
    kategori_score: skorKategori,
    lokasi_score: skorLokasi,
    waktu_score: Math.round(skorWaktu),
  };
}

module.exports = hitungTextScore;