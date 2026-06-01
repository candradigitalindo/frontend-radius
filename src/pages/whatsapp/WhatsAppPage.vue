<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard, NButton, NSpace, useMessage, NTag, NImage, NSpin,
  NModal, NAlert, NDescriptions, NDescriptionsItem,
  NRadioGroup, NRadio, NText, NInput, NTabs, NTabPane,
  useDialog
} from 'naive-ui'
import { whatsappApi, settingApi, reminderApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

// ─── Koneksi (Session) ───
const sessionStatus = ref<any>({})
const statusModalVisible = ref(false)
const statusModalLoading = ref(false)
const stopSessionLoading = ref(false)
const qrData = ref('')
const sessionLoading = ref(false)
const statusLoading = ref(true)
const qrTimeoutSeconds = ref(0)

// Per-tenant polling state
let qrPollTimer: ReturnType<typeof setInterval> | null = null
let qrTimeoutTimer: ReturnType<typeof setTimeout> | null = null
let qrCountdownTimer: ReturnType<typeof setInterval> | null = null
let pollingTenantId: string | null = null
let qrPollErrorCount = 0
const QR_TIMEOUT_MS = 120000

function startQRPolling() {
  const currentTenant = authStore.tenantId
  // Prevent cross-tenant polling leak
  if (pollingTenantId && pollingTenantId !== currentTenant) {
    stopQRPolling()
  }
  stopQRPolling()
  pollingTenantId = currentTenant
  qrTimeoutSeconds.value = QR_TIMEOUT_MS / 1000

  // Countdown timer for UI feedback
  qrCountdownTimer = setInterval(() => {
    qrTimeoutSeconds.value = Math.max(0, qrTimeoutSeconds.value - 1)
  }, 1000)

  // Hard timeout: stop polling after QR_TIMEOUT_MS if not connected
  qrTimeoutTimer = setTimeout(async () => {
    if (sessionStatus.value.status !== 'connected') {
      message.warning('QR code kedaluwarsa. Silakan klik "Mulai Sesi" untuk mencoba lagi.')
      qrData.value = ''
      stopQRPolling()
      // Stop the dangling session on Baileys service too
      try { await whatsappApi.stopSession() } catch {}
    }
  }, QR_TIMEOUT_MS)

  qrPollTimer = setInterval(async () => {
    // Guard: stop if tenant changed mid-poll
    if (authStore.tenantId !== pollingTenantId) {
      stopQRPolling()
      return
    }
    try {
      const res = await whatsappApi.getQR()
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
  pollingTenantId = null
  qrTimeoutSeconds.value = 0
  qrPollErrorCount = 0
}

onUnmounted(() => { stopQRPolling() })

async function loadSession() {
  statusLoading.value = true
  try {
    const res = await whatsappApi.getStatus()
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
    const startRes = await whatsappApi.startSession()
    const sd = startRes.data?.data || startRes.data || {}
    // Reflect connecting state immediately so the QR loading spinner shows right away
    sessionStatus.value = sd.status ? sd : { status: 'connecting' }
    message.success('Sesi dimulai, tunggu QR code...')
    setTimeout(async () => {
      try {
        const res = await whatsappApi.getQR()
        const d = res.data?.data || res.data || {}
        qrData.value = d.qr || ''
        if (d.status) sessionStatus.value = d
        startQRPolling()
      } catch {}
      sessionLoading.value = false
    }, 2000)
  } catch (e: any) {
    message.error('Gagal memulai sesi')
    sessionLoading.value = false
  }
}

async function handleCheckStatus() {
  statusModalLoading.value = true
  statusModalVisible.value = true
  try {
    const res = await whatsappApi.getStatus()
    sessionStatus.value = res.data?.data || res.data || {}
  } catch {
    sessionStatus.value = {}
  }
  statusModalLoading.value = false
}

function handleStopSessionConfirm() {
  const deviceName = sessionStatus.value?.device?.phone
    ? `+${sessionStatus.value.device.phone}` : 'WhatsApp'
  dialog.warning({
    title: 'Hentikan Sesi WhatsApp',
    content: `Anda yakin ingin menghentikan sesi ${deviceName}? Perangkat akan di-logout dari server dan perlu scan QR ulang untuk menghubungkan kembali.`,
    positiveText: 'Ya, Hentikan',
    negativeText: 'Batal',
    onPositiveClick: () => doStopSession()
  })
}

async function doStopSession() {
  stopQRPolling()
  stopSessionLoading.value = true
  try {
    await whatsappApi.stopSession()
    message.success('Sesi WhatsApp berhasil dihentikan')
    sessionStatus.value = {}
    qrData.value = ''
    statusModalVisible.value = false
  } catch {
    message.error('Gagal menghentikan sesi')
  }
  stopSessionLoading.value = false
}

async function refreshQR() {
  try {
    const res = await whatsappApi.getQR()
    const d = res.data?.data || res.data || {}
    qrData.value = d.qr || ''
    sessionStatus.value = d
  } catch { message.error('Gagal memuat QR') }
}




// ─── Responsive ───
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
window.addEventListener('resize', onResize)
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)

// ─── Pengaturan Pengirim Notifikasi ───
const waSenderMode = ref('own')
const savingWA = ref(false)

async function loadWASettings() {
  try {
    const { data } = await settingApi.get('wa_notification_sender')
    waSenderMode.value = data.data?.value || 'own'
  } catch { waSenderMode.value = 'own' }
}

async function saveWASettings() {
  savingWA.value = true
  try {
    await settingApi.bulkSet({ wa_notification_sender: waSenderMode.value })
    message.success('Pengaturan notifikasi WhatsApp disimpan')
  } catch { message.error('Gagal menyimpan') }
  savingWA.value = false
}

// ─── Template Notifikasi ───
const DEFAULT_INVOICE_TPL = `{salam} {nama},

Berikut informasi tagihan internet Anda:

📋 *No. Invoice:* {nomor_invoice}
📅 *Periode:* {periode}
📦 *Paket:* {paket}
💰 *Total Tagihan:* Rp{jumlah}
⏰ *Jatuh Tempo:* {jatuh_tempo}

Mohon segera lakukan pembayaran sebelum jatuh tempo untuk menghindari pemutusan layanan.

Terima kasih. 🙏`

const DEFAULT_PAYMENT_TPL = `{salam} {nama},

Pembayaran Anda telah *berhasil* dikonfirmasi! ✅

📋 *No. Invoice:* {nomor_invoice}
📅 *Periode:* {periode}
📦 *Paket:* {paket}
💰 *Jumlah Bayar:* Rp{jumlah}
💳 *Metode Bayar:* {metode_bayar}
🕐 *Waktu Bayar:* {waktu_bayar} WIB
👤 *Kode Pelanggan:* {kode_pelanggan}

Terima kasih atas pembayaran Anda. Layanan internet Anda aktif dan dapat digunakan. 🙏

_Simpan pesan ini sebagai bukti pembayaran._`

const tplLoading = ref(false)
const tplSaving = ref<string | null>(null)

// reminder id per type (null = belum ada di DB, perlu create)
const tplIds = ref<Record<string, string | null>>({ invoice_created: null, payment_confirmation: null })
const tplValues = ref<Record<string, string>>({
  invoice_created: DEFAULT_INVOICE_TPL,
  payment_confirmation: DEFAULT_PAYMENT_TPL,
})

const TPL_VARS: Record<string, string[]> = {
  invoice_created: ['{salam}', '{nama}', '{nomor_invoice}', '{periode}', '{paket}', '{jumlah}', '{jatuh_tempo}', '{kode_pelanggan}', '{alamat}', '{payment_url}'],
  payment_confirmation: ['{salam}', '{nama}', '{nomor_invoice}', '{periode}', '{paket}', '{jumlah}', '{metode_bayar}', '{waktu_bayar}', '{kode_pelanggan}', '{alamat}'],
}

async function loadTemplates() {
  tplLoading.value = true
  try {
    const { data } = await reminderApi.list()
    const list: any[] = data.data || []
    for (const type of ['invoice_created', 'payment_confirmation']) {
      const found = list.find((r: any) => r.type === type)
      if (found) {
        tplIds.value[type] = found.id
        tplValues.value[type] = found.message_template
      }
    }
  } catch { /* keep defaults */ }
  tplLoading.value = false
}

async function saveTemplate(type: string) {
  const tpl = tplValues.value[type]
  if (!tpl?.trim()) { message.warning('Template tidak boleh kosong'); return }
  tplSaving.value = type
  try {
    const id = tplIds.value[type]
    const name = type === 'invoice_created' ? 'Tagihan Masuk' : 'Konfirmasi Pembayaran'
    if (id) {
      await reminderApi.update(id, { message_template: tpl, name, type, is_active: true, days_offset: 0, agenda: '' })
    } else {
      const { data } = await reminderApi.create({ name, type, message_template: tpl, is_active: true, days_offset: 0, agenda: '' })
      tplIds.value[type] = data?.id || data?.data?.id || null
    }
    message.success('Template disimpan')
  } catch { message.error('Gagal menyimpan template') }
  tplSaving.value = null
}

// ─── Init ───
onMounted(() => {
  loadSession()
  loadWASettings()
  loadTemplates()
})
</script>

<template>
  <n-space vertical :size="16">
    <n-card title="WhatsApp Gateway">
      <n-space vertical :size="16">
            <n-alert v-if="sessionStatus.status === 'connected'" type="success" title="Terhubung">
              <n-space vertical :size="4">
                <span>WhatsApp terhubung dan siap digunakan.</span>
                <div v-if="sessionStatus.device" style="font-size:13px;margin-top:4px">
                  <n-space :size="isMobile ? 6 : 16" :vertical="isMobile" wrap>
                    <span><b>Nomor:</b> +{{ sessionStatus.device.phone }}</span>
                    <span v-if="sessionStatus.device.name"><b>Nama:</b> {{ sessionStatus.device.name }}</span>
                    <span v-if="sessionStatus.device.platform"><b>Platform:</b> {{ sessionStatus.device.platform }}</span>
                    <span v-if="sessionStatus.device.connectedAt"><b>Terhubung sejak:</b> {{ new Date(sessionStatus.device.connectedAt).toLocaleString('id-ID') }}</span>
                  </n-space>
                </div>
              </n-space>
            </n-alert>
            <n-alert v-else-if="sessionStatus.status === 'reconnecting'" type="warning" title="Menghubungkan Ulang...">
              Koneksi terputus, sedang mencoba menghubungkan kembali secara otomatis. QR code akan muncul jika diperlukan.
            </n-alert>
            <n-alert v-else-if="sessionStatus.status === 'connecting'" type="warning" title="Menghubungkan...">
              Sedang terhubung ke WhatsApp. QR code akan muncul dalam beberapa saat.
              Jika QR tidak muncul lebih dari 2 menit, hentikan sesi lalu mulai ulang.
            </n-alert>
            <n-alert v-else-if="sessionStatus.message && sessionStatus.message.includes('tidak tersedia')" type="warning" title="WhatsApp Belum Aktif">
              Layanan WhatsApp saat ini belum aktif. Silakan hubungi administrator untuk mengaktifkan layanan WhatsApp, kemudian klik <b>Cek Status</b>.
            </n-alert>
            <n-alert v-else type="info" title="Belum Terhubung">
              Mulai sesi untuk menghubungkan WhatsApp via scan QR code.
            </n-alert>

            <n-spin :show="sessionLoading || statusLoading">
              <n-space vertical align="center" :size="12" v-if="qrData">
                <p style="font-weight:500">Scan QR code ini dengan WhatsApp Anda:</p>
                <n-image :src="qrData" :width="isMobile ? 220 : 280" preview-disabled />
                <p v-if="qrTimeoutSeconds > 0" style="color:#888;font-size:13px">
                  QR kedaluwarsa dalam <b>{{ qrTimeoutSeconds }}</b> detik
                </p>
                <n-button size="small" @click="refreshQR">Refresh QR</n-button>
              </n-space>
              <n-space v-else-if="sessionStatus.status === 'connecting' || sessionStatus.status === 'reconnecting'" vertical align="center" :size="8" style="padding: 16px 0">
                <n-spin size="medium" />
                <p style="color:#888;font-size:13px;margin:0">Memuat QR code...</p>
                <p style="color:#aaa;font-size:12px;margin:0;text-align:center">Jika tidak muncul dalam 2 menit, klik <b>Hentikan Sesi</b> lalu mulai ulang.</p>
              </n-space>
            </n-spin>

            <n-space wrap :size="8">
              <n-button type="primary" size="small" @click="handleStartSession" :loading="sessionLoading"
                :disabled="sessionStatus.status === 'connected'">
                Mulai Sesi
              </n-button>
              <n-button size="small" @click="handleCheckStatus" :loading="statusModalLoading">
                Cek Status
              </n-button>
              <n-button type="error" size="small" @click="handleStopSessionConfirm" :loading="stopSessionLoading"
                :disabled="!sessionStatus.status || sessionStatus.status === 'not_found' || sessionStatus.status === 'disconnected'">
                {{ isMobile ? 'Stop' : 'Hentikan Sesi' }}
              </n-button>
            </n-space>
      </n-space>
    </n-card>

    <!-- Pengaturan Pengirim Notifikasi -->
    <n-card title="Pengaturan Notifikasi">
      <p class="notif-desc">
        Pilih nomor WhatsApp yang digunakan untuk mengirim notifikasi otomatis ke pelanggan.
      </p>
      <n-radio-group v-model:value="waSenderMode" class="notif-radio-group">
        <n-radio value="own" class="notif-radio">
          <div class="radio-content">
            <div class="radio-title">WhatsApp Sendiri</div>
            <n-text depth="3" class="radio-desc">
              Notifikasi dikirim dari nomor WhatsApp yang terhubung di atas. Pastikan sesi aktif.
            </n-text>
          </div>
        </n-radio>
        <n-radio value="superadmin" class="notif-radio">
          <div class="radio-content">
            <div class="radio-title">WhatsApp Platform (Superadmin)</div>
            <n-text depth="3" class="radio-desc">
              Notifikasi dikirim dari nomor WhatsApp platform. Cocok jika belum memiliki nomor sendiri.
            </n-text>
          </div>
        </n-radio>
      </n-radio-group>
      <n-alert v-if="waSenderMode === 'own'" type="info" :bordered="false" class="notif-alert">
        Pastikan sesi WhatsApp di atas berstatus <strong>Terhubung</strong> agar notifikasi terkirim.
      </n-alert>
      <n-alert v-else type="warning" :bordered="false" class="notif-alert">
        Notifikasi dikirim atas nama platform. Template pesan tetap menggunakan yang Anda atur.
      </n-alert>
      <div class="notif-actions">
        <n-button type="primary" :loading="savingWA" @click="saveWASettings" class="notif-save-btn">Simpan</n-button>
      </div>
    </n-card>

    <!-- Template Notifikasi -->
    <n-card title="Template Notifikasi WhatsApp">
      <p class="notif-desc">
        Atur isi pesan WhatsApp yang dikirim otomatis ke pelanggan. Gunakan variabel yang tersedia agar pesan terisi data pelanggan secara dinamis.
      </p>
      <n-spin :show="tplLoading">
        <n-tabs type="line" animated>

          <n-tab-pane name="invoice_created" tab="Tagihan Masuk">
            <p class="tpl-hint">Dikirim saat invoice baru diterbitkan untuk pelanggan.</p>
            <n-input
              v-model:value="tplValues.invoice_created"
              type="textarea"
              :rows="isMobile ? 10 : 14"
              placeholder="Isi template pesan..."
              class="tpl-textarea"
            />
            <div class="tpl-vars">
              <span class="tpl-vars-label">Variabel:</span>
              <code v-for="v in TPL_VARS.invoice_created" :key="v" class="tpl-var">{{ v }}</code>
            </div>
            <div class="tpl-actions">
              <n-button type="primary" :loading="tplSaving === 'invoice_created'" @click="saveTemplate('invoice_created')" :class="{ 'full-w': isMobile }">
                Simpan Template
              </n-button>
            </div>
          </n-tab-pane>

          <n-tab-pane name="payment_confirmation" tab="Konfirmasi Pembayaran">
            <p class="tpl-hint">Dikirim otomatis setelah pembayaran pelanggan berhasil dikonfirmasi.</p>
            <n-input
              v-model:value="tplValues.payment_confirmation"
              type="textarea"
              :rows="isMobile ? 12 : 16"
              placeholder="Isi template pesan..."
              class="tpl-textarea"
            />
            <div class="tpl-vars">
              <span class="tpl-vars-label">Variabel:</span>
              <code v-for="v in TPL_VARS.payment_confirmation" :key="v" class="tpl-var">{{ v }}</code>
            </div>
            <div class="tpl-actions">
              <n-button type="primary" :loading="tplSaving === 'payment_confirmation'" @click="saveTemplate('payment_confirmation')" :class="{ 'full-w': isMobile }">
                Simpan Template
              </n-button>
            </div>
          </n-tab-pane>

        </n-tabs>
      </n-spin>
    </n-card>

    <!-- Status Modal -->
    <n-modal v-model:show="statusModalVisible" preset="card" title="Status WhatsApp" :style="{ maxWidth: '500px', width: '90vw' }">
      <n-spin :show="statusModalLoading">
        <n-space vertical :size="16" style="min-height:100px">
          <!-- Connected -->
          <template v-if="sessionStatus.status === 'connected'">
            <n-alert type="success" :show-icon="true">
              <template #header>
                <span style="font-size:15px;font-weight:600">Terhubung</span>
              </template>
              Sesi WhatsApp aktif dan siap digunakan.
            </n-alert>
            <n-descriptions bordered :column="1" :label-placement="isMobile ? 'top' : 'left'" size="small">
              <n-descriptions-item label="Nomor">
                +{{ sessionStatus.device?.phone || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="Nama Perangkat">
                {{ sessionStatus.device?.name || '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="Platform">
                <n-tag :type="sessionStatus.device?.platform === 'smba' ? 'success' : 'info'" size="small">
                  {{ sessionStatus.device?.platform === 'smba' ? 'WhatsApp Business' : sessionStatus.device?.platform || '-' }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="Terhubung Sejak">
                {{ sessionStatus.device?.connectedAt ? new Date(sessionStatus.device.connectedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' }) : '-' }}
              </n-descriptions-item>
              <n-descriptions-item label="Status Sesi">
                <n-tag type="success" size="small">Aktif</n-tag>
              </n-descriptions-item>
            </n-descriptions>
          </template>

          <!-- Connecting (waiting for QR to be generated) -->
          <template v-else-if="sessionStatus.status === 'connecting'">
            <n-alert type="warning" :show-icon="true">
              <template #header>
                <span style="font-size:15px;font-weight:600">Menghubungkan...</span>
              </template>
              Sedang terhubung ke server WhatsApp. QR code akan muncul dalam beberapa saat.
              Jika tidak muncul dalam 2 menit, hentikan sesi dan mulai ulang.
            </n-alert>
            <n-descriptions bordered :column="1" label-placement="left" size="small">
              <n-descriptions-item label="Status">
                <n-tag type="warning" size="small">Menghubungkan</n-tag>
              </n-descriptions-item>
            </n-descriptions>
          </template>

          <!-- QR (QR ready, waiting for scan) -->
          <template v-else-if="sessionStatus.status === 'qr'">
            <n-alert type="warning" :show-icon="true">
              <template #header>
                <span style="font-size:15px;font-weight:600">Menunggu Scan QR</span>
              </template>
              QR code siap. Silakan scan dengan WhatsApp di ponsel Anda.
            </n-alert>
            <n-descriptions bordered :column="1" label-placement="left" size="small">
              <n-descriptions-item label="Status">
                <n-tag type="warning" size="small">Menunggu Scan QR</n-tag>
              </n-descriptions-item>
            </n-descriptions>
          </template>

          <!-- Reconnecting -->
          <template v-else-if="sessionStatus.status === 'reconnecting'">
            <n-alert type="info" :show-icon="true">
              <template #header>
                <span style="font-size:15px;font-weight:600">Menghubungkan Ulang</span>
              </template>
              Sesi sedang mencoba menghubungkan kembali secara otomatis.
            </n-alert>
          </template>

          <!-- Inactive (session files exist but not started) -->
          <template v-else-if="sessionStatus.status === 'inactive'">
            <n-alert type="info" :show-icon="true">
              <template #header>
                <span style="font-size:15px;font-weight:600">Sesi Tersimpan</span>
              </template>
              Data sesi ditemukan tetapi belum aktif. Klik "Mulai Sesi" untuk menghubungkan kembali tanpa scan QR.
            </n-alert>
          </template>

          <!-- Service Unavailable -->
          <template v-else-if="sessionStatus.message && sessionStatus.message.includes('tidak tersedia')">
            <n-alert type="error" :show-icon="true">
              <template #header>
                <span style="font-size:15px;font-weight:600">Layanan Tidak Tersedia</span>
              </template>
              Layanan WhatsApp saat ini tidak aktif. Hubungi administrator untuk mengaktifkan layanan.
            </n-alert>
          </template>

          <!-- Not Found / Disconnected -->
          <template v-else>
            <n-alert type="default" :show-icon="true">
              <template #header>
                <span style="font-size:15px;font-weight:600">Tidak Terhubung</span>
              </template>
              Belum ada sesi WhatsApp. Klik "Mulai Sesi" untuk menghubungkan.
            </n-alert>
          </template>
        </n-space>
      </n-spin>
      <template #footer>
        <n-space justify="end">
          <n-button @click="statusModalVisible = false">Tutup</n-button>
          <n-button v-if="sessionStatus.status === 'connected'" type="error" @click="statusModalVisible = false; handleStopSessionConfirm()" :loading="stopSessionLoading">
            Hentikan Sesi
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </n-space>
</template>

<style scoped>
.wa-card-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 13px;
}

.wa-label {
  color: rgba(255, 255, 255, 0.5);
}

/* Pengaturan Notifikasi card */
.notif-desc {
  font-size: 13px;
  opacity: 0.55;
  margin: 0 0 16px;
}

.notif-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notif-radio {
  align-items: flex-start !important;
}

.radio-content {
  padding: 2px 0;
}

.radio-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}

.radio-desc {
  font-size: 12px;
  line-height: 1.5;
}

.notif-alert {
  margin-top: 14px;
  font-size: 13px;
}

.notif-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.notif-save-btn {
  min-width: 100px;
}

@media (max-width: 480px) {
  .notif-actions {
    justify-content: stretch;
  }

  .notif-save-btn {
    width: 100%;
  }

  .radio-title {
    font-size: 13px;
  }
}

/* Template Notifikasi */
.tpl-hint {
  font-size: 12px;
  opacity: 0.5;
  margin: 8px 0 10px;
}

.tpl-textarea {
  font-family: ui-monospace, 'Fira Code', monospace;
  font-size: 13px;
}

.tpl-vars {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.tpl-vars-label {
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
}

.tpl-var {
  font-size: 11px;
  background: rgba(128, 128, 128, 0.1);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
}

.tpl-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.full-w {
  width: 100%;
}
</style>
