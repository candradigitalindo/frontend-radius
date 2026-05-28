# RADIUS Server Dashboard

Dashboard untuk manajemen server RADIUS yang digunakan dalam otentikasi pengguna jaringan. Aplikasi ini memberikan antarmuka web untuk mengelola pelanggan, paket internet, dan konfigurasi jaringan.

## Fitur Utama

- Manajemen pelanggan dan akun
- Pengelolaan paket internet
- Integrasi dengan perangkat jaringan (MikroTik)
- Monitoring bandwidth pelanggan
- Pembuatan faktur dan pelacakan pembayaran
- Laporan dan analisis bisnis
- Konfigurasi router MikroTik melalui RADIUS
- Dashboard analitik dan statistik

## Cara Pemakaian

Untuk dokumentasi lengkap tentang cara menggunakan aplikasi ini, silakan kunjungi menu **"Panduan Penggunaan"** yang tersedia di sidebar administrasi aplikasi.

### Setup Awal

1. Pastikan server RADIUS sudah terinstal dan berjalan
2. Siapkan database dan konfigurasi dasar jaringan
3. Gunakan akun admin untuk login ke dashboard
4. Atur informasi tenant Anda
5. Buat paket internet pertama
6. Tambahkan router MikroTik dan konfigurasikan integrasi RADIUS
7. Daftarkan pelanggan pertama Anda

### Navigasi Aplikasi

- **Dashboard**: Beranda aplikasi dengan ringkasan statistik utama
- **Pelanggan**: Daftar semua pelanggan dan informasi akun mereka
- **Paket**: Pengelolaan paket internet yang tersedia
- **Faktur**: Manajemen faktur dan pembayaran pelanggan
- **Router**: Konfigurasi dan monitoring router MikroTik
- **Bandwidth**: Monitoring penggunaan bandwidth pelanggan
- **Laporan**: Laporan dan analisis data usaha
- **Panduan Penggunaan**: Dokumentasi lengkap cara menggunakan aplikasi

## Teknologi yang Digunakan

- Vue 3 dengan Composition API
- TypeScript
- Naive UI sebagai komponen UI
- ECharts untuk visualisasi data
- Pinia untuk manajemen state
- Vue Router untuk navigasi halaman
- Axios untuk permintaan HTTP
- Vite sebagai build tool

## Konfigurasi Lingkungan

Salin file `.env.example` ke `.env` dan sesuaikan dengan konfigurasi lingkungan Anda:

```bash
VITE_API_BASE_URL=http://10.10.1.2:3000/api/v1
```

## Instalasi

1. Clone repositori ini
2. Jalankan `npm install` atau `yarn install`
3. Konfigurasi variabel lingkungan
4. Jalankan `npm run dev` untuk mode pengembangan
5. Akses aplikasi di `http://localhost:3000`

## Pembangunan

Untuk membuat versi produksi:

```bash
npm run build
```

## Perbaikan dan Peningkatan Terbaru

- Perbaikan error 401 pada permintaan API
- Implementasi environment variables untuk URL backend
- Penambahan halaman dokumentasi lengkap (Cara Pemakaian)
- Penambahan menu navigasi untuk dokumentasi
- Perbaikan sistem autentikasi dan refresh token
- Penambahan grafik dan visualisasi data
- Peningkatan keamanan dan penanganan error