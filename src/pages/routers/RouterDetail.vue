<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NTag, NButton, NDataTable,
  NProgress, NDescriptions, NDescriptionsItem,
  NAlert, NText, NModal, useMessage, NTooltip,
  NInput, NSpin, NIcon, NTabs, NTabPane, NSelect,
  NSpace, NSwitch
} from 'naive-ui'
import {
  Settings, AlertTriangle, CircleCheck, Copy, InfoCircle, Check,
  Activity, History
} from '@vicons/tabler'
import { routerApi } from '../../api'

// ECharts imports
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'
import { getStoredAccessToken } from '../../api/authSession'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent
])

const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// Provide theme to VChart
const chartTheme = computed(() => themeStore.isDark ? 'dark' : 'light')
provide(THEME_KEY, chartTheme)
const loading = ref(true)
const routerData = ref<any>({})
const connLogs = ref<any[]>([])
const id = route.params.id as string
const showConfigModal = ref(false)
const serverPublicIP = ref('')
const serverPublicKey = ref('')
const configLoading = ref(false)
const mikrotikConfig = ref<any>(null)
const vpnKeyInput = ref('')
const vpnKeySubmitting = ref(false)
const vpnStatus = ref<any>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const DEFAULT_SERVER_PUBLIC_IP = '103.175.216.151'
const DEFAULT_SERVER_PUBLIC_KEY = 'eggfkEoENGUGt0bHCYCtp9iOijoWyeVaJIlO8k41PBw='
const DEFAULT_RADIUS_ADDRESS = '10.10.0.1'
const DEFAULT_COA_PORT = 3799
const DEFAULT_HEARTBEAT_INTERVAL = '00:05:00'

const isMobile = ref(window.innerWidth < 640)
const isTablet = ref(window.innerWidth < 1024)
function onResize() {
  isMobile.value = window.innerWidth < 640
  isTablet.value = window.innerWidth < 1024
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const serverIP = computed(() => DEFAULT_RADIUS_ADDRESS)

const effectiveServerPublicIP = computed(() => serverPublicIP.value || DEFAULT_SERVER_PUBLIC_IP)

const effectiveServerPublicKey = computed(() => serverPublicKey.value || DEFAULT_SERVER_PUBLIC_KEY)

const wgInterfaceBlock1 = computed(() => {
  return `/interface wireguard
add name=wg0 listen-port=13231`
})

const wgInterfaceBlock2 = computed(() => {
  const vpnIP = routerData.value.vpn_ip || '<VPN_IP>'
  return `/ip address
add address=${vpnIP}/24 interface=wg0 network=${vpnIP.replace(/\.\d+$/, '.0')}`
})

const wgPeerScript = computed(() => {
  const pubKey = effectiveServerPublicKey.value
  const pubIP = effectiveServerPublicIP.value
  return `/interface wireguard peers
add interface=wg0 \\
    public-key="${pubKey}" \\
    allowed-address=10.10.0.0/24 \\
    endpoint-address=${pubIP} \\
    endpoint-port=51820 \\
    persistent-keepalive=25s`
})

const radiusBlock1 = computed(() => {
  const d = routerData.value
  return `/radius
add address=${serverIP.value} \\
    secret="${d.radius_secret || '<SECRET>'}" \\
    service=hotspot,ppp,login`
})

const radiusBlock2 = computed(() => {
  const d = routerData.value
  const coaPort = d.coa_port || DEFAULT_COA_PORT
  return `/radius incoming
set accept=yes port=${coaPort}`
})

const pppoeBlock1 = computed(() => {
  return `/ip hotspot profile
set [find] use-radius=yes login-by=pap`
})

const pppoeBlock2 = computed(() => {
  return `/ppp aaa
set use-radius=yes`
})

  const heartbeatScript = computed(() => {
    const token = routerData.value.heartbeat_token || '<TOKEN>'
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://10.10.1.2:3000/api/v1'
    return `/system scheduler add name=radius-heartbeat interval=${DEFAULT_HEARTBEAT_INTERVAL} on-event={
  :local cpuLoad [/system resource get cpu-load]
  :local freeMem [/system resource get free-memory]
  :local totalMem [/system resource get total-memory]
  :local uptime [/system resource get uptime]
  :local boardName [/system resource get board-name]
  :local osVer [/system resource get version]
  :local identity [/system identity get name]
  :local token "${token}"
  :local payload "{\\"token\\":\\"$token\\",\\"identity\\":\\"$identity\\",\\"cpu_load\\":$cpuLoad,\\"free_memory\\":$freeMem,\\"total_memory\\":$totalMem,\\"uptime\\":\\"$uptime\\",\\"board_name\\":\\"$boardName\\",\\"router_os_ver\\":\\"$osVer\\"}"
  /tool fetch url="$baseUrl/routers/heartbeat" http-method=post http-header-field="Content-Type: application/json" http-data=$payload output=none
}`
})

async function fetchMikrotikConfig() {
  configLoading.value = true
  try {
    const { data: res } = await routerApi.mikrotikConfig(id)
    const cfg = res.data || res
    mikrotikConfig.value = cfg
    if (cfg.server_public_ip) serverPublicIP.value = cfg.server_public_ip
    if (cfg.server_public_key) serverPublicKey.value = cfg.server_public_key
  } catch {
    // fallback: use locally computed scripts
  }
  configLoading.value = false
}

async function handleSubmitVpnKey() {
  const key = vpnKeyInput.value.trim()
  if (!key) return message.warning('Masukkan public key MikroTik')
  vpnKeySubmitting.value = true
  try {
    await routerApi.vpnKey(id, { public_key: key })
    routerData.value.vpn_public_key = key
    vpnKeyInput.value = ''
    message.success('VPN public key berhasil didaftarkan')
    // Refresh config after key registration
    fetchMikrotikConfig()
  } catch {
    message.error('Gagal mendaftarkan VPN public key')
  }
  vpnKeySubmitting.value = false
}

function openConfigModal() {
  showConfigModal.value = true
  fetchMikrotikConfig()
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  message.success('Disalin ke clipboard')
}

// --- Connection Logs Table ---
const connLogCols = [
  {
    title: 'Event', key: 'event', width: 130,
    render: (r: any) => h(NTag, {
      type: r.event === 'connected' ? 'success' : 'error',
      size: 'small',
      round: true,
    }, () => r.event === 'connected' ? '● Terhubung' : '● Terputus')
  },
  { title: 'VPN IP', key: 'vpn_ip', render: (r: any) => r.vpn_ip || '-' },
  { title: 'Endpoint', key: 'endpoint', render: (r: any) => r.endpoint || '-' },
  { title: 'Waktu', key: 'created_at', render: (r: any) => formatDate(r.created_at) },
]

function formatBytes(b: number) {
  if (!b) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i]
}

