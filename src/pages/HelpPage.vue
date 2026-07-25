<script setup lang="ts">
import { ref, computed } from 'vue'
import { NIcon } from 'naive-ui'
import {
  GlobeOutline as NetworkIcon,
  HardwareChipOutline as RouterIcon,
  WifiOutline as OltIcon,
  LocationOutline as OdpIcon,
  MapOutline as MapIcon,
  ServerOutline as IpamIcon,
  SpeedometerOutline as BandwidthIcon,
  BuildOutline as AdminIcon,
  LogoWhatsapp as WaIcon,
  BusinessOutline as TenantIcon,
  CashOutline as BillingIcon,
  CardOutline as PaymentIcon,
  PeopleOutline as CustomerIcon,
  CubeOutline as PackageIcon,
  BulbOutline as TipIcon,
  ChevronForwardOutline as ChevIcon,
  WalletOutline as FinanceIcon,
  ReceiptOutline as InvoiceIcon,
  TrendingDownOutline as ExpenseIcon,
  BarChartOutline as ReportIcon,
  AppsOutline as ServiceIcon,
  ChatbubbleEllipsesOutline as TicketIcon,
  TicketOutline as VoucherIcon,
  NotificationsOutline as NotifIcon,
  MegaphoneOutline as MarketingIcon,
  GiftOutline as RewardIcon,
  ShareSocialOutline as ReferralIcon,
  StorefrontOutline as ResellerIcon,
} from '@vicons/ionicons5'

interface Topic {
  icon: any
  title: string
  desc: string
  steps: string[]
  tip?: string
}
interface Section {
  key: string
  label: string
  icon: any
  color: string
  intro: string
  topics: Topic[]
}

