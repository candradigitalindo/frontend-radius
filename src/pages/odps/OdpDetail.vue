<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NTag, NButton, NSpace, NDataTable, NDescriptions, NDescriptionsItem,
  NGrid, NGridItem, NStatistic, NModal, NForm, NFormItem, NInput,
  NInputNumber, NSelect, NPopconfirm, NText, NAlert, useMessage
} from 'naive-ui'
import { odpApi, customerApi } from '../../api'
import { calcOdpBudget, calcInstallationLoss, signalStatusLabel, SPLITTER_LOSS, FIBER_LOSS_PER_KM, PIGTAIL_LOSS, CONNECTOR_LOSS, SPLICE_LOSS, type OdpCalcInput } from '../../composables/useLinkBudget'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const odp = ref<any>({})
const ports = ref<any[]>([])
const customers = ref<any[]>([])
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

// Port modal
const showPortModal = ref(false)
const portSaving = ref(false)
const editPortId = ref<string | null>(null)
const portForm = ref({ port_number: 1, customer_id: null as string | null, status: 'available', notes: '' })

function resetPortForm() {
  portForm.value = { port_number: ports.value.length + 1, customer_id: null, status: 'available', notes: '' }
  editPortId.value = null
}

const customerOptions = computed(() => customers.value.map((c: any) => ({ label: `${c.customer_code} - ${c.name}`, value: c.id })))

const portStatusOptions = [
  { label: 'Tersedia', value: 'available' },
  { label: 'Terpakai', value: 'used' },
  { label: 'Rusak', value: 'broken' },
]

const portCols = [
  { title: 'Port #', key: 'port_number', width: 80, align: 'center' as const },
  {
    title: 'Status', key: 'status', width: 100,
    render: (r: any) => {
      const map: Record<string, any> = { available: 'success', used: 'info', broken: 'error' }
      const labels: Record<string, string> = { available: 'Tersedia', used: 'Terpakai', broken: 'Rusak' }
      return h(NTag, { type: map[r.status] || 'default', size: 'small' }, () => labels[r.status] || r.status)
    }
  },
  { title: 'Pelanggan', key: 'customer', render: (r: any) => r.customer?.name || '-' },
  { title: 'ONT', key: 'ont', render: (r: any) => r.ont ? `${r.ont.serial_number || '-'} (${r.ont.vendor || '-'})` : '-' },
  { title: 'Catatan', key: 'notes', render: (r: any) => r.notes || '-' },
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
  portForm.value = { port_number: p.port_number, customer_id: p.customer_id, status: p.status || 'available', notes: p.notes || '' }
  showPortModal.value = true
}

async function handleSavePort() {
  portSaving.value = true
  try {
    if (editPortId.value) {
      await odpApi.updatePort(id, editPortId.value, { customer_id: portForm.value.customer_id, status: portForm.value.status, notes: portForm.value.notes || undefined })
      message.success('Port diperbarui')
    } else {
      if (portForm.value.port_number <= 0) { message.warning('Port number harus positif'); portSaving.value = false; return }
      await odpApi.createPort(id, { port_number: portForm.value.port_number, customer_id: portForm.value.customer_id, notes: portForm.value.notes || undefined })
      message.success('Port ditambahkan')
    }
    showPortModal.value = false; resetPortForm(); fetchPorts()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan port') }
  portSaving.value = false
}

async function handleDeletePort(portId: string) {
  try { await odpApi.deletePort(id, portId); message.success('Port dihapus'); fetchPorts() }
  catch { message.error('Gagal menghapus port') }
}

const usedPorts = computed(() => ports.value.filter(p => p.status === 'used').length)
const availablePorts = computed(() => ports.value.filter(p => p.status === 'available').length)
const occupancy = computed(() => {
  if (!odp.value.total_ports) return 0
  return Math.round((usedPorts.value / odp.value.total_ports) * 100)
})

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await odpApi.get(id)
    odp.value = res.data || res
  } catch { message.error('ODP tidak ditemukan'); router.push('/odps') }
  loading.value = false
}

async function fetchPorts() {
  try {
    const { data: res } = await odpApi.ports(id)
    ports.value = res.data || []
  } catch { /* ignore */ }
}