function formatDate(ts: string) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(ts: string | null): string {
  if (!ts) return '-'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return m + ' menit lalu'
  const hr = Math.floor(m / 60)
  if (hr < 24) return hr + ' jam lalu'
  return Math.floor(hr / 24) + ' hari lalu'
}

function formatUptime(val: string | null): string {
  if (!val) return '-'
  // Handle numeric seconds (backend stores as integer)
  const asNum = Number(val)
  if (!isNaN(asNum) && String(val).trim() !== '') {
    let total = Math.floor(asNum)
    const weeks = Math.floor(total / 604800); total %= 604800
    const days = Math.floor(total / 86400); total %= 86400
    const hours = Math.floor(total / 3600); total %= 3600
    const mins = Math.floor(total / 60)
    const parts: string[] = []
    if (weeks) parts.push(weeks + ' minggu')
    if (days) parts.push(days + ' hari')
    if (hours) parts.push(hours + ' jam')
    if (mins) parts.push(mins + ' menit')
    return parts.length ? parts.join(' ') : '-'
  }
  const parts: string[] = []
  const w = val.match(/(\d+)w/)
  const d = val.match(/(\d+)d/)
  const h = val.match(/(\d+)h/)
  const m = val.match(/(\d+)m(?!s)/)
  const s = val.match(/(\d+)s/)
  if (w) parts.push(w[1] + ' minggu')
  if (d) parts.push(d[1] + ' hari')
  if (h) parts.push(h[1] + ' jam')
  if (m) parts.push(m[1] + ' menit')
  if (s && !w && !d) parts.push(s[1] + ' detik')
  // Handle HH:MM:SS (e.g. "1d 02:03:04" or "02:03:04")
  if (!h && !m) {
    const colon = val.match(/(\d{1,2}):(\d{2}):(\d{2})/)
    if (colon) {
      const hh = parseInt(colon[1])
      const mm = parseInt(colon[2])
      if (hh) parts.push(hh + ' jam')
      if (mm) parts.push(mm + ' menit')
    }
  }
  return parts.length ? parts.join(' ') : val
}

const memUsed = computed(() => {
  const d = routerData.value
  if (!d.total_memory) return 0
  return d.total_memory - (d.free_memory || 0)
})

