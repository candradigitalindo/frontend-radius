<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NCard, NForm, NFormItem, NInput, NButton, NSpin, NSpace, NIcon, useMessage, NTabs, NTabPane
} from 'naive-ui'
import { User, Lock, Mail, Phone, Building } from '@vicons/tabler'
import { authApi } from '../../api'

const message = useMessage()
const loading = ref(true)
const saving = ref(false)
const changingPassword = ref(false)

const profile = ref({
  name: '',
  email: '',
  phone: '',
  tenant_name: '',
  role_name: '',
})

const profileForm = ref({
  name: '',
  email: '',
  phone: '',
})

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

async function fetchProfile() {
  loading.value = true
  try {
    const { data } = await authApi.me()
    profile.value = data.data || data
    profileForm.value = {
      name: profile.value.name,
      email: profile.value.email,
      phone: profile.value.phone || '',
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal memuat profil')
  }
  loading.value = false
}

async function handleUpdateProfile() {
  if (!profileForm.value.name || !profileForm.value.email) {
    message.warning('Nama dan email wajib diisi')
    return
  }
  saving.value = true
  try {
    await authApi.updateProfile(profileForm.value)
    message.success('Profil berhasil diperbarui')
    await fetchProfile()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal memperbarui profil')
  }
  saving.value = false
}

async function handleChangePassword() {
  const f = passwordForm.value
  if (!f.current_password || !f.new_password || !f.confirm_password) {
    message.warning('Semua field password wajib diisi')
    return
  }
  if (f.new_password !== f.confirm_password) {
    message.error('Konfirmasi password tidak cocok')
    return
  }
  if (f.new_password.length < 8) {
    message.warning('Password minimal 8 karakter')
    return
  }
  changingPassword.value = true
  try {
    await authApi.changePassword({
      current_password: f.current_password,
      new_password: f.new_password,
    })
    message.success('Password berhasil diubah')
    passwordForm.value = { current_password: '', new_password: '', confirm_password: '' }
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal mengubah password')
  }
  changingPassword.value = false
}

onMounted(fetchProfile)
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <h2 class="page-title">Profil Saya</h2>
    </div>

    <n-spin :show="loading">
      <n-card>
        <n-tabs type="line" animated>
          <!-- Informasi Profil -->
          <n-tab-pane name="profile" tab="Informasi Profil">
            <div class="profile-section">
              <div class="profile-header">
                <div class="profile-avatar">
                  <n-icon :component="User" :size="42" />
                </div>
                <div class="profile-meta">
                  <h3 class="profile-name">{{ profile.name }}</h3>
                  <div class="profile-role">{{ profile.role_name || 'User' }}</div>
                  <div class="profile-tenant">
                    <n-icon :component="Building" :size="13" style="opacity: 0.5" />
                    <span>{{ profile.tenant_name || '-' }}</span>
                  </div>
                </div>
              </div>

              <n-form label-placement="top" style="margin-top: 24px; max-width: 500px">
                <n-form-item>
                  <template #label>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <n-icon :component="User" :size="14" />
                      <span>Nama Lengkap</span>
                    </div>
                  </template>
                  <n-input v-model:value="profileForm.name" placeholder="Nama lengkap" />
                </n-form-item>

                <n-form-item>
                  <template #label>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <n-icon :component="Mail" :size="14" />
                      <span>Email</span>
                    </div>
                  </template>
                  <n-input v-model:value="profileForm.email" placeholder="email@example.com" />
                </n-form-item>

                <n-form-item>
                  <template #label>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <n-icon :component="Phone" :size="14" />
                      <span>Telepon (opsional)</span>
                    </div>
                  </template>
                  <n-input v-model:value="profileForm.phone" placeholder="08xx" />
                </n-form-item>

                <n-space justify="end">
                  <n-button type="primary" :loading="saving" @click="handleUpdateProfile">
                    Simpan Perubahan
                  </n-button>
                </n-space>
              </n-form>
            </div>
          </n-tab-pane>

          <!-- Ubah Password -->
          <n-tab-pane name="password" tab="Ubah Password">
            <div class="password-section">
              <n-form label-placement="top" style="max-width: 500px">
                <n-form-item>
                  <template #label>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <n-icon :component="Lock" :size="14" />
                      <span>Password Saat Ini</span>
                    </div>
                  </template>
                  <n-input
                    v-model:value="passwordForm.current_password"
                    type="password"
                    show-password-on="click"
                    placeholder="Masukkan password saat ini"
                  />
                </n-form-item>

                <n-form-item>
                  <template #label>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <n-icon :component="Lock" :size="14" />
                      <span>Password Baru</span>
                    </div>
                  </template>
                  <n-input
                    v-model:value="passwordForm.new_password"
                    type="password"
                    show-password-on="click"
                    placeholder="Minimal 8 karakter"
                  />
                </n-form-item>

                <n-form-item>
                  <template #label>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <n-icon :component="Lock" :size="14" />
                      <span>Konfirmasi Password Baru</span>
                    </div>
                  </template>
                  <n-input
                    v-model:value="passwordForm.confirm_password"
                    type="password"
                    show-password-on="click"
                    placeholder="Ketik ulang password baru"
                  />
                </n-form-item>

                <div class="password-hint">
                  <n-icon :component="Lock" :size="13" style="opacity: 0.5" />
                  <span>Password minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol untuk keamanan lebih baik.</span>
                </div>

                <n-space justify="end">
                  <n-button type="primary" :loading="changingPassword" @click="handleChangePassword">
                    Ubah Password
                  </n-button>
                </n-space>
              </n-form>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </n-spin>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.profile-section,
.password-section {
  padding: 8px 0;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}
:root.dark .profile-header { border-bottom-color: rgba(255,255,255,0.08); }

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.profile-role {
  font-size: 13px;
  opacity: 0.6;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(128,128,128,0.1);
  align-self: flex-start;
  font-weight: 500;
}
:root.dark .profile-role { background: rgba(255,255,255,0.08); }

.profile-tenant {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.5;
  margin-top: 2px;
}

.password-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(59,130,246,0.05);
  border: 1px solid rgba(59,130,246,0.15);
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.7;
  margin-bottom: 12px;
}
:root.dark .password-hint {
  background: rgba(59,130,246,0.08);
  border-color: rgba(59,130,246,0.2);
}
</style>
