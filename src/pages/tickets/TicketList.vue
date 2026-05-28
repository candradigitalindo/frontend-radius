<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NDataTable, NButton, NSpace, NInput, NTag, NSelect, useMessage } from 'naive-ui'
import { ticketApi } from '../../api'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const statusFilter = ref<string | null>(null)

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

const statusOptions = [
  { label: 'Semua', value: null as unknown as string },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

function statusType(s: string): 'success' | 'warning' | 'error' | 'info' {
  const m: Record<string, any> = { open: 'error', in_progress: 'warning', resolved: 'success', closed: 'info' }
  return m[s] || 'default'
}

function priorityType(p: string): 'error' | 'warning' | 'info' {
  const m: Record<string, any> = { high: 'error', medium: 'warning', low: 'info' }
  return m[p] || 'info'
}

const columns = [
  { title: 'No. Tiket', key: 'ticket_number' },
  { title: 'Pelanggan', key: 'customer', render: (r: any) => r.customer?.name || '-' },
  { title: 'Subjek', key: 'subject' },
  { title: 'Prioritas', key: 'priority', render: (r: any) => h(NTag, { type: priorityType(r.priority), size: 'small' }, () => r.priority) },
  { title: 'Status', key: 'status', render: (r: any) => h(NTag, { type: statusType(r.status), size: 'small' }, () => r.status) },
  { title: 'Dibuat', key: 'created_at', render: (r: any) => r.created_at?.split('T')[0] || '-' },
  {
    title: 'Aksi', key: 'actions', render: (r: any) =>
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => router.push(`/tickets/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) })
  },
]

async function fetchData() {
  loading.value = true
  try {
    const params: any = { search: search.value }
    if (statusFilter.value) params.status = statusFilter.value
    const { data: res } = await ticketApi.list(params)
    data.value = res.data || []
  } catch { message.error('Gagal memuat tiket') }
  loading.value = false
}
onMounted(fetchData)
</script>

<template>
  <n-card title="Tiket Support">
    <template #header-extra>
      <n-space :vertical="isMobile" :size="isMobile ? 8 : 12">
        <n-select v-model:value="statusFilter" :options="statusOptions" :style="{ width: isMobile ? '100%' : '140px' }" @update:value="fetchData" clearable filterable placeholder="Status" />
        <n-input v-model:value="search" placeholder="Cari tiket..." clearable @clear="fetchData" @keyup.enter="fetchData" :style="{ width: isMobile ? '100%' : '200px' }" />
      </n-space>
    </template>

    <!-- Desktop: table -->
    <n-data-table v-if="isDesktop" :columns="columns" :data="data" :loading="loading" :bordered="false" />

    <!-- Tablet & Mobile: cards -->
    <div v-else>
      <div v-if="loading" style="text-align: center; padding: 24px">Memuat...</div>
      <div v-else-if="!data.length" style="text-align: center; padding: 24px; opacity: 0.6">Tidak ada tiket</div>
      <div v-else class="ticket-grid">
        <n-card v-for="r in data" :key="r.id" size="small" hoverable style="cursor: pointer" @click="router.push(`/tickets/${r.id}`)">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px">
            <span style="font-weight: 600; font-size: 13px">{{ r.ticket_number }}</span>
            <n-tag :type="statusType(r.status)" size="small">{{ r.status }}</n-tag>
          </div>
          <div style="font-weight: 500; margin-bottom: 4px">{{ r.subject }}</div>
          <div style="font-size: 12px; opacity: 0.7; margin-bottom: 6px">{{ r.customer?.name || '-' }}</div>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <n-tag :type="priorityType(r.priority)" size="tiny">{{ r.priority }}</n-tag>
            <span style="font-size: 11px; opacity: 0.5">{{ r.created_at?.split('T')[0] || '-' }}</span>
          </div>
        </n-card>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.ticket-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .ticket-grid {
    grid-template-columns: 1fr;
  }
}
</style>