const memPercent = computed(() => {
  const d = routerData.value
  if (!d.total_memory) return 0
  return Math.round(((d.total_memory - (d.free_memory || 0)) / d.total_memory) * 100)
})

const hasSpec = computed(() => !!(routerData.value.identity || routerData.value.router_os_ver || routerData.value.board_name || routerData.value.total_memory))

const cpuLoad = computed(() => routerData.value.cpu_load ?? 0)

// --- Bandwidth Monitoring ---
const activeTab = ref('history')
const interfaces = ref<any[]>([])
const selectedInterfaces = ref<string[]>([])
const isMonitoring = ref(false)
const bandwidthHistory = ref<Record<string, { in: number[], out: number[], timestamps: string[] }>>({})
const MAX_DATA_POINTS = 30
let ws: WebSocket | null = null

async function fetchInterfaces() {
  try {
    const { data: res } = await routerApi.interfaces(id)
    interfaces.value = (res.data || res).map((i: any) => ({
      label: i.name + (i.comment ? ` (${i.comment})` : ''),
      value: i.name
    }))
  } catch {
    message.error('Gagal mengambil daftar interface')
  }
}

function formatBitsPerSecond(bps: number) {
  if (bps === 0) return '0 bps'
  const k = 1000
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps']
  const i = Math.floor(Math.log(bps) / Math.log(k))
  return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const chartOptions = computed(() => {
  const series: any[] = []
  let timestamps: string[] = []

  Object.entries(bandwidthHistory.value).forEach(([name, data]) => {
    series.push({
      name: `${name} (Upload)`,
      type: 'line',
      smooth: true,
      data: data.in, // Inbound is Upload (from client)
      showSymbol: false,
      areaStyle: { opacity: 0.1 },
      lineStyle: { width: 2, type: 'dashed' }
    })
    series.push({
      name: `${name} (Download)`,
      type: 'line',
      smooth: true,
      data: data.out, // Outbound is Download (to client)
      showSymbol: false,
      areaStyle: { opacity: 0.1 },
      lineStyle: { width: 2 }
    })
    if (data.timestamps.length > timestamps.length) {
      timestamps = data.timestamps
    }
  })

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params.length) return ''
        let res = `<div style="font-weight: 600; margin-bottom: 4px">${params[0].name}</div>`
        params.forEach((p: any) => {
          res += `<div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12px">
            <span>${p.marker} ${p.seriesName}</span>
            <span style="font-weight: 600">${formatBitsPerSecond(p.value)}</span>
          </div>`
        })
        return res
      }
    },
    legend: { bottom: 0 },
    grid: { left: '20px', right: '20px', top: '30px', bottom: '60px', containLabel: true },
    xAxis: {
      type: 'category',
      data: timestamps,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#ccc' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (val: number) => formatBitsPerSecond(val) },
      splitLine: { lineStyle: { type: 'dashed', opacity: 0.5 } }
    },
    series
  }
})

function handleBandwidthData(msg: any) {
  const timeStr = new Date(msg.time * 1000).toLocaleTimeString('id-ID', { hour12: false })
  
  if (!msg.data || !msg.data.traffic) return

  msg.data.traffic.forEach((t: any) => {
    if (!bandwidthHistory.value[t.name]) {
      bandwidthHistory.value[t.name] = { out: [], in: [], timestamps: [] }
    }
    const history = bandwidthHistory.value[t.name]
    history.out.push(t.out_bps) // Upload
    history.in.push(t.in_bps)   // Download
    history.timestamps.push(timeStr)

    if (history.out.length > MAX_DATA_POINTS) {
      history.out.shift()
      history.in.shift()
      history.timestamps.shift()
    }
  })
}

function startMonitoring() {
  if (!selectedInterfaces.value.length) {
    return message.warning('Pilih interface yang akan dipantau')
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  let wsUrl = ''
  
  if (baseUrl.startsWith('http')) {
    // Try to use the same prefix as API (e.g. /api/v1/ws)
    wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws'
  } else {
    // Fallback or relative path - use current host and Vite proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    wsUrl = `${protocol}//${window.location.host}/ws`
  }

  // Add token if available
  const token = getStoredAccessToken()
  if (token) {
    wsUrl += (wsUrl.includes('?') ? '&' : '?') + 'token=' + token
  }

  console.log('Connecting to WebSocket:', wsUrl.split('?')[0] + '?token=***')

  try {
    ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      isMonitoring.value = true
      bandwidthHistory.value = {} // Clear old data
      ws?.send(JSON.stringify({
        action: 'monitor_router',
        router_id: id,
        interfaces: selectedInterfaces.value
      }))
    }
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'router_bandwidth') {
          handleBandwidthData(msg)
        }
      } catch (err) {
        console.error('Failed to parse WS message', err)
      }
    }
    ws.onclose = () => {
      isMonitoring.value = false
    }
    ws.onerror = () => {
      message.error('Koneksi monitoring terputus')
      isMonitoring.value = false
    }
  } catch (err) {
    message.error('Gagal menghubungkan ke server monitoring')
  }
}

