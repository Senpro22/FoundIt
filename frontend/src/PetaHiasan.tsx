// Peta ilustrasi di Beranda. Hiasan saja (data statis), tapi bisa digeser, di-zoom, dan pin-nya bisa dipilih.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { CARI, CHEVRON, IKON, Ikon, KURANG, LOKASI_SAYA, PAYUNG, TAMBAH } from './ikon';

type Status = 'ditemukan' | 'hilang' | 'diklaim';
type Barang = { id: string; nama: string; ikon: string; status: Status; jarak: string; waktu: string; x: number; y: number; besar?: boolean };

// x, y = titik tengah pin dalam koordinat desain Figma (panel peta 800×600).
const BARANG: Barang[] = [
  { id: 'dompet', nama: 'Dompet kulit coklat', ikon: IKON['Dompet & Kartu'], status: 'ditemukan', jarak: '120 m', waktu: '2 jam lalu', x: 360, y: 262, besar: true },
  { id: 'iphone', nama: 'iPhone 13 biru', ikon: IKON.Elektronik, status: 'ditemukan', jarak: '350 m', waktu: '5 jam lalu', x: 182, y: 172 },
  { id: 'payung', nama: 'Payung lipat hitam', ikon: PAYUNG, status: 'hilang', jarak: '600 m', waktu: 'kemarin', x: 632, y: 272 },
  { id: 'kunci', nama: 'Kunci motor', ikon: IKON.Kunci, status: 'ditemukan', jarak: '800 m', waktu: 'kemarin', x: 322, y: 502 },
  { id: 'ktm', nama: 'KTM a.n. Sari P.', ikon: IKON.Dokumen, status: 'diklaim', jarak: '950 m', waktu: '2 hari lalu', x: 782, y: 192 },
];
const LABEL: Record<Status, string> = { ditemukan: 'Ditemukan', hilang: 'Dilaporkan hilang', diklaim: 'Sedang diklaim' };
const SAYA = { x: 460, y: 340 };

// Dunia peta lebih besar dari panel supaya ada ruang digeser. Isi desain diletakkan di offset O.
const DUNIA = { w: 1000, h: 760 };
const O = { x: 100, y: 80 };
const ZOOM = { min: 0.8, maks: 2 };

type Kamera = { x: number; y: number; z: number };

