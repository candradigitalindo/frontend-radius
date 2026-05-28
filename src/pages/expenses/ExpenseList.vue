<script setup lang="ts">
import { h, ref, onMounted, onUnmounted } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NPopconfirm, NSelect, NSpin,
  NModal, NForm, NFormItem, NInputNumber, NDatePicker, NIcon, useMessage
} from 'naive-ui'
import { Search, Folder, Plus, Calendar, FileText, CurrencyDollar, Edit, Trash } from '@vicons/tabler'
import { expenseApi } from '../../api'

const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const categories = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const showCatModal = ref(false)
const saving = ref(false)
const savingCat = ref(false)
const editId = ref<string | null>(null)
const editCatId = ref<string | null>(null)
const isMobile = ref(window.innerWidth < 1024)
function onResize() { isMobile.value = window.innerWidth < 1024 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const form = ref({ category_id: null as string | null, amount: 0, description: '', expense_date: Date.now(), receipt_url: '' })
const catForm = ref({ name: '', color: '#6B7280' })

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : ''
const parseRp = (s: string) => { const n = Number(s.replace(/\./g, '').replace(/,/g, '.')); return isNaN(n) ? null : n }
const amountDisplay = ref(fmtRp(0))
function onAmountInput(val: string) {
  const num = parseRp(val)
  form.value.amount = num ?? 0
  amountDisplay.value = num != null ? fmtRp(num) : val
}
function syncAmountDisplay() { amountDisplay.value = fmtRp(form.value.amount) }

function resetForm() {
  form.value = { category_id: null, amount: 0, description: '', expense_date: Date.now(), receipt_url: '' }
  editId.value = null
  amountDisplay.value = fmtRp(0)
}

const catOptions = ref<any[]>([])

const columns = [
  { title: 'Tanggal', key: 'expense_date', width: 110, render: (r: any) => r.expense_date?.split('T')[0] || '-' },
  { title: 'Kategori', key: 'category', width: 130, render: (r: any) => r.category?.name || '-' },
  { title: 'Deskripsi', key: 'description', ellipsis: { tooltip: true } },
  { title: 'Jumlah', key: 'amount', width: 130, render: (r: any) => (r.amount || 0).toLocaleString('id-ID') },
  { title: 'No. Kuitansi', key: 'receipt_url', width: 130, ellipsis: { tooltip: true } },
  {
    title: 'Aksi', key: 'actions', width: 90, fixed: 'right' as const, render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = { category_id: r.category_id, amount: r.amount, description: r.description, expense_date: new Date(r.expense_date).getTime(), receipt_url: r.receipt_url || '' }
  amountDisplay.value = fmtRp(r.amount)
  showModal.value = true
}

async function handleSave() {
  if (!form.value.description) { message.warning('Deskripsi wajib diisi'); return }
  if (!form.value.amount) { message.warning('Jumlah wajib diisi'); return }
  if (!form.value.expense_date) { message.warning('Tanggal wajib diisi'); return }
  saving.value = true
  try {
    const payload = { ...form.value, expense_date: new Date(form.value.expense_date).toISOString().split('T')[0] }
    if (editId.value) { await expenseApi.update(editId.value, payload); message.success('Pengeluaran diperbarui') }
    else { await expenseApi.create(payload); message.success('Pengeluaran ditambahkan') }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleSaveCat() {
  if (!catForm.value.name) { message.warning('Nama kategori wajib diisi'); return }
  savingCat.value = true
  try {
    if (editCatId.value) {
      await expenseApi.updateCategory(editCatId.value, catForm.value)
      message.success('Kategori diperbarui')
    } else {
      await expenseApi.createCategory(catForm.value)
      message.success('Kategori ditambahkan')
    }
    resetCatForm()
    fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  savingCat.value = false
}

function resetCatForm() {
  catForm.value = { name: '', color: '#6B7280' }
  editCatId.value = null
}

function openEditCat(cat: any) {
  editCatId.value = cat.id
  catForm.value = { name: cat.name, color: cat.color || '#6B7280' }
}

async function handleDeleteCat(id: string) {
  try {
    await expenseApi.deleteCategory(id)
    message.success('Kategori dihapus')
    if (editCatId.value === id) resetCatForm()
    fetchData()
  } catch { message.error('Gagal menghapus kategori') }
}

async function handleDelete(id: string) {
  try { await expenseApi.delete(id); message.success('Pengeluaran dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try {
    const [expRes, catRes] = await Promise.all([expenseApi.list({ search: search.value }), expenseApi.categories()])
    data.value = expRes.data?.data || []
    categories.value = catRes.data?.data || []
    catOptions.value = categories.value.map((c: any) => ({ label: c.name, value: c.id }))
  } catch { message.error('Gagal memuat data') }
  loading.value = false
}
onMounted(fetchData)
</script>

<template>
  <div class="exp-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">Pengeluaran</h2>
      <div class="header-actions">
        <n-input
          v-model:value="search"
          placeholder="Cari..."
          clearable
          @clear="fetchData"
          @keyup.enter="fetchData"
          class="search-input"
        >
          <template #prefix>
            <n-icon :component="Search" :size="16" style="opacity: 0.4" />
          </template>
        </n-input>
        <n-button @click="showCatModal = true" class="cat-btn">
          <template #icon>
            <n-icon :component="Folder" :size="16" />
          </template>
          <span class="btn-text">Kategori</span>
        </n-button>
        <n-button type="primary" @click="resetForm(); showModal = true" class="add-btn">
          <template #icon>
            <n-icon :component="Plus" :size="16" />
          </template>
          <span class="btn-text">Tambah</span>
        </n-button>
      </div>
    </div>

    <!-- Desktop Table -->
    <n-card v-if="!isMobile" class="table-card" :bordered="true">
      <n-data-table :columns="columns" :data="data" :loading="loading" :bordered="false" :scroll-x="750" />
    </n-card>

    <!-- Mobile/Tablet Cards -->
    <div v-else class="exp-list">
      <div v-if="loading" class="exp-empty"><n-spin :show="true" /></div>
      <template v-else-if="data.length">
        <div v-for="row in data" :key="row.id" class="exp-card">
          <div class="exp-card-top">
            <div class="exp-card-info">
              <div class="exp-card-desc">{{ row.description || 'Tanpa deskripsi' }}</div>
              <div class="exp-card-cat">{{ row.category?.name || 'Tanpa kategori' }}</div>
            </div>
            <div class="exp-card-amount">{{ (row.amount || 0).toLocaleString('id-ID') }}</div>
          </div>

          <div class="exp-card-meta">
            <div class="exp-meta-item">
              <n-icon :component="Calendar" :size="13" />
              {{ row.expense_date?.split('T')[0] || '-' }}
            </div>
            <div v-if="row.receipt_url" class="exp-meta-item">
              <n-icon :component="FileText" :size="13" />
              {{ row.receipt_url }}
            </div>
          </div>

          <div class="exp-card-actions">
            <n-button size="tiny" type="warning" @click="openEdit(row)">Edit</n-button>
            <n-popconfirm @positive-click="handleDelete(row.id)">
              <template #trigger>
                <n-button size="tiny" type="error">Hapus</n-button>
              </template>
              Yakin hapus pengeluaran ini?
            </n-popconfirm>
          </div>
        </div>
      </template>
      <div v-else class="exp-empty">
        <n-icon :component="CurrencyDollar" :size="48" style="opacity: 0.2" />
        <span>Belum ada pengeluaran</span>
      </div>
    </div>
  </div>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'" :style="{ maxWidth: '460px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 120">
      <n-form-item label="Kategori"><n-select v-model:value="form.category_id" :options="catOptions" clearable filterable /></n-form-item>
      <n-form-item label="Tanggal"><n-date-picker v-model:value="form.expense_date" type="date" style="width:100%" /></n-form-item>
      <n-form-item label="Jumlah"><n-input :value="amountDisplay" @input="onAmountInput" @blur="syncAmountDisplay" style="width:100%" /></n-form-item>
      <n-form-item label="Deskripsi"><n-input v-model:value="form.description" type="textarea" :rows="2" /></n-form-item>
      <n-form-item label="No. Kuitansi"><n-input v-model:value="form.receipt_url" /></n-form-item>
      <div class="modal-actions">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </div>
    </n-form>
  </n-modal>

  <n-modal v-model:show="showCatModal" preset="card" title="Kelola Kategori" :style="{ maxWidth: '420px', width: '90vw' }" @after-leave="resetCatForm">
    <!-- Category list -->
    <div class="cat-list">
      <div v-if="!categories.length" class="cat-empty">Belum ada kategori</div>
      <div v-for="cat in categories" :key="cat.id" class="cat-item">
        <div class="cat-item-color" :style="{ background: cat.color || '#6B7280' }"></div>
        <div class="cat-item-name">{{ cat.name }}</div>
        <div class="cat-item-actions">
          <n-button size="tiny" quaternary @click="openEditCat(cat)">
            <template #icon><n-icon :component="Edit" :size="14" /></template>
          </n-button>
          <n-popconfirm @positive-click="handleDeleteCat(cat.id)">
            <template #trigger>
              <n-button size="tiny" quaternary type="error">
                <template #icon><n-icon :component="Trash" :size="14" /></template>
              </n-button>
            </template>
            Yakin hapus kategori ini?
          </n-popconfirm>
        </div>
      </div>
    </div>

    <!-- Add/Edit form -->
    <div class="cat-form-divider"></div>
    <div class="cat-form">
      <div class="cat-form-title">{{ editCatId ? 'Edit Kategori' : 'Tambah Kategori' }}</div>
      <div class="cat-form-row">
        <n-input v-model:value="catForm.name" placeholder="Nama kategori" size="small" class="cat-form-name" />
        <n-input v-model:value="catForm.color" placeholder="#6B7280" size="small" class="cat-form-color" />
      </div>
      <div class="cat-form-actions">
        <n-button v-if="editCatId" size="small" @click="resetCatForm">Batal</n-button>
        <n-button size="small" type="primary" :loading="savingCat" @click="handleSaveCat">
          {{ editCatId ? 'Simpan' : 'Tambah' }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.exp-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input { width: 200px; }

.table-card { border-radius: 12px !important; }
:root:not(.dark) .table-card { border-color: rgba(0,0,0,0.08) !important; }
:root.dark .table-card { border-color: rgba(255,255,255,0.08) !important; }

/* ── Cards ── */
.exp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exp-card {
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(128,128,128,0.12);
  background: rgba(128,128,128,0.02);
}
:root.dark .exp-card {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.08);
}

.exp-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.exp-card-info { min-width: 0; flex: 1; }

.exp-card-desc {
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exp-card-cat {
  font-size: 12px;
  opacity: 0.5;
  margin-top: 2px;
}

.exp-card-amount {
  font-weight: 800;
  font-size: 16px;
  white-space: nowrap;
  flex-shrink: 0;
  color: #ef4444;
}

:root:not(.dark) .exp-card-amount { color: #dc2626; }

.exp-card-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.exp-meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  opacity: 0.55;
}

.exp-meta-item svg { flex-shrink: 0; opacity: 0.6; }

.exp-card-actions {
  display: flex;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(128,128,128,0.08);
}
:root.dark .exp-card-actions { border-top-color: rgba(255,255,255,0.06); }

.exp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  opacity: 0.5;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ── Category Modal ── */
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
}

.cat-empty {
  text-align: center;
  padding: 20px 0;
  opacity: 0.4;
  font-size: 13px;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.15s;
}
.cat-item:hover { background: rgba(128,128,128,0.06); }
:root.dark .cat-item:hover { background: rgba(255,255,255,0.04); }

.cat-item-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.cat-item-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.cat-item:hover .cat-item-actions { opacity: 1; }

.cat-form-divider {
  height: 1px;
  background: rgba(128,128,128,0.12);
  margin: 12px 0;
}
:root.dark .cat-form-divider { background: rgba(255,255,255,0.08); }

.cat-form-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  opacity: 0.6;
}

.cat-form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.cat-form-name { flex: 1; }
.cat-form-color { width: 100px; flex-shrink: 0; }

.cat-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}


@media (min-width: 640px) and (max-width: 1023px) {
  .exp-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .exp-empty { grid-column: 1 / -1; }
}

@media (max-width: 1023px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions { width: 100%; }
  .search-input { flex: 1; width: auto; }
  .cat-btn, .add-btn { flex-shrink: 0; }
}

@media (max-width: 480px) {
  .page-title { font-size: 18px; }
  .btn-text { display: none; }
  .modal-actions { flex-direction: column; }
  .modal-actions .n-button { width: 100%; }
}
</style>
