import { useEffect, useMemo, useState } from 'react';
import { KATEGORI, LOKASI } from './konstanta';
import { CARI, IKON, Ikon, JAM, PIN, slug } from './ikon';
import {
  FILTER_AWAL,
  adaFilter,
  judulKartu,
  saring,
  waktuRelatif,
  type Filter,
  type Laporan,
  type Rentang,
} from './katalogLogic';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const API = BASE + '/api/reports';
const PER_HALAMAN = 12;

// Label pendek dipakai di layar sempit supaya tab tidak turun ke dua baris.
const TIPE = [
  { key: 'semua', label: 'Semua', pendek: 'Semua' },
  { key: 'hilang', label: 'Barang hilang', pendek: 'Hilang' },
  { key: 'ditemukan', label: 'Barang ditemukan', pendek: 'Ditemukan' },
] as const;

const RENTANG: { key: Rentang; label: string }[] = [
  { key: 'semua', label: 'Kapan saja' },
  { key: '24j', label: '24 jam terakhir' },
  { key: '7h', label: '7 hari terakhir' },
  { key: '30h', label: '30 hari terakhir' },
];


function Tag({ tipe }: { tipe: Laporan['tipe'] }) {
  return <span className={`tag ${tipe}`}>{tipe === 'hilang' ? 'Hilang' : 'Ditemukan'}</span>;
}

function KartuBarang({ l, now }: { l: Laporan; now: number }) {
  const [fotoGagal, setFotoGagal] = useState(false);
  const adaFoto = l.foto_url && !fotoGagal;
  return (
    <li>
      <a className="kartu-barang" href={`/katalog/${l.id}`}>
        <div className={`foto-barang k-${slug(l.kategori)}`}>
          {adaFoto ? (
            <img src={BASE + l.foto_url} alt="" loading="lazy" onError={() => setFotoGagal(true)} />
          ) : (
            <span className="ikon-kategori">
              <Ikon d={IKON[l.kategori] ?? IKON.Lainnya} ukuran={40} />
            </span>
          )}
          <span className="tag-foto">
            <Tag tipe={l.tipe} />
          </span>
        </div>
        <div className="isi-barang">
          <span className="tag-mobile">
            <Tag tipe={l.tipe} />
          </span>
          <span className="kat">{l.kategori}</span>
          <b>{judulKartu(l)}</b>
          <span className="info">
            <Ikon d={PIN} />
            {l.lokasi}
          </span>
          <span className="info">
            <Ikon d={JAM} />
            <time dateTime={l.waktu_kejadian}>{waktuRelatif(l.waktu_kejadian, now)}</time>
          </span>
        </div>
      </a>
    </li>
  );
}

