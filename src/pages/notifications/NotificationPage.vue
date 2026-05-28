<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import {
  NCard, NGrid, NGridItem, NStatistic, NTag, NButton, NSpace, NEmpty,
  NSelect, NInput, NModal, NPagination, NSpin,
  NText, NPopconfirm, useMessage,
} from 'naive-ui'
import { notificationApi, customerApi } from '../../api'

const message = useMessage()
const loading = ref(true)
const data = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)

// Send / Broadcast modal
const showSendModal = ref(false)
const showBroadcastModal = ref(false)
const sendLoading = ref(false)
const customerOptions = ref<{ label: string; value: string }[]>([])
const customerSearch = ref('')
const sendForm = ref({ customer_id: '', title: '', body: '' })
const broadcastForm = ref({ title: '', body: '', target: 'all' })
const sendBodyCount = computed(() => sendForm.value.body.length)
const broadcastBodyCount = computed(() => broadcastForm.value.body.length)

// WA editor refs
const sendBodyRef = ref<InstanceType<typeof NInput> | null>(null)
const broadcastBodyRef = ref<InstanceType<typeof NInput> | null>(null)

function wrapText(mode: 'send' | 'broadcast', prefix: string, suffix = prefix) {
  const inst = mode === 'send' ? sendBodyRef.value : broadcastBodyRef.value
  const textarea = (inst as any)?.textareaElRef as HTMLTextAreaElement | null
  const form = mode === 'send' ? sendForm.value : broadcastForm.value
  if (!textarea) { form.body += prefix + suffix; return }
  const start = textarea.selectionStart ?? form.body.length
  const end = textarea.selectionEnd ?? start
  const selected = form.body.substring(start, end)
  form.body = form.body.substring(0, start) + prefix + selected + suffix + form.body.substring(end)
  nextTick(() => {
    if (selected) {
      textarea.selectionStart = start + prefix.length
      textarea.selectionEnd = start + prefix.length + selected.length
    } else {
      textarea.selectionStart = start + prefix.length
      textarea.selectionEnd = start + prefix.length
    }
    textarea.focus()
  })
}

function insertLinePrefix(mode: 'send' | 'broadcast', prefix: string) {
  const inst = mode === 'send' ? sendBodyRef.value : broadcastBodyRef.value
  const textarea = (inst as any)?.textareaElRef as HTMLTextAreaElement | null
  const form = mode === 'send' ? sendForm.value : broadcastForm.value
  const pos = textarea?.selectionStart ?? form.body.length
  const lineStart = form.body.lastIndexOf('\n', pos - 1) + 1
  form.body = form.body.substring(0, lineStart) + prefix + form.body.substring(lineStart)
  nextTick(() => { textarea?.focus() })
}

// ── Emoji Picker ──
const emojiPickerVisible = ref<'send' | 'broadcast' | null>(null)
const emojiCursorPos = ref<Record<'send' | 'broadcast', number>>({ send: 0, broadcast: 0 })

const emojiCategories = [
  {
    label: 'Sering', icon: '⭐',
    emojis: ['😊','😂','🙏','👍','❤️','🔥','✅','⚠️','📢','📣','💡','🎉','🚀','💰','📅','🕐','📞','📱','💬','🔔'],
  },
  {
    label: 'Ekspresi', icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🥰','😍','😘','😗','😙','😚','🙂','🤗','🤩','🥳','😎','🤓','🧐','😏','😒','🙄','😬','🤐','😔','😞','😟','😠','😡','🤬','😢','😭','😤','😩','😫','🤮','🤒','😷'],
  },
  {
    label: 'Gestur', icon: '👋',
    emojis: ['👋','🤚','✋','🖐️','👌','🤌','🤏','✌️','🤞','🤟','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤲','🙏','💪','🦾','🖖'],
  },
  {
    label: 'Simbol', icon: '✅',
    emojis: ['✅','❌','⭕','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔶','🔷','🔸','🔹','▶️','⏩','⏪','⏫','⏬','⏭️','⏮️','🔔','🔕','📢','📣','💬','💭','🗯️','⚠️','🚫','🔞','❗','❓','‼️','⁉️','🔱','⚜️','🆕','🆙','🆒','🆓','🆖'],
  },
  {
    label: 'Bisnis', icon: '💼',
    emojis: ['💼','📁','📂','🗂️','📋','📊','📈','📉','🗒️','📝','✏️','🖊️','🖋️','📌','📍','📎','🖇️','📏','📐','🔗','💡','🔦','🔑','🗝️','🔒','🔓','🔧','🔨','⚙️','🖥️','💻','📱','☎️','📞','📠','📧','📨','📩','📮','🏠','🏢','🏦','💳','💰','💵','💴','💶','💷','💸','🏷️'],
  },
  {
    label: 'Waktu', icon: '📅',
    emojis: ['📅','📆','🗓️','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛','⏰','⏱️','⏲️','🕰️','⌚','📡','🌅','🌄','🌃','🌆','🌇','🌉','🌙','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️'],
  },
]

