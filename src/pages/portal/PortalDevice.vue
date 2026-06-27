<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NIcon, NSpin, NModal, NInput, useMessage } from 'naive-ui'
import {
  WifiOutline as WifiIcon,
  RefreshOutline as RefreshIcon,
  HardwareChipOutline as ChipIcon,
  PhonePortraitOutline as DeviceIcon,
  LaptopOutline as LaptopIcon,
  DesktopOutline as DesktopIcon,
  RadioButtonOnOutline as OnlineIcon,
  EllipseOutline as OfflineIcon,
  PulseOutline as SignalIcon,
  ReloadOutline as RebootIcon,
  PencilOutline as EditIcon,
  AlertCircleOutline as AlertIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'
import { useThemeStore } from '../../stores/theme'

const message = useMessage()
const themeStore = useThemeStore()
const loading = ref(true)
const refreshing = ref(false)
const ont = ref<any>(null)
const status = ref<any>(null)

const showWifiModal = ref(false)
const savingWifi = ref(false)
const wifiForm = ref({ ssid: '', password: '' })

const rebooting = ref(false)
const showRebootConfirm = ref(false)

async function fetchDevice(silent = false) {
  if (!silent) loading.value = true
  else refreshing.value = true
  try {
    const { data: res } = await portalApi.device()
    ont.value = res.data || null
    status.value = res.status || null
  } catch { /* no device */ }
  loading.value = false
  refreshing.value = false
}

function openWifiModal() {
  wifiForm.value = {
    ssid: status.value?.wifi_ssid || ont.value?.last_known_wifi_ssid || '',
    password: '',
  }
  showWifiModal.value = true
}

async function saveWifi() {
  if (!wifiForm.value.ssid) { message.warning('Nama WiFi wajib diisi'); return }
  if (wifiForm.value.password && wifiForm.value.password.length < 8) {
    message.warning('Password WiFi minimal 8 karakter'); return
  }
  savingWifi.value = true
  try {
    await portalApi.setDeviceWifi({ ssid: wifiForm.value.ssid, password: wifiForm.value.password })
    message.success('Pengaturan WiFi berhasil diperbarui')
    showWifiModal.value = false
    await fetchDevice(true)
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Gagal mengubah WiFi')
  }
  savingWifi.value = false
}

async function reboot() {
  rebooting.value = true
  showRebootConfirm.value = false
  try {
    await portalApi.rebootDevice()
    message.success('Perangkat sedang direstart. Koneksi akan kembali dalam 1-2 menit.')
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Gagal merestart perangkat')
  }
  rebooting.value = false
}

const isOnline = computed(() => status.value?.data_realtime === true)

const signalLevel = computed(() => {
  const rx = status.value?.rx_power
  if (rx == null) return null
  if (rx > -20) return { label: 'Sangat Baik', color: '#22c55e', pct: 100, bars: 5 }
  if (rx > -25) return { label: 'Baik', color: '#22c55e', pct: 80, bars: 4 }
  if (rx > -27) return { label: 'Cukup', color: '#f59e0b', pct: 60, bars: 3 }
  if (rx > -30) return { label: 'Lemah', color: '#f59e0b', pct: 40, bars: 2 }
  return { label: 'Kritis', color: '#ef4444', pct: 20, bars: 1 }
})

const connectedHosts = computed(() => status.value?.connected_hosts || [])
const wifiHosts = computed(() => connectedHosts.value.filter((h: any) => h.interface_type === '802.11'))

function hostIcon(h: any) {
  const name = (h.hostname || '').toLowerCase()
  if (name.includes('phone') || name.includes('android') || name.includes('iphone')) return DeviceIcon
  if (name.includes('laptop') || name.includes('mac')) return LaptopIcon
  return DesktopIcon
}

onMounted(() => fetchDevice())
</script>

<template>
  <n-spin :show="loading">
    <div class="device-page">

      <!-- No device state -->
      <div v-if="!loading && !ont" class="no-device">
        <div class="no-device-icon">
          <n-icon :component="AlertIcon" :size="32" color="#f59e0b" />
        </div>
        <div class="no-device-title">Perangkat Tidak Ditemukan</div>
        <div class="no-device-sub">Tidak ada perangkat ONT/router yang terdaftar untuk akun Anda. Hubungi admin jika Anda merasa ini keliru.</div>
      </div>

      <template v-else-if="ont">

        <!-- Device Header -->
        <div class="device-header">
          <div class="device-header-left">
            <div class="device-status-dot" :class="isOnline ? 'online' : 'offline'"></div>
            <div>
              <div class="device-title">{{ ont.vendor || 'ONT' }} {{ ont.model || '' }}</div>
              <div class="device-serial">SN: {{ ont.serial_number }}</div>
            </div>
          </div>
          <div class="device-header-right">
            <span class="online-badge" :class="isOnline ? 'badge-online' : 'badge-offline'">
              <n-icon :component="isOnline ? OnlineIcon : OfflineIcon" :size="12" />
              {{ isOnline ? 'Online' : 'Offline' }}
            </span>
            <button class="refresh-btn" :class="{ spinning: refreshing }" @click="fetchDevice(true)">
              <n-icon :component="RefreshIcon" :size="18" />
            </button>
          </div>
        </div>

        <!-- Info cards -->
        <div class="info-row">
          <!-- Signal -->
          <div class="info-card signal-card">
            <div class="info-card-header">
              <n-icon :component="SignalIcon" :size="16" :color="signalLevel?.color || '#888'" />
              <span>Sinyal Optik</span>
            </div>
            <div v-if="signalLevel">
              <div class="signal-label" :style="{ color: signalLevel.color }">{{ signalLevel.label }}</div>
              <div class="signal-value">{{ status?.rx_power?.toFixed(1) }} dBm</div>
              <div class="signal-bars">
                <div
                  v-for="b in 5" :key="b"
                  class="signal-bar"
                  :style="{
                    height: (8 + b * 6) + 'px',
                    background: b <= signalLevel.bars ? signalLevel.color : (themeStore.isDark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)')
                  }"
                />
              </div>
            </div>
            <div v-else class="no-data">Data tidak tersedia</div>
          </div>

          <!-- WiFi -->
          <div class="info-card wifi-card">
            <div class="info-card-header">
              <n-icon :component="WifiIcon" :size="16" color="#6366f1" />
              <span>WiFi</span>
              <button class="edit-btn" @click="openWifiModal">
                <n-icon :component="EditIcon" :size="14" />
                Ubah
              </button>
            </div>
            <div class="wifi-ssid">{{ status?.wifi_ssid || ont.last_known_wifi_ssid || 'Tidak diketahui' }}</div>
            <div class="wifi-meta">
              <span>{{ status?.wifi_security || ont.last_known_wifi_security || 'WPA2' }}</span>
              <span class="wifi-sep">·</span>
              <span>{{ wifiHosts.length }} perangkat WiFi</span>
            </div>
          </div>

          <!-- Connection info -->
          <div class="info-card conn-card">
            <div class="info-card-header">
              <n-icon :component="ChipIcon" :size="16" color="#0ea5e9" />
              <span>Info Koneksi</span>
            </div>
            <div v-if="status?.wan_ip" class="conn-row">
              <span class="conn-label">IP WAN</span>
              <code class="conn-val">{{ status.wan_ip }}</code>
            </div>
            <div v-if="status?.software_version" class="conn-row">
              <span class="conn-label">Firmware</span>
              <span class="conn-val">{{ status.software_version }}</span>
            </div>
            <div v-if="ont.vendor" class="conn-row">
              <span class="conn-label">Vendor</span>
              <span class="conn-val">{{ ont.vendor }}</span>
            </div>
            <div v-if="!status?.wan_ip && !status?.software_version && !ont.vendor" class="no-data">
              Data tidak tersedia
            </div>
          </div>
        </div>

        <!-- Connected devices -->
        <div v-if="connectedHosts.length > 0" class="connected-section">
          <div class="conn-section-header">
            <span class="section-title">Perangkat Terhubung</span>
            <span class="conn-count">{{ connectedHosts.length }} perangkat</span>
          </div>
          <div class="connected-list">
            <div
              v-for="host in connectedHosts"
              :key="host.mac_address || host.ip_address"
              class="host-item"
            >
              <div class="host-icon" :class="host.interface_type === '802.11' ? 'wifi-host' : 'wired-host'">
                <n-icon :component="hostIcon(host)" :size="18" />
              </div>
              <div class="host-info">
                <div class="host-name">{{ host.hostname || 'Perangkat' }}</div>
                <div class="host-ip">{{ host.ip_address }}</div>
              </div>
              <div class="host-tag" :class="host.interface_type === '802.11' ? 'tag-wifi' : 'tag-wired'">
                {{ host.interface_type === '802.11' ? 'WiFi' : 'Kabel' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions-row">
          <button class="action-btn wifi-action" @click="openWifiModal">
            <n-icon :component="WifiIcon" :size="18" />
            Ubah Pengaturan WiFi
          </button>
          <button class="action-btn reboot-action" :disabled="rebooting" @click="showRebootConfirm = true">
            <n-icon :component="RebootIcon" :size="18" />
            {{ rebooting ? 'Merestart...' : 'Restart Perangkat' }}
          </button>
        </div>

      </template>
    </div>
  </n-spin>

  <!-- WiFi Modal -->
  <n-modal
    v-model:show="showWifiModal"
    preset="card"
    title="Ubah Pengaturan WiFi"
    :style="{ maxWidth: '420px', width: '95vw' }"
  >
    <div class="wifi-modal">
      <div class="wifi-modal-note">
        Perubahan akan langsung diterapkan ke perangkat. Semua perangkat yang terhubung perlu memasukkan password baru jika Anda mengubahnya.
      </div>
      <div class="field">
        <div class="field-label">Nama WiFi (SSID)</div>
        <n-input v-model:value="wifiForm.ssid" placeholder="Nama jaringan WiFi" maxlength="32" show-count />
      </div>
      <div class="field">
        <div class="field-label">Password WiFi</div>
        <n-input
          v-model:value="wifiForm.password"
          type="password"
          show-password-on="click"
          placeholder="Min. 8 karakter (kosong = tidak diubah)"
          maxlength="63"
        />
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="showWifiModal = false">Batal</button>
        <button class="btn-save" :disabled="savingWifi" @click="saveWifi">
          {{ savingWifi ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </div>
    </div>
  </n-modal>

  <!-- Reboot Confirm -->
  <n-modal
    v-model:show="showRebootConfirm"
    preset="card"
    title="Restart Perangkat"
    :style="{ maxWidth: '380px', width: '95vw' }"
  >
    <div class="confirm-body">
      <div class="confirm-text">
        Perangkat akan direstart. Koneksi internet akan terputus selama 1-2 menit. Lanjutkan?
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="showRebootConfirm = false">Batal</button>
        <button class="btn-danger" @click="reboot">Ya, Restart</button>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.device-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto;
}

/* No device */
.no-device {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  text-align: center;
  border-radius: 16px;
  border: 1px dashed rgba(245,158,11,.3);
  background: rgba(245,158,11,.04);
}

.no-device-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(245,158,11,.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-device-title {
  font-size: 18px;
  font-weight: 700;
}

.no-device-sub {
  font-size: 13px;
  opacity: .55;
  max-width: 340px;
  line-height: 1.5;
}

/* Device header */
.device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px;
  border-radius: var(--glass-radius);
  background: var(--glass-bg-strong);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--glass-border-strong);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
}

.device-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.device-status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34,197,94,.2);
}

