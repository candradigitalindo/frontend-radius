<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NIcon, NSpin, NModal, NInput, useMessage } from 'naive-ui'
import {
  RocketOutline as RocketIcon,
  CheckmarkCircleOutline as CheckIcon,
  ArrowUpOutline as UpIcon,
  ArrowDownOutline as DownIcon,
  SpeedometerOutline as SpeedIcon,
  PricetagOutline as PriceIcon,
  ChevronForwardOutline as ChevronIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'
import { useThemeStore } from '../../stores/theme'

const message = useMessage()
const themeStore = useThemeStore()
const loading = ref(true)
const profile = ref<any>({})
const packages = ref<any[]>([])

const showModal = ref(false)
const submitting = ref(false)
const selectedPkg = ref<any>(null)
const notes = ref('')

onMounted(async () => {
  try {
    const [profRes, pkgRes] = await Promise.all([
      portalApi.customer(),
      portalApi.packages(),
    ])
    profile.value = profRes.data.data || profRes.data
    packages.value = pkgRes.data.data || []
  } catch { /* ignore */ }
  loading.value = false
})

const currentPackageId = computed(() => profile.value.package_id || profile.value.package?.id)
const currentPackage = computed(() => profile.value.package || {})

function formatCurrency(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

function getChangeType(pkg: any) {
  const currentPrice = currentPackage.value.price || 0
  if (pkg.price > currentPrice) return 'upgrade'
  if (pkg.price < currentPrice) return 'downgrade'
  return 'same'
}

function changeLabel(pkg: any) {
  const t = getChangeType(pkg)
  if (t === 'upgrade') return 'Upgrade'
  if (t === 'downgrade') return 'Downgrade'
  return 'Paket Saat Ini'
}

function selectPackage(pkg: any) {
  if (pkg.id === currentPackageId.value) return
  selectedPkg.value = pkg
  notes.value = ''
  showModal.value = true
}

async function submitChange() {
  if (!selectedPkg.value) return
  submitting.value = true
  try {
    await portalApi.changePackage({
      package_id: selectedPkg.value.id,
      package_name: selectedPkg.value.name,
      change_type: getChangeType(selectedPkg.value),
      notes: notes.value,
    })
    message.success('Permintaan perubahan paket berhasil dikirim! Tim kami akan menghubungi Anda.')
    showModal.value = false
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Gagal mengirim permintaan')
  }
  submitting.value = false
}
</script>

<template>
  <n-spin :show="loading">
    <div class="pkg-page">

      <!-- Header -->
      <div class="page-header">
        <div class="page-header-icon">
          <n-icon :component="RocketIcon" :size="22" color="#6366f1" />
        </div>
        <div>
          <div class="page-title">Kelola Paket</div>
          <div class="page-sub">Upgrade atau downgrade paket internet Anda</div>
        </div>
      </div>

      <!-- Current Package -->
      <div class="current-card">
        <div class="current-label">Paket Saat Ini</div>
        <div class="current-name">{{ currentPackage.name || '-' }}</div>
        <div class="current-speed">
          <div class="speed-chip">
            <n-icon :component="DownIcon" :size="14" color="#22c55e" />
            {{ currentPackage.bandwidth_down || 0 }} Mbps Download
          </div>
          <div class="speed-chip">
            <n-icon :component="UpIcon" :size="14" color="#3b82f6" />
            {{ currentPackage.bandwidth_up || 0 }} Mbps Upload
          </div>
        </div>
        <div class="current-price">{{ formatCurrency(currentPackage.price || 0) }}<span>/bulan</span></div>
      </div>

      <!-- Info note -->
      <div class="info-note">
        <n-icon :component="CheckIcon" :size="16" color="#6366f1" />
        <span>Perubahan paket akan diproses oleh tim kami dalam 1x24 jam. Anda akan dihubungi melalui WhatsApp untuk konfirmasi.</span>
      </div>

      <!-- Package list -->
      <div class="section-title-row">
        <span class="section-title">Pilih Paket</span>
        <span class="pkg-count">{{ packages.length }} paket tersedia</span>
      </div>

      <div v-if="packages.length === 0 && !loading" class="empty-state">
        <n-icon :component="RocketIcon" :size="40" style="opacity:.2" />
        <span>Tidak ada paket tersedia saat ini</span>
      </div>

      <div class="pkg-grid">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="pkg-card"
          :class="{
            'is-current': pkg.id === currentPackageId,
            'is-upgrade': getChangeType(pkg) === 'upgrade',
            'is-downgrade': getChangeType(pkg) === 'downgrade',
          }"
          @click="selectPackage(pkg)"
        >
          <!-- Badge -->
          <div v-if="pkg.id === currentPackageId" class="pkg-badge current-badge">
            <n-icon :component="CheckIcon" :size="11" /> Aktif
          </div>
          <div v-else-if="getChangeType(pkg) === 'upgrade'" class="pkg-badge upgrade-badge">
            <n-icon :component="UpIcon" :size="11" /> Upgrade
          </div>
          <div v-else-if="getChangeType(pkg) === 'downgrade'" class="pkg-badge downgrade-badge">
            <n-icon :component="DownIcon" :size="11" /> Downgrade
          </div>

          <div class="pkg-name">{{ pkg.name }}</div>

          <div class="pkg-speeds">
            <div class="pkg-speed-row">
              <n-icon :component="DownIcon" :size="14" color="#22c55e" />
              <span>{{ pkg.bandwidth_down }} Mbps</span>
            </div>
            <div class="pkg-speed-div">·</div>
            <div class="pkg-speed-row">
              <n-icon :component="UpIcon" :size="14" color="#3b82f6" />
              <span>{{ pkg.bandwidth_up }} Mbps</span>
            </div>
          </div>

          <div v-if="pkg.description" class="pkg-desc">{{ pkg.description }}</div>

          <div class="pkg-price-row">
            <div class="pkg-price">{{ formatCurrency(pkg.price) }}<span>/bln</span></div>
            <div v-if="pkg.id !== currentPackageId" class="pkg-select-btn">
              Pilih <n-icon :component="ChevronIcon" :size="14" />
            </div>
          </div>
        </div>
      </div>

    </div>
  </n-spin>

  <!-- Confirm Modal -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="`Konfirmasi ${changeLabel(selectedPkg)}`"
    :style="{ maxWidth: '440px', width: '95vw' }"
  >
    <div class="confirm-body" v-if="selectedPkg">
      <div class="confirm-comparison">
        <div class="comp-side">
          <div class="comp-label">Paket Saat Ini</div>
          <div class="comp-name">{{ currentPackage.name || '-' }}</div>
          <div class="comp-price">{{ formatCurrency(currentPackage.price || 0) }}/bln</div>
        </div>
        <div class="comp-arrow">
          <n-icon :component="getChangeType(selectedPkg) === 'upgrade' ? UpIcon : DownIcon" :size="24"
            :color="getChangeType(selectedPkg) === 'upgrade' ? '#6366f1' : '#f59e0b'" />
        </div>
        <div class="comp-side">
          <div class="comp-label">Paket Tujuan</div>
          <div class="comp-name">{{ selectedPkg.name }}</div>
          <div class="comp-price" :style="{ color: getChangeType(selectedPkg) === 'upgrade' ? '#6366f1' : '#f59e0b' }">
            {{ formatCurrency(selectedPkg.price) }}/bln
          </div>
        </div>
      </div>

      <div>
        <div class="input-label">Catatan tambahan (opsional)</div>
        <n-input
          v-model:value="notes"
          type="textarea"
          placeholder="Contoh: Tolong diproses sebelum tanggal 15..."
          :rows="3"
        />
      </div>

      <div class="info-note" style="font-size:12px">
        Tim kami akan menghubungi Anda via WhatsApp dalam 1x24 jam untuk konfirmasi dan proses perubahan.
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="showModal = false">Batal</button>
        <button
          class="btn-confirm"
          :class="getChangeType(selectedPkg) === 'upgrade' ? 'btn-upgrade' : 'btn-downgrade'"
          :disabled="submitting"
          @click="submitChange"
        >
          {{ submitting ? 'Mengirim...' : `Ajukan ${changeLabel(selectedPkg)}` }}
        </button>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.pkg-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 900px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(99,102,241,.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -.3px;
}

.page-sub {
  font-size: 13px;
  opacity: .5;
  margin-top: 2px;
}

/* Current package */
.current-card {
  padding: 22px 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.current-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  opacity: .7;
}

.current-name {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -.4px;
}

.current-speed {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.speed-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  background: rgba(255,255,255,.15);
  padding: 4px 10px;
  border-radius: 20px;
}

.current-price {
  font-size: 22px;
  font-weight: 800;
  margin-top: 4px;
}

.current-price span {
  font-size: 13px;
  font-weight: 500;
  opacity: .7;
}

/* Info note */
.info-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(99,102,241,.06);
  border: 1px solid rgba(99,102,241,.15);
  font-size: 13px;
  opacity: .8;
  line-height: 1.5;
}

