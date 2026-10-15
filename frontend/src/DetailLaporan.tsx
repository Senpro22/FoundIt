import { useEffect, useMemo, useState } from 'react';
import { judulKartu, waktuRelatif, type Laporan } from './katalogLogic';
import {
  LABEL_TINGKAT,
  faktaKecocokan,
  idDariPath,
  kecocokanUntuk,
  kondisiCocok,
  nomor,
  type Kecocokan,
  type Match,
} from './detailLogic';
import { AMBANG_TAMPIL, AMBANG_TINGGI } from './konstanta';
import { CENTANG, GEMBOK, Ikon, KEMBALI, LONCENG, STRIP, ikonKategori, slug } from './ikon';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

type LaporanDetail = Laporan & { updatedAt?: string; alasan_tolak?: string | null };

const LABEL_STATUS: Record<string, string> = {
  pending: 'Menunggu moderasi',
  disetujui: 'Disetujui petugas',
  ditolak: 'Ditolak petugas',
};

const tanggal = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

async function ambil<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Server menjawab ${res.status}.`);
  return res.json() as Promise<T>;
}

const pesanGagal = (err: Error) =>
  err.message === 'Failed to fetch' ? 'Tidak bisa terhubung ke server FoundIt.' : err.message;

function Foto({ l, alt, ikon = 48 }: { l: Laporan; alt: string; ikon?: number }) {
  const [gagal, setGagal] = useState(false);
  return (
    <div className={`foto-detail k-${slug(l.kategori)}`}>
      {l.foto_url && !gagal ? (
        <img src={BASE + l.foto_url} alt={alt} onError={() => setGagal(true)} />
      ) : (
        <span className="ikon-kategori" role="img" aria-label={`Belum ada foto, kategori ${l.kategori}`}>
          <Ikon d={ikonKategori(l.kategori)} ukuran={ikon} tebal={1.3} />
        </span>
      )}
    </div>
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
  );
}

function Rincian({ l }: { l: LaporanDetail }) {
  const hilang = l.tipe === 'hilang';
  return (
    <dl className="rincian">
      <dt>Kategori</dt>
      <dd>{l.kategori}</dd>
      <dt>{hilang ? 'Terakhir terlihat' : 'Ditemukan di'}</dt>
      <dd>{l.lokasi}</dd>
      <dt>{hilang ? 'Waktu kehilangan' : 'Waktu ditemukan'}</dt>
      <dd>
        <time dateTime={l.waktu_kejadian}>{tanggal(l.waktu_kejadian)}</time>
      </dd>
      <dt>Dilaporkan</dt>
      <dd>
        <time dateTime={l.createdAt}>{waktuRelatif(l.createdAt)}</time>
      </dd>
    </dl>
  );
}

function BarisCocok({ k, dipilih, pilih }: { k: Kecocokan; dipilih: boolean; pilih: () => void }) {
  return (
    <li>
      <button type="button" className={`baris-cocok ${k.tingkat}`} aria-pressed={dipilih} onClick={pilih}>
        <Foto l={k.lawan} alt="" ikon={28} />
        <span className="isi-cocok">
          <b>{judulKartu(k.lawan)}</b>
          <span className="info-cocok">
            Ditemukan di {k.lawan.lokasi} · {waktuRelatif(k.lawan.waktu_kejadian)}
          </span>
          <span className="meter-cocok">
            <span className="track">
              <span style={{ width: `${k.skor}%` }} />
            </span>
            <span className="label-tingkat">{LABEL_TINGKAT[k.tingkat]}</span>
          </span>
        </span>
        <span className="skor-cocok">
          <strong>{k.skor}%</strong>
          <span>cocok</span>
        </span>
      </button>
    </li>
  );
}

function Bandingkan({ saya, k, tolak }: { saya: LaporanDetail; k: Kecocokan; tolak: () => void }) {
  const fakta = faktaKecocokan(saya, k.lawan);
  const skorAi = [
    { nama: 'Kemiripan foto', nilai: k.foto },
    { nama: 'Kemiripan deskripsi', nilai: k.deskripsi },
  ].filter((s): s is { nama: string; nilai: number } => s.nilai != null);
  const urlKlaim = `/klaim?match=${k.match.id}`;
  return (
    <section className="kartu bandingkan" aria-labelledby="judul-bandingkan">
      <div className="kepala-bandingkan">
        <h3 id="judul-bandingkan">Bandingkan dengan temuan {nomor(k.lawan.id)}</h3>
        <span>Dilaporkan penemu {waktuRelatif(k.lawan.createdAt)}</span>
      </div>
      <div className="dua-foto">
        <figure>
          <Foto l={saya} alt="Foto laporan kehilangan" />
          <figcaption>Foto laporan kehilangan</figcaption>
        </figure>
        <figure>
          <Foto l={k.lawan} alt={`Foto temuan ${nomor(k.lawan.id)}`} />
          <figcaption>Foto temuan {nomor(k.lawan.id)}</figcaption>
        </figure>
      </div>
      <div className="alasan-cocok">
        <h4>Kenapa dianggap cocok</h4>
        {skorAi.map((s) => (
          <div key={s.nama} className="skor-ai">
            <span>{s.nama}</span>
            <span className="track">
              <span style={{ width: `${s.nilai}%` }} />
            </span>
            <b>{s.nilai}%</b>
          </div>
        ))}
        <ul className="fakta">
          {fakta.map((f) => (
            <li key={f.nama}>
              <span className={f.sama ? 'tanda sama' : 'tanda beda'}>
                <Ikon d={f.sama ? CENTANG : STRIP} ukuran={12} tebal={3} />
              </span>
              <span>
                <b>{f.nama}:</b> {f.teks}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="ajak-klaim">
        <div>
          <b>Ini barangmu?</b>
          <p>
            Kamu akan diminta unggah foto KTM dan menjawab pertanyaan soal ciri barang yang tidak ditampilkan publik.
            Petugas memverifikasi sebelum serah terima.
          </p>
        </div>
        <div className="tombol-klaim">
          <button type="button" className="tombol netral" onClick={tolak}>
            Bukan barang saya
          </button>
          <a className="tombol utama" href={urlKlaim}>
            Ajukan klaim
          </a>
        </div>
      </div>
      <div className="aksi-mobile">
        <button type="button" className="tombol netral" onClick={tolak}>
          Bukan punyaku
        </button>
        <a className="tombol utama" href={urlKlaim}>
          Ajukan klaim {nomor(k.lawan.id)}
        </a>
      </div>
    </section>
  );
}

function BagianCocok({
  l,
  daftar,
  gagal,
  muatUlang,
}: {
  l: LaporanDetail;
  daftar: Kecocokan[] | null;
  gagal: string | null;
  muatUlang: () => void;
}) {
  const [pilih, setPilih] = useState<number | null>(null);
  // "Bukan barang saya" untuk sementara hanya menyembunyikan baris di sesi ini. Simpan ke backend
  // (ubah status match jadi "ditolak") setelah endpoint-nya tersedia.
  const [disembunyikan, setDisembunyikan] = useState<number[]>([]);
  const terlihat = (daftar ?? []).filter((k) => !disembunyikan.includes(k.match.id));
  const kondisi = kondisiCocok(l, terlihat.length);
  const dipilih = terlihat.find((k) => k.match.id === pilih) ?? terlihat[0];

  const sub = {
    moderasi: 'Pencocokan otomatis dimulai setelah laporan disetujui petugas.',
    ditolak: 'Laporan ini tidak dicocokkan karena ditolak petugas.',
    menunggu: 'Hasil akan muncul di sini dan kamu dapat notifikasi.',
    kosong: 'Dicek otomatis setiap ada laporan baru.',
    ada: `${terlihat.length} laporan ${l.tipe === 'hilang' ? 'temuan' : 'kehilangan'} mirip dengan laporan ini. Dicek otomatis setiap ada laporan baru.`,
  }[kondisi];

  return (
    <section className="cocok" aria-labelledby="judul-cocok">
      <div className="kepala-cocok">
        <div>
          <h2 id="judul-cocok">Kemungkinan cocok</h2>
          <p>{gagal ? 'Hasil pencocokan belum bisa ditampilkan.' : sub}</p>
        </div>
        {kondisi === 'ada' && !gagal && <span>Skor di bawah {AMBANG_TAMPIL}% tidak ditampilkan</span>}
      </div>

      {gagal ? (
        <div className="banner" role="alert">
          <span className="bulat">!</span>
          <div>
            <b>Hasil pencocokan belum bisa dimuat</b>
            <p>{gagal}</p>
          </div>
          <button type="button" className="tombol netral kecil" onClick={muatUlang}>
            Coba lagi
          </button>
        </div>
      ) : daftar === null ? (
        <ul className="daftar-cocok" aria-busy="true" aria-label="Memuat hasil pencocokan">
          {[0, 1, 2].map((i) => (
            <li key={i} className="kerangka kerangka-cocok" />
          ))}
        </ul>
      ) : kondisi === 'ada' && dipilih ? (
        <>
          <ul className="daftar-cocok">
            {terlihat.map((k) => (
              <BarisCocok key={k.match.id} k={k} dipilih={k === dipilih} pilih={() => setPilih(k.match.id)} />
            ))}
          </ul>
          <Bandingkan saya={l} k={dipilih} tolak={() => setDisembunyikan((s) => [...s, dipilih.match.id])} />
        </>
      ) : kondisi === 'menunggu' ? (
        <div className="kartu kosong-cocok" role="status">
          <span className="putar" aria-hidden="true" />
          <h3>Sedang mencocokkan laporan ini</h3>
          <p>
            AI sedang membandingkan foto, deskripsi, lokasi, dan waktu dengan laporan yang ada. Biasanya selesai
            beberapa menit setelah laporan disetujui.
          </p>
        </div>
      ) : (
        <div className="kartu kosong-cocok garis-putus">
          <span className="ikon-kosong">
            <Ikon d={LONCENG} ukuran={26} tebal={1.8} />
          </span>
          {kondisi === 'kosong' ? (
            <>
              <h3>Belum ada {l.tipe === 'hilang' ? 'temuan' : 'laporan kehilangan'} yang mirip</h3>
              <p>
                Laporan ini tetap aktif. Setiap ada laporan baru, FoundIt mencocokkannya otomatis dan mengirim
                notifikasi kalau skornya {AMBANG_TINGGI}% ke atas.
              </p>
              <a className="tombol netral" href="/katalog">
                Cari sendiri di katalog
              </a>
            </>
          ) : kondisi === 'moderasi' ? (
            <>
              <h3>Laporan masih dicek petugas</h3>
              <p>Setelah disetujui, laporan tampil di katalog dan langsung dicocokkan dengan laporan lain.</p>
            </>
          ) : (
            <>
              <h3>Laporan ditolak petugas</h3>
              <p>{l.alasan_tolak ? `Alasan: ${l.alasan_tolak}` : 'Buat laporan baru dengan data yang lebih lengkap.'}</p>
              <a className="tombol netral" href="/">
                Buat laporan baru
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function TampilanHilang({ l, daftar, gagal, muatUlang }: { l: LaporanDetail; daftar: Kecocokan[] | null; gagal: string | null; muatUlang: () => void }) {
  return (
    <div className="kolom-detail">
      <section className="kartu kartu-laporan" aria-labelledby="judul-laporan">
        <h2 id="judul-laporan">Laporan kehilangan</h2>
        <Foto l={l} alt="Foto barang yang hilang" ikon={64} />
        <Rincian l={l} />
        {l.deskripsi && (
          <div className="deskripsi-laporan">
            <span>Deskripsi</span>
            <p>{l.deskripsi}</p>
          </div>
        )}
      </section>
      <BagianCocok l={l} daftar={daftar} gagal={gagal} muatUlang={muatUlang} />
    </div>
  );
}

function TampilanTemuan({ l }: { l: LaporanDetail }) {
  const urlKlaim = `/klaim?temuan=${l.id}`;
  return (
    <div className="kolom-publik">
      <div className="foto-publik">
        <Foto l={l} alt={`Foto ${l.kategori.toLowerCase()} yang ditemukan`} ikon={80} />
        <p>Foto diunggah oleh penemu. Ciri khusus barang sengaja tidak ditampilkan.</p>
      </div>
      <div className="info-publik">
        <div className="kartu kartu-laporan">
          <Rincian l={l} />
          {l.deskripsi && (
            <div className="deskripsi-laporan">
              <span>Deskripsi dari penemu</span>
              <p>{l.deskripsi}</p>
            </div>
          )}
          <p className="catatan-ciri">
            <Ikon d={GEMBOK} ukuran={16} />
            <span>Ciri khusus barang tidak ditampilkan. Pemilik akan ditanya soal ini saat klaim.</span>
          </p>
        </div>
        <div className="kartu kartu-klaim">
          <b>Ini barangmu?</b>
          <p>Ajukan klaim dengan foto KTM dan jawaban verifikasi. Petugas akan mengecek sebelum serah terima.</p>
          <a className="tombol utama" href={urlKlaim}>
            Ajukan klaim
          </a>
          <p className="kecil">
            Belum lapor kehilangan? <a href="/">Buat laporan</a> supaya FoundIt mencocokkannya otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DetailLaporan() {
  const id = idDariPath(location.pathname);
  const [semua, setSemua] = useState<LaporanDetail[] | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [gagalCocok, setGagalCocok] = useState<string | null>(null);
  const [muatUlang, setMuatUlang] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setGagal(null);
    setGagalCocok(null);
    setSemua(null);
    setMatches(null);
    // Belum ada GET /api/reports/:id dan filter matches per laporan, jadi ambil semua lalu saring di sini.
    ambil<LaporanDetail[]>(`${BASE}/api/reports`, ctrl.signal)
      .then(setSemua)
      .catch((err: Error) => err.name !== 'AbortError' && setGagal(pesanGagal(err)));
    ambil<Match[]>(`${BASE}/api/matches`, ctrl.signal)
      .then(setMatches)
      .catch((err: Error) => err.name !== 'AbortError' && setGagalCocok(pesanGagal(err)));
    return () => ctrl.abort();
  }, [muatUlang]);

  const l = useMemo(() => semua?.find((x) => x.id === id) ?? null, [semua, id]);
  const daftar = useMemo(() => (l && semua && matches ? kecocokanUntuk(l, matches, semua) : null), [l, semua, matches]);

  useEffect(() => {
    document.title = l ? `${judulKartu(l)} — FoundIt` : 'Detail laporan — FoundIt';
  }, [l]);

  return (
    <>
      <Header />
      <main className="detail">
        <a className="kembali" href="/katalog">
          <Ikon d={KEMBALI} ukuran={18} tebal={2} />
          Kembali ke katalog
        </a>

        {gagal ? (
          <div className="banner" role="alert">
            <span className="bulat">!</span>
            <div>
              <b>Laporan belum bisa dimuat</b>
              <p>{gagal} Pastikan backend jalan, lalu coba lagi.</p>
            </div>
            <button type="button" className="tombol netral kecil" onClick={() => setMuatUlang((n) => n + 1)}>
              Coba lagi
            </button>
          </div>
        ) : semua === null ? (
          <div className="kolom-detail" aria-busy="true" aria-label="Memuat laporan">
            <div className="kerangka kerangka-laporan" />
            <div className="kerangka kerangka-cocok-besar" />
          </div>
        ) : !l || id === null ? (
          <div className="kartu kosong-katalog">
            <span className="ikon-kosong">
              <Ikon d={ikonKategori('Lainnya')} ukuran={26} />
            </span>
            <h2>Laporan tidak ditemukan</h2>
            <p>Laporan ini mungkin sudah dihapus atau alamatnya salah. Cari barangmu lewat katalog.</p>
            <div className="aksi-kosong">
              <a className="tombol utama" href="/katalog">
                Buka katalog
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="kepala-detail">
              <div className="label-detail">
                <span className={`tag ${l.tipe}`}>{l.tipe === 'hilang' ? 'Barang hilang' : 'Ditemukan'}</span>
                <span className={`tag status ${l.status}`}>{LABEL_STATUS[l.status] ?? l.status}</span>
                <span className="kode">{nomor(l.id)}</span>
              </div>
              <h1>{judulKartu(l, 80)}</h1>
            </div>
            {l.tipe === 'hilang' ? (
              <TampilanHilang l={l} daftar={daftar} gagal={gagalCocok} muatUlang={() => setMuatUlang((n) => n + 1)} />
            ) : (
              <TampilanTemuan l={l} />
            )}
          </>
        )}
      </main>
    </>
  );
}