const emojiSearch = ref('')
const emojiActiveTab = ref(0)

const filteredEmojis = computed(() => {
  const q = emojiSearch.value.trim()
  if (!q) return emojiCategories[emojiActiveTab.value]?.emojis ?? []
  const all = emojiCategories.flatMap(c => c.emojis)
  // simple filter: return all emojis (no text metadata), so just return all when searching
  return all
})

function saveCursor(mode: 'send' | 'broadcast') {
  const inst = mode === 'send' ? sendBodyRef.value : broadcastBodyRef.value
  const textarea = (inst as any)?.textareaElRef as HTMLTextAreaElement | null
  if (textarea) emojiCursorPos.value[mode] = textarea.selectionStart ?? 0
}

function toggleEmojiPicker(mode: 'send' | 'broadcast') {
  if (emojiPickerVisible.value === mode) {
    emojiPickerVisible.value = null
    return
  }
  // save cursor before opening picker
  const inst = mode === 'send' ? sendBodyRef.value : broadcastBodyRef.value
  const textarea = (inst as any)?.textareaElRef as HTMLTextAreaElement | null
  if (textarea) emojiCursorPos.value[mode] = textarea.selectionStart ?? 0
  emojiSearch.value = ''
  emojiActiveTab.value = 0
  emojiPickerVisible.value = mode
}

function insertEmoji(mode: 'send' | 'broadcast', emoji: string) {
  const form = mode === 'send' ? sendForm.value : broadcastForm.value
  const pos = emojiCursorPos.value[mode]
  form.body = form.body.substring(0, pos) + emoji + form.body.substring(pos)
  emojiCursorPos.value[mode] = pos + emoji.length
  // restore focus & cursor
  const inst = mode === 'send' ? sendBodyRef.value : broadcastBodyRef.value
  const textarea = (inst as any)?.textareaElRef as HTMLTextAreaElement | null
  nextTick(() => {
    if (textarea) {
      textarea.focus()
      const newPos = pos + emoji.length
      textarea.selectionStart = newPos
      textarea.selectionEnd = newPos
    }
  })
}

function closeEmojiOnOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.emoji-picker') && !target.closest('.wa-emoji-btn')) {
    emojiPickerVisible.value = null
  }
}

onMounted(() => document.addEventListener('mousedown', closeEmojiOnOutside))
onUnmounted(() => document.removeEventListener('mousedown', closeEmojiOnOutside))

const sendAttachment = ref<File | null>(null)
const broadcastAttachment = ref<File | null>(null)

const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16MB (sesuai limit WA)

function handleFileChange(event: Event, mode: 'send' | 'broadcast') {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (file.size > MAX_FILE_SIZE) {
    message.warning('Ukuran file maksimal 16MB')
    target.value = ''
    return
  }
  if (mode === 'send') sendAttachment.value = file
  else broadcastAttachment.value = file
}

function clearAttachment(mode: 'send' | 'broadcast') {
  if (mode === 'send') sendAttachment.value = null
  else broadcastAttachment.value = null
}

function relativeTime(dateStr: string) {
  if (!dateStr) return '-'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await notificationApi.list({ page: page.value, per_page: perPage.value })
    data.value = res.data || []
    total.value = res.total || 0
  } catch { message.error('Gagal memuat notifikasi') }
  loading.value = false
}

async function searchCustomer(q: string) {
  customerSearch.value = q
  if (q.length < 2) return
  try {
    const { data: res } = await customerApi.list({ search: q, per_page: 20 })
    customerOptions.value = (res.data || []).map((c: any) => ({
      label: `${c.name} (${c.pppoe_user || c.customer_code || ''})`,
      value: c.id,
    }))
  } catch { /* ignore */ }
}