.device-status-dot.offline {
  background: #888;
}

.device-title {
  font-size: 16px;
  font-weight: 700;
}

.device-serial {
  font-size: 11px;
  font-family: monospace;
  opacity: .4;
  margin-top: 2px;
}

.device-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.online-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
}

.badge-online {
  background: rgba(34,197,94,.12);
  color: #22c55e;
}

.badge-offline {
  background: rgba(0,0,0,.06);
  color: #888;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--app-border, rgba(0,0,0,.08));
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .2s;
}

.refresh-btn:hover {
  background: var(--app-accent-soft);
}

.refresh-btn.spinning svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Info cards row */
.info-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.info-card {
  padding: 18px;
  border-radius: var(--glass-radius);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  opacity: .6;
}

.edit-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(99,102,241,.08);
  border: 1px solid rgba(99,102,241,.2);
  color: #6366f1;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  cursor: pointer;
  transition: background .2s;
}

.edit-btn:hover {
  background: rgba(99,102,241,.15);
}

/* Signal */
.signal-label {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -.2px;
}

.signal-value {
  font-size: 12px;
  opacity: .5;
  margin-top: 2px;
}

.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  margin-top: 8px;
}

.signal-bar {
  width: 10px;
  border-radius: 3px;
  transition: background .3s;
}

