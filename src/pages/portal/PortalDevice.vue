<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NCard, NButton, NTag, NModal, NForm, NFormItem, NInput,
  NAlert, NSpin, NIcon, NSpace, NText, NDivider, useMessage
} from 'naive-ui'
import { Wifi, RefreshDot, Router, Wifi2, DeviceLaptop } from '@vicons/tabler'
import { portalApi } from '../../api'
import { useThemeStore } from '../../stores/theme'

const message = useMessage()
const themeStore = useThemeStore()
const loading = ref(true)
const ont = ref<any>(null)
const status = ref<any>(null)

// WiFi modal
const showWifiModal = ref(false)
const savingWifi = ref(false)
const wifiForm = ref({ ssid: '', password: '' })

// Reboot
const rebooting = ref(false)

const isDark = computed(() => themeStore.isDark)

async function fetchDevice() {
  loading.value = true
  try {
    const { data: res } = await portalApi.device()
    ont.value = res.data || null
    status.value = res.status || null
  } catch { /* no device */ }
  loading.value = false
}

function openWifiModal() {
  wifiForm.value = {
    ssid: status.value?.wifi_ssid || ont.value?.last_known_wifi_ssid || '',
    password: '',
  }
  showWifiModal.value = true
}

async function saveWifi() {
  if (!wifiForm.value.ssid) { message.warning('Nama WiFi (SSID) wajib diisi'); return }
  if (wifiForm.value.password && wifiForm.value.password.length < 8) {
    message.warning('Password WiFi minimal 8 karakter'); return
  }
  savingWifi.value = true
  try {
    await portalApi.setDeviceWifi({ ssid: wifiForm.value.ssid, password: wifiForm.value.password })
    message.success('Pengaturan WiFi berhasil diperbarui')
    showWifiModal.value = false
    await fetchDevice()
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Gagal mengubah WiFi')
  }
  savingWifi.value = false
}

async function reboot() {
  rebooting.value = true
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
  if (rx > -20) return { label: 'Sangat Baik', color: '#18a058', pct: 100 }
  if (rx > -25) return { label: 'Baik', color: '#18a058', pct: 80 }
  if (rx > -27) return { label: 'Cukup', color: '#f0a020', pct: 60 }
  if (rx > -30) return { label: 'Lemah', color: '#d03050', pct: 40 }
  return { label: 'Kritis', color: '#d03050', pct: 20 }
})

const connectedHosts = computed(() => status.value?.connected_hosts || [])

onMounted(fetchDevice)
</script>