function stopMonitoring() {
  if (ws) {
    ws.close()
    ws = null
  }
  isMonitoring.value = false
}

watch(activeTab, (val) => {
  if (val === 'bandwidth' && !interfaces.value.length) {
    fetchInterfaces()
  }
})

async function fetchData() {
  try {
    const [rRes, lRes] = await Promise.all([
      routerApi.get(id),
      routerApi.connectionLogs(id, { per_page: 20 }).catch(() => ({ data: { data: [] } })),
    ])
    routerData.value = rRes.data?.data || rRes.data
    if (rRes.data?.server_public_ip) serverPublicIP.value = rRes.data.server_public_ip
    if (rRes.data?.server_public_key) serverPublicKey.value = rRes.data.server_public_key
    if (rRes.data?.vpn_status) vpnStatus.value = rRes.data.vpn_status
    connLogs.value = lRes.data?.data || []
    
    // Automatically fetch interfaces once router data is loaded
    if (!interfaces.value.length) {
      fetchInterfaces()
    }
  } catch {
    message.error('Gagal memuat data router')
  }
  loading.value = false
  return routerData.value
}

async function handleRegenToken() {
  try {
    const { data: res } = await routerApi.regenerateToken(id)
    routerData.value.heartbeat_token = res.heartbeat_token
    message.success('Token berhasil di-generate ulang')
  } catch {
    message.error('Gagal regenerate token')
  }
}

