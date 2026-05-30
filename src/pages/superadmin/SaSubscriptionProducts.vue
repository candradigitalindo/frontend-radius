<script setup lang="ts">
import { h, ref, onMounted, computed, onUnmounted } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NModal, NForm, NFormItem,
  NInput, NInputNumber, NSwitch, NTag, NDivider, NText, useMessage, useDialog,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { adminApi } from '../../api'

const message = useMessage()
const dialog = useDialog()
const isMobile = ref(false)

const MOBILE_BREAKPOINT = 768
function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingId = ref<string | null>(null)

const plans = ref<any[]>([])

const emptyForm = () => ({
  name: '',
  slug: '',
  description: '',
  price: 0,
  duration_months: 1,
  max_customers: 0,
  max_routers: 0,
  features: [] as string[],
  is_popular: false,
  is_active: true,
  sort_order: 0,
})

const form = ref(emptyForm())
const featureInput = ref('')

const modalTitle = computed(() => editingId.value ? 'Edit Produk' : 'Tambah Produk')

const formatPrice = (price: number) =>
  'Rp ' + price.toLocaleString('id-ID')

const columns: DataTableColumns = [
  {
    title: 'Nama',
    key: 'name',
    render: (r: any) => h(NSpace, { align: 'center', size: 4 }, () => [
      h(NText, { strong: true }, () => r.name),
      r.is_popular ? h(NTag, { type: 'warning', size: 'small', round: true }, () => 'Popular') : null,
    ]),
  },
  { title: 'Slug', key: 'slug' },
  {
    title: 'Harga',
    key: 'price',
    render: (r: any) => formatPrice(r.price),
  },
  {
    title: 'Durasi',
    key: 'duration_months',
    render: (r: any) => `${r.duration_months} bulan`,
  },
  {
    title: 'Maks. Pelanggan',
    key: 'max_customers',
    render: (r: any) => r.max_customers === 0 ? '∞' : r.max_customers,
  },
  {
    title: 'Status',
    key: 'is_active',
    render: (r: any) => h(NTag, { type: r.is_active ? 'success' : 'default', size: 'small' }, () => r.is_active ? 'Aktif' : 'Nonaktif'),
  },
  {
    title: 'Urutan',
    key: 'sort_order',
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 140,
    render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, {
        size: 'small',
        type: 'primary',
        ghost: true,
        onClick: () => openEdit(r),
      }, () => 'Edit'),
      h(NButton, {
        size: 'small',
        type: 'error',
        ghost: true,
        onClick: () => confirmDelete(r),
      }, () => 'Hapus'),
    ]),
  },
]

async function fetchPlans() {
  loading.value = true
  try {
    const { data } = await adminApi.listSubscriptionPlans()
    plans.value = data.data || []
  } catch {
    message.error('Gagal memuat produk subscribe')
  }
  loading.value = false
}

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  featureInput.value = ''
  showModal.value = true
}

function openEdit(plan: any) {
  editingId.value = plan.id
  form.value = {
    name: plan.name,
    slug: plan.slug,
    description: plan.description || '',
    price: plan.price,
    duration_months: plan.duration_months,
    max_customers: plan.max_customers,
    max_routers: plan.max_routers,
    features: [...(plan.features || [])],
    is_popular: plan.is_popular,
    is_active: plan.is_active,
    sort_order: plan.sort_order,
  }
  featureInput.value = ''
  showModal.value = true
}

function addFeature() {
  const f = featureInput.value.trim()
  if (f && !form.value.features.includes(f)) {
    form.value.features.push(f)
  }
  featureInput.value = ''
}

function removeFeature(idx: number) {
  form.value.features.splice(idx, 1)
}

async function handleSave() {
  if (!form.value.name || !form.value.slug) {
    message.warning('Nama dan slug wajib diisi')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await adminApi.updateSubscriptionPlan(editingId.value, form.value)
      message.success('Produk berhasil diperbarui')
    } else {
      await adminApi.createSubscriptionPlan(form.value)
      message.success('Produk berhasil dibuat')
    }
    showModal.value = false
    fetchPlans()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyimpan produk')
  }
  saving.value = false
}

