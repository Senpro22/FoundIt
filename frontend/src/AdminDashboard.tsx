import { useEffect, useState } from 'react';
import { BASE, Banner, FotoBarang, Kerangka, pesanGagal } from './bersama';
import { CENTANG, Ikon, SERU } from './ikon';
import { nomor } from './detailLogic';
import { waktuRelatif } from './katalogLogic';

const API = BASE + '/api/reports';
const PER_HALAMAN = 10;

type Status = 'pending' | 'disetujui' | 'ditolak';

type Laporan = {
  id: number;
  tipe: 'hilang' | 'ditemukan';
  kategori: string;
  lokasi: string;
  waktu_kejadian: string;
  deskripsi: string;
  foto_url: string | null;
  status: Status;
  alasan_tolak: string | null;
  createdAt: string;
};

type Statistik = {
  total: number;
  pending: number;
  disetujui: number;
  ditolak: number;
  per_tipe: Record<string, number>;
  per_kategori: Record<string, number>;
};

const FILTER = [
  { key: 'pending', label: 'Menunggu moderasi' },
  { key: 'disetujui', label: 'Disetujui' },
  { key: 'ditolak', label: 'Ditolak' },
  { key: '', label: 'Semua' },
] as const;

const LABEL_STATUS: Record<Status, string> = { pending: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak' };

const tanggal = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
};
const kapital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const kecil = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Grafik({ judul, data }: { judul: string; data: Record<string, number> }) {
  const baris = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...baris.map(([, n]) => n));
  return (
    <section className="grup">
      <h2 className="grup-judul">{judul}</h2>
      <div className="grup-isi grafik">
        {baris.length === 0 ? (
          <p className="grup-catatan">Belum ada data.</p>
        ) : (
          <ul>
            {baris.map(([nama, n]) => (
              <li key={nama}>
                <span className="bar-nama">{kapital(nama)}</span>
                <span className="bar-track">
                  <span style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <b>{n}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const [filter, setFilter] = useState<'' | Status>('pending');
  const [laporan, setLaporan] = useState<Laporan[] | null>(null);
  const [stat, setStat] = useState<Statistik | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [menolak, setMenolak] = useState<number | null>(null);
  const [alasan, setAlasan] = useState('');
  const [sibuk, setSibuk] = useState<number | null>(null);
  const [tampil, setTampil] = useState(PER_HALAMAN);

  async function muat(f: '' | Status) {
    setGagal(null);
    try {
      const [a, b] = await Promise.all([fetch(`${API}?status=${f}`), fetch(`${API}/stats`)]);
      if (!a.ok || !b.ok) throw new Error('Server tidak merespons dengan benar.');
      setLaporan(await a.json());
      setStat(await b.json());
    } catch (err) {
      setGagal(pesanGagal(err as Error));
      setLaporan([]);
    }
  }

  useEffect(() => {
    setLaporan(null);
    setTampil(PER_HALAMAN);
    setMenolak(null);
    muat(filter);
  }, [filter]);

  async function ubahStatus(id: number, status: Status, alasan_tolak?: string) {
    setSibuk(id);
    setGagal(null);
    try {
      const res = await fetch(`${API}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, alasan_tolak }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Server menjawab ${res.status}.`);
      }
      setMenolak(null);
      setAlasan('');
      await muat(filter);
    } catch (err) {
      setGagal(pesanGagal(err as Error));
    } finally {
      setSibuk(null);
    }
  }

  // API mengurutkan terbaru dulu, jadi yang paling lama menunggu ada di akhir.
  const terlama = laporan?.at(-1);
  const ringkasan =
    laporan === null
      ? ''
      : filter === 'pending'
        ? laporan.length
          ? `${laporan.length} laporan menunggu · terlama masuk ${kecil(waktuRelatif(terlama!.createdAt))}`
          : 'Semua laporan sudah ditinjau'
        : `${laporan.length} laporan${filter ? ' ' + LABEL_STATUS[filter].toLowerCase() : ''}`;

  return (
    <Kerangka aktif="moderasi" inisial="PK">
      <main className="paling-lebar admin">
        <div>
          <h1>
            <span className="hanya-lebar">Dashboard Moderasi</span>
            <span className="hanya-sempit">Moderasi</span>
          </h1>
          <p className="sub">
            Tinjau laporan masuk sebelum dicocokkan sistem. Laporan yang ditolak wajib disertai alasan agar pelapor tahu apa
            yang perlu diperbaiki.
          </p>
        </div>

        <div className="kpi">
          {[
            { label: 'Total laporan', nilai: stat?.total, nada: '' },
            { label: 'Menunggu moderasi', nilai: stat?.pending, nada: 'pending' },
            { label: 'Disetujui', nilai: stat?.disetujui, nada: 'temuan' },
            { label: 'Ditolak', nilai: stat?.ditolak, nada: 'hilang' },
          ].map((k) => (
            <div key={k.label} className="kartu angka">
              <span className="kpi-label">
                <i className={k.nada} />
                {k.label}
              </span>
              <strong>{k.nilai ?? '—'}</strong>
            </div>
          ))}
        </div>

        <div className="dua-grafik">
          <Grafik judul="Laporan per tipe" data={stat?.per_tipe ?? {}} />
          <Grafik judul="Laporan per kategori" data={stat?.per_kategori ?? {}} />
        </div>

        <div className="kepala-antrean">
          <div className="segmented filter-status" role="tablist" aria-label="Filter status laporan">
            {FILTER.map((f) => (
              <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <p aria-live="polite">{ringkasan}</p>
        </div>

        {gagal && <Banner judul="Aksi gagal diproses">{gagal}</Banner>}

        {laporan === null ? (
          <ul className="antrean" aria-busy="true" aria-label="Memuat laporan">
            {[0, 1, 2].map((i) => (
              <li key={i} className="kerangka" style={{ height: 152, borderRadius: 18 }} />
            ))}
          </ul>
        ) : laporan.length === 0 ? (
          <div className="kartu kosong">
            <span className="ikon-bulat hijau">
              <Ikon d={CENTANG} ukuran={22} tebal={2.4} />
            </span>
            <h2>{filter === 'pending' ? 'Antrean moderasi kosong' : 'Tidak ada laporan'}</h2>
            <p>
              {filter === 'pending'
                ? 'Semua laporan sudah ditinjau. Laporan baru muncul di sini begitu pelapor mengirimkannya.'
                : 'Belum ada laporan dengan status ini.'}
            </p>
            {filter === 'pending' && (
              <button type="button" className="tombol netral" onClick={() => setFilter('disetujui')}>
                Lihat yang disetujui
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className="antrean">
              {laporan.slice(0, tampil).map((l) => (
                <li key={l.id} className="kartu-moderasi">
                  <FotoBarang l={l} alt={`Foto laporan ${nomor(l.id)}`} />
                  <div className="isi">
                    <div className="baris-judul">
                      <b>{l.kategori}</b>
                      <span className={`tag ${l.tipe === 'hilang' ? 'hilang' : 'ditemukan'}`}>
                        {l.tipe === 'hilang' ? 'Hilang' : 'Ditemukan'}
                      </span>
                      {filter === '' && <span className={`tag ${l.status}`}>{LABEL_STATUS[l.status]}</span>}
                      <span className="kode">{nomor(l.id)}</span>
                    </div>
                    <p className="meta">
                      {l.lokasi} · {tanggal(l.waktu_kejadian)} · dilaporkan {kecil(waktuRelatif(l.createdAt))}
                    </p>
                    {l.deskripsi && <p className="deskripsi">{l.deskripsi}</p>}
                    {l.status === 'ditolak' && l.alasan_tolak && (
                      <p className="alasan">
                        <Ikon d={SERU} ukuran={14} tebal={2} />
                        Alasan penolakan: {l.alasan_tolak}
                      </p>
                    )}

                    {menolak === l.id ? (
                      <form
                        className="form-tolak"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (alasan.trim()) ubahStatus(l.id, 'ditolak', alasan);
                        }}
                      >
                        <label htmlFor={`alasan-${l.id}`}>Alasan penolakan</label>
                        <input
                          id={`alasan-${l.id}`}
                          type="text"
                          autoFocus
                          placeholder="Foto buram, lokasi tidak jelas, laporan ganda, …"
                          value={alasan}
                          onChange={(e) => setAlasan(e.target.value)}
                        />
                        <p className="grup-catatan">Alasan dikirim ke pelapor supaya ia tahu apa yang perlu diperbaiki.</p>
                        <div className="aksi">
                          <button
                            type="button"
                            className="tombol netral"
                            onClick={() => {
                              setMenolak(null);
                              setAlasan('');
                            }}
                          >
                            Batal
                          </button>
                          <button type="submit" className="tombol utama merah" disabled={!alasan.trim() || sibuk === l.id}>
                            {sibuk === l.id ? <span className="spinner" /> : null}
                            Tolak laporan
                          </button>
                        </div>
                      </form>
                    ) : (
                      l.status === 'pending' && (
                        <div className="aksi">
                          <button
                            type="button"
                            className="tombol bahaya"
                            disabled={sibuk === l.id}
                            onClick={() => {
                              setMenolak(l.id);
                              setAlasan('');
                            }}
                          >
                            Tolak
                          </button>
                          <button
                            type="button"
                            className="tombol utama"
                            disabled={sibuk === l.id}
                            onClick={() => ubahStatus(l.id, 'disetujui')}
                          >
                            {sibuk === l.id ? <span className="spinner" /> : null}
                            Setujui
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {laporan.length > tampil && (
              <button type="button" className="tautan muat-lagi" onClick={() => setTampil((n) => n + PER_HALAMAN)}>
                Tampilkan {laporan.length - tampil} laporan lainnya
              </button>
            )}
          </>
        )}
      </main>
    </Kerangka>
  );
}