async function handleSend() {
  if (!sendForm.value.customer_id || !sendForm.value.title || !sendForm.value.body) {
    message.warning('Customer, judul, dan isi wajib diisi')
    return
  }
  sendLoading.value = true
  try {
    let payload: FormData | Record<string, any>
    if (sendAttachment.value) {
      const fd = new FormData()
      fd.append('customer_id', sendForm.value.customer_id)
      fd.append('title', sendForm.value.title)
      fd.append('body', sendForm.value.body)
      fd.append('file', sendAttachment.value)
      payload = fd
    } else {
      payload = {
        customer_id: sendForm.value.customer_id,
        title: sendForm.value.title,
        body: sendForm.value.body,
      }
    }
    await notificationApi.send(payload)
    message.success('Notifikasi terkirim')
    showSendModal.value = false
    emojiPickerVisible.value = null
    sendForm.value = { customer_id: '', title: '', body: '' }
    sendAttachment.value = null
    fetchData()
  } catch (err: any) { message.error(err?.response?.data?.error || err?.response?.data?.message || 'Gagal mengirim') }
  sendLoading.value = false
}

async function handleBroadcast() {
  if (!broadcastForm.value.title || !broadcastForm.value.body) {
    message.warning('Judul dan isi wajib diisi')
    return
  }
  sendLoading.value = true
  try {
    let payload: FormData | Record<string, any>
    if (broadcastAttachment.value) {
      const fd = new FormData()
      fd.append('title', broadcastForm.value.title)
      fd.append('body', broadcastForm.value.body)
      fd.append('target', broadcastForm.value.target)
      fd.append('file', broadcastAttachment.value)
      payload = fd
    } else {
      payload = {
        title: broadcastForm.value.title,
        body: broadcastForm.value.body,
        target: broadcastForm.value.target,
      }
    }
    const { data: res } = await notificationApi.broadcast(payload)
    message.success(`Broadcast terkirim ke ${res.sent || 0} pelanggan`)
    showBroadcastModal.value = false
    emojiPickerVisible.value = null
    broadcastForm.value = { title: '', body: '', target: 'all' }
    broadcastAttachment.value = null
    fetchData()
  } catch (err: any) { message.error(err?.response?.data?.error || err?.response?.data?.message || 'Gagal broadcast') }
  sendLoading.value = false
}

function handlePageChange(p: number) { page.value = p; fetchData() }

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
window.addEventListener('resize', onResize)
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)

onMounted(fetchData)
</script>

