<script setup lang="ts">
import { ref } from 'vue'
import {
  NCard, NTabs, NTabPane, NTag, NButton, NIcon, NSpace, NText,
  useThemeVars
} from 'naive-ui'
import {
  BookOutline as GuideIcon,
  SettingsOutline as SetupIcon,
  AppsOutline as FeatIcon,
  GridOutline as DashboardIcon,
  PeopleOutline as CustomerIcon,
  CubeOutline as PackageIcon,
  ReceiptOutline as InvoiceIcon,
  HardwareChipOutline as RouterIcon,
  SpeedometerOutline as BandwidthIcon,
  ServerOutline as IpamIcon,
  ChatbubbleEllipsesOutline as TicketIcon,
  TicketOutline as VoucherIcon,
  WalletOutline as ExpenseIcon,
  BarChartOutline as ReportIcon,
  LogoWhatsapp as WaIcon,
  BusinessOutline as TenantIcon,
  PersonOutline as UserIcon,
  ShieldCheckmarkOutline as RoleIcon,
  LockClosedOutline as AuthIcon,
  ColorPaletteOutline as ThemeIcon,
  AlertCircleOutline as WarnIcon,
  ArrowForwardOutline as ArrowIcon,
  InformationCircleOutline as InfoIcon,
  MoonOutline as MoonIcon,
  LayersOutline as LayoutIcon,
  WifiOutline as OltIcon,
  LocationOutline as OdpIcon,
  GlobeOutline as NetworkIcon,
} from '@vicons/ionicons5'
import { History } from '@vicons/tabler'

const themeVars = useThemeVars()
const activeTab = ref('setup')

// ============================================================
// SCREENSHOT MOCKUP DATA
// ============================================================
const screenshots = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: DashboardIcon,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    desc: 'Halaman utama dengan statistik real-time, grafik revenue, dan monitoring performa bisnis.',
    stats: [
      { label: 'Pelanggan', value: '1,247', color: '#6366f1' },
      { label: 'Aktif', value: '1,182', color: '#22c55e' },
      { label: 'Revenue', value: 'Rp 287jt', color: '#10b981' },
      { label: 'Tiket', value: '12', color: '#f59e0b' },
    ],
  },
  {
    id: 'customers',
    title: 'Daftar Pelanggan',
    icon: CustomerIcon,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
    desc: 'Tabel data pelanggan dengan filter, pencarian, dan status. Lengkap dengan aksi cepat.',
  },
  {
    id: 'network',
    title: 'Monitoring Bandwidth',
    icon: BandwidthIcon,
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
    desc: 'Pantau trafik router secara real-time dengan grafik Upload/Download yang intuitif.',
  },
]

// ============================================================
// SETUP STEPS
// ============================================================
const setupSteps = [
  {
    step: 1,
    icon: AuthIcon,
    title: 'Registrasi & Login Akun',
    desc: 'Buka halaman login dan masukkan kredensial Anda. Jika Anda adalah pemilik baru, Anda akan mendapatkan akses dari Administrator pusat.',
    details: [
      'Gunakan browser Chrome atau Edge terbaru',
      'Pastikan token akses tersimpan dengan aman',
    ],
  },
  {
    step: 2,
    icon: RouterIcon,
    title: 'Integrasi Router MikroTik',
    desc: 'Masuk ke menu Router, tambahkan router baru, dan ikuti panduan konfigurasi script untuk WireGuard dan RADIUS.',
    details: [
      'Salin script konfigurasi ke terminal MikroTik',
      'Daftarkan Public Key WireGuard router ke dashboard',
    ],
  },
  {
    step: 3,
    icon: PackageIcon,
    title: 'Setup Paket & Pelanggan',
    desc: 'Buat paket internet dengan limitasi bandwidth, lalu mulai daftarkan pelanggan Anda untuk mulai manajemen billing.',
    details: [
      'Atur harga dan kecepatan (Upload/Download)',
      'Sinkronisasi profil ke router otomatis',
    ],
  },
]

