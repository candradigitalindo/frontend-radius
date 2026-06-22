<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  NButton, NInput, NPopconfirm, NSpin,
  NModal, NForm, NFormItem, NCheckbox, NCheckboxGroup, NCollapse, NCollapseItem,
  NDrawer, NDrawerContent, NIcon, useMessage
} from 'naive-ui'
import { Search, Plus, Shield, Check, X as XIcon, Edit, Trash } from '@vicons/tabler'
import { roleApi } from '../../api'

const message = useMessage()
const loading = ref(false)
const roles = ref<any[]>([])
const permGroups = ref<any[]>([])
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const isMobile = ref(window.innerWidth < 768)
const showDetail = ref(false)
const detailRole = ref<any>(null)

function onResize() { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const form = ref({
  name: '',
  slug: '',
  description: '',
  permissions: [] as string[],
})

function resetForm() {
  form.value = { name: '', slug: '', description: '', permissions: [] }
  editId.value = null
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

function onNameInput(val: string) {
  if (!editId.value) {
    form.value.slug = generateSlug(val)
  }
}

const search = ref('')
const filteredRoles = computed(() => {
  if (!search.value) return roles.value
  const q = search.value.toLowerCase()
  return roles.value.filter((r: any) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))
})

function openEdit(r: any) {
  editId.value = r.id
  form.value = {
    name: r.name,
    slug: r.slug,
    description: r.description || '',
    permissions: [...(r.permissions || [])],
  }
  showDetail.value = false
  showModal.value = true
}

function openDetail(r: any) {
  detailRole.value = r
  showDetail.value = true
}

function countPermsNum(r: any): number {
  return r.permissions?.length || 0
}

function countPerms(r: any): string {
  const total = permGroups.value.reduce((s: number, g: any) => s + g.permissions.length, 0)
  const has = r.permissions?.length || 0
  return `${has}/${total}`
}

function permPercent(r: any): number {
  const total = permGroups.value.reduce((s: number, g: any) => s + g.permissions.length, 0)
  if (!total) return 0
  return Math.round(((r.permissions?.length || 0) / total) * 100)
}

function groupPermNum(role: any, group: any): number {
  const keys = group.permissions.map((p: any) => p.key)
  return keys.filter((k: string) => role.permissions?.includes(k)).length
}

function groupPermCount(role: any, group: any): string {
  return `${groupPermNum(role, group)}/${group.permissions.length}`
}

function groupPermPercent(role: any, group: any): number {
  if (!group.permissions.length) return 0
  return Math.round((groupPermNum(role, group) / group.permissions.length) * 100)
}

async function handleSave() {
  if (!form.value.name || !form.value.slug) {
    message.warning('Nama dan slug wajib diisi')
    return
  }
  saving.value = true
  try {
    if (editId.value) {
      await roleApi.update(editId.value, {
        name: form.value.name,
        description: form.value.description,
        permissions: form.value.permissions,
      })
      message.success('Role diperbarui')
    } else {
      await roleApi.create({
        name: form.value.name,
        slug: form.value.slug,
        description: form.value.description,
        permissions: form.value.permissions,
      })
      message.success('Role ditambahkan')
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
    await roleApi.delete(id)
    message.success('Role dihapus')
    if (detailRole.value?.id === id) showDetail.value = false
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menghapus')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [rolesRes, permsRes] = await Promise.all([roleApi.list(), roleApi.permissions()])
    roles.value = rolesRes.data?.data || []
    permGroups.value = permsRes.data?.data || []
  } catch {
    message.error('Gagal memuat data')
  }
  loading.value = false
}

onMounted(fetchData)

function toggleGroupAll(groupPerms: any[]) {
  const keys = groupPerms.map((p: any) => p.key)
  const allSelected = keys.every(k => form.value.permissions.includes(k))
  if (allSelected) {
    form.value.permissions = form.value.permissions.filter(p => !keys.includes(p))
  } else {
    const set = new Set(form.value.permissions)
    keys.forEach(k => set.add(k))
    form.value.permissions = [...set]
  }
}

function isGroupAllSelected(groupPerms: any[]): boolean {
  return groupPerms.every((p: any) => form.value.permissions.includes(p.key))
}

function isGroupPartial(groupPerms: any[]): boolean {
  const some = groupPerms.some((p: any) => form.value.permissions.includes(p.key))
  return some && !isGroupAllSelected(groupPerms)
}

const roleColors: Record<string, string> = {
  owner: '#22c55e',
  admin: '#00e5ff',
  technician: '#f59e0b',
}

function roleColor(slug: string): string {
  return roleColors[slug] || '#8b5cf6'
}

const sectionLabels: Record<string, string> = {
  dashboard:    'Dashboard',
  pelanggan:    'Pelanggan',
  keuangan:     'Keuangan',
  jaringan:     'Jaringan',
  layanan:      'Layanan',
  marketing:    'Marketing',
  administrasi: 'Administrasi',
}

const sectionColors: Record<string, string> = {
  dashboard:    '#64748b',
  pelanggan:    '#3b82f6',
  keuangan:     '#22c55e',
  jaringan:     '#f59e0b',
  layanan:      '#8b5cf6',
  marketing:    '#ec4899',
  administrasi: '#ef4444',
}

interface PermSection { key: string; label: string; color: string; groups: any[] }

const permSections = computed((): PermSection[] => {
  const order = ['dashboard', 'pelanggan', 'keuangan', 'jaringan', 'layanan', 'marketing', 'administrasi']
  const map = new Map<string, PermSection>()
  for (const g of permGroups.value) {
    const sk = g.section || 'lainnya'
    if (!map.has(sk)) {
      map.set(sk, { key: sk, label: sectionLabels[sk] || sk, color: sectionColors[sk] || '#94a3b8', groups: [] })
    }
    map.get(sk)!.groups.push(g)
  }
  const result: PermSection[] = []
  for (const k of order) {
    if (map.has(k)) result.push(map.get(k)!)
  }
  for (const [k, v] of map) {
    if (!order.includes(k)) result.push(v)
  }
  return result
})
</script>

<template>
  <div class="role-page">

    <!-- ── Header ─────────────────────────────────── -->
    <div class="page-header">
      <div class="title-group">
        <h2 class="page-title">Role & Permission</h2>
        <span v-if="roles.length" class="count-badge">{{ roles.length }}</span>
      </div>
      <div class="header-right">
        <n-input v-model:value="search" placeholder="Cari role..." clearable class="search-box">
          <template #prefix>
            <n-icon :component="Search" :size="15" style="opacity:0.4" />
          </template>
        </n-input>
        <n-button type="primary" @click="resetForm(); showModal = true">
          <template #icon><n-icon :component="Plus" /></template>
          <span class="btn-text">Tambah Role</span>
        </n-button>
      </div>
    </div>

    <!-- ── Stats ──────────────────────────────────── -->
    <div class="stats-row" v-if="roles.length">
      <div class="stat-chip">
        <div class="stat-icon neutral"><n-icon :component="Shield" :size="14" /></div>
        <div class="stat-body">
          <span class="stat-num">{{ roles.length }}</span>
          <span class="stat-lbl">Total Role</span>
        </div>
      </div>
      <div class="stat-chip">
        <div class="stat-icon blue"><n-icon :component="Shield" :size="14" /></div>
        <div class="stat-body">
          <span class="stat-num blue">{{ roles.filter(r => r.is_system).length }}</span>
          <span class="stat-lbl">Bawaan</span>
        </div>
      </div>
      <div class="stat-chip">
        <div class="stat-icon purple"><n-icon :component="Shield" :size="14" /></div>
        <div class="stat-body">
          <span class="stat-num purple">{{ roles.filter(r => !r.is_system).length }}</span>
          <span class="stat-lbl">Custom</span>
        </div>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────── -->
    <div v-if="loading" class="page-empty">
      <n-spin :show="true" />
      <span>Memuat...</span>
    </div>

    <!-- ── Empty ──────────────────────────────────── -->
    <div v-else-if="!filteredRoles.length" class="page-empty">
      <n-icon :component="Shield" :size="44" style="opacity:0.2" />
      <span>{{ search ? 'Tidak ada hasil' : 'Belum ada role' }}</span>
    </div>

    <!-- ── Role Table ──────────────────────────────── -->
    <div v-else class="role-table-wrap">
      <table class="role-table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Tipe</th>
            <th class="col-desc">Deskripsi</th>
            <th class="col-perm-count">Permission</th>
            <th class="col-action">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in filteredRoles" :key="role.id">
            <td class="col-name">
              <div class="name-badge" :style="{ borderLeftColor: roleColor(role.slug) }">
                <div class="name-icon" :style="{ background: `${roleColor(role.slug)}15`, color: roleColor(role.slug) }">
                  <n-icon :component="Shield" :size="14" />
                </div>
                <div class="name-text">
                  <div class="name-main">{{ role.name }}</div>
                  <div class="name-slug">{{ role.slug }}</div>
                </div>
              </div>
            </td>
            <td class="col-type">
              <span class="rc-type" :class="role.is_system ? 'system' : 'custom'">
                {{ role.is_system ? 'Bawaan' : 'Custom' }}
              </span>
            </td>
            <td class="col-desc">
              <span class="desc-text">{{ role.description || '—' }}</span>
            </td>
            <td class="col-perm-count">
              <div class="perm-count-box">
                <span class="perm-number">{{ countPermsNum(role) }}</span>
                <span class="perm-slash">/</span>
                <span class="perm-total">{{ permGroups.reduce((s, g) => s + g.permissions.length, 0) }}</span>
              </div>
            </td>
            <td class="col-action">
              <div class="action-btns">
                <n-button
                  v-if="role.slug !== 'owner'"
                  circle
                  quaternary
                  size="small"
                  type="primary"
                  title="Edit role"
                  @click="openEdit(role)"
                >
                  <template #icon><n-icon :component="Edit" :size="15" /></template>
                </n-button>
                <n-popconfirm v-if="!role.is_system" @positive-click="handleDelete(role.id)">
                  <template #trigger>
                    <n-button circle quaternary size="small" type="error" title="Hapus role">
                      <template #icon><n-icon :component="Trash" :size="15" /></template>
                    </n-button>
                  </template>
                  Yakin hapus role ini?
                </n-popconfirm>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── Detail Drawer ──────────────────────────── -->
  <n-drawer v-model:show="showDetail" :width="isMobile ? '100%' : 500" placement="right">
    <n-drawer-content title="Detail Role" :native-scrollbar="false" closable>
      <div v-if="detailRole" class="drawer-body">

        <!-- Profile -->
        <div class="d-profile">
          <div class="d-icon" :style="{ background: `${roleColor(detailRole.slug)}15`, color: roleColor(detailRole.slug) }">
            <n-icon :component="Shield" :size="26" />
          </div>
          <div class="d-name">{{ detailRole.name }}</div>
          <div class="d-slug">{{ detailRole.slug }}</div>
          <div class="d-tag-row">
            <span class="rc-type" :class="detailRole.is_system ? 'system' : 'custom'">
              {{ detailRole.is_system ? 'Bawaan' : 'Custom' }}
            </span>
            <span class="d-perm-badge">{{ countPerms(detailRole) }} permission</span>
          </div>
        </div>

        <!-- Description -->
        <div v-if="detailRole.description" class="d-desc">{{ detailRole.description }}</div>

        <!-- Overall progress -->
        <div class="d-overall">
          <div class="d-overall-row">
            <span class="d-overall-label">Total Permission</span>
            <span class="d-overall-pct">{{ permPercent(detailRole) }}%</span>
          </div>
          <div class="d-prog-bg">
            <div class="d-prog-fill" :style="{ width: `${permPercent(detailRole)}%`, background: roleColor(detailRole.slug) }" />
          </div>
        </div>

        <!-- Per-group permission list grouped by section -->
        <div class="d-groups">
          <template v-for="section in permSections" :key="section.key">
            <div class="d-section-head" :style="{ borderLeftColor: section.color }">
              <span class="d-section-dot" :style="{ background: section.color }" />
              <span class="d-section-label">{{ section.label }}</span>
            </div>
            <div v-for="group in section.groups" :key="group.key" class="d-group">
              <div class="d-group-head">
                <span class="d-group-name">{{ group.label }}</span>
                <div class="d-group-meta">
                  <span class="d-group-count">{{ groupPermCount(detailRole, group) }}</span>
                  <div class="d-mini-prog">
                    <div
                      class="d-mini-fill"
                      :style="{ width: `${groupPermPercent(detailRole, group)}%`, background: section.color }"
                    />
                  </div>
                </div>
              </div>
              <div class="d-perm-chips">
                <span
                  v-for="p in group.permissions"
                  :key="p.key"
                  class="d-pchip"
                  :class="{ active: detailRole.permissions?.includes(p.key) }"
                  :style="detailRole.permissions?.includes(p.key) ? { background: `${section.color}15`, color: section.color, borderColor: `${section.color}30` } : {}"
                >
                  <n-icon v-if="detailRole.permissions?.includes(p.key)" :component="Check" :size="11" />
                  <n-icon v-else :component="XIcon" :size="11" />
                  {{ p.label }}
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- Actions -->
        <div class="d-actions">
          <n-button v-if="detailRole.slug !== 'owner'" type="primary" block @click="openEdit(detailRole)">
            Edit Permission
          </n-button>
          <n-popconfirm v-if="!detailRole.is_system" @positive-click="handleDelete(detailRole.id)">
            <template #trigger>
              <n-button type="error" block ghost>Hapus Role</n-button>
            </template>
            Yakin hapus role ini?
          </n-popconfirm>
          <p v-if="detailRole.slug === 'owner'" class="self-note">
            Owner selalu memiliki semua permission dan tidak dapat diedit.
          </p>
        </div>
      </div>
    </n-drawer-content>
  </n-drawer>

  <!-- ── Modal Create/Edit ──────────────────────── -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="editId ? 'Edit Role' : 'Tambah Role'"
    :style="{ maxWidth: '640px', width: '95vw' }"
  >
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 120">
      <n-form-item label="Nama">
        <n-input v-model:value="form.name" placeholder="Nama role" @update:value="onNameInput" />
      </n-form-item>
      <n-form-item label="Slug">
        <n-input v-model:value="form.slug" placeholder="slug-role" :disabled="!!editId" />
      </n-form-item>
      <n-form-item label="Deskripsi">
        <n-input v-model:value="form.description" type="textarea" placeholder="Deskripsi singkat" :rows="2" />
      </n-form-item>
      <n-form-item label="Permission" label-placement="top">
        <div class="perm-editor">
          <div v-for="(section, si) in permSections" :key="section.key">
            <div class="perm-section-header" :style="{ borderLeftColor: section.color }">
              <span class="perm-section-dot" :style="{ background: section.color }" />
              <span class="perm-section-label">{{ section.label }}</span>
            </div>
            <n-collapse :default-expanded-names="section.groups.map((g: any) => g.key)">
              <n-collapse-item v-for="group in section.groups" :key="group.key" :name="group.key">
                <template #header>
                  <div class="perm-group-header" @click.stop>
                    <n-checkbox
                      :checked="isGroupAllSelected(group.permissions)"
                      :indeterminate="isGroupPartial(group.permissions)"
                      @update:checked="toggleGroupAll(group.permissions)"
                    />
                    <span class="perm-group-name">{{ group.label }}</span>
                    <span class="perm-group-count">
                      {{ group.permissions.filter((p: any) => form.permissions.includes(p.key)).length }}/{{ group.permissions.length }}
                    </span>
                  </div>
                </template>
                <n-checkbox-group v-model:value="form.permissions">
                  <div class="perm-items">
                    <n-checkbox v-for="p in group.permissions" :key="p.key" :value="p.key" :label="p.label" />
                  </div>
                </n-checkbox-group>
              </n-collapse-item>
            </n-collapse>
            <div v-if="si < permSections.length - 1" class="perm-section-gap" />
          </div>
        </div>
      </n-form-item>
      <div class="modal-foot">
        <span class="perm-summary">{{ form.permissions.length }} permission dipilih</span>
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────── */
.role-page {
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

.search-box { width: 220px; }

/* ── Stats ─────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
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
}
:root.dark .stat-chip { border-color: rgba(255,255,255,0.07); }

.stat-icon {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon.neutral { background: rgba(100,116,139,0.12); color: #94a3b8; }
.stat-icon.blue    { background: rgba(0,229,255,0.1);    color: #00e5ff; }
.stat-icon.purple  { background: rgba(139,92,246,0.12);  color: #8b5cf6; }

.stat-body { display: flex; flex-direction: column; gap: 1px; }

.stat-num { font-size: 17px; font-weight: 800; line-height: 1.1; }
.stat-num.blue   { color: #00e5ff; }
.stat-num.purple { color: #8b5cf6; }

.stat-lbl {
  font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.45;
}

/* ── Grid ──────────────────────────────────────── */
.page-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 60px 0; opacity: 0.4; font-size: 14px;
}

/* ── Table ─────────────────────────────────────── */
.role-table-wrap {
  border-radius: 10px;
  border: 1px solid rgba(128,128,128,0.1);
  overflow: hidden;
}
:root.dark .role-table-wrap { border-color: rgba(255,255,255,0.08); }

.role-table {
  width: 100%;
  border-collapse: collapse;
}

.role-table thead {
  background: rgba(128,128,128,0.02);
  border-bottom: 1px solid rgba(128,128,128,0.1);
}
:root.dark .role-table thead { background: rgba(255,255,255,0.02); border-bottom-color: rgba(255,255,255,0.08); }

.role-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.role-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(128,128,128,0.05);
  font-size: 13px;
}
:root.dark .role-table td { border-bottom-color: rgba(255,255,255,0.04); }

.role-table tbody tr:hover {
  background: rgba(128,128,128,0.02);
}
:root.dark .role-table tbody tr:hover { background: rgba(255,255,255,0.01); }

/* ── Name Column ──────────────────────────────── */
.col-name {
  width: auto;
}

.name-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  border-left: 3px solid;
  padding-left: 10px;
}

