import { LOKASI } from './konstanta.ts';

export type Tipe = 'hilang' | 'ditemukan';

export type Laporan = {
  id: number;
  tipe: Tipe;
  kategori: string;
  lokasi: string;
  waktu_kejadian: string;
  deskripsi: string | null;
  foto_url: string | null;
  status: string;
  createdAt: string;
};

export type Rentang = 'semua' | '24j' | '7h' | '30h';

export type Filter = {
  tipe: 'semua' | Tipe;
  kategori: string; // '' = semua kategori
  lokasi: string; // '' = semua lokasi, 'Lainnya' = lokasi di luar daftar
  rentang: Rentang;
  kata: string;
};

export const FILTER_AWAL: Filter = { tipe: 'semua', kategori: '', lokasi: '', rentang: 'semua', kata: '' };

const JAM = 60 * 60 * 1000;
const BATAS: Record<Exclude<Rentang, 'semua'>, number> = { '24j': 24 * JAM, '7h': 7 * 24 * JAM, '30h': 30 * 24 * JAM };

// Huruf kecil dan tanpa aksen, supaya "Dompet" cocok dengan "dompet".
const normal = (s: string) =>
  s.toLocaleLowerCase('id-ID').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Form Lapor mengirim teks bebas kalau lokasinya "Lainnya", jadi "Lainnya" di filter
// berarti semua lokasi yang tidak ada di daftar tetap.
export function cocokLokasi(lokasi: string, pilihan: string, daftar: string[] = LOKASI) {
  if (!pilihan) return true;
  if (pilihan === 'Lainnya') return !daftar.includes(lokasi) || lokasi === 'Lainnya';
  return lokasi === pilihan;
}

export function saring(daftar: Laporan[], f: Filter, now = Date.now()) {
  const kata = normal(f.kata).split(/\s+/).filter(Boolean);
  return daftar.filter((l) => {
    if (f.tipe !== 'semua' && l.tipe !== f.tipe) return false;
    if (f.kategori && l.kategori !== f.kategori) return false;
    if (!cocokLokasi(l.lokasi, f.lokasi)) return false;
    if (f.rentang !== 'semua') {
      const t = new Date(l.waktu_kejadian).getTime();
      if (Number.isNaN(t) || now - t > BATAS[f.rentang]) return false;
    }
    if (kata.length) {
      const teks = normal(`${l.deskripsi ?? ''} ${l.kategori} ${l.lokasi}`);
      if (!kata.every((k) => teks.includes(k))) return false;
    }
    return true;
  });
}

export const adaFilter = (f: Filter) =>
  f.tipe !== FILTER_AWAL.tipe ||
  f.kategori !== FILTER_AWAL.kategori ||
  f.lokasi !== FILTER_AWAL.lokasi ||
  f.rentang !== FILTER_AWAL.rentang ||
  f.kata.trim() !== '';

// Laporan tidak punya kolom judul: pakai kalimat pertama deskripsi, kalau kosong pakai kategori.
export function judulKartu(l: Pick<Laporan, 'deskripsi' | 'kategori'>, maks = 60) {
  const kalimat = (l.deskripsi ?? '').split(/[.!?\n]/)[0].trim();
  if (!kalimat) return l.kategori;
  if (kalimat.length <= maks) return kalimat;
  const potong = kalimat.slice(0, maks);
  const spasi = potong.lastIndexOf(' ');
  return (spasi > maks / 2 ? potong.slice(0, spasi) : potong).replace(/[,;:\s]+$/, '') + '…';
}

const jamMenit = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export function waktuRelatif(iso: string, now = Date.now()) {
  const d = new Date(iso);
  const selisih = now - d.getTime();
  if (Number.isNaN(selisih)) return '';
  const kemarin = new Date(now);
  kemarin.setDate(kemarin.getDate() - 1);
  const isKemarin = d.toDateString() === kemarin.toDateString();
  if (selisih >= 0) {
    if (selisih < 60 * 1000) return 'Baru saja';
    if (selisih < JAM) return `${Math.floor(selisih / 60000)} menit lalu`;
    if (selisih < 24 * JAM && !isKemarin) return `${Math.floor(selisih / JAM)} jam lalu`;
  }
  if (isKemarin) return `Kemarin, ${jamMenit(d)}`;
  const tahunSama = d.getFullYear() === new Date(now).getFullYear();
  const tgl = d.toLocaleDateString(
    'id-ID',
    tahunSama ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' },
  );
  return `${tgl}, ${jamMenit(d)}`;
}