// ============================================================
// PAGE GROUPS
// ============================================================
const pageGroups = [
  {
    group: 'Operasional',
    icon: LayoutIcon,
    color: '#3b82f6',
    pages: [
      { name: 'Dashboard', route: '/dashboard', icon: DashboardIcon, badge: 'Main', badgeColor: '#6366f1',
        desc: 'Ringkasan performa bisnis, status router, dan notifikasi sistem terbaru.' },
      { name: 'Daftar Pelanggan', route: '/customers', icon: CustomerIcon, badge: 'CRM', badgeColor: '#3b82f6',
        desc: 'Manajemen data pelanggan, paket, isolir otomatis, dan riwayat sesi.' },
      { name: 'Invoice', route: '/invoices', icon: InvoiceIcon, badge: 'Billing', badgeColor: '#10b981',
        desc: 'Manajemen tagihan, status pembayaran, dan pengiriman invoice PDF.' },
    ],
  },
  {
    group: 'Infrastruktur',
    icon: NetworkIcon,
    color: '#f97316',
    pages: [
      { name: 'Router', route: '/routers', icon: RouterIcon, badge: 'Network', badgeColor: '#f97316',
        desc: 'Monitoring router, grafik bandwidth real-time, dan manajemen VPN WireGuard.' },
      { name: 'OLT & ODP', route: '/olts', icon: OltIcon, badge: 'Fiber', badgeColor: '#0ea5e9',
        desc: 'Manajemen perangkat fiber optik, status port, dan pemetaan jaringan.' },
      { name: 'IPAM', route: '/ip-pools', icon: IpamIcon, badge: 'IP', badgeColor: '#8b5cf6',
        desc: 'Kelola alokasi IP address, subnetting, dan pool untuk pelanggan.' },
    ],
  },
]

// ============================================================
// QUICK TIPS
// ============================================================
const quickTips = [
  { icon: MoonIcon, color: '#f59e0b', tip: 'Gunakan Dark Mode untuk kenyamanan mata saat bekerja di malam hari.' },
  { icon: WaIcon, color: '#22c55e', tip: 'Aktifkan integrasi WhatsApp untuk pengiriman tagihan otomatis.' },
  { icon: History, color: '#6366f1', tip: 'Cek riwayat koneksi VPN untuk mendiagnosa router yang sering terputus.' },
  { icon: InfoIcon, color: '#3b82f6', tip: 'Gunakan fitur Monitoring Speed untuk mendeteksi pelanggan yang saturasi.' },
]
</script>

