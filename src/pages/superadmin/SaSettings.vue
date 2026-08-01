<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, h } from 'vue'
import {
  NCard, NTabs, NTabPane, NForm, NFormItem, NInput, NInputGroup,
  NButton, NSwitch, NSelect, NSpace, NSpin, NTag, NDivider,
  NAlert, NIcon, NTooltip, NGrid, NGridItem, NText, NImage,
  useMessage, useDialog,
} from 'naive-ui'
import {
  LogoWhatsapp, CardOutline, TimeOutline, ColorPaletteOutline,
  CheckmarkCircleOutline, CloseCircleOutline, EyeOutline, EyeOffOutline,
  InformationCircleOutline, RefreshOutline, SaveOutline, FlashOutline,
  PhonePortraitOutline, StopCircleOutline,
  CalendarOutline, BarChartOutline, SunnyOutline, MoonOutline,
} from '@vicons/ionicons5'
import { adminApi } from '../../api'
import { useThemeStore } from '../../stores/theme'

const message = useMessage()
const dialog = useDialog()
const themeStore = useThemeStore()

const loading = ref(true)
const saving = ref(false)
const showPGKey = ref(false)
const showPGSecret = ref(false)

// ─── WhatsApp Session (QR) ───
const sessionStatus = ref<any>({})
const sessionLoading = ref(false)
const statusLoading = ref(false)
const stopSessionLoading = ref(false)
const qrData = ref('')
const qrTimeoutSeconds = ref(0)

let qrPollTimer: ReturnType<typeof setInterval> | null = null
let qrTimeoutTimer: ReturnType<typeof setTimeout> | null = null
let qrCountdownTimer: ReturnType<typeof setInterval> | null = null
let qrPollErrorCount = 0
const QR_TIMEOUT_MS = 120000

const waConnected = computed(() => sessionStatus.value?.status === 'connected')
const waConnecting = computed(() => ['connecting', 'reconnecting', 'qr'].includes(sessionStatus.value?.status))
const waQRReady = computed(() => sessionStatus.value?.status === 'qr')

function startQRPolling() {
  stopQRPolling()
  qrTimeoutSeconds.value = QR_TIMEOUT_MS / 1000
  qrCountdownTimer = setInterval(() => {
    qrTimeoutSeconds.value = Math.max(0, qrTimeoutSeconds.value - 1)
  }, 1000)
  qrTimeoutTimer = setTimeout(async () => {
    if (!waConnected.value) {
      message.warning('QR code kedaluwarsa. Silakan klik "Mulai Sesi" untuk mencoba lagi.')
      qrData.value = ''
      stopQRPolling()
      try { await adminApi.waStopSession() } catch {}
    }
  }, QR_TIMEOUT_MS)
  qrPollTimer = setInterval(async () => {
    try {
      const res = await adminApi.waGetQR()
      const d = res.data?.data || res.data || {}
      qrPollErrorCount = 0
      // Always sync status so UI reflects reconnecting/connecting transitions
      if (d.status) sessionStatus.value = d
      if (d.qr) {
        qrData.value = d.qr
      } else if (!d.qr && qrData.value) {
        qrData.value = '' // Clear stale QR if status changed away from qr
      }
      if (d.status === 'connected') {
        stopQRPolling()
        qrData.value = ''
        message.success('WhatsApp terhubung!')
      }
      if (d.status === 'disconnected' || d.status === 'not_found') {
        stopQRPolling()
        qrData.value = ''
      }
    } catch {
      qrPollErrorCount++
      // Stop polling only after 3 consecutive errors (tolerates transient failures)
      if (qrPollErrorCount >= 3) {
        stopQRPolling()
      }
    }
  }, 5000)
}

function stopQRPolling() {
  if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null }
  if (qrTimeoutTimer) { clearTimeout(qrTimeoutTimer); qrTimeoutTimer = null }
  if (qrCountdownTimer) { clearInterval(qrCountdownTimer); qrCountdownTimer = null }
  qrTimeoutSeconds.value = 0
  qrPollErrorCount = 0
}

onUnmounted(() => stopQRPolling())

async function loadWASession() {
  statusLoading.value = true
  try {
    const res = await adminApi.waGetStatus()
    sessionStatus.value = res.data?.data || res.data || {}
    const s = sessionStatus.value.status
    if (s === 'qr' || s === 'connecting' || s === 'reconnecting') {
      refreshQR()
      startQRPolling()
    }
  } catch { sessionStatus.value = {} }
  statusLoading.value = false
}

async function handleStartSession() {
  sessionLoading.value = true
  qrData.value = ''
  try {
    const startRes = await adminApi.waStartSession()
    const sd = startRes.data?.data || startRes.data || {}
    // Reflect connecting state immediately so the QR loading spinner shows right away
    sessionStatus.value = sd.status ? sd : { status: 'connecting' }
    message.success('Sesi dimulai, tunggu QR code...')
    setTimeout(async () => {
      try {
        const res = await adminApi.waGetQR()
        const d = res.data?.data || res.data || {}
        qrData.value = d.qr || ''
        if (d.status) sessionStatus.value = d
        startQRPolling()
      } catch {}
      sessionLoading.value = false
    }, 2000)
  } catch {
    message.error('Gagal memulai sesi')
    sessionLoading.value = false
  }
}