onMounted(() => {
  fetchData()
  refreshTimer = setInterval(fetchData, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  window.removeEventListener('resize', onResize)
  stopMonitoring()
})
</script>

<template>
  <div class="detail-page">
    <!-- Header -->
    <div class="detail-header">
      <div class="detail-title-row">
        <span class="detail-name">{{ routerData.name || 'Router' }}</span>
        <n-tag :type="routerData.is_online ? 'success' : 'error'" size="small" round>
          {{ routerData.is_online ? '● Online' : '● Offline' }}
        </n-tag>
      </div>
      <div class="detail-actions">
        <n-button size="small" @click="openConfigModal">Konfigurasi</n-button>
        <n-button size="small" @click="router.push('/routers')">Kembali</n-button>
      </div>
    </div>

    <!-- VPN & Router Info -->
    <div class="info-grid">
      <n-card class="info-card" :bordered="true" size="small">
        <template #header><span class="info-card-title">Informasi VPN</span></template>
        <n-descriptions :label-placement="isMobile ? 'top' : 'left'" :column="1" bordered size="small">
          <n-descriptions-item label="VPN IP">
            <n-text strong>{{ routerData.vpn_ip || 'Belum dialokasi' }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="Status">
            <n-tag :type="vpnStatus?.connected ? 'success' : 'error'" size="small">
              {{ vpnStatus?.connected ? 'Terhubung' : 'Terputus' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="VPN Public Key">
            <n-text v-if="routerData.vpn_public_key" code style="word-break: break-all; font-size: 11px">{{ routerData.vpn_public_key }}</n-text>
            <n-text v-else depth="3">Belum didaftarkan</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="Endpoint">
            <n-text v-if="vpnStatus?.endpoint" code>{{ vpnStatus.endpoint }}</n-text>
            <n-text v-else depth="3">-</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="Handshake Terakhir">
            {{ vpnStatus?.latest_handshake ? timeAgo(vpnStatus.latest_handshake) : '-' }}
          </n-descriptions-item>
          <n-descriptions-item label="Transfer">
            <span v-if="vpnStatus?.transfer_rx != null || vpnStatus?.transfer_tx != null">
              ↑ {{ formatBytes(vpnStatus?.transfer_tx || 0) }} / ↓ {{ formatBytes(vpnStatus?.transfer_rx || 0) }}
            </span>
            <n-text v-else depth="3">-</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="RADIUS Secret">
            <n-text code style="word-break: break-all; font-size: 12px">{{ routerData.radius_secret || '-' }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="CoA Port">
            {{ routerData.coa_port || 3799 }}
          </n-descriptions-item>
          <n-descriptions-item label="Heartbeat Token">
            <div class="token-row">
              <n-text code style="font-size: 11px; word-break: break-all">{{ routerData.heartbeat_token || '-' }}</n-text>
              <n-tooltip :disabled="!routerData.is_online">
                <template #trigger>
                  <n-button size="tiny" :disabled="routerData.is_online" @click="handleRegenToken">Regenerate</n-button>
                </template>
                Tidak bisa regenerate saat router terhubung
              </n-tooltip>
            </div>
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <n-card class="info-card" :bordered="true" size="small">
        <template #header><span class="info-card-title">Spesifikasi Router</span></template>
        <template v-if="hasSpec">
          <n-descriptions :label-placement="isMobile ? 'top' : 'left'" :column="1" bordered size="small">
            <n-descriptions-item label="Identity">{{ routerData.identity || '-' }}</n-descriptions-item>
            <n-descriptions-item label="RouterOS">{{ routerData.router_os_ver || '-' }}</n-descriptions-item>
            <n-descriptions-item label="Board">{{ routerData.board_name || '-' }}</n-descriptions-item>
            <n-descriptions-item label="Uptime">{{ formatUptime(routerData.uptime) }}</n-descriptions-item>
            <n-descriptions-item label="CPU Load">
              <div class="progress-row">
                <n-progress type="line" :percentage="cpuLoad" :status="cpuLoad > 80 ? 'error' : cpuLoad > 50 ? 'warning' : 'success'" :show-indicator="false" style="width: 100px" />
                <n-text>{{ cpuLoad }}%</n-text>
              </div>
            </n-descriptions-item>
            <n-descriptions-item label="Memory">
              <div class="progress-row">
                <n-progress type="line" :percentage="memPercent" :status="memPercent > 80 ? 'error' : memPercent > 60 ? 'warning' : 'success'" :show-indicator="false" style="width: 100px" />
                <n-text style="font-size: 13px">{{ formatBytes(memUsed) }} / {{ formatBytes(routerData.total_memory) }}</n-text>
              </div>
            </n-descriptions-item>
          </n-descriptions>

          <!-- Simplified History in Specs Card -->
          <div class="mini-history">
            <div class="mini-history-title">Histori Koneksi (2 Terakhir)</div>
            <div v-if="!connLogs.length" class="empty-hint" style="padding: 10px 0">Belum ada histori</div>
            <div v-for="log in connLogs.slice(0, 2)" :key="log.id" class="mini-log-item">
              <div class="mini-log-dot" :class="log.event"></div>
              <div class="mini-log-content">
                <div class="mini-log-top">
                  <span class="mini-log-event">{{ log.event === 'connected' ? 'Terhubung' : 'Terputus' }}</span>
                  <span class="mini-log-time">{{ timeAgo(log.created_at) }}</span>
                </div>
                <div class="mini-log-meta">{{ log.vpn_ip || '-' }} • {{ log.endpoint || '-' }}</div>
              </div>
            </div>
          </div>
        </template>
        <n-alert v-else type="info" :bordered="false">
          Informasi spesifikasi akan terisi otomatis setelah router mengirim heartbeat. Pastikan scheduler heartbeat sudah dikonfigurasi.
        </n-alert>
      </n-card>
    </div>

    <!-- Bandwidth Monitoring Only -->
    <n-card class="info-card" :bordered="true" size="small">
      <template #header>
        <n-space :size="8" align="center">
          <n-icon :size="20" color="#6366f1"><Activity /></n-icon>
          <span class="info-card-title">Monitoring Bandwidth Real-time</span>
        </n-space>
      </template>
      
      <div class="bw-monitor">
        <div class="bw-controls">
          <n-space align="center" justify="space-between" style="width: 100%">
            <n-select
              v-model:value="selectedInterfaces"
              multiple
              filterable
              placeholder="Pilih interface untuk dipantau..."
              :options="interfaces"
              :loading="!interfaces.length"
              style="width: 300px"
              :disabled="isMonitoring"
              clearable
            />
            <n-button
              :type="isMonitoring ? 'error' : 'primary'"
              @click="isMonitoring ? stopMonitoring() : startMonitoring()"
            >
              <template #icon>
                <n-icon><Activity /></n-icon>
              </template>
              {{ isMonitoring ? 'Stop Monitoring' : 'Mulai Monitoring' }}
            </n-button>
          </n-space>
        </div>

        <div class="bw-chart-wrap">
          <div v-if="!isMonitoring && !Object.keys(bandwidthHistory).length" class="bw-empty">
            <n-icon :size="48" depth="4"><Activity /></n-icon>
            <div class="bw-empty-text">Pilih interface dan klik Mulai Monitoring untuk melihat trafik real-time dari router</div>
          </div>
          <v-chart v-else class="bw-chart" :option="chartOptions" :theme="chartTheme" autoresize />
        </div>

      </div>
    </n-card>

  </div>

  <!-- Config Modal -->
  <n-modal v-model:show="showConfigModal" preset="card" :style="{ maxWidth: '780px', width: '95vw', maxHeight: '90vh' }" :bordered="false" content-style="padding: 0; overflow-y: auto; max-height: calc(90vh - 80px)">
    <template #header>
      <div class="cfg-modal-header">
        <div class="cfg-modal-icon">
          <n-icon :size="28"><Settings /></n-icon>
        </div>
        <div>
          <div class="cfg-modal-title">Panduan Konfigurasi MikroTik</div>
          <div class="cfg-modal-subtitle">WireGuard, RADIUS, dan heartbeat untuk router MikroTik Binjai DC</div>
        </div>
      </div>
    </template>
    <template #header-extra>
      <n-tag size="small" :bordered="false" type="info" round style="text-transform: uppercase; font-weight: 600">{{ routerData.name }}</n-tag>
    </template>

    <n-spin :show="configLoading">
    <div class="cfg-body">
      <!-- Status Banner -->
      <div v-if="!serverPublicKey" class="cfg-banner cfg-banner--warn">
        <n-icon class="cfg-banner-svg" :size="18"><AlertTriangle /></n-icon>
        <span>Public key server dari dashboard belum tersedia. Panduan memakai nilai default Binjai DC, tetap cek sebelum dipasang.</span>
      </div>
      <div v-else class="cfg-banner cfg-banner--ok">
        <n-icon class="cfg-banner-svg" :size="18"><CircleCheck /></n-icon>
        <span>Nilai WireGuard, RADIUS, dan heartbeat sudah terisi otomatis. Salin & jalankan di Terminal MikroTik secara berurutan.</span>
      </div>

      <!-- Info Cards Grid -->
      <div class="cfg-info-grid">
        <div class="cfg-info-item">
          <span class="cfg-info-label">VPN IP Router</span>
          <span class="cfg-info-value">{{ routerData.vpn_ip || '-' }}</span>
        </div>
        <div class="cfg-info-item">
          <span class="cfg-info-label">RADIUS Address</span>
          <span class="cfg-info-value">{{ serverIP }}</span>
        </div>
        <div class="cfg-info-item">
          <span class="cfg-info-label">WireGuard Endpoint</span>
          <span class="cfg-info-value">{{ effectiveServerPublicIP }}</span>
        </div>
        <div class="cfg-info-item">
          <span class="cfg-info-label">Public Key Server</span>
          <span class="cfg-info-value cfg-info-mono" style="font-size: 10px">{{ effectiveServerPublicKey.substring(0, 24) }}...</span>
        </div>
        <div class="cfg-info-item">
          <span class="cfg-info-label">RADIUS Secret</span>
          <span class="cfg-info-value cfg-info-mono">{{ routerData.radius_secret || '-' }}</span>
        </div>
        <div class="cfg-info-item">
          <span class="cfg-info-label">CoA Port</span>
          <span class="cfg-info-value">{{ routerData.coa_port || 3799 }}</span>
        </div>
        <div class="cfg-info-item">
          <span class="cfg-info-label">Heartbeat Token</span>
          <span class="cfg-info-value cfg-info-mono" style="font-size: 10px">{{ (routerData.heartbeat_token || '-').substring(0, 24) }}...</span>
        </div>
      </div>

      <!-- Steps -->
      <div class="cfg-steps">
        <!-- Step 1: WireGuard Interface -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">1</span>
            <div>
              <div class="cfg-step-title">Buat Interface WireGuard</div>
              <div class="cfg-step-desc">Buat interface <code>wg0</code> pada port 13231, lalu pasang IP VPN router di jaringan privat 10.10.0.0/24.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ wgInterfaceBlock1 }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(wgInterfaceBlock1)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
          <div class="cfg-code">
            <pre>{{ wgInterfaceBlock2 }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(wgInterfaceBlock2)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
          <div class="cfg-step-note">
            <n-icon class="cfg-note-svg" :size="16"><InfoCircle /></n-icon>
            <div>
              Setelah interface aktif, salin public key MikroTik lalu daftarkan ke dashboard agar peer server diizinkan:<br>
              <code>/interface wireguard print</code><br>
              Tempel public key di bawah ini:
            </div>
          </div>
          <div class="cfg-key-form">
            <n-input
              v-model:value="vpnKeyInput"
              :placeholder="routerData.vpn_public_key || 'Paste MikroTik WireGuard public key...'"
              size="small"
              style="flex: 1"
              :disabled="vpnKeySubmitting"
            />
            <n-button
              size="small"
              type="primary"
              :loading="vpnKeySubmitting"
              :disabled="!vpnKeyInput.trim()"
              @click="handleSubmitVpnKey"
            >
              Daftarkan
            </n-button>
          </div>
          <div v-if="routerData.vpn_public_key" class="cfg-key-registered">
            <n-icon :size="14" :color="'#52c41a'"><Check /></n-icon>
            <span style="color: #52c41a; font-weight: 600; font-size: 12px">Key terdaftar</span>
            <span class="cfg-key-value">{{ routerData.vpn_public_key }}</span>
          </div>
        </div>

        <!-- Step 2: WireGuard Peer -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">2</span>
            <div>
              <div class="cfg-step-title">Tambah Peer Server Binjai DC</div>
              <div class="cfg-step-desc">Gunakan public key server, endpoint <code>103.175.216.151:51820</code>, dan allowed address <code>10.10.0.0/24</code>.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ wgPeerScript }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(wgPeerScript)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
        </div>

        <!-- Step 3: RADIUS -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">3</span>
            <div>
              <div class="cfg-step-title">Konfigurasi Client RADIUS</div>
              <div class="cfg-step-desc">Arahkan service <code>hotspot</code>, <code>ppp</code>, dan <code>login</code> ke <code>10.10.0.1</code>, lalu aktifkan Incoming pada port CoA.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ radiusBlock1 }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(radiusBlock1)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
          <div class="cfg-code">
            <pre>{{ radiusBlock2 }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(radiusBlock2)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
        </div>

        <!-- Step 4: Hotspot & PPPoE -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">4</span>
            <div>
              <div class="cfg-step-title">Aktivasi Hotspot & PPPoE</div>
              <div class="cfg-step-desc">Aktifkan <code>Use RADIUS</code> pada Hotspot dan PPP. Untuk Hotspot, pastikan <code>PAP</code> tetap aktif di tab Login.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ pppoeBlock1 }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(pppoeBlock1)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
          <div class="cfg-code">
            <pre>{{ pppoeBlock2 }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(pppoeBlock2)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
        </div>

        <!-- Step 5: Heartbeat -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">5</span>
            <div>
              <div class="cfg-step-title">Monitoring Heartbeat (Opsional)</div>
              <div class="cfg-step-desc">Pasang scheduler setiap 5 menit agar CPU, RAM, dan uptime terkirim ke dashboard. Token heartbeat sudah terisi otomatis.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ heartbeatScript }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(heartbeatScript)">
              <n-icon :size="14"><Copy /></n-icon>
              Salin
            </button>
          </div>
        </div>
      </div>

      <div class="cfg-footer">
        <n-button size="small" @click="showConfigModal = false">Tutup</n-button>
      </div>
    </div>
    </n-spin>
  </n-modal>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-name {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-card { border-radius: 12px !important; }
:root:not(.dark) .info-card { border-color: rgba(0,0,0,0.08) !important; }
:root.dark .info-card { border-color: rgba(255,255,255,0.08) !important; }

.info-card-title {
  font-size: 15px;
  font-weight: 600;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.table-scroll { overflow-x: auto; }

/* ── Log Cards ── */
.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.log-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(128,128,128,0.1);
  background: rgba(128,128,128,0.02);
}
:root.dark .log-card {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.06);
}

.log-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.log-time {
  font-size: 12px;
  opacity: 0.5;
}

.log-card-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  opacity: 0.7;
}

/* ── Mini History ── */
.mini-history {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed rgba(128,128,128,0.15);
}

.mini-history-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.4;
  margin-bottom: 8px;
}

.mini-log-item {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.mini-log-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.mini-log-dot.connected { background: #52c41a; box-shadow: 0 0 4px #52c41a; }
.mini-log-dot.disconnected { background: #ff4d4f; }

.mini-log-content { flex: 1; }

.mini-log-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mini-log-event { font-size: 13px; font-weight: 600; }
.mini-log-time { font-size: 11px; opacity: 0.5; }
.mini-log-meta { font-size: 12px; opacity: 0.5; margin-top: 1px; }

/* ── Bandwidth Monitor ── */
.bw-monitor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bw-controls {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(128,128,128,0.08);
}

.bw-chart-wrap {
  height: 350px;
  width: 100%;
  position: relative;
}

.bw-chart {
  height: 100%;
  width: 100%;
}

.bw-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  gap: 12px;
  text-align: center;
}

.bw-empty-text {
  max-width: 300px;
  font-size: 14px;
}

/* ── Session Cards ── */
.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(128,128,128,0.1);
  background: rgba(128,128,128,0.02);
}
:root.dark .session-card {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.06);
}

.session-card-user {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 8px;
}

.session-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.session-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
}