const sections: Section[] = [
  {
    key: 'jaringan',
    label: 'Jaringan',
    icon: NetworkIcon,
    color: '#f59e0b',
    intro: 'Siapkan infrastruktur jaringan: hubungkan router ke RADIUS, kelola perangkat FTTH, dan pantau trafik.',
    topics: [
      {
        icon: RouterIcon,
        title: 'Router',
        desc: 'Hubungkan router ke server RADIUS sebagai gerbang autentikasi pelanggan. Mendukung MikroTik, Cisco, Huawei, Juniper, VyOS/EdgeRouter, dan Ruijie.',
        steps: [
          'Buka Jaringan → Router → Daftarkan Router.',
          'Isi nama dan pilih jenis router (kartu pemilih bisa dicari).',
          'Buka detail router → tombol Konfigurasi → ikuti panduan yang menyesuaikan merek. Mode WireGuard hanya untuk MikroTik & VyOS/EdgeRouter; merek lain memakai IP Publik.',
          'Salin skrip ke router — termasuk blok interim accounting (wajib, agar status online pelanggan akurat).',
          'Pastikan status menjadi Online. MikroTik dipantau via heartbeat; merek lain via SNMP (skrip SNMP ada di panduan).',
        ],
        tip: 'RADIUS Secret, CoA Port, dan Heartbeat Token di-generate otomatis — tidak perlu diisi manual.',
      },
      {
        icon: OltIcon,
        title: 'OLT',
        desc: 'Daftarkan perangkat OLT FTTH Anda sebagai titik pusat jaringan fiber.',
        steps: [
          'Buka Jaringan → OLT → Tambah OLT.',
          'Isi nama, IP/SNMP, dan koordinat (latitude/longitude).',
          'Koordinat membuat OLT muncul di Peta Jaringan.',
        ],
      },
      {
        icon: OdpIcon,
        title: 'ODP',
        desc: 'Kelola titik distribusi (ODP) beserta kapasitas port-nya.',
        steps: [
          'Buka Jaringan → ODP → Tambah ODP.',
          'Pilih OLT induk, isi jumlah port dan koordinat.',
          'Saat menambah pelanggan FTTH, pilih port ODP yang tersedia.',
        ],
        tip: 'Penggunaan port ditampilkan otomatis (warna berubah saat hampir penuh).',
      },
      {
        icon: MapIcon,
        title: 'Peta Jaringan',
        desc: 'Visualisasi OLT, ODP, jalur kabel, dan modem pelanggan di peta nyata.',
        steps: [
          'Buka Jaringan → Peta Jaringan.',
          'Marker muncul otomatis dari data yang punya koordinat (OLT, ODP, pelanggan).',
          'Aktifkan/nonaktifkan layer dan klik marker untuk detail.',
        ],
        tip: 'Peta kosong? Pastikan OLT/ODP/pelanggan sudah diisi koordinat GPS-nya.',
      },
      {
        icon: IpamIcon,
        title: 'IPAM (IP Pool)',
        desc: 'Atur kumpulan IP yang dibagikan otomatis ke pelanggan oleh RADIUS.',
        steps: [
          'Buka Jaringan → IPAM → buat IP Pool (network, gateway, DNS).',
          'Tautkan pool ke router.',
          'RADIUS otomatis menetapkan IP ke pelanggan saat login.',
        ],
      },
      {
        icon: BandwidthIcon,
        title: 'Monitoring Bandwidth',
        desc: 'Pantau trafik real-time per interface dan konsumsi data pelanggan.',
        steps: [
          'Buka Jaringan → Konsumsi Data / Monitoring.',
          'Pilih router & interface untuk melihat grafik real-time.',
          'Limit kecepatan otomatis penuh di MikroTik & Huawei (VyOS perlu aktifkan shaper accel-ppp). Untuk Cisco/Ruijie buat policy-map shaping per paket, Juniper buat CoS/filter per paket — nama sama dengan nama paket (spasi → underscore).',
        ],
      },
    ],
  },
  {
    key: 'administrasi',
    label: 'Administrasi',
    icon: AdminIcon,
    color: '#ef4444',
    intro: 'Konfigurasi inti operasional ISP: notifikasi WhatsApp, profil tenant, aturan tagihan, dan pembayaran online.',
    topics: [
      {
        icon: WaIcon,
        title: 'WhatsApp',
        desc: 'Hubungkan WhatsApp untuk mengirim invoice, pengingat, dan notifikasi otomatis ke pelanggan.',
        steps: [
          'Buka Administrasi → WhatsApp → pindai QR Code dengan WhatsApp HP.',
          'Atur template pesan (invoice, pengingat, konfirmasi bayar).',
          'Gunakan variabel dinamis seperti {nama}, {jumlah}, {jatuh_tempo}, {link_bayar}.',
        ],
        tip: 'Variabel {link_bayar} mengirim tautan bayar mandiri — cocok untuk blast tagihan.',
      },
      {
        icon: TenantIcon,
        title: 'Tenant',
        desc: 'Identitas bisnis Anda: nama ISP, logo, kontak, zona waktu, dan mata uang.',
        steps: [
          'Buka Administrasi → Tenant.',
          'Lengkapi nama, logo, dan informasi kontak.',
          'Data ini tampil di portal pelanggan, invoice, dan halaman bayar.',
        ],
      },
      {
        icon: BillingIcon,
        title: 'Konfigurasi Billing',
        desc: 'Aturan penagihan: kapan invoice dibuat, jatuh tempo, dan kapan pelanggan diisolir.',
        steps: [
          'Buka Administrasi → Tenant → Konfigurasi Billing.',
          'Atur siklus tagihan, tanggal jatuh tempo, hari isolir, dan grace period.',
          'Pilih jenis billing: tanggal tetap (fixed) atau prorata.',
        ],
        tip: 'Invoice, pengingat, dan isolir berjalan otomatis lewat penjadwal harian.',
      },
      {
        icon: PaymentIcon,
        title: 'Payment Gateway',
        desc: 'Aktifkan pembayaran online (Tripay, Midtrans, Xendit) agar pelanggan bisa bayar mandiri.',
        steps: [
          'Buka Administrasi → Tenant → isi kredensial gateway (API key, secret).',
          'Aktifkan mode Produksi (bukan sandbox) agar pembayaran nyata aktif.',
          'Daftarkan URL webhook gateway sesuai petunjuk agar status lunas otomatis.',
        ],
        tip: 'Pembayaran online di portal & WhatsApp hanya aktif jika gateway dalam mode produksi.',
      },
    ],
  },
  {
    key: 'pelanggan',
    label: 'Pelanggan',
    icon: CustomerIcon,
    color: '#3b82f6',
    intro: 'Buat paket layanan, lalu daftarkan dan kelola pelanggan beserta tagihannya.',
    topics: [
      {
        icon: PackageIcon,
        title: 'Paket Internet',
        desc: 'Definisikan paket layanan: kecepatan, harga, dan opsi burst.',
        steps: [
          'Buka Pelanggan → Paket → Tambah Paket.',
          'Isi kecepatan upload/download, harga, dan burst limit (opsional).',
          'Paket dipakai saat mendaftarkan pelanggan dan tampil di portal.',
        ],
        tip: 'Kecepatan paket otomatis diterapkan ke router via RADIUS saat pelanggan online.',
      },
      {
        icon: CustomerIcon,
        title: 'Daftar Pelanggan',
        desc: 'Daftarkan dan kelola pelanggan, koneksi, lokasi, serta tagihan mereka.',
        steps: [
          'Buka Pelanggan → Daftar Pelanggan → Tambah Pelanggan.',
          'Isi data pribadi, pilih paket, dan tipe koneksi (PPPoE / FTTH / Static).',
          'Untuk FTTH, pilih port ODP dan isi koordinat modem (untuk Peta Jaringan).',
          'Kelola status: aktif, isolir, atau lihat & catat pembayaran tagihan.',
        ],
        tip: 'Username & password PPPoE dibuat otomatis. Pelanggan bisa bayar online via portal.',
      },
    ],
  },
  {
    key: 'keuangan',
    label: 'Keuangan',
    icon: FinanceIcon,
    color: '#22c55e',
    intro: 'Kelola tagihan pelanggan, catat pengeluaran operasional, dan pantau laporan keuangan.',
    topics: [
      {
        icon: InvoiceIcon,
        title: 'Tagihan / Invoice',
        desc: 'Invoice dibuat otomatis sesuai siklus billing, namun bisa juga dibuat manual.',
        steps: [
          'Buka Keuangan → Invoice untuk melihat semua tagihan.',
          'Catat pembayaran manual (tunai/transfer) atau biarkan terbayar otomatis via gateway.',
          'Status: belum bayar, lewat tempo, lunas — pelanggan menunggak otomatis diisolir sesuai aturan.',
        ],
        tip: 'Invoice & pengingat WhatsApp berjalan otomatis lewat penjadwal harian.',
      },
      {
        icon: ExpenseIcon,
        title: 'Pengeluaran',
        desc: 'Catat biaya operasional ISP agar laba bersih terlihat jelas.',
        steps: [
          'Buka Keuangan → Pengeluaran → Tambah Pengeluaran.',
          'Isi kategori, jumlah, dan keterangan (mis. sewa upstream, gaji, perangkat).',
          'Pengeluaran ikut diperhitungkan di laporan keuangan.',
        ],
      },
      {
        icon: ReportIcon,
        title: 'Laporan',
        desc: 'Ringkasan pendapatan, pembayaran, dan performa bisnis Anda.',
        steps: [
          'Buka Keuangan → Laporan.',
          'Lihat pendapatan, breakdown pembayaran, dan tren per periode.',
          'Export laporan untuk arsip atau analisis lebih lanjut.',
        ],
      },
    ],
  },
  {
    key: 'layanan',
    label: 'Layanan',
    icon: ServiceIcon,
    color: '#8b5cf6',
    intro: 'Layani pelanggan lewat tiket dukungan, jual voucher hotspot, dan kirim notifikasi.',
    topics: [
      {
        icon: TicketIcon,
        title: 'Tiket',
        desc: 'Tangani keluhan dan permintaan pelanggan secara terstruktur.',
        steps: [
          'Buka Layanan → Tiket untuk melihat tiket masuk.',
          'Tetapkan (assign) tiket ke teknisi dan balas pesan pelanggan.',
          'Tutup tiket setelah masalah selesai.',
        ],
      },
      {
        icon: VoucherIcon,
        title: 'Voucher',
        desc: 'Jual akses internet berbasis voucher (hotspot) dengan masa aktif & kuota.',
        steps: [
          'Buka Layanan → Voucher → buat produk voucher (kecepatan, durasi, harga).',
          'Generate batch voucher untuk dijual.',
          'Voucher aktif otomatis saat pertama login dan kedaluwarsa sesuai durasi.',
        ],
        tip: 'Voucher juga bisa dijual online via toko voucher publik dengan pembayaran gateway.',
      },
      {
        icon: NotifIcon,
        title: 'Notifikasi',
        desc: 'Kirim pengumuman dan pemberitahuan ke pelanggan.',
        steps: [
          'Buka Layanan → Notifikasi.',
          'Susun pesan dan pilih penerima.',
          'Notifikasi billing otomatis (jatuh tempo, isolir) berjalan sendiri.',
        ],
      },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: MarketingIcon,
    color: '#ec4899',
    intro: 'Tingkatkan pertumbuhan pelanggan lewat program reward, referral, dan jaringan reseller.',
    topics: [
      {
        icon: RewardIcon,
        title: 'Reward',
        desc: 'Beri hadiah/poin untuk mendorong loyalitas dan pembayaran tepat waktu.',
        steps: [
          'Buka Marketing → Reward → buat program reward.',
          'Tentukan syarat dan hadiahnya.',
          'Pantau klaim reward di Dashboard Reward.',
        ],
      },
      {
        icon: ReferralIcon,
        title: 'Referral',
        desc: 'Pelanggan mengajak pelanggan baru dan mendapat imbalan.',
        steps: [
          'Buka Marketing → Referral.',
          'Pelanggan membagikan kode referral mereka.',
          'Imbalan otomatis tercatat saat referral berhasil.',
        ],
      },
      {
        icon: ResellerIcon,
        title: 'Reseller',
        desc: 'Kelola mitra reseller beserta komisinya.',
        steps: [
          'Buka Marketing → Reseller → tambah reseller.',
          'Atur komisi dan pantau penjualan mereka.',
          'Bayarkan komisi yang tertunda dari menu reseller.',
        ],
      },
    ],
  },
]

const activeKey = ref('jaringan')
const active = computed(() => sections.find((s) => s.key === activeKey.value) || sections[0])
function select(key: string) {
  activeKey.value = key
  // Scroll konten ke atas saat ganti bagian (mobile)
  document.querySelector('.help-content')?.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="help-page">
    <div class="help-hero">
      <h1>Panduan Penggunaan</h1>
      <p>Langkah demi langkah mengelola layanan internet Anda — dari jaringan hingga pelanggan.</p>
    </div>

    <div class="help-layout">
      <!-- Sidebar -->
      <aside class="help-sidebar">
        <button
          v-for="(s, i) in sections"
          :key="s.key"
          class="hs-item"
          :class="{ active: activeKey === s.key }"
          :style="activeKey === s.key ? { borderColor: s.color } : {}"
          @click="select(s.key)"
        >
          <span class="hs-num" :style="{ background: activeKey === s.key ? s.color : undefined }">{{ i + 1 }}</span>
          <span class="hs-icon" :style="{ color: s.color }"><n-icon :component="s.icon" :size="20" /></span>
          <span class="hs-body">
            <span class="hs-label">{{ s.label }}</span>
            <span class="hs-count">{{ s.topics.length }} topik</span>
          </span>
          <n-icon class="hs-chev" :component="ChevIcon" :size="16" />
        </button>
      </aside>

      <!-- Content -->
      <main class="help-content">
        <div class="hc-head" :style="{ borderColor: active.color }">
          <div class="hc-head-icon" :style="{ background: active.color + '1a', color: active.color }">
            <n-icon :component="active.icon" :size="26" />
          </div>
          <div>
            <h2>{{ active.label }}</h2>
            <p>{{ active.intro }}</p>
          </div>
        </div>

        <div class="hc-topics">
          <article v-for="t in active.topics" :key="t.title" class="topic">
            <div class="topic-head">
              <span class="topic-icon" :style="{ color: active.color }"><n-icon :component="t.icon" :size="20" /></span>
              <div>
                <h3>{{ t.title }}</h3>
                <p>{{ t.desc }}</p>
              </div>
            </div>

            <ol class="topic-steps">
              <li v-for="(step, si) in t.steps" :key="si">
                <span class="ts-num" :style="{ background: active.color }">{{ si + 1 }}</span>
                <span class="ts-text">{{ step }}</span>
              </li>
            </ol>

            <div v-if="t.tip" class="topic-tip">
              <n-icon :component="TipIcon" :size="16" class="tt-icon" />
              <span>{{ t.tip }}</span>
            </div>
          </article>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.help-page {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Hero */
.help-hero h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.4px; }
.help-hero p { margin: 4px 0 0; font-size: 14px; opacity: 0.6; line-height: 1.5; }

/* Layout */
.help-layout {
  display: grid;
  grid-template-columns: 248px 1fr;
  gap: 18px;
  align-items: start;
}

/* Sidebar */
.help-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: sticky;
  top: 12px;
}

.hs-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 13px;
  border: 1.5px solid rgba(128,128,128,0.14);
  border-radius: 13px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}
