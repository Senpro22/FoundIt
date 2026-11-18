import { useEffect, useRef, useState, type FormEvent } from 'react';
import { judulKartu, waktuRelatif, type Laporan } from './katalogLogic';
import { formatMB } from './formLogic';
import { LABEL_TINGKAT, nomor, persen, tingkat, type Match } from './detailLogic';
import {
  MAKS_BUKTI,
  MAKS_JAWABAN,
  contohJawaban,
  jawabanVerifikasi,
  nomorKlaim,
  pertanyaanUntuk,
  ringkasError,
  statusValid,
  validateKlaim,
  validateKtm,
  type ErrorKlaim,
  type FieldKlaim,
  type StatusKlaim,
} from './klaimLogic';
import { MODE_DUMMY, ambilKlaim, kirimKlaim, type Klaim } from './klaimApi';
import { BASE, Banner, Cincin, FotoBarang, Kerangka, PesanError, pesanGagal } from './bersama';
import { CENTANG, GEMBOK, Ikon, JAM, KTM, PANAH_KIRI, SERU, SILANG, TAMBAH, UNGGAH } from './ikon';

type Konteks = { temuan: Laporan; hilang: Laporan | null; match: Match | null };

function KartuBarang({ k }: { k: Konteks }) {
  const skor = persen(k.match?.confidence_score);
  return (
    <section className="grup" aria-labelledby="judul-diklaim">
      <h2 className="grup-judul" id="judul-diklaim">
        Barang yang kamu klaim
      </h2>
      <div className="grup-isi kartu-diklaim">
        <div className="atas-diklaim">
          <FotoBarang l={k.temuan} className="mini" />
          <div className="info-diklaim">
            <span>Temuan {nomor(k.temuan.id)}</span>
            <b>{judulKartu(k.temuan)}</b>
            <span>
              {k.temuan.lokasi} · {waktuRelatif(k.temuan.waktu_kejadian)}
            </span>
          </div>
        </div>
        {skor != null && k.hilang && (
          <div className="skor-diklaim">
            <div>
              <b className={`teks-${tingkat(skor)}`}>{LABEL_TINGKAT[tingkat(skor)]}</b>
              <span>dengan laporanmu {nomor(k.hilang.id)}</span>
            </div>
            <Cincin skor={skor} tingkat={tingkat(skor)} ukuran={34} tebal={3} />
          </div>
        )}
      </div>
    </section>
  );
}

