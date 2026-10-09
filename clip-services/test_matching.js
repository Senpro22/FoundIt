/**
 * test_matching.js
 * Tes alur integrasi otomatis TANPA CLIP service asli dan TANPA database
 * asli (pakai tiruan). Jalankan: node test_matching.js
 */
const assert = require('assert');
const { createMatchingService, decide } = require('./matchingService');
const { locationScore, timeScore, categoryScore } = require('./textScores');
const cfg = require('./matchingConfig');

const silent = { log() {}, warn() {}, error() {} };
const H = 3600000;
const T0 = new Date('2026-10-01T02:00:00Z');
const at = (hours) => new Date(T0.getTime() + hours * H);

// ---------- 1. Skor teks ----------
assert.strictEqual(locationScore('SGLC', ' sglc ', cfg), 100);
assert.strictEqual(locationScore('SGLC', 'Kantin', cfg), 20);
assert.strictEqual(locationScore(null, 'Kantin', cfg), 50);
assert.strictEqual(locationScore('SGLC', 'Perpus', { ...cfg, NEARBY_LOCATIONS: [['sglc', 'perpus']] }), 60);
assert.strictEqual(timeScore(T0, at(0), cfg), 100);
assert.ok(Math.abs(timeScore(T0, at(72), cfg) - 36.8) < 0.1);
assert.strictEqual(timeScore(T0, at(-3), cfg), 100);  // dalam toleransi
assert.strictEqual(timeScore(T0, at(-10), cfg), 0);   // ditemukan sebelum hilang
assert.strictEqual(timeScore('bukan tanggal', at(0), cfg), 50);
assert.strictEqual(categoryScore('HP', 'hp'), 100);
assert.strictEqual(categoryScore('HP', 'Botol'), 0);
console.log('OK  skor teks');

// ---------- 2. Keputusan threshold ----------
assert.strictEqual(decide({ visual: 88, confidence: 90 }, cfg), 'notify');
assert.strictEqual(decide({ visual: 70, confidence: 84 }, cfg), 'save');   // visual belum cukup utk notifikasi
assert.strictEqual(decide({ visual: 55, confidence: 77 }, cfg), 'discard'); // teks tinggi tapi foto beda jauh
assert.strictEqual(decide({ visual: 72, confidence: 56 }, cfg), 'discard');
assert.strictEqual(decide({ visual: null, confidence: 90 }, cfg), 'discard');
console.log('OK  keputusan threshold');

// ---------- Helper: repo & CLIP tiruan ----------
function makeFakeRepo(reports) {
  const matches = [];
  return {
    matches,
    async findCandidates(q) {
      return reports
        .filter((r) => r.tipe === q.tipe && r.id !== q.excludeReportId && r.foto_url)
        .filter((r) => !q.kategori || r.kategori === q.kategori)
        .filter((r) => q.excludeUserId == null || r.user_id !== q.excludeUserId)
        .slice(0, q.limit);
    },
    async upsertMatch(row) {
      let m = matches.find((x) => x.lost_report_id === row.lost_report_id && x.found_report_id === row.found_report_id);
      if (m) { Object.assign(m, row); return { match: m, created: false }; }
      m = { id: matches.length + 1, status: 'pending', ...row };
      matches.push(m);
      return { match: m, created: true };
    },
    async markNotified(m) { m.status = 'notified'; },
  };
}
// skor visual tiruan ditentukan oleh nama file kandidat
function makeFakeClip(visualByFile, { healthy = true, failOn = null } = {}) {
  return {
    async isClipServiceHealthy() { return healthy; },
    async compareImages(a, b) {
      const file = b.split(/[\\/]/).pop();
      if (failOn === file) throw new Error('boom');
      return { score: visualByFile[file], similarity: visualByFile[file] / 100 };
    },
  };
}

const rep = (id, tipe, o) => ({ id, tipe, kategori: 'HP', lokasi: 'SGLC', user_id: id, foto_url: `/uploads/f${id}.jpg`, waktu_kejadian: at(0), ...o });

