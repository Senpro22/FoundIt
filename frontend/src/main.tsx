import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LaporBarang from './LaporBarang';
import './lapor.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LaporBarang />
  </StrictMode>,
);