.name-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.name-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name-main {
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
}

.name-slug {
  font-size: 11px;
  opacity: 0.35;
  font-family: ui-monospace, monospace;
  white-space: nowrap;
}

/* ── Type Column ──────────────────────────────── */
.col-type {
  width: auto;
  text-align: center;
}

/* ── Desc Column ──────────────────────────────– */
.col-desc {
  width: 35%;
  min-width: 180px;
}

.desc-text {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.6;
  font-size: 12px;
}

/* ── Permission Count Column ────────────────── */
.col-perm-count {
  width: 100px;
  text-align: center;
}

.perm-count-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-weight: 600;
}

.perm-number {
  color: var(--app-text-primary);
}

.perm-slash {
  opacity: 0.3;
}

.perm-total {
  opacity: 0.5;
}

/* ── Action Column ────────────────────────────– */
.col-action {
  width: auto;
  text-align: right;
}

.action-btns {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

/* ── Role Card (old) ──────────────────────────────── */
.role-grid {
  display: none;
}

.role-card {
  display: none;
}

/* ── Drawer ─────────────────────────────────────── */
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.d-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 5px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(128,128,128,0.09);
}
:root.dark .d-profile { border-bottom-color: rgba(255,255,255,0.06); }

.d-icon {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}

.d-name  { font-size: 17px; font-weight: 700; }
.d-slug  { font-size: 12px; opacity: 0.4; font-family: ui-monospace, monospace; }