.no-data {
  font-size: 12px;
  opacity: .4;
}

/* WiFi card */
.wifi-ssid {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -.2px;
}

.wifi-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: .5;
}

.wifi-sep {
  opacity: .4;
}

/* Conn card */
.conn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conn-label {
  font-size: 12px;
  opacity: .5;
}

.conn-val {
  font-size: 12px;
  font-weight: 600;
}

code.conn-val {
  font-family: monospace;
  background: rgba(0,0,0,.04);
  padding: 2px 6px;
  border-radius: 4px;
}

:root.dark code.conn-val {
  background: rgba(255,255,255,.06);
}

/* Connected devices section */
.connected-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conn-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  opacity: .75;
}

.conn-count {
  font-size: 12px;
  opacity: .4;
}

.connected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.host-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--app-border, rgba(0,0,0,.05));
}

:root:not(.dark) .host-item {
  background: rgba(0,0,0,.01);
}

:root.dark .host-item {
  background: rgba(255,255,255,.02);
  border-color: rgba(255,255,255,.05);
}

.host-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wifi-host {
  background: rgba(99,102,241,.1);
  color: #6366f1;
}

.wired-host {
  background: rgba(14,165,233,.1);
  color: #0ea5e9;
}

.host-info {
  flex: 1;
  min-width: 0;
}

