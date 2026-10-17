import { useMemo, useRef, useState, type FormEvent } from 'react';
import { formatMB, validateFoto, validateForm, type FieldError } from './formLogic';
import { KATEGORI, LOKASI } from './konstanta';
import { Banner, Kerangka, PesanError } from './bersama';
import { CENTANG, CHEVRON, Ikon, SERU, UNGGAH } from './ikon';

const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000') + '/api/reports';

const TEKS = {
  hilang: {
    lokasi: 'Terakhir terlihat di',
    helperLokasi: 'Pilih tempat terakhir kamu memegang atau melihat barang ini.',
    waktu: 'Waktu kehilangan',
    deskripsi: 'Deskripsi · disarankan',
    helperDeskripsi: 'Sebutkan warna, merek, atau isi barang bila kamu ingat.',
  },
  ditemukan: {
    lokasi: 'Ditemukan di',
    helperLokasi: 'Pilih gedung atau area tempat kamu menemukan barang ini.',
    waktu: 'Waktu ditemukan',
    deskripsi: 'Deskripsi · opsional',
    helperDeskripsi: 'Boleh singkat. Detail tambahan membantu pemilik mengenali barangnya.',
  },
} as const;

const pad = (n: number) => String(n).padStart(2, '0');
const sekarangLokal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
  const errorDetail = errors.filter((e) => e.field !== 'foto');

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
    setErrors((es) => es.filter((e) => e.field !== 'foto'));
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
      setGagal((err as Error).message === 'Failed to fetch' ? 'Koneksi ke server terputus.' : (err as Error).message);
    } finally {
      setMengirim(false);
    }
  }

  // Baris "label kiri, kontrol kanan". Error: label merah + ikon, pesan di bawah grup.
  const salah = (field: FieldError['field']) => Boolean(errorOf(field));
  const tandaSalah = (field: FieldError['field']) =>
    salah(field) && (
      <span className="tanda-salah">
        <Ikon d={SERU} ukuran={16} tebal={2} />
      </span>
    );

  if (nomorLaporan) {
    return (
      <Kerangka aktif="lapor">
        <main>
          <section className="kartu sukses" role="status">
            <span className="centang-besar">
              <Ikon d={CENTANG} ukuran={26} tebal={2.4} />
            </span>
            <h1>Laporan kamu sudah terkirim</h1>
            <p className="sub">
              Kami mulai mencocokkan laporan ini dengan semua {mode === 'hilang' ? 'temuan' : 'laporan kehilangan'} di kampus
              setelah moderasi admin selesai. Kamu dapat notifikasi kalau ada yang mirip.
            </p>
            <dl className="ringkasan-sukses">
              <div>
                <dt>Nomor laporan</dt>
                <dd>
                  <b>{nomorLaporan}</b>
                </dd>
              </div>
              <div>
                <dt>Jenis</dt>
                <dd>
                  {mode === 'hilang' ? 'Barang hilang' : 'Barang ditemukan'} · {kategori}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className="tag pending">Menunggu moderasi admin</span>
                </dd>
              </div>
            </dl>
            <div className="aksi tengah">
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
              <a className="tombol utama" href="#">
                Lihat Riwayat Laporan
              </a>
            </div>
          </section>
        </main>
      </Kerangka>
    );
  }

  return (
    <Kerangka aktif="lapor">
      <main>
        <div>
          <h1>Lapor Barang</h1>
          <p className="sub">Foto, lokasi, dan waktu sudah cukup. Laporanmu dicocokkan otomatis dengan semua laporan di kampus.</p>
        </div>

        <form onSubmit={kirim} className={`form-lapor${mengirim ? ' mengirim' : ''}`} noValidate>
          <div className="segmented" role="tablist" aria-label="Tipe laporan">
            {(['hilang', 'ditemukan'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} disabled={mengirim} onClick={() => setMode(m)}>
                {m === 'hilang' ? 'Barang Hilang' : 'Barang Ditemukan'}
              </button>
            ))}
          </div>

          {gagal && (
            <Banner judul="Laporan gagal dikirim">
              {gagal} Data yang sudah kamu isi masih tersimpan di halaman ini, jadi tidak perlu mengisi ulang.
            </Banner>
          )}
          {errors.length > 0 && (
            <Banner judul={`${errors.length} isian wajib belum lengkap`}>Fokus dipindahkan ke isian pertama yang perlu diperbaiki.</Banner>
          )}

          <fieldset className="grup" disabled={mengirim}>
            <legend className="grup-judul">Foto barang</legend>
            <div className="grup-isi">
              <input
                ref={inputFoto}
                type="file"
                id="foto"
                className="sr-only"
                tabIndex={-1}
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => e.target.files?.[0] && pasangFoto(e.target.files[0])}
              />
              {foto && fotoUrl ? (
                <div className="berkas">
                  <img src={fotoUrl} alt="Pratinjau foto barang" />
                  <div className="nama-berkas">
                    <b>{foto.name}</b>
                    <span>
                      {formatMB(foto.size)} · {foto.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                  <button type="button" className="tombol teks kecil" onClick={() => inputFoto.current?.click()}>
                    Ganti
                  </button>
                  <button type="button" className="tombol bahaya kecil" onClick={lepasFoto}>
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="bingkai-drop">
                  <button
                    ref={tombolFoto}
                    type="button"
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
                    <span className="ikon-drop">
                      <Ikon d={judulFotoSalah ? SERU : UNGGAH} ukuran={18} tebal={2.2} />
                    </span>
                    <span className="judul-drop">
                      {drag ? 'Lepas untuk mengunggah' : (judulFotoSalah ?? (
                        <>
                          <span className="hanya-lebar">Tarik foto ke sini atau klik untuk pilih</span>
                          <span className="hanya-sempit">Ketuk untuk ambil atau pilih foto</span>
                        </>
                      ))}
                    </span>
                    <span className="aturan-drop" id="foto-aturan">
                      Satu foto saja · JPG, JPEG, PNG, WEBP · maks. 5 MB
                    </span>
                  </button>
                </div>
              )}
            </div>
            {errorOf('foto') ? <PesanError pesan={errorOf('foto')} /> : <p className="grup-catatan">Foto yang jelas membuat hasil pencocokan lebih akurat.</p>}
          </fieldset>

          <fieldset className="grup" disabled={mengirim}>
            <legend className="grup-judul">Detail barang</legend>
            <div className="grup-isi">
              <label className={`baris${salah('kategori') ? ' salah' : ''}`}>
                <span className="label">Kategori</span>
                <select
                  id="kategori"
                  required
                  value={kategori}
                  aria-invalid={salah('kategori') || undefined}
                  onChange={(e) => setKategori(e.target.value)}
                >
                  <option value="">Pilih kategori barang</option>
                  {KATEGORI.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                {tandaSalah('kategori')}
                <span className="chevron">
                  <Ikon d={CHEVRON} ukuran={14} tebal={2} />
                </span>
              </label>
              <label className={`baris${salah('lokasi') ? ' salah' : ''}`}>
                <span className="label">{teks.lokasi}</span>
                <select
                  id="lokasi"
                  required
                  value={lokasi}
                  aria-invalid={salah('lokasi') || undefined}
                  onChange={(e) => setLokasi(e.target.value)}
                >
                  <option value="">Cari gedung atau area kampus</option>
                  {LOKASI.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                {tandaSalah('lokasi')}
                <span className="chevron">
                  <Ikon d={CHEVRON} ukuran={14} tebal={2} />
                </span>
              </label>
              {lokasi === 'Lainnya' && (
                <label className={`baris${salah('lokasi-detail') ? ' salah' : ''}`}>
                  <span className="label">Detail lokasi</span>
                  <input
                    type="text"
                    id="lokasi-detail"
                    placeholder="Parkiran timur FT, dekat pos satpam"
                    value={lokasiDetail}
                    aria-invalid={salah('lokasi-detail') || undefined}
                    onChange={(e) => setLokasiDetail(e.target.value)}
                  />
                  {tandaSalah('lokasi-detail')}
                </label>
              )}
              <label className={`baris${salah('waktu') ? ' salah' : ''}`}>
                <span className="label">{teks.waktu}</span>
                <input
                  type="datetime-local"
                  id="waktu"
                  required
                  max={maxWaktu}
                  value={waktu}
                  aria-invalid={salah('waktu') || undefined}
                  onChange={(e) => setWaktu(e.target.value)}
                />
                {tandaSalah('waktu')}
              </label>
            </div>
            {errorDetail.length ? (
              errorDetail.map((e) => <PesanError key={e.field} pesan={e.message} />)
            ) : (
              <p className="grup-catatan">{teks.helperLokasi} Waktu tidak bisa setelah sekarang.</p>
            )}
          </fieldset>

          <fieldset className="grup" disabled={mengirim}>
            <legend className="grup-judul">
              <label htmlFor="deskripsi">{teks.deskripsi}</label>
            </legend>
            <div className="grup-isi">
              <div className="isian-panjang">
                <textarea
                  id="deskripsi"
                  maxLength={500}
                  placeholder="Dompet kulit coklat, ada stiker UGM, isi KTM atas nama ..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                />
                <span className="hitung">{deskripsi.length}/500</span>
              </div>
            </div>
            <p className="grup-catatan">{teks.helperDeskripsi}</p>
          </fieldset>

          <div className="aksi">
            {mengirim && <span className="catatan">Form dikunci sementara agar laporan tidak terkirim dua kali.</span>}
            <button type="button" className="tombol netral" onClick={kosongkan} disabled={mengirim}>
              Batal
            </button>
            <button type="submit" className={`tombol utama${mengirim ? ' sibuk' : ''}`} disabled={mengirim}>
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
          </div>
        </form>
      </main>
    </Kerangka>
  );
}

