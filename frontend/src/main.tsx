import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LaporBarang from './LaporBarang';
import AdminDashboard from './AdminDashboard';
import './lapor.css';
import './admin.css';

// ponytail: dua halaman, cukup cek path. Pasang react-router kalau rute sudah banyak.
const Halaman = location.pathname.startsWith('/admin') ? AdminDashboard : LaporBarang;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Halaman />
  </StrictMode>,
);
