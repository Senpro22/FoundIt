import { useEffect, useMemo, useState } from 'react';
import { KATEGORI, LOKASI } from './konstanta';
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

// Ikon garis per kategori, dipakai kalau laporan tidak punya foto.
const IKON: Record<string, string> = {
  'Dompet & Kartu': 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 11h5v5h-5a2.5 2.5 0 0 1 0-5zM5 6l10-3 1.2 3',
  Elektronik: 'M9 2.5h6a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM11 18h2',
  Kunci: 'M4 15a4 4 0 1 0 8 0a4 4 0 1 0-8 0M11 12l8-8M16 7l2 2M14 9l2 2',
  Tas: 'M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  Pakaian: 'M8 3L3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z',
  Dokumen: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  Lainnya: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
};

const slug = (kategori: string) => (IKON[kategori] ? kategori.split(' ')[0].toLowerCase() : 'lainnya');

function Ikon({ d, ukuran = 16 }: { d: string; ukuran?: number }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const PIN = 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 6.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5';
const JAM = 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2';
const CARI = 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-3.5-3.5';

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
