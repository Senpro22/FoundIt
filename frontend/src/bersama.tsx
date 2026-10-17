// Potongan UI yang dipakai semua halaman: nav, footer, foto barang, cincin skor, pesan error.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { CARI, Ikon, SERU, ikonKategori, slug } from './ikon';
import type { Tingkat } from './detailLogic';

export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

type Menu = 'beranda' | 'katalog' | 'lapor' | 'riwayat' | 'moderasi';
const MENU: { key: Menu; label: string; href: string }[] = [
  { key: 'beranda', label: 'Beranda', href: '/' },
  { key: 'katalog', label: 'Katalog', href: '/katalog' },
  { key: 'lapor', label: 'Lapor', href: '/lapor' },
  { key: 'riwayat', label: 'Riwayat', href: '#' },
];

export function Kerangka({ aktif, children, inisial = 'RA' }: { aktif?: Menu; children: ReactNode; inisial?: string }) {
  const menu = aktif === 'moderasi' ? [...MENU.slice(0, 3), { key: 'moderasi' as Menu, label: 'Moderasi', href: '/admin' }] : MENU;
  return (
    <>
      <header className="nav">
        <a className="merk" href="/">
          <span className="mark">
            <Ikon d={CARI} ukuran={13} tebal={2.6} />
          </span>
          FoundIt
        </a>
        <nav className="menu" aria-label="Menu utama">
          {menu.map((m) => (
            <a key={m.key} href={m.href} aria-current={aktif === m.key ? 'page' : undefined}>
              {m.label}
            </a>
          ))}
        </nav>
        <div className="nav-kanan">
          <a href="/katalog" aria-label="Cari di katalog">
            <Ikon d={CARI} ukuran={16} tebal={2} />
          </a>
          <span className="avatar" aria-label="Akun">
            {inisial}
          </span>
        </div>
      </header>
      {children}
      <footer className="footer">
        <span>Hak cipta © 2026 FoundIt · Kelompok 22 DTETI FT UGM</span>
        <nav aria-label="Tautan footer">
          <a href="#">Kebijakan Privasi</a>
          <a href="#">Bantuan</a>
          <a href="#">Kontak Petugas</a>
        </nav>
      </footer>
    </>
  );
}

type FotoLaporan = { kategori: string; foto_url: string | null };

// Foto asli kalau ada, kalau tidak (atau gagal dimuat) gradasi + ikon kategori.
export function FotoBarang({ l, alt = '', className = '', children }: { l: FotoLaporan; alt?: string; className?: string; children?: ReactNode }) {
  const [gagal, setGagal] = useState(false);
  const adaFoto = l.foto_url && !gagal;
  return (
    <div className={`foto g-${slug(l.kategori)} ${className}`}>
      {adaFoto ? (
        <img src={BASE + l.foto_url} alt={alt} loading="lazy" onError={() => setGagal(true)} />
      ) : (
        <Ikon d={ikonKategori(l.kategori)} ukuran={24} tebal={1.4} />
      )}
      {children}
    </div>
  );
}

export function Cincin({ skor, tingkat, ukuran = 42, tebal = 4 }: { skor: number; tingkat: Tingkat; ukuran?: number; tebal?: number }) {
  const gaya = { '--p': skor, '--s': `${ukuran}px`, '--t': `${tebal}px` } as CSSProperties;
  return (
    <span className={`cincin ${tingkat}`} style={gaya} role="img" aria-label={`Skor kecocokan ${skor}%`}>
      <span>{skor}%</span>
    </span>
  );
}

export function PesanError({ pesan, id }: { pesan?: string; id?: string }) {
  if (!pesan) return null;
  return (
    <p className="pesan-error" id={id}>
      <Ikon d={SERU} ukuran={13} tebal={2} />
      <span>{pesan}</span>
    </p>
  );
}

export function Banner({ judul, children, aksi }: { judul: string; children?: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="banner" role="alert">
      <Ikon d={SERU} ukuran={18} tebal={2} />
      <div>
        <b>{judul}</b>
        {children && <p>{children}</p>}
      </div>
      {aksi}
    </div>
  );
}

export const pesanGagal = (err: Error) =>
  err.message === 'Failed to fetch' ? 'Tidak bisa terhubung ke server FoundIt.' : err.message;