.d-tag-row { display: flex; gap: 6px; margin-top: 4px; align-items: center; }

.d-perm-badge {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 20px;
  background: rgba(128,128,128,0.1);
  font-weight: 600;
  opacity: 0.6;
}

.d-desc {
  font-size: 13px;
  opacity: 0.55;
  line-height: 1.5;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(128,128,128,0.08);
}
:root.dark .d-desc { border-color: rgba(255,255,255,0.06); }

.d-overall {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.d-overall-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.d-overall-label { font-size: 12px; opacity: 0.5; font-weight: 600; }
.d-overall-pct   { font-size: 13px; font-weight: 700; }

.d-prog-bg {
  height: 6px;
  border-radius: 3px;
  background: rgba(128,128,128,0.1);
  overflow: hidden;
}
:root.dark .d-prog-bg { background: rgba(255,255,255,0.06); }

.d-prog-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.d-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.d-group {
  border-radius: 10px;
  border: 1px solid rgba(128,128,128,0.08);
  overflow: hidden;
}
:root.dark .d-group { border-color: rgba(255,255,255,0.06); }

.d-group-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(128,128,128,0.03);
}
:root.dark .d-group-head { background: rgba(255,255,255,0.02); }

.d-section-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px 4px;
  border-left: 3px solid;
  margin: 8px 0 4px;
}
.d-section-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.d-section-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.7;
}

