<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NTag,
  NText,
  useDialog,
  useMessage,
} from 'naive-ui'
import { customerApi, ontApi, routerApi, packageApi, odpApi } from '../../api'

import { formatDistanceToNow } from 'date-fns'
import { id as localeID } from 'date-fns/locale'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(true)
const customer = ref<any>({})
const invoices = ref<any[]>([])
const connections = ref<any[]>([])
const connTotal = ref(0)

// Edit Modals State
const showProfileModal = ref(false)
const showConnectionModal = ref(false)
const showBillingModal = ref(false)
const saving = ref(false)

const profileForm = ref({ name: '', phone: '', nik: '', address: '', email: '' })
const connForm = ref({
  router_id: null as string | null,
  connection_type: 'pppoe',
  pppoe_username: '',
  pppoe_password: '',
  odp_id: null as string | null,
  odp_port_id: null as string | null,
})
const connectionTypeOptions = [
  { label: 'PPPoE', value: 'pppoe' },
  { label: 'Static IP', value: 'static' },
  { label: 'DHCP', value: 'dhcp' },
  { label: 'FTTH (Fiber)', value: 'ftth' },
]
const odps = ref<any[]>([])
const odpPorts = ref<any[]>([])
const odpOptions = computed(() => odps.value.map((o: any) => ({ label: o.name, value: o.id })))
const odpPortOptions = computed(() => odpPorts.value.map((p: any) => ({
  label: `Port ${p.port_number}${p.notes ? ` – ${p.notes}` : ''}`,
  value: p.id,
  disabled: p.status === 'used' && p.customer_id !== customer.value?.id,
})))

async function onConnOdpChange(id: string | null) {
  connForm.value.odp_port_id = null
  odpPorts.value = []
  if (id) {
    try {
      const { data } = await odpApi.ports(id)
      odpPorts.value = data?.data || data || []
    } catch { /* ignore */ }
  }
}
const billForm = ref({ 
  package_id: null as string | null, 
  billing_type: 'fixed', 
  invoice_date: '', 
  billing_due_date: '', 
  join_date: '' 
})

const routers = ref<any[]>([])
const packages = ref<any[]>([])

const routerOptions = computed(() => routers.value.map(r => ({ label: r.name, value: r.id })))
const packageOptions = computed(() => packages.value.map(p => ({ label: `${p.name} (${fmtCurrency(p.price)})`, value: p.id })))

async function fetchDependencies() {
  try {
    const [rRes, pRes] = await Promise.all([
      routerApi.list({ per_page: 100 }),
      packageApi.list({ per_page: 100 })
    ])
    routers.value = rRes.data?.data || []
    packages.value = pRes.data?.data || []
  } catch { /* silent fail */ }
}

function openProfileEdit() {
  profileForm.value = {
    name: customer.value.name || '',
    phone: customer.value.phone || '',
    nik: customer.value.nik || '',
    address: customer.value.address || '',
    email: customer.value.email || '',
  }
  showProfileModal.value = true
}

async function openConnectionEdit() {
  connForm.value = {
    router_id: customer.value.router_id || null,
    connection_type: customer.value.connection?.type || 'pppoe',
    pppoe_username: customer.value.access?.pppoe_username || '',
    pppoe_password: customer.value.access?.pppoe_password || '',
    odp_id: customer.value.odp_port?.odp_id || null,
    odp_port_id: customer.value.odp_port_id || null,
  }
  showConnectionModal.value = true
  if (!odps.value.length) {
    try {
      const { data } = await odpApi.list()
      odps.value = data?.data || data || []
    } catch { /* ignore */ }
  }
  if (connForm.value.odp_id) {
    const keepPort = connForm.value.odp_port_id
    await onConnOdpChange(connForm.value.odp_id)
    connForm.value.odp_port_id = keepPort
  }
}

function openBillingEdit() {
  billForm.value = {
    package_id: customer.value.package_id || null,
    billing_type: customer.value.billing?.billing_type || 'fixed',
    invoice_date: (customer.value.billing?.invoice_date || customer.value.billing?.billing_date || '').toString().split('T')[0],
    billing_due_date: (customer.value.billing?.billing_due_date || customer.value.billing?.billing_deadline || '').toString().split('T')[0],
    join_date: (customer.value.billing?.join_date || '').toString().split('T')[0],
  }
  showBillingModal.value = true
}

