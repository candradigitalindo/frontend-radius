<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NTag, NButton, NSpace, NDataTable, NDescriptions, NDescriptionsItem,
  NGrid, NGridItem, NStatistic, NModal, NForm, NFormItem, NInput,
  NInputNumber, NSelect, NPopconfirm, NText, useMessage, NAlert, NPagination
} from 'naive-ui'
import { oltApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const olt = ref<any>({})
const ponPorts = ref<any[]>([])
const snmpMonitorLoading = ref(false)
const snmpMonitorError = ref('')
const snmpMonitorRaw = ref<any>(null)
const onuPage = ref(1)
const id = route.params.id as string

const isMobile = ref(window.innerWidth < 640)
const isTablet = ref(window.innerWidth >= 640 && window.innerWidth < 1024)
const isDesktop = ref(window.innerWidth >= 1024)
function onResize() {
  isMobile.value = window.innerWidth < 640
  isTablet.value = window.innerWidth >= 640 && window.innerWidth < 1024
  isDesktop.value = window.innerWidth >= 1024
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// PON Port modal
const showPortModal = ref(false)
const portSaving = ref(false)
const editPortId = ref<string | null>(null)
const portForm = ref({ port_number: 1, description: '', status: 'active', sfp_rx_power: null as number | null })

function resetPortForm() {
  portForm.value = { port_number: ponPorts.value.length + 1, description: '', status: 'active', sfp_rx_power: null }
  editPortId.value = null
}

const statusMap: Record<string, { type: any; label: string }> = {
  active: { type: 'success', label: 'Aktif' },
  inactive: { type: 'default', label: 'Nonaktif' },
  maintenance: { type: 'warning', label: 'Maintenance' },
}

const portStatusOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
  { label: 'Fault', value: 'fault' },
]

const ponPortCols = [
  { title: 'Port #', key: 'port_number', width: 80, align: 'center' as const },
  { title: 'Deskripsi', key: 'description', render: (r: any) => r.description || '-' },
  { title: 'SFP Rx (dBm)', key: 'sfp_rx_power', width: 110, render: (r: any) => r.sfp_rx_power != null ? r.sfp_rx_power.toFixed(1) : '-' },
  {
    title: 'Status', key: 'status', width: 100,
    render: (r: any) => {
      const map: Record<string, any> = { active: 'success', inactive: 'default', fault: 'error' }
      return h(NTag, { type: map[r.status] || 'default', size: 'small' }, () => r.status)
    }
  },
  {
    title: 'Aksi', key: 'actions', width: 90,
    render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEditPort(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDeletePort(r.id) }, {
        trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }),
        default: () => 'Yakin hapus port ini?',
      }),
    ])
  },
]

function openEditPort(p: any) {
  editPortId.value = p.id
  portForm.value = { port_number: p.port_number, description: p.description || '', status: p.status || 'active', sfp_rx_power: p.sfp_rx_power ?? null }
  showPortModal.value = true
}

async function handleSavePort() {
  portSaving.value = true
  try {
    if (editPortId.value) {
      await oltApi.updatePonPort(id, editPortId.value, { description: portForm.value.description || undefined, status: portForm.value.status, sfp_rx_power: portForm.value.sfp_rx_power })
      message.success('Port diperbarui')
    } else {
      if (portForm.value.port_number <= 0) { message.warning('Port number harus positif'); portSaving.value = false; return }
      await oltApi.createPonPort(id, { port_number: portForm.value.port_number, description: portForm.value.description || undefined, sfp_rx_power: portForm.value.sfp_rx_power })
      message.success('Port ditambahkan')
    }
    showPortModal.value = false; resetPortForm(); fetchPorts()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan port') }
  portSaving.value = false
}

async function handleDeletePort(portId: string) {
  try { await oltApi.deletePonPort(id, portId); message.success('Port dihapus'); fetchPorts() }
  catch { message.error('Gagal menghapus port') }
}

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await oltApi.get(id)
    olt.value = res.data || res
  } catch { message.error('OLT tidak ditemukan'); router.push('/olts') }
  loading.value = false
}

