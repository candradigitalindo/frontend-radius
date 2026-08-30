<script setup lang="ts">
import { h, ref, onMounted, onUnmounted } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NModal, NForm, NFormItem,
  NInput, NSwitch, NTag, NText, NDivider, useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { adminApi } from '../../api'

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const reminders = ref<any[]>([])
const showModal = ref(false)
const editing = ref<any>(null)
const form = ref({ name: '', message_template: '', is_active: true })
const isMobile = ref(false)

const MOBILE_BREAKPOINT = 768
function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

const typeLabels: Record<string, { label: string; color: 'info' | 'warning' | 'error' | 'success' | 'default' }> = {
  sub_expiry_h7:      { label: 'H-7 Sebelum Berakhir',   color: 'info' },
  sub_expiry_h1:      { label: 'H-1 Sebelum Berakhir',   color: 'warning' },
  sub_expiry_h0:      { label: 'Hari H Berakhir',         color: 'error' },
  sub_payment:        { label: 'Konfirmasi Pembayaran',   color: 'success' },
  otp_reset_password: { label: 'OTP Reset Password',      color: 'default' },
  otp_registration:   { label: 'OTP Registrasi',          color: 'default' },
  welcome_tenant:     { label: 'Welcome Tenant',          color: 'success' },
  reset_password_new: { label: 'Password Baru (Reset)',   color: 'warning' },
}

const variableHints: Record<string, string[]> = {
  sub_expiry_h7:      ['{salam}', '{nama_isp}', '{nama_paket}', '{tanggal_berakhir}', '{link_bayar}'],
  sub_expiry_h1:      ['{salam}', '{nama_isp}', '{nama_paket}', '{tanggal_berakhir}', '{link_bayar}'],
  sub_expiry_h0:      ['{salam}', '{nama_isp}', '{nama_paket}', '{tanggal_berakhir}', '{link_bayar}'],
  sub_payment:        ['{salam}', '{nama_isp}', '{nama_paket}', '{durasi}', '{jumlah}', '{tanggal_berakhir}'],
  otp_reset_password: ['{nama}', '{kode_otp}', '{nama_isp}', '{durasi}'],
  otp_registration:   ['{kode_otp}'],
  welcome_tenant:     ['{nama_isp}', '{panel_url}', '{email}', '{password}'],
  reset_password_new: ['{nama_isp}', '{email}', '{password}'],
}

const columns: DataTableColumns = [
  {
    title: 'Jenis Pengingat',
    key: 'type',
    width: 210,
    render: (r: any) => {
      const t = typeLabels[r.type] || { label: r.type, color: 'default' as const }
      return h(NTag, { type: t.color, size: 'small', round: true }, () => t.label)
    },
  },
  { title: 'Nama', key: 'name' },
  {
    title: 'Status',
    key: 'is_active',
    width: 100,
    render: (r: any) => h(NTag, {
      type: r.is_active ? 'success' : 'default',
      size: 'small',
    }, () => r.is_active ? 'Aktif' : 'Nonaktif'),
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 80,
    render: (r: any) => h(NButton, {
      size: 'small', type: 'primary', ghost: true,
      onClick: () => openEdit(r),
    }, () => 'Edit'),
  },
]

async function fetchReminders() {
  loading.value = true
  try {
    const { data } = await adminApi.listSubscriptionReminders()
    reminders.value = data.data || []
  } catch {
    message.error('Gagal memuat template pesan')
  }
  loading.value = false
}

function openEdit(rem: any) {
  editing.value = rem
  form.value = {
    name: rem.name,
    message_template: rem.message_template,
    is_active: rem.is_active,
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.message_template.trim()) {
    message.warning('Template pesan tidak boleh kosong')
    return
  }
  saving.value = true
  try {
    await adminApi.updateSubscriptionReminder(editing.value.id, form.value)
    message.success('Template berhasil diperbarui')
    showModal.value = false
    fetchReminders()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyimpan template')
  }
  saving.value = false
}

onMounted(() => {
  fetchReminders()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <n-card title="Template Pesan WhatsApp">
    <template #header-extra v-if="!isMobile">
      <n-text depth="3" style="font-size:12px">
        Pesan dikirim otomatis via WhatsApp ke nomor telepon tenant
      </n-text>
    </template>

    <div class="table-wrapper">
      <n-data-table
        :columns="columns"
        :data="reminders"
        :loading="loading"
        :bordered="false"
        :row-key="(r: any) => r.id"
        :scroll-x="800"
      />
    </div>
  </n-card>

  <!-- Modal Edit Template -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="Edit Template Pesan"
    :style="{ maxWidth: '620px', width: '95vw' }"
    :mask-closable="false"
  >
    <div v-if="editing">
      <n-space vertical :size="4" style="margin-bottom: 16px">
        <n-tag :type="(typeLabels[editing.type]?.color || 'default')" size="small" round>
          {{ typeLabels[editing.type]?.label || editing.type }}
        </n-tag>
        <n-text depth="3" style="font-size:12px">
          Variabel tersedia:
          <span
            v-for="v in (variableHints[editing.type] || [])"
            :key="v"
            style="background:rgba(128,128,128,0.06);padding:1px 6px;border-radius:4px;margin:2px;font-family:monospace;font-size:11px;display:inline-block"
          >{{ v }}</span>
        </n-text>
      </n-space>

      <n-divider style="margin: 8px 0" />

      <n-form label-placement="top">
        <n-form-item label="Nama Template">
          <n-input v-model:value="form.name" placeholder="Nama template" />
        </n-form-item>

        <n-form-item label="Isi Pesan WhatsApp">
          <n-input
            v-model:value="form.message_template"
            type="textarea"
            :rows="12"
            placeholder="Tulis template pesan di sini..."
            style="font-family: monospace; font-size: 13px"
          />
        </n-form-item>

        <n-form-item label="Status">
          <n-switch v-model:value="form.is_active">
            <template #checked>Aktif — kirim otomatis</template>
            <template #unchecked>Nonaktif</template>
          </n-switch>
        </n-form-item>
      </n-form>
    </div>

    <n-space justify="end" style="margin-top: 8px">
      <n-button @click="showModal = false">Batal</n-button>
      <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
    </n-space>
  </n-modal>
</template>

<style scoped>
@media (max-width: 640px) {
  :deep(.n-card-header) {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 8px;
  }
}
.table-wrapper {
  margin-top: 8px;
}
</style>
