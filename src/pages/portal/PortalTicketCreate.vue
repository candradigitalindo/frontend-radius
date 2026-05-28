<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, useMessage } from 'naive-ui'
import {
  ArrowBackOutline as BackIcon,
  SendOutline as SendIcon,
  FlameOutline as HighIcon,
  RemoveOutline as MedIcon,
  ChevronDownOutline as LowIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'

const router = useRouter()
const message = useMessage()
const saving = ref(false)
const form = ref({ subject: '', description: '', priority: 'medium' })

const priorities = [
  { value: 'low', label: 'Rendah', icon: LowIcon, color: '#6b7280', desc: 'Tidak mendesak' },
  { value: 'medium', label: 'Sedang', icon: MedIcon, color: '#f59e0b', desc: 'Perlu ditangani' },
  { value: 'high', label: 'Tinggi', icon: HighIcon, color: '#ef4444', desc: 'Sangat mendesak' },
]

async function handleSubmit() {
  if (!form.value.subject.trim() || !form.value.description.trim()) {
    message.warning('Subjek dan deskripsi wajib diisi')
    return
  }
  saving.value = true
  try {
    await portalApi.createTicket(form.value)
    message.success('Tiket berhasil dibuat')
    router.push('/portal/tickets')
  } catch {
    message.error('Gagal membuat tiket')
  }
  saving.value = false
}
</script>

<template>
  <div class="create-page">
    <!-- Back -->
    <button class="back-btn" @click="router.push('/portal/tickets')">
      <n-icon :component="BackIcon" :size="18" />
      <span>Kembali</span>
    </button>

    <div class="form-card">
      <h2 class="form-title">Buat Tiket Baru</h2>
      <p class="form-desc">Jelaskan masalah Anda dan tim kami akan segera merespons.</p>

      <!-- Subject -->
      <div class="field">
        <label class="field-label">Subjek</label>
        <input
          v-model="form.subject"
          class="field-input"
          placeholder="Contoh: Internet lambat sejak kemarin..."
          maxlength="200"
        />
      </div>

      <!-- Priority -->
      <div class="field">
        <label class="field-label">Prioritas</label>
        <div class="priority-group">
          <button
            v-for="p in priorities" :key="p.value"
            class="priority-pill"
            :class="{ active: form.priority === p.value }"
            :style="form.priority === p.value ? { borderColor: p.color, background: p.color + '14', color: p.color } : {}"
            @click="form.priority = p.value"
          >
            <n-icon :component="p.icon" :size="16" />
            <span>{{ p.label }}</span>
          </button>
        </div>
      </div>

      <!-- Description -->
      <div class="field">
        <label class="field-label">Deskripsi</label>
        <textarea
          v-model="form.description"
          class="field-textarea"
          rows="6"
          placeholder="Ceritakan detail masalah Anda, kapan mulai terjadi, dan langkah yang sudah dicoba..."
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button class="btn-cancel" @click="router.push('/portal/tickets')">Batal</button>
        <button class="btn-submit" :disabled="saving" @click="handleSubmit">
          <n-icon :component="SendIcon" :size="16" v-if="!saving" />
          <span v-if="saving">Mengirim...</span>
          <span v-else>Kirim Tiket</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--app-accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
}

.form-card {
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--app-text-primary);
  margin: 0;
}

.form-desc {
  font-size: 13px;
  color: var(--app-text-muted);
  margin: -12px 0 0;
  line-height: 1.5;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-muted);
}

.field-input,
.field-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--app-card-border);
  border-radius: 12px;
  background: var(--app-bg-secondary, rgba(255,255,255,0.03));
  color: var(--app-text-primary);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
  outline: none;
  box-sizing: border-box;
}

.field-input:focus,
.field-textarea:focus {
  border-color: var(--app-accent);
}

.field-textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.priority-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.priority-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1.5px solid var(--app-card-border);
  border-radius: 10px;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.priority-pill:hover {
  border-color: var(--app-accent);
}

.priority-pill.active {
  font-weight: 700;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid var(--app-card-border);
  border-radius: 12px;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.btn-cancel:hover {
  border-color: var(--app-text-muted);
}

.btn-submit {
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

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--app-accent-strong);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .form-card { padding: 20px 16px; }
  .form-actions { flex-direction: column; }
  .form-actions .btn-cancel,
  .form-actions .btn-submit { width: 100%; justify-content: center; }
}
</style>