export default function Katalog() {
  const [laporan, setLaporan] = useState<Laporan[] | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(FILTER_AWAL);
  const [tampil, setTampil] = useState(PER_HALAMAN);
  const [muatUlang, setMuatUlang] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setGagal(null);
    setLaporan(null);
    // Katalog publik hanya berisi laporan yang sudah disetujui petugas.
    fetch(`${API}?status=disetujui`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server menjawab ${res.status}.`);
        return res.json() as Promise<Laporan[]>;
      })
      .then(setLaporan)
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setGagal(err.message === 'Failed to fetch' ? 'Tidak bisa terhubung ke server FoundIt.' : err.message);
      });
    return () => ctrl.abort();
  }, [muatUlang]);

  const now = useMemo(() => Date.now(), [laporan]);
  const hasil = useMemo(() => (laporan ? saring(laporan, filter, now) : []), [laporan, filter, now]);
  const filterAktif = adaFilter(filter);

  const ubah = (patch: Partial<Filter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setTampil(PER_HALAMAN);
  };
  const reset = () => ubah(FILTER_AWAL);

  return (
    <>
      <header>
        <div className="kiri">
          <div className="merk">
            <div className="mark" />
            <span>FoundIt</span>
          </div>
          <nav>
            <a href="#">Beranda</a>
            <a href="/">Lapor</a>
            <a href="/katalog" aria-current="page">
              Katalog
            </a>
            <a href="#">Riwayat</a>
          </nav>
        </div>
        <div className="user">
          <span>Rizky Ananda</span>
          <div className="avatar">RA</div>
        </div>
      </header>

      <main className="katalog">
        <div className="kepala">
          <div>
            <h1>Katalog Barang</h1>
            <p className="sub">Semua laporan barang hilang dan temuan di kampus yang sudah diverifikasi petugas.</p>
          </div>
          <a className="tombol utama" href="/">
            <span aria-hidden="true">+</span> Lapor barang
          </a>
        </div>

        <section className="kartu panel-filter" aria-label="Cari dan saring barang">
          <div className="baris-cari">
            <div className="kolom-cari">
              <label htmlFor="cari" className="sr-only">
                Cari barang
              </label>
              <Ikon d={CARI} ukuran={18} />
              <input
                id="cari"
                type="search"
                value={filter.kata}
                onChange={(e) => ubah({ kata: e.target.value })}
                placeholder='Cari barang, misal "dompet cokelat" atau "kunci motor"'
                autoComplete="off"
              />
            </div>
            <div className="pilih">
              <label htmlFor="f-lokasi">Lokasi</label>
              <select id="f-lokasi" value={filter.lokasi} onChange={(e) => ubah({ lokasi: e.target.value })}>
                <option value="">Semua lokasi</option>
                {LOKASI.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="pilih">
              <label htmlFor="f-waktu">Tanggal</label>
              <select id="f-waktu" value={filter.rentang} onChange={(e) => ubah({ rentang: e.target.value as Rentang })}>
                {RENTANG.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tabs" role="group" aria-label="Tipe laporan">
            {TIPE.map((t) => (
              <button key={t.key} type="button" aria-pressed={filter.tipe === t.key} onClick={() => ubah({ tipe: t.key })}>
                <span className="label-panjang">{t.label}</span>
                <span className="label-pendek">{t.pendek}</span>
              </button>
            ))}
          </div>

          <div className="chips" role="group" aria-label="Kategori">
            {['', ...KATEGORI].map((k) => (
              <button key={k || 'semua'} type="button" className="chip" aria-pressed={filter.kategori === k}
                onClick={() => ubah({ kategori: k })}>
                {k || 'Semua kategori'}
              </button>
            ))}
          </div>
        </section>

        {gagal ? (
          <div className="banner" role="alert">
            <span className="bulat">!</span>
            <div>
              <b>Katalog belum bisa dimuat</b>
              <p>{gagal} Pastikan backend jalan, lalu coba lagi.</p>
            </div>
            <button type="button" className="tombol netral kecil" onClick={() => setMuatUlang((n) => n + 1)}>
              Coba lagi
            </button>
          </div>
        ) : laporan === null ? (
          <ul className="grid-barang" aria-busy="true" aria-label="Memuat katalog">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="kerangka" />
            ))}
          </ul>
        ) : (
          <>
            <div className="ringkasan">
              <p aria-live="polite">
                <b>{hasil.length} barang</b> {filterAktif ? 'cocok dengan filter' : 'di katalog'}
              </p>
              {filterAktif && (
                <button type="button" className="tautan" onClick={reset}>
                  Hapus filter
                </button>
              )}
            </div>

            {hasil.length === 0 ? (
              <div className="kartu kosong-katalog">
                <span className="ikon-kosong">
                  <Ikon d={CARI} ukuran={26} />
                </span>
                <h2>{laporan.length === 0 ? 'Katalog masih kosong' : 'Belum ada barang yang cocok'}</h2>
                <p>
                  {laporan.length === 0
                    ? 'Belum ada laporan yang disetujui petugas. Laporan baru muncul di sini setelah dimoderasi.'
                    : 'Coba kata kunci lain atau longgarkan filternya. Kalau barangmu hilang, buat laporan supaya FoundIt bisa mencocokkannya otomatis saat ada temuan baru.'}
                </p>
                <div className="aksi-kosong">
                  {filterAktif && (
                    <button type="button" className="tombol netral" onClick={reset}>
                      Hapus semua filter
                    </button>
                  )}
                  <a className="tombol utama" href="/">
                    Lapor barang hilang
                  </a>
                </div>
              </div>
            ) : (
              <ul className="grid-barang">
                {hasil.slice(0, tampil).map((l) => (
                  <KartuBarang key={l.id} l={l} now={now} />
                ))}
              </ul>
            )}

            {hasil.length > tampil && (
              <button type="button" className="tombol netral muat-lagi" onClick={() => setTampil((n) => n + PER_HALAMAN)}>
                Muat lebih banyak ({hasil.length - tampil} lagi)
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}