async function handleStopSession() {
  const deviceName = sessionStatus.value?.device?.phone
    ? `+${sessionStatus.value.device.phone}` : 'WhatsApp'
  dialog.warning({
    title: 'Hentikan Sesi WhatsApp',
    content: `Anda yakin ingin menghentikan sesi ${deviceName}? Perangkat akan di-logout dan perlu scan QR ulang.`,
    positiveText: 'Ya, Hentikan',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      stopQRPolling()
      stopSessionLoading.value = true
      try {
        await adminApi.waStopSession()
        message.success('Sesi WhatsApp berhasil dihentikan')
        sessionStatus.value = {}
        qrData.value = ''
      } catch { message.error('Gagal menghentikan sesi') }
      stopSessionLoading.value = false
    }
  })
}

async function refreshQR() {
  try {
    const res = await adminApi.waGetQR()
    const d = res.data?.data || res.data || {}
    qrData.value = d.qr || ''
    sessionStatus.value = d
  } catch { message.error('Gagal memuat QR') }
}

// ─── PG Status ───
const pgStatus = ref<'connected' | 'disconnected' | 'unknown'>('unknown')
const testingPG = ref(false)

// Form state
const form = reactive({
  // WhatsApp notification toggles
  wa_notify_subscribe: true,
  wa_notify_payment: true,
  wa_notify_due_date: true,
  wa_notify_otp: true,
  wa_notify_broadcast: true,
  // Midtrans
  pg_provider: 'midtrans',
  pg_merchant_id: '',
  pg_api_key: '',
  pg_secret_key: '',
  pg_sandbox: false,
  // General
  timezone: 'Asia/Jakarta',
  default_theme: 'light',
})

const pgProviderOptions = [
  { label: 'Transfer Bank BCA (Manual)', value: 'bank_transfer' },
  { label: 'Midtrans', value: 'midtrans' },
  { label: 'Tripay', value: 'tripay' },
  { label: 'Xendit', value: 'xendit' },
]

const isBankTransfer = computed(() => form.pg_provider === 'bank_transfer')

// Field per provider menyesuaikan istilah & kebutuhan masing-masing gateway.
// Mapping ini HARUS cocok dengan backend (loadSAPGConfig & TestPGConnection):
//   pg_api_key    -> Xendit Secret API Key / Tripay API Key   (Midtrans: tidak dipakai)
//   pg_secret_key -> Midtrans Server Key / Xendit Webhook Token / Tripay Private Key
//   pg_merchant_id-> Tripay Merchant Code                     (lainnya: tidak dipakai)
const pgFields = computed(() => {
  switch (form.pg_provider) {
    case 'bank_transfer':
      return {
        apiKey:    { show: false, label: '', ph: '', hint: '' },
        secretKey: { show: false, label: '', ph: '', hint: '' },
        merchant:  { show: false, label: '', ph: '', hint: '' },
      }
    case 'xendit':
      return {
        apiKey:    { show: true,  label: 'Secret API Key', ph: 'xnd_production_... / xnd_development_...', hint: 'Dashboard Xendit → Settings → API Keys (Secret Key)' },
        secretKey: { show: true,  label: 'Webhook Verification Token', ph: 'Token verifikasi callback', hint: 'Dashboard Xendit → Settings → Webhooks → Verification Token' },
        merchant:  { show: false, label: '', ph: '', hint: '' },
      }
    case 'tripay':
      return {
        apiKey:    { show: true,  label: 'API Key', ph: 'API Key Tripay', hint: 'Tripay → Merchant → API Key' },
        secretKey: { show: true,  label: 'Private Key', ph: 'Private Key Tripay', hint: 'Tripay → Merchant → Private Key' },
        merchant:  { show: true,  label: 'Merchant Code', ph: 'Contoh: T1234', hint: 'Tripay → Merchant → Kode Merchant' },
      }
    default: // midtrans
      return {
        apiKey:    { show: false, label: '', ph: '', hint: '' },
        secretKey: { show: true,  label: 'Server Key', ph: 'Mid-server-xxxxxxxx', hint: 'Midtrans Dashboard → Settings → Access Keys → Server Key' },
        merchant:  { show: false, label: '', ph: '', hint: '' },
      }
  }
})

const timezoneOptions = [
  { label: 'Asia/Jakarta (WIB, UTC+7)', value: 'Asia/Jakarta' },
  { label: 'Asia/Makassar (WITA, UTC+8)', value: 'Asia/Makassar' },
  { label: 'Asia/Jayapura (WIT, UTC+9)', value: 'Asia/Jayapura' },
  { label: 'Asia/Singapore (SGT, UTC+8)', value: 'Asia/Singapore' },
  { label: 'Asia/Kuala_Lumpur (MYT, UTC+8)', value: 'Asia/Kuala_Lumpur' },
  { label: 'UTC', value: 'UTC' },
]

