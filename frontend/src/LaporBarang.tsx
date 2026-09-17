import { useMemo, useRef, useState, type FormEvent } from 'react';
import { formatMB, validateFoto, validateForm, type FieldError } from './formLogic';

const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000') + '/api/reports';

const TEKS = {
  hilang: {
    lokasi: 'Terakhir terlihat di',
    helperLokasi: 'Pilih tempat terakhir kamu memegang atau melihat barang ini.',
    waktu: 'Waktu kehilangan',
    deskripsi: 'Deskripsi (disarankan)',
    helperDeskripsi: 'Sebutkan warna, merek, atau isi barang bila kamu ingat.',
  },
  ditemukan: {
    lokasi: 'Ditemukan di',
    helperLokasi: 'Pilih gedung atau area tempat kamu menemukan barang ini.',
    waktu: 'Waktu ditemukan',
    deskripsi: 'Deskripsi (opsional)',
    helperDeskripsi: 'Boleh singkat. Detail tambahan membantu pemilik mengenali barangnya.',
  },
} as const;

const KATEGORI = ['Dompet & Kartu', 'Elektronik', 'Kunci', 'Tas', 'Pakaian', 'Dokumen', 'Lainnya'];
const LOKASI = [
  'Perpustakaan Pusat',
  'Perpustakaan Fakultas Teknik',
  'Gedung Kuliah Umum',
  'Kantin Fakultas Teknik',
  'Masjid Kampus',
  'Lainnya',
];

const pad = (n: number) => String(n).padStart(2, '0');
const sekarangLokal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Wajib = () => <span className="wajib">*</span>;

function PesanError({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <p className="pesan-error">
      <span className="bulat">!</span>
      <span>{pesan}</span>
    </p>
  );
}

