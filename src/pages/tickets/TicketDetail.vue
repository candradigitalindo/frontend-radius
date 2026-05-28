<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NDescriptions, NDescriptionsItem, NTag, NButton, NSpace,
  NInput, NTimeline, NTimelineItem, NSelect, useMessage
} from 'naive-ui'
import { ticketApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const ticket = ref<any>({})
const messages_ = ref<any[]>([])
const newMessage = ref('')
const sending = ref(false)
const id = route.params.id as string

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)

async function fetchData() {
  loading.value = true
  try {
    const [tRes, mRes] = await Promise.all([
      ticketApi.get(id),
      ticketApi.messages(id).catch(() => ({ data: [] })),
    ])
    ticket.value = tRes.data?.data || tRes.data
    messages_.value = mRes.data?.data || []
  } catch { message.error('Gagal memuat tiket') }
  loading.value = false
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  sending.value = true
  try {
    await ticketApi.reply(id, { message: newMessage.value })
    newMessage.value = ''
    message.success('Pesan terkirim')
    fetchData()
  } catch { message.error('Gagal mengirim pesan') }
  sending.value = false
}

async function updateStatus(status: string) {
  try {
    await ticketApi.updateStatus(id, status)
    message.success('Status diperbarui')
    fetchData()
  } catch { message.error('Gagal update status') }
}

onMounted(fetchData)
</script>

<template>
  <n-space vertical :size="16">
    <n-card :loading="loading">
      <template #header>
        <div :style="isMobile ? 'display: flex; flex-direction: column; gap: 8px' : 'display: flex; justify-content: space-between; align-items: center'">
          <span style="font-weight: 600; word-break: break-word">Tiket {{ ticket.ticket_number }} — {{ ticket.subject }}</span>
          <n-space :size="8">
            <n-select :value="ticket.status" filterable :options="[
              { label: 'Open', value: 'open' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Resolved', value: 'resolved' },
              { label: 'Closed', value: 'closed' },
            ]" @update:value="updateStatus" :style="{ width: isMobile ? '130px' : '150px' }" size="small" />
            <n-button size="small" @click="router.push('/tickets')">Kembali</n-button>
          </n-space>
        </div>
      </template>

      <n-descriptions bordered :column="isMobile ? 1 : 2" :label-placement="isMobile ? 'top' : 'left'">
        <n-descriptions-item label="Pelanggan">{{ ticket.customer?.name || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Prioritas">
          <n-tag :type="ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'info'" size="small">{{ ticket.priority }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="Kategori">{{ ticket.category || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Dibuat">{{ ticket.created_at?.split('T')[0] || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Deskripsi" :span="isMobile ? 1 : 2">{{ ticket.description }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <n-card title="Pesan">
      <n-timeline>
        <n-timeline-item v-for="m in messages_" :key="m.id" :time="m.created_at?.split('T')[0]" :type="m.sender_type === 'staff' ? 'success' : 'info'">
          <template #header>
            <strong>{{ m.sender_type === 'staff' ? 'Admin' : 'Pelanggan' }}</strong>
          </template>
          {{ m.message }}
        </n-timeline-item>
      </n-timeline>

      <div :style="{ marginTop: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }">
        <n-input v-model:value="newMessage" placeholder="Tulis balasan..." type="textarea" :rows="2" :style="{ width: isMobile ? '100%' : '400px', flexShrink: 0 }" />
        <n-button type="primary" :loading="sending" @click="sendMessage" :disabled="!newMessage.trim()" :style="isMobile ? { alignSelf: 'flex-end' } : {}">Kirim</n-button>
      </div>
    </n-card>
  </n-space>
</template>
