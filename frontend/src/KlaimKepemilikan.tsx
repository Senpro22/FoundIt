import { useEffect, useRef, useState, type FormEvent } from 'react';
import { judulKartu, waktuRelatif, type Laporan } from './katalogLogic';
import { formatMB } from './formLogic';
import { nomor, persen, type Match } from './detailLogic';
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
import { CENTANG, GEMBOK, Ikon, KEMBALI, TAMBAH, ikonKategori, slug } from './ikon';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const Wajib = () => <span className="wajib">*</span>;

function PesanError({ pesan, id }: { pesan?: string; id?: string }) {
  if (!pesan) return null;
  return (
    <p className="pesan-error" id={id}>
      <span className="bulat">!</span>
      <span>{pesan}</span>
    </p>
  );
}

function Header() {
  return (
    <header>
      <div className="kiri">
        <div className="merk">
          <div className="mark" />
          <span>FoundIt</span>
        </div>
        <nav>
          <a href="#">Beranda</a>
          <a href="/">Lapor</a>
          <a href="/katalog">Katalog</a>
          <a href="#" aria-current="page">
            Riwayat
          </a>
        </nav>
      </div>
      <div className="user">
        <span>Rizky Ananda</span>
        <div className="avatar">RA</div>
      </div>
    </header>
  );
}

function FotoBarang({ l, ukuran }: { l: Laporan; ukuran: number }) {
  const [gagal, setGagal] = useState(false);
  return (
    <div className={`foto-detail k-${slug(l.kategori)}`}>
      {l.foto_url && !gagal ? (
        <img src={BASE + l.foto_url} alt="" onError={() => setGagal(true)} />
      ) : (
        <span className="ikon-kategori">
          <Ikon d={ikonKategori(l.kategori)} ukuran={ukuran} tebal={1.3} />
        </span>
      )}
    </div>
  );
}

type Konteks = { temuan: Laporan; hilang: Laporan | null; match: Match | null };

function KartuBarang({ k }: { k: Konteks }) {
  const skor = persen(k.match?.confidence_score);
  return (
    <section className="kartu kartu-diklaim" aria-labelledby="judul-diklaim">
      <h2 id="judul-diklaim">Barang yang kamu klaim</h2>
      <FotoBarang l={k.temuan} ukuran={48} />
      <div className="info-diklaim">
        <span>Temuan {nomor(k.temuan.id)}</span>
        <b>{judulKartu(k.temuan)}</b>
        <span>
          Ditemukan di {k.temuan.lokasi} · {waktuRelatif(k.temuan.waktu_kejadian)}
        </span>
      </div>
      {skor != null && k.hilang && (
        <div className="skor-diklaim">
          <span>Mirip dengan laporan {nomor(k.hilang.id)}</span>
          <strong>{skor}%</strong>
        </div>
      )}
    </section>
  );
}

