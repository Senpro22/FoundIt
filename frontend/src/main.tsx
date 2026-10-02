import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LaporBarang from './LaporBarang';
import AdminDashboard from './AdminDashboard';
import Katalog from './Katalog';
import './lapor.css';
import './admin.css';
import './katalog.css';

// Masih sedikit halaman, cukup cek path. Pasang react-router kalau rute sudah banyak.
const path = location.pathname;
const Halaman = path.startsWith('/admin') ? AdminDashboard : path.startsWith('/katalog') ? Katalog : LaporBarang;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Halaman />
  </StrictMode>,
);