<template>
  <div class="help-page">
    <!-- ===== HERO HEADER ===== -->
    <div class="hero-header">
      <div class="hero-bg-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
      <div class="hero-content">
        <div class="hero-main">
          <div class="hero-badge">
            <n-icon :size="14" style="margin-right: 6px"><InfoIcon /></n-icon>
            Pusat Bantuan v2.0
          </div>
          <h1>Apa yang bisa kami bantu?</h1>
          <p>Pelajari cara memaksimalkan penggunaan platform Radius Server untuk bisnis ISP Anda.</p>
        </div>
        <div class="hero-stats">
          <div v-for="s in [
            { label: 'Halaman', value: '30+' },
            { label: 'Fitur', value: '50+' },
            { label: 'Keamanan', value: 'SSL' }
          ]" :key="s.label" class="h-stat-item">
            <div class="h-stat-val">{{ s.value }}</div>
            <div class="h-stat-lab">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== NAVIGATION TABS ===== -->
    <n-tabs v-model:value="activeTab" type="segment" animated class="nav-tabs">
      <!-- SETUP TAB -->
      <n-tab-pane name="setup" tab="🚀 Memulai">
        <div class="tab-content">
          <div class="content-header">
            <h2>Panduan Setup Cepat</h2>
            <p>Ikuti langkah berikut untuk mengaktifkan sistem Anda dalam waktu kurang dari 10 menit.</p>
          </div>
          <div class="setup-grid">
            <div v-for="(step, idx) in setupSteps" :key="idx" class="setup-item">
              <div class="step-line" v-if="idx < setupSteps.length - 1"></div>
              <div class="step-icon-wrap">
                <n-icon :size="24"><component :is="step.icon" /></n-icon>
                <div class="step-num">{{ step.step }}</div>
              </div>
              <div class="step-content">
                <h3>{{ step.title }}</h3>
                <p>{{ step.desc }}</p>
                <div class="step-details">
                  <div v-for="d in step.details" :key="d" class="step-detail-chip">{{ d }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- VISUAL TAB -->
      <n-tab-pane name="visual" tab="📸 Antarmuka">
        <div class="tab-content">
          <div class="content-header">
            <h2>Pratinjau Visual</h2>
            <p>Kenali antarmuka aplikasi melalui pratinjau halaman-halaman utama.</p>
          </div>
          <div class="screenshot-list">
            <div v-for="ss in screenshots" :key="ss.id" class="ss-card">
              <div class="ss-browser" :style="{ background: ss.gradient }">
                <div class="ss-bar">
                  <div class="ss-dots"><span></span><span></span><span></span></div>
                  <div class="ss-address">radius-dashboard/{{ ss.id }}</div>
                </div>
                <div class="ss-mock">
                  <div class="ss-side"></div>
                  <div class="ss-body">
                    <div class="ss-top"></div>
                    <div class="ss-grid">
                      <div v-for="i in 4" :key="i" class="ss-box"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="ss-info">
                <div class="ss-title">
                  <n-icon :size="20" :color="ss.color"><component :is="ss.icon" /></n-icon>
                  <span>{{ ss.title }}</span>
                </div>
                <p>{{ ss.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- FEATURES TAB -->
      <n-tab-pane name="features" tab="📋 Fitur">
        <div class="tab-content">
          <div v-for="group in pageGroups" :key="group.group" class="feat-group">
            <div class="feat-group-header">
              <n-icon :size="24" :color="group.color"><component :is="group.icon" /></n-icon>
              <h3>{{ group.group }}</h3>
            </div>
            <div class="feat-grid">
              <div v-for="pg in group.pages" :key="pg.name" class="feat-card" :style="{ '--accent': pg.badgeColor }">
                <div class="feat-card-icon" :style="{ background: pg.badgeColor + '15', color: pg.badgeColor }">
                  <n-icon :size="20"><component :is="pg.icon" /></n-icon>
                </div>
                <div class="feat-card-body">
                  <div class="feat-card-head">
                    <h4>{{ pg.name }}</h4>
                    <n-tag size="tiny" :bordered="false" round :color="{ color: pg.badgeColor, textColor: 'white' }">{{ pg.badge }}</n-tag>
                  </div>
                  <p>{{ pg.desc }}</p>
                  <code>{{ pg.route }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- TIPS TAB -->
      <n-tab-pane name="tips" tab="💡 Tips">
        <div class="tab-content">
          <div class="content-header">
            <h2>Tips & Trik</h2>
            <p>Beberapa fitur tersembunyi untuk meningkatkan produktivitas Anda.</p>
          </div>
          <div class="tips-container">
            <div v-for="tip in quickTips" :key="tip.tip" class="tip-box">
              <div class="tip-icon" :style="{ background: tip.color + '15', color: tip.color }">
                <n-icon :size="22"><component :is="tip.icon" /></n-icon>
              </div>
              <p>{{ tip.tip }}</p>
            </div>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <!-- FOOTER -->
    <div class="help-footer">
      <p>© 2026 Radius Server Management System. Butuh bantuan lebih lanjut?</p>
      <n-button type="primary" secondary round>
        <template #icon><n-icon><WaIcon /></n-icon></template>
        Hubungi Support
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.help-page {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* HERO */
.hero-header {
  position: relative;
  background: linear-gradient(135deg, #1e1e2f 0%, #11111d 100%);
  border-radius: 24px;
  padding: 48px 40px;
  margin-bottom: 32px;
  overflow: hidden;
  color: white;
}

.hero-bg-shapes .shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.15;
}
.shape-1 { width: 300px; height: 300px; background: #6366f1; top: -100px; right: -50px; }
.shape-2 { width: 200px; height: 200px; background: #22c55e; bottom: -50px; left: -50px; }
.shape-3 { width: 150px; height: 150px; background: #f59e0b; top: 20%; left: 30%; }

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
}

.hero-main h1 { font-size: 32px; font-weight: 800; margin: 12px 0 8px; letter-spacing: -0.5px; }
.hero-main p { opacity: 0.6; font-size: 16px; margin: 0; max-width: 480px; }

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #818cf8;
}

.hero-stats {
  display: flex;
  gap: 24px;
}

.h-stat-item { text-align: right; }
.h-stat-val { font-size: 24px; font-weight: 800; color: white; }
.h-stat-lab { font-size: 11px; text-transform: uppercase; opacity: 0.4; letter-spacing: 1px; }

/* TABS */
.nav-tabs {
  margin-top: 16px;
}

.tab-content {
  padding: 24px 0;
}

.content-header { margin-bottom: 32px; }
.content-header h2 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.content-header p { opacity: 0.5; font-size: 14px; }

/* SETUP */
.setup-grid {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.setup-item {
  display: flex;
  gap: 24px;
  position: relative;
}

.step-line {
  position: absolute;
  left: 28px;
  top: 60px;
  bottom: -40px;
  width: 2px;
  background: rgba(128, 128, 128, 0.1);
}

.step-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.step-num {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--n-color);
}

.step-content h3 { margin: 0 0 8px; font-size: 18px; font-weight: 700; }
.step-content p { margin: 0 0 16px; opacity: 0.6; line-height: 1.6; font-size: 14px; }

.step-details { display: flex; gap: 8px; flex-wrap: wrap; }
.step-detail-chip {
  padding: 4px 12px;
  background: rgba(128, 128, 128, 0.05);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(128, 128, 128, 0.1);
}

/* SCREENSHOTS */
.screenshot-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.ss-card {
  border-radius: 20px;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.02);
  border: 1px solid rgba(128, 128, 128, 0.08);
  transition: all 0.3s ease;
}

.ss-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }

.ss-browser { height: 180px; padding: 0; position: relative; overflow: hidden; }
.ss-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(0,0,0,0.15); }
.ss-dots { display: flex; gap: 6px; }
.ss-dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.ss-address { flex: 1; text-align: center; font-size: 10px; color: rgba(255,255,255,0.4); font-family: monospace; }

.ss-mock { display: flex; height: 140px; }
.ss-side { width: 40px; background: rgba(0,0,0,0.1); }
.ss-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.ss-top { height: 16px; width: 60%; background: rgba(255,255,255,0.05); border-radius: 4px; }
.ss-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ss-box { height: 32px; background: rgba(255,255,255,0.05); border-radius: 6px; }

.ss-info { padding: 16px 20px; }
.ss-title { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-weight: 700; }
.ss-info p { margin: 0; font-size: 13px; opacity: 0.6; line-height: 1.5; }

/* FEATURES */
.feat-group { margin-bottom: 40px; }
.feat-group-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.feat-group-header h3 { margin: 0; font-size: 18px; font-weight: 700; opacity: 0.8; }

.feat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.feat-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.02);
  border: 1px solid rgba(128, 128, 128, 0.06);
  transition: all 0.2s;
}

.feat-card:hover { background: rgba(128, 128, 128, 0.05); border-color: var(--accent); }
.feat-card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.feat-card-body { flex: 1; min-width: 0; }
.feat-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.feat-card-head h4 { margin: 0; font-size: 14px; font-weight: 700; }
.feat-card-body p { margin: 0 0 8px; font-size: 12px; opacity: 0.6; line-height: 1.4; }
.feat-card-body code { font-size: 10px; opacity: 0.3; }

/* TIPS */
.tips-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.tip-box { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 16px; background: rgba(128, 128, 128, 0.02); border: 1px solid rgba(128, 128, 128, 0.06); }
.tip-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tip-box p { margin: 0; font-size: 14px; font-weight: 500; opacity: 0.8; }

/* FOOTER */
.help-footer { margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(128,128,128,0.1); text-align: center; }
.help-footer p { opacity: 0.4; font-size: 13px; margin-bottom: 16px; }

@media (max-width: 768px) {
  .hero-content { flex-direction: column; align-items: flex-start; }
  .hero-stats { width: 100%; justify-content: space-between; }
  .screenshot-list, .feat-grid, .tips-container { grid-template-columns: 1fr; }
}
</style>
