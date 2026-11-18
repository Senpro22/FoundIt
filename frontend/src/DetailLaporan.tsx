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
import { BASE, Banner, Cincin, FotoBarang, Kerangka, pesanGagal } from './bersama';
import { CARI, CENTANG, CHEVRON, GEMBOK, Ikon, KILAU, PANAH_KIRI, SILANG } from './ikon';

type LaporanDetail = Laporan & { updatedAt?: string; alasan_tolak?: string | null };

const LABEL_STATUS: Record<string, string> = {
  pending: 'Menunggu moderasi',
  disetujui: 'Disetujui petugas',
  ditolak: 'Ditolak petugas',
};

const tanggal = (iso: string) => {
  const d = new Date(iso);
  const tgl = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  return `${tgl} · ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
};

async function ambil<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Server menjawab ${res.status}.`);
  return res.json() as Promise<T>;
}

function Rincian({ l, judul }: { l: LaporanDetail; judul: string }) {
  const hilang = l.tipe === 'hilang';
  const baris = [
    ['Kategori', l.kategori],
    [hilang ? 'Terakhir terlihat' : 'Ditemukan di', l.lokasi],
    [hilang ? 'Waktu kehilangan' : 'Waktu ditemukan', tanggal(l.waktu_kejadian)],
    ['Dilaporkan', waktuRelatif(l.createdAt)],
  ];
  return (
    <div className="grup">
      <h2 className="grup-judul">{judul}</h2>
      <dl className="grup-isi">
        {baris.map(([dt, dd]) => (
          <div key={dt} className="baris">
            <dt className="label">{dt}</dt>
            <dd className="nilai">{dd}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Deskripsi({ judul, teks }: { judul: string; teks: string | null }) {
  if (!teks) return null;
  return (
    <div className="grup">
      <h2 className="grup-judul">{judul}</h2>
      <p className="grup-isi teks-blok">{teks}</p>
    </div>
  );
}

function BarisCocok({ k, dipilih, pilih }: { k: Kecocokan; dipilih: boolean; pilih: () => void }) {
  return (
    <li>
      <button type="button" className="baris baris-cocok" aria-pressed={dipilih} onClick={pilih}>
        <FotoBarang l={k.lawan} className="mini" />
        <span className="teks-item">
          <b>{judulKartu(k.lawan)}</b>
          <span>
            {k.lawan.lokasi} · {waktuRelatif(k.lawan.waktu_kejadian)}
          </span>
          <span className={`teks-${k.tingkat}`}>{LABEL_TINGKAT[k.tingkat]}</span>
        </span>
        <Cincin skor={k.skor} tingkat={k.tingkat} />
        <span className="chevron">
          <Ikon d={CHEVRON} ukuran={14} tebal={2} />
        </span>
      </button>
    </li>
  );
}

function Bandingkan({ saya, k, tolak }: { saya: LaporanDetail; k: Kecocokan; tolak: () => void }) {
  const fakta = faktaKecocokan(saya, k.lawan);
  const baris = [
    ...[
      { nama: 'Kemiripan foto', nilai: k.foto },
      { nama: 'Kemiripan deskripsi', nilai: k.deskripsi },
    ]
      .filter((s): s is { nama: string; nilai: number } => s.nilai != null)
      .map((s) => ({ nama: s.nama, teks: `${s.nilai}%`, sama: s.nilai >= AMBANG_TAMPIL })),
    ...fakta,
  ];
  return (
    <section className="kartu bandingkan" aria-labelledby="judul-bandingkan">
      <div className="kepala-bandingkan">
        <h3 id="judul-bandingkan">Bandingkan dengan temuan {nomor(k.lawan.id)}</h3>
        <span>Dilaporkan penemu {waktuRelatif(k.lawan.createdAt)}</span>
      </div>
      <div className="dua-foto">
        <figure>
          <FotoBarang l={saya} alt="Foto laporanmu" />
          <figcaption>Foto laporanmu</figcaption>
        </figure>
        <Cincin skor={k.skor} tingkat={k.tingkat} ukuran={68} tebal={5} />
        <figure>
          <FotoBarang l={k.lawan} alt={`Foto temuan ${nomor(k.lawan.id)}`} />
          <figcaption>Foto temuan {nomor(k.lawan.id)}</figcaption>
        </figure>
      </div>
      <div className="grup">
        <h4 className="grup-judul">Kenapa dianggap cocok</h4>
        <dl className="grup-isi abu">
          {baris.map((f) => (
            <div key={f.nama} className="baris">
              <dt className="label">{f.nama}</dt>
              <dd className="nilai">{f.teks}</dd>
              <span className={f.sama ? 'ok' : 'beda'} aria-label={f.sama ? 'cocok' : 'beda'}>
                <Ikon d={f.sama ? CENTANG : SILANG} ukuran={14} tebal={2.2} />
              </span>
            </div>
          ))}
        </dl>
      </div>
      <div className="ajak-klaim">
        <b>Ini barangmu?</b>
        <p>
          Kamu akan diminta unggah foto KTM dan menjawab pertanyaan soal ciri barang yang tidak ditampilkan publik. Petugas
          memverifikasi sebelum serah terima.
        </p>
        <div className="aksi kiri">
          <a className="tombol utama" href={`/klaim?match=${k.match.id}`}>
            Ajukan klaim
          </a>
          <button type="button" className="tombol bahaya" onClick={tolak}>
            Bukan barang saya
          </button>
        </div>
      </div>
    </section>
  );
}

function BagianCocok({ l, daftar, gagal, muatUlang }: { l: LaporanDetail; daftar: Kecocokan[] | null; gagal: string | null; muatUlang: () => void }) {
  const [pilih, setPilih] = useState<number | null>(null);
  // "Bukan barang saya" untuk sementara hanya menyembunyikan baris di sesi ini. Simpan ke backend
  // (ubah status match jadi "ditolak") setelah endpoint-nya tersedia.
  const [disembunyikan, setDisembunyikan] = useState<number[]>([]);
  const terlihat = (daftar ?? []).filter((k) => !disembunyikan.includes(k.match.id));
  const kondisi = kondisiCocok(l, terlihat.length);
  const dipilih = terlihat.find((k) => k.match.id === pilih) ?? terlihat[0];
  const lawan = l.tipe === 'hilang' ? 'temuan' : 'laporan kehilangan';

  const sub = {
    moderasi: 'Pencocokan otomatis dimulai setelah laporan disetujui petugas.',
    ditolak: 'Laporan ini tidak dicocokkan karena ditolak petugas.',
    menunggu: 'Hasil akan muncul di sini dan kamu dapat notifikasi.',
    kosong: 'Dicek otomatis setiap ada laporan baru.',
    ada: `${terlihat.length} laporan ${lawan} mirip dengan laporanmu. Dicek otomatis setiap ada laporan baru.`,
  }[kondisi];

  return (
    <section className="cocok" aria-labelledby="judul-cocok">
      <div>
        <h2 id="judul-cocok" className="judul-2">
          Kemungkinan cocok
        </h2>
        <p className="sub-kecil">{gagal ? 'Hasil pencocokan belum bisa ditampilkan.' : sub}</p>
      </div>

      {gagal ? (
        <Banner
          judul="Hasil pencocokan belum bisa dimuat"
          aksi={
            <button type="button" className="tombol netral kecil" onClick={muatUlang}>
              Coba lagi
            </button>
          }
        >
          {gagal}
        </Banner>
      ) : daftar === null ? (
        <div className="kerangka" style={{ height: 220 }} aria-busy="true" aria-label="Memuat hasil pencocokan" />
      ) : kondisi === 'ada' && dipilih ? (
        <>
          <div className="grup">
            <ul className="grup-isi">
              {terlihat.map((k) => (
                <BarisCocok key={k.match.id} k={k} dipilih={k === dipilih} pilih={() => setPilih(k.match.id)} />
              ))}
            </ul>
            <p className="grup-catatan ikon">
              <Ikon d={KILAU} ukuran={13} tebal={1.8} />
              Skor dihitung AI dari foto, deskripsi, lokasi, dan waktu. Skor di bawah {AMBANG_TAMPIL}% tidak ditampilkan.
            </p>
          </div>
          <Bandingkan saya={l} k={dipilih} tolak={() => setDisembunyikan((s) => [...s, dipilih.match.id])} />
        </>
      ) : kondisi === 'menunggu' ? (
        <div className="kartu kosong" role="status">
          <span className="spinner gelap" aria-hidden="true" />
          <h3>Sedang mencocokkan laporanmu</h3>
          <p>
            AI sedang membandingkan foto, deskripsi, lokasi, dan waktu dengan laporan {lawan} yang ada. Biasanya selesai
            beberapa menit setelah laporan disetujui.
          </p>
          <div className="kerangka-baris" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <span className="kerangka" />
                <span className="kerangka" />
                <span className="kerangka" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="kartu kosong">
          <span className="ikon-bulat">
            <Ikon d={CARI} ukuran={20} tebal={2} />
          </span>
          {kondisi === 'kosong' ? (
            <>
              <h3>Belum ada {lawan} yang mirip</h3>
              <p>
                Laporanmu tetap aktif. Setiap ada laporan {lawan} baru, FoundIt mencocokkannya otomatis dan mengirim notifikasi
                kalau skornya {AMBANG_TINGGI}% ke atas.
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
              <a className="tombol netral" href="/lapor">
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
    <>
      <div className="kepala-detail">
        <div className="label-tag">
          <span className="tag hilang">Barang hilang</span>
          <span className={`tag ${l.status}`}>{LABEL_STATUS[l.status] ?? l.status}</span>
        </div>
        <h1>{judulKartu(l, 80)}</h1>
        <p className="sub-kecil">
          ID laporan {nomor(l.id)} · dilaporkan {waktuRelatif(l.createdAt)}
        </p>
      </div>
      <div className="kolom-detail">
        <div className="kolom-kiri">
          <FotoBarang l={l} alt="Foto barang yang hilang" className="besar" />
          <Rincian l={l} judul="Laporanmu" />
          <Deskripsi judul="Deskripsi" teks={l.deskripsi} />
        </div>
        <BagianCocok l={l} daftar={daftar} gagal={gagal} muatUlang={muatUlang} />
      </div>
    </>
  );
}

function TampilanTemuan({ l }: { l: LaporanDetail }) {
  return (
    <div className="kolom-publik">
      <div className="foto-publik">
        <FotoBarang l={l} alt={`Foto ${l.kategori.toLowerCase()} yang ditemukan`} className="besar" />
        <p className="grup-catatan ikon">
          <Ikon d={GEMBOK} ukuran={13} tebal={1.8} />
          Foto diunggah oleh penemu. Isi barang sengaja tidak difoto.
        </p>
      </div>
      <div className="info-publik">
        <div>
          <p className="status-temuan">
            <span className="centang-kecil">
              <Ikon d={CENTANG} ukuran={11} tebal={3} />
            </span>
            <b>Ditemukan</b> · {LABEL_STATUS[l.status] ?? l.status}
          </p>
          <h1>{judulKartu(l, 80)}</h1>
          <p className="sub-kecil">
            Temuan {nomor(l.id)} · dilaporkan {waktuRelatif(l.createdAt)}
          </p>
        </div>
        <Rincian l={l} judul="Detail" />
        <div className="grup">
          {l.deskripsi && (
            <>
              <h2 className="grup-judul">Deskripsi dari penemu</h2>
              <p className="grup-isi teks-blok">{l.deskripsi}</p>
            </>
          )}
          <p className="grup-catatan ikon">
            <Ikon d={GEMBOK} ukuran={13} tebal={1.8} />
            Ciri khusus seperti isi dompet dan kartu tidak ditampilkan. Pemilik akan ditanya soal ini saat klaim.
          </p>
        </div>
        <div className="kartu kartu-klaim">
          <b>Ini barangmu?</b>
          <p>Ajukan klaim dengan foto KTM dan jawaban verifikasi. Petugas akan mengecek sebelum serah terima.</p>
          <a className="tombol utama penuh" href={`/klaim?temuan=${l.id}`}>
            Ajukan klaim
          </a>
        </div>
        <p className="lapor-dulu">
          Belum lapor kehilangan? <a href="/lapor">Buat laporan ›</a>
        </p>
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
    <Kerangka aktif="katalog">
      <main className="lebar detail">
        <a className="kembali" href="/katalog">
          <Ikon d={PANAH_KIRI} ukuran={15} tebal={2} />
          Katalog
        </a>

        {gagal ? (
          <Banner
            judul="Laporan belum bisa dimuat"
            aksi={
              <button type="button" className="tombol netral kecil" onClick={() => setMuatUlang((n) => n + 1)}>
                Coba lagi
              </button>
            }
          >
            {gagal} Pastikan backend jalan, lalu coba lagi.
          </Banner>
        ) : semua === null ? (
          <div className="kolom-detail" aria-busy="true" aria-label="Memuat laporan">
            <div className="kerangka" style={{ aspectRatio: '1' }} />
            <div className="kerangka" style={{ height: 320 }} />
          </div>
        ) : !l || id === null ? (
          <div className="kartu kosong">
            <span className="ikon-bulat">
              <Ikon d={CARI} ukuran={20} tebal={2} />
            </span>
            <h2>Laporan tidak ditemukan</h2>
            <p>Laporan ini mungkin sudah dihapus atau alamatnya salah. Cari barangmu lewat katalog.</p>
            <a className="tombol utama" href="/katalog">
              Buka katalog
            </a>
          </div>
        ) : l.tipe === 'hilang' ? (
          <TampilanHilang l={l} daftar={daftar} gagal={gagalCocok} muatUlang={() => setMuatUlang((n) => n + 1)} />
        ) : (
          <TampilanTemuan l={l} />
        )}
      </main>
    </Kerangka>
  );
}

