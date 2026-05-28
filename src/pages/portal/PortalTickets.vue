<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NTag, NSpin, NEmpty } from 'naive-ui'
import {
  ChatbubbleEllipsesOutline as TicketIcon,
  AddOutline as AddIcon,
  ArrowForwardOutline as ArrowIcon,
  AlertCircleOutline as OpenIcon,
  HourglassOutline as ProgressIcon,
  CheckmarkCircleOutline as ResolvedIcon,
  LockClosedOutline as ClosedIcon,
  TimeOutline as TimeIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'

const router = useRouter()
const loading = ref(true)
const data = ref<any[]>([])

onMounted(async () => {
  try {
    const { data: res } = await portalApi.tickets()
    data.value = res.data || []
  } catch { /* ignore */ }
  loading.value = false
})

function statusConfig(s: string) {
  const m: Record<string, { label: string; type: string; icon: any; color: string }> = {
    open: { label: 'Baru', type: 'error', icon: OpenIcon, color: '#ef4444' },
    in_progress: { label: 'Diproses', type: 'warning', icon: ProgressIcon, color: '#f59e0b' },
    resolved: { label: 'Selesai', type: 'success', icon: ResolvedIcon, color: '#22c55e' },
    closed: { label: 'Ditutup', type: 'info', icon: ClosedIcon, color: '#6b7280' },
  }
  return m[s] || m.open
}

function priorityConfig(p: string) {
  const m: Record<string, { label: string; color: string }> = {
    low: { label: 'Rendah', color: '#6b7280' },
    medium: { label: 'Sedang', color: '#f59e0b' },
    high: { label: 'Tinggi', color: '#ef4444' },
  }
  return m[p] || m.medium
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

function timeAgo(d: string) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}
</script>

<template>
  <div class="tickets-page">
    <n-spin :show="loading" style="min-height: 200px">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title">Tiket Bantuan</h2>
          <p class="page-subtitle">Laporkan masalah atau tanyakan sesuatu</p>
        </div>
        <button class="create-btn" @click="router.push('/portal/tickets/create')">
          <n-icon :component="AddIcon" :size="18" />
          <span>Buat Tiket</span>
        </button>
      </div>

      <!-- Ticket list -->
      <div class="ticket-list" v-if="data.length > 0">
        <div
          v-for="t in data" :key="t.id"
          class="ticket-card"
          @click="router.push(`/portal/tickets/${t.id}`)"
        >
          <div class="ticket-top">
            <div class="ticket-status-dot" :style="{ background: statusConfig(t.status).color }"></div>
            <div class="ticket-subject">{{ t.subject }}</div>
            <n-icon :component="ArrowIcon" :size="14" class="ticket-arrow" />
          </div>
          <div class="ticket-meta">
            <n-tag :type="statusConfig(t.status).type as any" size="small" round>
              {{ statusConfig(t.status).label }}
            </n-tag>
            <span class="priority-badge" :style="{ color: priorityConfig(t.priority).color }">
              {{ priorityConfig(t.priority).label }}
            </span>
            <span class="ticket-time">
              <n-icon :component="TimeIcon" :size="12" />
              {{ timeAgo(t.created_at) }}
            </span>
          </div>
          <div class="ticket-desc" v-if="t.description">
            {{ t.description.length > 100 ? t.description.slice(0, 100) + '...' : t.description }}
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-box">
        <div class="empty-icon">
          <n-icon :component="TicketIcon" :size="48" />
        </div>
        <h3>Belum ada tiket</h3>
        <p>Punya masalah dengan layanan? Buat tiket bantuan dan tim kami akan segera membantu.</p>
        <button class="create-btn" @click="router.push('/portal/tickets/create')">
          <n-icon :component="AddIcon" :size="18" />
          <span>Buat Tiket Pertama</span>
        </button>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.tickets-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--app-text-primary);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--app-text-muted);
  margin: 4px 0 0;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--app-accent), #0097a7);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  white-space: nowrap;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--app-accent-strong);
}

/* Tickets */
.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ticket-card {
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ticket-card:hover {
  border-color: var(--app-accent);
  transform: translateX(2px);
}

.ticket-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ticket-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ticket-subject {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-arrow {
  color: var(--app-text-muted);
  opacity: 0.3;
  flex-shrink: 0;
}

.ticket-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.priority-badge {
  font-size: 12px;
  font-weight: 600;
}

.ticket-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--app-text-muted);
  margin-left: auto;
}

.ticket-desc {
  font-size: 13px;
  color: var(--app-text-muted);
  line-height: 1.5;
}

/* Empty state */
.empty-box {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  opacity: 0.5;
}

.empty-box h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0;
}

.empty-box p {
  font-size: 14px;
  color: var(--app-text-muted);
  max-width: 320px;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .page-header { flex-direction: column; }
  .ticket-time { margin-left: 0; }
}
</style>
