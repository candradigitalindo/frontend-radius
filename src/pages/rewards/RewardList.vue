<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm,
  NModal, NForm, NFormItem, NInputNumber, NSwitch, NSelect,
  NTabs, NTabPane, NDatePicker, useMessage
} from 'naive-ui'
import { rewardApi, rewardClaimApi } from '../../api'

const message = useMessage()
const loading = ref(false)
const rewards = ref<any[]>([])
const rewardTotal = ref(0)
const rewardPage = ref(1)
const rewardPerPage = ref(20)

const claims = ref<any[]>([])
const claimTotal = ref(0)
const claimPage = ref(1)
const claimPerPage = ref(20)
const claimFilterStatus = ref('')

const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

const form = ref({
  name: '', description: '', type: 'referral', value: 0, value_type: 'fixed',
  min_invoices: 0, is_active: true,
  start_date_ts: null as number | null,
  end_date_ts: null as number | null,
})

const activeOnlyFilter = ref(false)

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : ''
const parseRp = (s: string) => { const n = Number(s.replace(/\./g, '').replace(/,/g, '.')); return isNaN(n) ? null : n }
const rewardDisplay = ref(fmtRp(0))
function onRewardInput(val: string) {
  const num = parseRp(val)
  form.value.value = num ?? 0
  rewardDisplay.value = num != null ? fmtRp(num) : val
}
function syncRewardDisplay() { rewardDisplay.value = fmtRp(form.value.value) }

function resetForm() {
  form.value = {
    name: '', description: '', type: 'referral', value: 0, value_type: 'fixed',
    min_invoices: 0, is_active: true,
    start_date_ts: null, end_date_ts: null,
  }
  editId.value = null
  rewardDisplay.value = fmtRp(0)
}

function formatDate(ts: number | null): string | null {
  if (!ts) return null
  return new Date(ts).toISOString()
}

const typeLabel: Record<string, string> = { referral: 'Referral', loyalty: 'Loyalty', promo: 'Promo' }
const valueTypeLabel: Record<string, string> = { fixed: 'Nominal', percentage: 'Persentase' }

const rewardCols = [
  { title: 'Nama', key: 'name' },
  { title: 'Tipe', key: 'type', render: (r: any) => typeLabel[r.type] || r.type },
  { title: 'Nilai', key: 'value', render: (r: any) => r.value_type === 'percentage' ? `${r.value}%` : fmtRp(r.value) },
  { title: 'Jenis Nilai', key: 'value_type', render: (r: any) => valueTypeLabel[r.value_type] || r.value_type },
  { title: 'Min. Invoice', key: 'min_invoices', render: (r: any) => r.type === 'loyalty' ? r.min_invoices : '-' },
  { title: 'Berlaku Dari', key: 'start_date', render: (r: any) => r.start_date?.split('T')[0] || '-' },
  { title: 'Berlaku Sampai', key: 'end_date', render: (r: any) => r.end_date?.split('T')[0] || '-' },
  { title: 'Status', key: 'is_active', render: (r: any) => h(NTag, { type: r.is_active ? 'success' : 'default', size: 'small' }, () => r.is_active ? 'Aktif' : 'Nonaktif') },
  {
    title: 'Aksi', key: 'actions', render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus?' }),
    ])
  },
]

const claimStatusMap: Record<string, { type: any; label: string }> = {
  pending: { type: 'warning', label: 'Pending' },
  applied: { type: 'success', label: 'Diterapkan' },
  expired: { type: 'error', label: 'Expired' },
}