(async () => {
  // ---------- 3. Laporan HILANG baru vs kandidat DITEMUKAN ----------
  const reports = [
    rep(10, 'hilang', { user_id: 1 }),                                     // laporan baru
    rep(11, 'ditemukan', { waktu_kejadian: at(2) }),                       // foto 88, lokasi & waktu cocok -> notify
    rep(12, 'ditemukan', { lokasi: 'Kantin', waktu_kejadian: at(72) }),    // foto 72, teks lemah -> buang
    rep(13, 'ditemukan', { waktu_kejadian: at(1) }),                       // foto 55, teks sempurna -> buang (gerbang visual)
    rep(14, 'ditemukan', { waktu_kejadian: at(5) }),                       // foto 70, teks kuat -> simpan saja
    rep(15, 'ditemukan', { kategori: 'Botol' }),                           // beda kategori -> tidak diproses
    rep(1, 'ditemukan', { user_id: 1 }),                                   // user sama -> tidak diproses
    rep(17, 'hilang'),                                                     // tipe sama -> tidak diproses
  ];
  const visual = { 'f11.jpg': 88, 'f12.jpg': 72, 'f13.jpg': 55, 'f14.jpg': 70 };
  const repo = makeFakeRepo(reports);
  const notified = [];
  const svc = createMatchingService({
    repo, clip: makeFakeClip(visual), logger: silent,
    notifier: async (m, ctx) => notified.push({ matchId: m.id, found: ctx.found.id }),
  });

  let s = await svc.processNewReport(reports[0]);
  assert.strictEqual(s.compared, 4);
  assert.strictEqual(s.saved, 2);
  assert.strictEqual(s.discarded, 2);
  assert.strictEqual(s.notifyEligible, 1);
  assert.strictEqual(s.notified, 1);
  assert.deepStrictEqual(repo.matches.map((m) => m.found_report_id).sort(), [11, 14]);
  assert.ok(repo.matches.every((m) => m.lost_report_id === 10));
  assert.strictEqual(repo.matches.find((m) => m.found_report_id === 11).status, 'notified');
  assert.strictEqual(repo.matches.find((m) => m.found_report_id === 14).status, 'pending');
  assert.strictEqual(notified.length, 1);
  console.log('OK  laporan hilang baru -> match tersimpan, 1 notifikasi');

  // ---------- 4. Diproses ulang: tidak duplikat & tidak notifikasi dobel ----------
  s = await svc.processNewReport(reports[0]);
  assert.strictEqual(repo.matches.length, 2);
  assert.strictEqual(s.notified, 0);
  assert.strictEqual(notified.length, 1);
  console.log('OK  diproses ulang: tidak duplikat, tidak notifikasi dobel');

  // ---------- 5. Arah sebaliknya: laporan DITEMUKAN baru ----------
  const reports2 = [rep(20, 'ditemukan', { user_id: 5, waktu_kejadian: at(3) }), rep(21, 'hilang', { user_id: 6 })];
  const repo2 = makeFakeRepo(reports2);
  const svc2 = createMatchingService({ repo: repo2, clip: makeFakeClip({ 'f21.jpg': 90 }), logger: silent });
  s = await svc2.processNewReport(reports2[0]);
  assert.strictEqual(repo2.matches[0].lost_report_id, 21);
  assert.strictEqual(repo2.matches[0].found_report_id, 20);
  assert.strictEqual(s.notifyEligible, 1);
  assert.strictEqual(repo2.matches[0].status, 'pending'); // tanpa notifier, status tidak diubah
  console.log('OK  laporan ditemukan baru -> lost/found tidak tertukar');

  // ---------- 6. CLIP service mati ----------
  const svc3 = createMatchingService({ repo: makeFakeRepo(reports), clip: makeFakeClip(visual, { healthy: false }), logger: silent });
  s = await svc3.processNewReport(reports[0]);
  assert.strictEqual(s.skipped, 'clip_service_mati');
  console.log('OK  CLIP mati -> dilewati tanpa crash');

  // ---------- 7. Satu kandidat error, sisanya tetap jalan ----------
  const svc4 = createMatchingService({ repo: makeFakeRepo(reports), clip: makeFakeClip(visual, { failOn: 'f12.jpg' }), logger: silent });
  s = await svc4.processNewReport(reports[0]);
  assert.strictEqual(s.errors, 1);
  assert.strictEqual(s.saved, 2);
  console.log('OK  satu kandidat error -> kandidat lain tetap diproses');

  // ---------- 8. Laporan tanpa foto ----------
  s = await svc.processNewReport({ id: 99, tipe: 'hilang', foto_url: null });
  assert.strictEqual(s.skipped, 'tanpa_foto');
  console.log('OK  laporan tanpa foto dilewati');

  console.log('\nSEMUA TES LULUS');
})().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
