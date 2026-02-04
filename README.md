# RM Tracer - Aplikasi Pelacakan Rekam Medis Web

Aplikasi manajemen rekam medis rumah sakit berbasis web yang memanfaatkan teknologi QR Code untuk mempercepat proses pelacakan dan pengelolaan dokumen rekam medis pasien. Aplikasi ini dirancang dengan pendekatan **Offline-First**, memastikan operasional tetap berjalan lancar meski tanpa koneksi internet.

## 🚀 Fitur Utama

### 1. 📡 Offline-First System (PWA) & iOS Compatible

Aplikasi ini dapat digunakan tanpa koneksi internet (offline) dan mendukung berbagai perangkat.

- **Scan Offline**: Petugas dapat memindai QR code saat offline. Data akan disimpan dalam antrian lokal.
- **Auto-Sync**: Saat koneksi internet kembali, aplikasi otomatis menyinkronkan data pending ke server.
- **Support iOS**: Tampilan dan instruksi instalasi khusus untuk pengguna iPhone/iPad (Add to Home Screen).
- **Indikator Status**: Notifikasi visual status koneksi dan jumlah antrian data.

### 2. 📂 Manajemen Berkas & Dashboard (Baru)

- **Monitoring Berkas Real-time**: Dashboard khusus untuk melihat posisi berkas secara live.
    - **Tersedia di Rak**: Daftar berkas yang ada di penyimpanan (Rekam Medis).
    - **Sedang Dipinjam**: Daftar berkas yang sedang berada di luar (Poli/Rawat Inap), lengkap dengan info peminjam.
- **Smart Location Logic**:
    - **Otomatisasi Pengembalian**: Jika lokasi tujuan adalah "Ruangan Penyimpanan", sistem otomatis mencatat pengembalian tanpa perlu input nama petugas.
    - **Validasi Peminjaman**: Jika lokasi tujuan bukan penyimpanan, petugas wajib memilih nama "Petugas Pengambil" untuk akuntabilitas.
- **Manajemen Referensi**: Admin dapat mengelola Master Data **Lokasi Berkas** dan **Data Petugas/Kurir** secara dinamis.

### 3. 🛡️ Admin Dashboard (Refactored)

- **Manajemen Akun Terpadu**: Tambah, edit, dan **hapus** akun petugas dengan aman.
- **Deteksi Berkas Macet**: Otomatis mendeteksi berkas yang tidak bergerak > 24 jam.
- **Manajemen Pasien**: CRUD data pasien dan cetak kartu QR.

### 4. 📄 Pelaporan & Aktivitas

- **Log Audit Lengkap**: Mencatat setiap aksi perpindahan berkas, lengkap dengan:
    - Lokasi Awal & Tujuan
    - Waktu Transaksi
    - **Nama Petugas Peminjam** (jika berkas keluar)
- **Filter Canggih**: Cari riwayat berdasarkan Lokasi, Nama Petugas, No RM, atau Rentang Tanggal.
- **Export PDF**: Unduh laporan aktivitas resmi dengan kop surat rumah sakit.

### 5. 👨‍⚕️ Petugas Lapangan

- **QR Scanner Terintegrasi**: Scan cepat menggunakan kamera perangkat.
- **Antarmuka Cerdas**: Form scan otomatis menyesuaikan field input berdasarkan apakah berkas dikembalikan ke rak atau dipinjam keluar.
- **Riwayat Pribadi**: Petugas dapat melihat riwayat scan yang mereka lakukan sendiri.

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Language**: JavaScript
- **Styling**: CSS (Responsive & Modern UI)
- **Database & Auth**: Supabase (PostgreSQL)
- **PWA**: Vite PWA Plugin + Custom Sync Context
- **Reporting**: `jspdf`, `jspdf-autotable`, `chart.js`
- **Libraries**:
    - `react-router-dom` (Routing)
    - `lucide-react` (Icons)
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
    # Install dependencies laporan & grafik
    npm install jspdf jspdf-autotable chart.js react-chartjs-2
    ```

3.  **Konfigurasi Environment**
    Buat file `.env` dan isi dengan kredensial Supabase Anda:

    ```env
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key
    ```

4.  **Setup Database (Supabase)**
    Buka SQL Editor di Dashboard Supabase dan jalankan file berikut secara berurutan untuk struktur database terbaru:
    1. `supabase/schema.sql` (Schema dasar)
    2. `supabase/fix_account_deletion.sql` (Fitur hapus akun)
    3. `supabase/update_schema.sql` (Tabel Locations & Staff)
    4. `supabase/add_storage_flag.sql` (Fitur Smart Storage Logic)

5.  **Jalankan Aplikasi**
    ```bash
    npm run dev
    ```
    Akses di `http://localhost:5173`.

## 🔄 Alur Kerja Sistem

1.  **Login**: User masuk menggunakan email & password.
2.  **Monitoring**: Admin memantau menu "Monitoring Berkas" untuk melihat berkas yang keluar vs di rak.
3.  **Transaksi (Petugas Scan/Admin)**:
    - **Peminjaman**: Scan QR -> Pilih lokasi (misal: Poli Gigi) -> **Wajib** pilih "Petugas Pengambil".
    - **Pengembalian**: Scan QR -> Pilih lokasi (misal: Rak RM) -> Input petugas **Hilang** (Otomatis).
4.  **Laporan**: Admin mengunduh rekap aktivitas via menu Log Aktivitas.

## 🔐 Akun Default (Demo)

- **Admin**: `admin@rumahsakit.com` / `admin123`
- **Petugas**: `petugas@rumahsakit.com` / `petugas123`

---

Dikembangkan untuk efisiensi rekam medis. Mendukung mode Offline & PWA di Android/iOS/Windows.
