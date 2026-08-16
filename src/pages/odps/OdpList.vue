<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NPopconfirm, NSelect, NTag,
  NModal, NForm, NFormItem, NInputNumber, NText, NIcon, useMessage
} from 'naive-ui'
import { Focus2 as Focus2Icon, Activity as ActivityIcon, AlertCircle as AlertCircleIcon } from '@vicons/tabler'
import { odpApi, oltApi } from '../../api'
import {
  calcOdpBudget, signalStatusLabel,
  RATIO_LOSS, SPLITTER_LOSS,
  type OdpCalcInput
} from '../../composables/useLinkBudget'

const vueRouter = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const olts = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)

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

const form = ref({
  name: '', address: '', latitude: 0, longitude: 0, total_ports: 8,
  olt_id: null as string | null, splitter_ratio: '', notes: '', status: 'draft' as string,
  pon_port_id: null as string | null, splitter_id: null as string | null, sequence: 1,
  cable_length: 0, pigtail_count: 2, connector_count: 1, splice_count: 2,
  splitter_type: '1:8', ratio_percent: 10,
  splitter_cable_length: 1, splitter_pigtail_count: 2, splitter_connector_count: 2, splitter_splice_count: 2,
})
// Induk ODP: langsung ke OLT (estafet) atau lewat ODC/splitter (bercabang)
const odpParentKind = ref<'olt' | 'splitter'>('olt')
const parentKindOptions = [
  { label: 'OLT langsung (estafet)', value: 'olt' },
  { label: 'ODC / Splitter (bercabang)', value: 'splitter' },
]
const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Ready', value: 'ready' },
]

function resetForm() {
  form.value = {
    name: '', address: '', latitude: 0, longitude: 0, total_ports: 8,
    olt_id: null, splitter_ratio: '', notes: '', status: 'draft',
    pon_port_id: null, splitter_id: null, sequence: 1,
    cable_length: 0, pigtail_count: 2, connector_count: 1, splice_count: 2,
    splitter_type: '1:8', ratio_percent: 10,
    splitter_cable_length: 1, splitter_pigtail_count: 2, splitter_connector_count: 2, splitter_splice_count: 2,
  }
  odpParentKind.value = 'olt'
  editId.value = null
}

const oltOptions = computed(() => olts.value.map((o: any) => ({ label: o.name, value: o.id })))

const ponPorts = ref<any[]>([])
const ponPortOptions = computed(() => ponPorts.value.map((p: any) => ({
  label: `Port ${p.port_number}${p.description ? ' - ' + p.description : ''}${p.sfp_rx_power != null ? ' (' + p.sfp_rx_power.toFixed(1) + ' dBm)' : ''}`,
  value: p.id
})))

async function fetchPonPorts(oltId: string) {
  try {
    const { data: res } = await oltApi.ponPorts(oltId)
    ponPorts.value = res.data || []
  } catch { ponPorts.value = [] }
}

function onOltChange(val: string | null) {
  form.value.olt_id = val
  form.value.pon_port_id = null
  ponPorts.value = []
  if (val) fetchPonPorts(val)
}

const ratioOptions = Object.keys(RATIO_LOSS).map(k => ({ label: k + '%', value: Number(k) }))
const splitterOptions = Object.keys(SPLITTER_LOSS).map(k => ({ label: k, value: k }))

// ── ODC / Splitter ──
const splitters = ref<any[]>([])
const showSplitterModal = ref(false)
const splitterSaving = ref(false)
const splitterEditId = ref<string | null>(null)
const splitterForm = ref({
  name: '',
  splitter_type: '1:4',
  parent_kind: 'olt' as 'olt' | 'splitter',
  olt_id: null as string | null,
  pon_port_id: null as string | null,
  parent_splitter_id: null as string | null,
  latitude: null as number | null,
  longitude: null as number | null,
  notes: '',
})
const splitterTypeOptions = ['1:2', '1:4', '1:8', '1:16', '1:32', '1:64'].map(v => ({ label: v, value: v }))
const splitterSelectOptions = computed(() => splitters.value.map((s: any) => ({
  label: `${s.name} (${s.splitter_type})`, value: s.id,
})))
const splitterParentOptions = computed(() => splitters.value
  .filter((s: any) => s.id !== splitterEditId.value)
  .map((s: any) => ({ label: `${s.name} (${s.splitter_type})`, value: s.id })))