<template>
  <n-space vertical :size="16">
    <n-grid :cols="1" :x-gap="12" :y-gap="12" responsive="screen" item-responsive>
      <n-grid-item span="1">
        <n-card size="small" hoverable :style="{ borderLeft: '3px solid #3b82f6' }">
          <n-statistic label="Total Notifikasi" :value="total" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- Main Card -->
    <n-card title="Notifikasi">
      <template #header-extra>
        <n-space wrap :size="8">
          <n-button size="small" type="primary" @click="showSendModal = true">{{ isMobile ? 'Kirim' : 'Kirim Notifikasi' }}</n-button>
          <n-button size="small" type="info" @click="showBroadcastModal = true">Broadcast</n-button>
        </n-space>
      </template>

      <n-spin :show="loading">
        <!-- Empty State -->
        <n-empty v-if="!loading && data.length === 0" description="Tidak ada notifikasi" style="padding: 40px 0" />

        <!-- Notification Cards -->
        <n-space v-else vertical :size="8">
          <div
            v-for="notif in data" :key="notif.id"
            class="notif-item"
            :style="{ borderLeft: '3px solid #3b82f6' }"
          >
            <div class="notif-content">
              <div class="notif-header">
                <n-space align="center" :size="8" wrap>
                  <n-text strong :style="{ fontSize: '14px' }">{{ notif.title }}</n-text>
                  <n-tag v-if="notif.customer_id" size="tiny" :bordered="false">Pelanggan</n-tag>
                  <n-tag v-if="notif.icon" size="tiny" :bordered="false" type="info">{{ notif.icon }}</n-tag>
                  <n-tag v-if="notif.badge" size="tiny" :bordered="false" type="warning">{{ notif.badge }}</n-tag>
                </n-space>
              </div>
              <n-text depth="2" :style="{ fontSize: '13px', lineHeight: '1.5' }">{{ notif.body }}</n-text>
              <n-text v-if="notif.caption" depth="3" :style="{ fontSize: '12px' }">{{ notif.caption }}</n-text>
              <n-text depth="3" :style="{ fontSize: '12px' }">{{ relativeTime(notif.created_at) }}</n-text>
            </div>
          </div>
        </n-space>
      </n-spin>

      <!-- Pagination -->
      <n-space justify="center" style="margin-top: 16px" v-if="total > perPage">
        <n-pagination :page="page" :page-count="Math.ceil(total / perPage)" @update:page="handlePageChange" />
      </n-space>
    </n-card>

    <!-- Send Notification Modal -->
    <n-modal v-model:show="showSendModal" :mask-closable="false" :style="{ maxWidth: '780px', width: '96vw' }">
      <div class="modal-wrap">

        <!-- Header -->
        <div class="modal-header">
          <div class="modal-header-icon modal-header-icon--send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </div>
          <div>
            <div class="modal-title">Kirim Notifikasi</div>
            <div class="modal-subtitle">Kirim pesan langsung ke satu pelanggan</div>
          </div>
          <button class="modal-close" @click="showSendModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- 2-Column Body -->
        <div class="send-cols">

          <!-- Left: metadata -->
          <div class="send-left">
            <div class="send-left-title">Detail Pengiriman</div>

            <div class="field-group">
              <label class="field-label">Pelanggan <span class="required">*</span></label>
              <n-select
                v-model:value="sendForm.customer_id"
                filterable remote clearable
                placeholder="Cari nama / kode..."
                :options="customerOptions"
                @search="searchCustomer"
              />
            </div>

            <div class="field-group" style="margin-top: 14px">
              <label class="field-label">Judul <span class="required">*</span></label>
              <n-input
                v-model:value="sendForm.title"
                placeholder="Judul notifikasi..."
                maxlength="100"
                show-count
              />
            </div>

            <div class="field-group" style="margin-top: 14px">
              <label class="field-label">Lampiran <span class="optional-badge">opsional</span></label>
              <label class="file-dropzone file-dropzone--compact">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l8.57-8.57A4 4 0 1118 8.84l-8.59 8.57a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                <span v-if="!sendAttachment">Pilih file &middot; maks. 2MB</span>
                <span v-else class="file-name">{{ sendAttachment.name }}</span>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style="display:none" @change="(e) => handleFileChange(e, 'send')" />
              </label>
              <n-button v-if="sendAttachment" text type="error" size="tiny" style="margin-top: 4px" @click="clearAttachment('send')">Hapus lampiran</n-button>
            </div>
          </div>

          <!-- Right: message editor -->
          <div class="send-right">
            <div class="field-label" style="margin-bottom: 8px">Isi Pesan <span class="required">*</span></div>
            <div class="wa-editor wa-editor--full">
              <div class="wa-toolbar">
                <button class="wa-btn" title="Bold" @mousedown.prevent="wrapText('send', '*')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 4h8a4 4 0 010 8H6zm0 8h9a4 4 0 010 8H6z"/></svg>
                </button>
                <button class="wa-btn" title="Italic" @mousedown.prevent="wrapText('send', '_')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                </button>
                <button class="wa-btn" title="Strikethrough" @mousedown.prevent="wrapText('send', '~')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6c0-1.66-1.79-3-4-3s-4 1.34-4 3c0 4 8 4 8 8 0 1.66-1.79 3-4 3s-4-1.34-4-3"/></svg>
                </button>
                <button class="wa-btn wa-btn--mono" title="Monospace" @mousedown.prevent="wrapText('send', '`')">M</button>
                <span class="wa-sep" />
                <button class="wa-btn" title="Bullet" @mousedown.prevent="insertLinePrefix('send', '- ')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
                </button>
                <button class="wa-btn" title="Numbered" @mousedown.prevent="insertLinePrefix('send', '1. ')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><path d="M4 6h1v4M4 10h2M4 14l2-2c0 0-.5 2-2 4h2" stroke-linejoin="round"/></svg>
                </button>
                <button class="wa-btn" title="Quote" @mousedown.prevent="insertLinePrefix('send', '> ')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M10 7H6a1 1 0 00-1 1v4a1 1 0 001 1h2v2a2 2 0 01-2 2H5a1 1 0 000 2h1a4 4 0 004-4V8a1 1 0 00-1-1zm9 0h-4a1 1 0 00-1 1v4a1 1 0 001 1h2v2a2 2 0 01-2 2h-1a1 1 0 000 2h1a4 4 0 004-4V8a1 1 0 00-1-1z"/></svg>
                </button>
                <span class="wa-sep" />
                <button
                  class="wa-btn wa-emoji-btn"
                  :class="{ 'wa-btn--active': emojiPickerVisible === 'send' }"
                  title="Emoji"
                  @mousedown.prevent="saveCursor('send')"
                  @click="toggleEmojiPicker('send')"
                >😊</button>
                <span class="wa-count">{{ sendBodyCount }} / 500</span>
              </div>
              <!-- Emoji Picker: Send -->
              <div v-if="emojiPickerVisible === 'send'" class="emoji-picker">
                <div class="emoji-search-row">
                  <input v-model="emojiSearch" class="emoji-search" placeholder="Cari emoji..." autocomplete="off" />
                </div>
                <div v-if="!emojiSearch" class="emoji-tabs">
                  <button
                    v-for="(cat, i) in emojiCategories" :key="i"
                    class="emoji-tab" :class="{ active: emojiActiveTab === i }"
                    @click="emojiActiveTab = i"
                    :title="cat.label"
                  >{{ cat.icon }}</button>
                </div>
                <div v-if="!emojiSearch" class="emoji-cat-label">{{ emojiCategories[emojiActiveTab]?.label }}</div>
                <div class="emoji-grid">
                  <button
                    v-for="em in filteredEmojis" :key="em"
                    class="emoji-cell"
                    @mousedown.prevent="insertEmoji('send', em)"
                  >{{ em }}</button>
                </div>
              </div>
              <n-input
                ref="sendBodyRef"
                v-model:value="sendForm.body"
                type="textarea"
                :rows="12"
                placeholder="Tulis isi pesan di sini...&#10;&#10;Gunakan toolbar di atas atau ketik format WA langsung:&#10;*bold*  _italic_  ~coret~  `mono`&#10;&#10;Atau ketik emoji: 🔔 ⚠️ ✅ 📢"
                :maxlength="500"
                class="wa-textarea"
              />
              <div class="wa-hint">
                <code>*bold*</code><code>_italic_</code><code>~coret~</code><code>`mono`</code><code>- list</code><code>&gt; quote</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <n-button @click="showSendModal = false">Batal</n-button>
          <n-button type="primary" :loading="sendLoading" @click="handleSend">
            <template #icon>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </template>
            Kirim Notifikasi
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Broadcast Modal -->
    <n-modal v-model:show="showBroadcastModal" :mask-closable="false" :style="{ maxWidth: '560px', width: '95vw' }">
      <div class="modal-wrap">

        <!-- Header -->
        <div class="modal-header">
          <div class="modal-header-icon modal-header-icon--broadcast">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .04h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
          </div>
          <div>
            <div class="modal-title">Broadcast Notifikasi</div>
            <div class="modal-subtitle">Kirim pesan serentak ke semua pelanggan</div>
          </div>
          <button class="modal-close" @click="showBroadcastModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Info strip -->
        <div class="bc-strip">
          <div class="bc-strip-item">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Target: <strong>{{ { all: 'Semua', active: 'Aktif', inactive: 'Nonaktif', isolated: 'Diisolir' }[broadcastForm.target] }}</strong>
          </div>
          <span class="bc-strip-dot" />
          <div class="bc-strip-item bc-strip-item--warn">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Tidak bisa dibatalkan setelah dikirim
          </div>
        </div>

        <!-- Body -->
        <div class="bc-body">

          <!-- Target + Judul (row) -->
          <div class="bc-top-row">
            <div class="field-group bc-field-title">
              <label class="field-label">Judul <span class="required">*</span></label>
              <n-input
                v-model:value="broadcastForm.title"
                placeholder="Contoh: Pengumuman Pemeliharaan Jaringan"
                maxlength="100"
                show-count
              />
            </div>
            <div class="field-group bc-field-target">
              <label class="field-label">Target</label>
              <n-select
                v-model:value="broadcastForm.target"
                :options="[
                  { label: 'Semua Pelanggan', value: 'all' },
                  { label: 'Aktif', value: 'active' },
                  { label: 'Nonaktif', value: 'inactive' },
                  { label: 'Diisolir', value: 'isolated' },
                ]"
              />
            </div>
          </div>

          <!-- Isi Pesan -->
          <div class="field-group" style="margin-top: 14px">
            <label class="field-label">Isi Pesan <span class="required">*</span></label>
            <div class="wa-editor">
              <div class="wa-toolbar">
                <button class="wa-btn" title="Bold" @mousedown.prevent="wrapText('broadcast', '*')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 4h8a4 4 0 010 8H6zm0 8h9a4 4 0 010 8H6z"/></svg>
                </button>
                <button class="wa-btn" title="Italic" @mousedown.prevent="wrapText('broadcast', '_')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                </button>
                <button class="wa-btn" title="Strikethrough" @mousedown.prevent="wrapText('broadcast', '~')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6c0-1.66-1.79-3-4-3s-4 1.34-4 3c0 4 8 4 8 8 0 1.66-1.79 3-4 3s-4-1.34-4-3"/></svg>
                </button>
                <button class="wa-btn wa-btn--mono" title="Monospace" @mousedown.prevent="wrapText('broadcast', '`')">M</button>
                <span class="wa-sep" />
                <button class="wa-btn" title="Bullet list" @mousedown.prevent="insertLinePrefix('broadcast', '- ')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
                </button>
                <button class="wa-btn" title="Numbered list" @mousedown.prevent="insertLinePrefix('broadcast', '1. ')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><path d="M4 6h1v4M4 10h2M4 14l2-2c0 0-.5 2-2 4h2" stroke-linejoin="round"/></svg>
                </button>
                <button class="wa-btn" title="Quote" @mousedown.prevent="insertLinePrefix('broadcast', '> ')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M10 7H6a1 1 0 00-1 1v4a1 1 0 001 1h2v2a2 2 0 01-2 2H5a1 1 0 000 2h1a4 4 0 004-4V8a1 1 0 00-1-1zm9 0h-4a1 1 0 00-1 1v4a1 1 0 001 1h2v2a2 2 0 01-2 2h-1a1 1 0 000 2h1a4 4 0 004-4V8a1 1 0 00-1-1z"/></svg>
                </button>
                <span class="wa-sep" />
                <button
                  class="wa-btn wa-emoji-btn"
                  :class="{ 'wa-btn--active': emojiPickerVisible === 'broadcast' }"
                  title="Emoji"
                  @mousedown.prevent="saveCursor('broadcast')"
                  @click="toggleEmojiPicker('broadcast')"
                >😊</button>
                <span class="wa-count">{{ broadcastBodyCount }} / 500</span>
              </div>
              <!-- Emoji Picker: Broadcast -->
              <div v-if="emojiPickerVisible === 'broadcast'" class="emoji-picker">
                <div class="emoji-search-row">
                  <input v-model="emojiSearch" class="emoji-search" placeholder="Cari emoji..." autocomplete="off" />
                </div>
                <div v-if="!emojiSearch" class="emoji-tabs">
                  <button
                    v-for="(cat, i) in emojiCategories" :key="i"
                    class="emoji-tab" :class="{ active: emojiActiveTab === i }"
                    @click="emojiActiveTab = i"
                    :title="cat.label"
                  >{{ cat.icon }}</button>
                </div>
                <div v-if="!emojiSearch" class="emoji-cat-label">{{ emojiCategories[emojiActiveTab]?.label }}</div>
                <div class="emoji-grid">
                  <button
                    v-for="em in filteredEmojis" :key="em"
                    class="emoji-cell"
                    @mousedown.prevent="insertEmoji('broadcast', em)"
                  >{{ em }}</button>
                </div>
              </div>
              <n-input
                ref="broadcastBodyRef"
                v-model:value="broadcastForm.body"
                type="textarea"
                :rows="7"
                placeholder="Tulis isi broadcast...&#10;Gunakan toolbar atau format WA langsung: *bold* _italic_ ~coret~&#10;&#10;📢 ⚠️ ✅ bisa pakai emoji"
                :maxlength="500"
                class="wa-textarea"
              />
              <div class="wa-hint">
                <code>*bold*</code><code>_italic_</code><code>~coret~</code><code>`mono`</code><code>- list</code><code>&gt; quote</code>
              </div>
            </div>
          </div>

          <!-- Lampiran inline -->
          <div class="bc-attach-row" style="margin-top: 14px">
            <label class="bc-attach-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l8.57-8.57A4 4 0 1118 8.84l-8.59 8.57a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              <span v-if="!broadcastAttachment" class="bc-attach-placeholder">Lampirkan file <em>opsional · maks. 2MB</em></span>
              <span v-else class="bc-attach-name">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                {{ broadcastAttachment.name }}
              </span>
              <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style="display:none" @change="(e) => handleFileChange(e, 'broadcast')" />
            </label>
            <button v-if="broadcastAttachment" class="bc-attach-remove" title="Hapus lampiran" @click="clearAttachment('broadcast')">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <n-button @click="showBroadcastModal = false">Batal</n-button>
          <n-popconfirm @positive-click="handleBroadcast">
            <template #trigger>
              <n-button type="warning" :loading="sendLoading">
                <template #icon>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .04h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                </template>
                Kirim Broadcast
              </n-button>
            </template>
            Yakin broadcast ke semua pelanggan?
          </n-popconfirm>
        </div>

      </div>
    </n-modal>
  </n-space>