/* Section header */
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  opacity: .75;
}

.pkg-count {
  font-size: 12px;
  opacity: .4;
}

/* Package grid */
.pkg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.pkg-card {
  position: relative;
  padding: 20px 16px;
  border-radius: 16px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all .2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--app-card-bg, transparent);
}

:root:not(.dark) .pkg-card {
  border-color: rgba(0,0,0,.08);
}

:root.dark .pkg-card {
  border-color: rgba(255,255,255,.08);
}

.pkg-card:hover:not(.is-current) {
  transform: translateY(-3px);
  border-color: #6366f1;
}

.pkg-card.is-current {
  border-color: #22c55e;
  background: rgba(34,197,94,.04);
  cursor: default;
}

.pkg-card.is-upgrade:hover {
  border-color: #6366f1;
}

.pkg-card.is-downgrade:hover {
  border-color: #f59e0b;
}

/* Badge */
.pkg-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  width: fit-content;
}

.current-badge {
  background: rgba(34,197,94,.1);
  color: #22c55e;
}

.upgrade-badge {
  background: rgba(99,102,241,.1);
  color: #6366f1;
}

.downgrade-badge {
  background: rgba(245,158,11,.1);
  color: #f59e0b;
}

.pkg-name {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -.2px;
}

.pkg-speeds {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: .75;
}

