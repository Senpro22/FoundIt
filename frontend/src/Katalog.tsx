import { useEffect, useMemo, useState } from 'react';
import { KATEGORI, LOKASI } from './konstanta';
import { BASE, Banner, FotoBarang, Kerangka, pesanGagal } from './bersama';
import { CARI, CENTANG, CHEVRON, Ikon, PIN, TAMBAH, ikonKategori, slug } from './ikon';
import { nomor } from './detailLogic';
import {
  FILTER_AWAL,
  adaFilter,
  cocokLokasi,
  judulKartu,
  kelompokHari,
  saring,
  terbaruDulu,
  waktuSingkat,
  type Filter,
  type Laporan,
  type Rentang,
} from './katalogLogic';

const PER_HALAMAN = 12;

const TIPE = [
  { key: 'semua', label: 'Semua' },
  { key: 'hilang', label: 'Hilang' },
  { key: 'ditemukan', label: 'Ditemukan' },
] as const;

const RENTANG: { key: Rentang; label: string }[] = [
  { key: 'semua', label: 'Kapan saja' },
  { key: '24j', label: '24 jam terakhir' },
  { key: '7h', label: '7 hari terakhir' },
  { key: '30h', label: '30 hari terakhir' },
];

type Tampilan = 'daftar' | 'grid';

function Lencana({ tipe }: { tipe: Laporan['tipe'] }) {
  return (
    <span className={`lencana-status ${tipe}`} role="img" aria-label={tipe === 'hilang' ? 'Barang hilang' : 'Ditemukan'}>
      {tipe === 'hilang' ? <b aria-hidden="true">?</b> : <Ikon d={CENTANG} ukuran={11} tebal={3} />}
    </span>
  );
}

function ItemGrid({ l, now }: { l: Laporan; now: number }) {
  return (
    <li>
      <a className="item-grid" href={`/katalog/${l.id}`}>
        <FotoBarang l={l}>
          <Lencana tipe={l.tipe} />
        </FotoBarang>
        <b>{judulKartu(l, 40)}</b>
        <span>
          {l.lokasi} · <time dateTime={l.waktu_kejadian}>{waktuSingkat(l.waktu_kejadian, now)}</time>
        </span>
      </a>
    </li>
  );
}

function ItemDaftar({ l, now }: { l: Laporan; now: number }) {
  return (
    <li>
      <a className="baris item-daftar" href={`/katalog/${l.id}`}>
        <FotoBarang l={l} className="mini" />
        <span className="teks-item">
          <b>{judulKartu(l, 60)}</b>
          <span>
            {l.lokasi} · <time dateTime={l.waktu_kejadian}>{waktuSingkat(l.waktu_kejadian, now)}</time> · {nomor(l.id)}
          </span>
        </span>
        <span className={`titik-status ${l.tipe}`} role="img" aria-label={l.tipe === 'hilang' ? 'Barang hilang' : 'Ditemukan'} />
        <span className="chevron">
          <Ikon d={CHEVRON} ukuran={14} tebal={2} />
        </span>
      </a>
    </li>
  );
}

