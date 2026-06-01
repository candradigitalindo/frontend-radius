<script setup lang="ts">
import { ref, onMounted, computed, h, onUnmounted } from 'vue'
import {
  NCard, NGrid, NGridItem, NForm, NFormItem, NInput, NInputNumber,
  NButton, NSpace, NTabs, NTabPane, NTag, NText,
  NSelect, NSpin, NTooltip, NIcon, useMessage,
  NDataTable, NModal, NPopconfirm, NSwitch, NDivider, NAlert,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { Building, Package, Users as UsersIcon, Link, Login, Copy, Check, Calendar, Message, Tag, AlertCircle, FileText, Plus } from '@vicons/tabler'
import { tenantApi, reminderApi, billingProfileApi } from '../../api'

const message = useMessage()
const copied = ref(false)
const copyingWebhook = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const savingSettings = ref(false)
const tenant = ref<any>({})
const webhooks = ref<any[]>([])
const activeTab = ref('info')

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 640)
function onResize() { windowWidth.value = window.innerWidth }
onUnmounted(() => window.removeEventListener('resize', onResize))

// Reminders
const reminders = ref<any[]>([])
const showReminderModal = ref(false)
const editingReminder = ref<any>(null)
const savingReminder = ref(false)
const reminderForm = ref({
  name: '',
  type: 'before_due',
  days_offset: 3,
  agenda: '',
  message_template: '',
  is_active: true,
})
const reminderTypeOptions = [
  { label: 'Sebelum Jatuh Tempo', value: 'before_due' },
  { label: 'Saat Jatuh Tempo', value: 'on_due' },
  { label: 'Setelah Jatuh Tempo', value: 'after_due' },
]
const reminderTypeLabel: Record<string, string> = {
  before_due: 'Sebelum Jatuh Tempo',
  on_due: 'Saat Jatuh Tempo',
  after_due: 'Setelah Jatuh Tempo',
}
const reminderTypeTag: Record<string, string> = {
  before_due: 'info',
  on_due: 'warning',
  after_due: 'error',
}
const reminderCols: DataTableColumns = [
  {
    key: 'name', width: 180, ellipsis: { tooltip: true },
    title: () => h('div', { style: 'display: flex; align-items: center; gap: 5px' }, [
      h(NIcon, { component: Tag, size: 13 }),
      h('span', 'Nama'),
    ]),
  },
  { 
    key: 'agenda', width: 200, ellipsis: { tooltip: true },
    title: () => h('div', { style: 'display: flex; align-items: center; gap: 5px' }, [
      h(NIcon, { component: FileText, size: 13 }),
      h('span', 'Agenda'),
    ]),
    render: (r: any) => h(NText, { depth: 3, style: 'font-size: 12px' }, () => r.agenda || '—'),
  },
  {
    key: 'type', width: 160,
    title: () => h('div', { style: 'display: flex; align-items: center; gap: 5px' }, [
      h(NIcon, { component: Calendar, size: 13 }),
      h('span', 'Tipe'),
    ]),
     render: (r: any) => h(NTag, { type: (reminderTypeTag[r.type] || 'default') as any, size: 'small', bordered: false }, () => reminderTypeLabel[r.type] || r.type),
  },
  {
    title: 'Hari', key: 'days_offset', width: 80, align: 'center' as const,
    render: (r: any) => r.type === 'on_due' ? '-' : `${r.days_offset} hari`,
  },
  {
    title: 'Status', key: 'is_active', width: 80, align: 'center' as const,
    render: (r: any) => h(NTag, { type: r.is_active ? 'success' : 'default', size: 'small', bordered: false }, () => r.is_active ? 'Aktif' : 'Nonaktif'),
  },
  {
    key: 'message_template', ellipsis: { tooltip: true },
    title: () => h('div', { style: 'display: flex; align-items: center; gap: 5px' }, [
      h(NIcon, { component: Message, size: 13 }),
      h('span', 'Template Pesan'),
    ]),
    render: (r: any) => h(NText, { depth: 3, style: 'font-size: 12px' }, () => r.message_template),
  },
  {
    title: '', key: 'actions', width: 120, align: 'right' as const,
    render: (r: any) => h(NSpace, { size: 4 }, () => [
      h(NButton, { size: 'tiny', quaternary: true, title: 'Edit', onClick: () => openEditReminder(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => deleteReminder(r.id) }, {
        trigger: () => h(NButton, { size: 'tiny', quaternary: true, type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }),
        default: () => 'Hapus pengingat ini?',
      }),
    ]),
  },
]

const planLabel: Record<string, string> = { trial: 'Trial', basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' }
const planType: Record<string, any> = { trial: 'warning', basic: 'info', pro: 'success', enterprise: 'default' }

const timezoneOptions = [
  { label: 'WIB (Asia/Jakarta)', value: 'Asia/Jakarta' },
  { label: 'WITA (Asia/Makassar)', value: 'Asia/Makassar' },
  { label: 'WIT (Asia/Jayapura)', value: 'Asia/Jayapura' },
]

const currencyOptions = [
  { label: 'IDR — Rupiah', value: 'IDR' },
  { label: 'USD — Dollar', value: 'USD' },
]

const pgProviderOptions = [
  { label: 'Tidak Ada', value: '' },
  { label: 'Tripay', value: 'tripay' },
  { label: 'Midtrans', value: 'midtrans' },
  { label: 'Xendit', value: 'xendit' },
]

const pgProviderLabel: Record<string, string> = {
  tripay: 'Tripay',
  midtrans: 'Midtrans',
  xendit: 'Xendit',
}

const webhookKeyLabel: Record<string, string> = {
  tripay: 'Invoice',
  tripay_voucher: 'Voucher',
  midtrans: 'Invoice',
  midtrans_voucher: 'Voucher',
  xendit: 'Invoice',
  xendit_voucher: 'Voucher',
}

const providerWebhookKeys: Record<string, string[]> = {
  tripay: ['tripay', 'tripay_voucher'],
  midtrans: ['midtrans', 'midtrans_voucher'],
  xendit: ['xendit', 'xendit_voucher'],
}

const activeWebhooks = computed(() => {
  const provider = tenant.value.pg_provider
  if (!provider) return []
  const keys = providerWebhookKeys[provider] || []
  return webhooks.value.filter(w => keys.includes(w.event))
})

const testingConnection = ref(false)

const planExpiresFormatted = computed(() => {
  if (!tenant.value.plan_expires_at) return '-'
  return new Date(tenant.value.plan_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
})

async function saveTenant() {
  if (!tenant.value.name || !tenant.value.email) {
    message.warning('Nama dan email wajib diisi')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: tenant.value.name,
      email: tenant.value.email,
      phone: tenant.value.phone || '',
      address: tenant.value.address || '',
      logo_url: tenant.value.logo_url || '',
      timezone: tenant.value.timezone || 'Asia/Jakarta',
      currency: tenant.value.currency || 'IDR',
      billing_cycle: tenant.value.billing_cycle || 1,
      due_day: tenant.value.due_day || 20,
      isolir_day: tenant.value.isolir_day || 21,
      grace_period: tenant.value.grace_period || 3,
      is_active: tenant.value.is_active !== false,
    }
    const { data } = await tenantApi.update(payload)
    tenant.value = data || tenant.value
    message.success('Data tenant disimpan')
  } catch { message.error('Gagal menyimpan') }
  saving.value = false
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await tenantApi.updateSettings({
      pg_provider: tenant.value.pg_provider || '',
      pg_api_key: tenant.value.pg_api_key || '',
      pg_secret_key: tenant.value.pg_secret_key || '',
      pg_merchant_id: tenant.value.pg_merchant_id || '',
      pg_sandbox: tenant.value.pg_sandbox !== false,
    })
    message.success('Pengaturan integrasi disimpan')
  } catch { message.error('Gagal menyimpan pengaturan') }
  savingSettings.value = false
}

async function testConnection() {
  const provider   = tenant.value.pg_provider || ''
  const apiKey     = tenant.value.pg_api_key     || ''
  const secretKey  = tenant.value.pg_secret_key  || ''
  const merchantId = tenant.value.pg_merchant_id || ''
  const sandbox    = tenant.value.pg_sandbox !== false

  // Client-side validation
  if (!provider) { message.warning('Pilih provider payment gateway terlebih dahulu'); return }
  if (provider === 'tripay') {
    if (!apiKey)     { message.warning('Tripay: API Key belum diisi'); return }
    if (!secretKey)  { message.warning('Tripay: Private Key belum diisi'); return }
    if (!merchantId) { message.warning('Tripay: Merchant Code belum diisi'); return }
  } else if (provider === 'midtrans') {
    if (!secretKey) { message.warning('Midtrans: Server Key belum diisi'); return }
  } else if (provider === 'xendit') {
    if (!apiKey) { message.warning('Xendit: Secret Key belum diisi'); return }
  }

  // Save first so DB is in sync with the form, then test
  testingConnection.value = true
  try {
    await tenantApi.updateSettings({ pg_provider: provider, pg_api_key: apiKey, pg_secret_key: secretKey, pg_merchant_id: merchantId, pg_sandbox: sandbox })
  } catch { /* ignore save error, still proceed to test */ }

  try {
    const { data } = await tenantApi.testSettings({ pg_provider: provider, pg_api_key: apiKey, pg_secret_key: secretKey, pg_merchant_id: merchantId, pg_sandbox: sandbox })
    if (data.success) {
      message.success(data.message || 'Koneksi payment gateway berhasil')
    } else {
      message.error(data.error || 'Koneksi gagal')
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menguji koneksi')
  }
  testingConnection.value = false
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  try {
    const [tRes, wRes] = await Promise.all([
      tenantApi.current(),
      tenantApi.webhooks().catch(() => ({ data: {} })),
    ])
    // GetCurrent returns tenant directly (not wrapped in .data)
    tenant.value = tRes.data?.data || tRes.data || {}
    const rawWebhooks = wRes.data?.data
    if (Array.isArray(rawWebhooks)) {
      webhooks.value = rawWebhooks
    } else if (rawWebhooks && typeof rawWebhooks === 'object') {
      webhooks.value = Object.entries(rawWebhooks).map(([event, url]) => ({ event, url }))
    }
  } catch { message.error('Gagal memuat data tenant') }
  await Promise.all([loadReminders(), loadBillingProfiles()])
  loading.value = false
})

const portalLoginUrl = computed(() => {
  if (!tenant.value.slug) return ''
  return `${window.location.origin}/portal/login/${tenant.value.slug}`
})

function copyPortalLink() {
  if (!portalLoginUrl.value) return
  navigator.clipboard.writeText(portalLoginUrl.value).then(() => {
    copied.value = true
    message.success('Link portal berhasil disalin')
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function copyWebhook(event: string) {
  const w = webhooks.value.find(x => x.event === event)
  if (!w) return
  copyingWebhook.value = event
  navigator.clipboard.writeText(w.url).then(() => {
    message.success('URL disalin')
  }).catch(() => { message.error('Gagal menyalin') })
  setTimeout(() => { copyingWebhook.value = null }, 1500)
}

async function loadReminders() {
  try {
    const { data: res } = await reminderApi.list()
    reminders.value = res.data || []
  } catch { reminders.value = [] }
}

function openCreateReminder() {
  editingReminder.value = null
  reminderForm.value = { name: '', type: 'before_due', days_offset: 3, agenda: '', message_template: '', is_active: true }
  showReminderModal.value = true
}

function openEditReminder(r: any) {
  editingReminder.value = r
  
  // Ensure type is valid, fallback to before_due
  const validTypes = ['before_due', 'on_due', 'after_due']
  const cleanType = validTypes.includes(r.type) ? r.type : 'before_due'
  
  reminderForm.value = {
    name: r.name || '',
    type: cleanType,
    days_offset: r.days_offset ?? 3,
    agenda: r.agenda || '',
    message_template: r.message_template || '',
    is_active: r.is_active ?? true,
  }
  
  showReminderModal.value = true
}

async function saveReminder() {
  const f = reminderForm.value
  if (!f.name || !f.type || !f.message_template) {
    message.warning('Nama, tipe, dan template pesan wajib diisi')
    return
  }
  
  // Validate type explicitly
  const validTypes = ['before_due', 'on_due', 'after_due']
  const cleanType = String(f.type).trim()
  if (!validTypes.includes(cleanType)) {
    message.error(`Tipe tidak valid: ${cleanType}. Harus salah satu dari: ${validTypes.join(', ')}`)
    return
  }
  
  // Build clean payload
  const payload: any = {
    name: String(f.name).trim(),
    type: cleanType,
    agenda: String(f.agenda || '').trim(),
    message_template: String(f.message_template),
    is_active: Boolean(f.is_active ?? true),
  }
  
  // Only include days_offset if type is not on_due
  if (cleanType !== 'on_due') {
    payload.days_offset = Number(f.days_offset ?? 0)
  }
  
  
  savingReminder.value = true
  try {
    if (editingReminder.value) {
      await reminderApi.update(editingReminder.value.id, payload)
      message.success('Pengingat diperbarui')
    } else {
      await reminderApi.create(payload)
      message.success('Pengingat ditambahkan')
    }
    showReminderModal.value = false
    await loadReminders()
  } catch { message.error('Gagal menyimpan pengingat') }
  savingReminder.value = false
}

async function deleteReminder(id: string) {
  try {
    await reminderApi.delete(id)
    message.success('Pengingat dihapus')
    await loadReminders()
  } catch { message.error('Gagal menghapus') }
}

const reminderSendSummary = computed(() => {
  const { type, days_offset } = reminderForm.value
  if (type === 'before_due') {
    if (!days_offset || days_offset === 0) return 'WA dikirim tepat pada hari jatuh tempo'
    return `WA dikirim ${days_offset} hari sebelum jatuh tempo (H-${days_offset})`
  }
  if (type === 'on_due') return 'WA dikirim tepat pada hari jatuh tempo (H+0)'
  if (type === 'after_due') {
    if (!days_offset || days_offset === 0) return 'WA dikirim tepat pada hari jatuh tempo'
    return `WA dikirim ${days_offset} hari setelah jatuh tempo (H+${days_offset}) — pengingat keterlambatan`
  }
  return ''
})

async function triggerReminders() {
  try {
    const { data } = await reminderApi.trigger()
    message.success(`Pengingat dipicu: ${data.sent || 0} terkirim`)
  } catch { message.error('Gagal memicu pengingat') }
}

// ─── Billing Profiles ───────────────────────────────────────
const billingProfiles = ref<any[]>([])
const showBPModal = ref(false)
const editingBP = ref<any>(null)
const savingBP = ref(false)
const deletingBP = ref<string | null>(null)

const bpForm = ref({
  name: '',
  billing_model: 'cycle',
  invoice_day: 24,
  due_day: 1,
  isolir_day: 3,
  grace_period: 0,
  payment_timing: 'due_date',
})

const billingModelOptions = [
  { label: 'Cycle — tanggal tetap tiap bulan', value: 'cycle' },
  { label: 'Fixed — mengikuti tanggal aktivasi pelanggan', value: 'fixed' },
]
const paymentTimingOptions = [
  { label: 'Bayar saat jatuh tempo', value: 'due_date' },
  { label: 'Bayar di muka (advance)', value: 'advance' },
]

async function loadBillingProfiles() {
  try {
    const { data } = await billingProfileApi.list()
    billingProfiles.value = data.data || []
  } catch { billingProfiles.value = [] }
}

function openCreateBP() {
  editingBP.value = null
  bpForm.value = { name: '', billing_model: 'cycle', invoice_day: 24, due_day: 1, isolir_day: 3, grace_period: 0, payment_timing: 'due_date' }
  showBPModal.value = true
}

function openEditBP(bp: any) {
  editingBP.value = bp
  bpForm.value = {
    name: bp.name,
    billing_model: bp.billing_model,
    invoice_day: bp.invoice_day,
    due_day: bp.due_day,
    isolir_day: bp.isolir_day,
    grace_period: bp.grace_period,
    payment_timing: bp.payment_timing,
  }
  showBPModal.value = true
}

async function saveBP() {
  if (!bpForm.value.name?.trim()) { message.warning('Nama profil wajib diisi'); return }
  savingBP.value = true
  try {
    if (editingBP.value) {
      await billingProfileApi.update(editingBP.value.id, bpForm.value)
      message.success('Profil diperbarui')
    } else {
      await billingProfileApi.create(bpForm.value)
      message.success('Profil ditambahkan')
    }
    showBPModal.value = false
    await loadBillingProfiles()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyimpan profil')
  }
  savingBP.value = false
}

async function deleteBP(id: string) {
  deletingBP.value = id
  try {
    await billingProfileApi.delete(id)
    message.success('Profil dihapus')
    await loadBillingProfiles()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menghapus profil')
  }
  deletingBP.value = null
}

async function setDefaultBP(id: string) {
  try {
    await billingProfileApi.setDefault(id)
    message.success('Profil default diperbarui')
    await loadBillingProfiles()
  } catch { message.error('Gagal mengatur default') }
}
</script>

<template>
  <n-spin :show="loading">
    <n-space vertical :size="16">
      <!-- Header Stats -->
      <n-card size="small">
        <n-grid :cols="4" :x-gap="0" :y-gap="0" responsive="screen" item-responsive>
          <n-grid-item span="4 s:2 m:1">
            <div class="stat-cell">
              <n-space align="center" :size="8" style="margin-bottom: 6px">
                <n-icon :size="18" :color="'#3b82f6'"><Building /></n-icon>
                <n-text depth="3" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px">Nama ISP</n-text>
              </n-space>
              <n-text strong tag="div" style="font-size: 18px">{{ tenant.name || '-' }}</n-text>
            </div>
          </n-grid-item>
          <n-grid-item span="4 s:2 m:1">
            <div class="stat-cell">
              <n-space align="center" :size="8" style="margin-bottom: 6px">
                <n-icon :size="18" :color="'#8b5cf6'"><Package /></n-icon>
                <n-text depth="3" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px">Paket</n-text>
              </n-space>
              <n-space align="baseline" :size="8">
                <n-tag :type="planType[tenant.plan] || 'default'" size="small" round>{{ planLabel[tenant.plan] || tenant.plan || '-' }}</n-tag>
              </n-space>
              <n-text depth="3" tag="div" style="font-size: 11px; margin-top: 4px">Berlaku s/d {{ planExpiresFormatted }}</n-text>
            </div>
          </n-grid-item>
          <n-grid-item span="4 s:2 m:1">
            <div class="stat-cell">
              <n-space align="center" :size="8" style="margin-bottom: 6px">
                <n-icon :size="18" :color="'#22c55e'"><UsersIcon /></n-icon>
                <n-text depth="3" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px">Maks. Pelanggan</n-text>
              </n-space>
              <n-text strong tag="div" style="font-size: 18px">{{ tenant.max_customers || 0 }}</n-text>
            </div>
          </n-grid-item>
          <n-grid-item span="4 s:2 m:1">
            <div class="stat-cell">
              <n-space align="center" :size="8" style="margin-bottom: 6px">
                <n-icon :size="18" :color="'#f59e0b'"><Link /></n-icon>
                <n-text depth="3" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px">Slug</n-text>
              </n-space>
              <n-text tag="div" code style="font-size: 12px; word-break: break-all">{{ tenant.slug || '-' }}</n-text>
            </div>
          </n-grid-item>
        </n-grid>
      </n-card>

      <!-- Portal Login Link -->
      <n-card v-if="tenant.slug" size="small" class="portal-link-card">
        <n-space align="center" justify="space-between" :wrap="true" :size="[12, 8]">
          <n-space align="center" :size="10" :wrap="false">
            <n-icon :size="20" :color="'#00e5ff'"><Login /></n-icon>
            <div>
              <n-text depth="3" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block">Link Portal Pelanggan</n-text>
              <n-text code tag="div" style="font-size: 13px; word-break: break-all; margin-top: 2px">{{ portalLoginUrl }}</n-text>
            </div>
          </n-space>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button size="small" :type="copied ? 'success' : 'primary'" secondary @click="copyPortalLink">
                <template #icon>
                  <n-icon v-if="!copied" :size="14"><Copy /></n-icon>
                  <n-icon v-else :size="14"><Check /></n-icon>
                </template>
                {{ copied ? 'Tersalin!' : 'Salin Link' }}
              </n-button>
            </template>
            Bagikan link ini ke pelanggan untuk login ke portal
          </n-tooltip>
        </n-space>
      </n-card>

      <!-- Tabs -->
      <n-card>
        <n-tabs v-model:value="activeTab" type="line">
          <!-- Informasi Umum -->
          <n-tab-pane name="info" tab="Informasi Umum">
            <n-form label-placement="top">
              <n-grid :cols="4" :x-gap="16" :y-gap="0" responsive="screen" item-responsive>
                <n-grid-item span="4 s:2 m:2">
                  <n-form-item label="Nama ISP"><n-input v-model:value="tenant.name" placeholder="Nama perusahaan ISP" /></n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Email"><n-input v-model:value="tenant.email" placeholder="email@isp.com" /></n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Telepon"><n-input v-model:value="tenant.phone" placeholder="08xx" /></n-form-item>
                </n-grid-item>
                <n-grid-item span="4 m:4">
                  <n-form-item label="Alamat"><n-input v-model:value="tenant.address" type="textarea" :rows="2" placeholder="Alamat lengkap" /></n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Timezone"><n-select v-model:value="tenant.timezone" :options="timezoneOptions" /></n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Mata Uang"><n-select v-model:value="tenant.currency" :options="currencyOptions" /></n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:2">
                  <n-form-item label="URL Logo"><n-input v-model:value="tenant.logo_url" placeholder="https://..." /></n-form-item>
                </n-grid-item>
              </n-grid>
              <n-space justify="end" style="margin-top: 8px">
                <n-button type="primary" :loading="saving" @click="saveTenant">Simpan Informasi</n-button>
              </n-space>
            </n-form>
          </n-tab-pane>

          <!-- Konfigurasi Billing -->
          <n-tab-pane name="billing" tab="Konfigurasi Billing">
            <n-form label-placement="top">
              <div class="billing-flow">
                <div class="bf-step">
                  <div class="bf-num">1</div>
                  <div class="bf-label">Generate Invoice</div>
                  <div class="bf-sub">Tgl {{ tenant.billing_cycle || 1 }} setiap bulan</div>
                </div>
                <div class="bf-arrow">→</div>
                <div class="bf-step">
                  <div class="bf-num">2</div>
                  <div class="bf-label">Jatuh Tempo</div>
                  <div class="bf-sub">Tgl {{ tenant.due_day || 20 }}</div>
                </div>
                <div class="bf-arrow">→</div>
                <div class="bf-step">
                  <div class="bf-num">3</div>
                  <div class="bf-label">Grace Period</div>
                  <div class="bf-sub">{{ tenant.grace_period || 3 }} hari</div>
                </div>
                <div class="bf-arrow">→</div>
                <div class="bf-step bf-step-warn">
                  <div class="bf-num">4</div>
                  <div class="bf-label">Isolir</div>
                  <div class="bf-sub">+{{ tenant.isolir_day || 5 }} hari setelah JT</div>
                </div>
              </div>
              <n-grid :cols="4" :x-gap="16" :y-gap="0" responsive="screen" item-responsive>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Tgl Generate Invoice">
                    <n-input-number v-model:value="tenant.billing_cycle" :min="1" :max="28" style="width: 100%" />
                  </n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Tanggal Jatuh Tempo">
                    <n-input-number v-model:value="tenant.due_day" :min="1" :max="28" style="width: 100%" />
                  </n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Hari Isolir setelah JT">
                    <n-input-number v-model:value="tenant.isolir_day" :min="0" style="width: 100%" />
                  </n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Grace Period (hari)">
                    <n-input-number v-model:value="tenant.grace_period" :min="0" :max="30" style="width: 100%" />
                  </n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Model Billing Default">
                    <n-select
                      v-model:value="tenant.default_billing_type"
                      :options="[
                        { label: 'Cycle — tanggal tetap tiap bulan', value: 'cycle' },
                        { label: 'Fixed — berdasarkan tanggal aktivasi pelanggan', value: 'fixed' },
                      ]"
                    />
                  </n-form-item>
                </n-grid-item>
                <n-grid-item span="4 s:2 m:1">
                  <n-form-item label="Waktu Pembayaran">
                    <n-select
                      v-model:value="tenant.default_payment_timing"
                      :options="[
                        { label: 'Bayar saat jatuh tempo', value: 'due_date' },
                        { label: 'Bayar di muka (advance)', value: 'advance' },
                      ]"
                    />
                  </n-form-item>
                </n-grid-item>
              </n-grid>
              <n-alert v-if="tenant.default_billing_type === 'fixed'" type="info" :bordered="false" style="margin: 8px 0 12px; font-size: 12px">
                Model <strong>Fixed</strong>: jatuh tempo setiap bulan mengikuti tanggal aktivasi masing-masing pelanggan.
                Field "Tgl Generate Invoice" dan "Tgl Jatuh Tempo" tidak digunakan untuk model ini.
              </n-alert>
              <n-space justify="end" style="margin-top: 8px">
                <n-button type="primary" :loading="saving" @click="saveTenant">Simpan Billing</n-button>
              </n-space>
            </n-form>

            <n-divider style="margin: 24px 0 16px" />

            <!-- ── B. Profil Billing ── -->
            <div class="reminder-header">
              <div>
                <div class="section-title">Profil Billing</div>
                <div class="section-sub">Kelola profil jadwal tagihan untuk pelanggan</div>
              </div>
              <n-button type="primary" size="small" @click="openCreateBP">
                <template #icon><n-icon :component="Plus" :size="15" /></template>
                Tambah Profil
              </n-button>
            </div>

            <div v-if="!billingProfiles.length" class="reminder-empty">Belum ada profil billing</div>
            <div v-else class="bp-list">
              <div v-for="bp in billingProfiles" :key="bp.id" class="bp-card">
                <div class="bp-card-top">
                  <div class="bp-card-left">
                    <span class="bp-name">{{ bp.name }}</span>
                    <n-tag v-if="bp.is_default" type="success" size="tiny" :bordered="false">Default</n-tag>
                    <n-tag :type="bp.billing_model === 'cycle' ? 'info' : 'warning'" size="tiny" :bordered="false">
                      {{ bp.billing_model === 'cycle' ? 'Cycle' : 'Fixed' }}
                    </n-tag>
                  </div>
                  <div class="bp-card-actions">
                    <n-button v-if="!bp.is_default" size="tiny" secondary @click="setDefaultBP(bp.id)">Set Default</n-button>
                    <n-button size="tiny" quaternary @click="openEditBP(bp)">Edit</n-button>
                    <n-popconfirm v-if="!bp.is_default" @positive-click="deleteBP(bp.id)">
                      <template #trigger>
                        <n-button size="tiny" quaternary type="error" :loading="deletingBP === bp.id">Hapus</n-button>
                      </template>
                      Hapus profil "{{ bp.name }}"?
                    </n-popconfirm>
                  </div>
                </div>
                <div class="bp-card-meta">
                  <template v-if="bp.billing_model === 'cycle'">
                    <span class="bp-meta-item">Invoice tgl {{ bp.invoice_day }}</span>
                    <span class="bp-sep">·</span>
                    <span class="bp-meta-item">JT tgl {{ bp.due_day }}</span>
                  </template>
                  <template v-else>
                    <span class="bp-meta-item">Generate {{ bp.invoice_day }} hari sebelum JT</span>
                    <span class="bp-sep">·</span>
                    <span class="bp-meta-item">JT = tanggal aktivasi</span>
                  </template>
                  <span class="bp-sep">·</span>
                  <span class="bp-meta-item">Isolir +{{ bp.isolir_day }} hari</span>
                  <span class="bp-sep">·</span>
                  <span class="bp-meta-item">{{ bp.payment_timing === 'advance' ? 'Bayar di muka' : 'Bayar saat JT' }}</span>
                </div>
              </div>
            </div>

            <n-divider style="margin: 24px 0 16px" />

            <!-- ── C. Pengingat ── -->
            <div class="reminder-header">
              <div>
                <div class="section-title">Jadwal Pengingat WA</div>
                <div class="section-sub">Cronjob mengirim WA ke pelanggan berdasarkan aturan ini setiap hari pukul 10:00</div>
              </div>
              <div class="reminder-actions">
                <n-popconfirm @positive-click="triggerReminders">
                  <template #trigger>
                    <n-button size="small" secondary>Picu Manual</n-button>
                  </template>
                  Kirim semua pengingat aktif sekarang?
                </n-popconfirm>
                <n-button type="primary" size="small" @click="openCreateReminder">
                  <template #icon><n-icon :component="Plus" :size="15" /></template>
                  Tambah
                </n-button>
              </div>
            </div>

            <n-data-table v-if="!isMobile" :columns="reminderCols" :data="reminders" :bordered="false" size="small" />

            <div v-else class="reminder-cards">
              <div v-if="!reminders.length" class="reminder-empty">Belum ada pengingat</div>
              <div v-for="r in reminders" :key="r.id" class="reminder-card">
                <div class="reminder-card-top">
                  <span class="reminder-card-name">{{ r.name }}</span>
                  <n-tag :type="(reminderTypeTag[r.type] as any) || 'default'" size="small" :bordered="false">
                    {{ reminderTypeLabel[r.type] || r.type }}
                  </n-tag>
                </div>
                <p v-if="r.agenda" class="reminder-card-agenda">{{ r.agenda }}</p>
                <div class="reminder-card-meta">
                  <span v-if="r.type !== 'on_due'" class="meta-item">{{ r.days_offset }} hari</span>
                  <n-tag :type="r.is_active ? 'success' : 'default'" size="tiny" :bordered="false">
                    {{ r.is_active ? 'Aktif' : 'Nonaktif' }}
                  </n-tag>
                </div>
                <p v-if="r.message_template" class="reminder-card-msg">{{ r.message_template }}</p>
                <div class="reminder-card-actions">
                  <n-button size="tiny" quaternary @click="openEditReminder(r)">Edit</n-button>
                  <n-popconfirm @positive-click="deleteReminder(r.id)">
                    <template #trigger>
                      <n-button size="tiny" quaternary type="error">Hapus</n-button>
                    </template>
                    Hapus pengingat ini?
                  </n-popconfirm>
                </div>
              </div>
            </div>

          </n-tab-pane>

          <!-- Integrasi -->
          <n-tab-pane name="integrations" tab="Payment Gateway">

            <!-- Status bar -->
            <div class="pg-status-bar">
              <div class="pg-status-left">
                <div v-if="tenant.pg_provider" class="pg-provider-badge">
                  <span class="pg-provider-dot" :class="tenant.pg_sandbox !== false ? 'dot-warn' : 'dot-ok'"></span>
                  <span class="pg-provider-name">{{ pgProviderLabel[tenant.pg_provider] }}</span>
                </div>
                <div v-else class="pg-provider-badge">
                  <span class="pg-provider-dot dot-off"></span>
                  <span class="pg-provider-name" style="opacity:.5">Tidak aktif</span>
                </div>
                <n-tag v-if="tenant.pg_provider && tenant.pg_sandbox !== false" type="warning" size="small" :bordered="false" round>Sandbox</n-tag>
                <n-tag v-else-if="tenant.pg_provider" type="success" size="small" :bordered="false" round>Produksi</n-tag>
              </div>
              <div class="pg-status-right">
                <n-button v-if="tenant.pg_provider" size="small" secondary :loading="testingConnection" @click="testConnection">
                  Test Koneksi
                </n-button>
                <n-button type="primary" size="small" :loading="savingSettings" @click="saveSettings">Simpan</n-button>
              </div>
            </div>

            <!-- Provider selector + sandbox toggle -->
            <div class="pg-section">
              <div class="pg-section-label">Provider</div>
              <div class="pg-row">
                <div class="pg-field pg-field-wide">
                  <n-select
                    v-model:value="tenant.pg_provider"
                    :options="pgProviderOptions"
                    clearable
                    placeholder="Pilih payment gateway..."
                  />
                  <span class="pg-field-hint">Semua transaksi pelanggan diproses melalui provider ini</span>
                </div>
                <div v-if="tenant.pg_provider" class="pg-field pg-field-narrow">
                  <div class="pg-sandbox-toggle">
                    <div class="pg-mode-seg">
                      <button
                        class="pg-mode-btn"
                        :class="tenant.pg_sandbox !== false ? 'pg-mode-sandbox' : 'pg-mode-inactive'"
                        @click="tenant.pg_sandbox = true"
                        type="button"
                      >
                        <span class="pg-mode-dot"></span> Testing
                      </button>
                      <button
                        class="pg-mode-btn"
                        :class="tenant.pg_sandbox === false ? 'pg-mode-prod' : 'pg-mode-inactive'"
                        @click="tenant.pg_sandbox = false"
                        type="button"
                      >
                        <span class="pg-mode-dot"></span> Produksi
                      </button>
                    </div>
                    <span class="pg-field-hint">
                      {{ tenant.pg_sandbox !== false ? 'Mode testing — transaksi tidak nyata' : 'Mode produksi — transaksi nyata' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Credentials per provider -->
            <template v-if="tenant.pg_provider === 'tripay'">
              <div class="pg-section">
                <div class="pg-section-label">Kredensial Tripay</div>
                <div class="pg-credentials-grid">
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">API Key <span class="pg-cred-required">*</span></div>
                    <n-input v-model:value="tenant.pg_api_key" type="password" show-password-on="click" placeholder="T-xxx..." />
                    <div class="pg-cred-hint">Lihat di Tripay → Akun → API Key</div>
                  </div>
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">Private Key <span class="pg-cred-required">*</span></div>
                    <n-input v-model:value="tenant.pg_secret_key" type="password" show-password-on="click" placeholder="Private key..." />
                    <div class="pg-cred-hint">Untuk verifikasi callback/webhook</div>
                  </div>
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">Merchant Code <span class="pg-cred-required">*</span></div>
                    <n-input v-model:value="tenant.pg_merchant_id" placeholder="T12345" />
                    <div class="pg-cred-hint">Kode merchant di dashboard Tripay</div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="tenant.pg_provider === 'midtrans'">
              <div class="pg-section">
                <div class="pg-section-label">Kredensial Midtrans</div>
                <div class="pg-credentials-grid">
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">Merchant ID <span class="pg-cred-required">*</span></div>
                    <n-input v-model:value="tenant.pg_merchant_id" placeholder="G123456789" />
                    <div class="pg-cred-hint">Tertera di header dashboard Midtrans</div>
                  </div>
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">Client Key <span class="pg-cred-required">*</span></div>
                    <n-input v-model:value="tenant.pg_api_key" type="password" show-password-on="click" placeholder="SB-Mid-client-xxx" />
                    <div class="pg-cred-hint">Digunakan untuk inisialisasi Snap popup</div>
                  </div>
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">Server Key <span class="pg-cred-required">*</span></div>
                    <n-input v-model:value="tenant.pg_secret_key" type="password" show-password-on="click" placeholder="SB-Mid-server-xxx" />
                    <div class="pg-cred-hint">Untuk pembuatan transaksi dari backend</div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="tenant.pg_provider === 'xendit'">
              <div class="pg-section">
                <div class="pg-section-label">Kredensial Xendit</div>
                <div class="pg-credentials-grid">
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">Secret Key <span class="pg-cred-required">*</span></div>
                    <n-input v-model:value="tenant.pg_api_key" type="password" show-password-on="click" placeholder="xnd_development_XXXXXXXX" />
                    <div class="pg-cred-hint">Secret key dari Settings → API Keys di Xendit</div>
                  </div>
                  <div class="pg-cred-item">
                    <div class="pg-cred-label">Webhook Token</div>
                    <n-input v-model:value="tenant.pg_secret_key" type="password" show-password-on="click" placeholder="Token verifikasi webhook" />
                    <div class="pg-cred-hint">Untuk memverifikasi callback dari Xendit</div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Webhook URLs -->
            <template v-if="activeWebhooks.length">
              <div class="pg-section">
                <div class="pg-section-label">URL Webhook</div>
                <p class="pg-webhook-desc">Daftarkan URL berikut di dashboard {{ pgProviderLabel[tenant.pg_provider] }} agar notifikasi pembayaran masuk otomatis.</p>
                <div class="webhook-list">
                  <div v-for="w in activeWebhooks" :key="w.event" class="webhook-row">
                    <div class="webhook-info">
                      <span class="webhook-label">{{ webhookKeyLabel[w.event] || w.event }}</span>
                      <span class="webhook-url">{{ w.url }}</span>
                    </div>
                    <n-button size="small" :type="copyingWebhook === w.event ? 'success' : 'default'" @click="copyWebhook(w.event)" style="flex-shrink:0">
                      {{ copyingWebhook === w.event ? '✓ Disalin' : 'Salin' }}
                    </n-button>
                  </div>
                </div>
              </div>
            </template>

          </n-tab-pane>
        </n-tabs>
      </n-card>
    </n-space>

    <!-- Billing Profile Modal -->
    <n-modal
      v-model:show="showBPModal"
      preset="card"
      :title="editingBP ? 'Edit Profil Billing' : 'Tambah Profil Billing'"
      :style="{ maxWidth: isMobile ? '95vw' : '560px', width: '95vw' }"
    >
      <n-form label-placement="top">
        <n-form-item label="Nama Profil">
          <n-input v-model:value="bpForm.name" placeholder="Contoh: Profil Bulanan Standar" />
        </n-form-item>
        <n-form-item label="Model Billing">
          <n-select v-model:value="bpForm.billing_model" :options="billingModelOptions" />
        </n-form-item>
        <n-alert v-if="bpForm.billing_model === 'fixed'" type="info" :bordered="false" style="margin-bottom: 12px; font-size: 12px">
          <strong>Fixed:</strong> Jatuh tempo setiap bulan = hari aktivasi pelanggan.
          "Invoice Day" = berapa hari <em>sebelum</em> JT invoice digenerate.
        </n-alert>
        <n-grid :cols="2" :x-gap="14">
          <n-grid-item>
            <n-form-item :label="bpForm.billing_model === 'cycle' ? 'Tgl Generate Invoice (1–28)' : 'Generate X Hari Sebelum JT'">
              <n-input-number v-model:value="bpForm.invoice_day" :min="0" :max="28" style="width: 100%" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Tgl Jatuh Tempo (1–28)" :disabled="bpForm.billing_model === 'fixed'">
              <n-input-number
                v-model:value="bpForm.due_day"
                :min="1" :max="28"
                style="width: 100%"
                :disabled="bpForm.billing_model === 'fixed'"
              />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Isolir (hari setelah JT)">
              <n-input-number v-model:value="bpForm.isolir_day" :min="0" :max="30" style="width: 100%" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Grace Period (hari)">
              <n-input-number v-model:value="bpForm.grace_period" :min="0" :max="30" style="width: 100%" />
            </n-form-item>
          </n-grid-item>
        </n-grid>
        <n-form-item label="Waktu Pembayaran">
          <n-select v-model:value="bpForm.payment_timing" :options="paymentTimingOptions" />
        </n-form-item>
      </n-form>
      <template #action>
        <div class="modal-actions">
          <n-button @click="showBPModal = false">Batal</n-button>
          <n-button type="primary" :loading="savingBP" @click="saveBP">
            {{ editingBP ? 'Perbarui' : 'Tambah' }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <!-- Reminder Modal -->
    <n-modal
      v-model:show="showReminderModal"
      preset="card"
      :title="editingReminder ? 'Edit Pengingat' : 'Tambah Pengingat'"
      :style="{ maxWidth: isMobile ? '95vw' : '750px', width: '95vw' }"
    >
      <n-grid :cols="isMobile ? 1 : 2" :x-gap="20">
        <!-- Left Column: Form Fields -->
        <n-grid-item>
          <n-form label-placement="top">

            <!-- Preview dinamis kapan WA dikirim -->
            <div class="reminder-send-preview">
              <div class="rsp-icon">📅</div>
              <div class="rsp-text">{{ reminderSendSummary }}</div>
            </div>

            <n-form-item>
              <template #label>
                <div class="field-label-row">
                  <span class="field-label-main">Nama Pengingat</span>
                  <span class="field-label-hint">Label internal, tidak dikirim ke pelanggan</span>
                </div>
              </template>
              <n-input v-model:value="reminderForm.name" placeholder="Contoh: H-3 Jatuh Tempo" />
            </n-form-item>

            <n-form-item>
              <template #label>
                <div class="field-label-row">
                  <span class="field-label-main">Kapan dikirim?</span>
                  <span class="field-label-hint">Posisi pengiriman relatif terhadap tanggal jatuh tempo</span>
                </div>
              </template>
              <n-select v-model:value="reminderForm.type" :options="reminderTypeOptions" />
            </n-form-item>

            <n-form-item v-if="reminderForm.type !== 'on_due'">
              <template #label>
                <div class="field-label-row">
                  <span class="field-label-main">
                    {{ reminderForm.type === 'before_due' ? 'Berapa hari sebelum JT?' : 'Berapa hari setelah JT?' }}
                  </span>
                  <span class="field-label-hint">
                    {{ reminderForm.type === 'before_due'
                      ? 'Misal 3 = WA dikirim 3 hari sebelum tagihan jatuh tempo'
                      : 'Misal 2 = WA pengingat telat dikirim 2 hari setelah JT terlewat' }}
                  </span>
                </div>
              </template>
              <n-input-number v-model:value="reminderForm.days_offset" :min="1" :max="30" style="width: 100%" />
            </n-form-item>

            <n-form-item>
              <template #label>
                <div class="field-label-row">
                  <span class="field-label-main">Catatan Internal</span>
                  <span class="field-label-hint">Opsional — keterangan untuk admin, tidak muncul di WA</span>
                </div>
              </template>
              <n-input v-model:value="reminderForm.agenda" placeholder="Contoh: Pengingat rutin sebelum JT" />
            </n-form-item>

            <n-form-item label="Status">
              <n-space align="center" :size="10">
                <n-switch v-model:value="reminderForm.is_active" />
                <n-text depth="3" style="font-size: 12px">
                  {{ reminderForm.is_active ? 'Aktif — cronjob akan mengirim ini' : 'Nonaktif — cronjob melewati aturan ini' }}
                </n-text>
              </n-space>
            </n-form-item>
          </n-form>
        </n-grid-item>

        <!-- Right Column: Template Pesan -->
        <n-grid-item>
          <n-form label-placement="top">
            <n-form-item>
              <template #label>
                <div style="display: flex; align-items: center; gap: 6px">
                  <n-icon :component="Message" :size="14" />
                  <span>Template Pesan</span>
                </div>
              </template>
              <n-input 
                v-model:value="reminderForm.message_template" 
                type="textarea" 
                :rows="6" 
                placeholder="*Halo {customer_name}*,&#10;&#10;Tagihan Anda sebesar *Rp {amount}* akan jatuh tempo pada _{due_date}_.&#10;&#10;Terima kasih." 
              />
            </n-form-item>
          </n-form>
          
          <!-- WhatsApp Formatting Guide -->
          <div class="wa-format-guide">
            <div class="wa-guide-title">
              <n-icon :component="AlertCircle" :size="13" style="opacity: 0.6" />
              <span>Format WhatsApp</span>
            </div>
            <div class="wa-guide-items">
              <div class="wa-guide-item"><code>*tebal*</code> → <strong>tebal</strong></div>
              <div class="wa-guide-item"><code>_miring_</code> → <em>miring</em></div>
              <div class="wa-guide-item"><code>~coret~</code> → <s>coret</s></div>
              <div class="wa-guide-item"><code>```mono```</code> → <code>mono</code></div>
            </div>
          </div>
          
          <!-- Variables Hint -->
          <div class="variables-hint-box">
            <div class="hint-title">Variabel Tersedia:</div>
            <div class="hint-vars">
              <span class="hint-var">{salam}</span>
              <span class="hint-var">{nama}</span>
              <span class="hint-var">{kode_pelanggan}</span>
              <span class="hint-var">{nomor_invoice}</span>
              <span class="hint-var">{periode}</span>
              <span class="hint-var">{paket}</span>
              <span class="hint-var">{jumlah}</span>
              <span class="hint-var">{jatuh_tempo}</span>
              <span class="hint-var" title="Link bayar PG (jika tersedia)">{payment_url}</span>
            </div>
          </div>
        </n-grid-item>
      </n-grid>
      
      <template #action>
        <div class="modal-actions">
          <n-button @click="showReminderModal = false">Batal</n-button>
          <n-button type="primary" :loading="savingReminder" @click="saveReminder">
            {{ editingReminder ? 'Perbarui' : 'Tambah' }}
          </n-button>
        </div>
      </template>
    </n-modal>

  </n-spin>
</template>

<style scoped>
.stat-cell {
  padding: 12px 16px;
}

@media (min-width: 640px) {
  .stat-cell {
    border-left: 1px solid rgba(128, 128, 128, 0.15);
  }
  .n-grid-item:first-child .stat-cell {
    border-left: none;
  }
}

@media (max-width: 639px) {
  .stat-cell {
    border-bottom: 1px solid rgba(128, 128, 128, 0.1);
    padding: 10px 12px;
  }
}

.portal-link-card {
  border: 1px solid rgba(0, 229, 255, 0.15);
  background: rgba(0, 229, 255, 0.03);
}

/* ── Billing Flow Preview ─────────── */
.billing-flow {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(128,128,128,0.04);
  border: 1px solid rgba(128,128,128,0.1);
  margin-bottom: 20px;
  flex-wrap: wrap;
}
:root.dark .billing-flow {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.07);
}

.bf-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 70px;
}

.bf-num {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: rgba(59,130,246,0.15);
  color: #3b82f6;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bf-step-warn .bf-num { background: rgba(239,68,68,0.12); color: #ef4444; }

.bf-label { font-size: 12px; font-weight: 600; text-align: center; }
.bf-sub   { font-size: 11px; opacity: 0.45; text-align: center; white-space: nowrap; }

.bf-arrow { font-size: 16px; opacity: 0.25; flex-shrink: 0; }

@media (max-width: 640px) {
  .billing-flow { gap: 4px; }
  .bf-step { min-width: 55px; }
  .bf-label { font-size: 11px; }
  .webhook-row { flex-direction: column; align-items: flex-start; gap: 8px; }
}

/* ── Payment Gateway redesign ─────── */
.pg-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(128,128,128,0.1);
  background: rgba(128,128,128,0.03);
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.pg-status-left  { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pg-status-right { display: flex; align-items: center; gap: 8px; }
.pg-provider-badge { display: flex; align-items: center; gap: 7px; }
.pg-provider-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.dot-ok   { background: #18a058; box-shadow: 0 0 0 3px rgba(24,160,88,0.18); }
.dot-warn { background: #f0a020; box-shadow: 0 0 0 3px rgba(240,160,32,0.18); }
.dot-off  { background: rgba(128,128,128,0.35); }
.pg-provider-name { font-size: 14px; font-weight: 600; }

.pg-section {
  margin-bottom: 20px;
}
.pg-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.4;
  margin-bottom: 10px;
}
.pg-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.pg-field { display: flex; flex-direction: column; gap: 4px; }
.pg-field-wide  { flex: 1; min-width: 180px; }
.pg-field-narrow { flex: 0 0 auto; }
.pg-sandbox-toggle { display: flex; flex-direction: column; gap: 6px; padding-top: 2px; }

/* Segmented mode toggle */
.pg-mode-seg {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(128,128,128,0.2);
  background: rgba(128,128,128,0.06);
}
.pg-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  background: transparent;
  color: inherit;
  outline: none;
  line-height: 1.4;
  white-space: nowrap;
}
.pg-mode-btn .pg-mode-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: currentColor;
  opacity: 0.5;
}

/* Testing aktif → orange */
.pg-mode-sandbox {
  background: rgba(240, 160, 32, 0.15);
  color: #d97706;
}
html.dark .pg-mode-sandbox {
  background: rgba(240, 160, 32, 0.2);
  color: #fbbf24;
}
.pg-mode-sandbox .pg-mode-dot { opacity: 1; background: #d97706; }
html.dark .pg-mode-sandbox .pg-mode-dot { background: #fbbf24; }

/* Produksi aktif → hijau */
.pg-mode-prod {
  background: rgba(24, 160, 88, 0.12);
  color: #16a34a;
}
html.dark .pg-mode-prod {
  background: rgba(24, 160, 88, 0.2);
  color: #4ade80;
}
.pg-mode-prod .pg-mode-dot { opacity: 1; background: #16a34a; }
html.dark .pg-mode-prod .pg-mode-dot { background: #4ade80; }

/* Tidak aktif → abu */
.pg-mode-inactive {
  color: rgba(128,128,128,0.5);
}
.pg-mode-inactive:hover {
  background: rgba(128,128,128,0.08);
  color: rgba(128,128,128,0.8);
}
.pg-field-hint {
  font-size: 11px;
  opacity: 0.45;
  line-height: 1.4;
}

.pg-credentials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.pg-cred-item { display: flex; flex-direction: column; gap: 5px; }
.pg-cred-label {
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pg-cred-required { color: #e03131; font-size: 13px; line-height: 1; }
.pg-cred-hint { font-size: 11px; opacity: 0.4; line-height: 1.4; }

.pg-webhook-desc {
  font-size: 12px;
  opacity: 0.5;
  margin: 0 0 10px;
  line-height: 1.5;
}

/* ── Webhook ──────────────────────── */
.webhook-hint {
  font-size: 12px;
  opacity: 0.5;
  margin: 0 0 10px;
  line-height: 1.5;
}

.webhook-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.webhook-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 9px;
  border: 1px solid rgba(128,128,128,0.12);
  background: rgba(128,128,128,0.03);
}
:root.dark .webhook-row {
  border-color: rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
}

.webhook-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.webhook-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  opacity: 0.5;
}

.webhook-url {
  font-size: 12px;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

@media (max-width: 600px) {
  .webhook-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .webhook-row .n-button {
    width: 100%;
  }
}

/* ── Reminder ─────────────────────── */
.tab-desc {
  font-size: 13px;
  opacity: 0.5;
  margin: 0 0 16px;
  line-height: 1.5;
}

.reminder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.reminder-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.reminder-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reminder-empty {
  text-align: center;
  padding: 32px;
  opacity: 0.4;
  font-size: 13px;
}

.reminder-card {
  padding: 14px;
  border-radius: 10px;
  border: 1px solid rgba(128, 128, 128, 0.12);
  background: rgba(128, 128, 128, 0.03);
}

:root.dark .reminder-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.reminder-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.reminder-card-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reminder-card-agenda {
  margin: 0 0 6px;
  font-size: 12px;
  opacity: 0.55;
  font-style: italic;
  line-height: 1.3;
}

.reminder-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.meta-item {
  font-size: 12px;
  opacity: 0.5;
}

.reminder-card-msg {
  margin: 0 0 8px;
  font-size: 12px;
  opacity: 0.45;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.reminder-card-actions {
  display: flex;
  gap: 4px;
}

.modal-row {
  display: flex;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.wa-format-guide {
  background: rgba(128,128,128,0.04);
  border: 1px solid rgba(128,128,128,0.08);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
:root.dark .wa-format-guide {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.06);
}

.wa-guide-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.6;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.wa-guide-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wa-guide-item {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wa-guide-item code {
  background: rgba(128,128,128,0.1);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
}
:root.dark .wa-guide-item code {
  background: rgba(255,255,255,0.08);
}

.variables-hint-box {
  background: rgba(59,130,246,0.05);
  border: 1px solid rgba(59,130,246,0.15);
  border-radius: 8px;
  padding: 10px 12px;
}
:root.dark .variables-hint-box {
  background: rgba(59,130,246,0.08);
  border-color: rgba(59,130,246,0.2);
}

.hint-title {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.7;
  margin-bottom: 6px;
}

.hint-vars {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.hint-var {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  background: rgba(59,130,246,0.1);
  color: #3b82f6;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 500;
}
:root.dark .hint-var {
  background: rgba(59,130,246,0.15);
  color: #60a5fa;
}

.variables-hint {
  font-size: 11px;
  opacity: 0.45;
  margin: 0;
}

.tab-desc {
  font-size: 13px;
  opacity: 0.6;
  margin: 0 0 16px;
}
/* ── Section headers (Pengingat) ─────── */
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.section-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 2px;
}
.section-sub {
  font-size: 12px;
  opacity: 0.5;
}

/* ── Reminder Send Preview ────────── */
.reminder-send-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(59, 130, 246, 0.07);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
}
:root.dark .reminder-send-preview {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.25);
}
.rsp-icon { font-size: 18px; flex-shrink: 0; }
.rsp-text { font-size: 13px; font-weight: 600; color: #3b82f6; line-height: 1.4; }
:root.dark .rsp-text { color: #60a5fa; }

/* ── Field label with hint ─────────── */
.field-label-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 2px;
}
.field-label-main { font-size: 13px; font-weight: 600; }
.field-label-hint { font-size: 11px; opacity: 0.45; line-height: 1.4; }

/* ── Billing Profiles ──────────────── */
.bp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bp-card {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(128, 128, 128, 0.12);
  background: rgba(128, 128, 128, 0.03);
}
:root.dark .bp-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.bp-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.bp-card-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.bp-name {
  font-weight: 600;
  font-size: 14px;
}

.bp-card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.bp-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.5;
}

.bp-sep {
  opacity: 0.4;
}
</style>
