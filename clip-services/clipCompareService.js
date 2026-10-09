/**
 * clipCompareService.js
 * FoundIt - Issue #12 (lanjutan)
 *
 * Wrapper Node.js untuk memanggil clip_service.py (Python/Flask) yang
 * menghasilkan skor kemiripan visual (CLIP) antara 2 gambar.
 *
 * Asumsi: clip_service.py sudah jalan terpisah di localhost:5001
 * (lihat clip_service.py untuk cara menjalankannya).
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const CLIP_SERVICE_URL = process.env.CLIP_SERVICE_URL || 'http://localhost:5001';

/**
 * Bandingkan 2 gambar lewat CLIP service, dapatkan skor kemiripan visual.
 *
 * @param {string} imagePath1 - path file gambar pertama (misal foto laporan baru)
 * @param {string} imagePath2 - path file gambar kedua (misal foto di database)
 * @returns {Promise<{score: number, similarity: number}>}
 */
async function compareImages(imagePath1, imagePath2) {
  const form = new FormData();
  form.append('image1', fs.createReadStream(imagePath1));
  form.append('image2', fs.createReadStream(imagePath2));

  try {
    const response = await axios.post(`${CLIP_SERVICE_URL}/compare`, form, {
      headers: form.getHeaders(),
      timeout: 15000, // model inference biasanya <1 detik, tapi kasih buffer
    });
    return response.data; // { score: 85.9, similarity: 0.859 }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error(
        `Tidak bisa konek ke CLIP service di ${CLIP_SERVICE_URL}. ` +
        `Pastikan 'python clip_service.py' sudah dijalankan.`
      );
    }
    throw err;
  }
}

/**
 * Cek apakah CLIP service hidup. Berguna untuk health check saat backend start.
 * @returns {Promise<boolean>}
 */
async function isClipServiceHealthy() {
  try {
    const res = await axios.get(`${CLIP_SERVICE_URL}/health`, { timeout: 3000 });
    return res.data.status === 'ok';
  } catch {
    return false;
  }
}

module.exports = { compareImages, isClipServiceHealthy };
