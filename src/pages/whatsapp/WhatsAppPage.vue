<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard, NButton, NSpace, useMessage, NTag, NImage, NSpin,
  NModal, NAlert, NDescriptions, NDescriptionsItem,
  useDialog
} from 'naive-ui'
import { whatsappApi } from '../../api'
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

// ─── Init ───
onMounted(() => {
  loadSession()
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
</style>
