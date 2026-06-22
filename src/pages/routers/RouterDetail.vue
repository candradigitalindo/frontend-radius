<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NTag, NButton, NDataTable,
  NProgress, NDescriptions, NDescriptionsItem,
  NAlert, NText, NModal, useMessage, NTooltip,
  NInput, NSpin, NIcon, NTabs, NTabPane, NSelect,
  NSpace, NSwitch, NForm, NFormItem, NGrid, NGridItem,
  NInputNumber, NInputGroup, NInputGroupLabel
} from 'naive-ui'
import {
  Settings, AlertTriangle, CircleCheck, Copy, InfoCircle, Check,
  Activity, History
} from '@vicons/tabler'
import { routerApi, ipamApi } from '../../api'

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

// Router dianggap memakai VPN hanya jika public key WireGuard sudah terdaftar.
const usingVpn = computed(() => !!routerData.value.vpn_public_key)

// Mode koneksi: 'direct' = IP Publik (ROS 6 & 7), 'wireguard' = VPN WireGuard (ROS 7+)
const connectionMode = ref<'direct' | 'wireguard'>('direct')

const isMobile = ref(window.innerWidth < 640)
const isTablet = ref(window.innerWidth < 1024)
function onResize() {
  isMobile.value = window.innerWidth < 640
  isTablet.value = window.innerWidth < 1024
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// Semua nilai panduan MikroTik berasal dari backend (endpoint mikrotik-config),
// dengan cadangan ke data router (juga backend). Tidak ada nilai hardcode.
const cfg = computed<any>(() => mikrotikConfig.value || {})

const effectiveServerPublicIP = computed(() => cfg.value.server_endpoint || serverPublicIP.value || '')

const effectiveServerPublicKey = computed(() => cfg.value.server_public_key || serverPublicKey.value || '')

// Di mode direct, RADIUS mengarah ke IP publik server; di mode wireguard ke VPN IP server.
const effectiveRadiusAddress = computed(() =>
  connectionMode.value === 'direct'
    ? effectiveServerPublicIP.value
    : (cfg.value.server_vpn_ip || '')
)

const vpnListenPort = computed(() => cfg.value.vpn_listen_port || '')
const vpnSubnet = computed(() => cfg.value.vpn_subnet || '')
const wgRouterPort = computed(() => cfg.value.wg_router_port || '')
const coaPort = computed(() => cfg.value.coa_port || routerData.value.coa_port || '')
const heartbeatInterval = computed(() => cfg.value.heartbeat_interval || '')
const heartbeatUrl = computed(() => cfg.value.heartbeat_url || '')
const routerVpnIP = computed(() => cfg.value.vpn_ip || routerData.value.vpn_ip || '')
const radiusSecret = computed(() => cfg.value.radius_secret || routerData.value.radius_secret || '')
const heartbeatToken = computed(() => cfg.value.heartbeat_token || routerData.value.heartbeat_token || '')

const wgInterfaceBlock1 = computed(() => {
  return `/interface wireguard
add name=wg0 listen-port=${wgRouterPort.value}`
})

const wgInterfaceBlock2 = computed(() => {
  const vpnIP = routerVpnIP.value
  const network = vpnIP ? vpnIP.replace(/\.\d+$/, '.0') : ''
  return `/ip address
add address=${vpnIP}/24 interface=wg0 network=${network}`
})

const wgPeerScript = computed(() => {
  return `/interface wireguard peers
add interface=wg0 \\
    public-key="${effectiveServerPublicKey.value}" \\
    allowed-address=${vpnSubnet.value} \\
    endpoint-address=${effectiveServerPublicIP.value} \\
    endpoint-port=${vpnListenPort.value} \\
    persistent-keepalive=25s`
})

const radiusBlock1 = computed(() => {
  return `/radius
add address=${effectiveRadiusAddress.value} \\
    secret="${radiusSecret.value}" \\
    service=hotspot,ppp,login`
})

const radiusBlock2 = computed(() => {
  return `/radius incoming
set accept=yes port=${coaPort.value}`
})

const pppoeBlock2 = computed(() => {
  return `/ppp aaa
set use-radius=yes`
})

const heartbeatScript = computed(() => {
  return `/system scheduler add name=radius-heartbeat interval=${heartbeatInterval.value} on-event={
  :local token "${heartbeatToken.value}"
  :local cpuLoad [/system resource get cpu-load]
  :local freeMem [/system resource get free-memory]
  :local totalMem [/system resource get total-memory]
  :local uptime [/system resource get uptime]
  :local boardName [/system resource get board-name]
  :local osVer [/system resource get version]
  :local identity [/system identity get name]
  :local payload "{\\"token\\":\\"$token\\",\\"identity\\":\\"$identity\\",\\"cpu_load\\":$cpuLoad,\\"free_memory\\":$freeMem,\\"total_memory\\":$totalMem,\\"uptime\\":\\"$uptime\\",\\"board_name\\":\\"$boardName\\",\\"router_os_ver\\":\\"$osVer\\"}"
  /tool fetch url="${heartbeatUrl.value}" http-method=post http-header-field="Content-Type: application/json" http-data=\$payload output=none
} comment="Radius Heartbeat"
`
})

// Pengiriman counter interface (push) — agar monitoring bandwidth jalan TANPA VPN.
const ifMonitorUrl = computed(() => (heartbeatUrl.value || '').replace('/heartbeat', '/interface-stats'))
const ifMonitorScript = computed(() => {
  return `/system scheduler remove [find name="radius-ifmonitor"]
/system scheduler add name=radius-ifmonitor interval=00:00:05 on-event={
  :local token "${heartbeatToken.value}"
  :local arr ""
  :foreach i in=[/interface find where !dynamic] do={
    :local nm [/interface get \$i name]
    :local rx [/interface get \$i rx-byte]
    :local tx [/interface get \$i tx-byte]
    :if (\$arr != "") do={ :set arr (\$arr . ",") }
    :set arr (\$arr . "{\\"name\\":\\"\$nm\\",\\"rx_bytes\\":\$rx,\\"tx_bytes\\":\$tx}")
  }
  :local payload "{\\"token\\":\\"\$token\\",\\"interfaces\\":[\$arr]}"
  /tool fetch url="${ifMonitorUrl.value}" http-method=post http-header-field="Content-Type: application/json" http-data=\$payload output=none
} comment="Radius Interface Monitor"
`
})

// Tab aktif pada modal panduan
const activeGuideTab = ref('persiapan')

// ── Tab 1: Persiapan — Modem ISP → MikroTik (WAN) ───────────────────────────
// Nilai ISP & port bersifat spesifik per-pelanggan, jadi disajikan sebagai contoh
// yang harus disesuaikan (bukan data dari server).
const wanDhcpScript = `# Opsi A — Modem ISP mode Router (memberi IP otomatis ke MikroTik)
/ip dhcp-client add interface=ether1 use-peer-dns=yes add-default-route=yes disabled=no`

const wanPppoeScript = `# Opsi B — Modem ISP mode Bridge (MikroTik yang dial PPPoE ke ISP)
/interface pppoe-client add name=wan-isp interface=ether1 \\
    user=USERNAME_ISP password=PASSWORD_ISP \\
    add-default-route=yes use-peer-dns=yes disabled=no`

const wanNatScript = `# Agar pelanggan bisa akses internet (NAT)
/interface list add name=WAN
/interface list member add list=WAN interface=ether1
/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade`

const wanDnsScript = `/ip dns set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes`

// ── Tab 2: PPP Server (PPPoE untuk pelanggan) ───────────────────────────────
const pppPoolScript = `# Pool IP cadangan untuk pelanggan (RADIUS dapat menimpa per pelanggan)
/ip pool add name=pool-pelanggan ranges=10.20.0.2-10.20.255.254`

const pppProfileScript = `/ppp profile add name=profil-pelanggan \\
    local-address=10.20.0.1 remote-address=pool-pelanggan \\
    dns-server=8.8.8.8,1.1.1.1`

const pppoeServerScript = `# Aktifkan PPPoE Server di port yang menghadap pelanggan (mis. ether2)
/interface pppoe-server server add service-name=internet interface=ether2 \\
    default-profile=profil-pelanggan one-session-per-host=yes disabled=no`

// ── Multi-vendor: jenis router & panduan yang disesuaikan ───────────────────
const guideType = computed(() => routerData.value.router_type || 'mikrotik')
const isMikrotik = computed(() => guideType.value === 'mikrotik')
// Hanya MikroTik & VyOS yang punya WireGuard native; vendor lain = IP Publik saja.
const supportsWireguard = computed(() => guideType.value === 'mikrotik' || guideType.value === 'vyos')
const vendorLabel = computed(() => ({
  mikrotik: 'MikroTik RouterOS', cisco: 'Cisco IOS / IOS-XE', huawei: 'Huawei VRP',
  juniper: 'Juniper JunOS', vyos: 'VyOS / EdgeRouter', ruijie: 'Ruijie RG-OS',
} as Record<string, string>)[guideType.value] || 'Router')

// Paksa mode IP Publik untuk vendor tanpa WireGuard.
watch(supportsWireguard, (ok) => { if (!ok) connectionMode.value = 'direct' }, { immediate: true })

// Panduan vendor (non-MikroTik): langkah WireGuard hanya untuk VyOS pada mode WireGuard.
const wgVisible = computed(() => guideType.value === 'vyos' && connectionMode.value === 'wireguard')
const vRadiusStep = computed(() => (wgVisible.value ? 2 : 1))
const vPppoeStep = computed(() => (wgVisible.value ? 3 : 2))
const vSnmpStep = computed(() => (wgVisible.value ? 4 : 3))

// Nilai RADIUS sesuai mode (IP publik server, atau VPN IP saat WireGuard).
const radiusAddr = computed(() => effectiveRadiusAddress.value || '<IP_SERVER>')
const authPort = computed(() => cfg.value.radius_auth_port || '1812')
const acctPort = computed(() => cfg.value.radius_acct_port || '1813')

// RADIUS client config per vendor (mode IP Publik).
const vendorRadiusScript = computed(() => {
  const ip = radiusAddr.value, sec = radiusSecret.value, coa = coaPort.value
  switch (guideType.value) {
    case 'cisco':
      return `! ===== AAA + RADIUS (D Radius) =====
aaa new-model
radius server DRADIUS
 address ipv4 ${ip} auth-port ${authPort.value} acct-port ${acctPort.value}
 key ${sec}
aaa group server radius DRADIUS-GRP
 server name DRADIUS
aaa authentication ppp default group DRADIUS-GRP local
aaa authorization network default group DRADIUS-GRP
aaa accounting network default start-stop group DRADIUS-GRP
! CoA (disconnect / change of authorization)
aaa server radius dynamic-author
 client ${ip} server-key ${sec}
 port ${coa}`
    case 'ruijie':
      return `! ===== AAA + RADIUS (D Radius) =====
aaa new-model
radius-server host ${ip} auth-port ${authPort.value} acct-port ${acctPort.value} key ${sec}
aaa authentication ppp default group radius local
aaa authorization network default group radius
aaa accounting network default start-stop group radius
! CoA
aaa server radius dynamic-author
 client ${ip} server-key ${sec}
 port ${coa}`
    case 'huawei':
      return `# ===== RADIUS template (D Radius) =====
radius-server template dradius
 radius-server shared-key cipher ${sec}
 radius-server authentication ${ip} ${authPort.value} weight 80
 radius-server accounting ${ip} ${acctPort.value} weight 80
# CoA / authorization
radius-server authorization ${ip} shared-key cipher ${sec}
#
aaa
 authentication-scheme dradius
  authentication-mode radius
 accounting-scheme dradius
  accounting-mode radius
 domain dradius
  authentication-scheme dradius
  accounting-scheme dradius
  radius-server dradius`
    case 'juniper':
      return `# ===== RADIUS (D Radius) =====
set access radius-server ${ip} port ${authPort.value}
set access radius-server ${ip} accounting-port ${acctPort.value}
set access radius-server ${ip} secret "${sec}"
set access radius-server ${ip} dynamic-request-port ${coa}
set access profile dradius authentication-order radius
set access profile dradius radius authentication-server ${ip}
set access profile dradius radius accounting-server ${ip}
set access profile dradius accounting order radius`
    case 'vyos':
      return `# ===== RADIUS untuk PPPoE Server (D Radius) =====
set service pppoe-server authentication mode radius
set service pppoe-server authentication radius server ${ip} key '${sec}'
set service pppoe-server authentication radius server ${ip} auth-port ${authPort.value}
set service pppoe-server authentication radius server ${ip} acct-port ${acctPort.value}
# CoA (dynamic authorization)
set service pppoe-server authentication radius dynamic-author server '${ip}'
set service pppoe-server authentication radius dynamic-author key '${sec}'
set service pppoe-server authentication radius dynamic-author port ${coa}`
    default:
      return ''
  }
})

// PPPoE / BNG enablement per vendor.
const vendorPppoeScript = computed(() => {
  switch (guideType.value) {
    case 'cisco':
      return `! ===== PPPoE Server =====
bba-group pppoe DRADIUS
 virtual-template 1
interface Virtual-Template1
 mtu 1492
 ip unnumbered Loopback0
 peer default ip address pool RADIUS
 ppp authentication chap pap
! Terapkan ke interface arah pelanggan (sesuaikan)
interface GigabitEthernet0/0/1
 pppoe enable group DRADIUS`
    case 'ruijie':
      return `! ===== PPPoE Server =====
bba-group pppoe DRADIUS
 virtual-template 1
interface Virtual-Template 1
 ppp authentication chap pap
 peer default ip address pool RADIUS
! Interface arah pelanggan (sesuaikan)
interface GigabitEthernet 0/1
 pppoe enable group DRADIUS`
    case 'huawei':
      return `# ===== PPPoE / BAS interface =====
interface Virtual-Template1
 ppp authentication-mode chap pap
 remote address pool dradius
# Bind ke interface arah pelanggan (sesuaikan)
interface GigabitEthernet0/0/1
 pppoe-server bind Virtual-Template 1`
    case 'juniper':
      return `# ===== PPPoE Subscriber (dynamic-profiles) =====
set interfaces pp0 unit 0 pppoe-options server
set interfaces pp0 unit 0 ppp-options chap
set interfaces pp0 unit 0 ppp-options pap
set interfaces pp0 unit 0 access-profile dradius
# Terapkan family pada interface arah pelanggan (sesuaikan)
set interfaces ge-0/0/1 unit 0 encapsulation ppp-over-ether`
    case 'vyos':
      return `# ===== PPPoE Server =====
set service pppoe-server interface eth1
set service pppoe-server access-concentrator 'D-Radius'
set service pppoe-server gateway-address 10.20.0.1
set service pppoe-server name-server 8.8.8.8
set service pppoe-server client-ip-pool dradius range 10.20.0.2-10.20.255.254`
    default:
      return ''
  }
})

// WireGuard (hanya VyOS pada mode WireGuard).
const vendorWgScript = computed(() => {
  if (guideType.value !== 'vyos') return ''
  return `# ===== WireGuard ke server D Radius =====
set interfaces wireguard wg0 address '${routerVpnIP.value || '<VPN_IP>'}/24'
set interfaces wireguard wg0 private-key <PRIVATE_KEY_ROUTER>
set interfaces wireguard wg0 peer dradius public-key '${effectiveServerPublicKey.value}'
set interfaces wireguard wg0 peer dradius endpoint '${effectiveServerPublicIP.value}:${vpnListenPort.value}'
set interfaces wireguard wg0 peer dradius allowed-ips '${vpnSubnet.value}'
set interfaces wireguard wg0 peer dradius persistent-keepalive 25
# Tampilkan public key router (daftarkan ke dashboard):
run show interfaces wireguard wg0 public-key`
})

// SNMP — dipakai dashboard untuk memantau status (pengganti heartbeat di non-MikroTik).
const vendorSnmpScript = computed(() => {
  const comm = routerData.value.snmp_community || 'public'
  switch (guideType.value) {
    case 'cisco':
    case 'ruijie':
      return `! ===== SNMP monitoring =====
snmp-server community ${comm} RO`
    case 'huawei':
      return `# ===== SNMP monitoring =====
snmp-agent
snmp-agent sys-info version v2c
snmp-agent community read cipher ${comm}`
    case 'juniper':
      return `# ===== SNMP monitoring =====
set snmp community ${comm} authorization read-only`
    case 'vyos':
      return `# ===== SNMP monitoring =====
set service snmp community ${comm} authorization ro`
    default:
      return ''
  }
})

// Penjelasan cara limit kecepatan paket diterapkan per vendor (dikirim otomatis oleh RADIUS).
const bandwidthNote = computed(() => {
  switch (guideType.value) {
    case 'huawei':
      return 'Limit kecepatan diterapkan otomatis oleh RADIUS via atribut Huawei (Input/Output-Average-Rate). Tidak perlu konfigurasi QoS manual.'
    case 'cisco':
    case 'ruijie':
      return 'RADIUS mengirim Filter-Id = nama paket + QoS policy AVPair. Buat satu policy-map shaping di router untuk tiap paket dengan nama sama seperti paket (spasi → underscore).'
    case 'juniper':
      return 'RADIUS mengirim Filter-Id = nama paket. Definisikan CoS/firewall-filter di router untuk tiap paket dengan nama sama (spasi → underscore).'
    case 'vyos':
      return 'VyOS/EdgeRouter (accel-ppp) membaca atribut Mikrotik-Rate-Limit. Aktifkan shaper accel-ppp agar limit kecepatan otomatis berlaku.'
    default:
      return ''
  }
})

async function fetchMikrotikConfig() {
  configLoading.value = true
  try {
    const { data: res } = await routerApi.mikrotikConfig(id)
    const cfg = res.data || res
    mikrotikConfig.value = cfg
    if (cfg.server_endpoint) serverPublicIP.value = cfg.server_endpoint
    if (cfg.server_public_key) serverPublicKey.value = cfg.server_public_key
    // Pilih mode otomatis sesuai cara router terdaftar (VPN vs IP Publik),
    // hanya untuk vendor yang mendukung WireGuard.
    if ((cfg.mode === 'wireguard' || cfg.mode === 'direct') && supportsWireguard.value) {
      connectionMode.value = cfg.mode
    }
  } catch {
    // fallback: use locally computed scripts
  }
  configLoading.value = false
}

// WireGuard hanya bisa didaftarkan bila server menjalankan WireGuard (punya server public key).
const wgServerReady = computed(() => !!effectiveServerPublicKey.value)

async function handleSubmitVpnKey() {
  const key = vpnKeyInput.value.trim()
  if (!key) return message.warning('Masukkan public key WireGuard router')
  if (!wgServerReady.value) {
    return message.error('WireGuard belum aktif di server. Gunakan mode IP Publik, atau aktifkan WireGuard di server terlebih dahulu.')
  }
  vpnKeySubmitting.value = true
  try {
    await routerApi.vpnKey(id, { public_key: key })
    routerData.value.vpn_public_key = key
    vpnKeyInput.value = ''
    message.success('VPN public key berhasil didaftarkan')
    // Refresh config after key registration
    fetchMikrotikConfig()
  } catch (e: any) {
    // Tampilkan alasan asli dari server (mis. "WireGuard tidak tersedia").
    message.error(e?.response?.data?.error || 'Gagal mendaftarkan VPN public key')
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

// --- IP Pool ---
const ipPool = ref<any>(null)
const ipPoolStats = ref<any>(null)
const showPoolModal = ref(false)
const savingPool = ref(false)
const poolForm = ref({ name: '', network: '', prefix_length: 24, gateway: '', dns_primary: '8.8.8.8', dns_secondary: '8.8.4.4', notes: '' })

function openPoolModal() {
  poolForm.value = { name: `Pool ${routerData.value.name || ''}`.trim(), network: '', prefix_length: 24, gateway: '', dns_primary: '8.8.8.8', dns_secondary: '8.8.4.4', notes: '' }
  showPoolModal.value = true
}

async function savePool() {
  if (!poolForm.value.name || !poolForm.value.network) { message.warning('Nama dan network wajib diisi'); return }
  savingPool.value = true
  try {
    const payload = { ...poolForm.value, network: `${poolForm.value.network}/${poolForm.value.prefix_length}`, router_id: id }
    await ipamApi.createPool(payload)
    message.success('IP Pool berhasil dibuat')
    showPoolModal.value = false
    fetchIpPool()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal membuat pool') }
  savingPool.value = false
}

async function fetchIpPool() {
  try {
    const { data: res } = await ipamApi.poolByRouter(id)
    ipPool.value = res.data || null
    ipPoolStats.value = res.stats || null
  } catch { /* pool belum dikonfigurasi */ }
}

// --- Bandwidth Monitoring ---
const activeTab = ref('history')
const interfaces = ref<any[]>([])
const loadingInterfaces = ref(false)
const interfacesError = ref('')
const selectedInterfaces = ref<string[]>([])
const isMonitoring = ref(false)
const bandwidthHistory = ref<Record<string, { in: number[], out: number[], timestamps: string[] }>>({})
const MAX_DATA_POINTS = 30
let ws: WebSocket | null = null

// Ambil statistik interface yang DIKIRIM (push) oleh router — tanpa SNMP/VPN.
// Router mengirim counter rx/tx; server menghitung bit/s dari deltanya.
async function loadPushStats() {
  try {
    const { data: res } = await routerApi.interfaceStats(id, 10)
    const d = res.data || res || {}
    interfacesError.value = ''
    if (Array.isArray(d.interfaces)) {
      // Sembunyikan sesi dinamis PPPoE (nama dibungkus <...>) agar dropdown rapi —
      // hanya interface fisik/statis (ether, sfp, bridge, vlan, dll).
      interfaces.value = d.interfaces
        .filter((n: string) => !n.startsWith('<'))
        .map((n: string) => ({ label: n, value: n }))
    }
    // Grafik HANYA untuk interface yang dipilih — cegah legenda penuh sesak
    // saat ada banyak interface (mis. ratusan sesi PPPoE).
    const sel = selectedInterfaces.value
    const hist: Record<string, { in: number[], out: number[], timestamps: string[] }> = {}
    if (sel.length) {
      for (const s of (d.samples || [])) {
        if (!sel.includes(s.iface)) continue
        if (!hist[s.iface]) hist[s.iface] = { in: [], out: [], timestamps: [] }
        hist[s.iface].in.push(s.rx_bps)
        hist[s.iface].out.push(s.tx_bps)
        hist[s.iface].timestamps.push(new Date(s.sampled_at).toLocaleTimeString('id-ID', { hour12: false }))
      }
    }
    bandwidthHistory.value = hist
    if (!d.interfaces || d.interfaces.length === 0) {
      interfacesError.value = 'Belum ada data dari router. Aktifkan scheduler "radius-ifmonitor" di router (lihat panduan Konfigurasi) — data muncul dalam ±30 detik.'
    }
  } catch (e: any) {
    interfacesError.value = e?.response?.data?.error || 'Gagal memuat statistik interface'
  }
}

// Dipakai tombol "Coba Lagi" & saat membuka tab Bandwidth.
async function fetchInterfaces() {
  if (loadingInterfaces.value) return
  loadingInterfaces.value = true
  await loadPushStats()
  loadingInterfaces.value = false
}

// Memilih interface langsung menampilkan grafiknya (tanpa harus klik Mulai dulu).
watch(selectedInterfaces, () => { if (!isMonitoring.value) loadPushStats() })

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

let pushPollTimer: ReturnType<typeof setInterval> | null = null

function startMonitoring() {
  if (!selectedInterfaces.value.length) {
    return message.warning('Pilih interface yang akan dipantau')
  }
  isMonitoring.value = true
  loadPushStats()
  if (pushPollTimer) clearInterval(pushPollTimer)
  // Poll data push tiap 5 detik (selaras dgn interval kirim router).
  pushPollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') loadPushStats()
  }, 5000)
}

function stopMonitoring() {
  if (pushPollTimer) { clearInterval(pushPollTimer); pushPollTimer = null }
  isMonitoring.value = false
}

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

    // Muat statistik interface yang dikirim router (push). Kartu monitoring selalu
    // tampil, jadi isi dropdown + data di sini (bukan via tab yang tidak dipakai).
    if (routerData.value.is_online && !isMonitoring.value) {
      loadPushStats()
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
  fetchIpPool()
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

    <!-- Connection & Router Info -->
    <div class="info-grid">
      <n-card class="info-card" :bordered="true" size="small">
        <template #header><span class="info-card-title">Informasi Koneksi</span></template>
        <n-descriptions :label-placement="isMobile ? 'top' : 'left'" :column="1" bordered size="small">
          <n-descriptions-item label="Mode Koneksi">
            <n-tag :type="usingVpn ? 'info' : 'success'" size="small">{{ usingVpn ? 'WireGuard VPN' : 'IP Publik' }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="RADIUS Address">
            <n-text code>{{ (usingVpn ? routerData.vpn_ip : serverPublicIP) || '-' }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="IP Router Terdeteksi">
            <n-text v-if="routerData.nas_ip" code>{{ routerData.nas_ip }}</n-text>
            <n-text v-else depth="3">Menunggu heartbeat / RADIUS</n-text>
          </n-descriptions-item>

          <!-- Baris khusus VPN — hanya saat WireGuard aktif -->
          <template v-if="usingVpn">
            <n-descriptions-item label="Status VPN">
              <n-tag :type="vpnStatus?.connected ? 'success' : 'error'" size="small">
                {{ vpnStatus?.connected ? 'Terhubung' : 'Terputus' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="Endpoint">
              <n-text v-if="vpnStatus?.endpoint" code>{{ vpnStatus.endpoint }}</n-text>
              <n-text v-else depth="3">-</n-text>
            </n-descriptions-item>
            <n-descriptions-item label="Handshake Terakhir">
              {{ vpnStatus?.latest_handshake ? timeAgo(vpnStatus.latest_handshake) : '-' }}
            </n-descriptions-item>
            <n-descriptions-item label="Transfer VPN">
              <span v-if="vpnStatus?.transfer_rx != null || vpnStatus?.transfer_tx != null">
                ↑ {{ formatBytes(vpnStatus?.transfer_tx || 0) }} / ↓ {{ formatBytes(vpnStatus?.transfer_rx || 0) }}
              </span>
              <n-text v-else depth="3">-</n-text>
            </n-descriptions-item>
          </template>

          <n-descriptions-item label="RADIUS Secret">
            <n-text code style="word-break: break-all; font-size: 12px">{{ routerData.radius_secret || '-' }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="CoA Port">
            {{ routerData.coa_port || '-' }}
          </n-descriptions-item>
          <n-descriptions-item label="Terakhir Terlihat">
            {{ routerData.last_seen_at ? timeAgo(routerData.last_seen_at) : 'Belum pernah' }}
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

    <!-- IP Pool Card -->
    <n-card class="info-card" :bordered="true" size="small">
      <template #header>
        <n-space :size="8" align="center">
          <n-icon :size="18" color="#10b981"><Wifi /></n-icon>
          <span class="info-card-title">IP Pool (IPAM)</span>
        </n-space>
      </template>
      <template #header-extra>
        <n-space :size="6">
          <n-button v-if="ipPool" size="tiny" secondary @click="router.push(`/ip-pools/${ipPool.id}`)">Detail Pool</n-button>
          <n-button v-if="!ipPool" size="tiny" type="primary" @click="openPoolModal">+ Buat Pool</n-button>
        </n-space>
      </template>

      <div v-if="ipPool">
        <n-descriptions :label-placement="isMobile ? 'top' : 'left'" :column="isMobile ? 1 : 2" bordered size="small">
          <n-descriptions-item label="Nama Pool">
            <n-text strong>{{ ipPool.name }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="Network">
            <n-text code>{{ ipPool.network }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="Gateway">
            <n-text code>{{ ipPool.gateway || '-' }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item label="DNS">
            <n-text>{{ [ipPool.dns_primary, ipPool.dns_secondary].filter(Boolean).join(', ') || '-' }}</n-text>
          </n-descriptions-item>
          <n-descriptions-item v-if="ipPoolStats" label="Penggunaan IP" :span="isMobile ? 1 : 2">
            <div class="progress-row">
              <n-progress
                type="line"
                :percentage="ipPool.total_ips ? Math.round((ipPoolStats.assigned / ipPool.total_ips) * 100) : 0"
                :status="ipPoolStats.assigned / ipPool.total_ips > 0.9 ? 'error' : ipPoolStats.assigned / ipPool.total_ips > 0.7 ? 'warning' : 'success'"
                :show-indicator="false"
                style="width: 120px"
              />
              <n-text style="font-size: 12px">
                {{ ipPoolStats.assigned }} / {{ ipPool.total_ips }} IP
                <n-text depth="3"> ({{ ipPoolStats.available }} tersedia)</n-text>
              </n-text>
            </div>
          </n-descriptions-item>
        </n-descriptions>
      </div>
      <n-alert v-else type="info" :bordered="false" style="font-size: 13px">
        Belum ada IP pool yang terhubung ke router ini.
        <n-button text type="primary" size="small" @click="openPoolModal" style="margin-left: 6px">Buat pool baru</n-button>
      </n-alert>
    </n-card>

    <!-- Bandwidth Monitoring Only -->
    <n-card class="info-card" :bordered="true" size="small">
      <template #header>
        <n-space :size="8" align="center">
          <n-icon :size="20" color="#6366f1"><Activity /></n-icon>
          <span class="info-card-title">Monitoring Bandwidth Real-time</span>
        </n-space>
      </template>
      
      <div class="bw-monitor">
        <n-alert v-if="interfacesError" type="warning" :bordered="false" style="margin-bottom: 14px; border-radius: 10px">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
            <span>{{ interfacesError }}</span>
            <n-button size="small" :loading="loadingInterfaces" @click="fetchInterfaces">Coba Lagi</n-button>
          </div>
        </n-alert>
        <div class="bw-controls">
          <n-space align="center" justify="space-between" style="width: 100%">
            <n-select
              v-model:value="selectedInterfaces"
              multiple
              filterable
              placeholder="Pilih interface untuk dipantau..."
              :options="interfaces"
              :loading="loadingInterfaces"
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
  <n-modal v-model:show="showConfigModal" preset="card" :style="{ maxWidth: '960px', width: '96vw', maxHeight: '92vh' }" :bordered="false" content-style="padding: 0; overflow-y: auto; max-height: calc(92vh - 76px)">
    <template #header>
      <div class="cfg-modal-header">
        <div class="cfg-modal-icon">
          <n-icon :size="26"><Settings /></n-icon>
        </div>
        <div>
          <div class="cfg-modal-title">Panduan Setup {{ vendorLabel }}</div>
          <div class="cfg-modal-subtitle">{{ isMikrotik ? 'Dari modem ISP, PPPoE pelanggan, hingga koneksi RADIUS' : 'Hubungkan ke RADIUS via IP Publik' }}</div>
        </div>
      </div>
    </template>
    <template #header-extra>
      <n-tag size="small" :bordered="false" type="info" round style="text-transform: uppercase; font-weight: 600">{{ routerData.name }}</n-tag>
    </template>

    <n-spin :show="configLoading">
    <div class="cfg-body">
      <n-tabs v-if="isMikrotik" v-model:value="activeGuideTab" type="segment" size="large" class="cfg-tabs" animated>

        <!-- ══════════ TAB 1: PERSIAPAN (Modem ISP → MikroTik) ══════════ -->
        <n-tab-pane name="persiapan" tab="1 · Persiapan">
          <p class="cfg-intro">Sambungkan internet dari ISP ke MikroTik. <strong>Ganti nama port &amp; akun ISP sesuai perangkat Anda.</strong></p>

          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">1</span>
              <div>
                <div class="cfg-step-title">Hubungkan Kabel</div>
                <div class="cfg-step-desc">Kabel LAN dari modem ISP → port <code>ether1</code> (WAN). Port lain (mis. <code>ether2</code>) untuk jaringan pelanggan.</div>
              </div>
            </div>
          </div>

          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">2</span>
              <div>
                <div class="cfg-step-title">Konfigurasi WAN</div>
                <div class="cfg-step-desc">Pilih salah satu sesuai mode modem ISP Anda.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ wanDhcpScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(wanDhcpScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
            <div class="cfg-code">
              <pre>{{ wanPppoeScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(wanPppoeScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">3</span>
              <div>
                <div class="cfg-step-title">NAT &amp; DNS</div>
                <div class="cfg-step-desc">Aktifkan NAT agar pelanggan bisa internet, lalu set DNS.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ wanNatScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(wanNatScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
            <div class="cfg-code">
              <pre>{{ wanDnsScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(wanDnsScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <div class="cfg-tab-nav">
            <span></span>
            <n-button type="primary" size="small" @click="activeGuideTab = 'ppp'">Lanjut: PPP Server →</n-button>
          </div>
        </n-tab-pane>

        <!-- ══════════ TAB 2: PPP SERVER ══════════ -->
        <n-tab-pane name="ppp" tab="2 · PPP Server">
          <p class="cfg-intro">Buat PPPoE Server agar pelanggan bisa dial. <strong>IP &amp; paket akhirnya diatur otomatis oleh RADIUS</strong> — pool di bawah hanya cadangan.</p>

          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">1</span>
              <div>
                <div class="cfg-step-title">Buat IP Pool</div>
                <div class="cfg-step-desc">Range IP cadangan untuk pelanggan. Sesuaikan dengan jaringan Anda.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ pppPoolScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(pppPoolScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">2</span>
              <div>
                <div class="cfg-step-title">Buat PPP Profile</div>
                <div class="cfg-step-desc">Profil default untuk sesi pelanggan (gateway &amp; DNS).</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ pppProfileScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(pppProfileScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">3</span>
              <div>
                <div class="cfg-step-title">Aktifkan PPPoE Server</div>
                <div class="cfg-step-desc">Jalankan PPPoE server di port yang menghadap pelanggan.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ pppoeServerScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(pppoeServerScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <div class="cfg-tab-nav">
            <n-button size="small" tertiary @click="activeGuideTab = 'persiapan'">← Persiapan</n-button>
            <n-button type="primary" size="small" @click="activeGuideTab = 'radius'">Lanjut: Koneksi RADIUS →</n-button>
          </div>
        </n-tab-pane>

        <!-- ══════════ TAB 3: KONEKSI RADIUS ══════════ -->
        <n-tab-pane name="radius" tab="3 · Koneksi RADIUS">
          <p class="cfg-intro">Hubungkan MikroTik ke server RADIUS agar autentikasi &amp; paket pelanggan terpusat.</p>

          <!-- Mode Selector -->
          <div class="cfg-mode-bar">
            <button class="cfg-mode-btn" :class="{ active: connectionMode === 'direct' }" @click="connectionMode = 'direct'">
              IP Publik <span class="cfg-mode-badge">ROS 6 &amp; 7</span>
            </button>
            <button class="cfg-mode-btn" :class="{ active: connectionMode === 'wireguard' }" @click="connectionMode = 'wireguard'">
              WireGuard VPN <span class="cfg-mode-badge">ROS 7.1+</span>
            </button>
          </div>

          <!-- Banner per mode -->
          <div v-if="connectionMode === 'direct'" class="cfg-banner cfg-banner--ok">
            <n-icon class="cfg-banner-svg" :size="18"><CircleCheck /></n-icon>
            <span>Buka port <strong>{{ mikrotikConfig?.radius_auth_port }}/{{ mikrotikConfig?.radius_acct_port }}</strong> (UDP) &amp; <strong>{{ coaPort }}</strong> (TCP) di firewall server.</span>
          </div>
          <div v-else-if="!serverPublicKey" class="cfg-banner cfg-banner--warn">
            <n-icon class="cfg-banner-svg" :size="18"><AlertTriangle /></n-icon>
            <span>Public key server belum tersedia. Lengkapi WireGuard di server terlebih dahulu.</span>
          </div>
          <div v-else class="cfg-banner cfg-banner--ok">
            <n-icon class="cfg-banner-svg" :size="18"><CircleCheck /></n-icon>
            <span>Semua nilai sudah terisi otomatis dari server. Salin &amp; jalankan berurutan.</span>
          </div>

          <!-- Referensi nilai (ringkas) -->
          <div class="cfg-info-grid">
            <div v-if="connectionMode === 'wireguard'" class="cfg-info-item">
              <span class="cfg-info-label">VPN IP Router</span>
              <span class="cfg-info-value cfg-info-mono">{{ routerVpnIP || '-' }}</span>
            </div>
            <div class="cfg-info-item">
              <span class="cfg-info-label">RADIUS Address</span>
              <span class="cfg-info-value cfg-info-mono">{{ effectiveRadiusAddress || '-' }}</span>
            </div>
            <div class="cfg-info-item">
              <span class="cfg-info-label">RADIUS Secret</span>
              <span class="cfg-info-value cfg-info-mono">{{ radiusSecret || '-' }}</span>
            </div>
            <div class="cfg-info-item">
              <span class="cfg-info-label">CoA Port</span>
              <span class="cfg-info-value cfg-info-mono">{{ coaPort || '-' }}</span>
            </div>
          </div>

          <!-- WireGuard Step 1: Interface -->
          <div v-if="connectionMode === 'wireguard'" class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">1</span>
              <div>
                <div class="cfg-step-title">Buat Interface WireGuard</div>
                <div class="cfg-step-desc">Interface <code>wg0</code> port {{ wgRouterPort }} + IP VPN di jaringan {{ vpnSubnet }}.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ wgInterfaceBlock1 }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(wgInterfaceBlock1)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
            <div class="cfg-code">
              <pre>{{ wgInterfaceBlock2 }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(wgInterfaceBlock2)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
            <div class="cfg-step-note">
              <n-icon class="cfg-note-svg" :size="16"><InfoCircle /></n-icon>
              <div>Cek public key MikroTik dengan <code>/interface wireguard print</code>, lalu daftarkan di bawah:</div>
            </div>
            <div class="cfg-key-form">
              <n-input v-model:value="vpnKeyInput" :placeholder="routerData.vpn_public_key || 'Paste public key MikroTik...'" size="small" style="flex: 1" :disabled="vpnKeySubmitting" />
              <n-button size="small" type="primary" :loading="vpnKeySubmitting" :disabled="!vpnKeyInput.trim() || !wgServerReady" @click="handleSubmitVpnKey">Daftarkan</n-button>
            </div>
            <div v-if="routerData.vpn_public_key" class="cfg-key-registered">
              <n-icon :size="14" :color="'#52c41a'"><Check /></n-icon>
              <span style="color: #52c41a; font-weight: 600; font-size: 12px">Key terdaftar</span>
              <span class="cfg-key-value">{{ routerData.vpn_public_key }}</span>
            </div>
          </div>

          <!-- WireGuard Step 2: Peer -->
          <div v-if="connectionMode === 'wireguard'" class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">2</span>
              <div>
                <div class="cfg-step-title">Tambah Peer Server</div>
                <div class="cfg-step-desc">Endpoint <code>{{ effectiveServerPublicIP }}:{{ vpnListenPort }}</code>, allowed <code>{{ vpnSubnet }}</code>.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ wgPeerScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(wgPeerScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <!-- RADIUS Client -->
          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">{{ connectionMode === 'direct' ? 1 : 3 }}</span>
              <div>
                <div class="cfg-step-title">Daftarkan Client RADIUS</div>
                <div class="cfg-step-desc">Arahkan ke <code>{{ effectiveRadiusAddress }}</code> &amp; aktifkan Incoming (CoA).</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ radiusBlock1 }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(radiusBlock1)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
            <div class="cfg-code">
              <pre>{{ radiusBlock2 }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(radiusBlock2)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <!-- Aktifkan use-radius -->
          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">{{ connectionMode === 'direct' ? 2 : 4 }}</span>
              <div>
                <div class="cfg-step-title">Aktifkan Use RADIUS di PPP</div>
                <div class="cfg-step-desc">Sesi PPPoE pelanggan kini diautentikasi oleh server RADIUS.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ pppoeBlock2 }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(pppoeBlock2)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <!-- Heartbeat -->
          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">{{ connectionMode === 'direct' ? 3 : 5 }}</span>
              <div>
                <div class="cfg-step-title">Monitoring Heartbeat <span class="cfg-opt">opsional</span></div>
                <div class="cfg-step-desc">Kirim status CPU, RAM, uptime ke dashboard tiap <code>{{ heartbeatInterval }}</code>.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ heartbeatScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(heartbeatScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <!-- Interface monitor (push, tanpa VPN) -->
          <div class="cfg-step">
            <div class="cfg-step-header">
              <span class="cfg-step-num">{{ connectionMode === 'direct' ? 4 : 6 }}</span>
              <div>
                <div class="cfg-step-title">Monitoring Bandwidth Interface <span class="cfg-opt">opsional</span></div>
                <div class="cfg-step-desc">Router mengirim counter rx/tx tiap 5 detik (hanya interface fisik, bukan sesi PPPoE) agar grafik trafik per-interface tampil — <strong>tanpa perlu VPN</strong>.</div>
              </div>
            </div>
            <div class="cfg-code">
              <pre>{{ ifMonitorScript }}</pre>
              <button class="cfg-copy-btn" @click="copyToClipboard(ifMonitorScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
            </div>
          </div>

          <div class="cfg-tab-nav">
            <n-button size="small" tertiary @click="activeGuideTab = 'ppp'">← PPP Server</n-button>
            <n-button size="small" @click="showConfigModal = false">Selesai</n-button>
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- ══════════ Panduan VENDOR LAIN (Cisco/Huawei/Juniper/VyOS/Ruijie) ══════════ -->
      <div v-else class="cfg-vendor">
        <p class="cfg-intro">
          Panduan untuk <strong>{{ vendorLabel }}</strong>. Hubungkan router ke server RADIUS.
          Sesuaikan nama interface dengan perangkat Anda.
        </p>

        <!-- Mode selector (hanya VyOS yang mendukung WireGuard) -->
        <div v-if="guideType === 'vyos'" class="cfg-mode-bar">
          <button class="cfg-mode-btn" :class="{ active: connectionMode === 'direct' }" @click="connectionMode = 'direct'">
            IP Publik
          </button>
          <button class="cfg-mode-btn" :class="{ active: connectionMode === 'wireguard' }" @click="connectionMode = 'wireguard'">
            WireGuard VPN <span class="cfg-mode-badge">VPN Tunnel</span>
          </button>
        </div>

        <!-- Referensi nilai -->
        <div class="cfg-info-grid">
          <div class="cfg-info-item">
            <span class="cfg-info-label">RADIUS Address</span>
            <span class="cfg-info-value cfg-info-mono">{{ radiusAddr }}</span>
          </div>
          <div class="cfg-info-item">
            <span class="cfg-info-label">RADIUS Secret</span>
            <span class="cfg-info-value cfg-info-mono">{{ radiusSecret || '-' }}</span>
          </div>
          <div class="cfg-info-item">
            <span class="cfg-info-label">Auth / Acct</span>
            <span class="cfg-info-value cfg-info-mono">{{ authPort }} / {{ acctPort }}</span>
          </div>
          <div class="cfg-info-item">
            <span class="cfg-info-label">CoA Port</span>
            <span class="cfg-info-value cfg-info-mono">{{ coaPort || '-' }}</span>
          </div>
        </div>

        <div class="cfg-banner cfg-banner--ok">
          <n-icon class="cfg-banner-svg" :size="18"><CircleCheck /></n-icon>
          <span>Buka port <strong>{{ authPort }}/{{ acctPort }}</strong> (UDP) &amp; <strong>{{ coaPort }}</strong> (UDP/TCP) ke IP server di firewall. Monitoring status memakai SNMP.</span>
        </div>

        <!-- WireGuard (VyOS, mode WireGuard) -->
        <div v-if="wgVisible" class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">1</span>
            <div>
              <div class="cfg-step-title">WireGuard ke Server</div>
              <div class="cfg-step-desc">Bangun terowongan ke server, lalu daftarkan public key router di bawah.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ vendorWgScript }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(vendorWgScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
          </div>
          <div class="cfg-key-form">
            <n-input v-model:value="vpnKeyInput" :placeholder="routerData.vpn_public_key || 'Paste public key WireGuard router...'" size="small" style="flex: 1" :disabled="vpnKeySubmitting" />
            <n-button size="small" type="primary" :loading="vpnKeySubmitting" :disabled="!vpnKeyInput.trim() || !wgServerReady" @click="handleSubmitVpnKey">Daftarkan</n-button>
          </div>
          <div v-if="routerData.vpn_public_key" class="cfg-key-registered">
            <n-icon :size="14" :color="'#52c41a'"><Check /></n-icon>
            <span style="color: #52c41a; font-weight: 600; font-size: 12px">Key terdaftar</span>
            <span class="cfg-key-value">{{ routerData.vpn_public_key }}</span>
          </div>
        </div>

        <!-- RADIUS -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">{{ vRadiusStep }}</span>
            <div>
              <div class="cfg-step-title">Konfigurasi RADIUS Client</div>
              <div class="cfg-step-desc">Daftarkan server RADIUS untuk autentikasi, accounting, dan CoA.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ vendorRadiusScript }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(vendorRadiusScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
          </div>
        </div>

        <!-- PPPoE -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">{{ vPppoeStep }}</span>
            <div>
              <div class="cfg-step-title">{{ guideType === 'vyos' ? 'PPPoE Server' : 'PPPoE / BNG' }}</div>
              <div class="cfg-step-desc">Aktifkan sesi PPPoE pelanggan dengan autentikasi RADIUS. Sesuaikan nama interface.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ vendorPppoeScript }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(vendorPppoeScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
          </div>
          <div v-if="bandwidthNote" class="cfg-step-note">
            <n-icon class="cfg-note-svg" :size="16"><InfoCircle /></n-icon>
            <div><strong>Limit kecepatan:</strong> {{ bandwidthNote }}</div>
          </div>
        </div>

        <!-- SNMP -->
        <div class="cfg-step">
          <div class="cfg-step-header">
            <span class="cfg-step-num">{{ vSnmpStep }}</span>
            <div>
              <div class="cfg-step-title">SNMP Monitoring</div>
              <div class="cfg-step-desc">Dashboard memantau status router via SNMP. Community: <code>{{ routerData.snmp_community || 'public' }}</code>.</div>
            </div>
          </div>
          <div class="cfg-code">
            <pre>{{ vendorSnmpScript }}</pre>
            <button class="cfg-copy-btn" @click="copyToClipboard(vendorSnmpScript)"><n-icon :size="14"><Copy /></n-icon> Salin</button>
          </div>
        </div>

        <div class="cfg-tab-nav">
          <span></span>
          <n-button size="small" @click="showConfigModal = false">Selesai</n-button>
        </div>
      </div>
    </div>
    </n-spin>
  </n-modal>

  <!-- Modal Buat IP Pool -->
  <n-modal v-model:show="showPoolModal" preset="card" title="Buat IP Pool Baru" :style="{ maxWidth: '480px', width: '95vw' }">
    <n-form label-placement="top" :show-require-mark="false">
      <n-grid :cols="2" :x-gap="12">
        <n-grid-item :span="2">
          <n-form-item label="Nama Pool *">
            <n-input v-model:value="poolForm.name" placeholder="Contoh: Pool Pelanggan Utara" />
          </n-form-item>
        </n-grid-item>
        <n-grid-item :span="2">
          <n-form-item label="Network Address *">
            <n-input-group>
              <n-input v-model:value="poolForm.network" placeholder="192.168.10.0" style="flex:1" />
              <n-input-group-label>/</n-input-group-label>
              <n-input-number v-model:value="poolForm.prefix_length" :min="8" :max="30" style="width:80px" />
            </n-input-group>
          </n-form-item>
        </n-grid-item>
        <n-grid-item>
          <n-form-item label="Gateway">
            <n-input v-model:value="poolForm.gateway" placeholder="192.168.10.1" />
          </n-form-item>
        </n-grid-item>
        <n-grid-item>
          <n-form-item label="DNS Primary">
            <n-input v-model:value="poolForm.dns_primary" placeholder="8.8.8.8" />
          </n-form-item>
        </n-grid-item>
        <n-grid-item>
          <n-form-item label="DNS Secondary">
            <n-input v-model:value="poolForm.dns_secondary" placeholder="8.8.4.4" />
          </n-form-item>
        </n-grid-item>
        <n-grid-item>
          <n-form-item label="Router">
            <n-input :value="routerData.name" disabled />
          </n-form-item>
        </n-grid-item>
        <n-grid-item :span="2">
          <n-form-item label="Catatan">
            <n-input v-model:value="poolForm.notes" type="textarea" :rows="2" placeholder="Opsional" />
          </n-form-item>
        </n-grid-item>
      </n-grid>
      <n-alert type="success" :bordered="false" style="margin-bottom:12px;font-size:12px">
        Pool akan otomatis ditautkan ke router <strong>{{ routerData.name }}</strong> dan semua IP dalam range <strong>{{ poolForm.network }}/{{ poolForm.prefix_length }}</strong> langsung dibuat — RADIUS siap assign IP ke pelanggan tanpa langkah tambahan.
      </n-alert>
      <n-space justify="end">
        <n-button @click="showPoolModal = false">Batal</n-button>
        <n-button type="primary" :loading="savingPool" @click="savePool">Buat Pool</n-button>
      </n-space>
    </n-form>
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

.cfg-body { padding: 16px 24px 18px; }
@media (max-width: 640px) { .cfg-body { padding: 12px 14px 14px; } }

/* Tabs */
.cfg-tabs :deep(.n-tabs-tab) { font-weight: 600; }
.cfg-intro {
  font-size: 13px;
  line-height: 1.55;
  opacity: 0.7;
  margin: 14px 0 16px;
}
.cfg-intro strong { opacity: 0.95; }

.cfg-tab-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(128, 128, 128, 0.1);
}

.cfg-opt {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #888;
  background: rgba(128, 128, 128, 0.12);
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 6px;
  vertical-align: middle;
}

.cfg-mode-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: var(--app-card-border, rgba(0,0,0,0.06));
  padding: 4px;
  border-radius: 10px;
}
.cfg-mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--app-text-muted, #888);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.cfg-mode-btn.active {
  background: var(--app-accent, #6366f1);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.cfg-mode-badge {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.75;
  letter-spacing: 0.3px;
}

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
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
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
  padding: 14px;
  margin-bottom: 12px;
  transition: border-color 0.2s;
}
.cfg-step .cfg-code { margin-top: 8px; }
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