function AlurKlaim() {
  const langkah = [
    ['Petugas memverifikasi', 'KTM dan jawabanmu dicocokkan dengan barang fisiknya.'],
    ['Kamu dapat notifikasi', 'Saat klaim diterima atau ditolak.'],
    ['Ambil di pos', 'Bawa KTM asli ke pos yang ditunjuk.'],
  ];
  return (
    <section className="grup" aria-labelledby="judul-alur">
      <h2 className="grup-judul" id="judul-alur">
        Setelah klaim dikirim
      </h2>
      <ol className="grup-isi tahapan">
        {langkah.map(([judul, ket]) => (
          <li key={judul} className="nanti">
            <span className="titik" aria-hidden="true" />
            <b>{judul}</b>
            <span className="ket">{ket}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------- Form klaim ----------------

function FormKlaim({ k, selesai }: { k: Konteks; selesai: (klaim: Klaim) => void }) {
  const [ktm, setKtm] = useState<File | null>(null);
  const [ktmUrl, setKtmUrl] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [jawaban, setJawaban] = useState<[string, string]>(['', '']);
  const [bukti, setBukti] = useState<File[]>([]);
  const [setuju, setSetuju] = useState(false);
  const [errors, setErrors] = useState<ErrorKlaim[]>([]);
  const [mengirim, setMengirim] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  const inputKtm = useRef<HTMLInputElement>(null);
  const tombolKtm = useRef<HTMLButtonElement>(null);
  const inputBukti = useRef<HTMLInputElement>(null);
  const pertanyaan = pertanyaanUntuk(k.temuan.kategori);
  const contoh = contohJawaban(k.temuan.kategori);
  const errorOf = (f: FieldKlaim) => errors.find((e) => e.field === f)?.message;
  const tanpaField = (f: FieldKlaim) => setErrors((es) => es.filter((e) => e.field !== f));

  useEffect(() => () => {
    if (ktmUrl) URL.revokeObjectURL(ktmUrl);
  }, [ktmUrl]);

  function pasangKtm(file: File) {
    const salah = validateKtm(file);
    if (salah) {
      lepasKtm();
      setErrors((es) => [salah, ...es.filter((e) => e.field !== 'ktm')]);
      return;
    }
    setKtm(file);
    setKtmUrl(URL.createObjectURL(file));
    tanpaField('ktm');
  }

  function lepasKtm() {
    setKtm(null);
    setKtmUrl(null);
    if (inputKtm.current) inputKtm.current.value = '';
  }

  function tambahBukti(files: FileList | null) {
    if (!files) return;
    setBukti((b) => [...b, ...Array.from(files)].slice(0, MAKS_BUKTI));
    tanpaField('bukti');
    if (inputBukti.current) inputBukti.current.value = '';
  }

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const temuanErr = validateKlaim({ ktm, jawaban, bukti, setuju });
    setErrors(temuanErr);
    if (temuanErr.length) {
      const pertama = temuanErr[0].field;
      const el = pertama === 'ktm' ? (tombolKtm.current ?? inputKtm.current) : document.getElementById(pertama);
      el?.focus();
      return;
    }
    setGagal(null);
    setMengirim(true);
    try {
      const klaim = await kirimKlaim({
        matchId: k.match?.id ?? null,
        temuanId: k.temuan.id,
        ktm: ktm as File,
        bukti,
        jawabanVerifikasi: jawabanVerifikasi(k.temuan.kategori, jawaban),
      });
      selesai(klaim);
    } catch (err) {
      setGagal(pesanGagal(err as Error));
    } finally {
      setMengirim(false);
    }
  }

  const batalUrl = `/katalog/${k.hilang?.id ?? k.temuan.id}`;

  return (
    <form onSubmit={kirim} className={`dua-kolom form-klaim${mengirim ? ' mengirim' : ''}`} noValidate>
      <div className="kolom-form">
        {gagal && (
          <Banner judul="Klaim gagal dikirim">
            {gagal} Isian kamu masih tersimpan di halaman ini, jadi tidak perlu mengisi ulang.
          </Banner>
        )}
        {errors.length > 0 && (
          <Banner judul="Klaim belum bisa dikirim">
            Masih ada {errors.length} bagian yang perlu dilengkapi: {ringkasError(errors)}.
          </Banner>
        )}

        <fieldset className="grup" disabled={mengirim}>
          <legend className="grup-judul">1 · Foto KTM</legend>
          <div className="grup-isi">
            <input
              ref={inputKtm}
              type="file"
              id="ktm"
              className="sr-only"
              tabIndex={-1}
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => e.target.files?.[0] && pasangKtm(e.target.files[0])}
            />
            {ktm && ktmUrl ? (
              <div className="berkas">
                <img src={ktmUrl} alt="Pratinjau foto KTM" />
                <div className="nama-berkas">
                  <b>{ktm.name}</b>
                  <span>
                    {formatMB(ktm.size)} · {ktm.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
                <button type="button" className="tombol teks kecil" onClick={() => inputKtm.current?.click()}>
                  Ganti
                </button>
                <button type="button" className="tombol bahaya kecil" onClick={lepasKtm}>
                  Hapus
                </button>
              </div>
            ) : (
              <div className="bingkai-drop">
                <button
                  ref={tombolKtm}
                  type="button"
                  className={`dropzone${drag ? ' drag' : ''}${errorOf('ktm') ? ' salah' : ''}`}
                  aria-describedby="ktm-aturan"
                  aria-invalid={Boolean(errorOf('ktm')) || undefined}
                  onClick={() => inputKtm.current?.click()}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) pasangKtm(file);
                  }}
                >
                  <span className="ikon-drop">
                    <Ikon d={errorOf('ktm') ? SERU : drag ? UNGGAH : KTM} ukuran={18} tebal={2} />
                  </span>
                  <span className="judul-drop">{drag ? 'Lepas untuk mengunggah' : 'Tarik foto KTM ke sini atau pilih file'}</span>
                  <span className="aturan-drop" id="ktm-aturan">
                    JPG, JPEG, PNG, atau WEBP · maksimal 5 MB
                  </span>
                </button>
              </div>
            )}
          </div>
          {errorOf('ktm') ? (
            <PesanError pesan={errorOf('ktm')} />
          ) : (
            <p className="grup-catatan ikon">
              <Ikon d={GEMBOK} ukuran={13} tebal={1.8} />
              Pastikan nama, NIM, dan foto wajah terbaca jelas. Foto KTM hanya dilihat petugas keamanan dan dihapus setelah serah
              terima selesai.
            </p>
          )}
        </fieldset>

        <fieldset className="grup" disabled={mengirim}>
          <legend className="grup-judul">2 · Pertanyaan verifikasi</legend>
          <div className="grup-isi">
            {pertanyaan.map((q, i) => {
              const id = `jawaban-${i + 1}` as FieldKlaim;
              const err = errorOf(id);
              return (
                <div className={`isian-panjang${err ? ' salah' : ''}`} key={id}>
                  <label htmlFor={id}>{q}</label>
                  <textarea
                    id={id}
                    maxLength={MAKS_JAWABAN}
                    placeholder={contoh[i]}
                    value={jawaban[i]}
                    aria-invalid={Boolean(err) || undefined}
                    aria-describedby={err ? `${id}-error` : undefined}
                    onChange={(e) => {
                      const v = e.target.value;
                      setJawaban((j) => (i === 0 ? [v, j[1]] : [j[0], v]));
                      if (err && v.trim()) tanpaField(id);
                    }}
                  />
                  <span className="hitung">
                    {jawaban[i].length}/{MAKS_JAWABAN}
                  </span>
                </div>
              );
            })}
          </div>
          {errorOf('jawaban-1') || errorOf('jawaban-2') ? (
            (['jawaban-1', 'jawaban-2'] as const).map((f, i) => (
              <PesanError key={f} id={`${f}-error`} pesan={errorOf(f) && `Pertanyaan ${i ? 'kedua' : 'pertama'}: ${errorOf(f)}`} />
            ))
          ) : (
            <p className="grup-catatan">Ciri ini tidak ditampilkan di katalog, jadi hanya pemilik aslinya yang tahu. Jawab sedetail yang kamu ingat.</p>
          )}
        </fieldset>

        <fieldset className="grup" disabled={mengirim}>
          <legend className="grup-judul">3 · Bukti tambahan · opsional</legend>
          <input
            ref={inputBukti}
            type="file"
            id="bukti"
            className="sr-only"
            tabIndex={-1}
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={(e) => tambahBukti(e.target.files)}
          />
          <ul className="grup-isi">
            {bukti.map((f, i) => (
              <li key={`${f.name}-${i}`} className="baris">
                <span className="label nama-bukti">{f.name}</span>
                <span className="nilai">{formatMB(f.size)}</span>
                <button
                  type="button"
                  className="tombol bahaya kecil"
                  onClick={() => {
                    setBukti((b) => b.filter((_, j) => j !== i));
                    tanpaField('bukti');
                  }}
                >
                  Hapus
                </button>
              </li>
            ))}
            {bukti.length < MAKS_BUKTI && (
              <li>
                <button type="button" className="baris tambah-bukti" onClick={() => inputBukti.current?.click()}>
                  <Ikon d={TAMBAH} ukuran={16} tebal={2} />
                  Tambah foto bukti
                </button>
              </li>
            )}
          </ul>
          {errorOf('bukti') ? (
            <PesanError pesan={errorOf('bukti')} />
          ) : (
            <p className="grup-catatan">
              Foto lama saat barang dipakai, struk pembelian, atau foto kotaknya. Maks. {MAKS_BUKTI} foto · JPG, JPEG, PNG, WEBP · 5 MB
              per foto.
            </p>
          )}
        </fieldset>

        <div className="grup">
          <label className={`grup-isi pernyataan${errorOf('setuju') ? ' salah' : ''}`}>
            <input
              type="checkbox"
              id="setuju"
              checked={setuju}
              disabled={mengirim}
              aria-invalid={Boolean(errorOf('setuju')) || undefined}
              onChange={(e) => {
                setSetuju(e.target.checked);
                if (e.target.checked) tanpaField('setuju');
              }}
            />
            <span>Saya menyatakan barang ini milik saya dan data yang saya kirim benar. Klaim palsu dapat diteruskan ke pihak kampus.</span>
          </label>
          <PesanError pesan={errorOf('setuju')} />
        </div>

        <div className="aksi">
          {mengirim && <span className="catatan">Form dikunci sementara agar klaim tidak terkirim dua kali.</span>}
          <a className="tombol netral" href={batalUrl} aria-disabled={mengirim || undefined}>
            Batal
          </a>
          <button type="submit" className={`tombol utama${mengirim ? ' sibuk' : ''}`} disabled={mengirim}>
            {mengirim ? (
              <>
                <span className="spinner" />
                Mengirim klaim...
              </>
            ) : gagal ? (
              'Coba lagi'
            ) : (
              'Kirim klaim'
            )}
          </button>
        </div>
      </div>

      <aside className="samping">
        <KartuBarang k={k} />
        <AlurKlaim />
      </aside>
    </form>
  );
}

// ---------------- Status klaim ----------------

const tanggal = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const tanggalPendek = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const PILL: Record<StatusKlaim, string> = { menunggu: 'Menunggu verifikasi', diterima: 'Klaim diterima', ditolak: 'Klaim ditolak' };

function StatusKlaimView({ klaim, k }: { klaim: Klaim; k: Konteks | null }) {
  const s = klaim.status;
  const diputus = tanggalPendek(klaim.updatedAt ?? klaim.createdAt);
  const tahap: { jenis: 'selesai' | 'aktif' | 'gagal' | 'nanti'; judul: string; ket: string; waktu?: string }[] = [
    { jenis: 'selesai', judul: 'Klaim diajukan', ket: 'Foto KTM dan 2 jawaban terkirim.', waktu: tanggalPendek(klaim.createdAt) },
    s === 'menunggu'
      ? { jenis: 'aktif', judul: 'Verifikasi petugas', ket: 'Sedang berlangsung', waktu: 'Sekarang' }
      : s === 'diterima'
        ? { jenis: 'selesai', judul: 'Verifikasi petugas', ket: 'Ciri dan identitas cocok.', waktu: diputus }
        : { jenis: 'gagal', judul: 'Verifikasi tidak lolos', ket: klaim.alasan_tolak ?? 'Ciri tidak sesuai.', waktu: diputus },
    s === 'diterima'
      ? { jenis: 'aktif', judul: 'Serah terima barang', ket: 'Menunggu kamu datang ke pos', waktu: 'Sekarang' }
      : { jenis: 'nanti', judul: 'Serah terima barang', ket: s === 'ditolak' ? 'Tidak dilanjutkan' : 'Setelah klaim diterima' },
  ];

  return (
    <>
      <div className="kepala-detail">
        <div className="label-tag">
          <span className={`tag ${s}`}>{PILL[s]}</span>
        </div>
        <h1>{k ? `Klaim ${judulKartu(k.temuan).toLowerCase()}` : `Klaim ${nomorKlaim(klaim.id)}`}</h1>
        <p className="sub-kecil">
          Klaim {nomorKlaim(klaim.id)} · diajukan {tanggal(klaim.createdAt)}
        </p>
      </div>
      <div className="dua-kolom">
        <div className="kolom-form">
          <section className={`kartu kartu-status ${s}`} role="status">
            <div className="kepala-status">
              <span className="ikon-status">
                <Ikon d={s === 'menunggu' ? JAM : s === 'diterima' ? CENTANG : SILANG} ukuran={18} tebal={2.2} />
              </span>
              <div>
                <h2>{s === 'menunggu' ? 'Sedang diverifikasi petugas' : s === 'diterima' ? 'Barang siap diambil' : 'Klaim ditolak petugas'}</h2>
                <p>
                  {s === 'menunggu'
                    ? 'Petugas keamanan sedang mencocokkan KTM dan jawabanmu dengan barang fisiknya. Kamu dapat notifikasi begitu ada keputusan.'
                    : s === 'diterima'
                      ? 'Tunjukkan kode serah terima dan KTM asli ke petugas di pos berikut.'
                      : klaim.alasan_tolak
                        ? `Alasan: ${klaim.alasan_tolak}`
                        : 'Petugas tidak mencantumkan alasan.'}
                </p>
              </div>
            </div>
            {s === 'diterima' && (
              <>
                <div className="kode-serah">
                  <span>Kode serah terima</span>
                  <strong>{klaim.kode_serah_terima ?? '-'}</strong>
                </div>
                <dl className="grup-isi bergaris">
                  <div className="baris">
                    <dt className="label">Lokasi pengambilan</dt>
                    <dd className="nilai">{klaim.lokasi_pengambilan ?? 'Hubungi petugas keamanan'}</dd>
                  </div>
                  <div className="baris">
                    <dt className="label">Jam layanan pos</dt>
                    <dd className="nilai">Senin–Sabtu, 07.00–21.00</dd>
                  </div>
                  <div className="baris">
                    <dt className="label">Yang perlu dibawa</dt>
                    <dd className="nilai">KTM asli</dd>
                  </div>
                </dl>
              </>
            )}
            {s === 'ditolak' && (
              <>
                <p className="ket-tolak">
                  Laporan kehilanganmu tetap aktif dan terus dicocokkan dengan temuan baru. Kalau kamu yakin ini barangmu, datangi
                  pos satpam dengan bukti tambahan.
                </p>
                <div className="aksi kiri">
                  {k?.hilang && (
                    <a className="tombol utama" href={`/katalog/${k.hilang.id}`}>
                      Lihat kecocokan lain
                    </a>
                  )}
                  <a className="tombol netral" href="/">
                    Petunjuk ke pos
                  </a>
                </div>
              </>
            )}
          </section>

          <section className="grup" aria-labelledby="judul-tahap">
            <h2 className="grup-judul" id="judul-tahap">
              Status klaim
            </h2>
            <ol className="grup-isi tahapan">
              {tahap.map((t) => (
                <li key={t.judul} className={t.jenis}>
                  <span className="titik" aria-hidden="true">
                    {t.jenis === 'selesai' ? <Ikon d={CENTANG} ukuran={11} tebal={3.5} /> : t.jenis === 'gagal' ? <Ikon d={SILANG} ukuran={10} tebal={3.5} /> : null}
                  </span>
                  <b>{t.judul}</b>
                  {t.waktu && <span className="waktu">{t.waktu}</span>}
                  <span className="ket">{t.ket}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="samping">
          {k && <KartuBarang k={k} />}
          <section className="grup" aria-labelledby="judul-kirim">
            <h2 className="grup-judul" id="judul-kirim">
              Yang kamu kirim
            </h2>
            <dl className="grup-isi">
              <div className="baris">
                <dt className="label">Foto KTM</dt>
                <dd className="nilai">Terunggah</dd>
              </div>
              <div className="baris">
                <dt className="label">Pertanyaan verifikasi</dt>
                <dd className="nilai">2 dari 2</dd>
              </div>
            </dl>
            <p className="grup-catatan ikon">
              <Ikon d={GEMBOK} ukuran={13} tebal={1.8} />
              Isi jawaban dan foto KTM tidak ditampilkan lagi di sini demi keamanan data.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

// ---------------- Halaman ----------------

async function ambil<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Server menjawab ${res.status}.`);
  return res.json() as Promise<T>;
}

// /klaim?match=ID atau /klaim?temuan=ID  -> form
// /klaim/ID                              -> status (di mode dummy, ?status=diterima|ditolak untuk melihat status lain)
export default function KlaimKepemilikan() {
  const q = new URLSearchParams(location.search);
  const idKlaim = Number(/^\/klaim\/(\d+)\/?$/.exec(location.pathname)?.[1] ?? NaN);
  const matchId = Number(q.get('match') ?? NaN);
  const temuanId = Number(q.get('temuan') ?? NaN);
  const statusContoh = q.get('status');

  const [k, setK] = useState<Konteks | null>(null);
  const [klaim, setKlaim] = useState<Klaim | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [muatUlang, setMuatUlang] = useState(0);

  useEffect(() => {
    let batal = false;
    setGagal(null);
    setMemuat(true);
    (async () => {
      try {
        if (idKlaim > 0) {
          const kl = await ambilKlaim(idKlaim, statusValid(statusContoh) ? statusContoh : 'menunggu');
          if (!batal) setKlaim(kl);
          return;
        }
        if (!(matchId > 0) && !(temuanId > 0)) throw new Error('Pilih barang yang mau diklaim dari halaman detail atau katalog.');
        const [laporan, matches] = await Promise.all([
          ambil<Laporan[]>(`${BASE}/api/reports`),
          matchId > 0 ? ambil<Match[]>(`${BASE}/api/matches`) : Promise.resolve([] as Match[]),
        ]);
        const match = matchId > 0 ? (matches.find((m) => m.id === matchId) ?? null) : null;
        const temuan = laporan.find((l) => l.id === (match ? match.found_report_id : temuanId));
        if (!temuan || temuan.tipe !== 'ditemukan') throw new Error('Barang temuan yang mau diklaim tidak ditemukan.');
        const hilang = match ? (laporan.find((l) => l.id === match.lost_report_id) ?? null) : null;
        if (!batal) setK({ temuan, hilang, match });
      } catch (err) {
        if (!batal) setGagal(pesanGagal(err as Error));
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [idKlaim, matchId, temuanId, statusContoh, muatUlang]);

  useEffect(() => {
    document.title = klaim ? 'Status klaim — FoundIt' : 'Ajukan klaim — FoundIt';
  }, [klaim]);

  function selesai(baru: Klaim) {
    setKlaim(baru);
    history.replaceState(null, '', `/klaim/${baru.id}`);
    window.scrollTo(0, 0);
  }

  const kembali = klaim
    ? { href: '#', teks: 'Riwayat laporan' }
    : { href: k ? `/katalog/${k.hilang?.id ?? k.temuan.id}` : '/katalog', teks: k?.hilang ? 'Hasil matching' : 'Detail barang' };

  return (
    <Kerangka aktif="riwayat">
      <main className="lebar klaim">
        <a className="kembali" href={kembali.href}>
          <Ikon d={PANAH_KIRI} ukuran={15} tebal={2} />
          {kembali.teks}
        </a>
        {MODE_DUMMY && <p className="grup-catatan catatan-dummy">Mode contoh: klaim belum tersimpan ke server sampai endpoint klaim (Issue #13) selesai.</p>}

        {memuat ? (
          <div className="dua-kolom" aria-busy="true" aria-label="Memuat">
            <div className="kerangka" style={{ height: 480 }} />
            <div className="kerangka" style={{ height: 260 }} />
          </div>
        ) : gagal ? (
          <Banner
            judul="Halaman klaim belum bisa dibuka"
            aksi={
              <button type="button" className="tombol netral kecil" onClick={() => setMuatUlang((n) => n + 1)}>
                Coba lagi
              </button>
            }
          >
            {gagal}
          </Banner>
        ) : klaim ? (
          <StatusKlaimView klaim={klaim} k={k} />
        ) : k ? (
          <>
            <div>
              <h1>Ajukan klaim kepemilikan</h1>
              <p className="sub">Buktikan barang ini milikmu. Petugas keamanan mencocokkan KTM dan jawabanmu dengan barang fisiknya sebelum serah terima.</p>
            </div>
            <FormKlaim k={k} selesai={selesai} />
          </>
        ) : null}
      </main>
    </Kerangka>
  );
}
