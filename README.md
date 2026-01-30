# RM Tracer - Aplikasi Pelacakan Rekam Medis Web

Aplikasi manajemen rekam medis rumah sakit berbasis web yang memanfaatkan teknologi QR Code untuk mempercepat proses pelacakan dan pengelolaan dokumen rekam medis pasien. Aplikasi ini dirancang dengan pendekatan **Offline-First**, memastikan operasional tetap berjalan lancar meski tanpa koneksi internet.

## 🚀 Fitur Utama

### 1. 📡 Offline-First System (PWA)

Aplikasi ini dapat digunakan tanpa koneksi internet (offline).

- **Scan Offline**: Petugas dapat memindai QR code saat offline. Data akan disimpan dalam antrian lokal.
- **Auto-Sync**: Saat koneksi internet kembali, aplikasi otomatis menyinkronkan data pending ke server.
- **Indikator Status**: Notifikasi visual status koneksi dan jumlah antrian data.
- **Installable**: Dapat diinstal sebagai aplikasi desktop/mobile (PWA).

### 2. �️ Admin Dashboard

- **Monitoring Real-time**: Pantau lokasi berkas terkini.
- **Manajemen User**: Tambah, edit, dan **hapus** akun petugas/admin (Fitur hapus akun aman dengan audit trail).
- **Manajemen Pasien**: CRUD data pasien dan cetak kartu QR.
- **Log Aktivitas**: Riwayat lengkap setiap perubahan data dan scan.

### 3. 👨‍⚕️ Petugas Lapangan

- **QR Scanner Terintegrasi**: Scan cepat menggunakan kamera perangkat.
- **Update Lokasi**: Memperbarui status lokasi berkas (Gudang, Poliklinik, Rawat Inap, dll).
- **Riwayat Scan**: Melihat histori pemindahan berkas.

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Language**: JavaScript
- **Styling**: CSS (Responsive & Modern UI)
- **Database & Auth**: Supabase (PostgreSQL)
- **PWA**: Vite PWA Plugin + Custom Sync Context
- **Libraries**:
  - `react-router-dom` (Routing)
  - `lucide-react` (Icons)
  - `chart.js` (Visualisasi Data)
  - `qrcode.react` (Generator QR)

## 📦 Instalasi & Cara Pakai

### Prasyarat

- Node.js (v18+)
- Akun Supabase (untuk database)

### Langkah Setup

1.  **Clone Repository**

    ```bash
    git clone <repository-url>
    cd rm-tracer
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Konfigurasi Environment**
    Buat file `.env` dan isi dengan kredensial Supabase Anda:

    ```env
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key
    ```

4.  **Setup Database (Supabase)**
    Buka SQL Editor di Dashboard Supabase dan jalankan file berikut secara berurutan:
    - `supabase/schema.sql` (Struktur dasar tabel)
    - `supabase/fix_account_deletion.sql` (Patch untuk fitur hapus akun & constraint)

5.  **Jalankan Aplikasi**
    ```bash
    npm run dev
    ```
    Akses di `http://localhost:5173`.

## 🔄 Alur Kerja Sistem

1.  **Login**: User masuk menggunakan email & password.
2.  **Pindai Berkas (Petugas)**:
    - Buka menu Scan.
    - Arahkan kamera ke QR Code berkas.
    - Pilih lokasi tujuan baru (misal: "Dikirim ke Poli").
    - _Jika Offline_: Data disimpan lokal dan akan di-upload saat online.
3.  **Monitoring (Admin)**:
    - Admin melihat perubahan status secara real-time di Dashboard.
    - Admin dapat melacak riwayat posisi berkas jika ada kehilangan.

## 🔐 Akun Default (Demo)

- **Admin**: `admin@rumahsakit.com` / `admin123`
- **Petugas**: `petugas@rumahsakit.com` / `petugas123`

---

Dikembangkan untuk efisiensi rekam medis. Mendukung mode Offline & PWA.