.hs-item:hover { border-color: rgba(128,128,128,0.4); transform: translateY(-1px); }
.hs-item.active { background: rgba(128,128,128,0.05); }
:root.dark .hs-item.active { background: rgba(255,255,255,0.04); }

.hs-num {
  width: 24px; height: 24px; flex-shrink: 0;
  border-radius: 7px;
  background: rgba(128,128,128,0.18);
  color: #fff; font-size: 12px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.hs-icon { flex-shrink: 0; display: flex; }
.hs-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.hs-label { font-size: 14px; font-weight: 700; }
.hs-count { font-size: 11px; opacity: 0.45; }
.hs-chev { opacity: 0.3; flex-shrink: 0; }
.hs-item.active .hs-chev { opacity: 0.7; }

/* Content */
.help-content {
  min-width: 0;
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.hc-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-left: 4px solid;
  border-radius: 14px;
  background: rgba(128,128,128,0.04);
  margin-bottom: 16px;
}
:root.dark .hc-head { background: rgba(255,255,255,0.03); }
.hc-head-icon {
  width: 48px; height: 48px; border-radius: 13px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.hc-head h2 { margin: 0; font-size: 19px; font-weight: 800; }
.hc-head p { margin: 4px 0 0; font-size: 13px; opacity: 0.65; line-height: 1.5; }

.hc-topics { display: flex; flex-direction: column; gap: 14px; }

.topic {
  border: 1px solid rgba(128,128,128,0.12);
  border-radius: 14px;
  padding: 16px 18px;
}
:root.dark .topic { border-color: rgba(255,255,255,0.08); }

.topic-head { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 14px; }
.topic-icon { flex-shrink: 0; margin-top: 2px; }
.topic-head h3 { margin: 0; font-size: 16px; font-weight: 700; }
.topic-head p { margin: 3px 0 0; font-size: 13px; opacity: 0.62; line-height: 1.5; }

.topic-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.topic-steps li { display: flex; align-items: flex-start; gap: 10px; }
.ts-num {
  width: 21px; height: 21px; flex-shrink: 0; margin-top: 1px;
  border-radius: 50%; color: #fff; font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.ts-text { font-size: 13.5px; line-height: 1.5; }

.topic-tip {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 14px; padding: 10px 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.22);
  font-size: 12.5px; line-height: 1.5;
}
.tt-icon { color: #f59e0b; flex-shrink: 0; margin-top: 1px; }

/* ── Mobile ── */
@media (max-width: 860px) {
  .help-layout { grid-template-columns: 1fr; }
  .help-sidebar {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .help-sidebar::-webkit-scrollbar { display: none; }
  .hs-item { flex: 0 0 auto; min-width: 150px; }
  .hs-chev { display: none; }
  .help-content { max-height: none; overflow: visible; }
}

@media (max-width: 480px) {
  .help-hero h1 { font-size: 20px; }
  .hc-head { padding: 14px; }
  .topic { padding: 14px; }
}
</style>