async function fetchCustomers() {
  try {
    const { data: res } = await customerApi.list()
    customers.value = res.data || []
  } catch { /* ignore */ }
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

onMounted(async () => {
  await Promise.all([fetchData(), fetchPorts(), fetchCustomers()])
  // Init power calc from ODP data after fetch
  initPowerCalcFromOdp()
})

// ─── Power per Port Splitter Calculator (100% ratio) ──────
const splitterOptions = Object.keys(SPLITTER_LOSS).map(k => ({ label: k, value: k }))

const powerCalc = ref({
  oltPower: -8 as number,
  cableLength: 0 as number,
  pigtailCount: 2 as number,
  connectorCount: 2 as number,
  spliceCount: 2 as number,
  splitterType: '1:8' as string,
})

// ─── Rantai ODC (via splitter) ──────
// splitter_chain: indeks 0 = ODC induk langsung, terakhir = root di PON port.
const odcChain = computed(() => (odp.value.splitter_chain || []) as any[])
const odcChainLoss = computed(() =>
  odcChain.value.reduce((sum: number, s: any) => sum + (SPLITTER_LOSS[s.splitter_type] ?? 0), 0))
// Power efektif masuk area ODP setelah melewati semua ODC di rantai
const powerAfterOdc = computed(() => {
  const d = odp.value
  if (d.root_sfp_rx_power == null) return null
  return d.root_sfp_rx_power - odcChainLoss.value
})
const chainPath = computed(() => {
  const d = odp.value
  if (!odcChain.value.length) return ''
  const parts: string[] = []
  if (d.root_olt_name) parts.push(`${d.root_olt_name}${d.root_pon_port_number != null ? ' (PON ' + d.root_pon_port_number + ')' : ''}`)
  for (const s of [...odcChain.value].reverse()) parts.push(`${s.name} (${s.splitter_type})`)
  parts.push(`${d.name}${d.splitter_line ? ' · Line ' + d.splitter_line : ''}`)
  return parts.join(' → ')
})

function initPowerCalcFromOdp() {
  const d = odp.value
  if (d.pon_port_sfp_rx_power != null) powerCalc.value.oltPower = d.pon_port_sfp_rx_power
  else if (powerAfterOdc.value != null) powerCalc.value.oltPower = Math.round(powerAfterOdc.value * 100) / 100
  if (d.cable_length != null) powerCalc.value.cableLength = d.cable_length
  if (d.pigtail_count != null) powerCalc.value.pigtailCount = d.pigtail_count
  if (d.connector_count != null) powerCalc.value.connectorCount = d.connector_count
  if (d.splice_count != null) powerCalc.value.spliceCount = d.splice_count
  if (d.splitter_type != null) powerCalc.value.splitterType = d.splitter_type
  else if (d.splitter_ratio != null) powerCalc.value.splitterType = d.splitter_ratio
}

const powerCalcResult = computed(() => {
  const c = powerCalc.value
  const cableLoss = (c.cableLength / 1000) * FIBER_LOSS_PER_KM
  const pigtailLoss = c.pigtailCount * PIGTAIL_LOSS
  const connectorLoss = c.connectorCount * CONNECTOR_LOSS
  const spliceLoss = c.spliceCount * SPLICE_LOSS
  const totalInstallLoss = cableLoss + pigtailLoss + connectorLoss + spliceLoss
  const afterInstall = c.oltPower - totalInstallLoss
  const splitterLoss = SPLITTER_LOSS[c.splitterType] || 10.38
  const portCount = parseInt(c.splitterType.split(':')[1] || '8')
  const perPort = afterInstall - splitterLoss
  let status: 'good' | 'warning' | 'critical' = 'good'
  if (perPort < -28) status = 'critical'
  else if (perPort < -24) status = 'warning'
  return {
    cableLoss,
    pigtailLoss,
    connectorLoss,
    spliceLoss,
    totalInstallLoss,
    afterInstall,
    splitterLoss,
    portCount,
    perPort,
    status,
  }
})

// Link Budget Calculator — mode estafet pakai SFP PON port langsung;
// mode via-ODC pakai power root dikurangi loss rantai ODC.
const budgetResult = computed(() => {
  const d = odp.value
  let startPower: number | null = null
  if (d.pon_port_sfp_rx_power != null) startPower = d.pon_port_sfp_rx_power
  else if (powerAfterOdc.value != null) startPower = powerAfterOdc.value
  if (startPower == null) return null
  const input: OdpCalcInput = {
    ratioPercent: d.ratio_percent || 10,
    splitterType: d.splitter_type || '1:8',
    installation: {
      cableLength: d.cable_length || 0,
      pigtailCount: d.pigtail_count ?? 2,
      connectorCount: d.connector_count ?? 1,
      spliceCount: d.splice_count ?? 2,
    },
    splitterInstallation: {
      cableLength: d.splitter_cable_length ?? 1,
      pigtailCount: d.splitter_pigtail_count ?? 2,
      connectorCount: d.splitter_connector_count ?? 2,
      spliceCount: d.splitter_splice_count ?? 2,
    },
  }
  return calcOdpBudget(startPower, input, d.sequence || 1)
})
</script>

<template>
  <n-space vertical :size="16">
    <!-- Header -->
    <n-card>
      <template #header>
        <div class="detail-header">
          <n-button text @click="router.push('/odps')">← ODP</n-button>
          <span class="detail-name">{{ odp.name }}</span>
          <n-tag v-if="odp.olt" type="info" size="small">OLT: {{ odp.olt.name }}</n-tag>
          <n-tag v-else-if="odp.splitter_name" type="info" size="small">
            ODC: {{ odp.splitter_name }}{{ odp.splitter_line ? ' · Line ' + odp.splitter_line : '' }}
          </n-tag>
          <n-tag v-if="odp.splitter_ratio" type="default" size="small">Splitter: {{ odp.splitter_ratio }}</n-tag>
        </div>
      </template>
    </n-card>

    <!-- Stats -->
    <n-grid :cols="isMobile ? 2 : 4" :x-gap="12" :y-gap="12">
      <n-grid-item>
        <n-card><n-statistic label="Total Port" :value="odp.total_ports || 0" /></n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Terpakai" :value="usedPorts" /></n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Tersedia" :value="availablePorts" /></n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Okupansi">
          <template #default>
            <span :style="{ color: occupancy > 80 ? '#d03050' : occupancy > 60 ? '#f0a020' : '#18a058' }">{{ occupancy }}%</span>
          </template>
        </n-statistic></n-card>
      </n-grid-item>
    </n-grid>

    <!-- Info -->
    <n-card title="Informasi ODP" :loading="loading">
      <n-descriptions :label-placement="isMobile ? 'top' : 'left'" bordered :column="isMobile ? 1 : 2">
        <n-descriptions-item label="Nama">{{ odp.name }}</n-descriptions-item>
        <n-descriptions-item label="Alamat">{{ odp.address || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Induk">
          <template v-if="odp.splitter_name">
            ODC: {{ odp.splitter_name }}{{ odp.splitter_line ? ' · Line ' + odp.splitter_line : '' }}
          </template>
          <template v-else>{{ odp.olt?.name || '-' }}</template>
        </n-descriptions-item>
        <n-descriptions-item label="Splitter Ratio">{{ odp.splitter_ratio || '-' }}</n-descriptions-item>
        <n-descriptions-item v-if="chainPath" label="Jalur ke OLT" :span="isMobile ? 1 : 2">{{ chainPath }}</n-descriptions-item>
        <n-descriptions-item label="Total Port">{{ odp.total_ports }}</n-descriptions-item>
        <n-descriptions-item label="Okupansi">{{ occupancy }}%</n-descriptions-item>
        <n-descriptions-item label="Latitude">{{ odp.latitude ?? '-' }}</n-descriptions-item>
        <n-descriptions-item label="Longitude">{{ odp.longitude ?? '-' }}</n-descriptions-item>
        <n-descriptions-item label="Catatan" :span="isMobile ? 1 : 2">{{ odp.notes || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Dibuat">{{ formatDate(odp.created_at) }}</n-descriptions-item>
        <n-descriptions-item label="Diperbarui">{{ formatDate(odp.updated_at) }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- Power per Port Splitter Calculator (100% ratio) -->
    <n-card title="Perhitungan Power per Port Splitter (Ratio 100%)">
      <template #header-extra>
        <n-tag type="info" size="small" round>Kalkulator</n-tag>
      </template>

      <!-- Input form -->
      <n-grid :cols="isMobile ? 1 : 3" :x-gap="16" :y-gap="12" style="margin-bottom: 20px">
        <n-grid-item>
          <div class="calc-field">
            <label class="calc-label">OLT Power (dBm)</label>
            <n-input-number v-model:value="powerCalc.oltPower" :step="0.5" :precision="2" size="small" style="width: 100%" />
            <span class="calc-hint">SFP Rx Power dari OLT</span>
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="calc-field">
            <label class="calc-label">Panjang Kabel (meter)</label>
            <n-input-number v-model:value="powerCalc.cableLength" :min="0" :step="100" size="small" style="width: 100%" />
            <span class="calc-hint">Loss: {{ FIBER_LOSS_PER_KM }} dB/km</span>
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="calc-field">
            <label class="calc-label">Tipe Splitter</label>
            <n-select v-model:value="powerCalc.splitterType" :options="splitterOptions" size="small" />
            <span class="calc-hint">Loss: {{ (SPLITTER_LOSS[powerCalc.splitterType] || 0).toFixed(2) }} dB</span>
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="calc-field">
            <label class="calc-label">Jumlah Pigtail</label>
            <n-input-number v-model:value="powerCalc.pigtailCount" :min="0" :max="10" size="small" style="width: 100%" />
            <span class="calc-hint">Loss: {{ PIGTAIL_LOSS }} dB/pcs</span>
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="calc-field">
            <label class="calc-label">Jumlah Konektor</label>
            <n-input-number v-model:value="powerCalc.connectorCount" :min="0" :max="10" size="small" style="width: 100%" />
            <span class="calc-hint">Loss: {{ CONNECTOR_LOSS }} dB/pcs</span>
          </div>
        </n-grid-item>
        <n-grid-item>
          <div class="calc-field">
            <label class="calc-label">Jumlah Splice</label>
            <n-input-number v-model:value="powerCalc.spliceCount" :min="0" :max="20" size="small" style="width: 100%" />
            <span class="calc-hint">Loss: {{ SPLICE_LOSS }} dB/pcs</span>
          </div>
        </n-grid-item>
      </n-grid>

      <!-- Result -->
      <n-alert
        :type="powerCalcResult.status === 'good' ? 'success' : powerCalcResult.status === 'warning' ? 'warning' : 'error'"
        :bordered="false"
        style="margin-bottom: 16px"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px">
          <div>
            <div style="font-size: 13px; opacity: 0.7">Power per Port ({{ powerCalc.splitterType }}, {{ powerCalcResult.portCount }} port)</div>
            <div style="font-size: 22px; font-weight: 800">{{ powerCalcResult.perPort.toFixed(2) }} dBm</div>
          </div>
          <n-tag
            :type="powerCalcResult.status === 'good' ? 'success' : powerCalcResult.status === 'warning' ? 'warning' : 'error'"
            size="small" round
          >
            {{ signalStatusLabel(powerCalcResult.status).label }}
          </n-tag>
        </div>
      </n-alert>

      <!-- Breakdown table -->
      <n-descriptions :label-placement="isMobile ? 'top' : 'left'" bordered :column="isMobile ? 1 : 2" size="small">
        <n-descriptions-item label="OLT Power">
          <span style="font-weight: 600">{{ powerCalc.oltPower.toFixed(2) }} dBm</span>
        </n-descriptions-item>
        <n-descriptions-item label="Loss Kabel">
          <span class="calc-loss">- {{ powerCalcResult.cableLoss.toFixed(2) }} dB</span>
          <span class="calc-detail">({{ powerCalc.cableLength }}m × {{ FIBER_LOSS_PER_KM }} dB/km)</span>
        </n-descriptions-item>
        <n-descriptions-item label="Loss Pigtail">
          <span class="calc-loss">- {{ powerCalcResult.pigtailLoss.toFixed(2) }} dB</span>
          <span class="calc-detail">({{ powerCalc.pigtailCount }} × {{ PIGTAIL_LOSS }} dB)</span>
        </n-descriptions-item>
        <n-descriptions-item label="Loss Konektor">
          <span class="calc-loss">- {{ powerCalcResult.connectorLoss.toFixed(2) }} dB</span>
          <span class="calc-detail">({{ powerCalc.connectorCount }} × {{ CONNECTOR_LOSS }} dB)</span>
        </n-descriptions-item>
        <n-descriptions-item label="Loss Splice">
          <span class="calc-loss">- {{ powerCalcResult.spliceLoss.toFixed(2) }} dB</span>
          <span class="calc-detail">({{ powerCalc.spliceCount }} × {{ SPLICE_LOSS }} dB)</span>
        </n-descriptions-item>
        <n-descriptions-item label="Total Loss Instalasi">
          <span style="font-weight: 700; color: #d03050">- {{ powerCalcResult.totalInstallLoss.toFixed(2) }} dB</span>
        </n-descriptions-item>
        <n-descriptions-item label="Power Masuk Splitter">
          <span style="font-weight: 600">{{ powerCalcResult.afterInstall.toFixed(2) }} dBm</span>
        </n-descriptions-item>
        <n-descriptions-item label="Loss Splitter">
          <span class="calc-loss">- {{ powerCalcResult.splitterLoss.toFixed(2) }} dB</span>
          <span class="calc-detail">({{ powerCalc.splitterType }})</span>
        </n-descriptions-item>
        <n-descriptions-item label="Power per Port" :span="isMobile ? 1 : 2">
          <span :style="{ color: signalStatusLabel(powerCalcResult.status).color, fontWeight: 800, fontSize: '18px' }">
            {{ powerCalcResult.perPort.toFixed(2) }} dBm
          </span>
          <span style="margin-left: 8px; font-size: 12px; opacity: 0.5">
            × {{ powerCalcResult.portCount }} port
          </span>
        </n-descriptions-item>
      </n-descriptions>

      <div class="calc-note">
        <strong>Keterangan:</strong>
        Sinyal baik &gt; -24 dBm · Perhatian -24 s/d -28 dBm · Kritis &lt; -28 dBm.
        Perhitungan mengasumsikan ratio 100% (semua sinyal masuk langsung ke splitter tanpa cascading).
      </div>
    </n-card>

    <!-- Link Budget (cascaded) -->
    <n-card v-if="budgetResult" title="Link Budget FTTH">
      <n-alert :type="budgetResult.signalStatus === 'good' ? 'success' : budgetResult.signalStatus === 'warning' ? 'warning' : 'error'" :bordered="false" style="margin-bottom: 16px">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px">
          <span>Power per Port Splitter: <strong>{{ budgetResult.outSplitter.toFixed(2) }} dBm</strong></span>
          <n-tag :type="budgetResult.signalStatus === 'good' ? 'success' : budgetResult.signalStatus === 'warning' ? 'warning' : 'error'" size="small" round>
            {{ signalStatusLabel(budgetResult.signalStatus).label }}
          </n-tag>
        </div>
      </n-alert>
      <n-descriptions :label-placement="isMobile ? 'top' : 'left'" bordered :column="isMobile ? 1 : 2" size="small">
        <n-descriptions-item label="Power Masuk">{{ budgetResult.inputPower.toFixed(2) }} dBm</n-descriptions-item>
        <n-descriptions-item label="Loss Instalasi">{{ budgetResult.installationLoss.toFixed(2) }} dB</n-descriptions-item>
        <n-descriptions-item label="Rasio">{{ odp.ratio_percent || 10 }}% / {{ 100 - (odp.ratio_percent || 10) }}%</n-descriptions-item>
        <n-descriptions-item label="Loss Rasio (diteruskan)">{{ budgetResult.ratioLoss.toFixed(2) }} dB</n-descriptions-item>
        <n-descriptions-item label="Power ke ODP Berikutnya">{{ budgetResult.outputPower.toFixed(2) }} dBm</n-descriptions-item>
        <n-descriptions-item label="In Splitter">{{ budgetResult.inSplitter.toFixed(2) }} dBm</n-descriptions-item>
        <n-descriptions-item label="Splitter">{{ odp.splitter_type || '1:8' }} ({{ budgetResult.splitterLoss.toFixed(2) }} dB)</n-descriptions-item>
        <n-descriptions-item label="Power per Port Splitter">
          <span :style="{ color: signalStatusLabel(budgetResult.signalStatus).color, fontWeight: 600, fontSize: '15px' }">
            {{ budgetResult.outSplitter.toFixed(2) }} dBm
          </span>
        </n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- Ports -->
    <n-card title="Port ODP">
      <template #header-extra>
        <n-button type="primary" size="small" @click="resetPortForm(); showPortModal = true">+ Tambah Port</n-button>
      </template>

      <!-- Desktop table -->
      <n-data-table v-if="isDesktop" :columns="portCols" :data="ports" :bordered="false" size="small" />

      <!-- Mobile/Tablet card layout -->
      <div v-else>
        <div v-if="!ports.length" style="text-align: center; padding: 24px 0">
          <n-text depth="3">Belum ada port terdaftar</n-text>
        </div>
        <div v-else class="port-card-grid">
          <div v-for="p in ports" :key="p.id" class="port-card">
            <div class="port-card-head">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1">
                <span class="port-card-name">Port #{{ p.port_number }}</span>
                <n-tag :type="p.status === 'available' ? 'success' : p.status === 'used' ? 'info' : 'error'" size="small">
                  {{ p.status === 'available' ? 'Tersedia' : p.status === 'used' ? 'Terpakai' : 'Rusak' }}
                </n-tag>
              </div>
              <div class="port-card-btns" @click.stop>
                <n-button size="tiny" type="warning" @click="openEditPort(p)">Edit</n-button>
                <n-popconfirm @positive-click="handleDeletePort(p.id)">
                  <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                  Yakin hapus port ini?
                </n-popconfirm>
              </div>
            </div>
            <div class="port-card-body">
              <div class="port-card-row" v-if="p.customer">
                <span class="port-lbl">Pelanggan</span>
                <span class="port-val">{{ p.customer.name }}</span>
              </div>
              <div class="port-card-row" v-if="p.ont">
                <span class="port-lbl">ONT</span>
                <span class="port-val">{{ p.ont.serial_number || '-' }} ({{ p.ont.vendor || '-' }})</span>
              </div>
              <div class="port-card-row" v-if="p.notes">
                <span class="port-lbl">Catatan</span>
                <span class="port-val">{{ p.notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-card>
  </n-space>

  <!-- Port Modal -->
  <n-modal v-model:show="showPortModal" preset="card" :title="editPortId ? 'Edit Port' : 'Tambah Port'" :style="{ maxWidth: '450px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 120">
      <n-form-item v-if="!editPortId" label="Port Number">
        <n-input-number v-model:value="portForm.port_number" :min="1" style="width: 100%" />
      </n-form-item>
      <n-form-item label="Pelanggan">
        <n-select v-model:value="portForm.customer_id" :options="customerOptions" clearable filterable placeholder="Pilih pelanggan" />
      </n-form-item>
      <n-form-item v-if="editPortId" label="Status">
        <n-select v-model:value="portForm.status" :options="portStatusOptions" filterable />
      </n-form-item>
      <n-form-item label="Catatan"><n-input v-model:value="portForm.notes" placeholder="Catatan port" /></n-form-item>
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
  gap: 10px;
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
  margin-bottom: 6px;
}
.port-card-name {
  font-weight: 600;
  font-size: 13px;
}
.port-card-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.port-card-body {
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
.port-lbl {
  color: var(--n-text-color-3, #999);
  font-size: 12px;
  flex-shrink: 0;
}
.port-val {
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

/* ── Power Calculator ──────────── */
.calc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.calc-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}
.calc-hint {
  font-size: 11px;
  opacity: 0.4;
}
.calc-loss {
  font-weight: 600;
  color: #d03050;
  margin-right: 6px;
}
.calc-detail {
  font-size: 11px;
  opacity: 0.45;
}
.calc-note {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.05);
  font-size: 12px;
  opacity: 0.65;
  line-height: 1.6;
}
</style>
