<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NDataTable, NButton, NSpace, NInput, NTag, NSelect, NSpin, NIcon, useMessage } from 'naive-ui'
import { Search, ChevronLeft, ChevronRight, FileText } from '@vicons/tabler'
import { invoiceApi } from '../../api'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const statusFilter = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const isMobile = ref(window.innerWidth < 1024)
function onResize() { isMobile.value = window.innerWidth < 1024 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const statusOptions = [
  { label: 'Semua', value: null as unknown as string },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
]

const statusMap: Record<string, { type: 'success' | 'warning' | 'error' | 'info'; label: string; color: string; bg: string }> = {
  paid: { type: 'success', label: 'Paid', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  unpaid: { type: 'warning', label: 'Unpaid', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  overdue: { type: 'error', label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  cancelled: { type: 'info', label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

function statusType(s: string): 'success' | 'warning' | 'error' | 'info' {
  return statusMap[s]?.type || 'default' as any
}

const columns = [
  { title: 'No. Invoice', key: 'invoice_number', ellipsis: { tooltip: true } },
  { title: 'Pelanggan', key: 'customer', render: (r: any) => r.customer?.name || '-', ellipsis: { tooltip: true } },
  { title: 'Periode', key: 'period_month', width: 100, render: (r: any) => r.period_month && r.period_year ? `${String(r.period_month).padStart(2, '0')}/${r.period_year}` : '-' },
  { title: 'Total', key: 'total_amount', width: 120, render: (r: any) => (r.total_amount || 0).toLocaleString('id-ID') },
  { title: 'Status', key: 'status', width: 100, render: (r: any) => h(NTag, { type: statusType(r.status), size: 'small' }, () => r.status) },
  { title: 'Jatuh Tempo', key: 'due_date', width: 110, render: (r: any) => r.due_date?.split('T')[0] || '-' },
  {
    title: 'Aksi', key: 'actions', width: 60, fixed: 'right' as const, render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => router.push(`/invoices/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
    ])
  },
]

const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (p: number) => { page.value = p; fetchData() },
  onUpdatePageSize: (s: number) => { pageSize.value = s; page.value = 1; fetchData() },
}))

function handlePageChange(p: number) {
  page.value = p
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: page.value, per_page: pageSize.value, search: search.value }
    if (statusFilter.value) params.status = statusFilter.value
    const { data: res } = await invoiceApi.list(params)
    data.value = res.data || []
    total.value = res.total || data.value.length
  } catch { message.error('Gagal memuat data invoice') }
  loading.value = false
}
onMounted(fetchData)
</script>

<template>
  <div class="inv-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">Invoice</h2>
      <div class="header-actions">
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          class="status-filter"
          @update:value="fetchData"
          placeholder="Status"
          clearable
          filterable
        />
        <n-input
          v-model:value="search"
          placeholder="Cari invoice..."
          clearable
          @clear="fetchData"
          @keyup.enter="fetchData"
          class="search-input"
        >
          <template #prefix>
            <n-icon :component="Search" :size="16" style="opacity: 0.4" />
          </template>
        </n-input>
      </div>
    </div>

    <!-- Desktop Table -->
    <n-card v-if="!isMobile" class="table-card" :bordered="true">
      <n-data-table :columns="columns" :data="data" :loading="loading" :bordered="false" :pagination="pagination" :scroll-x="750" remote />
    </n-card>

    <!-- Mobile/Tablet Cards -->
    <div v-else class="inv-list">
      <div v-if="loading" class="inv-empty"><n-spin :show="true" /></div>
      <template v-else-if="data.length">
        <div
          v-for="row in data"
          :key="row.id"
          class="inv-card"
          @click="router.push(`/invoices/${row.id}`)"
        >
          <div class="inv-card-top">
            <div class="inv-card-info">
              <div class="inv-card-number">{{ row.invoice_number }}</div>
              <div class="inv-card-customer">{{ row.customer?.name || '-' }}</div>
            </div>
            <div
              class="inv-card-status"
              :style="{ color: statusMap[row.status]?.color, background: statusMap[row.status]?.bg }"
            >
              <span class="status-dot" :style="{ background: statusMap[row.status]?.color }" />
              {{ statusMap[row.status]?.label || row.status }}
            </div>
          </div>

          <div class="inv-card-stats">
            <div class="inv-stat">
              <span class="stat-label">Total</span>
              <span class="stat-val">{{ (row.total_amount || 0).toLocaleString('id-ID') }}</span>
            </div>
            <div class="inv-stat">
              <span class="stat-label">Periode</span>
              <span class="stat-val">{{ row.period_month && row.period_year ? `${String(row.period_month).padStart(2, '0')}/${row.period_year}` : '-' }}</span>
            </div>
            <div class="inv-stat">
              <span class="stat-label">Jatuh Tempo</span>
              <span class="stat-val">{{ row.due_date?.split('T')[0] || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Mobile pagination -->
        <div class="inv-pagination">
          <n-button size="small" :disabled="page <= 1" @click="handlePageChange(page - 1)">
            <n-icon :component="ChevronLeft" :size="16" />
          </n-button>
          <span class="pagination-info">{{ page }} / {{ Math.ceil(total / pageSize) || 1 }}</span>
          <n-button size="small" :disabled="page >= Math.ceil(total / pageSize)" @click="handlePageChange(page + 1)">
            <n-icon :component="ChevronRight" :size="16" />
          </n-button>
        </div>
      </template>

      <div v-else class="inv-empty">
        <n-icon :component="FileText" :size="48" style="opacity: 0.2" />
        <span>Belum ada invoice</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-page {
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

.status-filter { width: 140px; }
.search-input { width: 200px; }

.table-card {
  border-radius: 12px !important;
}
:root:not(.dark) .table-card { border-color: rgba(0,0,0,0.08) !important; }
:root.dark .table-card { border-color: rgba(255,255,255,0.08) !important; }

/* ── Cards ── */
.inv-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inv-card {
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.15s;
  border: 1px solid rgba(128,128,128,0.12);
  background: rgba(128,128,128,0.02);
}
:root.dark .inv-card {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.08);
}
.inv-card:active { transform: scale(0.99); }

.inv-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.inv-card-info { min-width: 0; }

.inv-card-number {
  font-weight: 700;
  font-size: 14px;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-card-customer {
  font-size: 13px;
  opacity: 0.6;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-card-status {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.inv-card-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.inv-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(128,128,128,0.05);
  flex: 1;
  min-width: 0;
}
:root.dark .inv-stat { background: rgba(255,255,255,0.04); }

.stat-label {
  font-size: 11px;
  opacity: 0.45;
}

.stat-val {
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 0;
}

.pagination-info {
  font-size: 13px;
  opacity: 0.6;
  font-weight: 600;
}

.inv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  opacity: 0.5;
  font-size: 14px;
}

/* ── Tablet 2-col ── */
@media (min-width: 640px) and (max-width: 1023px) {
  .inv-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .inv-pagination, .inv-empty {
    grid-column: 1 / -1;
  }
}

/* ── Responsive header ── */
@media (max-width: 1023px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions { width: 100%; }
  .status-filter { flex: 0 0 auto; width: 130px; }
  .search-input { flex: 1; width: auto; }
}

@media (max-width: 480px) {
  .page-title { font-size: 18px; }
  .header-actions { flex-wrap: wrap; }
  .status-filter { flex: 1; width: auto; min-width: 100px; }
  .search-input { flex: 1; min-width: 140px; }
  .inv-card-stats { flex-direction: column; gap: 6px; }
}
</style>