async function loadSettings() {
  loading.value = true
  try {
    const { data: res } = await adminApi.getSettings()
    if (res.data) {
      const d = res.data
      form.wa_notify_subscribe = d.wa_notify_subscribe !== false
      form.wa_notify_payment = d.wa_notify_payment !== false
      form.wa_notify_due_date = d.wa_notify_due_date !== false
      form.wa_notify_otp = d.wa_notify_otp !== false
      form.wa_notify_broadcast = d.wa_notify_broadcast !== false
      form.pg_provider = d.pg_provider || 'midtrans'
      form.pg_merchant_id = d.pg_merchant_id || ''
      form.pg_api_key = d.pg_api_key || ''
      form.pg_secret_key = d.pg_secret_key || ''
      form.pg_sandbox = d.pg_sandbox || false
      form.timezone = d.timezone || 'Asia/Jakarta'
      form.default_theme = d.default_theme || 'light'
    }
  } catch {
    message.error('Gagal memuat pengaturan')
  }
  loading.value = false
}

async function saveSettings() {
  const saving_ref = ref(false)
  saving.value = true
  try {
    await adminApi.updateSettings({ ...form })
    themeStore.setMode(form.default_theme as any)
    message.success('Pengaturan berhasil disimpan')
  } catch {
    message.error('Gagal menyimpan pengaturan')
  }
  saving.value = false
}

async function testPG() {
  testingPG.value = true
  try {
    const { data } = await adminApi.testPG({
      pg_provider: form.pg_provider,
      pg_api_key: form.pg_api_key,
      pg_secret_key: form.pg_secret_key,
      pg_merchant_id: form.pg_merchant_id,
      pg_sandbox: form.pg_sandbox,
    })
    if (data.success) {
      pgStatus.value = 'connected'
      message.success(data.message || 'Payment gateway terhubung')
    } else {
      pgStatus.value = 'disconnected'
      message.error(data.error || 'Koneksi gagal')
    }
  } catch (e: any) {
    pgStatus.value = 'disconnected'
    message.error(e?.response?.data?.error || 'Koneksi payment gateway gagal')
  }
  testingPG.value = false
}

function getPGStatusTag() {
  if (pgStatus.value === 'connected') return { type: 'success' as const, text: 'Terhubung' }
  if (pgStatus.value === 'disconnected') return { type: 'error' as const, text: 'Tidak Terhubung' }
  return { type: 'default' as const, text: 'Belum Diuji' }
}

const isMobile = ref(false)
const MOBILE_BREAKPOINT = 768
function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

// ─── Webhook URLs ───
const webhooks = ref<{ event: string; url: string }[]>([])
const copyingWebhook = ref<string | null>(null)

async function loadWebhookUrls() {
  try {
    const res = await adminApi.getWebhookUrls()
    const raw = res.data?.data
    if (raw && typeof raw === 'object') {
      webhooks.value = Object.entries(raw).map(([event, url]) => ({ event, url: url as string }))
    }
  } catch { /* silently skip */ }
}

function copyWebhook(event: string) {
  const w = webhooks.value.find(x => x.event === event)
  if (!w) return
  navigator.clipboard.writeText(w.url).then(() => {
    copyingWebhook.value = event
    setTimeout(() => { copyingWebhook.value = null }, 2000)
  })
}

// Keep WA status fresh even when already connected, so the UI promptly reflects
// a dropped/reconnecting session (otherwise it shows a stale "Terhubung").
let statusPollTimer: ReturnType<typeof setInterval> | null = null
async function refreshStatusQuietly() {
  if (qrPollTimer) return // QR pairing flow already syncs status
  try {
    const res = await adminApi.waGetStatus()
    sessionStatus.value = res.data?.data || res.data || {}
  } catch { /* ignore transient errors */ }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadSettings()
  loadWASession()
  loadWebhookUrls()
  statusPollTimer = setInterval(refreshStatusQuietly, 20000)
})