export default function PetaHiasan() {
  const [tipe, setTipe] = useState<'semua' | 'hilang' | 'ditemukan'>('semua');
  const [kata, setKata] = useState('');
  const [pilih, setPilih] = useState('dompet');
  const [kamera, setKamera] = useState<Kamera>({ x: -O.x, y: -O.y, z: 1 });
  const [geser, setGeser] = useState(false);
  const layar = useRef<HTMLDivElement>(null);
  const ukuran = useRef({ w: 800, h: 600 });
  const tarik = useRef<{ id: number; x: number; y: number; kx: number; ky: number; jalan: boolean } | null>(null);

  const cocokTipe = (b: Barang) => tipe === 'semua' || (tipe === 'hilang' ? b.status === 'hilang' : b.status !== 'hilang');
  const q = kata.trim().toLowerCase();
  const daftar = BARANG.filter((b) => cocokTipe(b) && b.nama.toLowerCase().includes(q));
  const dipilih = daftar.find((b) => b.id === pilih);

  const batasi = (k: Kamera): Kamera => {
    const { w, h } = ukuran.current;
    const klem = (v: number, min: number) => Math.min(0, Math.max(min, v));
    return { z: k.z, x: klem(k.x, w - DUNIA.w * k.z), y: klem(k.y, h - DUNIA.h * k.z) };
  };
  // Geser kamera supaya titik desain (x, y) ada di tengah panel.
  const pusatkan = (x: number, y: number, z = kamera.z) => {
    const { w, h } = ukuran.current;
    setKamera(batasi({ z, x: w / 2 - (x + O.x) * z, y: h / 2 - (y + O.y) * z }));
  };

  useLayoutEffect(() => {
    const el = layar.current;
    if (!el) return;
    const ukur = () => {
      ukuran.current = { w: el.clientWidth, h: el.clientHeight };
      setKamera((k) => batasi(k));
    };
    ukur();
    // Awalnya tengah panel = tengah desain (400, 300); di layar 800×600 hasilnya sama persis dengan Figma.
    pusatkan(400, 300, 1);
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pin yang dipilih hilang karena filter: pilih yang pertama tersisa.
  useEffect(() => {
    if (!dipilih && daftar[0]) setPilih(daftar[0].id);
  }, [dipilih, daftar]);

  function pilihBarang(b: Barang) {
    setPilih(b.id);
    pusatkan(b.x, b.y);
  }

  function zoom(arah: 1 | -1) {
    const z = Math.min(ZOOM.maks, Math.max(ZOOM.min, +(kamera.z + arah * 0.25).toFixed(2)));
    const { w, h } = ukuran.current;
    const r = z / kamera.z;
    setKamera(batasi({ z, x: w / 2 - (w / 2 - kamera.x) * r, y: h / 2 - (h / 2 - kamera.y) * r }));
  }

  // Seret untuk menggeser. Pointer baru ditangkap setelah bergerak >4px, jadi klik pin tetap jalan.
  function mulai(e: PointerEvent) {
    if (e.button !== 0) return;
    tarik.current = { id: e.pointerId, x: e.clientX, y: e.clientY, kx: kamera.x, ky: kamera.y, jalan: false };
  }
  function gerak(e: PointerEvent) {
    const t = tarik.current;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (!t.jalan) {
      if (Math.hypot(dx, dy) < 4) return;
      t.jalan = true;
      setGeser(true);
      layar.current?.setPointerCapture(e.pointerId);
    }
    setKamera((k) => batasi({ z: k.z, x: t.kx + dx, y: t.ky + dy }));
  }
  function selesai() {
    tarik.current = null;
    setGeser(false);
  }

  // --z dipakai pin & callout supaya ukurannya tetap saat peta di-zoom.
  const gayaDunia = { transform: `translate(${kamera.x}px, ${kamera.y}px) scale(${kamera.z})`, '--z': 1 / kamera.z } as CSSProperties;

  return (
    <div className="jendela" aria-label="Ilustrasi peta barang di sekitar kampus">
      <aside className="jendela-samping">
        <span className="lampu" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <h2>Barang</h2>
        <label className="cari-peta">
          <Ikon d={CARI} ukuran={15} tebal={2} />
          <span className="sr-only">Cari barang di peta</span>
          <input type="search" value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Cari dompet, kunci, KTM…" />
        </label>
        <div className="segmented penuh" role="group" aria-label="Filter peta">
          {(['semua', 'hilang', 'ditemukan'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tipe === t} onClick={() => setTipe(t)}>
              {t === 'semua' ? 'Semua' : t === 'hilang' ? 'Hilang' : 'Ditemukan'}
            </button>
          ))}
        </div>
        <p className="sekitar">Di sekitar Perpustakaan Pusat</p>
        <ul className="grup-isi daftar-peta">
          {daftar.map((b) => (
            <li key={b.id}>
              <button type="button" className="baris" aria-pressed={b.id === pilih} onClick={() => pilihBarang(b)}>
                <span className="thumb">
                  <Ikon d={b.ikon} ukuran={22} tebal={1.6} />
                </span>
                <span className="teks-item">
                  <b>{b.nama}</b>
                  <span>
                    {b.jarak} · {b.waktu}
                  </span>
                </span>
                <span className={`titik-status ${b.status}`} aria-label={LABEL[b.status]} role="img" />
                <span className="chevron">
                  <Ikon d={CHEVRON} ukuran={15} tebal={2} />
                </span>
              </button>
            </li>
          ))}
          {daftar.length === 0 && <li className="kosong-peta">Tidak ada barang yang cocok.</li>}
        </ul>
      </aside>

      <div
        ref={layar}
        className={`peta${geser ? ' digeser' : ''}`}
        onPointerDown={mulai}
        onPointerMove={gerak}
        onPointerUp={selesai}
        onPointerCancel={selesai}
      >
        <div className="dunia" style={gayaDunia}>
          <div className="isi-dunia">
            <span className="taman" style={{ left: 560, top: 40, width: 300, height: 220 }} />
            <span className="taman" style={{ left: 80, top: 400, width: 220, height: 160 }} />
            <span className="danau" style={{ left: 720, top: 420, width: 360, height: 240 }} />
            {[
              [120, 80, 120, 90],
              [300, 60, 160, 110],
              [120, 230, 90, 120],
              [260, 230, 200, 130],
              [520, 300, 140, 90],
              [340, 430, 150, 120],
              [560, 450, 120, 110],
              [-60, 60, 120, 110],
              [880, 300, 140, 120],
              [40, 600, 160, 70],
            ].map(([left, top, width, height]) => (
              <span key={`${left}-${top}`} className="gedung" style={{ left, top, width, height }} />
            ))}
            <span className="jalan" style={{ left: -150, top: 200, width: 1300, height: 18 }} />
            <span className="jalan" style={{ left: -150, top: 395, width: 1300, height: 14 }} />
            <span className="jalan" style={{ left: 250, top: -130, width: 18, height: 900 }} />
            <span className="jalan" style={{ left: 500, top: -130, width: 14, height: 900 }} />
            <span className="jalan" style={{ left: -120, top: 640, width: 1100, height: 12, transform: 'rotate(12deg)' }} />
            <span className="jalan" style={{ left: 750, top: -130, width: 12, height: 900, transform: 'rotate(-8deg)' }} />

            <span className="saya" style={{ left: SAYA.x, top: SAYA.y }} aria-hidden="true">
              <i />
            </span>

            {BARANG.map((b) => {
              const tampil = daftar.includes(b);
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`pin ${b.status}${b.besar ? ' besar' : ''}${b.id === pilih ? ' aktif' : ''}${tampil ? '' : ' redup'}`}
                  style={{ left: b.x, top: b.y }}
                  aria-label={`${b.nama}, ${LABEL[b.status].toLowerCase()}, ${b.jarak}`}
                  aria-pressed={b.id === pilih}
                  tabIndex={tampil ? 0 : -1}
                  onClick={() => pilihBarang(b)}
                >
                  <Ikon d={b.ikon} ukuran={b.besar ? 26 : 19} tebal={1.8} />
                </button>
              );
            })}

            {dipilih && (
              <a className="callout" href="/katalog" style={{ left: dipilih.x, top: dipilih.y - (dipilih.besar ? 38 : 30) }}>
                <span className="thumb">
                  <Ikon d={dipilih.ikon} ukuran={20} tebal={1.6} />
                </span>
                <span>
                  <b>{dipilih.nama}</b>
                  <span>
                    {LABEL[dipilih.status]} · {dipilih.jarak}
                  </span>
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="kontrol-peta">
          <button type="button" aria-label="Perbesar peta" disabled={kamera.z >= ZOOM.maks} onClick={() => zoom(1)}>
            <Ikon d={TAMBAH} ukuran={17} tebal={2} />
          </button>
          <button type="button" aria-label="Perkecil peta" disabled={kamera.z <= ZOOM.min} onClick={() => zoom(-1)}>
            <Ikon d={KURANG} ukuran={17} tebal={2} />
          </button>
          <button type="button" aria-label="Kembali ke lokasimu" onClick={() => pusatkan(SAYA.x, SAYA.y)}>
            <Ikon d={LOKASI_SAYA} ukuran={15} tebal={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
