// Ikon garis yang dipakai bareng oleh Katalog, Detail, dan Klaim.

// Ikon per kategori, dipakai kalau laporan tidak punya foto.
export const IKON: Record<string, string> = {
  'Dompet & Kartu': 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 11h5v5h-5a2.5 2.5 0 0 1 0-5zM5 6l10-3 1.2 3',
  Elektronik: 'M9 2.5h6a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM11 18h2',
  Kunci: 'M4 15a4 4 0 1 0 8 0a4 4 0 1 0-8 0M11 12l8-8M16 7l2 2M14 9l2 2',
  Tas: 'M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  Pakaian: 'M8 3L3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z',
  Dokumen: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  Lainnya: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
};

export const ikonKategori = (kategori: string) => IKON[kategori] ?? IKON.Lainnya;

// Nama kelas warna latar foto per kategori (k-dompet, k-elektronik, ... di katalog.css).
export const slug = (kategori: string) => (IKON[kategori] ? kategori.split(' ')[0].toLowerCase() : 'lainnya');

export const PIN = 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 6.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5';
export const JAM = 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2';
export const CARI = 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-3.5-3.5';
export const KEMBALI = 'M15 18l-6-6 6-6';
export const CENTANG = 'M5 12.5l4.5 4.5L19 7.5';
export const STRIP = 'M6 12h12';
export const GEMBOK = 'M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4';
export const LONCENG = 'M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0';
export const TAMBAH = 'M12 5v14M5 12h14';

export function Ikon({ d, ukuran = 16, tebal = 1.9 }: { d: string; ukuran?: number; tebal?: number }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tebal}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