async function fetchPorts() {
  try {
    const { data: res } = await oltApi.ponPorts(id)
    ponPorts.value = res.data || []
  } catch { /* ignore */ }
}

function formatPercent(value: number | null) {
  return value == null ? '-' : `${Math.round(value)}%`
}

function formatDbm(value: number | null) {
  return value == null ? '-' : `${value.toFixed(1)} dBm`
}

function formatBytes(value: number | null) {
  if (value == null || value < 0) return '-'
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatKilobytes(value: number | null) {
  if (value == null) return '-'
  return formatBytes(value * 1024)
}

function formatUptimeHoursMinutes(seconds: number | null, fallback?: string | null) {
  if (seconds != null && !Number.isNaN(seconds)) {
    const totalMinutes = Math.floor(seconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) return `${hours} jam ${minutes} menit`
    return `${minutes} menit`
  }
  if (!fallback) return '-'
  const dayMatch = fallback.match(/(\d+)\s*hari/)
  const hourMatch = fallback.match(/(\d+)\s*jam/)
  const minuteMatch = fallback.match(/(\d+)\s*menit/)
  const totalHours = (dayMatch ? Number(dayMatch[1]) * 24 : 0) + (hourMatch ? Number(hourMatch[1]) : 0)
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  if (totalHours > 0) return `${totalHours} jam ${minutes} menit`
  if (minutes > 0) return `${minutes} menit`
  return fallback
}

function formatMonitorValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(1)
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  return String(value)
}

async function fetchSnmpMonitor() {
  snmpMonitorLoading.value = true
  snmpMonitorError.value = ''
  try {
    const { data: res } = await oltApi.snmpMonitor(id)
    snmpMonitorRaw.value = res.data || res
    onuPage.value = 1
  } catch (e: any) {
    snmpMonitorRaw.value = null
    snmpMonitorError.value = e?.response?.data?.error || 'Monitoring SNMP belum tersedia'
  }
  snmpMonitorLoading.value = false
}

const snmpMonitor = computed(() => {
  const source = snmpMonitorRaw.value || {}
  const system = source.system || {}
  const resources = source.resources || {}
  const interfaces = Array.isArray(source.interfaces) ? source.interfaces : []
  const onuSummary = source.onu_summary || {}
  const onus = Array.isArray(onuSummary.onus) ? onuSummary.onus : []
  const onlineOnu = Number(onuSummary.online ?? 0) || 0
  const totalOnu = Number(onuSummary.total ?? onus.length) || 0
  const activePon = Array.from(new Set(onus.map((item: any) => item.pon_port).filter(Boolean))).length

  return {
    status: source.status || null,
    uptime: source.uptime || null,
    uptimeSeconds: source.uptime_seconds ?? null,
    lastPoll: source.polled_at || null,
    sysName: system.name || null,
    sysDescr: system.description || null,
    contact: system.contact || null,
    location: system.location || null,
    firmware: system.firmware || null,
    cpuUsage: resources.cpu_percent ?? null,
    memoryUsage: resources.memory_percent ?? null,
    memoryUsedKb: resources.memory_used_kb ?? null,
    memoryTotalKb: resources.memory_total_kb ?? null,
    temperature: resources.temperature ?? null,
    totalOnu,
    onlineOnu,
    offlineOnu: totalOnu - onlineOnu,
    activePon,
    onus,
    source,
  }
})

const hasSnmpMonitor = computed(() => {
  const monitor = snmpMonitor.value
  return !!(monitor.status || monitor.sysName || monitor.onus.length)
})

const snmpSummaryCards = computed(() => {
  const monitor = snmpMonitor.value
  return [
    { label: 'CPU', value: formatPercent(monitor.cpuUsage) },
    { label: 'Memory', value: formatPercent(monitor.memoryUsage) },
    { label: 'Temperature', value: monitor.temperature != null ? `${monitor.temperature.toFixed(1)} °C` : '-' },
    { label: 'ONU Online', value: monitor.onlineOnu != null ? String(monitor.onlineOnu) : '-' },
  ].filter((item) => item.value !== '-')
})