</template>

<style scoped>
/* ── Notification list ── */
@media (max-width: 639px) {
  :deep(.n-card-header) { flex-direction: column; align-items: flex-start !important; gap: 8px; }
  :deep(.n-card-header__extra) { width: 100%; }
}

.notif-item {
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color, #e5e7eb);
  transition: box-shadow 0.2s;
}
@media (max-width: 639px) { .notif-item { padding: 10px 12px; } }

.notif-content { display: flex; flex-direction: column; gap: 4px; }
.notif-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }

/* ── Modal shell ── */
.modal-wrap {
  background: var(--n-color, #fff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.15);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 18px;
  border-bottom: 1px solid var(--n-border-color, #f0f0f0);
}

.modal-header-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.modal-header-icon--send { background: #eff6ff; color: #3b82f6; }
.modal-header-icon--broadcast { background: #fff7ed; color: #f59e0b; }
.modal-header-icon svg { width: 18px; height: 18px; }

.modal-title { font-size: 16px; font-weight: 600; line-height: 1.3; color: var(--n-text-color, #111827); }
.modal-subtitle { font-size: 12px; color: #94a3b8; margin-top: 1px; }

.modal-close {
  margin-left: auto;
  width: 32px; height: 32px;
  border: none; background: transparent;
  border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #9ca3af;
  transition: background 0.15s, color 0.15s;
}
.modal-close:hover { background: #f3f4f6; color: #374151; }

/* ── Broadcast info strip ── */
.bc-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 24px;
  background: var(--n-color, #f8fafc);
  border-bottom: 1px solid var(--n-border-color, #f0f0f0);
  font-size: 12px;
  color: #64748b;
  flex-wrap: wrap;
}
.bc-strip-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.bc-strip-item strong { color: #374151; font-weight: 600; }
.bc-strip-item--warn { color: #b45309; }
.bc-strip-item--warn svg { color: #f59e0b; }
.bc-strip-dot {
  width: 3px; height: 3px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}

/* ── Broadcast body ── */
.bc-body { padding: 20px 24px; }

.bc-top-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.bc-field-title { flex: 1; min-width: 0; }
.bc-field-target { width: 150px; flex-shrink: 0; }

/* ── Attachment inline row ── */
.bc-attach-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bc-attach-label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border: 1.5px dashed var(--n-border-color, #d1d5db);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #94a3b8;
  background: transparent;
  transition: border-color 0.15s, color 0.15s;
  overflow: hidden;
}
.bc-attach-label:hover { border-color: #18a058; color: #15803d; }
.bc-attach-placeholder em { color: #cbd5e1; font-style: normal; margin-left: 4px; }
.bc-attach-name {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #059669;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bc-attach-remove {
  flex-shrink: 0;
  width: 26px; height: 26px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: background 0.12s, color 0.12s;
}
.bc-attach-remove:hover { background: #fee2e2; color: #ef4444; }

/* ── Modal body ── */
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 0; }

.form-section { display: flex; flex-direction: column; }

.section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-divider {
  height: 1px;
  background: var(--n-border-color, #f0f0f0);
  margin: 18px 0;
}

.field-group { display: flex; flex-direction: column; gap: 5px; }

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color, #374151);
}

.required { color: #ef4444; margin-left: 2px; }

.optional-badge {
  font-size: 10px;
  font-weight: 500;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 4px;
  text-transform: none;
  letter-spacing: 0;
}

/* ── WA Editor ── */
.wa-editor {
  width: 100%;
  border: 1px solid var(--n-border-color, #d1d5db);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.wa-editor:focus-within {
  border-color: #18a058;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.1);
}

.wa-toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 5px 8px;
  background: var(--n-color, #f8fafc);
  border-bottom: 1px solid var(--n-border-color, #e5e7eb);
}

.wa-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  color: #64748b;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.wa-btn:hover { background: rgba(0,0,0,.07); color: #1e293b; }
.wa-btn--mono { font-family: monospace; font-size: 12px; font-weight: 700; }

.wa-sep { width: 1px; height: 16px; background: #e2e8f0; margin: 0 3px; flex-shrink: 0; }

.wa-count {
  margin-left: auto;
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  padding-left: 6px;
}

.wa-textarea :deep(.n-input) {
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.wa-textarea :deep(.n-input__textarea-el) {
  font-size: 13.5px;
  line-height: 1.65;
  padding: 10px 12px;
}

.wa-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 6px 10px;
  background: var(--n-color, #f8fafc);
  border-top: 1px solid var(--n-border-color, #e5e7eb);
}
.wa-hint code {
  font-family: monospace;
  font-size: 10.5px;
  color: #64748b;
  background: #e2e8f0;
  border-radius: 3px;
  padding: 1px 4px;
}

/* ── File drop zone ── */
.file-dropzone {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px dashed var(--n-border-color, #d1d5db);
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 12.5px;
  color: #64748b;
  background: var(--n-color, #fafafa);
  transition: border-color 0.15s, background 0.15s;
}
.file-dropzone:hover { border-color: #18a058; background: #f0fdf4; color: #15803d; }
.file-name { color: #059669; font-weight: 500; }

/* ── Modal footer ── */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 14px 24px 18px;
  border-top: 1px solid var(--n-border-color, #f0f0f0);
}

/* ── Send modal 2-column layout ── */
.send-cols {
  display: flex;
  min-height: 400px;
}

.send-left {
  width: 240px;
  flex-shrink: 0;
  padding: 20px 20px 20px 24px;
  background: var(--n-color, #f8fafc);
  border-right: 1px solid var(--n-border-color, #f0f0f0);
  display: flex;
  flex-direction: column;
}

.send-left-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 16px;
}

.send-right {
  flex: 1;
  padding: 20px 24px 20px 20px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wa-editor--full {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.wa-editor--full .wa-textarea {
  flex: 1;
}

.wa-editor--full .wa-textarea :deep(.n-input) {
  height: 100%;
}

.wa-editor--full .wa-textarea :deep(.n-input__textarea-el) {
  height: 100% !important;
  min-height: 260px;
  resize: none;
}

.file-dropzone--compact {
  padding: 8px 10px;
  font-size: 12px;
}

@media (max-width: 600px) {
  .send-cols { flex-direction: column; }
  .send-left { width: 100%; border-right: none; border-bottom: 1px solid var(--n-border-color, #f0f0f0); }
}

/* ── Emoji Picker ── */
.wa-btn--active { background: rgba(0,0,0,.09) !important; color: #1e293b !important; }

.emoji-picker {
  border-top: 1px solid var(--n-border-color, #e5e7eb);
  background: var(--n-color, #fff);
  padding: 8px;
}

.emoji-search-row { margin-bottom: 6px; }
.emoji-search {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  border: 1px solid var(--n-border-color, #d1d5db);
  border-radius: 6px;
  outline: none;
  background: var(--n-color, #fff);
  color: var(--n-text-color, #374151);
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.emoji-search:focus { border-color: #18a058; }

.emoji-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 4px;
}
.emoji-tab {
  flex: 1;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}
.emoji-tab:hover { background: rgba(0,0,0,.06); }
.emoji-tab.active { background: rgba(24,160,88,.12); }

.emoji-cat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #94a3b8;
  margin-bottom: 4px;
  padding: 0 2px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  max-height: 140px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.emoji-cell {
  aspect-ratio: 1;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, transform 0.1s;
  line-height: 1;
}
.emoji-cell:hover {
  background: rgba(0,0,0,.07);
  transform: scale(1.2);
}
</style>