function AlurKlaim() {
  return (
    <section className="kartu alur-klaim" aria-labelledby="judul-alur">
      <h2 id="judul-alur">Setelah klaim dikirim</h2>
      <ol>
        <li>Petugas mencocokkan KTM dan jawabanmu dengan barang fisiknya.</li>
        <li>Kamu dapat notifikasi saat klaim diterima atau ditolak.</li>
        <li>Ambil barang di pos yang ditunjuk dengan membawa KTM asli.</li>
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
      setGagal((err as Error).message === 'Failed to fetch' ? 'Tidak bisa terhubung ke server FoundIt.' : (err as Error).message);
    } finally {
      setMengirim(false);
    }
  }

  const batalUrl = `/katalog/${k.hilang?.id ?? k.temuan.id}`;
  const tombolKirim = (
    <button type="submit" className="tombol utama" disabled={mengirim}>
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
  );
  const tombolBatal = (
    <a className="tombol netral" href={batalUrl} aria-disabled={mengirim || undefined}>
      Batal
    </a>
  );

  return (
    <form onSubmit={kirim} className={`form-klaim${mengirim ? ' mengirim' : ''}`} noValidate>
      {gagal && (
        <div className="banner" role="alert">
          <span className="bulat">!</span>
          <div>
            <b>Klaim gagal dikirim</b>
            <p>{gagal} Isian kamu masih tersimpan di halaman ini, jadi tidak perlu mengisi ulang.</p>
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <div className="banner" role="alert">
          <span className="bulat">!</span>
          <div>
            <b>Klaim belum bisa dikirim</b>
            <p>
              Masih ada {errors.length} bagian yang perlu dilengkapi: {ringkasError(errors)}.
            </p>
          </div>
        </div>
      )}

      <div className="kolom-klaim">
        <div className="kartu isian-klaim">
          <section className="bagian-klaim" aria-labelledby="judul-ktm">
            <div>
              <h2 id="judul-ktm">
                1. Foto KTM <Wajib />
              </h2>
              <p className="sub-bagian" id="ktm-aturan">
                Pastikan nama, NIM, dan foto wajah di KTM terbaca jelas. JPG, JPEG, PNG, atau WEBP, maksimal 5 MB.
              </p>
            </div>
            <input
              ref={inputKtm}
              type="file"
              id="ktm"
              className="sr-only"
              accept=".jpg,.jpeg,.png,.webp"
              disabled={mengirim}
              onChange={(e) => e.target.files?.[0] && pasangKtm(e.target.files[0])}
            />
            {ktm && ktmUrl ? (
              <div className="pratinjau pratinjau-ktm">
                <img src={ktmUrl} alt="Pratinjau foto KTM" />
                <div className="berkas">
                  <div className="nama">
                    <b>{ktm.name}</b>
                    <span>
                      {formatMB(ktm.size)} · {ktm.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                  <div className="tombol-berkas">
                    <button type="button" className="tombol netral kecil" disabled={mengirim} onClick={() => inputKtm.current?.click()}>
                      Ganti
                    </button>
                    <button type="button" className="tombol hapus kecil" disabled={mengirim} onClick={lepasKtm}>
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                ref={tombolKtm}
                type="button"
                className={`dropzone dropzone-ktm${drag ? ' drag' : ''}${errorOf('ktm') ? ' salah' : ''}`}
                aria-describedby="ktm-aturan"
                aria-invalid={Boolean(errorOf('ktm')) || undefined}
                disabled={mengirim}
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
                <span className="ikon">{drag ? '↓' : errorOf('ktm') ? '!' : '↑'}</span>
                <span className="judul">{drag ? 'Lepas foto untuk mengunggah' : 'Tarik foto KTM ke sini atau pilih file'}</span>
                <span className="aturan">JPG, JPEG, PNG, atau WEBP · maksimal 5 MB</span>
              </button>
            )}
            <PesanError pesan={errorOf('ktm')} />
            <p className="catatan-privasi">
              <Ikon d={GEMBOK} ukuran={18} tebal={2} />
              <span>
                Foto KTM hanya dilihat petugas keamanan untuk verifikasi, tidak ditampilkan ke penemu atau pengguna
                lain, dan dihapus setelah serah terima selesai.
              </span>
            </p>
          </section>

          <div className="pemisah" />

          <section className="bagian-klaim" aria-labelledby="judul-tanya">
            <div>
              <h2 id="judul-tanya">2. Pertanyaan verifikasi</h2>
              <p className="sub-bagian">
                Pertanyaan ini soal ciri yang tidak ditampilkan di katalog, jadi hanya pemilik aslinya yang tahu. Jawab
                sedetail yang kamu ingat.
              </p>
            </div>
            {pertanyaan.map((q, i) => {
              const id = `jawaban-${i + 1}` as FieldKlaim;
              const err = errorOf(id);
              return (
                <div className="field" key={id}>
                  <label htmlFor={id}>
                    {q} <Wajib />
                  </label>
                  <textarea
                    id={id}
                    maxLength={MAKS_JAWABAN}
                    placeholder={contoh[i]}
                    value={jawaban[i]}
                    disabled={mengirim}
                    aria-invalid={Boolean(err) || undefined}
                    aria-describedby={err ? `${id}-error` : undefined}
                    onChange={(e) => {
                      const v = e.target.value;
                      setJawaban((j) => (i === 0 ? [v, j[1]] : [j[0], v]));
                      if (err && v.trim()) tanpaField(id);
                    }}
                  />
                  <PesanError pesan={err} id={`${id}-error`} />
                  <span className="hitung hitung-kanan">
                    {jawaban[i].length}/{MAKS_JAWABAN}
                  </span>
                </div>
              );
            })}
          </section>

          <div className="pemisah" />

          <section className="bagian-klaim" aria-labelledby="judul-bukti">
            <div>
              <h2 id="judul-bukti">
                3. Bukti tambahan <span className="opsional">(opsional)</span>
              </h2>
              <p className="sub-bagian">
                Foto lama saat barang dipakai, struk pembelian, atau foto kotaknya. Membantu kalau jawabanmu kurang
                meyakinkan.
              </p>
            </div>
            <input
              ref={inputBukti}
              type="file"
              id="bukti"
              className="sr-only"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              disabled={mengirim}
              onChange={(e) => tambahBukti(e.target.files)}
            />
            {bukti.length > 0 && (
              <ul className="daftar-bukti">
                {bukti.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <span className="nama">
                      <b>{f.name}</b>
                      <span>{formatMB(f.size)}</span>
                    </span>
                    <button
                      type="button"
                      className="tombol hapus kecil"
                      disabled={mengirim}
                      onClick={() => {
                        setBukti((b) => b.filter((_, j) => j !== i));
                        tanpaField('bukti');
                      }}
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {bukti.length < MAKS_BUKTI && (
              <button type="button" className="tambah-bukti" disabled={mengirim} onClick={() => inputBukti.current?.click()}>
                <Ikon d={TAMBAH} ukuran={18} tebal={2} />
                Tambah foto bukti
              </button>
            )}
            {errorOf('bukti') ? (
              <PesanError pesan={errorOf('bukti')} />
            ) : (
              <p className="helper">Maksimal {MAKS_BUKTI} foto · JPG, JPEG, PNG, atau WEBP · masing-masing 5 MB</p>
            )}
          </section>

          <div className="pemisah" />

          <div className="field">
            <label className={`pernyataan${errorOf('setuju') ? ' salah' : ''}`}>
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
              <span>
                Saya menyatakan barang ini milik saya dan data yang saya kirim benar. Klaim palsu dapat diteruskan ke
                pihak kampus.
              </span>
            </label>
            <PesanError pesan={errorOf('setuju')} />
          </div>

          <div className="aksi aksi-klaim">
            <span className="catatan">
              {mengirim ? (
                'Form dikunci sementara agar klaim tidak terkirim dua kali.'
              ) : (
                <>
                  Field bertanda <Wajib /> wajib diisi
                </>
              )}
            </span>
            {tombolBatal}
            {tombolKirim}
          </div>
        </div>

        <aside className="samping-klaim">
          <KartuBarang k={k} />
          <AlurKlaim />
        </aside>
      </div>

      <div className="aksi-mobile">
        {tombolBatal}
        {tombolKirim}
      </div>
    </form>
  );
}

// ---------------- Status klaim ----------------

const tanggal = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const PILL: Record<StatusKlaim, string> = { menunggu: 'Menunggu verifikasi', diterima: 'Klaim diterima', ditolak: 'Klaim ditolak' };

function StatusKlaimView({ klaim, k }: { klaim: Klaim; k: Konteks | null }) {
  const s = klaim.status;
  const tahap: { jenis: 'selesai' | 'aktif' | 'gagal' | 'nanti'; judul: string; ket: string }[] = [
    { jenis: 'selesai', judul: 'Klaim diajukan', ket: tanggal(klaim.createdAt) },
    s === 'menunggu'
      ? { jenis: 'aktif', judul: 'Verifikasi petugas', ket: 'Sedang berlangsung' }
      : s === 'diterima'
        ? { jenis: 'selesai', judul: 'Verifikasi petugas', ket: tanggal(klaim.updatedAt ?? klaim.createdAt) }
        : { jenis: 'gagal', judul: 'Verifikasi tidak lolos', ket: tanggal(klaim.updatedAt ?? klaim.createdAt) },
    s === 'diterima'
      ? { jenis: 'aktif', judul: 'Serah terima barang', ket: 'Menunggu kamu datang ke pos' }
      : { jenis: 'nanti', judul: 'Serah terima barang', ket: s === 'ditolak' ? 'Tidak dilanjutkan' : 'Setelah klaim diterima' },
  ];

  return (
    <>
      <div className="kepala-detail">
        <div className="label-detail">
          <span className={`pill-klaim ${s}`}>{PILL[s]}</span>
          <span className="kode">
            Klaim {nomorKlaim(klaim.id)} · diajukan {tanggal(klaim.createdAt)}
          </span>
        </div>
        <h1>{k ? `Klaim ${judulKartu(k.temuan).toLowerCase()}` : `Klaim ${nomorKlaim(klaim.id)}`}</h1>
      </div>
      <div className="kolom-klaim">
        <section className="kartu status-klaim" aria-labelledby="judul-status">
          <h2 id="judul-status">Status klaim</h2>
          {s === 'menunggu' && (
            <div className="banner info" role="status">
              <span className="bulat">i</span>
              <div>
                <b>Sedang diverifikasi petugas</b>
                <p>
                  Petugas keamanan sedang mencocokkan KTM dan jawabanmu dengan barang fisiknya. Kamu akan dapat
                  notifikasi begitu ada keputusan.
                </p>
              </div>
            </div>
          )}
          {s === 'diterima' && (
            <>
              <div className="banner berhasil" role="status">
                <span className="bulat">
                  <Ikon d={CENTANG} ukuran={11} tebal={3.5} />
                </span>
                <div>
                  <b>Klaim diterima, barang siap diambil</b>
                  <p>Tunjukkan kode serah terima dan KTM asli ke petugas di pos berikut.</p>
                </div>
              </div>
              <dl className="serah-terima">
                <div>
                  <dt>Kode serah terima</dt>
                  <dd className="kode-besar">{klaim.kode_serah_terima ?? '-'}</dd>
                </div>
                <div>
                  <dt>Lokasi pengambilan</dt>
                  <dd>{klaim.lokasi_pengambilan ?? 'Hubungi petugas keamanan'}</dd>
                </div>
                <div>
                  <dt>Yang perlu dibawa</dt>
                  <dd>KTM asli</dd>
                </div>
              </dl>
            </>
          )}
          {s === 'ditolak' && (
            <>
              <div className="banner" role="status">
                <span className="bulat">!</span>
                <div>
                  <b>Klaim ditolak petugas</b>
                  <p>{klaim.alasan_tolak ? `Alasan: ${klaim.alasan_tolak}` : 'Petugas tidak mencantumkan alasan.'}</p>
                </div>
              </div>
              <p className="sub-bagian">
                Laporan kehilanganmu tetap aktif dan akan terus dicocokkan dengan temuan baru. Kalau kamu yakin ini
                barangmu, datangi pos satpam dengan bukti tambahan.
              </p>
              {k?.hilang && (
                <a className="tombol netral kecil tombol-kiri" href={`/katalog/${k.hilang.id}`}>
                  Lihat kecocokan lain
                </a>
              )}
            </>
          )}
          <div className="pemisah" />
          <ol className="tahapan" aria-label="Tahapan klaim">
            {tahap.map((t, i) => (
              <li key={t.judul} className={t.jenis}>
                <span className="titik" aria-hidden="true">
                  {t.jenis === 'selesai' ? <Ikon d={CENTANG} ukuran={13} tebal={3.5} /> : t.jenis === 'gagal' ? '!' : t.jenis === 'nanti' ? i + 1 : ''}
                </span>
                <span className="teks-tahap">
                  <b>{t.judul}</b>
                  <span>{t.ket}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <aside className="samping-klaim">
          {k && <KartuBarang k={k} />}
          <section className="kartu ringkas-kirim" aria-labelledby="judul-kirim">
            <h2 id="judul-kirim">Yang kamu kirim</h2>
            <ul>
              <li>
                <span>Foto KTM</span>
                <b className="ok">Terunggah</b>
              </li>
              <li>
                <span>Pertanyaan verifikasi</span>
                <b>2 dari 2 dijawab</b>
              </li>
            </ul>
            <p>Isi jawaban dan foto KTM tidak ditampilkan lagi di sini demi keamanan data.</p>
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
        if (!batal) setGagal((err as Error).message === 'Failed to fetch' ? 'Tidak bisa terhubung ke server FoundIt.' : (err as Error).message);
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
    : { href: k ? `/katalog/${k.hilang?.id ?? k.temuan.id}` : '/katalog', teks: k?.hilang ? 'Kembali ke hasil matching' : 'Kembali ke detail barang' };

  return (
    <>
      <Header />
      <main className="detail klaim">
        <a className="kembali" href={kembali.href}>
          <Ikon d={KEMBALI} ukuran={18} tebal={2} />
          {kembali.teks}
        </a>
        {MODE_DUMMY && (
          <p className="catatan-dummy">
            Mode contoh: klaim belum tersimpan ke server sampai endpoint klaim (Issue #13) selesai.
          </p>
        )}

        {memuat ? (
          <div className="kolom-klaim" aria-busy="true" aria-label="Memuat">
            <div className="kerangka kerangka-form" />
            <div className="kerangka kerangka-samping" />
          </div>
        ) : gagal ? (
          <div className="banner" role="alert">
            <span className="bulat">!</span>
            <div>
              <b>Halaman klaim belum bisa dibuka</b>
              <p>{gagal}</p>
            </div>
            <button type="button" className="tombol netral kecil" onClick={() => setMuatUlang((n) => n + 1)}>
              Coba lagi
            </button>
          </div>
        ) : klaim ? (
          <StatusKlaimView klaim={klaim} k={k} />
        ) : k ? (
          <>
            <div>
              <h1>Ajukan klaim kepemilikan</h1>
              <p className="sub">
                Buktikan barang ini milikmu. Petugas keamanan mencocokkan KTM dan jawabanmu dengan barang fisiknya
                sebelum serah terima.
              </p>
            </div>
            <FormKlaim k={k} selesai={selesai} />
          </>
        ) : null}
      </main>
    </>
  );
}