async function handleSaveProfile() {
  saving.value = true
  try {
    await customerApi.updateProfile(id, profileForm.value)
    message.success('Profil diperbarui')
    showProfileModal.value = false
    fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleSaveConnection() {
  saving.value = true
  try {
    const isFtth = connForm.value.connection_type === 'ftth'
    const payload = {
      router_id: connForm.value.router_id,
      connection_type: connForm.value.connection_type,
      pppoe_username: connForm.value.pppoe_username,
      pppoe_password: connForm.value.pppoe_password,
      // '' = lepas port; backend otomatis melepas port bila tipe bukan ftth
      odp_port_id: isFtth ? (connForm.value.odp_port_id || '') : '',
    }
    await customerApi.updateAccess(id, payload)
    message.success('Akses koneksi diperbarui')
    showConnectionModal.value = false
    fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleSaveBilling() {
  saving.value = true
  try {
    const isDateRange = billForm.value.billing_type === 'date_range'
    const payload: Record<string, any> = {
      package_id: billForm.value.package_id,
      billing_type: billForm.value.billing_type,
      join_date: billForm.value.join_date || undefined,
    }
    if (!isDateRange) {
      payload.invoice_date = billForm.value.invoice_date
      payload.billing_due_date = billForm.value.billing_due_date
    }
    await customerApi.updateService(id, payload)
    message.success('Paket & layanan diperbarui')
    showBillingModal.value = false
    fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

const ontStatus = ref<any>(null)
const ontStatusLoading = ref(false)
const showOntModal = ref(false)
const wifiSaving = ref(false)
const wifiForm = ref({ ssid: '', password: '', security: '' })

const securityModeOptions = [
  { label: 'Tanpa Password (Terbuka)', value: 'None' },
  { label: 'WEP (Kurang Aman)', value: 'WEP' },
  { label: 'WPA (Aman)', value: 'WPA' },
  { label: 'WPA2 (Sangat Aman)', value: '11i' },
  { label: 'WPA/WPA2 (Kompatibel)', value: 'WPAand11i' },
]

async function fetchOntStatus(forceSync = false) {
  if (!customer.value.ont?.id) return
  if (forceSync) {
    ontStatusLoading.value = true
    try {
      await ontApi.sync(customer.value.ont.id)
      await fetchData()
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Gagal sinkronisasi ONT')
    } finally {
      ontStatusLoading.value = false
    }
  }
  ontStatus.value = customer.value.ont
  if (ontStatus.value?.wifi) {
    wifiForm.value.ssid = ontStatus.value.wifi.ssid || ''
    wifiForm.value.password = ontStatus.value.wifi.password || ''
    wifiForm.value.security = ontStatus.value.wifi.security || 'WPAand11i'
  }
}

async function handleSaveWifi() {
  if (!customer.value.ont?.id) return
  if (!wifiForm.value.ssid) { message.warning('SSID tidak boleh kosong'); return }
  wifiSaving.value = true
  try {
    await ontApi.wifi(customer.value.ont.id, {
      ssid: wifiForm.value.ssid,
      password: wifiForm.value.password,
      security: wifiForm.value.security,
    })
    message.success('Pengaturan WiFi diperbarui')
    setTimeout(() => fetchOntStatus(true), 1000)
  } catch (err: any) {
    message.error(err.response?.data?.error || 'Gagal memperbarui WiFi')
  } finally {
    wifiSaving.value = false
  }
}

async function handleRebootOnt() {
  if (!customer.value.ont?.id) return
  dialog.warning({
    title: 'Reboot ONT',
    content: 'Perangkat akan kehilangan koneksi internet selama beberapa menit. Lanjutkan?',
    positiveText: 'Reboot',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      try {
        await ontApi.reboot(customer.value.ont.id)
        message.success('Perintah reboot dikirim')
      } catch {
        message.error('Gagal mengirim perintah reboot')
      }
    },
  })
}

const nowTick = ref(Date.now())
const isMobile = ref(window.innerWidth < 640)
function onResize() { isMobile.value = window.innerWidth < 640 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

let tickTimer: ReturnType<typeof setInterval> | null = null

const id = route.params.id as string

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

function fmtUptime(sec: number) {
  if (!sec || sec < 0) return '-'
  if (sec < 60) return `${sec} detik`
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  if (days > 0) return `${days} hari ${hours > 0 ? hours + ' jam' : ''}`.trim()
  if (hours > 0) return `${hours} jam ${minutes > 0 ? minutes + ' menit' : ''}`.trim()
  return `${minutes} menit`
}

function liveUptime(row: any) {
  if (row.ended_at == null && row.started_at) {
    const seconds = Math.floor((nowTick.value - new Date(row.started_at).getTime()) / 1000)
    return fmtUptime(Math.max(0, seconds))
  }
  return fmtUptime(row.uptime || 0)
}

function fmtCurrency(value: number | string | null | undefined) {
  const amount = Number(value || 0)
  if (!amount) return '-'
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function fmtRelativeTime(value: string | null | undefined) {
  if (!value) return '-'
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return '-'
    return formatDistanceToNow(date, { addSuffix: true, locale: localeID }).replace('sekitar ', '')
  } catch { return '-' }
}

function fmtDateOnly(value: any) {
  if (!value || value === '0001-01-01T00:00:00Z') return '-'
  if (typeof value === 'number') return value.toString()
  if (typeof value !== 'string') return '-'
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!parts) return value
  return new Date(+parts[1], +parts[2] - 1, +parts[3]).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const billingTypeOptions = [
  { label: 'Tanggal Tetap (fixed)', value: 'fixed' },
  { label: 'Range Tanggal (otomatis)', value: 'date_range' },
]

function billingTypeLabel(type: string | null | undefined) {
  if (type === 'fixed') return 'Tanggal tetap'
  if (type === 'range') return 'Rentang tanggal'
  if (type === 'date_range') return 'Range Tanggal (otomatis)'
  return type || '-'
}

function paymentMethodLabel(m: string | null | undefined) {
  if (!m) return '-'
  const map: any = { bank_transfer: 'Transfer Bank', cash: 'Tunai', balance: 'Saldo', midtrans: 'Midtrans', xendit: 'Xendit', duitku: 'Duitku' }
  return map[m] || m
}

function mapCustomerData(raw: any) {
  const d = raw.data || raw || {}
  return {
    ...d,
    access: d.access || {},
    billing: d.billing || {},
    connection: d.connection || {},
    ont: d.ont || null,
    package: d.package || {},
    router: d.router || {}
  }
}

const monthlyPrice = computed(() => customer.value.package?.price ?? 0)
const currentInvoice = computed(() => customer.value.billing?.current_invoice || null)
const totalOutstanding = computed(() => (currentInvoice.value?.status === 'unpaid' || currentInvoice.value?.status === 'overdue') ? currentInvoice.value.total_amount : 0)

const customerFacts = computed(() => [
  { label: 'Email', value: customer.value.email || '-' },
  { label: 'Telepon', value: customer.value.phone || '-' },
  { label: 'NIK', value: customer.value.nik || '-' },
  { label: 'Alamat', value: customer.value.address || '-' },
])

const serviceFacts = computed(() => [
  { label: 'Router', value: customer.value.router?.name || '-' },
  { label: 'Tipe Koneksi', value: customer.value.connection?.type || '-' },
  { label: 'PPPoE User', value: customer.value.access?.pppoe_username || '-' },
  { label: 'PPPoE Pass', value: customer.value.access?.pppoe_password || '-' },
])

const billingFacts = computed(() => [
  { label: 'Tipe Tagihan', value: billingTypeLabel(customer.value.billing?.billing_type) },
  { label: 'Tgl Join', value: fmtDateOnly(customer.value.billing?.join_date) },
  { label: 'Tgl Invoice', value: fmtDateOnly(customer.value.billing?.invoice_date || customer.value.billing?.billing_date) },
  { label: 'Tgl Jatuh Tempo', value: fmtDateOnly(customer.value.billing?.billing_due_date || customer.value.billing?.billing_deadline) },
])

async function fetchData() {
  loading.value = true
  try {
    const res = await customerApi.get(id)
    const d = res.data?.data || res.data
    customer.value = mapCustomerData(d)
    invoices.value = d.invoices || (d.billing?.current_invoice ? [d.billing.current_invoice] : [])
    const history = d.connections || d.sessions || []
    if (history.length === 0 && d.connection?.active_session) {
      connections.value = [{ ip: d.connection.current_ip, status: d.connection.status, ...d.connection.active_session }]
    } else {
      connections.value = history
    }
    connTotal.value = connections.value.length
  } catch { message.error('Gagal memuat data pelanggan') }
  loading.value = false
}

async function handleIsolate() {
  dialog.warning({
    title: 'Isolir Pelanggan',
    content: 'Koneksi internet pelanggan akan diputus. Lanjutkan?',
    positiveText: 'Isolir',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      try {
        await customerApi.isolate(id)
        message.success('Pelanggan berhasil diisolir')
        fetchData()
      } catch (e: any) { message.error(e.response?.data?.error || 'Gagal mengisolir pelanggan') }
    },
  })
}

async function handleActivate() {
  dialog.warning({
    title: 'Aktifkan Pelanggan',
    content: 'Koneksi internet pelanggan akan diaktifkan kembali. Lanjutkan?',
    positiveText: 'Aktifkan',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      try {
        await customerApi.activate(id)
        message.success('Pelanggan berhasil diaktifkan')
        fetchData()
      } catch (e: any) { message.error(e.response?.data?.error || 'Gagal mengaktifkan pelanggan') }
    },
  })
}

onMounted(() => {
  fetchData(); fetchDependencies()
  tickTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
})
onUnmounted(() => { if (tickTimer) clearInterval(tickTimer) })
</script>

<template>
  <div class="detail-page">
    <!-- HERO -->
    <n-card :loading="loading" class="hero-card" size="small">
      <div class="hero-flex">
        <div class="hero-info">
          <div class="hero-eyebrow">
            Pelanggan • {{ customer.customer_code }}
            <span class="hero-status-badge" :class="customer.status">{{ customer.status === 'active' ? 'Aktif' : customer.status === 'isolated' ? 'Diisolir' : customer.status || '-' }}</span>
          </div>
          <h1 class="hero-title" style="text-transform: uppercase">{{ customer.name }}</h1>
          <p class="hero-subtitle">{{ customer.address || 'Alamat tidak tersedia' }}</p>
        </div>
        <div class="hero-actions">
          <n-button v-if="customer.status === 'active'" type="warning" size="small" @click="handleIsolate">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </template>
            Isolir Pelanggan
          </n-button>
          <n-button v-else-if="customer.status" type="success" size="small" @click="handleActivate">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </template>
            Aktifkan Pelanggan
          </n-button>
          <n-button size="small" @click="router.push('/customers')">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </template>
            Daftar Pelanggan
          </n-button>
        </div>
      </div>
    </n-card>

    <!-- METRICS -->
    <div class="dashboard-grid">
      <div class="metric-card">
        <div class="metric-label">Biaya Bulanan</div>
        <div class="metric-value">{{ fmtCurrency(monthlyPrice) }}</div>
        <div class="metric-foot">Paket {{ customer.package?.name || '-' }}</div>
      </div>
      <div class="metric-card" :class="{ 'metric-danger': totalOutstanding > 0 }">
        <div class="metric-label">Outstanding</div>
        <div class="metric-value">{{ fmtCurrency(totalOutstanding) }}</div>
        <div class="metric-foot">{{ totalOutstanding > 0 ? 'Ada tagihan belum lunas' : 'Semua tagihan lunas' }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Status Koneksi</div>
        <div class="metric-value">
          <n-tag :type="customer.connection?.status === 'online' ? 'success' : 'default'" round size="small">
            {{ customer.connection?.status?.toUpperCase() || 'OFFLINE' }}
          </n-tag>
        </div>
        <div class="metric-foot">{{ customer.connection?.current_ip || 'No IP' }}</div>
      </div>
    </div>

    <!-- UPPER GRID -->
    <div class="dashboard-grid">
      <n-card title="Informasi Profil" size="small" class="info-card">
        <template #header-extra>
          <n-button circle size="tiny" quaternary type="info" @click="openProfileEdit">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></template>
          </n-button>
        </template>
        <div class="fact-list">
          <div v-for="f in customerFacts" :key="f.label" class="fact-row">
            <span class="fact-label">{{ f.label }}</span>
            <span class="fact-value">{{ f.value }}</span>
          </div>
        </div>
      </n-card>

      <n-card title="Akses & Koneksi" size="small" class="info-card">
        <template #header-extra>
          <n-button circle size="tiny" quaternary type="info" @click="openConnectionEdit">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></template>
          </n-button>
        </template>
        <div class="fact-list">
          <div v-for="f in serviceFacts" :key="f.label" class="fact-row">
            <span class="fact-label">{{ f.label }}</span>
            <span class="fact-value">{{ f.value }}</span>
          </div>
        </div>
      </n-card>

      <n-card title="Paket & Layanan" size="small" class="info-card">
        <template #header-extra>
          <n-button circle size="tiny" quaternary type="info" @click="openBillingEdit">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></template>
          </n-button>
        </template>
        <div class="fact-list">
          <div v-for="f in billingFacts" :key="f.label" class="fact-row">
            <span class="fact-label">{{ f.label }}</span>
            <span class="fact-value">{{ f.value }}</span>
          </div>
        </div>
      </n-card>
    </div>

    <!-- LOWER GRID -->
    <div class="dashboard-grid">
      <!-- Perangkat ONT -->
      <n-card title="Perangkat ONT" size="small" class="info-card">
        <template #header-extra>
          <n-button v-if="customer.ont" circle size="tiny" quaternary type="info" @click="showOntModal = true; fetchOntStatus()" title="Kelola ONT">
            <template #icon><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></template>
          </n-button>
        </template>
        <template v-if="customer.ont">
          <div class="fact-list compact">
            <div class="fact-row"><span class="fact-label">IP WAN</span><span class="fact-value mono">{{ customer.ont.network?.wan_ip || '-' }}</span></div>
            <div class="fact-row"><span class="fact-label">WiFi</span><span class="fact-value">{{ customer.ont.wifi?.ssid || '-' }}</span></div>
            <div class="fact-row"><span class="fact-label">Device</span><span class="fact-value">{{ customer.ont.connected_hosts?.count ?? '-' }} terhubung</span></div>
          </div>
        </template>
        <div v-else class="ont-no-device">
          <span class="ont-acs-text">ACS: <code>{{ customer.access?.acs_url || '-' }}</code></span>
          <div class="ont-acs-hint">Tanpa Auth • Periodic Enable</div>
        </div>
      </n-card>

      <!-- Tagihan Terakhir -->
      <n-card title="Tagihan Terakhir" size="small" class="info-card">
        <div v-if="invoices.length" class="table-ui-wrap">
          <table class="table-ui">
            <thead><tr><th>Invoice</th><th style="text-align: right; padding-right: 16px">Total</th><th class="col-hide-mobile">Jatuh Tempo</th><th style="text-align: center">Status</th></tr></thead>
            <tbody>
              <tr v-for="inv in invoices.slice(0, 5)" :key="inv.id">
                <td>
                  <div class="cell-bold">{{ String(inv.period_month).padStart(2, '0') }}/{{ inv.period_year }}</div>
                  <div class="cell-sub">{{ inv.invoice_number || '-' }}</div>
                </td>
                <td style="text-align: right; padding-right: 16px">
                  <div class="cell-bold">{{ (inv.total_amount || 0).toLocaleString('id-ID') }}</div>
                  <div v-if="inv.payment_method" class="cell-sub">{{ paymentMethodLabel(inv.payment_method) }}</div>
                </td>
                <td class="col-hide-mobile">
                  <div class="cell-sub">{{ fmtDateOnly(inv.due_date) }}</div>
                  <div v-if="inv.paid_at" class="cell-sub" style="color: #16a34a">Lunas {{ fmtRelativeTime(inv.paid_at) }}</div>
                </td>
                <td style="text-align: center"><span class="pill-ui" :class="inv.status">{{ inv.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <n-empty v-else size="small" />
      </n-card>

      <!-- Riwayat Sesi -->
      <n-card title="Riwayat Sesi" size="small" class="info-card">
        <div v-if="connections.length" class="table-ui-wrap">
          <table class="table-ui">
            <thead>
              <tr>
                <th>IP & Perangkat</th>
                <th>Mulai & Durasi</th>
                <th style="text-align: right">Speed</th>
                <th class="col-hide-mobile" style="text-align: right">Total Traffic</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(conn, i) in connections.slice(0, 5)" :key="i">
                <td>
                  <div class="cell-bold mono-sm">{{ conn.ip || conn.framed_ip_address || customer.connection?.current_ip || '-' }}</div>
                  <div class="cell-sub mono-sm">{{ conn.caller_id || '-' }}</div>
                </td>
                <td>
                  <div class="cell-bold">{{ conn.started_at ? new Date(conn.started_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-' }}</div>
                  <div class="cell-sub">{{ conn.ended_at == null ? liveUptime(conn) : fmtUptime(conn.session_time || conn.uptime || 0) }}</div>
                </td>
                <td style="text-align: right">
                  <template v-if="!conn.ended_at && customer.connection?.realtime_download_mbps !== undefined">
                    <div class="speed-ui down">↓ {{ customer.connection.realtime_download_mbps.toFixed(1) }} M</div>
                    <div class="speed-ui up">↑ {{ customer.connection.realtime_upload_mbps.toFixed(2) }} M</div>
                  </template>
                  <span v-else class="cell-sub">Ended</span>
                </td>
                <td class="col-hide-mobile" style="text-align: right">
                  <div class="cell-sub">↓ {{ fmtBytes(conn.output_octets || conn.download || 0) }}</div>
                  <div class="cell-sub">↑ {{ fmtBytes(conn.input_octets || conn.upload || 0) }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <n-empty v-else size="small" />
      </n-card>
    </div>

    <!-- MODALS -->
    <n-modal v-model:show="showOntModal" preset="card" title="Manajemen Perangkat ONT" style="width: 700px">
      <div v-if="ontStatus">
        <n-grid :cols="2" :x-gap="24">
          <n-grid-item>
            <div class="modal-label-small">PENGATURAN WIFI</div>
            <n-form label-placement="top" size="small">
              <n-form-item label="SSID"><n-input v-model:value="wifiForm.ssid" /></n-form-item>
              <n-form-item label="Security"><n-select v-model:value="wifiForm.security" :options="securityModeOptions" /></n-form-item>
              <n-form-item label="Password"><n-input v-model:value="wifiForm.password" type="password" show-password-toggle /></n-form-item>
              <n-button type="primary" block :loading="wifiSaving" @click="handleSaveWifi">Simpan Perubahan</n-button>
            </n-form>
          </n-grid-item>
          <n-grid-item>
            <div class="modal-label-small">INFORMASI SISTEM</div>
            <div class="fact-list">
              <div class="fact-row"><span class="fact-label">SN</span><span class="fact-value mono">{{ ontStatus.device?.serial_number || customer.ont?.serial_number || '-' }}</span></div>
              <div class="fact-row"><span class="fact-label">Uptime</span><span class="fact-value">{{ ontStatus.device?.uptime ? fmtUptime(ontStatus.device.uptime) : '-' }}</span></div>
              <div class="fact-row"><span class="fact-label">Software</span><span class="fact-value">{{ ontStatus.device?.software_version || '-' }}</span></div>
              <div class="fact-row"><span class="fact-label">Sync</span><span class="fact-value">{{ fmtRelativeTime(ontStatus.device?.last_inform) }}</span></div>
            </div>
            <n-space vertical style="margin-top: 24px">
              <n-button secondary block @click="handleRebootOnt">Reboot Device</n-button>
              <n-button secondary block type="info" @click="fetchOntStatus(true)">Refresh Data</n-button>
            </n-space>
          </n-grid-item>
        </n-grid>
      </div>
    </n-modal>

    <n-modal v-model:show="showProfileModal" preset="card" title="Edit Profil" style="width: min(500px, 95vw)">
      <n-form label-placement="top">
        <n-form-item label="Nama"><n-input v-model:value="profileForm.name" style="text-transform: uppercase" @input="(v: string) => profileForm.name = v.toUpperCase()" /></n-form-item>
        <n-form-item label="Telepon"><n-input v-model:value="profileForm.phone" /></n-form-item>
        <n-form-item label="NIK"><n-input v-model:value="profileForm.nik" /></n-form-item>
        <n-form-item label="Alamat"><n-input v-model:value="profileForm.address" type="textarea" /></n-form-item>
        <n-button type="primary" block :loading="saving" @click="handleSaveProfile">Simpan</n-button>
      </n-form>
    </n-modal>

    <n-modal v-model:show="showConnectionModal" preset="card" title="Edit Koneksi" style="width: min(500px, 95vw)">
      <n-form label-placement="top">
        <n-form-item label="Tipe Koneksi"><n-select v-model:value="connForm.connection_type" :options="connectionTypeOptions" /></n-form-item>
        <n-form-item label="Router"><n-select v-model:value="connForm.router_id" :options="routerOptions" filterable /></n-form-item>
        <n-form-item label="PPPoE User"><n-input v-model:value="connForm.pppoe_username" /></n-form-item>
        <n-form-item label="PPPoE Pass"><n-input v-model:value="connForm.pppoe_password" type="password" show-password-toggle /></n-form-item>
        <template v-if="connForm.connection_type === 'ftth'">
          <n-form-item label="ODP"><n-select v-model:value="connForm.odp_id" :options="odpOptions" clearable filterable placeholder="Pilih ODP" @update:value="onConnOdpChange" /></n-form-item>
          <n-form-item label="Port ODP"><n-select v-model:value="connForm.odp_port_id" :options="odpPortOptions" clearable filterable placeholder="Pilih port" :disabled="!connForm.odp_id" /></n-form-item>
        </template>
        <n-button type="primary" block :loading="saving" @click="handleSaveConnection">Simpan</n-button>
      </n-form>
    </n-modal>

    <n-modal v-model:show="showBillingModal" preset="card" title="Edit Layanan" style="width: min(500px, 95vw)">
      <n-form label-placement="top">
        <n-form-item label="Paket"><n-select v-model:value="billForm.package_id" :options="packageOptions" filterable /></n-form-item>
        <n-form-item label="Tipe Tagihan"><n-select v-model:value="billForm.billing_type" :options="billingTypeOptions" /></n-form-item>
        <template v-if="billForm.billing_type !== 'date_range'">
          <n-form-item label="Tgl Invoice"><input class="native-date-input" type="date" v-model="billForm.invoice_date" /></n-form-item>
          <n-form-item label="Tgl Jatuh Tempo"><input class="native-date-input" type="date" v-model="billForm.billing_due_date" /></n-form-item>
        </template>
        <n-alert v-if="billForm.billing_type === 'date_range'" type="info" :bordered="false" style="margin-bottom: 12px">
          Billing akan mengikuti Setingan Administrasi → Tenant → Konfigurasi Billing
        </n-alert>
        <n-form-item label="Tgl Join"><input class="native-date-input" type="date" v-model="billForm.join_date" /></n-form-item>
        <n-button type="primary" block :loading="saving" @click="handleSaveBilling">Simpan</n-button>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped>
.detail-page { display: flex; flex-direction: column; gap: 16px; padding: 12px; max-width: 1400px; margin: 0 auto; }
.hero-card { border-radius: 8px; border: 1px solid var(--app-card-border); }
.hero-flex { display: flex; justify-content: space-between; align-items: flex-start; }
.hero-eyebrow { font-size: 11px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase; margin-bottom: 4px; }
.hero-title { margin: 0; font-size: 24px; font-weight: 700; color: var(--app-text-primary); }
.hero-subtitle { margin: 4px 0 0; font-size: 14px; color: var(--app-text-secondary); }
.hero-actions { display: flex; gap: 8px; align-items: flex-start; }
.hero-status-badge { display: inline-block; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 4px; margin-left: 6px; vertical-align: middle; text-transform: uppercase; letter-spacing: 0.04em; }
.hero-status-badge.active { background: rgba(34,197,94,0.15); color: #22c55e; }
.hero-status-badge.isolated { background: rgba(249,115,22,0.15); color: #f97316; }
.hero-status-badge.inactive { background: rgba(148,163,184,0.12); color: var(--app-text-muted); }

.dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.metric-card { background: var(--detail-card-bg); padding: 16px; border-radius: 8px; border: 1px solid var(--app-card-border); }
.metric-label { font-size: 10px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase; margin-bottom: 4px; }
.metric-value { font-size: 20px; font-weight: 700; color: var(--app-text-primary); }
.metric-foot { font-size: 12px; color: var(--app-text-muted); margin-top: 4px; }
.metric-danger { border-left: 4px solid #ef4444; }

.info-card { border-radius: 8px; border: 1px solid var(--app-card-border); }
.fact-list { display: flex; flex-direction: column; }
.fact-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--detail-divider); }
.fact-row:last-child { border-bottom: none; }
.fact-label { font-size: 12px; color: var(--app-text-muted); }
.fact-value { font-size: 12px; font-weight: 600; color: var(--app-text-primary); }
.fact-value.mono { font-family: monospace; }

.ont-no-device { padding: 4px 0; }
.ont-acs-text { font-size: 11px; color: var(--app-text-secondary); word-break: break-all; }
.ont-acs-text code { font-size: 11px; }
.ont-acs-hint { font-size: 10px; color: var(--app-text-muted); margin-top: 4px; }

.table-ui-wrap { width: 100%; overflow-x: auto; }
.table-ui { width: 100%; border-collapse: collapse; font-size: 12px; }
.table-ui th { text-align: left; padding-bottom: 8px; color: var(--app-text-muted); text-transform: uppercase; font-size: 10px; border-bottom: 1px solid var(--detail-divider); }
.table-ui td { padding: 10px 0; border-bottom: 1px solid var(--detail-row-border); vertical-align: top; }
.cell-bold { font-weight: 700; color: var(--app-text-primary); }
.cell-sub { font-size: 11px; color: var(--app-text-muted); }
.mono-sm { font-family: monospace; font-size: 11px; }
.pill-ui { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
.pill-ui.paid { background: rgba(5,150,105,0.15); color: #10b981; }
.pill-ui.unpaid { background: rgba(234,88,12,0.15); color: #f97316; }
.speed-ui { font-size: 11px; font-weight: 700; }
.speed-ui.down { color: #22c55e; }
.speed-ui.up { color: #3b82f6; }

.modal-label-small { font-size: 11px; font-weight: 800; color: var(--app-text-muted); margin-bottom: 12px; border-bottom: 1px solid var(--detail-divider); padding-bottom: 4px; }
.native-date-input { width: 100%; padding: 6px 10px; border: 1px solid var(--app-card-border); border-radius: 4px; font-size: 14px; color: var(--app-text-primary); background: var(--detail-input-bg); outline: none; box-sizing: border-box; }
.native-date-input:focus { border-color: var(--app-accent); }

/* dark (default) */
:root {
  --detail-card-bg: rgba(255,255,255,0.03);
  --detail-divider: rgba(0,229,255,0.08);
  --detail-row-border: rgba(0,229,255,0.04);
  --detail-pill-bg: rgba(255,255,255,0.05);
  --detail-input-bg: rgba(255,255,255,0.05);
}
/* light */
html:not(.dark) {
  --detail-card-bg: #ffffff;
  --detail-divider: #f1f5f9;
  --detail-row-border: #f8fafc;
  --detail-pill-bg: #f8fafc;
  --detail-input-bg: #ffffff;
}

@media (max-width: 1024px) { .dashboard-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .hero-flex { flex-direction: column; gap: 12px; }
  .hero-title { font-size: 18px; }
  .hero-actions { flex-wrap: wrap; }
  .fact-row { align-items: flex-start; gap: 8px; }
  .fact-value { text-align: right; word-break: break-word; max-width: 60%; }
  .table-ui { font-size: 11px; }
  .table-ui th, .table-ui td { padding-right: 4px; }
  .col-hide-mobile { display: none; }
}
</style>