export default function LaporBarang() {
  const [mode, setMode] = useState<'hilang' | 'ditemukan'>('hilang');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [judulFotoSalah, setJudulFotoSalah] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [kategori, setKategori] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [lokasiDetail, setLokasiDetail] = useState('');
  const [waktu, setWaktu] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [mengirim, setMengirim] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [nomorLaporan, setNomorLaporan] = useState<string | null>(null);

  const inputFoto = useRef<HTMLInputElement>(null);
  const tombolFoto = useRef<HTMLButtonElement>(null);
  const maxWaktu = useMemo(sekarangLokal, []);
  const teks = TEKS[mode];
  const errorOf = (field: FieldError['field']) => errors.find((e) => e.field === field)?.message;
  const fotoSalah = Boolean(judulFotoSalah) || Boolean(errorOf('foto'));

  function pasangFoto(file: File) {
    const cek = validateFoto(file);
    if (!cek.ok) {
      lepasFoto();
      setJudulFotoSalah(cek.title);
      setErrors([{ field: 'foto', message: cek.text }]);
      return;
    }
    setFoto(file);
    setFotoUrl(URL.createObjectURL(file));
    setJudulFotoSalah(null);
    setErrors([]);
  }

  function lepasFoto() {
    setFoto(null);
    setFotoUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setJudulFotoSalah(null);
    if (inputFoto.current) inputFoto.current.value = '';
  }

  function kosongkan() {
    lepasFoto();
    setKategori('');
    setLokasi('');
    setLokasiDetail('');
    setWaktu('');
    setDeskripsi('');
    setErrors([]);
    setGagal(null);
  }

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const nilai = { foto, kategori, lokasi, lokasiDetail, waktu };
    const temuan = validateForm(nilai);
    setErrors(temuan);
    if (temuan.length) {
      const pertama = temuan[0].field;
      const el = pertama === 'foto' ? tombolFoto.current : document.getElementById(pertama);
      el?.focus();
      return;
    }

    const data = new FormData();
    data.append('tipe', mode);
    data.append('kategori', kategori);
    data.append('lokasi', lokasi === 'Lainnya' ? lokasiDetail.trim() : lokasi);
    data.append('waktu_kejadian', new Date(waktu).toISOString());
    data.append('deskripsi', deskripsi);
    data.append('foto', foto as File);

    setGagal(null);
    setMengirim(true);
    try {
      const res = await fetch(API, { method: 'POST', body: data });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error || `Server menjawab ${res.status}.`);
      }
      const laporan = (await res.json()) as { id: number };
      setNomorLaporan('#FI-' + String(laporan.id).padStart(5, '0'));
    } catch (err) {
      setGagal((err as Error).message);
    } finally {
      setMengirim(false);
    }
  }

  const tombolKirim = (
    <button type="submit" className="tombol utama" disabled={mengirim}>
      {mengirim ? (
        <>
          <span className="spinner" />
          Mengirim laporan...
        </>
      ) : gagal ? (
        'Coba Lagi'
      ) : (
        'Kirim Laporan'
      )}
    </button>
  );
  const tombolBatal = (
    <button type="button" className="tombol netral" onClick={kosongkan} disabled={mengirim}>
      Batal
    </button>
  );

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
            <a href="#" aria-current="page">
              Lapor
            </a>
            <a href="#">Katalog</a>
            <a href="#">Riwayat</a>
          </nav>
        </div>
        <div className="user">
          <span>Rizky Ananda</span>
          <div className="avatar">RA</div>
        </div>
      </header>

      <main>
        <div>
          <h1>Lapor Barang</h1>
          <p className="sub">
            Field bertanda <Wajib /> wajib diisi. Foto, lokasi, dan waktu sudah cukup untuk mengirim laporan.
          </p>
        </div>

        {nomorLaporan ? (
          <div className="sukses">
            <div className="centang">✓</div>
            <h2>Laporan kamu sudah terkirim</h2>
            <p>
              Nomor laporan <strong>{nomorLaporan}</strong>. Kami mulai mencocokkan laporan ini dengan data lain secara
              otomatis setelah moderasi selesai.
            </p>
            <span className="lencana">Menunggu moderasi admin</span>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', paddingTop: 6 }}>
              <a className="tombol navy" href="#">
                Lihat Riwayat Laporan
              </a>
              <button
                type="button"
                className="tombol netral"
                onClick={() => {
                  kosongkan();
                  setNomorLaporan(null);
                }}
              >
                Buat Laporan Lain
              </button>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={kirim} className={mengirim ? 'mengirim' : undefined} noValidate>
              <div className="tabs" role="tablist" aria-label="Tipe laporan">
                {(['hilang', 'ditemukan'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    disabled={mengirim}
                    onClick={() => setMode(m)}
                  >
                    {m === 'hilang' ? 'Barang Hilang' : 'Barang Ditemukan'}
                  </button>
                ))}
              </div>

              {gagal && (
                <div className="banner" role="alert">
                  <span className="bulat">!</span>
                  <div>
                    <b>Laporan gagal dikirim</b>
                    <p>
                      {gagal} Data yang sudah kamu isi masih tersimpan di halaman ini, jadi tidak perlu mengisi ulang.
                    </p>
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="banner ringkas" role="alert">
                  <span className="bulat">!</span>
                  <div>
                    <b>
                      {errors.length} field wajib belum lengkap. Fokus dipindahkan ke field pertama yang perlu
                      diperbaiki.
                    </b>
                  </div>
                </div>
              )}

              <div className="kartu" style={{ marginTop: 18 }}>
                <div className="kolom">
                  <div className="kolom-foto">
                    <label htmlFor="foto-tombol">
                      Foto barang <Wajib />
                    </label>
                    <input
                      ref={inputFoto}
                      type="file"
                      id="foto"
                      className="sr-only"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(e) => e.target.files?.[0] && pasangFoto(e.target.files[0])}
                    />
                    {foto && fotoUrl ? (
                      <div className="pratinjau">
                        <img src={fotoUrl} alt="Pratinjau foto barang" />
                        <div className="berkas">
                          <div className="nama">
                            <b>{foto.name}</b>
                            <span>
                              {formatMB(foto.size)} · {foto.name.split('.').pop()?.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="tombol netral kecil"
                              onClick={() => inputFoto.current?.click()}
                            >
                              Ganti
                            </button>
                            <button type="button" className="tombol hapus kecil" onClick={lepasFoto}>
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        ref={tombolFoto}
                        type="button"
                        id="foto-tombol"
                        className={`dropzone${drag ? ' drag' : ''}${fotoSalah ? ' salah' : ''}`}
                        aria-describedby="foto-aturan"
                        aria-invalid={fotoSalah || undefined}
                        onClick={() => inputFoto.current?.click()}
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
                          if (file) pasangFoto(file);
                        }}
                      >
                        <span className="ikon">{drag ? '↓' : judulFotoSalah ? '!' : '↑'}</span>
                        <span className="judul">
                          {drag
                            ? 'Lepas foto untuk mengunggah'
                            : (judulFotoSalah ?? 'Tarik foto ke sini atau klik untuk pilih')}
                        </span>
                        <span className="aturan" id="foto-aturan">
                          Satu foto saja · JPG, JPEG, PNG, WEBP · maks. 5 MB
                        </span>
                      </button>
                    )}
                    <PesanError pesan={errorOf('foto')} />
                  </div>

                  <div className="kolom-field">
                    <div className="field">
                      <label htmlFor="kategori">
                        Kategori <Wajib />
                      </label>
                      <select
                        id="kategori"
                        required
                        value={kategori}
                        disabled={mengirim}
                        aria-invalid={Boolean(errorOf('kategori')) || undefined}
                        onChange={(e) => setKategori(e.target.value)}
                      >
                        <option value="">Pilih kategori barang</option>
                        {KATEGORI.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                      <PesanError pesan={errorOf('kategori')} />
                    </div>

                    <div className="field">
                      <label htmlFor="lokasi">
                        {teks.lokasi} <Wajib />
                      </label>
                      <select
                        id="lokasi"
                        required
                        value={lokasi}
                        disabled={mengirim}
                        aria-invalid={Boolean(errorOf('lokasi')) || undefined}
                        onChange={(e) => setLokasi(e.target.value)}
                      >
                        <option value="">Pilih gedung atau area kampus</option>
                        {LOKASI.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </select>
                      {!errorOf('lokasi') && <p className="helper">{teks.helperLokasi}</p>}
                      <PesanError pesan={errorOf('lokasi')} />
                      {lokasi === 'Lainnya' && (
                        <div className="field">
                          <label htmlFor="lokasi-detail">
                            Detail lokasi <Wajib />
                          </label>
                          <input
                            type="text"
                            id="lokasi-detail"
                            placeholder="Parkiran timur Fakultas Teknik, dekat pos satpam"
                            value={lokasiDetail}
                            disabled={mengirim}
                            aria-invalid={Boolean(errorOf('lokasi-detail')) || undefined}
                            onChange={(e) => setLokasiDetail(e.target.value)}
                          />
                          <PesanError pesan={errorOf('lokasi-detail')} />
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label htmlFor="waktu">
                        {teks.waktu} <Wajib />
                      </label>
                      <input
                        type="datetime-local"
                        id="waktu"
                        required
                        max={maxWaktu}
                        value={waktu}
                        disabled={mengirim}
                        aria-invalid={Boolean(errorOf('waktu')) || undefined}
                        onChange={(e) => setWaktu(e.target.value)}
                      />
                      {!errorOf('waktu') && <p className="helper">Tidak bisa memilih waktu setelah sekarang.</p>}
                      <PesanError pesan={errorOf('waktu')} />
                    </div>
                  </div>
                </div>

                <div className="pemisah" />

                <div className="field">
                  <div className="head-deskripsi">
                    <label htmlFor="deskripsi">{teks.deskripsi}</label>
                    <span className="hitung">{deskripsi.length}/500</span>
                  </div>
                  <textarea
                    id="deskripsi"
                    maxLength={500}
                    placeholder="Dompet kulit coklat, ada stiker UGM, isi KTM atas nama ..."
                    value={deskripsi}
                    disabled={mengirim}
                    onChange={(e) => setDeskripsi(e.target.value)}
                  />
                  <p className="helper">{teks.helperDeskripsi}</p>
                </div>
              </div>

              <div className="aksi">
                {mengirim && (
                  <span className="catatan">Form dikunci sementara agar laporan tidak terkirim dua kali.</span>
                )}
                {tombolBatal}
                {tombolKirim}
              </div>
              <div className="aksi-mobile">
                {tombolBatal}
                {tombolKirim}
              </div>
            </form>

            <p className="catatan-ai">
              Laporan dicocokkan otomatis oleh sistem. Foto yang jelas dan lokasi yang tepat membuat hasil pencocokan
              lebih akurat.
            </p>
          </>
        )}
      </main>
    </>
  );
}
