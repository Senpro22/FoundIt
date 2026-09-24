import { useEffect, useState } from 'react';

const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000') + '/api/reports';
const MEDIA = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

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

const nomor = (id: number) => '#FI-' + String(id).padStart(5, '0');
const tanggal = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Bar({ data }: { data: Record<string, number> }) {
  const baris = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...baris.map(([, n]) => n));
  if (!baris.length) return <p className="helper">Belum ada data.</p>;
  return (
    <ul className="bar">
      {baris.map(([nama, n]) => (
        <li key={nama}>
          <span className="bar-nama">{nama}</span>
          <span className="bar-track">
            <span className="bar-isi" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="bar-angka">{n}</span>
        </li>
      ))}
    </ul>
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

  async function muat(f: '' | Status) {
    setGagal(null);
    try {
      const [a, b] = await Promise.all([fetch(`${API}?status=${f}`), fetch(`${API}/stats`)]);
      if (!a.ok || !b.ok) throw new Error('Server tidak merespons dengan benar.');
      setLaporan(await a.json());
      setStat(await b.json());
    } catch (err) {
      setGagal((err as Error).message);
      setLaporan([]);
    }
  }

  useEffect(() => {
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
      setGagal((err as Error).message);
    } finally {
      setSibuk(null);
    }
  }

  return (
    <>
      <header>
        <div className="kiri">
          <div className="merk">
            <div className="mark" />
            <span>FoundIt</span>
          </div>
          <nav>
            <a href="/">Lapor</a>
            <a href="/admin" aria-current="page">
              Moderasi
            </a>
          </nav>
        </div>
        <div className="user">
          <span>Petugas Keamanan</span>
          <div className="avatar">PK</div>
        </div>
      </header>

      <main className="lebar">
        <div>
          <h1>Dashboard Moderasi</h1>
          <p className="sub">
            Tinjau laporan masuk sebelum dicocokkan sistem. Laporan yang ditolak wajib disertai alasan agar pelapor tahu
            apa yang perlu diperbaiki.
          </p>
        </div>

        <div className="kpi">
          {[
            { label: 'Total laporan', nilai: stat?.total, nada: '' },
            { label: 'Menunggu moderasi', nilai: stat?.pending, nada: 'kuning' },
            { label: 'Disetujui', nilai: stat?.disetujui, nada: 'hijau' },
            { label: 'Ditolak', nilai: stat?.ditolak, nada: 'merah' },
          ].map((k) => (
            <div key={k.label} className={`kartu angka ${k.nada}`}>
              <span className="kpi-label">{k.label}</span>
              <strong>{k.nilai ?? '—'}</strong>
            </div>
          ))}
        </div>

        <div className="dua">
          <div className="kartu">
            <h2>Laporan per tipe</h2>
            <Bar data={stat?.per_tipe ?? {}} />
          </div>
          <div className="kartu">
            <h2>Laporan per kategori</h2>
            <Bar data={stat?.per_kategori ?? {}} />
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Filter status laporan">
          {FILTER.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {gagal && (
          <div className="banner" role="alert">
            <span className="bulat">!</span>
            <div>
              <b>Aksi gagal diproses</b>
              <p>{gagal}</p>
            </div>
          </div>
        )}

        {laporan === null ? (
          <p className="helper">Memuat laporan...</p>
        ) : laporan.length === 0 ? (
          <div className="kartu kosong">
            <p>Tidak ada laporan pada filter ini.</p>
          </div>
        ) : (
          <ul className="daftar">
            {laporan.map((l) => (
              <li key={l.id} className="kartu laporan">
                {l.foto_url ? (
                  <img src={MEDIA + l.foto_url} alt={`Foto laporan ${nomor(l.id)}`} />
                ) : (
                  <div className="tanpa-foto">Tanpa foto</div>
                )}

                <div className="isi">
                  <div className="baris-judul">
                    <b>{l.kategori}</b>
                    <span className={`tag ${l.tipe}`}>{l.tipe === 'hilang' ? 'Hilang' : 'Ditemukan'}</span>
                    <span className={`tag status ${l.status}`}>
                      {l.status === 'pending' ? 'Menunggu' : l.status === 'disetujui' ? 'Disetujui' : 'Ditolak'}
                    </span>
                    <span className="kode">{nomor(l.id)}</span>
                  </div>
                  <p className="meta">
                    {l.lokasi} · {tanggal(l.waktu_kejadian)} · dilaporkan {tanggal(l.createdAt)}
                  </p>
                  {l.deskripsi && <p className="deskripsi">{l.deskripsi}</p>}
                  {l.status === 'ditolak' && l.alasan_tolak && (
                    <p className="alasan">Alasan penolakan: {l.alasan_tolak}</p>
                  )}

                  {menolak === l.id ? (
                    <div className="field tolak">
                      <label htmlFor={`alasan-${l.id}`}>Alasan penolakan</label>
                      <input
                        id={`alasan-${l.id}`}
                        type="text"
                        autoFocus
                        placeholder="Foto buram, lokasi tidak jelas, laporan ganda, ..."
                        value={alasan}
                        onChange={(e) => setAlasan(e.target.value)}
                      />
                      <div className="aksi-laporan">
                        <button
                          type="button"
                          className="tombol netral kecil"
                          onClick={() => {
                            setMenolak(null);
                            setAlasan('');
                          }}
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          className="tombol hapus kecil"
                          disabled={!alasan.trim() || sibuk === l.id}
                          onClick={() => ubahStatus(l.id, 'ditolak', alasan)}
                        >
                          Konfirmasi Tolak
                        </button>
                      </div>
                    </div>
                  ) : (
                    l.status === 'pending' && (
                      <div className="aksi-laporan">
                        <button
                          type="button"
                          className="tombol hapus kecil"
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
                          className="tombol utama kecil"
                          disabled={sibuk === l.id}
                          onClick={() => ubahStatus(l.id, 'disetujui')}
                        >
                          Setujui
                        </button>
                      </div>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
