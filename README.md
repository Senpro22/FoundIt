# FoundIt
Aplikasi untuk membantu pengguna melaporkan dan menemukan barang hilang atau barang temuan dengan bantuan AI

Kelompok 22 
1. Ketua Kelompok: Sri Wahyuni Arista -23/521971/TK/57593
2. Anggota 1: Mayravivania Syahda Charisa - 24/538308/TK/59701
3. Anggota 2: Muhammad Farrel Al Ghazy - 24/540589/TK/60022

## Menjalankan Lapor Barang

Backend (butuh PostgreSQL jalan dan `backend/.env` terisi):

```
cd backend && npm install && npm run dev        # API di http://localhost:8000
```

Frontend (React + Vite):

```
cd frontend && npm install && npm run dev       # halaman di http://localhost:5173
```

Kalau API jalan di host/port lain, buat `frontend/.env` berisi `VITE_API_URL=http://host:port`.
Perintah lain di frontend: `npm test` (validasi form), `npm run build` (build produksi ke `dist/`).
