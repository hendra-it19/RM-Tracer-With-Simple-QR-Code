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

## � Progressive Web App (PWA)

Aplikasi ini telah mendukung teknologi PWA, yang memungkinkannya berfungsi layaknya aplikasi native.

### Fitur PWA
- **Installable**: Dapat diinstal ke Home Screen (Android/iOS/Desktop).
- **Offline Capable**: Dapat diakses (cache-first) meskipun koneksi internet terputus (untuk halaman yang pernah dibuka).
- **Custom Install Prompt**: Notifikasi instalasi khusus yang muncul di bagian bawah layar jika aplikasi belum terinstal (untuk browser yang mendukung `beforeinstallprompt`).
- **App-like Experience**: Berjalan dalam mode `standalone` tanpa bar browser yang mengganggu.

### Konfigurasi Teknis
- **Plugin**: Menggunakan `vite-plugin-pwa` untuk manajemen Service Worker dan Manifest.
- **Update Strategy**: `autoUpdate` - Aplikasi akan otomatis memperbarui Service Worker saat ada versi baru.
- **Manifest**: Dikonfigurasi dengan nama, ikon, dan warna tema yang sesuai dengan branding Rumah Sakit.

## �📦 Cara Memulai (Installation)

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

## 🚀 Panduan Deployment (cPanel)

Jika Anda ingin mengupload aplikasi ini ke cPanel, ikuti langkah berikut:

1. **Build Project**
   Jalankan perintah berikut di terminal:
   ```bash
   npm run build
   ```
   Ini akan menghasilkan folder `dist` yang berisi file siap produksi.

2. **Persiapan File**
   - Pastikan di dalam folder `dist` sudah ada file `.htaccess`. File ini otomatis tercopy dari folder `public` jika sudah dibuat.
   - File `.htaccess` penting agar saat halaman direfresh tidak 404 (Not Found).

3. **Upload ke cPanel**
   - Buka File Manager di cPanel.
   - Masuk ke folder `public_html` atau subdomain tujuan.
   - **Upload semua isi folder `dist`** (bukan folder dist-nya, tapi isinya: `assets`, `index.html`, `.htaccess`, dll).

4. **Konfigurasi**
   - Pastikan file `.env` tidak ikut diupload jika berisi data sensitif, ATAU sesuaikan environment variable di hosting jika diperlukan (biasanya aplikasi React/Vite membaca env saat build, jadi pastikan `.env` sudah benar SAAT proses build di lokal).

---
Dikembangkan untuk mempermudah manajemen rekam medis rumah sakit.
