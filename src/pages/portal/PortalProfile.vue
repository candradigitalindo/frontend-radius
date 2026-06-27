<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NIcon, NAvatar, NSpin, useMessage } from 'naive-ui'
import {
  PersonOutline as UserIcon,
  MailOutline as EmailIcon,
  CallOutline as PhoneIcon,
  CalendarOutline as DateIcon,
  LockClosedOutline as LockIcon,
  WifiOutline as WifiIcon,
  SpeedometerOutline as SpeedIcon,
  CheckmarkCircleOutline as CheckIcon,
  EyeOutline as EyeIcon,
  EyeOffOutline as EyeOffIcon,
} from '@vicons/ionicons5'
import { NotificationsOutline as BellIcon } from '@vicons/ionicons5'
import { portalApi } from '../../api'
import { enablePush, pushConfigured, pushPermission } from '../../composables/usePush'

const message = useMessage()
const loading = ref(true)
const saving = ref(false)
const profile = ref<any>({})
const passwordForm = ref({ current_password: '', new_password: '', confirm_password: '' })
const showPasswords = ref({ current: false, new_: false, confirm: false })

// ── Web push ──
const pushAvailable = pushConfigured()
const pushEnabling = ref(false)
const pushState = ref<NotificationPermission | 'unsupported'>(pushPermission())

async function handleEnablePush() {
  pushEnabling.value = true
  try {
    const res = await enablePush()
    if (res.ok) {
      pushState.value = 'granted'
      message.success('Notifikasi berhasil diaktifkan')
    } else if (res.reason === 'denied') {
      pushState.value = 'denied'
      message.warning('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.')
    } else if (res.reason === 'unsupported') {
      message.error('Browser ini tidak mendukung notifikasi push')
    } else {
      message.error('Gagal mengaktifkan notifikasi')
    }
  } finally {
    pushEnabling.value = false
  }
}

const initials = computed(() => {
  const n = profile.value.name || ''
  return n.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
})

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
}

onMounted(async () => {
  try {
    const { data } = await portalApi.profile()
    profile.value = data.data || data
  } catch { /* ignore */ }
  loading.value = false
})

async function handleChangePassword() {
  if (!passwordForm.value.current_password || !passwordForm.value.new_password) {
    message.warning('Semua field password wajib diisi')
    return
  }
  if (passwordForm.value.new_password.length < 6) {
    message.warning('Password baru minimal 6 karakter')
    return
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    message.warning('Password baru tidak cocok')
    return
  }
  saving.value = true
  try {
    await portalApi.changePassword({
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password,
    })
    message.success('Password berhasil diubah')
    passwordForm.value = { current_password: '', new_password: '', confirm_password: '' }
  } catch {
    message.error('Gagal mengubah password')
  }
  saving.value = false
}
</script>