.d-group-name  { font-size: 12px; font-weight: 700; opacity: 0.7; }

.d-group-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.d-group-count { font-size: 11px; opacity: 0.45; }

.d-mini-prog {
  width: 48px; height: 4px;
  border-radius: 2px;
  background: rgba(128,128,128,0.1);
  overflow: hidden;
}
:root.dark .d-mini-prog { background: rgba(255,255,255,0.07); }

.d-mini-fill {
  height: 100%;
  border-radius: 2px;
}

.d-perm-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px 10px;
}

.d-pchip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(128,128,128,0.1);
  opacity: 0.35;
  white-space: nowrap;
}
:root.dark .d-pchip { border-color: rgba(255,255,255,0.07); }
.d-pchip.active { opacity: 1; border-width: 1px; }

.d-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.self-note {
  font-size: 11px;
  text-align: center;
  opacity: 0.4;
  margin: 0;
}

/* ── Permission Editor ──────────────────────────── */
.perm-editor {
  width: 100%;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid rgba(128,128,128,0.1);
  border-radius: 10px;
  padding: 8px;
  scrollbar-width: thin;
}
:root.dark .perm-editor { border-color: rgba(255,255,255,0.08); }

.perm-section-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px 4px;
  border-left: 3px solid;
  margin-bottom: 2px;
}

.perm-section-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.perm-section-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.75;
}

.perm-section-gap {
  height: 10px;
  border-bottom: 1px dashed rgba(128,128,128,0.12);
  margin: 4px 0 10px;
}
:root.dark .perm-section-gap { border-bottom-color: rgba(255,255,255,0.07); }

.perm-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.perm-group-name  { font-weight: 600; font-size: 13px; }
.perm-group-count { font-size: 11px; opacity: 0.45; margin-left: auto; }

.perm-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 4px 12px;
  padding: 4px 0 8px 28px;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.perm-summary { font-size: 12px; opacity: 0.5; margin-right: auto; }

/* ── Responsive ─────────────────────────────────── */
@media (max-width: 1023px) {
  .page-header { flex-wrap: wrap; }
  .header-right { flex: 1; width: 100%; order: 3; }
  .title-group  { flex: 1; }
}

@media (max-width: 640px) {
  .role-grid { grid-template-columns: 1fr; }
  .perm-items { grid-template-columns: 1fr; padding-left: 24px; }
}

@media (max-width: 480px) {
  .page-title { font-size: 18px; }
  .btn-text   { display: none; }
  .search-box { width: 100%; flex: 1; }
}
</style>
