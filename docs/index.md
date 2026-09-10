# FoundIt

**Project Senior Project TI**
Departemen Teknologi Elektro dan Teknologi Informasi, Fakultas Teknik, Universitas Gadjah Mada

## Anggota Kelompok

| Nama | NIM | Peran |
|---|---|---|
| Sri Wahyuni Arista | 23/521971/TK/57593 | AI Engineer, Cloud Engineer |
| Muhammad Farrel Al Ghazy | 24/540589/TK/60022 | UI/UX Designer, Software Engineer (Front-End) |
| Mayravivania Syahda Charisa | 24/538308/TK/59701 | Project Manager, Software Engineer (Back-End) |

---

## Nama Produk

**FoundIt**

## Jenis Produk

Platform *lost and found* berbasis web yang mengintegrasikan kecerdasan buatan (AI) untuk secara otomatis mencocokkan laporan barang hilang (*Lost Item*) dan barang ditemukan (*Found Item*).

## Latar Belakang & Permasalahan

Kehilangan barang di lingkungan kampus merupakan permasalahan universal yang terus muncul dan berdampak secara teknis maupun administratif bagi mahasiswa, dosen, dan staf akademis. Survei terhadap 73 mahasiswa Politeknik Negeri Jakarta menunjukkan 79,5% responden pernah kehilangan barang di kampus, dan lebih dari 91% di antaranya kesulitan menemukan informasi barang temuan karena sistem pelaporan masih manual dan tidak terpusat.

Beberapa data pendukung dari kampus lain di Indonesia:
- **ITS**: ±700 laporan kehilangan (Jan-Sep 2024), sistem masih memakai Google Form internal yang informasinya tidak tersebar ke seluruh sivitas akademika.
- **UNESA**: 393 kasus kehilangan (Agu 2023-Agu 2025), sistem pelaporan masih pakai buku mutasi dan handy talkie sehingga alur informasi tidak terstruktur dan berisiko kehilangan data.
- **FTUI**: membentuk tim pengembangan sistem Lost and Found terintegrasi (Feb 2025) karena pengelolaan barang hilang/ditemukan masih berjalan terpisah di tiap unit.

**Rumusan Permasalahan:**
1. Proses pelaporan dan pencarian barang hilang di kampus masih tersebar dan tidak terpusat (papan info, Twitter/X, grup WA/Line per angkatan, satpam per gedung).
2. Penemu barang sering enggan melapor karena proses manual dirasa merepotkan.
3. Tidak ada mekanisme otomatis yang mencocokkan laporan "kehilangan" dan "penemuan" berdasarkan kemiripan visual, lokasi, dan waktu.
4. Tidak ada verifikasi kepemilikan, sehingga berisiko terjadi klaim palsu.

## Ide Solusi

FoundIt menggabungkan teknologi **Computer Vision** (pemrosesan citra) dan **Natural Language Processing (NLP) dengan Vector Embeddings** (pemrosesan teks) untuk memberikan analisis kemiripan yang mendalam antara laporan barang hilang dan ditemukan.

Pengguna cukup melaporkan barang dengan mengunggah foto, lokasi, waktu, dan deskripsi. Sistem AI membandingkan fitur visual gambar serta kemiripan konteks teks untuk menghasilkan **Confidence Score** (misalnya "87% Match"), sehingga pengguna dan admin dapat memprioritaskan pencocokan paling potensial. Setelah kecocokan ditemukan, proses klaim difasilitasi melalui mekanisme **verifikasi kepemilikan**.

**Rancangan Fitur:**

| Fitur | Keterangan |
|---|---|
| Lapor barang hilang/ditemukan | Upload foto, pilih lokasi (peta/dropdown gedung), waktu kejadian, dan deskripsi detail |
| Smart AI Matching Engine | Computer Vision + NLP/Vector Embeddings menghasilkan Confidence Score (0-100%) |
| Dashboard & Notifikasi Real-Time | Riwayat laporan, status klaim, notifikasi otomatis saat ada kecocokan tinggi |
| Verifikasi Kepemilikan (Claim Verification) | Cocokkan KTM, jawab pertanyaan spesifik, atau bukti kepemilikan tambahan |
| Dashboard Admin/Petugas Keamanan | Moderasi laporan, verifikasi data, monitor klaim, kelola pengguna & statistik |
| Riwayat & Pencarian Lanjutan | Pencarian berdasarkan kategori, lokasi, atau rentang waktu |

## Analisis Kompetitor

**1. @ugmfess (autobase Twitter/X UGM)**: (*Indirect competitor*)
Jangkauan luas, gratis, dan anonim, tapi bukan platform lost & found sungguhan — laporan tenggelam dalam hitungan menit, tidak ada pencarian terstruktur, pencocokan otomatis, maupun verifikasi kepemilikan.

**2. Crowdfind**: (*Indirect competitor*)
Software lost & found berbayar untuk institusi (dipakai Virginia Tech, Rutgers). Model top-down (hanya staf yang bisa mendaftarkan barang), berbayar, dan tidak terlokalisasi untuk kampus Indonesia.

**3. Layanan lost & found manual kampus** (pos satpam/sekretariat departemen): (*Direct competitor*)
Barang tersimpan fisik dan resmi, tapi tersebar di banyak titik yang tidak saling terhubung, pendataan minim, dan pemilik harus menebak & datang langsung ke tiap lokasi.

**Keunggulan FoundIt:** menggabungkan legitimasi institusional dan kemudahan pelaporan mandiri lewat satu katalog terpusat dengan pencocokan otomatis berbasis AI (visual, deskripsi, lokasi, dan waktu), sesuatu yang tidak dimiliki satupun kompetitor di atas.

### Entity Relationship Diagram (ERD)

![ERD FoundIt](assets/foundIt-ERD.png) 