<template>
  <div class="profile-page">
    <n-spin :show="loading" style="min-height: 200px">
      <!-- Profile card -->
      <div class="profile-card">
        <div class="profile-top">
          <n-avatar
            round
            :size="68"
            :style="{ background: 'linear-gradient(135deg, var(--app-accent), #0097a7)', fontSize: '22px', fontWeight: 700 }"
          >
            {{ initials }}
          </n-avatar>
          <div class="profile-info">
            <h2 class="profile-name">{{ profile.name || 'Pelanggan' }}</h2>
            <p class="profile-role">{{ profile.role || 'Customer' }}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-icon"><n-icon :component="EmailIcon" :size="16" /></div>
            <div class="info-detail">
              <span class="info-label">Email</span>
              <span class="info-value">{{ profile.email || '-' }}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon"><n-icon :component="PhoneIcon" :size="16" /></div>
            <div class="info-detail">
              <span class="info-label">Telepon</span>
              <span class="info-value">{{ profile.phone || '-' }}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon"><n-icon :component="DateIcon" :size="16" /></div>
            <div class="info-detail">
              <span class="info-label">Bergabung Sejak</span>
              <span class="info-value">{{ formatDate(profile.created_at) }}</span>
            </div>
          </div>
          <div class="info-item" v-if="profile.customer?.package_name">
            <div class="info-icon"><n-icon :component="SpeedIcon" :size="16" /></div>
            <div class="info-detail">
              <span class="info-label">Paket Aktif</span>
              <span class="info-value">{{ profile.customer.package_name }}</span>
            </div>
          </div>
          <div class="info-item" v-if="profile.customer?.pppoe_username">
            <div class="info-icon"><n-icon :component="WifiIcon" :size="16" /></div>
            <div class="info-detail">
              <span class="info-label">PPPoE Username</span>
              <span class="info-value" style="font-family: monospace">{{ profile.customer.pppoe_username }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Notification card -->
      <div v-if="pushAvailable" class="password-card">
        <div class="section-header">
          <n-icon :component="BellIcon" :size="18" style="color: var(--app-accent)" />
          <h3 class="section-title">Notifikasi</h3>
        </div>
        <div class="push-row">
          <p class="push-desc">
            Dapatkan pemberitahuan tagihan, pembayaran, dan info penting langsung di perangkat ini.
          </p>
          <div v-if="pushState === 'granted'" class="push-active">
            <n-icon :component="CheckIcon" :size="18" />
            <span>Notifikasi aktif</span>
          </div>
          <button
            v-else
            class="push-btn"
            :disabled="pushEnabling"
            @click="handleEnablePush"
          >
            {{ pushEnabling ? 'Mengaktifkan…' : 'Aktifkan Notifikasi' }}
          </button>
        </div>
      </div>

      <!-- Password card -->
      <div class="password-card">
        <div class="section-header">
          <n-icon :component="LockIcon" :size="18" style="color: var(--app-accent)" />
          <h3 class="section-title">Ubah Password</h3>
        </div>

        <div class="pw-fields">
          <div class="pw-field">
            <label class="pw-label">Password Saat Ini</label>
            <div class="pw-input-wrap">
              <input
                v-model="passwordForm.current_password"
                :type="showPasswords.current ? 'text' : 'password'"
                class="pw-input"
                placeholder="••••••••"
              />
              <button class="pw-toggle" @click="showPasswords.current = !showPasswords.current">
                <n-icon :component="showPasswords.current ? EyeOffIcon : EyeIcon" :size="16" />
              </button>
            </div>
          </div>

          <div class="pw-field">
            <label class="pw-label">Password Baru</label>
            <div class="pw-input-wrap">
              <input
                v-model="passwordForm.new_password"
                :type="showPasswords.new_ ? 'text' : 'password'"
                class="pw-input"
                placeholder="Minimal 6 karakter"
              />
              <button class="pw-toggle" @click="showPasswords.new_ = !showPasswords.new_">
                <n-icon :component="showPasswords.new_ ? EyeOffIcon : EyeIcon" :size="16" />
              </button>
            </div>
          </div>

          <div class="pw-field">
            <label class="pw-label">Konfirmasi Password</label>
            <div class="pw-input-wrap">
              <input
                v-model="passwordForm.confirm_password"
                :type="showPasswords.confirm ? 'text' : 'password'"
                class="pw-input"
                placeholder="Ulangi password baru"
              />
              <button class="pw-toggle" @click="showPasswords.confirm = !showPasswords.confirm">
                <n-icon :component="showPasswords.confirm ? EyeOffIcon : EyeIcon" :size="16" />
              </button>
            </div>
          </div>
        </div>

        <div class="pw-actions">
          <button class="save-btn" :disabled="saving" @click="handleChangePassword">
            <n-icon :component="CheckIcon" :size="16" v-if="!saving" />
            <span v-if="saving">Menyimpan...</span>
            <span v-else>Simpan Password</span>
          </button>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Profile card */
.profile-card {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--app-text-primary);
  margin: 0;
}

.profile-role {
  font-size: 13px;
  color: var(--app-text-muted);
  margin: 2px 0 0;
  text-transform: capitalize;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
}

.info-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  flex-shrink: 0;
}

.info-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Password */
.password-card {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0;
}

.push-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.push-desc {
  flex: 1;
  min-width: 200px;
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary, #888);
  line-height: 1.5;
}
.push-btn {
  flex-shrink: 0;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--app-accent), #0097a7);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}
.push-btn:disabled { opacity: 0.6; cursor: default; }
.push-btn:not(:disabled):hover { transform: translateY(-1px); }
.push-active {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  color: #18a058;
  font-size: 14px;
  font-weight: 600;
}

.pw-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pw-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pw-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-muted);
}

.pw-input-wrap {
  display: flex;
  align-items: center;
  border: 1px solid var(--app-card-border);
  border-radius: 12px;
  background: var(--app-bg-secondary, rgba(255,255,255,0.03));
  overflow: hidden;
  transition: border-color 0.2s;
}

.pw-input-wrap:focus-within {
  border-color: var(--app-accent);
}

.pw-input {
  flex: 1;
  padding: 12px 14px;
  border: none;
  background: transparent;
  color: var(--app-text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.pw-toggle {
  padding: 0 12px;
  border: none;
  background: none;
  color: var(--app-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.pw-actions {
  display: flex;
  justify-content: flex-end;
}

.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--app-accent), #0097a7);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--app-accent-strong);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .profile-card, .password-card { padding: 18px 16px; }
  .info-grid { grid-template-columns: 1fr; }
  .profile-top { flex-direction: column; text-align: center; }
}
</style>
