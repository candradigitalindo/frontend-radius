<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm,
  NModal, NForm, NFormItem, NInputNumber, NTabs, NTabPane, NSelect,
  NPagination, useMessage
} from 'naive-ui'
import { voucherApi } from '../../api'

const message = useMessage()
const activeTab = ref('products')

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

// ---- Produk ----
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const showGenModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)

const form = ref({ name: '', duration: 30, bandwidth_up: 0, bandwidth_down: 0, price: 0, is_active: true })
const genForm = ref({ product_id: '', quantity: 10, prefix: 'VC' })

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : ''
const parseRp = (s: string) => { const n = Number(s.replace(/\./g, '').replace(/,/g, '.')); return isNaN(n) ? null : n }
const priceDisplay = ref(fmtRp(0))
function onPriceInput(val: string) {
  const num = parseRp(val)
  form.value.price = num ?? 0
  priceDisplay.value = num != null ? fmtRp(num) : val
}
function syncPriceDisplay() { priceDisplay.value = fmtRp(form.value.price) }

function resetForm() {
  form.value = { name: '', duration: 30, bandwidth_up: 0, bandwidth_down: 0, price: 0, is_active: true }
  editId.value = null
  priceDisplay.value = fmtRp(0)
}

const columns = [
  { title: 'Produk', key: 'name' },
  { title: 'Durasi (hari)', key: 'duration' },
  { title: 'Upload', key: 'bandwidth_up', render: (r: any) => `${r.bandwidth_up} Mbps` },
  { title: 'Download', key: 'bandwidth_down', render: (r: any) => `${r.bandwidth_down} Mbps` },
  { title: 'Harga', key: 'price', render: (r: any) => (r.price || 0).toLocaleString('id-ID') },
  { title: 'Status', key: 'is_active', render: (r: any) => h(NTag, { type: r.is_active ? 'success' : 'default', size: 'small' }, () => r.is_active ? 'Aktif' : 'Nonaktif') },
  {
    title: 'Aksi', key: 'actions', render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Generate', onClick: () => { genForm.value.product_id = r.id; showGenModal.value = true }, renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' }) }),
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = { name: r.name, duration: r.duration, bandwidth_up: r.bandwidth_up, bandwidth_down: r.bandwidth_down, price: r.price, is_active: r.is_active }
  priceDisplay.value = fmtRp(r.price)
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) { message.warning('Nama produk wajib diisi'); return }
  saving.value = true
  try {
    if (editId.value) { await voucherApi.updateProduct(editId.value, form.value); message.success('Produk diperbarui') }
    else { await voucherApi.createProduct(form.value); message.success('Produk ditambahkan') }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleGenerate() {
  saving.value = true
  try {
    await voucherApi.generate(genForm.value)
    message.success(`${genForm.value.quantity} voucher digenerate`)
    showGenModal.value = false
    fetchVouchers()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal generate') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await voucherApi.deleteProduct(id); message.success('Produk dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try { const { data: res } = await voucherApi.products({ search: search.value }); data.value = res.data || [] }
  catch { message.error('Gagal memuat data') }
  loading.value = false
}

// ---- Voucher List ----
const vLoading = ref(false)
const vouchers = ref<any[]>([])
const vSearch = ref('')
const vStatus = ref<string | null>(null)
const vPage = ref(1)
const vTotal = ref(0)
const vPerPage = 20

const vStatusMap: Record<string, { type: any; label: string }> = {
  available: { type: 'success', label: 'Tersedia' },
  sold: { type: 'warning', label: 'Terjual' },
  active: { type: 'info', label: 'Aktif' },
  expired: { type: 'error', label: 'Expired' },
  used: { type: 'default', label: 'Terpakai' },
}

const vStatusOptions = [
  { label: 'Semua', value: null as unknown as string },
  { label: 'Tersedia', value: 'available' },
  { label: 'Terjual', value: 'sold' },
  { label: 'Aktif', value: 'active' },
  { label: 'Expired', value: 'expired' },
]

const showSellModal = ref(false)
const sellId = ref('')
const sellPhone = ref('')

const vColumns = [
  { title: 'Username', key: 'username', render: (r: any) => h('span', { style: 'font-family: monospace; font-weight: 600' }, r.username) },
  { title: 'Password', key: 'password', render: (r: any) => h('span', { style: 'font-family: monospace' }, r.password) },
  { title: 'Produk', key: 'product', render: (r: any) => r.product?.name || '-' },
  {
    title: 'Status', key: 'status', width: 100,
    render: (r: any) => {
      const s = vStatusMap[r.status] || { type: 'default', label: r.status }
      return h(NTag, { type: s.type, size: 'small', round: true }, () => s.label)
    }
  },
  { title: 'Pembeli', key: 'buyer_phone', render: (r: any) => r.buyer_phone || '-' },
  { title: 'Dibuat', key: 'created_at', render: (r: any) => r.created_at?.split('T')[0] || '-' },
  { title: 'Expired', key: 'expires_at', render: (r: any) => r.expires_at?.split('T')[0] || '-' },
  {
    title: 'Aksi', key: 'actions', width: 140,
    render: (r: any) => {
      const btns: any[] = []
      if (r.status === 'available') {
        btns.push(h(NButton, { size: 'tiny', type: 'warning', title: 'Jual', onClick: () => { sellId.value = r.id; sellPhone.value = ''; showSellModal.value = true }, renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>' }) }))
      }
      if (r.status === 'available' || r.status === 'expired') {
        btns.push(h(NPopconfirm, { onPositiveClick: () => handleDeleteVoucher(r.id) }, {
          trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }),
          default: () => 'Yakin hapus voucher ini?'
        }))
      }
      return btns.length ? h(NSpace, { size: 'small' }, () => btns) : '-'
    }
  },
]

async function fetchVouchers() {
  vLoading.value = true
  try {
    const params: any = { page: vPage.value, per_page: vPerPage, search: vSearch.value }
    if (vStatus.value) params.status = vStatus.value
    const { data: res } = await voucherApi.list(params)
    vouchers.value = res.data || []
    vTotal.value = res.total || 0
  } catch { message.error('Gagal memuat voucher') }
  vLoading.value = false
}

async function handleSellVoucher() {
  if (!sellPhone.value.trim()) { message.warning('Nomor telepon wajib diisi'); return }
  saving.value = true
  try {
    await voucherApi.sell(sellId.value, { buyer_phone: sellPhone.value })
    message.success('Voucher berhasil dijual')
    showSellModal.value = false
    fetchVouchers()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menjual voucher') }
  saving.value = false
}

async function handleDeleteVoucher(id: string) {
  try {
    await voucherApi.delete(id)
    message.success('Voucher dihapus')
    fetchVouchers()
  } catch { message.error('Gagal menghapus') }
}

function onTabChange(tab: string) {
  if (tab === 'vouchers' && vouchers.value.length === 0) fetchVouchers()
}

onMounted(fetchData)
</script>

<template>
  <n-card title="Voucher Internet">
    <n-tabs v-model:value="activeTab" type="line" @update:value="onTabChange">
      <!-- Tab Produk -->
      <n-tab-pane name="products" tab="Produk Voucher">
        <div :style="isMobile ? 'display:flex;flex-direction:column;gap:8px;margin-bottom:12px' : 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'">
          <n-input v-model:value="search" placeholder="Cari produk..." clearable @clear="fetchData" @keyup.enter="fetchData" :style="{ width: isMobile ? '100%' : '200px' }" />
          <n-button type="primary" @click="resetForm(); showModal = true" :style="isMobile ? { alignSelf: 'flex-end' } : {}">+ Produk Baru</n-button>
        </div>

        <!-- Desktop: table -->
        <n-data-table v-if="isDesktop" :columns="columns" :data="data" :loading="loading" :bordered="false" size="small" />

        <!-- Tablet & Mobile: cards -->
        <div v-else>
          <div v-if="loading" style="text-align:center;padding:24px">Memuat...</div>
          <div v-else-if="!data.length" style="text-align:center;padding:24px;opacity:0.6">Tidak ada produk</div>
          <div v-else class="product-grid">
            <n-card v-for="r in data" :key="r.id" size="small">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
                <span style="font-weight:600">{{ r.name }}</span>
                <n-tag :type="r.is_active ? 'success' : 'default'" size="small">{{ r.is_active ? 'Aktif' : 'Nonaktif' }}</n-tag>
              </div>
              <div style="font-size:12px;opacity:0.7;margin-bottom:4px">{{ r.duration }} hari • ↑{{ r.bandwidth_up }} ↓{{ r.bandwidth_down }} Mbps</div>
              <div style="font-weight:600;margin-bottom:8px">Rp {{ (r.price || 0).toLocaleString('id-ID') }}</div>
              <n-space size="small">
                <n-button size="tiny" type="info" @click="genForm.product_id = r.id; showGenModal = true">Generate</n-button>
                <n-button size="tiny" type="warning" @click="openEdit(r)">Edit</n-button>
                <n-popconfirm @positive-click="handleDelete(r.id)">
                  <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                  Yakin hapus?
                </n-popconfirm>
              </n-space>
            </n-card>
          </div>
        </div>
      </n-tab-pane>

      <!-- Tab Voucher -->
      <n-tab-pane name="vouchers" tab="Daftar Voucher">
        <div :style="isMobile ? 'display:flex;flex-direction:column;gap:8px;margin-bottom:12px' : 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'">
          <n-space :vertical="isMobile" :size="8" :style="isMobile ? { width: '100%' } : {}">
            <n-input v-model:value="vSearch" placeholder="Cari username..." clearable @clear="fetchVouchers" @keyup.enter="fetchVouchers" :style="{ width: isMobile ? '100%' : '200px' }" />
            <n-select v-model:value="vStatus" :options="vStatusOptions" clearable placeholder="Status" :style="{ width: isMobile ? '100%' : '140px' }" @update:value="() => { vPage = 1; fetchVouchers() }" />
          </n-space>
          <n-tag type="info" :style="isMobile ? { alignSelf: 'flex-end' } : {}">Total: {{ vTotal }}</n-tag>
        </div>

        <!-- Desktop: table -->
        <n-data-table v-if="isDesktop" :columns="vColumns" :data="vouchers" :loading="vLoading" :bordered="false" size="small" />

        <!-- Tablet & Mobile: cards -->
        <div v-else>
          <div v-if="vLoading" style="text-align:center;padding:24px">Memuat...</div>
          <div v-else-if="!vouchers.length" style="text-align:center;padding:24px;opacity:0.6">Tidak ada voucher</div>
          <div v-else class="voucher-grid">
            <n-card v-for="r in vouchers" :key="r.id" size="small">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
                <span style="font-family:monospace;font-weight:600;font-size:13px">{{ r.username }}</span>
                <n-tag :type="(vStatusMap[r.status] || {}).type || 'default'" size="small" round>{{ (vStatusMap[r.status] || {}).label || r.status }}</n-tag>
              </div>
              <div style="font-family:monospace;font-size:12px;opacity:0.7;margin-bottom:4px">PW: {{ r.password }}</div>
              <div style="font-size:12px;margin-bottom:2px">{{ r.product?.name || '-' }}</div>
              <div style="font-size:11px;opacity:0.6;margin-bottom:6px">
                <span v-if="r.buyer_phone">Pembeli: {{ r.buyer_phone }} • </span>
                Dibuat: {{ r.created_at?.split('T')[0] || '-' }}
                <span v-if="r.expires_at"> • Exp: {{ r.expires_at?.split('T')[0] }}</span>
              </div>
              <n-space size="small" v-if="r.status === 'available' || r.status === 'expired'">
                <n-button v-if="r.status === 'available'" size="tiny" type="warning" @click="sellId = r.id; sellPhone = ''; showSellModal = true">Jual</n-button>
                <n-popconfirm @positive-click="handleDeleteVoucher(r.id)">
                  <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                  Yakin hapus voucher ini?
                </n-popconfirm>
              </n-space>
            </n-card>
          </div>
        </div>

        <n-space justify="end" style="margin-top:12px" v-if="vTotal > vPerPage">
          <n-pagination v-model:page="vPage" :page-count="Math.ceil(vTotal / vPerPage)" @update:page="fetchVouchers" />
        </n-space>
      </n-tab-pane>
    </n-tabs>
  </n-card>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit Produk Voucher' : 'Tambah Produk Voucher'" :style="{ maxWidth: '500px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 130">
      <n-form-item label="Nama"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item label="Durasi (hari)"><n-input-number v-model:value="form.duration" :min="1" style="width:100%" /></n-form-item>
      <n-form-item label="Upload (Mbps)"><n-input-number v-model:value="form.bandwidth_up" :min="0" style="width:100%" /></n-form-item>
      <n-form-item label="Download (Mbps)"><n-input-number v-model:value="form.bandwidth_down" :min="0" style="width:100%" /></n-form-item>
      <n-form-item label="Harga"><n-input :value="priceDisplay" @input="onPriceInput" @blur="syncPriceDisplay" style="width:100%" /></n-form-item>
      <n-space justify="end">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>

  <n-modal v-model:show="showGenModal" preset="card" title="Generate Voucher" :style="{ maxWidth: '400px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 100">
      <n-form-item label="Jumlah"><n-input-number v-model:value="genForm.quantity" :min="1" :max="1000" style="width:100%" /></n-form-item>
      <n-form-item label="Prefix"><n-input v-model:value="genForm.prefix" /></n-form-item>
      <n-space justify="end">
        <n-button @click="showGenModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleGenerate">Generate</n-button>
      </n-space>
    </n-form>
  </n-modal>

  <n-modal v-model:show="showSellModal" preset="card" title="Jual Voucher" :style="{ maxWidth: '400px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 120">
      <n-form-item label="No. Telepon"><n-input v-model:value="sellPhone" placeholder="08xxxxxxxxxx" /></n-form-item>
      <n-space justify="end">
        <n-button @click="showSellModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSellVoucher">Jual</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
.product-grid, .voucher-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .product-grid, .voucher-grid {
    grid-template-columns: 1fr;
  }
}
</style>
