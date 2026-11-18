import { useEffect, useState } from 'react';
import { BASE, Kerangka } from './bersama';
import PetaHiasan from './PetaHiasan';
import { CENTANG, CHEVRON, IKON, Ikon, JAM, PIN, TANYA, ikonKategori } from './ikon';
import { judulKartu, waktuRelatif, type Laporan } from './katalogLogic';

const POS = [
  { ikon: JAM, warna: '#ff9500', label: 'Jam buka', nilai: 'Senin–Sabtu, 07.00–21.00' },
  { ikon: PIN, warna: '#007aff', label: 'Lokasi', nilai: 'Lobi Gedung SGLC, lantai 1' },
  { ikon: IKON.Dokumen, warna: '#34c759', label: 'Yang perlu dibawa', nilai: 'KTM dan bukti kepemilikan' },
  { ikon: TANYA, warna: '#8e8e93', label: 'Bantuan', nilai: 'Hubungi petugas lewat aplikasi' },
];

export default function Beranda() {
  const [terbaru, setTerbaru] = useState<Laporan[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${BASE}/api/reports?status=disetujui`, { signal: ctrl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<Laporan[]>) : []))
      .then((l) => setTerbaru([...l].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)))
      .catch((err: Error) => err.name !== 'AbortError' && setTerbaru([]));
    return () => ctrl.abort();
  }, []);

  return (
    <Kerangka aktif="beranda">
      <main className="paling-lebar beranda">
        <section className="hero">
          <h1>
            Barang hilang?
            <br />
            Kita bantu pulangkan.
          </h1>
          <p>Lapor sekali. FoundIt mencocokkan dengan setiap temuan di kampus, lalu memberi tahu saat barangmu ada di Pos Satpam.</p>
          <div className="hero-aksi">
            <a className="tombol utama" href="/lapor">
              Lapor barang
            </a>
            <a className="tautan" href="/katalog">
              Lihat katalog <Ikon d={CHEVRON} ukuran={13} tebal={2.2} />
            </a>
          </div>
        </section>

        <PetaHiasan />

        <section className="bagian" aria-labelledby="judul-terbaru">
          <div className="kepala-bagian">
            <h2 id="judul-terbaru">Temuan Terbaru</h2>
            <a className="tautan" href="/katalog">
              Lihat Semua <Ikon d={CHEVRON} ukuran={13} tebal={2.2} />
            </a>
          </div>
          {terbaru === null ? (
            <ul className="rak" aria-busy="true" aria-label="Memuat temuan terbaru">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="kerangka" style={{ height: 150 }} />
              ))}
            </ul>
          ) : terbaru.length === 0 ? (
            <p className="grup-catatan">Belum ada laporan yang disetujui petugas.</p>
          ) : (
            <ul className="rak">
              {terbaru.map((l) => (
                <li key={l.id}>
                  <a className="kartu-mini" href={`/katalog/${l.id}`}>
                    <span className="ikon-mini">
                      <Ikon d={ikonKategori(l.kategori)} ukuran={16} tebal={1.6} />
                    </span>
                    <span className={`lencana-status ${l.tipe}`} aria-label={l.tipe === 'hilang' ? 'Barang hilang' : 'Ditemukan'}>
                      {l.tipe === 'hilang' ? '?' : <Ikon d={CENTANG} ukuran={11} tebal={3} />}
                    </span>
                    <b>{judulKartu(l, 28)}</b>
                    <span>{l.lokasi}</span>
                    <span>{waktuRelatif(l.createdAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bagian" aria-labelledby="judul-pos">
          <div className="kepala-bagian">
            <h2 id="judul-pos">Pos Satpam FT</h2>
            <a className="tautan" href="#">
              Petunjuk Arah <Ikon d={CHEVRON} ukuran={13} tebal={2.2} />
            </a>
          </div>
          <ul className="grup-isi">
            {POS.map((p) => (
              <li key={p.label} className="baris">
                <span className="kotak-ikon" style={{ background: p.warna }}>
                  <Ikon d={p.ikon} ukuran={14} tebal={2} />
                </span>
                <span className="label">{p.label}</span>
                <span className="nilai">{p.nilai}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="catatan-kaki">
          FoundIt dikembangkan oleh Kelompok 22, Departemen Teknik Elektro dan Teknologi Informasi, Fakultas Teknik UGM. Barang
          diserahkan hanya setelah diverifikasi petugas.
        </p>
      </main>
    </Kerangka>
  );
}