<template>
  <n-spin :show="loading" style="min-height: 200px">
    <!-- No device -->
    <n-alert v-if="!loading && !ont" type="info" :bordered="false">
      Tidak ada perangkat ONT/router yang terdaftar untuk akun Anda. Hubungi admin jika Anda merasa ini keliru.
    </n-alert>

    <div v-else-if="ont" style="display:flex;flex-direction:column;gap:16px">

      <!-- Header card -->
      <n-card size="small">
        <template #header>
          <n-space align="center" :size="10">
            <n-icon :size="20" :color="isOnline ? '#18a058' : '#888'"><Router /></n-icon>
            <span style="font-weight:700">Perangkat Saya</span>
            <n-tag :type="isOnline ? 'success' : 'default'" size="small" round :bordered="false">
              {{ isOnline ? 'Online' : 'Offline' }}
            </n-tag>
          </n-space>
        </template>
        <template #header-extra>
          <n-button size="tiny" secondary :loading="loading" @click="fetchDevice">
            <template #icon><n-icon :component="RefreshDot" /></template>
            Refresh
          </n-button>
        </template>

        <div style="display:flex;flex-wrap:wrap;gap:20px;font-size:13px">
          <div>
            <div style="opacity:.5;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Serial</div>
            <n-text code style="font-size:12px">{{ ont.serial_number }}</n-text>
          </div>
          <div v-if="ont.vendor">
            <div style="opacity:.5;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Vendor</div>
            <div>{{ ont.vendor }}</div>
          </div>
          <div v-if="ont.model">
            <div style="opacity:.5;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Model</div>
            <div>{{ ont.model }}</div>
          </div>
          <div v-if="status?.software_version">
            <div style="opacity:.5;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Firmware</div>
            <div>{{ status.software_version }}</div>
          </div>
          <div v-if="status?.wan_ip">
            <div style="opacity:.5;font-size:11px;text-transform:uppercase;letter-spacing:.4px">IP WAN</div>
            <n-text code style="font-size:12px">{{ status.wan_ip }}</n-text>
          </div>
        </div>
      </n-card>

      <!-- Signal + WiFi card -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

        <!-- Sinyal -->
        <n-card size="small">
          <template #header>
            <n-space align="center" :size="8">
              <n-icon :size="16" :color="signalLevel?.color || '#888'"><Wifi2 /></n-icon>
              <span style="font-weight:600;font-size:13px">Sinyal Optik</span>
            </n-space>
          </template>
          <div v-if="signalLevel" style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;font-size:12px">
              <span :style="{ color: signalLevel.color, fontWeight: 700 }">{{ signalLevel.label }}</span>
              <span style="opacity:.55">{{ status.rx_power?.toFixed(1) }} dBm</span>
            </div>
            <div style="height:6px;border-radius:3px;background:rgba(0,0,0,.1);overflow:hidden">
              <div :style="{ width: signalLevel.pct + '%', height: '100%', background: signalLevel.color, borderRadius: '3px', transition: 'width .3s' }" />
            </div>
          </div>
          <n-text v-else depth="3" style="font-size:12px">Data sinyal tidak tersedia</n-text>
        </n-card>

        <!-- WiFi -->
        <n-card size="small">
          <template #header>
            <n-space align="center" :size="8">
              <n-icon :size="16" color="#6366f1"><Wifi /></n-icon>
              <span style="font-weight:600;font-size:13px">WiFi</span>
            </n-space>
          </template>
          <template #header-extra>
            <n-button size="tiny" type="primary" @click="openWifiModal">Ubah</n-button>
          </template>
          <div style="font-size:13px">
            <div style="font-weight:700;margin-bottom:2px">{{ status?.wifi_ssid || ont.last_known_wifi_ssid || '-' }}</div>
            <div style="opacity:.5;font-size:11px">
              {{ status?.wifi_security || ont.last_known_wifi_security || 'WPA2' }}
            </div>
          </div>
        </n-card>
      </div>

      <!-- Connected hosts -->
      <n-card v-if="connectedHosts.length > 0" size="small">
        <template #header>
          <n-space align="center" :size="8">
            <n-icon :size="16" color="#0ea5e9"><DeviceLaptop /></n-icon>
            <span style="font-weight:600;font-size:13px">Perangkat Terhubung ({{ connectedHosts.length }})</span>
          </n-space>
        </template>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div
            v-for="host in connectedHosts" :key="host.mac_address || host.ip_address"
            style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px"
            :style="{ background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)' }"
          >
            <div>
              <div style="font-size:13px;font-weight:500">{{ host.hostname || 'Perangkat' }}</div>
              <div style="font-size:11px;opacity:.5;font-family:monospace">{{ host.ip_address }}</div>
            </div>
            <n-tag :type="host.interface_type === '802.11' ? 'info' : 'default'" size="tiny" :bordered="false">
              {{ host.interface_type === '802.11' ? 'WiFi' : 'Kabel' }}
            </n-tag>
          </div>
        </div>
      </n-card>

      <!-- Actions -->
      <n-card size="small">
        <n-space>
          <n-button secondary @click="openWifiModal">
            <template #icon><n-icon :component="Wifi" /></template>
            Ubah WiFi
          </n-button>
          <n-button secondary :loading="rebooting" @click="reboot">
            <template #icon><n-icon :component="RefreshDot" /></template>
            Restart Perangkat
          </n-button>
        </n-space>
      </n-card>

    </div>
  </n-spin>

  <!-- Modal WiFi -->
  <n-modal v-model:show="showWifiModal" preset="card" title="Ubah Pengaturan WiFi" :style="{ maxWidth: '400px', width: '95vw' }">
    <n-alert type="info" :bordered="false" style="margin-bottom:14px;font-size:12px">
      Perubahan akan langsung diterapkan ke perangkat. Semua perangkat yang sedang terhubung perlu memasukkan password baru jika Anda mengubah password.
    </n-alert>
    <n-form label-placement="top">
      <n-form-item label="Nama WiFi (SSID)">
        <n-input v-model:value="wifiForm.ssid" placeholder="Nama jaringan WiFi Anda" maxlength="32" show-count />
      </n-form-item>
      <n-form-item label="Password WiFi">
        <n-input
          v-model:value="wifiForm.password"
          type="password"
          show-password-on="click"
          placeholder="Minimal 8 karakter (kosongkan jika tidak ingin diubah)"
          maxlength="63"
        />
      </n-form-item>
      <n-space justify="end">
        <n-button @click="showWifiModal = false">Batal</n-button>
        <n-button type="primary" :loading="savingWifi" @click="saveWifi">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>
