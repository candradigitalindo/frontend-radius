<script setup lang="ts">
import { h, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NDataTable, NTag, NButton, NSpace, NStatistic,
  NGrid, NGridItem, NPagination, NModal, NForm, NFormItem,
  NInput, NSelect, NPopconfirm, NProgress,
  NAlert, NText, NDivider, NIcon, useMessage, NSpin
} from 'naive-ui'
import { Plus } from '@vicons/tabler'
import { ipamApi, customerApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(true)
const pool = ref<any>({})
const addresses = ref<any[]>([])
const addrLoading = ref(false)
const addrPage = ref(1)
const addrPerPage = ref(50)
const addrTotal = ref(0)
const stats = ref<any>({ available: 0, assigned: 0, reserved: 0, disabled: 0 })

// Responsive
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

// --- Filter ---
const filterStatus = ref<string | null>(null)
const statusOptions: any[] = [
  { label: 'Semua', value: null },
  { label: 'Tersedia', value: 'available' },
  { label: 'Terpakai', value: 'assigned' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Disabled', value: 'disabled' },
]

// --- Modal: Tambah IP Tunggal ---
const showAddModal = ref(false)
const savingAdd = ref(false)
const addForm = ref({ address: '', status: 'available', notes: '' })
const addStatusOptions = [
  { label: 'Tersedia (available)', value: 'available' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Disabled', value: 'disabled' },
]

async function handleAddIp() {
  if (!addForm.value.address) { message.warning('IP address wajib diisi'); return }
  savingAdd.value = true
  try {
    await ipamApi.createAddress(pool.value.id, addForm.value)
    message.success('IP address ditambahkan')
    showAddModal.value = false
    addForm.value = { address: '', status: 'available', notes: '' }
    await refreshAll()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menambah IP') }
  savingAdd.value = false
}


// --- Modal: Assign IP ke Pelanggan ---
const showAssignModal = ref(false)
const assigningAddr = ref<any>(null)
const savingAssign = ref(false)
const assignCustomerId = ref<string | null>(null)
const customerOptions = ref<any[]>([])
const customerLoading = ref(false)

async function openAssign(addr: any) {
  assigningAddr.value = addr
  assignCustomerId.value = null
  showAssignModal.value = true
  customerLoading.value = true
  try {
    const { data: res } = await customerApi.list({ per_page: 200, status: 'active' })
    customerOptions.value = (res.data || []).map((c: any) => ({
      label: `${c.name} (${c.customer_code})`,
      value: c.id,
    }))
  } catch { customerOptions.value = [] }
  customerLoading.value = false
}

async function handleAssign() {
  if (!assignCustomerId.value) { message.warning('Pilih pelanggan terlebih dahulu'); return }
  savingAssign.value = true
  try {
    await ipamApi.assignAddress(pool.value.id, assigningAddr.value.id, { customer_id: assignCustomerId.value })
    message.success('IP berhasil di-assign')
    showAssignModal.value = false
    await refreshAll()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal assign IP') }
  savingAssign.value = false
}

// --- Release IP ---
const releasingId = ref<string | null>(null)

async function handleRelease(addr: any) {
  releasingId.value = addr.id
  try {
    await ipamApi.releaseAddress(pool.value.id, addr.id)
    message.success('IP berhasil dilepas')
    await refreshAll()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal melepas IP') }
  releasingId.value = null
}

// --- Status Badge ---
const statusMap: Record<string, { type: any; label: string }> = {
  available: { type: 'success', label: 'Tersedia' },
  assigned:  { type: 'warning', label: 'Terpakai' },
  reserved:  { type: 'info',    label: 'Reserved' },
  disabled:  { type: 'default', label: 'Disabled' },
}

// --- Table columns ---
const addrCols = computed(() => [
  { title: 'IP Address', key: 'address', width: 150, render: (r: any) => h(NText, { code: true, style: 'font-size:13px' }, () => r.address) },
  {
    title: 'Status', key: 'status', width: 110,
    render: (r: any) => h(NTag, { type: statusMap[r.status]?.type || 'default', size: 'small', round: true, bordered: false },
      () => statusMap[r.status]?.label || r.status)
  },
  { title: 'Pelanggan', key: 'customer_name', render: (r: any) => r.customer_name || h(NText, { depth: 3 }, () => '-') },
  { title: 'Catatan', key: 'notes', render: (r: any) => r.notes || h(NText, { depth: 3 }, () => '-') },
  {
    title: 'Aksi', key: 'actions', width: 160, align: 'right' as const,
    render: (r: any) => h(NSpace, { size: 'small', justify: 'end' }, () => [
      r.status === 'available'
        ? h(NButton, { size: 'tiny', type: 'primary', onClick: () => openAssign(r) }, { default: () => 'Assign' })
        : null,
      r.status === 'assigned'
        ? h(NPopconfirm, { onPositiveClick: () => handleRelease(r) }, {
            trigger: () => h(NButton, { size: 'tiny', secondary: true, loading: releasingId.value === r.id }, { default: () => 'Release' }),
            default: () => `Lepas IP ${r.address} dari pelanggan?`,
          })
        : null,
    ].filter(Boolean))
  },
])

// --- Fetch ---
let currentPoolId = ''

async function fetchAddresses(poolId: string, page = 1) {
  addrLoading.value = true
  try {
    const params: any = { page, per_page: addrPerPage.value }
    if (filterStatus.value) params.status = filterStatus.value
    const { data: raw } = await ipamApi.addresses(poolId, params)
    addresses.value = raw.data || raw || []
    addrTotal.value = raw.total ?? addresses.value.length
    addrPage.value = page
  } finally {
    addrLoading.value = false
  }
}

async function fetchStats(poolId: string) {
  try {
    const { data: res } = await ipamApi.poolStats(poolId)
    stats.value = res.data || res || {}
  } catch { /* ignore */ }
}

async function fetchDetail(poolId: string) {
  loading.value = true
  currentPoolId = poolId
  try {
    const { data: pRes } = await ipamApi.getPool(poolId)
    pool.value = pRes.data || pRes
    await Promise.all([fetchAddresses(poolId, 1), fetchStats(poolId)])
  } catch { message.error('Gagal memuat data pool') }
  loading.value = false
}

async function refreshAll() {
  await Promise.all([fetchAddresses(currentPoolId, addrPage.value), fetchStats(currentPoolId)])
}

watch(filterStatus, () => fetchAddresses(currentPoolId, 1))

watch(
  () => route.params.id,
  (paramId) => {
    const poolId = Array.isArray(paramId) ? paramId[0] : paramId
    if (poolId) fetchDetail(poolId)
  },
  { immediate: true }
)

const usagePercent = computed(() => {
  const total = pool.value.total_ips || 0
  return total ? Math.round(((stats.value.assigned || 0) / total) * 100) : 0
})
</script>

<template>
  <n-spin :show="loading">
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Header -->
    <n-card size="small">
      <template #header>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700;font-size:16px">{{ pool.name || 'IP Pool' }}</div>
            <div style="font-size:12px;opacity:0.55;margin-top:2px">{{ pool.network }}</div>
          </div>
          <n-button size="small" @click="router.push('/ip-pools')">← Kembali</n-button>
        </div>
      </template>

      <!-- Stats -->
      <n-grid :cols="isMobile ? 2 : 4" :x-gap="16" :y-gap="12">
        <n-grid-item>
          <n-statistic label="Total IP" :value="pool.total_ips || 0" />
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="Tersedia">
            <template #default>
              <span style="color:#18a058">{{ stats.available || 0 }}</span>
            </template>
          </n-statistic>
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="Terpakai">
            <template #default>
              <span style="color:#f0a020">{{ stats.assigned || 0 }}</span>
            </template>
          </n-statistic>
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="Reserved/Disabled">
            <template #default>
              <span style="opacity:0.6">{{ (stats.reserved || 0) + (stats.disabled || 0) }}</span>
            </template>
          </n-statistic>
        </n-grid-item>
      </n-grid>

      <!-- Usage progress -->
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:12px;opacity:0.6;margin-bottom:4px">
          <span>Penggunaan IP</span>
          <span>{{ usagePercent }}%</span>
        </div>
        <n-progress
          type="line"
          :percentage="usagePercent"
          :status="usagePercent > 90 ? 'error' : usagePercent > 70 ? 'warning' : 'success'"
          :show-indicator="false"
        />
      </div>

      <n-divider style="margin:12px 0 8px" />

      <!-- Info -->
      <n-grid :cols="isMobile ? 1 : 3" :x-gap="16" :y-gap="8" style="font-size:13px">
        <n-grid-item>
          <span style="opacity:0.55">Gateway: </span>
          <n-text code>{{ pool.gateway || '-' }}</n-text>
        </n-grid-item>
        <n-grid-item>
          <span style="opacity:0.55">DNS: </span>
          <n-text code>{{ [pool.dns_primary, pool.dns_secondary].filter(Boolean).join(', ') || '-' }}</n-text>
        </n-grid-item>
        <n-grid-item v-if="pool.notes">
          <span style="opacity:0.55">Catatan: </span>{{ pool.notes }}
        </n-grid-item>
      </n-grid>
    </n-card>

    <!-- IP Address List -->
    <n-card size="small">
      <template #header>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span style="font-weight:600">Daftar IP Address</span>
          <n-space :size="8">
            <n-select
              v-model:value="filterStatus"
              :options="statusOptions"
              size="small"
              style="width:130px"
              placeholder="Filter status"
            />
            <n-button size="small" @click="addForm = { address: '', status: 'available', notes: '' }; showAddModal = true">
              <template #icon><n-icon :component="Plus" /></template>
              Tambah IP
            </n-button>
          </n-space>
        </div>
      </template>

      <n-alert v-if="!pool.total_ips" type="warning" :bordered="false" style="margin-bottom:12px">
        Pool ini belum memiliki IP address. Gunakan <strong>Tambah IP</strong> untuk menambah secara manual.
      </n-alert>

      <!-- Desktop table -->
      <n-data-table
        v-if="isDesktop"
        :columns="addrCols"
        :data="addresses"
        :bordered="false"
        size="small"
        :loading="addrLoading"
      />

      <!-- Mobile cards -->
      <div v-else>
        <div v-if="!addresses.length && !addrLoading" style="text-align:center;padding:24px;opacity:0.5">Tidak ada IP address</div>
        <div v-else style="display:flex;flex-direction:column;gap:8px">
          <n-card v-for="r in addresses" :key="r.id" size="small" :bordered="true">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <n-text code style="font-size:13px;font-weight:600">{{ r.address }}</n-text>
              <n-tag :type="statusMap[r.status]?.type || 'default'" size="small" round :bordered="false">
                {{ statusMap[r.status]?.label || r.status }}
              </n-tag>
            </div>
            <div v-if="r.customer_name" style="font-size:12px;margin-bottom:4px">{{ r.customer_name }}</div>
            <div v-if="r.notes" style="font-size:11px;opacity:0.55;margin-bottom:6px">{{ r.notes }}</div>
            <n-space :size="6">
              <n-button v-if="r.status === 'available'" size="tiny" type="primary" @click="openAssign(r)">Assign</n-button>
              <n-popconfirm v-if="r.status === 'assigned'" @positive-click="handleRelease(r)">
                <template #trigger>
                  <n-button size="tiny" secondary :loading="releasingId === r.id">Release</n-button>
                </template>
                Lepas IP {{ r.address }} dari pelanggan?
              </n-popconfirm>
            </n-space>
          </n-card>
        </div>
      </div>

      <div v-if="addrTotal > addrPerPage" style="display:flex;justify-content:flex-end;margin-top:16px">
        <n-pagination
          v-model:page="addrPage"
          :page-count="Math.ceil(addrTotal / addrPerPage)"
          :page-slot="5"
          @update:page="(p) => fetchAddresses(currentPoolId, p)"
        />
      </div>
    </n-card>

  </div>
  </n-spin>

  <!-- Modal: Tambah IP Tunggal -->
  <n-modal v-model:show="showAddModal" preset="card" title="Tambah IP Address" :style="{ maxWidth: '420px', width: '95vw' }">
    <n-form label-placement="top">
      <n-form-item label="IP Address *">
        <n-input v-model:value="addForm.address" placeholder="Contoh: 192.168.10.10" />
      </n-form-item>
      <n-form-item label="Status">
        <n-select v-model:value="addForm.status" :options="addStatusOptions" />
      </n-form-item>
      <n-form-item label="Catatan">
        <n-input v-model:value="addForm.notes" type="textarea" :rows="2" placeholder="Opsional — mis: 'gateway', 'reserved for server'" />
      </n-form-item>
      <n-space justify="end">
        <n-button @click="showAddModal = false">Batal</n-button>
        <n-button type="primary" :loading="savingAdd" @click="handleAddIp">Tambah</n-button>
      </n-space>
    </n-form>
  </n-modal>

  <!-- Modal: Assign IP ke Pelanggan -->
  <n-modal v-model:show="showAssignModal" preset="card" :title="`Assign IP ${assigningAddr?.address}`" :style="{ maxWidth: '420px', width: '95vw' }">
    <n-form label-placement="top">
      <n-form-item label="Pilih Pelanggan *">
        <n-select
          v-model:value="assignCustomerId"
          :options="customerOptions"
          :loading="customerLoading"
          filterable
          placeholder="Cari nama atau kode pelanggan..."
          clearable
        />
      </n-form-item>
      <n-space justify="end">
        <n-button @click="showAssignModal = false">Batal</n-button>
        <n-button type="primary" :loading="savingAssign" :disabled="!assignCustomerId" @click="handleAssign">Assign</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>