onUnmounted(() => {
  stopQRPolling()
  if (statusPollTimer) { clearInterval(statusPollTimer); statusPollTimer = null }
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <n-spin :show="loading">
    <div class="sa-settings">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">Pengaturan Sistem</h2>
          <p class="page-subtitle">Konfigurasi global untuk platform superadmin</p>
        </div>
        <n-button
          type="primary"
          :loading="saving"
          @click="saveSettings"
          size="medium"
          class="save-btn"
        >
          <template #icon><n-icon :component="SaveOutline" /></template>
          Simpan Semua
        </n-button>
      </div>

      <n-tabs type="segment" animated class="settings-tabs">

        <!-- ===== TAB 1: WhatsApp ===== -->
        <n-tab-pane name="whatsapp" tab="WhatsApp">
          <template #tab>
            <n-space align="center" :size="6">
              <n-icon :component="LogoWhatsapp" color="#25D366" />
              <span v-if="!isMobile">WhatsApp</span>
            </n-space>
          </template>

          <div class="tab-content">
            <!-- Session Status Card -->
            <n-spin :show="statusLoading">
              <div class="wa-session-card" :class="{ connected: waConnected, connecting: waConnecting }">
                <div class="wa-session-left">
                  <div class="wa-session-icon">
                    <n-icon :component="LogoWhatsapp" :size="32" color="#25D366" />
                  </div>
                  <div class="wa-session-info">
                    <div class="wa-session-title">WhatsApp Gateway</div>
                    <template v-if="waConnected">
                      <n-tag type="success" size="small" round :bordered="false">● Terhubung</n-tag>
                      <div v-if="sessionStatus.device" class="wa-device-info">
                        <span>+{{ sessionStatus.device.phone }}</span>
                        <span v-if="sessionStatus.device.name"> · {{ sessionStatus.device.name }}</span>
                        <span v-if="sessionStatus.device.platform"> · {{ sessionStatus.device.platform === 'smba' ? 'WA Business' : sessionStatus.device.platform }}</span>
                      </div>
                    </template>
                    <template v-else-if="waQRReady">
                      <n-tag type="warning" size="small" round :bordered="false">⏳ Menunggu Scan QR</n-tag>
                    </template>
                    <template v-else-if="sessionStatus.status === 'reconnecting'">
                      <n-tag type="warning" size="small" round :bordered="false">🔄 Menghubungkan Ulang...</n-tag>
                    </template>
                    <template v-else-if="waConnecting">
                      <n-tag type="warning" size="small" round :bordered="false">⏳ Menghubungkan...</n-tag>
                    </template>
                    <template v-else-if="sessionStatus.status === 'inactive'">
                      <n-tag type="info" size="small" round :bordered="false">💾 Sesi Tersimpan</n-tag>
                    </template>
                    <template v-else>
                      <n-tag type="default" size="small" round :bordered="false">○ Belum Terhubung</n-tag>
                    </template>
                  </div>
                </div>
                <n-space :size="8">
                  <n-button
                    size="small"
                    type="primary"
                    :loading="sessionLoading"
                    :disabled="waConnected"
                    @click="handleStartSession"
                  >
                    <template #icon><n-icon :component="PhonePortraitOutline" /></template>
                    Mulai Sesi
                  </n-button>
                  <n-button
                    size="small"
                    type="error"
                    :loading="stopSessionLoading"
                    :disabled="!sessionStatus.status || sessionStatus.status === 'not_found' || sessionStatus.status === 'disconnected'"
                    @click="handleStopSession"
                  >
                    <template #icon><n-icon :component="StopCircleOutline" /></template>
                    Stop
                  </n-button>
                </n-space>
              </div>

              <!-- QR Code Area -->
              <div v-if="qrData || waConnecting" class="qr-area">
                <div v-if="qrData" class="qr-box">
                  <div class="qr-label">Scan QR Code dengan WhatsApp Anda</div>
                  <n-image :src="qrData" :width="220" preview-disabled class="qr-image" />
                  <div v-if="qrTimeoutSeconds > 0" class="qr-countdown">
                    Kedaluwarsa dalam <b>{{ qrTimeoutSeconds }}</b> detik
                  </div>
                  <n-button size="small" @click="refreshQR" style="margin-top: 8px">
                    <template #icon><n-icon :component="RefreshOutline" /></template>
                    Refresh QR
                  </n-button>
                </div>
                <div v-else class="qr-loading">
                  <n-spin size="medium" />
                  <div style="margin-top: 8px; font-size: 13px; opacity: 0.6">Memuat QR code...</div>
                  <div style="margin-top: 6px; font-size: 12px; opacity: 0.45; text-align: center; max-width: 280px">
                    Jika QR tidak muncul dalam 2 menit, klik <b>Stop</b> lalu <b>Mulai Sesi</b> kembali.
                  </div>
                </div>
              </div>
            </n-spin>

            <n-divider>
              <n-text depth="3" style="font-size: 12px">Notifikasi WhatsApp</n-text>
            </n-divider>

            <n-alert type="info" :bordered="false" style="margin-bottom: 16px; border-radius: 10px">
              <template #icon><n-icon :component="InformationCircleOutline" /></template>
              Aktifkan notifikasi WhatsApp yang akan dikirim otomatis oleh sistem kepada tenant.
            </n-alert>

            <div class="notify-grid">
              <div class="notify-item">
                <div class="notify-info">
                  <div class="notify-title">Notifikasi Subscribe</div>
                  <div class="notify-desc">Kirim WA saat tenant berhasil subscribe paket</div>
                </div>
                <n-switch v-model:value="form.wa_notify_subscribe" />
              </div>
              <div class="notify-item">
                <div class="notify-info">
                  <div class="notify-title">Notifikasi Pembayaran</div>
                  <div class="notify-desc">Kirim WA konfirmasi setelah pembayaran berhasil</div>
                </div>
                <n-switch v-model:value="form.wa_notify_payment" />
              </div>
              <div class="notify-item">
                <div class="notify-info">
                  <div class="notify-title">Pengingat Jatuh Tempo</div>
                  <div class="notify-desc">Kirim WA pengingat sebelum tanggal jatuh tempo</div>
                </div>
                <n-switch v-model:value="form.wa_notify_due_date" />
              </div>
              <div class="notify-item">
                <div class="notify-info">
                  <div class="notify-title">OTP Registrasi Tenant</div>
                  <div class="notify-desc">Kirim kode OTP saat tenant baru mendaftar</div>
                </div>
                <n-switch v-model:value="form.wa_notify_otp" />
              </div>
              <div class="notify-item">
                <div class="notify-info">
                  <div class="notify-title">Broadcast</div>
                  <div class="notify-desc">Izinkan pengiriman pesan broadcast massal</div>
                </div>
                <n-switch v-model:value="form.wa_notify_broadcast" />
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- ===== TAB 2: Midtrans / Payment Gateway ===== -->
        <n-tab-pane name="payment" tab="Payment Gateway">
          <template #tab>
            <n-space align="center" :size="6">
              <n-icon :component="CardOutline" />
              <span v-if="!isMobile">Payment Gateway</span>
            </n-space>
          </template>

          <div class="tab-content">
            <!-- Status Card -->
              <div v-if="!isBankTransfer" class="status-card pg-status-card">
              <div class="status-icon-wrap pg-icon">
                <n-icon :component="CardOutline" :size="28" />
              </div>
              <div class="status-info">
                <div class="status-label">Status Koneksi Payment Gateway</div>
                <n-tag
                  :type="getPGStatusTag().type"
                  size="small"
                  round
                  :bordered="false"
                >
                  {{ getPGStatusTag().text }}
                </n-tag>
              </div>
              <n-button
                size="small"
                :loading="testingPG"
                @click="testPG"
                class="test-btn"
              >
                <template #icon><n-icon :component="FlashOutline" /></template>
                Uji Koneksi
              </n-button>
            </div>

            <n-alert type="warning" :bordered="false" style="margin-bottom: 20px; border-radius: 10px">
              <template #icon><n-icon :component="InformationCircleOutline" /></template>
              Konfigurasi ini digunakan khusus untuk pembayaran <strong>subscribe tenant</strong> ke platform. Bukan untuk pembayaran pelanggan ISP.
            </n-alert>

            <n-alert v-if="isBankTransfer" type="info" :bordered="false" style="margin-bottom: 20px; border-radius: 10px">
              <template #icon><n-icon :component="InformationCircleOutline" /></template>
              Tenant membayar via transfer manual dengan kode unik 3 digit di nominal agar mudah diverifikasi. Rekening tujuan dikonfigurasi lewat environment variable <code>BANK_TRANSFER_*</code> di backend — tidak perlu API key.
            </n-alert>

            <n-form label-placement="top" class="settings-form">
              <n-grid :cols="2" :x-gap="20" responsive="screen" :item-responsive="true">
                <n-grid-item span="2 m:1">
                  <n-form-item label="Provider Payment Gateway">
                    <n-select
                      v-model:value="form.pg_provider"
                      :options="pgProviderOptions"
                      placeholder="Pilih provider"
                    />
                  </n-form-item>
                </n-grid-item>
                <n-grid-item v-if="pgFields.merchant.show" span="2 m:1">
                  <n-form-item :label="pgFields.merchant.label">
                    <n-input
                      v-model:value="form.pg_merchant_id"
                      :placeholder="pgFields.merchant.ph"
                      clearable
                    />
                    <template #feedback><span class="pg-hint">{{ pgFields.merchant.hint }}</span></template>
                  </n-form-item>
                </n-grid-item>
                <n-grid-item v-if="pgFields.apiKey.show" span="2 m:1">
                  <n-form-item :label="pgFields.apiKey.label">
                    <n-input-group>
                      <n-input
                        v-model:value="form.pg_api_key"
                        :type="showPGKey ? 'text' : 'password'"
                        :placeholder="pgFields.apiKey.ph"
                        clearable
                      />
                      <n-button @click="showPGKey = !showPGKey" style="width: 40px">
                        <n-icon :component="showPGKey ? EyeOffOutline : EyeOutline" />
                      </n-button>
                    </n-input-group>
                    <template #feedback><span class="pg-hint">{{ pgFields.apiKey.hint }}</span></template>
                  </n-form-item>
                </n-grid-item>
                <n-grid-item v-if="pgFields.secretKey.show" span="2 m:1">
                  <n-form-item :label="pgFields.secretKey.label">
                    <n-input-group>
                      <n-input
                        v-model:value="form.pg_secret_key"
                        :type="showPGSecret ? 'text' : 'password'"
                        :placeholder="pgFields.secretKey.ph"
                        clearable
                      />
                      <n-button @click="showPGSecret = !showPGSecret" style="width: 40px">
                        <n-icon :component="showPGSecret ? EyeOffOutline : EyeOutline" />
                      </n-button>
                    </n-input-group>
                    <template #feedback><span class="pg-hint">{{ pgFields.secretKey.hint }}</span></template>
                  </n-form-item>
                </n-grid-item>
                <n-grid-item v-if="!isBankTransfer" span="2">
                  <n-form-item label="Mode Sandbox">
                    <div class="sandbox-toggle">
                      <n-switch v-model:value="form.pg_sandbox">
                        <template #checked>Sandbox (Testing)</template>
                        <template #unchecked>Production (Live)</template>
                      </n-switch>
                      <n-tag
                        :type="form.pg_sandbox ? 'warning' : 'success'"
                        size="small"
                        round
                        :bordered="false"
                        style="margin-left: 12px"
                      >
                        {{ form.pg_sandbox ? '⚠️ Mode Testing' : '✅ Mode Live' }}
                      </n-tag>
                    </div>
                  </n-form-item>
                </n-grid-item>
              </n-grid>
            </n-form>

            <!-- Webhook URLs -->
            <template v-if="!isBankTransfer">
              <n-divider>
                <n-text depth="3" style="font-size: 12px">URL Webhook Subscription</n-text>
              </n-divider>
              <p style="font-size: 13px; opacity: 0.6; margin: 0 0 12px">
                Daftarkan URL berikut ke dashboard payment gateway agar notifikasi pembayaran subscribe tenant diterima otomatis.
              </p>
              <div v-if="webhooks.length === 0" style="color: rgba(128,128,128,0.6); font-size: 13px; padding: 4px 0">
                Memuat URL webhook...
              </div>
              <div v-else class="webhook-list">
                <div v-for="w in webhooks" :key="w.event" class="webhook-item">
                  <div class="webhook-meta">
                    <n-tag :bordered="false" size="small" type="error" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em">
                      {{ w.event.replace(/_/g, ' ') }}
                    </n-tag>
                  </div>
                  <div class="webhook-url-row">
                    <code class="webhook-url">{{ w.url }}</code>
                    <n-button
                      size="small"
                      :type="copyingWebhook === w.event ? 'success' : 'default'"
                      @click="copyWebhook(w.event)"
                      style="flex-shrink: 0"
                    >
                      {{ copyingWebhook === w.event ? 'Tersalin!' : 'Salin' }}
                    </n-button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </n-tab-pane>

        <!-- ===== TAB 3: Timezone ===== -->
        <n-tab-pane name="timezone" tab="Zona Waktu">
          <template #tab>
            <n-space align="center" :size="6">
              <n-icon :component="TimeOutline" />
              <span v-if="!isMobile">Penagihan</span>

            </n-space>
          </template>

          <div class="tab-content">
            <n-alert type="info" :bordered="false" style="margin-bottom: 20px; border-radius: 10px">
              <template #icon><n-icon :component="InformationCircleOutline" /></template>
              Zona waktu ini digunakan sebagai default untuk semua operasi sistem, termasuk jadwal billing, pengingat, dan laporan.
            </n-alert>

            <div class="timezone-display">
              <div class="tz-current">
                <n-icon :component="TimeOutline" :size="40" class="tz-icon" />
                <div class="tz-info">
                  <div class="tz-label">Zona Waktu Aktif</div>
                  <div class="tz-value">{{ form.timezone }}</div>
                  <div class="tz-time">
                    {{ new Date().toLocaleString('id-ID', { timeZone: form.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }}
                    <span class="tz-badge">Waktu Sekarang</span>
                  </div>
                </div>
              </div>
            </div>

            <n-form label-placement="top" class="settings-form">
              <n-form-item label="Pilih Zona Waktu">
                <n-select
                  v-model:value="form.timezone"
                  :options="timezoneOptions"
                  placeholder="Pilih zona waktu"
                  filterable
                />
              </n-form-item>
            </n-form>

            <div class="tz-info-cards">
              <div class="tz-info-card">
                <div class="tz-card-icon"><n-icon :component="CardOutline" :size="22" /></div>
                <div class="tz-card-content">
                  <div class="tz-card-title">Billing & Invoice</div>
                  <div class="tz-card-desc">Tanggal jatuh tempo dan generate invoice menggunakan zona waktu ini</div>
                </div>
              </div>
              <div class="tz-info-card">
                <div class="tz-card-icon"><n-icon :component="CalendarOutline" :size="22" /></div>
                <div class="tz-card-content">
                  <div class="tz-card-title">Jadwal Notifikasi</div>
                  <div class="tz-card-desc">Pengiriman reminder dan notifikasi otomatis disesuaikan zona waktu</div>
                </div>
              </div>
              <div class="tz-info-card">
                <div class="tz-card-icon"><n-icon :component="BarChartOutline" :size="22" /></div>
                <div class="tz-card-content">
                  <div class="tz-card-title">Laporan & Statistik</div>
                  <div class="tz-card-desc">Data laporan ditampilkan dalam zona waktu yang dipilih</div>
                </div>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- ===== TAB 4: Tema ===== -->
        <n-tab-pane name="theme" tab="Tema">
          <template #tab>
            <n-space align="center" :size="6">
              <n-icon :component="ColorPaletteOutline" />
              <span>Tema</span>
            </n-space>
          </template>

          <div class="tab-content">
            <n-alert type="info" :bordered="false" style="margin-bottom: 20px; border-radius: 10px">
              <template #icon><n-icon :component="InformationCircleOutline" /></template>
              Tema default yang akan digunakan saat pengguna pertama kali login. Pengguna dapat mengubah tema mereka sendiri di preferensi akun.
            </n-alert>

            <div class="theme-selector">
              <div
                class="theme-card"
                :class="{ active: form.default_theme === 'light' }"
                @click="form.default_theme = 'light'"
              >
                <div class="theme-preview light-preview">
                  <div class="preview-header"></div>
                  <div class="preview-sidebar"></div>
                  <div class="preview-content">
                    <div class="preview-card"></div>
                    <div class="preview-card"></div>
                  </div>
                </div>
                <div class="theme-label">
                  <n-icon :component="SunnyOutline" :size="18" class="theme-icon" />
                  <span>Light</span>
                  <n-tag v-if="form.default_theme === 'light'" type="success" size="tiny" round :bordered="false">Default</n-tag>
                </div>
              </div>

              <div
                class="theme-card"
                :class="{ active: form.default_theme === 'dark' }"
                @click="form.default_theme = 'dark'"
              >
                <div class="theme-preview dark-preview">
                  <div class="preview-header"></div>
                  <div class="preview-sidebar"></div>
                  <div class="preview-content">
                    <div class="preview-card"></div>
                    <div class="preview-card"></div>
                  </div>
                </div>
                <div class="theme-label">
                  <n-icon :component="MoonOutline" :size="18" class="theme-icon" />
                  <span>Dark</span>
                  <n-tag v-if="form.default_theme === 'dark'" type="success" size="tiny" round :bordered="false">Default</n-tag>
                </div>
              </div>
            </div>

            <div class="theme-preview-live">
              <div class="preview-live-label">Preview Tema Aktif</div>
              <div class="preview-live-badge" :class="form.default_theme">
                <n-icon :component="ColorPaletteOutline" />
                <n-icon :component="form.default_theme === 'light' ? SunnyOutline : MoonOutline" :size="16" />
              {{ form.default_theme === 'light' ? 'Light Mode — Tampilan Terang' : 'Dark Mode — Tampilan Gelap' }}
              </div>
            </div>
          </div>
        </n-tab-pane>

      </n-tabs>

      <!-- Bottom Save Bar -->
      <div class="bottom-bar">
        <n-space align="center" justify="end">
          <n-button @click="loadSettings" :disabled="saving">
            <template #icon><n-icon :component="RefreshOutline" /></template>
            Reset
          </n-button>
          <n-button type="primary" :loading="saving" @click="saveSettings">
            <template #icon><n-icon :component="SaveOutline" /></template>
            Simpan Pengaturan
          </n-button>
        </n-space>
      </div>
    </div>
  </n-spin>
</template>

<style scoped>
.pg-hint {
  font-size: 11.5px;
  opacity: 0.55;
  line-height: 1.4;
}

.sa-settings {
  max-width: 900px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  background: linear-gradient(135deg, #ff1744, #ff5252);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.page-subtitle {
  font-size: 13px;
  opacity: 0.6;
  margin: 0;
}
.save-btn { flex-shrink: 0; }

/* Tabs */
.settings-tabs :deep(.n-tabs-tab) {
  padding: 10px 20px;
  font-size: 13px;
}

/* Tab Content */
.tab-content {
  padding: 20px 0;
}

/* Status Cards */
.status-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border: 1px solid transparent;
}
.wa-status-card {
  background: rgba(37, 211, 102, 0.06);
  border-color: rgba(37, 211, 102, 0.15);
}
.pg-status-card {
  background: rgba(255, 23, 68, 0.06);
  border-color: rgba(255, 23, 68, 0.15);
}
.status-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wa-icon { background: rgba(37, 211, 102, 0.12); }
.pg-icon { background: rgba(255, 23, 68, 0.12); }
.status-info { flex: 1; }
.status-label { font-size: 13px; opacity: 0.7; margin-bottom: 4px; }
.test-btn { flex-shrink: 0; }

/* Form */
.settings-form { margin-top: 4px; }

/* Notification Grid */
.notify-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.notify-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 10px;
  transition: background 0.15s;
}
.notify-item:hover { background: rgba(255, 23, 68, 0.04); }
.notify-info { flex: 1; }
.notify-title { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
.notify-desc { font-size: 12px; opacity: 0.55; }

/* Sandbox Toggle */
.sandbox-toggle {
  display: flex;
  align-items: center;
}

/* Timezone */
.timezone-display {
  background: rgba(255, 23, 68, 0.04);
  border: 1px solid rgba(255, 23, 68, 0.1);
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 20px;
}
.tz-current {
  display: flex;
  align-items: center;
  gap: 16px;
}
.tz-icon { opacity: 0.6; }
.tz-label { font-size: 12px; opacity: 0.55; margin-bottom: 4px; }
.tz-value { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.tz-time {
  font-size: 13px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tz-badge {
  font-size: 11px;
  background: rgba(255, 23, 68, 0.1);
  color: #ff1744;
  padding: 2px 8px;
  border-radius: 20px;
}
.tz-info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 20px;
}
.tz-info-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 23, 68, 0.03);
  border: 1px solid rgba(255, 23, 68, 0.08);
}
.tz-card-icon { font-size: 22px; flex-shrink: 0; display: flex; align-items: center; opacity: 0.7; }
.tz-card-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
.tz-card-desc { font-size: 12px; opacity: 0.55; line-height: 1.4; }

/* Theme Selector */
.theme-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.theme-card {
  border: 2px solid transparent;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.theme-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.theme-card.active {
  border-color: #ff1744;
  box-shadow: 0 0 0 3px rgba(255, 23, 68, 0.15);
}
.theme-preview {
  height: 120px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.light-preview { background: #f0f4f8; }
.dark-preview { background: #120810; }
.preview-header {
  height: 20px;
  flex-shrink: 0;
}
.light-preview .preview-header { background: #fff; border-bottom: 1px solid #e2e8f0; }
.dark-preview .preview-header { background: #1a0a0e; border-bottom: 1px solid rgba(255,23,68,0.1); }
.preview-sidebar {
  width: 40px;
  position: absolute;
  height: 100px;
}
.light-preview .preview-sidebar { background: #fff5f5; }
.dark-preview .preview-sidebar { background: #200f18; }
.preview-content {
  flex: 1;
  display: flex;
  gap: 6px;
  padding: 8px;
  padding-left: 48px;
}
.preview-card {
  flex: 1;
  border-radius: 6px;
  height: 40px;
}
.light-preview .preview-card { background: #fff; }
.dark-preview .preview-card { background: rgba(255,255,255,0.05); }
.theme-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
}
.light-preview + .theme-label { background: #f8fafc; }
.dark-preview + .theme-label { background: #1a0a0e; color: #fff; }
.theme-icon { font-size: 16px; display: flex; align-items: center; }

.theme-preview-live {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 23, 68, 0.04);
  border: 1px solid rgba(255, 23, 68, 0.1);
}
.preview-live-label { font-size: 12px; opacity: 0.55; margin-bottom: 8px; }
.preview-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}
.preview-live-badge.light { background: #fff; color: #333; border: 1px solid #e2e8f0; }
.preview-live-badge.dark { background: #1a0a0e; color: #fff; border: 1px solid rgba(255,23,68,0.2); }

/* WA Session Card */
.wa-session-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid rgba(37, 211, 102, 0.15);
  background: rgba(37, 211, 102, 0.05);
  transition: all 0.2s;
}
.wa-session-card.connected {
  border-color: rgba(37, 211, 102, 0.3);
  background: rgba(37, 211, 102, 0.08);
}
.wa-session-card.connecting {
  border-color: rgba(255, 193, 7, 0.3);
  background: rgba(255, 193, 7, 0.06);
}
.wa-session-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}
.wa-session-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(37, 211, 102, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wa-session-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}
.wa-device-info {
  font-size: 12px;
  opacity: 0.65;
  margin-top: 4px;
}

/* QR Area */
.qr-area {
  margin-bottom: 20px;
}
.qr-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  border-radius: 14px;
  border: 2px dashed rgba(37, 211, 102, 0.3);
  background: rgba(37, 211, 102, 0.03);
}
.qr-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
  opacity: 0.8;
}
.qr-image {
  border-radius: 10px;
  border: 3px solid rgba(37, 211, 102, 0.2);
}
.qr-countdown {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 10px;
}
.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
}

/* Bottom Bar */
.bottom-bar {
  margin-top: 24px;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(255, 23, 68, 0.04);
  border: 1px solid rgba(255, 23, 68, 0.1);
}

/* Light mode overrides */
html:not(.dark) .notify-item:hover { background: rgba(255, 23, 68, 0.03); }
html:not(.dark) .tz-info-card { background: #fff; border-color: #fecdd3; }
html:not(.dark) .timezone-display { background: #fff5f5; border-color: #fecdd3; }
html:not(.dark) .status-card.wa-status-card { background: rgba(37, 211, 102, 0.04); }
html:not(.dark) .status-card.pg-status-card { background: rgba(255, 23, 68, 0.04); }
html:not(.dark) .bottom-bar { background: #fff5f5; border-color: #fecdd3; }
html:not(.dark) .theme-preview-live { background: #fff5f5; border-color: #fecdd3; }

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .save-btn {
    width: 100%;
  }
  .status-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px;
  }
  .test-btn {
    width: 100%;
    margin-top: 12px;
  }
  .notify-grid {
    grid-template-columns: 1fr;
  }
  .settings-tabs :deep(.n-tabs-tab) {
    padding: 10px 12px;
  }
  .wa-session-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .wa-session-card > .n-space {
    width: 100%;
    justify-content: flex-start;
  }
  .tz-current {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .tz-value {
    font-size: 16px;
  }
  .tz-time {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .tz-info-cards { grid-template-columns: 1fr; }
  .theme-selector { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; }
  .bottom-bar :deep(.n-space) {
    flex-direction: column;
    align-items: stretch;
  }
  .bottom-bar :deep(.n-button) {
    width: 100%;
  }
}

/* Webhook List */
.webhook-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.webhook-item {
  background: rgba(255, 23, 68, 0.04);
  border: 1px solid rgba(255, 23, 68, 0.1);
  border-radius: 10px;
  padding: 12px 14px;
}
.webhook-meta { margin-bottom: 8px; }
.webhook-url-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.webhook-url {
  flex: 1;
  font-size: 12px;
  word-break: break-all;
  background: rgba(128, 128, 128, 0.08);
  border-radius: 4px;
  padding: 4px 8px;
  color: inherit;
}
@media (max-width: 640px) {
  .webhook-url-row { flex-direction: column; align-items: stretch; }
  .webhook-url-row .n-button { width: 100%; }
}
</style>
