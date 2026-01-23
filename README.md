# RM Tracer - Aplikasi Pelacakan Rekam Medis Web

Aplikasi manajemen rekam medis rumah sakit berbasis web yang memanfaatkan teknologi QR Code untuk mempercepat proses pelacakan dan pengelolaan dokumen rekam medis pasien.

## 🚀 Fitur Utama

Aplikasi ini memiliki dua peran pengguna utama: **Admin** dan **Petugas**.

### 🛡️ Admin
- **Dashboard**: Ringkasan statistik pengguna dan pasien.
- **Manajemen Pasien**: Tambah, edit, dan hapus data pasien.
- **Cetak QR Code**: Generate dan cetak kartu QR Code untuk pasien.
- **Manajemen Pengguna**: Kelola akun petugas dan admin.
- **Log Aktivitas**: Pantau riwayat aktivitas sistem.

### 👨‍⚕️ Petugas
- **Scan QR Code**: Pindai kartu pasien untuk akses cepat ke data rekam medis.
- **Pencarian Pasien**: Cari data pasien manual jika QR Code tidak tersedia.
- **Riwayat**: Lihat riwayat akses dan pemindahan berkas.
- **Profil**: Kelola informasi akun petugas.

## 🛠️ Teknologi yang Digunakan

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Auth**: [Supabase](https://supabase.com/)
- **Routing**: [React Router](https://reactrouter.com/)
- **QR Code**: `qrcode.react`
- **Icons**: `lucide-react`

## 📦 Cara Memulai (Installation)

Ikuti langkah-langkah berikut untuk menjalankan project di komputer lokal Anda:

### Prasyarat
- Node.js (versi 18 atau terbaru disarankan)
- NPM atau Yarn

### Langkah Instalasi

1. **Clone repositori ini** (jika menggunakan git) atau ekstrak file project.
   ```bash
   git clone <repository-url>
   cd rm-tracer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable**
   Buat file `.env` di root folder project dan tambahkan konfigurasi Supabase Anda:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

## 📜 Skrip Tersedia

- `npm run dev`: Menjalankan server development.
- `npm run build`: Melakukan build aplikasi untuk produksi.
- `npm run preview`: Melihat preview hasil build lokal.

## 🔒 Struktur Project

- `/src/components`: Komponen UI yang dapat digunakan kembali.
- `/src/pages`: Halaman-halaman utama aplikasi.
- `/src/contexts`: React Context untuk state management (Auth, Toast).
- `/src/utils`: Fungsi helper dan utilitas.

---
Dikembangkan untuk mempermudah manajemen rekam medis rumah sakit.