function splitterName(id: string | null) {
  const s = splitters.value.find((x: any) => x.id === id)
  return s ? s.name : null
}

const splitterPonPorts = ref<any[]>([])
const splitterPonPortOptions = computed(() => splitterPonPorts.value.map((p: any) => ({
  label: `Port ${p.port_number}${p.description ? ' - ' + p.description : ''}`,
  value: p.id,
})))
async function onSplitterOltChange(val: string | null) {
  splitterForm.value.olt_id = val
  splitterForm.value.pon_port_id = null
  splitterPonPorts.value = []
  if (val) {
    try {
      const { data: res } = await oltApi.ponPorts(val)
      splitterPonPorts.value = res.data || []
    } catch { /* ignore */ }
  }
}

function resetSplitterForm() {
  splitterForm.value = {
    name: '', splitter_type: '1:4', parent_kind: 'olt',
    olt_id: null, pon_port_id: null, parent_splitter_id: null,
    latitude: null, longitude: null, notes: '',
  }
  splitterPonPorts.value = []
  splitterEditId.value = null
}

async function openSplitterEdit(s: any) {
  splitterEditId.value = s.id
  splitterForm.value = {
    name: s.name,
    splitter_type: s.splitter_type || '1:4',
    parent_kind: s.parent_splitter_id ? 'splitter' : 'olt',
    olt_id: null,
    pon_port_id: s.pon_port_id || null,
    parent_splitter_id: s.parent_splitter_id || null,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    notes: s.notes || '',
  }
  showSplitterModal.value = true
  // Temukan OLT pemilik pon_port agar dropdown terisi saat edit
  if (s.pon_port_id) {
    for (const olt of olts.value) {
      try {
        const { data: res } = await oltApi.ponPorts(olt.id)
        const ports = res.data || []
        if (ports.some((p: any) => p.id === s.pon_port_id)) {
          splitterForm.value.olt_id = olt.id
          splitterPonPorts.value = ports
          splitterForm.value.pon_port_id = s.pon_port_id
          break
        }
      } catch { /* ignore */ }
    }
  }
}