const claimCols = [
  { title: 'Pelanggan', key: 'customer_name', render: (r: any) => r.customer_name || '-' },
  { title: 'Reward', key: 'reward_name', render: (r: any) => r.reward_name || '-' },
  { title: 'Jumlah', key: 'amount', render: (r: any) => fmtRp(r.amount) },
  { title: 'Tipe', key: 'type', render: (r: any) => r.type === 'invoice_discount' ? 'Diskon Invoice' : r.type === 'balance_credit' ? 'Kredit Saldo' : r.type },
  {
    title: 'Status', key: 'status',
    render: (r: any) => {
      const s = claimStatusMap[r.status] || { type: 'default', label: r.status }
      return h(NTag, { type: s.type, size: 'small' }, () => s.label)
    }
  },
  { title: 'Diterapkan', key: 'applied_at', render: (r: any) => r.applied_at?.split('T')[0] || '-' },
  { title: 'Kadaluarsa', key: 'expires_at', render: (r: any) => r.expires_at?.split('T')[0] || '-' },
  { title: 'Tanggal', key: 'created_at', render: (r: any) => r.created_at?.split('T')[0] || '-' },
  {
    title: 'Aksi', key: 'actions',
    render: (r: any) => r.status === 'pending'
      ? h(NPopconfirm,
          { onPositiveClick: () => handleApplyClaim(r.id) },
          {
            trigger: () => h(NButton, { size: 'tiny', type: 'success' }, () => 'Terapkan'),
            default: () => 'Terapkan klaim ini ke customer?',
          })
      : '-'
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = {
    name: r.name, description: r.description || '', type: r.type, value: r.value,
    value_type: r.value_type, min_invoices: r.min_invoices || 0, is_active: r.is_active,
    start_date_ts: r.start_date ? new Date(r.start_date).getTime() : null,
    end_date_ts: r.end_date ? new Date(r.end_date).getTime() : null,
  }
  rewardDisplay.value = fmtRp(r.value)
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) { message.warning('Nama wajib diisi'); return }
  saving.value = true
  try {
    const { start_date_ts, end_date_ts, ...rest } = form.value
    const payload = {
      ...rest,
      start_date: formatDate(start_date_ts),
      end_date: formatDate(end_date_ts),
    }
    if (editId.value) { await rewardApi.update(editId.value, payload); message.success('Reward diperbarui') }
    else { await rewardApi.create(payload); message.success('Reward ditambahkan') }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await rewardApi.delete(id); message.success('Reward dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function handleApplyClaim(id: string) {
  try { await rewardClaimApi.apply(id); message.success('Klaim diterapkan'); fetchData() }
  catch (e: any) { message.error(e.response?.data?.error || 'Gagal menerapkan klaim') }
}

async function fetchData() {
  loading.value = true
  try {
    const claimParams: Record<string, any> = { page: claimPage.value, per_page: claimPerPage.value }
    if (claimFilterStatus.value) claimParams.status = claimFilterStatus.value

    const rewardParams: Record<string, any> = { page: rewardPage.value, per_page: rewardPerPage.value }
    if (activeOnlyFilter.value) rewardParams.active_only = true

    const [rRes, cRes] = await Promise.all([
      rewardApi.list(rewardParams),
      rewardClaimApi.list(claimParams),
    ])
    rewards.value = rRes.data?.data || []
    rewardTotal.value = rRes.data?.total || rewards.value.length
    claims.value = cRes.data?.data || []
    claimTotal.value = cRes.data?.total || claims.value.length
  } catch { message.error('Gagal memuat data') }
  loading.value = false
}
onMounted(fetchData)
</script>

<template>
  <n-card title="Reward System">
    <template #header-extra>
      <n-button type="primary" size="small" @click="resetForm(); showModal = true">+ Tambah Reward</n-button>
    </template>

    <n-tabs type="line">
      <n-tab-pane name="rewards" tab="Daftar Reward">
        <n-space justify="end" style="margin-bottom:10px" align="center">
          <n-space align="center" size="small">
            <span style="font-size:13px">Hanya Aktif</span>
            <n-switch v-model:value="activeOnlyFilter" @update:value="() => { rewardPage = 1; fetchData() }" size="small" />
          </n-space>
        </n-space>
        <n-data-table
          v-if="isDesktop"
          :columns="rewardCols"
          :data="rewards"
          :loading="loading"
          :bordered="false"
          :pagination="{
            page: rewardPage,
            pageSize: rewardPerPage,
            itemCount: rewardTotal,
            showSizePicker: true,
            pageSizes: [10, 20, 50],
            onChange: (p: number) => { rewardPage = p; fetchData() },
            onUpdatePageSize: (s: number) => { rewardPerPage = s; rewardPage = 1; fetchData() },
          }"
          remote
          size="small"
        />

        <!-- Tablet & Mobile: cards -->
        <div v-else>
          <div v-if="loading" style="text-align:center;padding:24px">Memuat...</div>
          <div v-else-if="!rewards.length" style="text-align:center;padding:24px;opacity:0.6">Tidak ada reward</div>
          <div v-else class="reward-grid">
            <n-card v-for="r in rewards" :key="r.id" size="small">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
                <span style="font-weight:600">{{ r.name }}</span>
                <n-tag :type="r.is_active ? 'success' : 'default'" size="small">{{ r.is_active ? 'Aktif' : 'Nonaktif' }}</n-tag>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                <n-tag size="tiny" :bordered="false">{{ typeLabel[r.type] || r.type }}</n-tag>
                <n-tag size="tiny" :bordered="false">{{ valueTypeLabel[r.value_type] || r.value_type }}</n-tag>
              </div>
              <div style="font-weight:600;margin-bottom:2px">{{ r.value_type === 'percentage' ? `${r.value}%` : `Rp ${fmtRp(r.value)}` }}</div>
              <div v-if="r.type === 'loyalty'" style="font-size:12px;opacity:0.7;margin-bottom:6px">Min. Invoice: {{ r.min_invoices }}</div>
              <div v-else style="margin-bottom:6px"></div>
              <n-space size="small">
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

      <n-tab-pane name="claims" tab="Klaim Reward">
        <n-space justify="end" style="margin-bottom:10px">
          <n-select
            v-model:value="claimFilterStatus"
            :options="[
              { label: 'Semua Status', value: '' },
              { label: 'Pending', value: 'pending' },
              { label: 'Diterapkan', value: 'applied' },
              { label: 'Expired', value: 'expired' },
            ]"
            style="width:160px"
            size="small"
            placeholder="Filter Status"
            @update:value="() => { claimPage = 1; fetchData() }"
          />
        </n-space>
        <!-- Desktop: table -->
        <n-data-table
          v-if="isDesktop"
          :columns="claimCols"
          :data="claims"
          :loading="loading"
          :bordered="false"
          :pagination="{
            page: claimPage,
            pageSize: claimPerPage,
            itemCount: claimTotal,
            showSizePicker: true,
            pageSizes: [10, 20, 50],
            onChange: (p: number) => { claimPage = p; fetchData() },
            onUpdatePageSize: (s: number) => { claimPerPage = s; claimPage = 1; fetchData() },
          }"
          remote
          size="small"
        />

        <!-- Tablet & Mobile: cards -->
        <div v-else>
          <div v-if="loading" style="text-align:center;padding:24px">Memuat...</div>
          <div v-else-if="!claims.length" style="text-align:center;padding:24px;opacity:0.6">Tidak ada klaim</div>
          <div v-else class="reward-grid">
            <n-card v-for="r in claims" :key="r.id" size="small">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
                <span style="font-weight:600;font-size:13px">{{ r.customer_name || '-' }}</span>
                <n-tag :type="(claimStatusMap[r.status] || {}).type || 'default'" size="small">{{ (claimStatusMap[r.status] || {}).label || r.status }}</n-tag>
              </div>
              <div style="font-size:12px;margin-bottom:2px">{{ r.reward_name || '-' }}</div>
              <div style="font-weight:600;margin-bottom:2px">Rp {{ fmtRp(r.amount) }}</div>
              <div style="font-size:11px;opacity:0.6;margin-bottom:2px">
                {{ r.type === 'invoice_discount' ? 'Diskon Invoice' : r.type === 'balance_credit' ? 'Kredit Saldo' : r.type }}
                • {{ r.created_at?.split('T')[0] || '-' }}
              </div>
              <div v-if="r.expires_at" style="font-size:11px;opacity:0.6;margin-bottom:6px">
                Kadaluarsa: {{ r.expires_at?.split('T')[0] }}
              </div>
              <n-popconfirm v-if="r.status === 'pending'" @positive-click="handleApplyClaim(r.id)">
                <template #trigger>
                  <n-button size="tiny" type="success">Terapkan</n-button>
                </template>
                Terapkan klaim ini ke customer?
              </n-popconfirm>
            </n-card>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </n-card>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit Reward' : 'Tambah Reward'" :style="{ maxWidth: '500px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 130">
      <n-form-item label="Nama"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item label="Deskripsi"><n-input v-model:value="form.description" type="textarea" :rows="2" /></n-form-item>
      <n-form-item label="Tipe">
        <n-select v-model:value="form.type" :options="[{label:'Referral',value:'referral'},{label:'Loyalty',value:'loyalty'},{label:'Promo',value:'promo'}]" />
      </n-form-item>
      <n-form-item label="Jenis Nilai">
        <n-select v-model:value="form.value_type" :options="[{label:'Nominal (Rp)',value:'fixed'},{label:'Persentase (%)',value:'percentage'}]" />
      </n-form-item>
      <n-form-item label="Nilai"><n-input :value="rewardDisplay" @input="onRewardInput" @blur="syncRewardDisplay" style="width:100%" /></n-form-item>
      <n-form-item v-if="form.type === 'loyalty'" label="Min. Invoice Lunas"><n-input-number v-model:value="form.min_invoices" :min="0" style="width:100%" /></n-form-item>
      <n-form-item label="Berlaku Dari">
        <n-date-picker v-model:value="form.start_date_ts" type="date" clearable style="width:100%" placeholder="Pilih tanggal" />
      </n-form-item>
      <n-form-item label="Berlaku Sampai">
        <n-date-picker v-model:value="form.end_date_ts" type="date" clearable style="width:100%" placeholder="Tidak ada batas" />
      </n-form-item>
      <n-form-item label="Aktif"><n-switch v-model:value="form.is_active" /></n-form-item>
      <n-space justify="end">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
.reward-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .reward-grid {
    grid-template-columns: 1fr;
  }
}
</style>
