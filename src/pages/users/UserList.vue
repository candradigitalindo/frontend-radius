<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm, NSpin,
  NModal, NForm, NFormItem, NSelect, NSwitch, NDrawer, NDrawerContent,
  NIcon, useMessage
} from 'naive-ui'
import { Search, Plus, Phone, Clock, Users as UsersIcon, Calendar, User, Shield, Terminal as TerminalIcon, Edit, PhoneCall } from '@vicons/tabler'
import { userApi, roleApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const message = useMessage()
const authStore = useAuthStore()
const loading = ref(false)
const roles = ref<any[]>([])
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const isMobile = ref(window.innerWidth < 768)
const isTablet = ref(window.innerWidth >= 768 && window.innerWidth < 1024)
const isDesktop = computed(() => !isMobile.value && !isTablet.value)

function onResize() {
  isMobile.value = window.innerWidth < 768
  isTablet.value = window.innerWidth >= 768 && window.innerWidth < 1024
  // Close detail on desktop
  if (isDesktop.value) showDetail.value = false
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// Detail drawer
const showDetail = ref(false)
const detailUser = ref<any>(null)

function openDetail(row: any) {
  detailUser.value = row
  showDetail.value = true
}

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'admin',
  phone: '',
  is_active: true,
})

const roleOptions = computed(() => roles.value.map(r => ({ label: r.name, value: r.slug })))

const systemRoleColors: Record<string, string> = {
  owner: '#22c55e',
  admin: '#00e5ff',
  technician: '#f59e0b',
}

function roleLabel(slug: string): string {
  const r = roles.value.find(r => r.slug === slug)
  return r ? r.name : slug
}

function roleColor(slug: string): string {
  return systemRoleColors[slug] || '#8b5cf6'
}

function resetForm() {
  form.value = { name: '', email: '', password: '', role: 'admin', phone: '', is_active: true }
  editId.value = null
}

const filteredData = computed(() => {
  if (!search.value) return data.value
  const q = search.value.toLowerCase()
  return data.value.filter((u: any) =>
    u.name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q) ||
    (u.phone || '').toLowerCase().includes(q)
  )
})