.pkg-speed-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pkg-speed-div {
  opacity: .3;
}

.pkg-desc {
  font-size: 12px;
  opacity: .45;
  line-height: 1.4;
}

.pkg-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--app-border, rgba(0,0,0,.06));
}

:root.dark .pkg-price-row {
  border-color: rgba(255,255,255,.06);
}

.pkg-price {
  font-size: 17px;
  font-weight: 800;
}

.pkg-price span {
  font-size: 11px;
  font-weight: 400;
  opacity: .5;
}

.pkg-select-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  color: var(--app-accent, #6366f1);
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px;
  border-radius: 14px;
  border: 1px dashed var(--app-border, rgba(0,0,0,.08));
  opacity: .5;
  font-size: 13px;
}

/* Confirm modal */
.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.confirm-comparison {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
}

.comp-side {
  flex: 1;
  text-align: center;
}

.comp-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  opacity: .45;
  margin-bottom: 4px;
}

.comp-name {
  font-size: 15px;
  font-weight: 700;
}

.comp-price {
  font-size: 13px;
  opacity: .65;
  margin-top: 2px;
}

.comp-arrow {
  flex-shrink: 0;
}

.input-label {
  font-size: 13px;
  font-weight: 600;
  opacity: .6;
  margin-bottom: 6px;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border, rgba(0,0,0,.1));
  background: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}

.btn-cancel:hover {
  background: rgba(0,0,0,.04);
}

.btn-confirm {
  flex: 2;
  padding: 12px;
  border-radius: 10px;
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .2s;
}

.btn-confirm:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn-upgrade {
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
}

.btn-downgrade {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
}

/* Responsive */
@media (max-width: 768px) {
  .pkg-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .pkg-grid {
    grid-template-columns: 1fr;
  }

  .current-speed {
    flex-direction: column;
    gap: 6px;
  }

  .confirm-comparison {
    flex-direction: column;
    text-align: center;
  }

  .comp-arrow {
    transform: rotate(90deg);
  }
}
</style>