.session-stat-label {
  font-size: 11px;
  opacity: 0.45;
  font-weight: 600;
}

.empty-hint {
  text-align: center;
  padding: 24px 0;
  opacity: 0.4;
  font-size: 13px;
}

.code-block {
  position: relative;
  overflow-x: auto;
}

.copy-btn {
  position: absolute;
  top: 4px;
  right: 4px;
}

/* ── Config Modal ── */
.cfg-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cfg-modal-icon { flex-shrink: 0; color: #6366f1; }
.cfg-modal-title { font-size: 17px; font-weight: 700; line-height: 1.3; }
.cfg-modal-subtitle { font-size: 13px; opacity: 0.55; margin-top: 2px; }

.cfg-body { padding: 20px 24px 16px; }
@media (max-width: 640px) { .cfg-body { padding: 16px; } }

.cfg-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 16px;
}
.cfg-banner--warn {
  background: rgba(250, 173, 20, 0.08);
  border: 1px solid rgba(250, 173, 20, 0.2);
}
.cfg-banner--ok {
  background: rgba(82, 196, 26, 0.08);
  border: 1px solid rgba(82, 196, 26, 0.2);
}
.cfg-banner-svg { flex-shrink: 0; margin-top: 1px; }
.cfg-banner--warn .cfg-banner-svg { color: #faad14; }
.cfg-banner--ok .cfg-banner-svg { color: #52c41a; }

.cfg-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
@media (max-width: 640px) { .cfg-info-grid { grid-template-columns: repeat(2, 1fr); } }

.cfg-info-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid rgba(128, 128, 128, 0.08);
}
:root.dark .cfg-info-item {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}
.cfg-info-label { display: block; font-size: 11px; opacity: 0.5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
.cfg-info-value { display: block; font-size: 13px; font-weight: 600; word-break: break-all; }
.cfg-info-mono { font-family: monospace; font-size: 12px; font-weight: 500; }

.cfg-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cfg-step {
  border: 1px solid rgba(128, 128, 128, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.2s;
}
:root.dark .cfg-step { border-color: rgba(255, 255, 255, 0.08); }
.cfg-step:hover { border-color: rgba(64, 128, 255, 0.3); }

.cfg-step-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.cfg-step-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4080ff, #6366f1);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cfg-step-title { font-size: 14px; font-weight: 700; line-height: 1.4; }
.cfg-step-desc { font-size: 12.5px; opacity: 0.55; margin-top: 2px; line-height: 1.4; }
.cfg-step-desc code {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(128, 128, 128, 0.1);
  font-size: 11.5px;
}

.cfg-code {
  position: relative;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(128, 128, 128, 0.1);
  border-radius: 8px;
  overflow-x: auto;
}
:root.dark .cfg-code {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.06);
}
.cfg-code pre {
  margin: 0;
  padding: 14px 16px;
  padding-right: 70px;
  font-size: 12px;
  line-height: 1.6;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
.cfg-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(128, 128, 128, 0.15);
  background: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
:root.dark .cfg-copy-btn {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: #ccc;
}
.cfg-copy-btn:hover {
  background: rgba(64, 128, 255, 0.1);
  border-color: rgba(64, 128, 255, 0.3);
}

.cfg-step-note {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(64, 128, 255, 0.05);
  border: 1px solid rgba(64, 128, 255, 0.1);
  font-size: 12.5px;
  line-height: 1.5;
}
.cfg-step-note-icon { flex-shrink: 0; }
.cfg-step-note code {
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(128, 128, 128, 0.1);
  font-size: 11.5px;
}

.cfg-note-svg { flex-shrink: 0; color: #4080ff; margin-top: 1px; }

.cfg-key-form {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}

.cfg-key-registered {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
}
.cfg-key-value {
  font-family: monospace;
  font-size: 11px;
  opacity: 0.6;
  word-break: break-all;
}

.cfg-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(128, 128, 128, 0.1);
}

@media (max-width: 1023px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .detail-header {
    flex-direction: column;
    align-items: stretch;
  }
  .detail-actions {
    justify-content: flex-start;
  }
  .detail-name {
    font-size: 17px;
  }
}
</style>