export default function Katalog() {
  const [laporan, setLaporan] = useState<Laporan[] | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(FILTER_AWAL);
  const [tampil, setTampil] = useState(PER_HALAMAN);
  const [tampilan, setTampilan] = useState<Tampilan>('grid');
  const [muatUlang, setMuatUlang] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setGagal(null);
    setLaporan(null);
    // Katalog publik hanya berisi laporan yang sudah disetujui petugas.
    fetch(`${BASE}/api/reports?status=disetujui`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server menjawab ${res.status}.`);
        return res.json() as Promise<Laporan[]>;
      })
      .then(setLaporan)
      .catch((err: Error) => err.name !== 'AbortError' && setGagal(pesanGagal(err)));
    return () => ctrl.abort();
  }, [muatUlang]);

  const now = useMemo(() => Date.now(), [laporan]);
  const hasil = useMemo(() => (laporan ? saring(laporan, filter, now).sort(terbaruDulu) : []), [laporan, filter, now]);
  const kelompok = useMemo(() => kelompokHari(hasil.slice(0, tampil), now), [hasil, tampil, now]);
  // Angka di sidebar mengikuti filter lain, kecuali filter sidebar itu sendiri.
  const perKategori = useMemo(() => (laporan ? saring(laporan, { ...filter, kategori: '' }, now) : []), [laporan, filter, now]);
  const perLokasi = useMemo(() => (laporan ? saring(laporan, { ...filter, lokasi: '' }, now) : []), [laporan, filter, now]);
  const filterAktif = adaFilter(filter);

  const ubah = (patch: Partial<Filter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setTampil(PER_HALAMAN);
  };
  const reset = () => ubah(FILTER_AWAL);

  return (
    <Kerangka aktif="katalog">
      <main className="paling-lebar katalog">
        <div className="kepala-katalog">
          <div>
            <h1>Katalog</h1>
            <p className="sub">{laporan ? `${laporan.length} barang · ` : ''}semua sudah diverifikasi petugas</p>
          </div>
          <a className="tombol utama" href="/lapor">
            <Ikon d={TAMBAH} ukuran={16} tebal={2.2} /> Lapor Barang
          </a>
        </div>

        <div className="alat" role="search">
          <div className="kolom-cari">
            <label htmlFor="cari" className="sr-only">
              Cari barang
            </label>
            <Ikon d={CARI} ukuran={16} tebal={2} />
            <input
              id="cari"
              type="search"
              value={filter.kata}
              onChange={(e) => ubah({ kata: e.target.value })}
              placeholder="Cari dompet, kunci, KTM…"
              autoComplete="off"
            />
          </div>
          <div className="segmented kecil" role="group" aria-label="Tipe laporan">
            {TIPE.map((t) => (
              <button key={t.key} type="button" aria-pressed={filter.tipe === t.key} onClick={() => ubah({ tipe: t.key })}>
                {t.label}
              </button>
            ))}
          </div>
          <label className="pil-pilih">
            <span className="sr-only">Lokasi</span>
            <select value={filter.lokasi} onChange={(e) => ubah({ lokasi: e.target.value })}>
              <option value="">Lokasi: Semua</option>
              {LOKASI.map((l) => (
                <option key={l} value={l}>
                  Lokasi: {l}
                </option>
              ))}
            </select>
          </label>
          <label className="pil-pilih">
            <span className="sr-only">Waktu</span>
            <select value={filter.rentang} onChange={(e) => ubah({ rentang: e.target.value as Rentang })}>
              {RENTANG.map((r) => (
                <option key={r.key} value={r.key}>
                  Waktu: {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="segmented kecil" role="group" aria-label="Tampilan">
            {(['daftar', 'grid'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tampilan === t} onClick={() => setTampilan(t)}>
                {t === 'daftar' ? 'Daftar' : 'Grid'}
              </button>
            ))}
          </div>
        </div>

        <div className="badan-katalog">
          <aside className="sidebar">
            <div className="grup">
              <h2 className="grup-judul">Kategori</h2>
              <ul className="grup-isi daftar-pilih">
                {['', ...KATEGORI].map((k) => (
                  <li key={k || 'semua'}>
                    <button type="button" className="baris" aria-pressed={filter.kategori === k} onClick={() => ubah({ kategori: k })}>
                      <span className={`kotak-ikon k-${k ? slug(k) : 'semua'}`}>
                        <Ikon d={k ? ikonKategori(k) : CARI} ukuran={13} tebal={2} />
                      </span>
                      <span className="label">{k || 'Semua kategori'}</span>
                      <span className="nilai">{k ? perKategori.filter((l) => l.kategori === k).length : perKategori.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grup lokasi-samping">
              <h2 className="grup-judul">Lokasi</h2>
              <ul className="grup-isi daftar-pilih">
                {LOKASI.filter((l) => l !== 'Lainnya').map((l) => (
                  <li key={l}>
                    <button
                      type="button"
                      className="baris"
                      aria-pressed={filter.lokasi === l}
                      onClick={() => ubah({ lokasi: filter.lokasi === l ? '' : l })}
                    >
                      <span className="pin">
                        <Ikon d={PIN} ukuran={16} tebal={1.8} />
                      </span>
                      <span className="label">{l}</span>
                      <span className="nilai">{perLokasi.filter((x) => cocokLokasi(x.lokasi, l)).length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="isi-katalog">
            {gagal ? (
              <Banner
                judul="Katalog belum bisa dimuat"
                aksi={
                  <button type="button" className="tombol netral kecil" onClick={() => setMuatUlang((n) => n + 1)}>
                    Coba lagi
                  </button>
                }
              >
                {gagal} Pastikan backend jalan, lalu coba lagi.
              </Banner>
            ) : laporan === null ? (
              <ul className="grid-katalog" aria-busy="true" aria-label="Memuat katalog">
                {Array.from({ length: 8 }, (_, i) => (
                  <li key={i} className="kerangka" style={{ aspectRatio: '1' }} />
                ))}
              </ul>
            ) : hasil.length === 0 ? (
              <div className="kartu kosong">
                <span className="ikon-bulat">
                  <Ikon d={CARI} ukuran={20} tebal={2} />
                </span>
                <h2>{laporan.length === 0 ? 'Katalog masih kosong' : 'Belum ada barang yang cocok'}</h2>
                <p>
                  {laporan.length === 0
                    ? 'Belum ada laporan yang disetujui petugas. Laporan baru muncul di sini setelah dimoderasi.'
                    : 'Coba kata kunci lain atau longgarkan filternya. Kalau barangmu hilang, buat laporan supaya FoundIt bisa mencocokkannya otomatis.'}
                </p>
                <div className="aksi">
                  {filterAktif && (
                    <button type="button" className="tombol netral" onClick={reset}>
                      Hapus semua filter
                    </button>
                  )}
                  <a className="tombol utama" href="/lapor">
                    Lapor barang hilang
                  </a>
                </div>
              </div>
            ) : (
              <>
                <p className="sr-only" aria-live="polite">
                  {hasil.length} barang {filterAktif ? 'cocok dengan filter' : 'di katalog'}
                </p>
                {kelompok.map((k) => (
                  <section key={k.judul} className="kelompok" aria-label={k.judul}>
                    <h2>
                      {k.judul} {k.tanggal && <span>{k.tanggal}</span>}
                    </h2>
                    {tampilan === 'grid' ? (
                      <ul className="grid-katalog">
                        {k.isi.map((l) => (
                          <ItemGrid key={l.id} l={l} now={now} />
                        ))}
                      </ul>
                    ) : (
                      <ul className="grup-isi">
                        {k.isi.map((l) => (
                          <ItemDaftar key={l.id} l={l} now={now} />
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
                {hasil.length > tampil && (
                  <button type="button" className="tautan muat-lagi" onClick={() => setTampil((n) => n + PER_HALAMAN)}>
                    Tampilkan {hasil.length - tampil} barang lainnya
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </Kerangka>
  );
}
