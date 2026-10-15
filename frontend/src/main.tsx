import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LaporBarang from './LaporBarang';
import AdminDashboard from './AdminDashboard';
import Katalog from './Katalog';
import DetailLaporan from './DetailLaporan';
import KlaimKepemilikan from './KlaimKepemilikan';
import './lapor.css';
import './admin.css';
import './katalog.css';
import './detail.css';
import './klaim.css';

// Masih sedikit halaman, cukup cek path. Pasang react-router kalau rute sudah banyak.
const path = location.pathname;
const Halaman = path.startsWith('/admin')
  ? AdminDashboard
  : /^\/katalog\/[^/]+/.test(path)
    ? DetailLaporan
    : path.startsWith('/katalog')
      ? Katalog
      : path.startsWith('/klaim')
        ? KlaimKepemilikan
        : LaporBarang;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Halaman />
  </StrictMode>,
);