const columns = [
  {
    title: 'Pengguna', key: 'name', minWidth: 200,
    render: (r: any) => h('div', { style: 'display:flex;align-items:center;gap:10px;cursor:pointer', onClick: () => openDetail(r) }, [
      h('div', {
        style: `width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;background:${roleColor(r.role)}20;color:${roleColor(r.role)}`
      }, r.name?.charAt(0)?.toUpperCase() || 'U'),
      h('div', { style: 'min-width:0' }, [
        h('div', { style: 'display:flex;align-items:center;gap:6px' }, [
          h('span', { style: 'font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, r.name),
          r.id === authStore.user?.id ? h('span', { style: 'font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(0,229,255,0.12);color:#00e5ff;font-weight:700;text-transform:uppercase;flex-shrink:0;letter-spacing:0.3px' }, 'Anda') : null,
        ]),
        h('div', { style: 'font-size:12px;opacity:0.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, r.email),
      ]),
    ])
  },
  {
    title: 'Role', key: 'role', width: 120,
    render: (r: any) => h(NTag, {
      size: 'small', round: true, bordered: false,
      style: {
        background: `${roleColor(r.role)}15`,
        color: roleColor(r.role),
        border: `1px solid ${roleColor(r.role)}30`,
      }
    }, () => roleLabel(r.role))
  },
  { title: 'Telepon', key: 'phone', width: 150, render: (r: any) => r.phone || '-' },
  {
    title: 'Status', key: 'is_active', width: 100,
    render: (r: any) => h(NTag, { type: r.is_active ? 'success' : 'default', size: 'small' }, () => r.is_active ? 'Aktif' : 'Nonaktif')
  },
  {
    title: 'Login Terakhir', key: 'last_login_at', width: 165,
    render: (r: any) => h('span', { style: `font-size:12px;opacity:${r.last_login_at ? '0.65' : '0.35'}` }, fmtDateTime(r.last_login_at))
  },
  {
    title: 'Bergabung', key: 'created_at', width: 125,
    render: (r: any) => h('span', { style: 'font-size:12px;opacity:0.5' }, fmtDate(r.created_at))
  },
  {
    title: 'Aksi', key: 'actions', width: 110, fixed: 'right' as const,
    render: (r: any) => {
      const isSelf = r.id === authStore.user?.id
      return h(NSpace, { size: 4 }, () => [
        h(NButton, { size: 'tiny', type: 'info', title: 'Edit', onClick: () => { openEdit(r) }, renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
        h(NButton, {
          size: 'tiny',
          type: r.is_active ? 'warning' : 'success',
          disabled: isSelf,
          title: r.is_active ? 'Nonaktifkan' : 'Aktifkan',
          onClick: () => handleToggle(r.id),
          renderIcon: () => h('span', { innerHTML: r.is_active ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' }),
        }),
        h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, {
          trigger: () => h(NButton, { size: 'tiny', type: 'error', disabled: isSelf, title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }),
          default: () => 'Yakin hapus pengguna ini?',
        }),
      ])
    }
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = {
    name: r.name,
    email: r.email,
    password: '',
    role: r.role,
    phone: r.phone || '',
    is_active: r.is_active,
  }
  showDetail.value = false
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.email || !form.value.role) {
    message.warning('Nama, email, dan role wajib diisi')
    return
  }
  if (!editId.value && !form.value.password) {
    message.warning('Password wajib diisi untuk pengguna baru')
    return
  }
  if (form.value.password && form.value.password.length < 8) {
    message.warning('Password minimal 8 karakter')
    return
  }

  saving.value = true
  try {
    const payload: Record<string, any> = {
      name: form.value.name,
      email: form.value.email,
      role: form.value.role,
      phone: form.value.phone,
      is_active: form.value.is_active,
    }
    if (form.value.password) payload.password = form.value.password

    if (editId.value) {
      await userApi.update(editId.value, payload)
      message.success('Pengguna diperbarui')
    } else {
      await userApi.create(payload)
      message.success('Pengguna ditambahkan')
    }
    showModal.value = false
    resetForm()
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyimpan')
  }
  saving.value = false
}

async function handleDelete(id: string) {
  try {
    await userApi.delete(id)
    message.success('Pengguna dihapus')
    if (detailUser.value?.id === id) showDetail.value = false
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menghapus')
  }
}

async function handleToggle(id: string) {
  try {
    const { data: res } = await userApi.toggleActive(id)
    message.success('Status diperbarui')
    // Update detail if open
    if (detailUser.value?.id === id && res.data) {
      detailUser.value = { ...detailUser.value, ...res.data }
    }
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal mengubah status')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await userApi.list()
    data.value = res.data || []
  } catch {
    message.error('Gagal memuat data')
  }
  loading.value = false
}

onMounted(async () => {
  try {
    const { data: res } = await roleApi.list()
    roles.value = res.data || []
  } catch {
    message.warning('Gagal memuat daftar role')
  }
  fetchData()
})

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return 'Belum pernah'
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtRelative(d: string | null): string {
  if (!d) return 'Belum pernah'
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Baru saja'
  if (min < 60) return `${min}m lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}j lalu`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}h lalu`
  return fmtDate(d)
}

function isRecentlyOnline(d: string | null): boolean {
  if (!d) return false
  return Date.now() - new Date(d).getTime() < 15 * 60 * 1000
}
</script>

<template>
  <div class="usr-page">

    <!-- ── Header ─────────────────────────────────── -->
    <div class="page-header">
      <div class="title-group">
        <h2 class="page-title">Pengguna</h2>
        <span v-if="data.length" class="count-badge">{{ data.length }}</span>
      </div>
      <div class="header-right">
        <n-input v-model:value="search" placeholder="Cari pengguna..." clearable class="search-box">
          <template #prefix>
            <n-icon :component="Search" :size="15" style="opacity:0.4" />
          </template>
        </n-input>
        <n-button type="primary" @click="resetForm(); showModal = true">
          <template #icon><n-icon :component="Plus" /></template>
          <span class="btn-text">Tambah</span>
        </n-button>
      </div>
    </div>

    <!-- ── Stats ──────────────────────────────────── -->
    <div class="stats-row">
      <div class="stat-chip">
        <div class="stat-icon neutral"><n-icon :component="UsersIcon" :size="15" /></div>
        <div class="stat-body">
          <span class="stat-num">{{ data.length }}</span>
          <span class="stat-lbl">Total</span>
        </div>
      </div>
      <div class="stat-chip">
        <div class="stat-icon green"><n-icon :component="Shield" :size="15" /></div>
        <div class="stat-body">
          <span class="stat-num green">{{ data.filter(u => u.is_active).length }}</span>
          <span class="stat-lbl">Aktif</span>
        </div>
      </div>
      <div class="stat-chip">
        <div class="stat-icon muted"><n-icon :component="User" :size="15" /></div>
        <div class="stat-body">
          <span class="stat-num muted">{{ data.filter(u => !u.is_active).length }}</span>
          <span class="stat-lbl">Nonaktif</span>
        </div>
      </div>
      <div v-for="role in roles" :key="role.slug" class="stat-chip">
        <div class="stat-icon" :style="{ background: `${roleColor(role.slug)}15`, color: roleColor(role.slug) }">
          <n-icon :component="Shield" :size="15" />
        </div>
        <div class="stat-body">
          <span class="stat-num" :style="{ color: roleColor(role.slug) }">{{ data.filter(u => u.role === role.slug).length }}</span>
          <span class="stat-lbl">{{ role.name }}</span>
        </div>
      </div>
    </div>

    <!-- ── Desktop Table ──────────────────────────── -->
    <n-card v-if="isDesktop" class="tbl-card" :bordered="false">
      <n-data-table
        :columns="columns"
        :data="filteredData"
        :loading="loading"
        :bordered="false"
        :scroll-x="1100"
        size="small"
      />
    </n-card>

    <!-- ── Mobile / Tablet ────────────────────────── -->
    <template v-else>
      <div v-if="loading" class="grid-loading">
        <n-spin :show="true" />
        <span>Memuat...</span>
      </div>
      <div v-else-if="!filteredData.length" class="grid-empty">
        <n-icon :component="UsersIcon" :size="44" />
        <span>{{ search ? 'Tidak ada hasil' : 'Belum ada pengguna' }}</span>
      </div>
      <div v-else class="usr-grid">
        <div
          v-for="row in filteredData"
          :key="row.id"
          class="usr-card"
          @click="openDetail(row)"
        >
          <!-- Top: avatar + name + status -->
          <div class="uc-top">
            <div class="uc-avatar-wrap">
              <div
                class="uc-avatar"
                :style="{ background: `${roleColor(row.role)}18`, color: roleColor(row.role) }"
              >{{ row.name?.charAt(0)?.toUpperCase() || 'U' }}</div>
              <span v-if="isRecentlyOnline(row.last_login_at)" class="online-dot" title="Online baru-baru ini" />
            </div>
            <div class="uc-info">
              <div class="uc-name-row">
                <span class="uc-name">{{ row.name }}</span>
                <span v-if="row.id === authStore.user?.id" class="you-tag">Anda</span>
              </div>
              <div class="uc-email">{{ row.email }}</div>
            </div>
            <span class="uc-status" :class="row.is_active ? 'active' : 'inactive'">
              {{ row.is_active ? 'Aktif' : 'Off' }}
            </span>
          </div>

          <!-- Meta: role + phone + last login -->
          <div class="uc-meta">
            <span
              class="uc-role"
              :style="{ background: `${roleColor(row.role)}12`, color: roleColor(row.role) }"
            >{{ roleLabel(row.role) }}</span>
            <span v-if="row.phone" class="uc-meta-item">
              <n-icon :component="Phone" :size="11" />
              {{ row.phone }}
            </span>
            <span class="uc-meta-item">
              <n-icon :component="Clock" :size="11" />
              {{ fmtRelative(row.last_login_at) }}
            </span>
          </div>
        </div>
      </div>
    </template>

  </div>

  <!-- ── Detail Drawer ──────────────────────────── -->
  <n-drawer v-model:show="showDetail" :width="isMobile ? '100%' : 400" placement="right">
    <n-drawer-content title="Detail Pengguna" :native-scrollbar="false" closable>
      <div v-if="detailUser" class="drawer-body">

        <!-- Profile block -->
        <div class="d-profile">
          <div class="d-avatar-wrap">
            <div
              class="d-avatar"
              :style="{ background: `${roleColor(detailUser.role)}15`, color: roleColor(detailUser.role) }"
            >{{ detailUser.name?.charAt(0)?.toUpperCase() || 'U' }}</div>
            <span v-if="isRecentlyOnline(detailUser.last_login_at)" class="d-online">Online</span>
          </div>
          <div class="d-name">{{ detailUser.name }}</div>
          <div class="d-email">{{ detailUser.email }}</div>
          <div class="d-tag-row">
            <span
              class="uc-role"
              :style="{ background: `${roleColor(detailUser.role)}15`, color: roleColor(detailUser.role) }"
            >{{ roleLabel(detailUser.role) }}</span>
            <span class="uc-status" :class="detailUser.is_active ? 'active' : 'inactive'">
              {{ detailUser.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
            <span v-if="detailUser.id === authStore.user?.id" class="you-tag">Anda</span>
          </div>
        </div>

        <!-- Info list -->
        <div class="d-info-list">
          <div class="d-row">
            <span class="d-key"><n-icon :component="PhoneCall" :size="14" />Telepon</span>
            <span class="d-val">{{ detailUser.phone || '-' }}</span>
          </div>
          <div class="d-row">
            <span class="d-key"><n-icon :component="Clock" :size="14" />Login Terakhir</span>
            <span class="d-val">{{ fmtDateTime(detailUser.last_login_at) }}</span>
          </div>
          <div class="d-row">
            <span class="d-key"><n-icon :component="Calendar" :size="14" />Bergabung</span>
            <span class="d-val">{{ fmtDate(detailUser.created_at) }}</span>
          </div>
          <div class="d-row">
            <span class="d-key"><n-icon :component="TerminalIcon" :size="14" />ID</span>
            <span class="d-val mono">{{ detailUser.id }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="d-actions">
          <n-button type="primary" block @click="openEdit(detailUser)">
            <template #icon><n-icon :component="Edit" /></template>
            Edit Pengguna
          </n-button>
          <n-button
            :type="detailUser.is_active ? 'warning' : 'success'"
            block ghost
            :disabled="detailUser.id === authStore.user?.id"
            @click="handleToggle(detailUser.id)"
          >
            {{ detailUser.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
          </n-button>
          <n-popconfirm @positive-click="handleDelete(detailUser.id)">
            <template #trigger>
              <n-button type="error" block ghost :disabled="detailUser.id === authStore.user?.id">
                Hapus Pengguna
              </n-button>
            </template>
            Yakin hapus pengguna ini?
          </n-popconfirm>
          <p v-if="detailUser.id === authStore.user?.id" class="self-note">
            Ini adalah akun Anda. Tidak dapat dinonaktifkan atau dihapus.
          </p>
        </div>

      </div>
    </n-drawer-content>
  </n-drawer>

  <!-- ── Modal Create/Edit ──────────────────────── -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="editId ? 'Edit Pengguna' : 'Tambah Pengguna'"
    :style="{ maxWidth: '480px', width: '90vw' }"
  >
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 120">
      <n-form-item label="Nama"><n-input v-model:value="form.name" placeholder="Nama lengkap" /></n-form-item>
      <n-form-item label="Email"><n-input v-model:value="form.email" placeholder="email@contoh.com" /></n-form-item>
      <n-form-item :label="editId ? 'Password Baru' : 'Password'">
        <n-input
          v-model:value="form.password"
          type="password"
          show-password-on="click"
          :placeholder="editId ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'"
        />
      </n-form-item>
      <n-form-item label="Role"><n-select v-model:value="form.role" :options="roleOptions" /></n-form-item>
      <n-form-item label="Telepon"><n-input v-model:value="form.phone" placeholder="08xxxxxxxxxx" /></n-form-item>
      <n-form-item v-if="editId" label="Aktif"><n-switch v-model:value="form.is_active" /></n-form-item>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────── */
.usr-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Header ────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(128,128,128,0.12);
  opacity: 0.7;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.search-box {
  width: 220px;
}

/* ── Stats ─────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.stats-row::-webkit-scrollbar { display: none; }

.stat-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(128,128,128,0.1);
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.15s;
}
:root.dark .stat-chip { border-color: rgba(255,255,255,0.07); }

.stat-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon.neutral { background: rgba(100,116,139,0.12); color: #94a3b8; }
.stat-icon.green   { background: rgba(34,197,94,0.12);   color: #22c55e; }
.stat-icon.muted   { background: rgba(107,114,128,0.1);  color: #6b7280; }

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-num {
  font-size: 17px;
  font-weight: 800;
  line-height: 1.1;
}
.stat-num.green { color: #22c55e; }
.stat-num.muted { color: #6b7280; }

.stat-lbl {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  opacity: 0.45;
}

/* ── Table card ─────────────────────────────────── */
.tbl-card {
  border-radius: 12px !important;
  border: 1px solid rgba(128,128,128,0.1) !important;
}
:root.dark .tbl-card { border-color: rgba(255,255,255,0.07) !important; }

/* ── Mobile/Tablet grid ─────────────────────────── */
.usr-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.grid-loading,
.grid-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 0;
  opacity: 0.4;
  font-size: 14px;
}

/* ── User Card ──────────────────────────────────── */
.usr-card {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(128,128,128,0.1);
  cursor: pointer;
  transition: border-color 0.15s;
}
.usr-card:hover { border-color: rgba(128,128,128,0.28); }

:root.dark .usr-card { border-color: rgba(255,255,255,0.07); }
:root.dark .usr-card:hover { border-color: rgba(255,255,255,0.18); }

.uc-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.uc-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.uc-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid transparent;
  box-shadow: 0 0 0 1.5px rgba(34,197,94,0.35);
}

.uc-info {
  flex: 1;
  min-width: 0;
}

.uc-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 2px;
}

.uc-name {
  font-weight: 700;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uc-email {
  font-size: 12px;
  opacity: 0.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uc-status {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
}
.uc-status.active   { background: rgba(34,197,94,0.12);  color: #22c55e; }
.uc-status.inactive { background: rgba(107,114,128,0.1); color: #6b7280; }

.uc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 9px;
  border-top: 1px solid rgba(128,128,128,0.07);
  flex-wrap: wrap;
}
:root.dark .uc-meta { border-top-color: rgba(255,255,255,0.05); }

.uc-role {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
  white-space: nowrap;
}

.uc-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  opacity: 0.5;
  white-space: nowrap;
}

/* ── Badges ─────────────────────────────────────── */
.you-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0,229,255,0.12);
  color: #00e5ff;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* ── Detail Drawer ──────────────────────────────── */
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.d-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}
:root.dark .d-profile { border-bottom-color: rgba(255,255,255,0.06); }

.d-avatar-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 2px;
}

.d-avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 22px;
}

.d-online {
  position: absolute;
  bottom: 2px;
  right: -4px;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 6px;
  background: #22c55e;
  color: #fff;
  letter-spacing: 0.3px;
}

.d-name  { font-size: 17px; font-weight: 700; }
.d-email { font-size: 13px; opacity: 0.45; }

.d-tag-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.d-info-list {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid rgba(128,128,128,0.09);
  overflow: hidden;
}
:root.dark .d-info-list { border-color: rgba(255,255,255,0.06); }

.d-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(128,128,128,0.06);
}
:root.dark .d-row { border-bottom-color: rgba(255,255,255,0.04); }
.d-row:last-child { border-bottom: none; }

.d-key {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  opacity: 0.5;
}

.d-val {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.mono {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  opacity: 0.4;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.self-note {
  font-size: 11px;
  text-align: center;
  opacity: 0.4;
  margin: 0;
  padding: 2px 0;
}

/* ── Responsive ─────────────────────────────────── */
@media (min-width: 640px) and (max-width: 1023px) {
  .usr-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1023px) {
  .page-header {
    flex-wrap: wrap;
  }
  .header-right {
    flex: 1;
    width: 100%;
    order: 3;
  }
  .title-group {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .page-title { font-size: 18px; }
  .btn-text   { display: none; }
  .search-box { width: 100%; flex: 1; }
}
</style>