async function handleSaveSplitter() {
  if (!splitterForm.value.name) { message.warning('Nama wajib diisi'); return }
  splitterSaving.value = true
  try {
    const viaOlt = splitterForm.value.parent_kind === 'olt'
    const payload: Record<string, any> = {
      name: splitterForm.value.name,
      splitter_type: splitterForm.value.splitter_type,
      pon_port_id: viaOlt ? splitterForm.value.pon_port_id : null,
      parent_splitter_id: viaOlt ? null : splitterForm.value.parent_splitter_id,
      latitude: splitterForm.value.latitude,
      longitude: splitterForm.value.longitude,
      notes: splitterForm.value.notes || undefined,
    }
    if (splitterEditId.value) { await odpApi.updateSplitter(splitterEditId.value, payload); message.success('ODC/Splitter diperbarui') }
    else { await odpApi.createSplitter(payload); message.success('ODC/Splitter ditambahkan') }
    showSplitterModal.value = false; resetSplitterForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  splitterSaving.value = false
}

async function handleDeleteSplitter(id: string) {
  try { await odpApi.deleteSplitter(id); message.success('ODC/Splitter dihapus'); fetchData() }
  catch (e: any) { message.error(e.response?.data?.error || 'Gagal menghapus — pastikan tidak ada ODP/splitter lain yang terhubung ke ODC ini') }
}

// Live preview kalkulator
const selectedPort = computed(() => ponPorts.value.find((p: any) => p.id === form.value.pon_port_id))
const previewResult = computed(() => {
  const port = selectedPort.value
  if (!port || port.sfp_rx_power == null) return null

  // Cari ODP-ODP sebelumnya di PON port yang sama (sequence < current)
  const seq = form.value.sequence || 1
  const precedingOdps = data.value
    .filter((o: any) =>
      o.pon_port_id === form.value.pon_port_id &&
      (o.sequence || 1) < seq &&
      o.id !== editId.value // exclude diri sendiri saat edit
    )
    .sort((a: any, b: any) => (a.sequence || 1) - (b.sequence || 1))
    .map((o: any): OdpCalcInput => ({
      ratioPercent: o.ratio_percent || 10,
      splitterType: o.splitter_type || '1:8',
      installation: { cableLength: o.cable_length || 0, pigtailCount: o.pigtail_count ?? 2, connectorCount: o.connector_count ?? 1, spliceCount: o.splice_count ?? 2 },
      splitterInstallation: { cableLength: o.splitter_cable_length ?? 1, pigtailCount: o.splitter_pigtail_count ?? 2, connectorCount: o.splitter_connector_count ?? 2, spliceCount: o.splitter_splice_count ?? 2 },
    }))

  // Hitung chain ODP sebelumnya untuk mendapat sisa power
  let currentPower = port.sfp_rx_power
  for (const prev of precedingOdps) {
    const res = calcOdpBudget(currentPower, prev, 0)
    currentPower = res.outputPower // sisa power diteruskan
  }

  const input: OdpCalcInput = {
    ratioPercent: form.value.ratio_percent,
    splitterType: form.value.splitter_type,
    installation: { cableLength: form.value.cable_length, pigtailCount: form.value.pigtail_count, connectorCount: form.value.connector_count, spliceCount: form.value.splice_count },
    splitterInstallation: { cableLength: form.value.splitter_cable_length, pigtailCount: form.value.splitter_pigtail_count, connectorCount: form.value.splitter_connector_count, spliceCount: form.value.splitter_splice_count },
  }
  return calcOdpBudget(currentPower, input, seq)
})

const columns = [
  { title: 'Nama', key: 'name' },
  { title: 'Status', key: 'status', width: 90, align: 'center' as const,
    render: (r: any) => h(NTag, { size: 'small', type: r.status === 'ready' ? 'success' : 'default', bordered: false }, () => r.status === 'ready' ? 'Ready' : 'Draft') },
  { title: 'Alamat', key: 'address', render: (r: any) => r.address || '-' },
  { title: 'Total Port', key: 'total_ports', width: 100, align: 'center' as const },
  { title: 'Induk', key: 'olt', render: (r: any) => r.splitter_id ? `ODC: ${splitterName(r.splitter_id) || '?'}` : (r.olt?.name || '-') },
  { title: 'Port OLT', key: 'pon_port_number', render: (r: any) => r.pon_port_number != null ? `PON ${r.pon_port_number}` : '-' },
  { title: 'Splitter Ratio', key: 'splitter_ratio', render: (r: any) => r.splitter_ratio || '-' },
  {
    title: 'Aksi', key: 'actions', width: 200,
    render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => vueRouter.push(`/odps/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus ODP ini?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = {
    name: r.name, address: r.address || '', latitude: r.latitude, longitude: r.longitude,
    total_ports: r.total_ports, olt_id: r.olt_id, splitter_ratio: r.splitter_ratio || '', notes: r.notes || '', status: r.status || 'draft',
    pon_port_id: r.pon_port_id || null, splitter_id: r.splitter_id || null, sequence: r.sequence || 1,
    cable_length: r.cable_length || 0, pigtail_count: r.pigtail_count ?? 2, connector_count: r.connector_count ?? 1, splice_count: r.splice_count ?? 2,
    splitter_type: r.splitter_type || '1:8', ratio_percent: r.ratio_percent || 10,
    splitter_cable_length: r.splitter_cable_length ?? 1, splitter_pigtail_count: r.splitter_pigtail_count ?? 2, splitter_connector_count: r.splitter_connector_count ?? 2, splitter_splice_count: r.splitter_splice_count ?? 2,
  }
  odpParentKind.value = r.splitter_id ? 'splitter' : 'olt'
  if (r.olt_id) fetchPonPorts(r.olt_id)
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) { message.warning('Nama wajib diisi'); return }
  saving.value = true
  try {
    const viaOdc = odpParentKind.value === 'splitter'
    const payload = {
      ...form.value,
      // Induk eksklusif: lewat ODC/splitter ATAU langsung OLT
      splitter_id: viaOdc ? form.value.splitter_id : null,
      olt_id: viaOdc ? null : form.value.olt_id,
      pon_port_id: viaOdc ? null : form.value.pon_port_id,
      address: form.value.address || undefined,
      splitter_ratio: form.value.ratio_percent ? `${form.value.ratio_percent}%/${100 - form.value.ratio_percent}%` : (form.value.splitter_ratio || undefined),
      notes: form.value.notes || undefined,
    }
    if (editId.value) { await odpApi.update(editId.value, payload); message.success('ODP diperbarui') }
    else { await odpApi.create(payload); message.success('ODP ditambahkan') }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await odpApi.delete(id); message.success('ODP dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try {
    const [odpRes, oltRes, splRes] = await Promise.all([
      odpApi.list({ search: search.value }),
      oltApi.list(),
      odpApi.listSplitters({ per_page: 100 }).catch(() => ({ data: { data: [] } })),
    ])
    data.value = odpRes.data?.data || []
    olts.value = oltRes.data?.data || []
    splitters.value = splRes.data?.data || []
  } catch { message.error('Gagal memuat data') }
  loading.value = false
}
onMounted(fetchData)

const filteredData = computed(() => {
  if (!search.value) return data.value
  const q = search.value.toLowerCase()
  return data.value.filter((r: any) =>
    r.name?.toLowerCase().includes(q) ||
    r.address?.toLowerCase().includes(q) ||
    r.olt?.name?.toLowerCase().includes(q)
  )
})
</script>

<template>
  <n-space vertical :size="16">
    <n-card>
      <template #header>
        <div class="odp-header">
          <span class="odp-title">ODP (Optical Distribution Point)</span>
          <n-tag type="info" size="small" round>{{ data.length }} Total</n-tag>
        </div>
      </template>
      <template #header-extra>
        <div class="odp-actions">
          <n-input v-model:value="search" placeholder="Cari ODP..." clearable @clear="fetchData" @keyup.enter="fetchData" :style="{ width: isMobile ? '100%' : '200px' }" />
          <n-button type="primary" @click="resetForm(); showModal = true" :style="isMobile ? { width: '100%' } : {}">
            + {{ isMobile ? 'Tambah' : 'Tambah ODP' }}
          </n-button>
        </div>
      </template>

      <!-- Desktop table -->
      <n-data-table v-if="isDesktop" :columns="columns" :data="data" :loading="loading" :bordered="false" size="small" />

      <!-- Mobile / Tablet card layout -->
      <div v-else>
        <div v-if="loading" style="text-align: center; padding: 32px 0">
          <n-text depth="3">Memuat data...</n-text>
        </div>
        <div v-else-if="!filteredData.length" style="text-align: center; padding: 32px 0">
          <n-text depth="3">Tidak ada data ODP</n-text>
        </div>
        <div v-else class="odp-card-grid">
          <div v-for="r in filteredData" :key="r.id" class="odp-card" @click="vueRouter.push(`/odps/${r.id}`)">
            <div class="odp-card-head">
              <span class="odp-card-name">{{ r.name }}</span>
              <n-tag size="tiny" :type="r.status === 'ready' ? 'success' : 'default'" :bordered="false" style="margin-left: 6px">{{ r.status === 'ready' ? 'Ready' : 'Draft' }}</n-tag>
              <div class="odp-card-btns" @click.stop>
                <n-button size="tiny" type="warning" @click="openEdit(r)">Edit</n-button>
                <n-popconfirm @positive-click="handleDelete(r.id)">
                  <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                  Yakin hapus ODP ini?
                </n-popconfirm>
              </div>
            </div>
            <div class="odp-card-body">
              <div v-if="r.address" class="odp-card-row">
                <span class="odp-label">Alamat</span>
                <span class="odp-val">{{ r.address }}</span>
              </div>
              <div class="odp-card-row">
                <span class="odp-label">Total Port</span>
                <span>{{ r.total_ports }}</span>
              </div>
              <div class="odp-card-row" v-if="r.splitter_id">
                <span class="odp-label">ODC</span>
                <n-tag size="small" type="info">{{ splitterName(r.splitter_id) || '?' }}</n-tag>
              </div>
              <div class="odp-card-row" v-else-if="r.olt">
                <span class="odp-label">OLT</span>
                <n-tag size="small" type="info">{{ r.olt.name }}</n-tag>
              </div>
              <div class="odp-card-row" v-if="r.pon_port_number != null">
                <span class="odp-label">Port OLT</span>
                <span>PON {{ r.pon_port_number }}</span>
              </div>
              <div class="odp-card-row" v-if="r.splitter_ratio">
                <span class="odp-label">Splitter</span>
                <span>{{ r.splitter_ratio }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-card>

    <!-- ODC / Splitter -->
    <n-card>
      <template #header>
        <div class="odp-header">
          <span class="odp-title">ODC / Splitter</span>
          <n-tag type="info" size="small" round>{{ splitters.length }} Total</n-tag>
        </div>
      </template>
      <template #header-extra>
        <n-button type="primary" size="small" @click="resetSplitterForm(); showSplitterModal = true">+ Tambah ODC</n-button>
      </template>

      <div v-if="!splitters.length" style="text-align: center; padding: 20px 0">
        <n-text depth="3">Belum ada ODC/splitter. Gunakan ODC untuk topologi bercabang, mis. ODC 1:4 yang tiap line-nya diteruskan ke beberapa ODP.</n-text>
      </div>
      <div v-else class="odp-card-grid">
        <div v-for="s in splitters" :key="s.id" class="odp-card">
          <div class="odp-card-head">
            <span class="odp-card-name">{{ s.name }}</span>
            <n-tag size="tiny" type="info" :bordered="false" style="margin-left: 6px">{{ s.splitter_type }}</n-tag>
            <div class="odp-card-btns" @click.stop>
              <n-button size="tiny" type="warning" @click="openSplitterEdit(s)">Edit</n-button>
              <n-popconfirm @positive-click="handleDeleteSplitter(s.id)">
                <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                Yakin hapus ODC/splitter ini?
              </n-popconfirm>
            </div>
          </div>
          <div class="odp-card-body">
            <div class="odp-card-row">
              <span class="odp-label">Induk</span>
              <span>{{ s.parent_splitter_id ? ('ODC: ' + (splitterName(s.parent_splitter_id) || '?')) : (s.pon_port_id ? 'OLT (PON Port)' : '-') }}</span>
            </div>
            <div class="odp-card-row">
              <span class="odp-label">ODP Terhubung</span>
              <span>{{ data.filter((o: any) => o.splitter_id === s.id).length }}</span>
            </div>
            <div v-if="s.notes" class="odp-card-row">
              <span class="odp-label">Catatan</span>
              <span class="odp-val">{{ s.notes }}</span>
            </div>
          </div>
        </div>
      </div>
    </n-card>
  </n-space>

  <n-modal v-model:show="showSplitterModal" preset="card" :title="splitterEditId ? 'Edit ODC / Splitter' : 'Tambah ODC / Splitter'" style="max-width: 560px; width: 95vw">
    <n-form label-placement="top" size="small">
      <div class="odp-form-row">
        <n-form-item label="Nama ODC" required><n-input v-model:value="splitterForm.name" placeholder="Contoh: ODC-01" /></n-form-item>
        <n-form-item label="Tipe Splitter"><n-select v-model:value="splitterForm.splitter_type" :options="splitterTypeOptions" /></n-form-item>
      </div>
      <n-form-item label="Terhubung Via">
        <n-select v-model:value="splitterForm.parent_kind" :options="[
          { label: 'OLT (PON Port)', value: 'olt' },
          { label: 'ODC / Splitter lain', value: 'splitter' },
        ]" />
      </n-form-item>
      <div v-if="splitterForm.parent_kind === 'olt'" class="odp-form-row">
        <n-form-item label="OLT">
          <n-select :value="splitterForm.olt_id" @update:value="onSplitterOltChange" :options="oltOptions" clearable filterable placeholder="Pilih OLT" />
        </n-form-item>
        <n-form-item label="PON Port">
          <n-select v-model:value="splitterForm.pon_port_id" :options="splitterPonPortOptions" clearable filterable :disabled="!splitterForm.olt_id" :placeholder="splitterForm.olt_id ? 'Pilih Port' : 'Pilih OLT dulu'" />
        </n-form-item>
      </div>
      <n-form-item v-else label="ODC / Splitter Induk">
        <n-select v-model:value="splitterForm.parent_splitter_id" :options="splitterParentOptions" clearable filterable placeholder="Pilih induk" />
      </n-form-item>
      <div class="odp-form-row">
        <n-form-item label="Latitude"><n-input-number v-model:value="splitterForm.latitude" :precision="6" style="width:100%" /></n-form-item>
        <n-form-item label="Longitude"><n-input-number v-model:value="splitterForm.longitude" :precision="6" style="width:100%" /></n-form-item>
      </div>
      <n-form-item label="Catatan"><n-input v-model:value="splitterForm.notes" placeholder="Catatan" /></n-form-item>
      <n-button type="primary" block :loading="splitterSaving" @click="handleSaveSplitter">Simpan</n-button>
    </n-form>
  </n-modal>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit ODP' : 'Tambah ODP'" :style="{ maxWidth: isDesktop ? '960px' : '680px', width: '95vw' }">
    <div :class="isDesktop ? 'odp-modal-grid' : ''">
      <!-- Left Column: Form -->
      <div class="odp-modal-form">
        <n-form :label-placement="'top'" size="small">
          <!-- Info Dasar -->
          <div class="odp-section-title">Informasi ODP</div>
          <div class="odp-form-row">
            <n-form-item label="Nama ODP" required><n-input v-model:value="form.name" placeholder="Contoh: ODP-01" /></n-form-item>
            <n-form-item label="Alamat"><n-input v-model:value="form.address" placeholder="Alamat lokasi" /></n-form-item>
          </div>
          <div class="odp-form-row">
            <n-form-item label="Latitude"><n-input-number v-model:value="form.latitude" :precision="6" style="width:100%" /></n-form-item>
            <n-form-item label="Longitude"><n-input-number v-model:value="form.longitude" :precision="6" style="width:100%" /></n-form-item>
          </div>
          <div class="odp-form-row odp-form-row-3">
            <n-form-item label="Total Port"><n-input-number v-model:value="form.total_ports" :min="1" :max="128" style="width:100%" /></n-form-item>
            <n-form-item label="Status"><n-select v-model:value="form.status" :options="statusOptions" /></n-form-item>
            <n-form-item label="Catatan"><n-input v-model:value="form.notes" placeholder="Catatan" /></n-form-item>
          </div>

          <!-- Fiber Optik -->
          <div class="odp-section-title" style="margin-top: 12px">
            <n-icon size="16" style="vertical-align: -2px; margin-right: 4px"><Focus2Icon /></n-icon>
            Fiber Optik
          </div>
          <n-form-item label="Terhubung Via">
            <n-select v-model:value="odpParentKind" :options="parentKindOptions" />
          </n-form-item>
          <div v-if="odpParentKind === 'olt'" class="odp-form-row">
            <n-form-item label="OLT">
              <n-select :value="form.olt_id" @update:value="onOltChange" :options="oltOptions" clearable filterable placeholder="Pilih OLT" />
            </n-form-item>
            <n-form-item v-if="form.olt_id" label="PON Port">
              <n-select v-model:value="form.pon_port_id" :options="ponPortOptions" clearable filterable placeholder="Pilih Port" />
            </n-form-item>
            <n-form-item v-else label="PON Port">
              <n-select disabled placeholder="Pilih OLT dulu" />
            </n-form-item>
          </div>
          <div v-else class="odp-form-row">
            <n-form-item label="ODC / Splitter">
              <n-select v-model:value="form.splitter_id" :options="splitterSelectOptions" clearable filterable placeholder="Pilih ODC/Splitter" />
            </n-form-item>
            <n-form-item label=" ">
              <n-text depth="3" style="font-size:12px">Kelola ODC di bagian "ODC / Splitter" pada halaman ini</n-text>
            </n-form-item>
          </div>
          <div class="odp-form-row odp-form-row-3">
            <n-form-item label="Urutan ODP"><n-input-number v-model:value="form.sequence" :min="1" style="width:100%" /></n-form-item>
            <n-form-item label="Rasio (%)"><n-select v-model:value="form.ratio_percent" :options="ratioOptions" /></n-form-item>
            <n-form-item label="Splitter"><n-select v-model:value="form.splitter_type" :options="splitterOptions" /></n-form-item>
          </div>

          <!-- Instalasi ke ODP -->
          <div class="odp-section-sub">Kabel → ODP</div>
          <div class="odp-form-row odp-form-row-4">
            <n-form-item label="Kabel (M)"><n-input-number v-model:value="form.cable_length" :min="0" style="width:100%" /></n-form-item>
            <n-form-item label="Pigtail"><n-input-number v-model:value="form.pigtail_count" :min="0" style="width:100%" /></n-form-item>
            <n-form-item label="Konektor"><n-input-number v-model:value="form.connector_count" :min="0" style="width:100%" /></n-form-item>
            <n-form-item label="Sambungan"><n-input-number v-model:value="form.splice_count" :min="0" style="width:100%" /></n-form-item>
          </div>

          <!-- Instalasi Rasio → Splitter -->
          <div class="odp-section-sub">Rasio → Splitter</div>
          <div class="odp-form-row odp-form-row-4">
            <n-form-item label="Kabel (M)"><n-input-number v-model:value="form.splitter_cable_length" :min="0" style="width:100%" /></n-form-item>
            <n-form-item label="Pigtail"><n-input-number v-model:value="form.splitter_pigtail_count" :min="0" style="width:100%" /></n-form-item>
            <n-form-item label="Konektor"><n-input-number v-model:value="form.splitter_connector_count" :min="0" style="width:100%" /></n-form-item>
            <n-form-item label="Sambungan"><n-input-number v-model:value="form.splitter_splice_count" :min="0" style="width:100%" /></n-form-item>
          </div>
        </n-form>
      </div>

      <!-- Right Column: Live Calculator -->
      <div class="odp-modal-calc">
        <div class="calc-card" :class="previewResult ? 'calc-card--' + previewResult.signalStatus : ''">
          <div class="calc-card-header">
            <n-icon size="18"><ActivityIcon /></n-icon>
            <span>Link Budget</span>
          </div>

          <template v-if="previewResult">
            <!-- Big number -->
            <div class="calc-big-num" :style="{ color: signalStatusLabel(previewResult.signalStatus).color }">
              {{ previewResult.outSplitter.toFixed(2) }}
              <span class="calc-big-unit">dBm</span>
            </div>
            <div class="calc-big-label">Power per Port Splitter</div>
            <div class="calc-status-badge" :style="{ background: signalStatusLabel(previewResult.signalStatus).color + '18', color: signalStatusLabel(previewResult.signalStatus).color }">
              {{ signalStatusLabel(previewResult.signalStatus).label }}
            </div>

            <!-- Details -->
            <div class="calc-details">
              <div class="calc-row">
                <span>Power OLT</span>
                <span>{{ previewResult.inputPower.toFixed(2) }} dBm</span>
              </div>
              <div class="calc-row">
                <span>Loss Instalasi</span>
                <span class="calc-loss">-{{ previewResult.installationLoss.toFixed(2) }} dB</span>
              </div>
              <div class="calc-row">
                <span>Setelah Instalasi</span>
                <span>{{ previewResult.afterInstallation.toFixed(2) }} dBm</span>
              </div>
              <div class="calc-divider"></div>
              <div class="calc-row">
                <span>Loss Rasio (terus)</span>
                <span class="calc-loss">-{{ previewResult.ratioLoss.toFixed(2) }} dB</span>
              </div>
              <div class="calc-row calc-row-highlight">
                <span>→ ODP Berikutnya</span>
                <strong>{{ previewResult.outputPower.toFixed(2) }} dBm</strong>
              </div>
              <div class="calc-divider"></div>
              <div class="calc-row">
                <span>In Splitter</span>
                <span>{{ previewResult.inSplitter.toFixed(2) }} dBm</span>
              </div>
              <div class="calc-row">
                <span>Loss {{ form.splitter_type }}</span>
                <span class="calc-loss">-{{ previewResult.splitterLoss.toFixed(2) }} dB</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="calc-empty">
              <n-icon size="32" style="opacity: 0.3"><AlertCircleIcon /></n-icon>
              <span>Pilih OLT & PON Port<br>untuk melihat kalkulasi</span>
            </div>
          </template>
        </div>

        <div class="calc-actions">
          <n-button @click="showModal = false" style="flex: 1">Batal</n-button>
          <n-button type="primary" :loading="saving" @click="handleSave" style="flex: 1">Simpan</n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.odp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.odp-title {
  font-size: 16px;
  font-weight: 600;
}
.odp-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
@media (max-width: 639px) {
  .odp-actions {
    flex-direction: column;
    width: 100%;
  }
}
.odp-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .odp-card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.odp-card {
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.09));
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.odp-card:hover {
  border-color: var(--n-color-target, #63e2b7);
}
.odp-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.odp-card-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.odp-card-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.odp-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.odp-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.odp-label {
  color: var(--n-text-color-3, #999);
  font-size: 12px;
  flex-shrink: 0;
}
.odp-val {
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
/* Modal 2-column layout */
.odp-modal-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  min-height: 400px;
}
.odp-modal-form {
  min-width: 0;
}
.odp-modal-calc {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 0;
  align-self: start;
}
.odp-section-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--n-text-color-2, #bbb);
  letter-spacing: 0.3px;
}
.odp-section-sub {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  margin-bottom: 4px;
  font-weight: 500;
}
.odp-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}
.odp-form-row-3 {
  grid-template-columns: 1fr 1fr 1fr;
}
.odp-form-row-4 {
  grid-template-columns: repeat(4, 1fr);
}
@media (max-width: 639px) {
  .odp-form-row, .odp-form-row-3, .odp-form-row-4 {
    grid-template-columns: 1fr;
  }
}

/* Calculator Card */
.calc-card {
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.09));
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: border-color 0.3s;
  background: var(--n-card-color, rgba(255,255,255,0.04));
}
.calc-card--good { border-color: #18a058; }
.calc-card--warning { border-color: #f0a020; }
.calc-card--critical { border-color: #d03050; }
.calc-card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 12px;
  color: var(--n-text-color-2, #bbb);
}
.calc-big-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.calc-big-unit {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.7;
}
.calc-big-label {
  font-size: 11px;
  color: var(--n-text-color-3, #999);
  margin-top: 2px;
  margin-bottom: 6px;
}
.calc-status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 12px;
}
.calc-details {
  text-align: left;
}
.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 3px 0;
  color: var(--n-text-color-2, #ccc);
}
.calc-row-highlight {
  font-weight: 600;
}
.calc-loss {
  color: #d03050;
  font-variant-numeric: tabular-nums;
}
.calc-divider {
  height: 1px;
  background: var(--n-border-color, rgba(255,255,255,0.08));
  margin: 4px 0;
}
.calc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 0;
  color: var(--n-text-color-3, #999);
  font-size: 12px;
  text-align: center;
  line-height: 1.5;
}
.calc-actions {
  display: flex;
  gap: 8px;
}
</style>