function confirmDelete(plan: any) {
  dialog.warning({
    title: 'Hapus Produk',
    content: `Yakin ingin menghapus produk "${plan.name}"? Tindakan ini tidak dapat dibatalkan.`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      try {
        await adminApi.deleteSubscriptionPlan(plan.id)
        message.success('Produk berhasil dihapus')
        fetchPlans()
      } catch {
        message.error('Gagal menghapus produk')
      }
    },
  })
}

onMounted(() => {
  fetchPlans()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <n-card title="Produk Subscribe">
    <template #header-extra>
      <n-button type="primary" @click="openCreate">+ Tambah Produk</n-button>
    </template>

    <div class="table-wrapper">
      <n-data-table
        :columns="columns"
        :data="plans"
        :loading="loading"
        :bordered="false"
        :row-key="(r: any) => r.id"
        :scroll-x="1000"
      />
    </div>
  </n-card>

  <!-- Modal Form -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="modalTitle"
    :style="{ maxWidth: '560px', width: '95vw' }"
    :mask-closable="false"
  >
    <n-form :label-placement="isMobile ? 'top' : 'left'" label-width="140">
      <n-form-item label="Nama Produk">
        <n-input v-model:value="form.name" placeholder="Paket Starter" />
      </n-form-item>

      <n-form-item label="Slug">
        <n-input v-model:value="form.slug" placeholder="starter" />
      </n-form-item>

      <n-form-item label="Deskripsi">
        <n-input
          v-model:value="form.description"
          type="textarea"
          :rows="2"
          placeholder="Deskripsi singkat produk"
        />
      </n-form-item>

      <n-form-item label="Harga (Rp)">
        <n-input-number
          v-model:value="form.price"
          :min="0"
          :step="1000"
          placeholder="99000"
          style="width: 100%"
        />
      </n-form-item>

      <n-form-item label="Durasi (bulan)">
        <n-input-number v-model:value="form.duration_months" :min="1" style="width: 100%" />
      </n-form-item>

      <n-form-item label="Maks. Pelanggan">
        <n-input-number v-model:value="form.max_customers" :min="0" placeholder="0 = unlimited" style="width: 100%" />
      </n-form-item>

      <n-form-item label="Maks. Router">
        <n-input-number v-model:value="form.max_routers" :min="0" placeholder="0 = unlimited" style="width: 100%" />
      </n-form-item>

      <n-form-item label="Urutan Tampil">
        <n-input-number v-model:value="form.sort_order" :min="0" style="width: 100%" />
      </n-form-item>

      <n-form-item label="Populer">
        <n-switch v-model:value="form.is_popular" />
      </n-form-item>

      <n-form-item label="Aktif">
        <n-switch v-model:value="form.is_active" />
      </n-form-item>

      <n-divider style="margin: 8px 0" />

      <n-form-item label="Fitur">
        <div style="width: 100%">
          <n-space wrap style="margin-bottom: 8px">
            <n-tag
              v-for="(f, i) in form.features"
              :key="i"
              closable
              @close="removeFeature(i)"
              size="small"
              type="info"
            >{{ f }}</n-tag>
          </n-space>
          <n-space wrap>
            <n-input
              v-model:value="featureInput"
              placeholder="Tambah fitur..."
              :style="{ width: isMobile ? '100%' : '280px' }"
              @keyup.enter="addFeature"
            />
            <n-button :block="isMobile" size="small" @click="addFeature">Tambah</n-button>
          </n-space>
        </div>
      </n-form-item>
    </n-form>

    <n-space justify="end" style="margin-top: 16px">
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
    gap: 12px;
  }
  :deep(.n-card-header__extra) {
    width: 100%;
    padding: 0 !important;
  }
  :deep(.n-card-header__extra) .n-button {
    width: 100%;
  }
}
.table-wrapper {
  margin-top: 8px;
}
</style>