const onuCols = [
  { title: 'Index', key: 'index', width: 70, align: 'center' as const },
  { title: 'PON', key: 'pon_port', width: 70, align: 'center' as const },
  { title: 'Serial', key: 'serial' },
  {
    title: 'Status', key: 'status', width: 90,
    render: (r: any) => h(NTag, { size: 'small', type: r.status === 'online' ? 'success' : 'default', bordered: false }, () => r.status || '-')
  },
]

const onlineOnus = computed(() => snmpMonitor.value.onus.filter((item: any) => item.status === 'online'))
const onuPageSize = 10
const onuPageCount = computed(() => Math.max(1, Math.ceil(onlineOnus.value.length / onuPageSize)))
const currentOnuPage = computed(() => Math.min(onuPage.value, onuPageCount.value))
const pagedOnlineOnus = computed(() => {
  const start = (currentOnuPage.value - 1) * onuPageSize
  return onlineOnus.value.slice(start, start + onuPageSize)
})

function handleOnuPageChange(page: number) {
  onuPage.value = page
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

const syncing = ref(false)
async function handleSync() {
  syncing.value = true
  try {
    await oltApi.sync(id)
    message.success('Data OLT berhasil disinkronisasi dari SNMP')
    await fetchData()
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Gagal sinkronisasi')
  }
  syncing.value = false
}

onMounted(async () => {
  await Promise.all([fetchData(), fetchPorts(), fetchSnmpMonitor()])
})
</script>

<template>
  <n-space vertical :size="16">
    <!-- Header -->
    <n-card>
      <template #header>
        <div class="detail-header">
          <n-button text @click="router.push('/olts')">← OLT</n-button>
          <span class="detail-name">{{ olt.name }}</span>
          <n-tag v-if="olt.status" :type="(statusMap[olt.status] || statusMap.inactive).type" size="small" round>
            {{ (statusMap[olt.status] || statusMap.inactive).label }}
          </n-tag>
          <n-button size="small" secondary :loading="syncing" @click="handleSync" style="margin-left:auto">
            Sinkronisasi dari SNMP
          </n-button>
        </div>
      </template>
    </n-card>

    <!-- Stats -->
    <n-grid :cols="isMobile ? 2 : 4" :x-gap="12" :y-gap="12">
      <n-grid-item>
        <n-card><n-statistic label="Total PON Ports" :value="olt.total_pon_ports || 0" /></n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Port Terdaftar" :value="ponPorts.length" /></n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Port Aktif" :value="ponPorts.filter(p => p.status === 'active').length" /></n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Port Fault" :value="ponPorts.filter(p => p.status === 'fault').length" /></n-card>
      </n-grid-item>
    </n-grid>

    <!-- Info -->
    <n-card title="Informasi OLT" :loading="loading">
      <n-descriptions :label-placement="isMobile ? 'top' : 'left'" bordered :column="isMobile ? 1 : 2">
        <n-descriptions-item label="Nama">{{ olt.name }}</n-descriptions-item>
        <n-descriptions-item label="IP Address">{{ olt.ip_address }}</n-descriptions-item>
        <n-descriptions-item label="Router">
          <n-tag v-if="olt.router" :type="olt.router.is_online ? 'success' : 'default'" size="small" round>
            {{ olt.router.name }} ({{ olt.router.vpn_ip }})
          </n-tag>
          <span v-else>-</span>
        </n-descriptions-item>
        <n-descriptions-item label="SNMP Community">{{ olt.snmp_community || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Vendor">{{ olt.vendor || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Model">{{ olt.model || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Serial Number">{{ olt.serial_number || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Catatan" :span="isMobile ? 1 : 2">{{ olt.notes || '-' }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- PON Ports -->
    <n-card title="PON Ports">
      <template #header-extra>
        <n-button type="primary" size="small" @click="resetPortForm(); showPortModal = true">+ Tambah Port</n-button>
      </template>

      <n-data-table v-if="isDesktop" :columns="ponPortCols" :data="ponPorts" :bordered="false" size="small" />

      <div v-else>
        <div v-if="!ponPorts.length" style="text-align: center; padding: 24px 0">
          <n-text depth="3">Belum ada port terdaftar</n-text>
        </div>
        <div v-else class="port-card-grid">
          <div v-for="p in ponPorts" :key="p.id" class="port-card">
            <div class="port-card-head">
              <span class="port-card-name">Port #{{ p.port_number }}</span>
              <div style="display: flex; align-items: center; gap: 6px">
                <n-tag :type="p.status === 'active' ? 'success' : p.status === 'fault' ? 'error' : 'default'" size="small">{{ p.status }}</n-tag>
                <div class="port-card-actions" @click.stop>
                  <n-button size="tiny" type="warning" @click="openEditPort(p)">Edit</n-button>
                  <n-popconfirm @positive-click="handleDeletePort(p.id)">
                    <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                    Yakin hapus port ini?
                  </n-popconfirm>
                </div>
              </div>
            </div>
            <div class="port-card-body">
              <div v-if="p.description" class="port-card-row"><span class="port-label">Deskripsi</span><span>{{ p.description }}</span></div>
              <div class="port-card-row"><span class="port-label">SFP Rx</span><span>{{ p.sfp_rx_power != null ? p.sfp_rx_power.toFixed(1) + ' dBm' : '-' }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </n-card>

    <n-card title="Monitoring SNMP" :loading="snmpMonitorLoading">
      <template #header-extra>
        <n-space size="small">
          <n-tag v-if="snmpMonitor.status" :type="String(snmpMonitor.status).toLowerCase() === 'online' ? 'success' : 'default'" size="small" round>
            {{ snmpMonitor.status }}
          </n-tag>
          <n-button size="small" @click="fetchSnmpMonitor">Refresh</n-button>
        </n-space>
      </template>

      <n-alert v-if="snmpMonitorError" type="warning" :bordered="false" style="margin-bottom: 12px">
        {{ snmpMonitorError }}
      </n-alert>

      <template v-if="hasSnmpMonitor">
        <n-grid v-if="snmpSummaryCards.length" :cols="isMobile ? 2 : 4" :x-gap="12" :y-gap="12" style="margin-bottom: 14px">
          <n-grid-item v-for="item in snmpSummaryCards" :key="item.label">
            <div class="snmp-stat-card">
              <div class="snmp-stat-label">{{ item.label }}</div>
              <div class="snmp-stat-value">{{ item.value }}</div>
            </div>
          </n-grid-item>
        </n-grid>

        <n-descriptions :label-placement="isMobile ? 'top' : 'left'" bordered :column="isMobile ? 1 : 2">
          <n-descriptions-item label="Uptime">{{ formatUptimeHoursMinutes(snmpMonitor.uptimeSeconds, snmpMonitor.uptime as string | null) }}</n-descriptions-item>
          <n-descriptions-item label="Firmware">{{ formatMonitorValue(snmpMonitor.firmware) }}</n-descriptions-item>
          <n-descriptions-item label="Lokasi">{{ formatMonitorValue(snmpMonitor.location) }}</n-descriptions-item>
          <n-descriptions-item label="Contact">{{ formatMonitorValue(snmpMonitor.contact) }}</n-descriptions-item>
          <n-descriptions-item label="Memory">{{ snmpMonitor.memoryUsedKb != null && snmpMonitor.memoryTotalKb != null ? `${formatKilobytes(snmpMonitor.memoryUsedKb)} / ${formatKilobytes(snmpMonitor.memoryTotalKb)}` : '-' }}</n-descriptions-item>
          <n-descriptions-item label="Last Poll">{{ formatDate(snmpMonitor.lastPoll as string) }}</n-descriptions-item>
          <n-descriptions-item label="Status ONU">{{ `${snmpMonitor.onlineOnu}/${snmpMonitor.totalOnu} online` }}</n-descriptions-item>
        </n-descriptions>

        <div class="snmp-section">
          <div class="snmp-section-head">
            <div>
              <div class="snmp-section-title">ONU Summary</div>
              <div class="snmp-section-subtitle">Menampilkan ONU online. Jika data banyak, daftar dipaginasi per 10 item.</div>
            </div>
            <n-tag size="small" type="success" round>{{ snmpMonitor.onlineOnu }}/{{ snmpMonitor.totalOnu }} online</n-tag>
          </div>

          <n-data-table
            v-if="isDesktop"
            :columns="onuCols"
            :data="pagedOnlineOnus"
            :bordered="false"
            size="small"
            :max-height="320"
            :scroll-x="520"
          />

          <div v-else class="snmp-card-grid">
            <div v-if="!onlineOnus.length" class="snmp-empty">Belum ada data ONU online</div>
            <div v-for="item in pagedOnlineOnus" :key="item.index" class="snmp-mini-card">
              <div class="snmp-mini-head">
                <strong>{{ item.serial || `ONU ${item.index}` }}</strong>
                 <n-tag size="small" :type="item.status === 'online' ? 'success' : 'default'" :bordered="false">{{ item.status || '-' }}</n-tag>
              </div>
              <div class="snmp-mini-row"><span class="snmp-mini-label">Index</span><span>{{ item.index }}</span></div>
              <div class="snmp-mini-row"><span class="snmp-mini-label">PON Port</span><span>{{ item.pon_port || '-' }}</span></div>
            </div>
          </div>

          <div v-if="onlineOnus.length > onuPageSize" class="snmp-pagination">
            <n-pagination
              :page="currentOnuPage"
              :page-count="onuPageCount"
              :page-size="onuPageSize"
              @update:page="handleOnuPageChange"
            />
          </div>
        </div>
      </template>

      <n-text v-else depth="3">Belum ada data monitoring SNMP untuk OLT ini.</n-text>
    </n-card>
  </n-space>

  <!-- Port Modal -->
  <n-modal v-model:show="showPortModal" preset="card" :title="editPortId ? 'Edit Port' : 'Tambah Port'" :style="{ maxWidth: '450px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 120">
      <n-form-item v-if="!editPortId" label="Port Number">
        <n-input-number v-model:value="portForm.port_number" :min="1" style="width: 100%" />
      </n-form-item>
      <n-form-item label="Deskripsi"><n-input v-model:value="portForm.description" placeholder="Deskripsi port" /></n-form-item>
      <n-form-item label="SFP Rx Power">
        <n-input-number v-model:value="portForm.sfp_rx_power" :precision="1" placeholder="dBm" style="width: 100%" clearable />
      </n-form-item>
      <n-form-item v-if="editPortId" label="Status">
        <n-select v-model:value="portForm.status" :options="portStatusOptions" filterable />
      </n-form-item>
      <n-space justify="end">
        <n-button @click="showPortModal = false">Batal</n-button>
        <n-button type="primary" :loading="portSaving" @click="handleSavePort">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.detail-name {
  font-size: 20px;
  font-weight: 600;
  text-transform: uppercase;
}
@media (max-width: 639px) {
  .detail-name {
    font-size: 16px;
  }
}
.port-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .port-card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.port-card {
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.09));
  border-radius: 8px;
  padding: 10px 12px;
}
.port-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.port-card-name {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.port-card-actions {
  display: flex;
  gap: 4px;
}
.port-card-body {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.port-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.port-label {
  color: var(--n-text-color-3, #999);
  font-size: 12px;
}
.snmp-stat-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  background: rgba(248, 250, 252, 0.72);
}
.snmp-stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--n-text-color-3, #7a869a);
  margin-bottom: 6px;
  font-weight: 600;
}
.snmp-stat-value {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 700;
  color: #334155;
}
.snmp-section {
  margin-top: 16px;
}
.snmp-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.snmp-section-title {
  font-size: 14px;
  font-weight: 700;
}
.snmp-section-subtitle {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
}
.snmp-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.snmp-mini-card {
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.09));
  border-radius: 8px;
  padding: 10px 12px;
}
.snmp-mini-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.snmp-mini-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.snmp-mini-row + .snmp-mini-row {
  margin-top: 4px;
}
.snmp-mini-label {
  color: var(--n-text-color-3, #999);
  font-size: 12px;
}
.snmp-empty {
  text-align: center;
  padding: 16px 0;
  color: var(--n-text-color-3, #999);
}
.snmp-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
@media (max-width: 639px) {
  .snmp-stat-card {
    padding: 12px 14px;
  }
  .snmp-stat-value {
    font-size: 22px;
  }
}
</style>
