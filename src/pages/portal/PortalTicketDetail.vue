<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, NTag, NSpin, useMessage } from 'naive-ui'
import {
  ArrowBackOutline as BackIcon,
  SendOutline as SendIcon,
  PersonOutline as UserIcon,
  ShieldCheckmarkOutline as AdminIcon,
  AlertCircleOutline as OpenIcon,
  HourglassOutline as ProgressIcon,
  CheckmarkCircleOutline as ResolvedIcon,
  LockClosedOutline as ClosedIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const ticket = ref<any>({})
const messages_ = ref<any[]>([])
const newMessage = ref('')
const sending = ref(false)
const chatRef = ref<HTMLElement | null>(null)
const id = route.params.id as string

function statusConfig(s: string) {
  const m: Record<string, { label: string; type: string; icon: any; color: string }> = {
    open: { label: 'Baru', type: 'error', icon: OpenIcon, color: '#ef4444' },
    in_progress: { label: 'Diproses', type: 'warning', icon: ProgressIcon, color: '#f59e0b' },
    resolved: { label: 'Selesai', type: 'success', icon: ResolvedIcon, color: '#22c55e' },
    closed: { label: 'Ditutup', type: 'info', icon: ClosedIcon, color: '#6b7280' },
  }
  return m[s] || m.open
}

function priorityLabel(p: string) {
  const m: Record<string, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }
  return m[p] || p
}

function formatTime(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) +
    ' · ' + dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function scrollChat() {
  nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
  })
}

async function fetchData() {
  try {
    const [tRes, mRes] = await Promise.all([
      portalApi.ticket(id),
      portalApi.ticketMessages(id),
    ])
    ticket.value = tRes.data.data || tRes.data
    messages_.value = mRes.data.data || []
    scrollChat()
  } catch {
    message.error('Gagal memuat tiket')
  }
  loading.value = false
}

async function handleReply() {
  if (!newMessage.value.trim()) return
  sending.value = true
  try {
    await portalApi.replyTicket(id, { message: newMessage.value })
    newMessage.value = ''
    await fetchData()
  } catch {
    message.error('Gagal mengirim balasan')
  }
  sending.value = false
}

const isClosed = () => ticket.value.status === 'closed' || ticket.value.status === 'resolved'

onMounted(fetchData)
</script>

<template>
  <div class="detail-page">
    <n-spin :show="loading" style="min-height: 200px">
      <!-- Back -->
      <button class="back-btn" @click="router.push('/portal/tickets')">
        <n-icon :component="BackIcon" :size="18" />
        <span>Kembali</span>
      </button>

      <!-- Header card -->
      <div class="header-card" v-if="ticket.id">
        <div class="header-top">
          <div class="header-left">
            <h2 class="ticket-subject">{{ ticket.subject }}</h2>
            <div class="ticket-badges">
              <n-tag :type="statusConfig(ticket.status).type as any" size="small" round>
                <template #icon><n-icon :component="statusConfig(ticket.status).icon" :size="14" /></template>
                {{ statusConfig(ticket.status).label }}
              </n-tag>
              <span class="priority-text" :style="{ color: ticket.priority === 'high' ? '#ef4444' : ticket.priority === 'medium' ? '#f59e0b' : '#6b7280' }">
                {{ priorityLabel(ticket.priority) }}
              </span>
            </div>
          </div>
          <div class="ticket-date">
            {{ formatTime(ticket.created_at) }}
          </div>
        </div>

        <!-- Description -->
        <div class="ticket-description" v-if="ticket.description">
          {{ ticket.description }}
        </div>
      </div>

      <!-- Chat thread -->
      <div class="chat-section" v-if="ticket.id">
        <h3 class="chat-title">Percakapan</h3>

        <div class="chat-messages" ref="chatRef">
          <div v-if="messages_.length === 0" class="chat-empty">
            Belum ada pesan. Mulai percakapan dengan mengirim pesan di bawah.
          </div>

          <div
            v-for="msg in messages_" :key="msg.id"
            class="msg-row"
            :class="{ 'msg-admin': msg.sender_type === 'admin', 'msg-user': msg.sender_type !== 'admin' }"
          >
            <div class="msg-avatar" :class="{ admin: msg.sender_type === 'admin' }">
              <n-icon :component="msg.sender_type === 'admin' ? AdminIcon : UserIcon" :size="16" />
            </div>
            <div class="msg-bubble">
              <div class="msg-header">
                <span class="msg-sender">{{ msg.sender_type === 'admin' ? 'Admin' : 'Anda' }}</span>
                <span class="msg-time">{{ formatTime(msg.created_at) }}</span>
              </div>
              <div class="msg-text">{{ msg.message }}</div>
            </div>
          </div>
        </div>

        <!-- Reply input -->
        <div v-if="!isClosed()" class="reply-box">
          <input
            v-model="newMessage"
            class="reply-input"
            placeholder="Tulis balasan..."
            @keyup.enter="handleReply"
            :disabled="sending"
          />
          <button class="reply-send" :disabled="sending || !newMessage.trim()" @click="handleReply">
            <n-icon :component="SendIcon" :size="18" />
          </button>
        </div>
        <div v-else class="closed-notice">
          <n-icon :component="ClosedIcon" :size="16" />
          <span>Tiket ini sudah {{ ticket.status === 'resolved' ? 'diselesaikan' : 'ditutup' }}</span>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--app-accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  margin-bottom: 4px;
}

/* Header */
.header-card {
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.ticket-subject {
  font-size: 18px;
  font-weight: 800;
  color: var(--app-text-primary);
  margin: 0;
}

.ticket-badges {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.priority-text {
  font-size: 12px;
  font-weight: 600;
}

.ticket-date {
  font-size: 12px;
  color: var(--app-text-muted);
  white-space: nowrap;
}

.ticket-description {
  font-size: 14px;
  color: var(--app-text-muted);
  line-height: 1.6;
  padding-top: 4px;
  border-top: 1px solid var(--app-card-border);
}

/* Chat */
.chat-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 460px;
  overflow-y: auto;
  padding: 8px 0;
}

.chat-empty {
  text-align: center;
  padding: 32px 16px;
  font-size: 13px;
  color: var(--app-text-muted);
}

.msg-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.msg-row.msg-user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  border: 1px solid var(--app-card-border);
}

.msg-avatar.admin {
  background: #6366f114;
  color: #6366f1;
}

.msg-bubble {
  max-width: 70%;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-user .msg-bubble {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: #fff;
}

.msg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.msg-sender {
  font-size: 12px;
  font-weight: 700;
}

.msg-user .msg-sender {
  color: rgba(255,255,255,0.8);
}

.msg-admin .msg-sender {
  color: var(--app-text-primary);
}

.msg-time {
  font-size: 11px;
  opacity: 0.6;
}

.msg-text {
  font-size: 14px;
  line-height: 1.5;
}

.msg-admin .msg-text {
  color: var(--app-text-primary);
}

/* Reply */
.reply-box {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--app-card-border);
}

.reply-input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid var(--app-card-border);
  border-radius: 12px;
  background: var(--app-bg-secondary, rgba(255,255,255,0.03));
  color: var(--app-text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.reply-input:focus {
  border-color: var(--app-accent);
}

.reply-send {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--app-accent), #0097a7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.reply-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--app-accent-strong);
}

.reply-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.closed-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
  font-size: 13px;
  color: var(--app-text-muted);
}

@media (max-width: 480px) {
  .msg-bubble { max-width: 85%; }
  .header-top { flex-direction: column; }
}
</style>
