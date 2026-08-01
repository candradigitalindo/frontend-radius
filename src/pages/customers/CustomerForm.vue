<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NCard, NForm, NFormItem, NInput, NButton, NSelect, NInputNumber,
  NSpace, NSteps, NStep, NDivider, NAlert, NText, NDatePicker, NIcon, useMessage
} from 'naive-ui'
import { Edit, UserPlus } from '@vicons/tabler'
import { customerApi, packageApi, routerApi, odpApi, dashboardApi, resellerApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const currentStep = ref(1)
const isEdit = computed(() => !!route.params.id)
const editSection = computed(() => isEdit.value ? (route.query.section as string || null) : null)
const isMobile = ref(window.innerWidth < 768)
function onResize() { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const sectionTitles: Record<string, { title: string; sub: string }> = {
  pribadi: { title: 'Edit Data Pribadi', sub: 'Perbarui informasi personal pelanggan' },
  tagihan: { title: 'Edit Paket & Tagihan', sub: 'Ubah paket, harga, dan pengaturan tagihan' },
  koneksi: { title: 'Edit Koneksi', sub: 'Ubah router, tipe koneksi, dan kredensial' },
}
const titleInfo = computed(() => {
  if (editSection.value && sectionTitles[editSection.value]) return sectionTitles[editSection.value]
  if (isEdit.value) return { title: 'Edit Pelanggan', sub: 'Perbarui informasi pelanggan' }
  return { title: 'Tambah Pelanggan', sub: 'Lengkapi data pelanggan baru' }
})

const form = ref({
  customer_code: '',
  name: '',
  nik: '',
  phone: '',
  email: '',
  address: '',
  connection_type: 'pppoe',
  pppoe_username: '',
  pppoe_password: '',
  ip_address: '',
  package_id: null as string | null,
  router_id: null as string | null,
  odp_port_id: null as string | null,
  serial_number: '',
  ont_vendor: '',
  ont_model: '',
  join_date_ts: Date.now() as number | null,
  billing_date: new Date().getDate(),
  billing_type: 'fixed',
  billing_date_ts: Date.now() as number | null,
  billing_deadline: 20,
  custom_price: null as number | null,
  discount: 0,
  additional_fee: 0,
  fee_description: '',
  notes: '',
  referral_code_used: '',
  latitude: null as number | null,
  longitude: null as number | null,
  reseller_id: null as string | null,
})

const packages = ref<any[]>([])
const routers = ref<any[]>([])
const resellers = ref<any[]>([])
const odps = ref<any[]>([])
const odpPorts = ref<any[]>([])
const selectedOdpId = ref<string | null>(null)
const customerLimitWarning = ref<string | null>(null)

const packageOptions = computed(() => packages.value.map((p: any) => ({
  label: `${p.name} - ${p.price?.toLocaleString('id-ID')}`,  
  value: p.id,
})))
const routerOptions = computed(() => routers.value.map((r: any) => ({ label: r.name, value: r.id })))
const resellerOptions = computed(() => resellers.value.map((r: any) => ({
  label: `${r.name}${r.commission_rate ? ` (${r.commission_rate}%)` : ''}`,
  value: r.id,
})))
const odpOptions = computed(() => odps.value.map((o: any) => ({ label: o.name, value: o.id })))
const odpPortOptions = computed(() => odpPorts.value.map((p: any) => ({
  label: `Port ${p.port_number}${p.notes ? ` – ${p.notes}` : ''}`,
  value: p.id,
  disabled: p.status === 'used' && p.customer_id !== (form.value as any)._customer_id,
})))
const connectionOptions = [
  { label: 'PPPoE', value: 'pppoe' },
  { label: 'Static IP', value: 'static' },
  { label: 'DHCP', value: 'dhcp' },
  { label: 'FTTH (Fiber)', value: 'ftth' },
]

async function onOdpChange(id: string | null) {
  form.value.odp_port_id = null
  odpPorts.value = []
  if (id) {
    try {
      const { data } = await odpApi.ports(id)
      odpPorts.value = data?.data || data || []
    } catch { /* ignore */ }
  }
}
const billingTypeOptions = [
  { label: 'Tanggal Tetap (fixed)', value: 'fixed' },
  { label: 'Range Tanggal (otomatis)', value: 'date_range' },
]


const selectedPackage = computed(() => packages.value.find((p: any) => p.id === form.value.package_id))
const packagePrice = computed(() => selectedPackage.value?.price || 0)
const totalPrice = computed(() => {
  const base = form.value.custom_price ?? packagePrice.value
  return base - form.value.discount + form.value.additional_fee
})

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : ''
const parseRp = (s: string) => { const n = Number(s.replace(/\./g, '').replace(/,/g, '.')); return isNaN(n) ? null : n }

const customPriceDisplay = ref('')
const discountDisplay = ref(fmtRp(0))
const additionalFeeDisplay = ref(fmtRp(0))

function onCustomPriceInput(val: string) {
  if (!val) { form.value.custom_price = null; customPriceDisplay.value = ''; return }
  const num = parseRp(val)
  form.value.custom_price = num
  customPriceDisplay.value = num != null ? fmtRp(num) : val
}
function syncCustomPriceDisplay() { customPriceDisplay.value = form.value.custom_price != null ? fmtRp(form.value.custom_price) : '' }
function onDiscountInput(val: string) {
  const num = parseRp(val)
  form.value.discount = num ?? 0
  discountDisplay.value = num != null ? fmtRp(num) : val
}
function syncDiscountDisplay() { discountDisplay.value = fmtRp(form.value.discount) }
function onAdditionalFeeInput(val: string) {
  const num = parseRp(val)
  form.value.additional_fee = num ?? 0
  additionalFeeDisplay.value = num != null ? fmtRp(num) : val
}
function syncAdditionalFeeDisplay() { additionalFeeDisplay.value = fmtRp(form.value.additional_fee) }

function formatLocalDate(ts: number): string {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T00:00:00Z`
}

function onBillingDatePick(ts: number | null) {
  if (ts) {
    form.value.billing_date = new Date(ts).getDate()
  }
}

watch(() => form.value.billing_type, (val) => {
  if (val === 'fixed') {
    form.value.billing_date_ts = Date.now()
    form.value.billing_date = new Date().getDate()
  } else if (val === 'date_range') {
    form.value.billing_date_ts = null
    form.value.billing_date = 0
    form.value.billing_deadline = 0
  }
})

function validateStep(step: number): boolean {
  if (step === 1) {
    if (!form.value.name) {
      message.warning('Nama wajib diisi')
      return false
    }
    return true
  }
  if (step === 2) {
    if (!form.value.package_id) {
      message.warning('Paket wajib dipilih')
      return false
    }
    return true
  }
  return true
}

function nextStep() {
  if (validateStep(currentStep.value)) {
    currentStep.value++
  }
}

function prevStep() {
  currentStep.value--
}

onMounted(async () => {
  loading.value = true
  try {
    const promises: Promise<any>[] = [
      packageApi.list(), routerApi.list(), odpApi.list(),
      resellerApi.list({ status: 'active', per_page: 100 }).catch(() => ({ data: { data: [] } })),
    ]

    const results = await Promise.all(promises)
    packages.value = results[0].data?.data || []
    routers.value = results[1].data?.data || []
    odps.value = results[2].data?.data || []
    resellers.value = results[3].data?.data || []

    if (isEdit.value) {
      const { data } = await customerApi.get(route.params.id as string)
      const c = data.data || data
      ;(form.value as any)._customer_id = c.id
      Object.assign(form.value, {
        customer_code: c.customer_code,
        name: c.name,
        nik: c.nik || '',
        phone: c.phone,
        email: c.email || '',
        address: c.address || '',
        connection_type: c.connection_type || 'pppoe',
        pppoe_username: c.pppoe_username || '',
        pppoe_password: c.pppoe_password || '',
        ip_address: c.ip_address || '',
        package_id: c.package_id || null,
        router_id: c.router_id || null,
        odp_port_id: c.odp_port_id || null,
        serial_number: c.ont?.serial_number || '',
        ont_vendor: c.ont?.vendor || '',
        ont_model: c.ont?.model || '',
        join_date_ts: c.join_date && c.join_date !== '0001-01-01T00:00:00Z' ? new Date(c.join_date).getTime() : Date.now(),
        billing_date: c.billing_date || new Date().getDate(),
        billing_type: c.billing_type || 'fixed',
        billing_date_ts: null as number | null,
        billing_deadline: c.billing_deadline || 20,
        custom_price: c.custom_price ?? null,
        discount: c.discount || 0,
        additional_fee: c.additional_fee || 0,
        fee_description: c.fee_description || '',
        notes: c.notes || '',
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        reseller_id: c.reseller_id ?? null,
      })
      if (c.connection_type === 'ftth' && c.odp_port?.odp_id) {
        selectedOdpId.value = c.odp_port.odp_id
        await onOdpChange(c.odp_port.odp_id)
      }
      // Sync billing_date_ts from billing_date for date picker
      const now = new Date()
      now.setDate(form.value.billing_date)
      form.value.billing_date_ts = now.getTime()
      customPriceDisplay.value = c.custom_price != null ? fmtRp(c.custom_price) : ''
      discountDisplay.value = fmtRp(c.discount || 0)
      additionalFeeDisplay.value = fmtRp(c.additional_fee || 0)
    }
  } catch { message.error('Gagal memuat data') }
  loading.value = false
})

async function handleSubmit() {
  saving.value = true
  try {
    const section = editSection.value

    if (section) {
      // Validasi per section
      if (section === 'pribadi' && !form.value.name) { message.warning('Nama wajib diisi'); saving.value = false; return }
      if (section === 'tagihan' && !form.value.package_id) { message.warning('Paket wajib dipilih'); saving.value = false; return }

      // Kirim seluruh data agar PUT tidak mereset field lain
      const { billing_date_ts, join_date_ts, custom_price, customer_code, pppoe_username, pppoe_password, ...rest } = form.value
      const payload: Record<string, any> = {
        ...rest,
        join_date: join_date_ts ? formatLocalDate(join_date_ts) : undefined,
        billing_date: rest.billing_type === 'date_range' ? undefined : (rest.billing_date || new Date().getDate()),
        billing_type: rest.billing_type || 'fixed',
      }
      if (rest.billing_type === 'date_range') {
        delete payload.billing_date
        delete payload.billing_deadline
      }
      if (custom_price != null && custom_price > 0) payload.custom_price = custom_price
      if (rest.connection_type !== 'ftth') {
        delete payload.serial_number
        delete payload.ont_vendor
        delete payload.ont_model
        delete payload.odp_port_id
      }
      delete (payload as any)._customer_id

      const labels: Record<string, string> = { pribadi: 'Data pribadi', tagihan: 'Paket & tagihan', koneksi: 'Koneksi' }
      await customerApi.update(route.params.id as string, payload)
      message.success(`${labels[section] || 'Data'} berhasil diperbarui`)
      router.push(`/customers/${route.params.id}`)
      saving.value = false
      return
    }

    // Full create / full edit (no section)
    if (!form.value.name) {
      message.warning('Nama wajib diisi')
      currentStep.value = 1
      saving.value = false
      return
    }
    if (!form.value.package_id) {
      message.warning('Paket wajib dipilih')
      currentStep.value = 2
      saving.value = false
      return
    }
    const { billing_date_ts, join_date_ts, custom_price, customer_code, pppoe_username, pppoe_password, referral_code_used, ...rest } = form.value

    // Kredensial PPPoE manual hanya saat create; kosong = digenerate backend
    const manualUsername = pppoe_username.trim()
    const manualPassword = pppoe_password.trim()
    if (!isEdit.value && rest.connection_type === 'pppoe') {
      if (manualUsername && !/^[A-Za-z0-9@._-]{3,50}$/.test(manualUsername)) {
        message.warning('Username PPPoE: 3-50 karakter huruf, angka, atau @ . _ - tanpa spasi')
        currentStep.value = 3
        saving.value = false
        return
      }
      if (manualPassword && (manualPassword.length < 4 || manualPassword.length > 50 || /\s/.test(manualPassword))) {
        message.warning('Password PPPoE: 4-50 karakter tanpa spasi')
        currentStep.value = 3
        saving.value = false
        return
      }
    }

    const payload: Record<string, any> = {
      ...rest,
      join_date: join_date_ts ? formatLocalDate(join_date_ts) : formatLocalDate(Date.now()),
      billing_date: rest.billing_type === 'date_range' ? undefined : (rest.billing_date || new Date().getDate()),
      billing_type: rest.billing_type || 'fixed',
    }
    if (rest.billing_type === 'date_range') {
      delete payload.billing_date
      delete payload.billing_deadline
    }
    if (custom_price != null && custom_price > 0) payload.custom_price = custom_price
    if (rest.connection_type !== 'ftth') {
      delete payload.serial_number
      delete payload.ont_vendor
      delete payload.ont_model
      delete payload.odp_port_id
    }
    delete (payload as any)._customer_id
    if (isEdit.value) {
      await customerApi.update(route.params.id as string, payload)
      message.success('Pelanggan berhasil diperbarui')
    } else {
      // Check free plan limit (max 20 customers)
      const userPlan = (authStore.user?.plan || '').toLowerCase().trim()
      if (userPlan === 'free') {
        try {
          const { data } = await dashboardApi.stats()
          const stats = data?.data || data || {}
          const totalCustomers = stats.total_customers || 0
          if (totalCustomers >= 20) {
            message.error('Paket Free maksimal 20 pelanggan. Upgrade paket untuk menambah lebih banyak pelanggan.')
            saving.value = false
            return
          }
        } catch (e) {
        }
      }
      // Hanya sertakan referral_code_used saat buat customer baru
      if (referral_code_used?.trim()) payload.referral_code_used = referral_code_used.trim()
      if (rest.connection_type === 'pppoe') {
        if (manualUsername) payload.pppoe_username = manualUsername
        if (manualPassword) payload.pppoe_password = manualPassword
      }
      await customerApi.create(payload)
      message.success('Pelanggan berhasil ditambahkan')
    }
    router.push('/customers')
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyimpan')
  }
  saving.value = false
}
</script>

<template>
  <n-card :loading="loading">
    <!-- Custom title -->
    <div class="card-title">
      <span class="card-title-icon">
        <n-icon v-if="isEdit" :component="Edit" :size="20" />
        <n-icon v-else :component="UserPlus" :size="20" />
      </span>
      <div>
        <h2 class="card-title-text">{{ titleInfo.title }}</h2>
        <p class="card-title-sub">{{ titleInfo.sub }}</p>
      </div>
    </div>

    <!-- ===== SECTIONED EDIT MODE ===== -->
    <template v-if="editSection">
      <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 180" :disabled="loading">

        <!-- Section: Data Pribadi -->
        <template v-if="editSection === 'pribadi'">
          <n-form-item label="Kode Pelanggan">
            <n-input v-model:value="form.customer_code" disabled placeholder="Otomatis" />
          </n-form-item>
          <n-form-item label="Nama Lengkap">
            <n-input v-model:value="form.name" placeholder="Nama pelanggan" style="text-transform: uppercase" @input="(v: string) => form.name = v.toUpperCase()" />
          </n-form-item>
          <n-form-item label="NIK KTP">
            <n-input v-model:value="form.nik" placeholder="Nomor Induk Kependudukan" maxlength="16" />
          </n-form-item>
          <n-form-item label="No. Telepon">
            <n-input v-model:value="form.phone" placeholder="08xxxxxxxxxx" />
          </n-form-item>
          <n-form-item label="Email">
            <n-input v-model:value="form.email" placeholder="email@domain.com" />
          </n-form-item>
          <n-form-item label="Alamat">
            <n-input v-model:value="form.address" type="textarea" placeholder="Alamat lengkap" :rows="3" />
          </n-form-item>
          <n-form-item label="Tanggal Daftar">
            <n-date-picker v-model:value="form.join_date_ts" type="date" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Catatan">
            <n-input v-model:value="form.notes" type="textarea" placeholder="Catatan internal (opsional)" :rows="2" />
          </n-form-item>
          <n-form-item label="Reseller">
            <n-select v-model:value="form.reseller_id" :options="resellerOptions" clearable filterable placeholder="Tanpa reseller" />
          </n-form-item>
          <n-divider title-placement="left" style="font-size: 13px">Lokasi Modem (untuk Peta Jaringan)</n-divider>
          <n-form-item label="Latitude">
            <n-input-number v-model:value="form.latitude" :precision="6" style="width:100%" placeholder="Contoh: -6.914744" />
          </n-form-item>
          <n-form-item label="Longitude">
            <n-input-number v-model:value="form.longitude" :precision="6" style="width:100%" placeholder="Contoh: 107.609810" />
          </n-form-item>
        </template>

        <!-- Section: Paket & Tagihan -->
        <template v-if="editSection === 'tagihan'">
          <n-form-item label="Paket Internet">
            <n-select v-model:value="form.package_id" :options="packageOptions" clearable filterable placeholder="Pilih paket" />
          </n-form-item>

          <n-divider title-placement="left" style="font-size: 13px">Pengaturan Tagihan</n-divider>

          <n-alert type="info" :bordered="false" style="margin-bottom: 16px; font-size: 12px">
            Jadwal tagihan mengikuti pengaturan di <strong>Administrasi → Tenant → Konfigurasi Billing</strong>
          </n-alert>

          <n-divider title-placement="left" style="font-size: 13px">Harga & Biaya</n-divider>

          <n-form-item label="Harga Paket">
            <n-text>{{ packagePrice.toLocaleString('id-ID') }}</n-text>
          </n-form-item>
          <n-form-item label="Harga Custom (opsional)">
            <n-input :value="customPriceDisplay" @input="onCustomPriceInput" @blur="syncCustomPriceDisplay" placeholder="Kosongkan = harga paket" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Diskon">
            <n-input :value="discountDisplay" @input="onDiscountInput" @blur="syncDiscountDisplay" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Biaya Tambahan">
            <n-input :value="additionalFeeDisplay" @input="onAdditionalFeeInput" @blur="syncAdditionalFeeDisplay" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Keterangan Biaya">
            <n-input v-model:value="form.fee_description" placeholder="Instalasi, sewa router, dll" />
          </n-form-item>

          <n-alert type="success" :bordered="false">
            Total tagihan: <n-text strong>{{ totalPrice.toLocaleString('id-ID') }}</n-text> / bulan
          </n-alert>
        </template>

        <!-- Section: Koneksi -->
        <template v-if="editSection === 'koneksi'">
          <n-form-item label="Router">
            <n-select v-model:value="form.router_id" :options="routerOptions" clearable filterable placeholder="Pilih router" />
          </n-form-item>
          <n-form-item label="Tipe Koneksi">
            <n-select v-model:value="form.connection_type" :options="connectionOptions" filterable />
          </n-form-item>

          <template v-if="form.connection_type === 'pppoe'">
            <n-form-item label="PPPoE Username">
              <n-input v-model:value="form.pppoe_username" disabled placeholder="Otomatis" />
            </n-form-item>
            <n-form-item label="PPPoE Password">
              <n-input v-model:value="form.pppoe_password" disabled placeholder="Otomatis" />
            </n-form-item>
          </template>

          <n-form-item v-if="form.connection_type === 'static'" label="IP Address">
            <n-input v-model:value="form.ip_address" placeholder="192.168.1.10" />
          </n-form-item>

          <template v-if="form.connection_type === 'ftth'">
            <n-divider title-placement="left" style="font-size: 13px">Port ODP</n-divider>
            <n-form-item label="ODP">
              <n-select v-model:value="selectedOdpId" :options="odpOptions" clearable filterable placeholder="Pilih ODP" @update:value="onOdpChange" />
            </n-form-item>
            <n-form-item label="Port ODP">
              <n-select v-model:value="form.odp_port_id" :options="odpPortOptions" clearable filterable placeholder="Pilih port" :disabled="!selectedOdpId" />
            </n-form-item>
            <n-divider title-placement="left" style="font-size: 13px">Perangkat ONT</n-divider>
            <n-form-item label="Serial Number">
              <n-input v-model:value="form.serial_number" placeholder="Contoh: ZTEG1234ABCD" />
            </n-form-item>
            <n-form-item label="Vendor ONT">
              <n-input v-model:value="form.ont_vendor" placeholder="ZTE, Huawei, Fiberhome" />
            </n-form-item>
            <n-form-item label="Model ONT">
              <n-input v-model:value="form.ont_model" placeholder="F660, HG8245H, ..." />
            </n-form-item>
          </template>
        </template>
      </n-form>

      <n-divider />
      <div class="form-nav">
        <n-button @click="router.back()">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSubmit">Simpan</n-button>
      </div>
    </template>

    <!-- ===== FULL CREATE / EDIT MODE (wizard) ===== -->
    <template v-else>

    <!-- Steps indicator -->
    <n-steps :current="currentStep" size="small" class="form-steps" :class="{ 'steps-mobile': isMobile }">
      <n-step title="Data Pribadi" />
      <n-step title="Paket & Tagihan" />
      <n-step title="Koneksi" />
    </n-steps>

    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 180" :disabled="loading">

      <!-- ===== STEP 1: Data Pribadi ===== -->
      <div v-show="currentStep === 1">
        <n-form-item label="Kode Pelanggan">
          <n-input v-model:value="form.customer_code" disabled placeholder="Otomatis" />
        </n-form-item>
        <n-form-item label="Nama Lengkap">
          <n-input v-model:value="form.name" placeholder="Nama pelanggan" style="text-transform: uppercase" @input="(v: string) => form.name = v.toUpperCase()" />
        </n-form-item>
        <n-form-item label="NIK KTP">
          <n-input v-model:value="form.nik" placeholder="Nomor Induk Kependudukan" maxlength="16" />
        </n-form-item>
        <n-form-item label="No. Telepon">
          <n-input v-model:value="form.phone" placeholder="08xxxxxxxxxx" />
        </n-form-item>
        <n-form-item label="Email">
          <n-input v-model:value="form.email" placeholder="email@domain.com" />
        </n-form-item>
        <n-form-item label="Alamat">
          <n-input v-model:value="form.address" type="textarea" placeholder="Alamat lengkap" :rows="3" />
        </n-form-item>
        <n-form-item label="Tanggal Daftar">
          <n-date-picker v-model:value="form.join_date_ts" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item label="Catatan">
          <n-input v-model:value="form.notes" type="textarea" placeholder="Catatan internal (opsional)" :rows="2" />
        </n-form-item>
        <n-form-item label="Reseller">
          <n-select v-model:value="form.reseller_id" :options="resellerOptions" clearable filterable placeholder="Tanpa reseller" />
        </n-form-item>
        <n-divider title-placement="left" style="font-size: 13px">Lokasi Modem (untuk Peta Jaringan)</n-divider>
        <n-form-item label="Latitude">
          <n-input-number v-model:value="form.latitude" :precision="6" style="width:100%" placeholder="Contoh: -6.914744" />
        </n-form-item>
        <n-form-item label="Longitude">
          <n-input-number v-model:value="form.longitude" :precision="6" style="width:100%" placeholder="Contoh: 107.609810" />
        </n-form-item>

        <!-- Kode Referral hanya tampil saat buat pelanggan baru -->
        <n-form-item v-if="!isEdit" label="Kode Referral">
          <n-input
            v-model:value="form.referral_code_used"
            placeholder="Masukkan kode referral (opsional)"
            :maxlength="8"
            style="text-transform:uppercase"
            @input="(v: string) => form.referral_code_used = v.toUpperCase()"
          />
        </n-form-item>
      </div>

      <!-- ===== STEP 2: Paket & Tagihan ===== -->
      <div v-show="currentStep === 2">
        <n-form-item label="Paket Internet">
          <n-select v-model:value="form.package_id" :options="packageOptions" clearable filterable placeholder="Pilih paket" />
        </n-form-item>

        <n-alert type="info" :bordered="false" style="margin: 8px 0 16px; font-size: 12px">
          Jadwal tagihan mengikuti pengaturan di <strong>Administrasi → Tenant → Konfigurasi Billing</strong>
        </n-alert>

        <n-divider title-placement="left" style="font-size: 13px">Harga & Biaya</n-divider>

        <n-form-item label="Harga Paket">
          <n-text>{{ packagePrice.toLocaleString('id-ID') }}</n-text>
        </n-form-item>
        <n-form-item label="Harga Custom (opsional)">
          <n-input :value="customPriceDisplay" @input="onCustomPriceInput" @blur="syncCustomPriceDisplay" placeholder="Kosongkan = harga paket" style="width: 100%" />
        </n-form-item>
        <n-form-item label="Diskon">
          <n-input :value="discountDisplay" @input="onDiscountInput" @blur="syncDiscountDisplay" style="width: 100%" />
        </n-form-item>
        <n-form-item label="Biaya Tambahan">
          <n-input :value="additionalFeeDisplay" @input="onAdditionalFeeInput" @blur="syncAdditionalFeeDisplay" style="width: 100%" />
        </n-form-item>
        <n-form-item label="Keterangan Biaya">
          <n-input v-model:value="form.fee_description" placeholder="Instalasi, sewa router, dll" />
        </n-form-item>

        <n-alert type="success" :bordered="false">
          Total tagihan: <n-text strong>{{ totalPrice.toLocaleString('id-ID') }}</n-text> / bulan
        </n-alert>
      </div>

      <div v-show="currentStep === 3">
        <n-form-item label="Router">
          <n-select v-model:value="form.router_id" :options="routerOptions" clearable filterable placeholder="Pilih router" />
        </n-form-item>
        <n-form-item label="Tipe Koneksi">
          <n-select v-model:value="form.connection_type" :options="connectionOptions" filterable />
        </n-form-item>

        <template v-if="form.connection_type === 'pppoe'">
          <n-form-item label="PPPoE Username">
            <n-input
              v-model:value="form.pppoe_username"
              :disabled="isEdit"
              :placeholder="isEdit ? 'Otomatis' : 'Kosongkan untuk generate otomatis'"
              :maxlength="50"
            />
          </n-form-item>
          <n-form-item label="PPPoE Password">
            <n-input
              v-model:value="form.pppoe_password"
              :disabled="isEdit"
              :placeholder="isEdit ? 'Otomatis' : 'Kosongkan untuk generate otomatis'"
              :maxlength="50"
            />
          </n-form-item>
          <n-alert v-if="!isEdit" type="info" :bordered="false" style="margin-bottom: 16px; font-size: 12px">
            Username &amp; password PPPoE boleh diisi manual. Jika dikosongkan, sistem akan membuatnya otomatis.
          </n-alert>
        </template>

        <n-form-item v-if="form.connection_type === 'static'" label="IP Address">
          <n-input v-model:value="form.ip_address" placeholder="192.168.1.10" />
        </n-form-item>

        <template v-if="form.connection_type === 'ftth'">
          <n-divider title-placement="left" style="font-size: 13px">Port ODP</n-divider>
          <n-form-item label="ODP">
            <n-select v-model:value="selectedOdpId" :options="odpOptions" clearable filterable placeholder="Pilih ODP" @update:value="onOdpChange" />
          </n-form-item>
          <n-form-item label="Port ODP">
            <n-select v-model:value="form.odp_port_id" :options="odpPortOptions" clearable filterable placeholder="Pilih port" :disabled="!selectedOdpId" />
          </n-form-item>
          <n-divider title-placement="left" style="font-size: 13px">Perangkat ONT</n-divider>
          <n-form-item label="Serial Number">
            <n-input v-model:value="form.serial_number" placeholder="Contoh: ZTEG1234ABCD" />
          </n-form-item>
          <n-form-item label="Vendor ONT">
            <n-input v-model:value="form.ont_vendor" placeholder="ZTE, Huawei, Fiberhome" />
          </n-form-item>
          <n-form-item label="Model ONT">
            <n-input v-model:value="form.ont_model" placeholder="F660, HG8245H, ..." />
          </n-form-item>
        </template>

        <!-- Summary -->
        <n-divider title-placement="left" style="font-size: 13px">Ringkasan</n-divider>
        <n-alert type="default" :bordered="false" style="margin-bottom: 12px">
          <div class="summary-grid">
            <n-text depth="3">Kode Pelanggan</n-text><n-text strong>{{ form.customer_code || '(otomatis)' }}</n-text>
            <n-text depth="3">Nama</n-text><n-text strong>{{ form.name || '-' }}</n-text>
            <n-text depth="3">Paket</n-text><n-text strong>{{ selectedPackage?.name || '-' }}</n-text>
            <n-text depth="3">Total / Bulan</n-text><n-text strong>{{ totalPrice.toLocaleString('id-ID') }}</n-text>
            <n-text depth="3">Tipe Koneksi</n-text><n-text strong>{{ form.connection_type.toUpperCase() }}</n-text>
            <template v-if="form.connection_type === 'pppoe'">
              <n-text depth="3">Username</n-text><n-text strong>{{ form.pppoe_username || '(otomatis)' }}</n-text>
              <n-text depth="3">Password</n-text><n-text strong>{{ form.pppoe_password || '(otomatis)' }}</n-text>
            </template>
            <template v-if="form.connection_type === 'ftth' && form.serial_number">
              <n-text depth="3">Serial Number ONT</n-text><n-text strong>{{ form.serial_number }}</n-text>
              <n-text v-if="form.ont_vendor" depth="3">Vendor / Model</n-text>
              <n-text v-if="form.ont_vendor" strong>{{ [form.ont_vendor, form.ont_model].filter(Boolean).join(' ') }}</n-text>
            </template>
          </div>
        </n-alert>
      </div>
    </n-form>

    <!-- Navigation buttons -->
    <n-divider />
    <div class="form-nav">
      <n-button @click="currentStep > 1 ? prevStep() : router.back()">
        {{ currentStep > 1 ? '← Sebelumnya' : 'Batal' }}
      </n-button>
      <n-button v-if="currentStep < 3" type="primary" @click="nextStep">
        Selanjutnya →
      </n-button>
      <n-button v-if="currentStep === 3" type="primary" :loading="saving" @click="handleSubmit">
        {{ isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan' }}
      </n-button>
    </div>
    </template>
  </n-card>
</template>

<style scoped>
.card-title {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.card-title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(0, 229, 255, 0.08);
  color: #00e5ff;
  flex-shrink: 0;
}

:root:not(.dark) .card-title-icon {
  background: rgba(0, 131, 143, 0.08);
  color: #00838f;
}

.card-title-text {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.3;
}

.card-title-sub {
  margin: 2px 0 0;
  font-size: 13px;
  opacity: 0.5;
}

.form-steps {
  margin-bottom: 24px;
  flex-wrap: wrap;
}

:deep(.n-form) {
  max-width: 100%;
  overflow: hidden;
}

.pppoe-pwd {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.pppoe-pwd .n-input {
  flex: 1;
  min-width: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 6px 12px;
  font-size: 13px;
}

.form-nav {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

@media (max-width: 768px) {
  .form-steps {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .form-steps :deep(.n-steps) {
    min-width: max-content;
  }

  .steps-mobile :deep(.n-step-indicator) {
    transform: scale(0.85);
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 2px 0;
  }

  .form-nav {
    flex-direction: column;
  }

  .form-nav .n-button {
    width: 100%;
  }

  .pppoe-pwd {
    flex-direction: column;
    align-items: stretch;
  }
}

</style>