.host-name {
  font-size: 13px;
  font-weight: 600;
}

.host-ip {
  font-size: 11px;
  font-family: monospace;
  opacity: .45;
  margin-top: 2px;
}

.host-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.tag-wifi {
  background: rgba(99,102,241,.1);
  color: #6366f1;
}

.tag-wired {
  background: rgba(14,165,233,.1);
  color: #0ea5e9;
}

/* Actions */
.actions-row {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .2s, transform .2s;
}

.action-btn:active {
  transform: scale(.98);
}

.wifi-action {
  background: rgba(99,102,241,.1);
  border: 1px solid rgba(99,102,241,.2);
  color: #6366f1;
}

.wifi-action:hover {
  background: rgba(99,102,241,.15);
}

.reboot-action {
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.2);
  color: #ef4444;
}

.reboot-action:hover:not(:disabled) {
  background: rgba(239,68,68,.12);
}

.reboot-action:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* Modal shared */
.wifi-modal, .confirm-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wifi-modal-note {
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(245,158,11,.08);
  border: 1px solid rgba(245,158,11,.2);
  font-size: 12px;
  color: #d97706;
  line-height: 1.4;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  opacity: .6;
}

.confirm-text {
  font-size: 14px;
  line-height: 1.5;
  opacity: .75;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  flex: 1;
  padding: 11px;
  border-radius: 10px;
  border: 1px solid var(--app-border, rgba(0,0,0,.1));
  background: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  flex: 2;
  padding: 11px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .2s;
}

.btn-save:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn-danger {
  flex: 2;
  padding: 11px;
  border-radius: 10px;
  border: none;
  background: #ef4444;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .2s;
}

.btn-danger:hover {
  opacity: .9;
}

/* Responsive */
@media (max-width: 768px) {
  .info-row {
    grid-template-columns: 1fr 1fr;
  }

  .conn-card {
    grid-column: span 2;
  }
}

@media (max-width: 560px) {
  .info-row {
    grid-template-columns: 1fr;
  }

  .conn-card {
    grid-column: span 1;
  }

  .actions-row {
    flex-direction: column;
  }

  .device-header {
    flex-wrap: wrap;
  }
}
</style>
