<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NButton, NIcon, useMessage } from 'naive-ui'
import { Copy, Check, Building, InfoCircle } from '@vicons/tabler'

const props = defineProps<{
  show: boolean
  info: {
    bank_name?: string
    bank_account_number?: string
    bank_account_holder?: string
    unique_code?: number
    total_amount?: number
  } | null
}>()

const emit = defineEmits<{ 'update:show': [boolean] }>()

const message = useMessage()
const copiedField = ref<string | null>(null)

function formatRp(n: number | undefined) {
  if (n === undefined || n === null) return '-'
  return 'Rp ' + n.toLocaleString('id-ID')
}

function codeLabel(n: number | undefined) {
  return String(n ?? 0).padStart(3, '0')
}

function copy(field: string, value: string | undefined, label: string) {
  if (!value) return
  navigator.clipboard.writeText(value).then(() => {
    copiedField.value = field
    message.success(`${label} disalin`)
    setTimeout(() => { if (copiedField.value === field) copiedField.value = null }, 2000)
  })
}
</script>

<template>
  <n-modal
    :show="props.show"
    @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    title="Instruksi Transfer Bank"
    style="max-width: 440px"
    :segmented="{ footer: true }"
  >
    <div v-if="info" class="bt-wrap">
      <div class="bt-bank-row">
        <div class="bt-bank-icon"><n-icon :size="20"><Building /></n-icon></div>
        <div class="bt-bank-meta">
          <div class="bt-bank-name">{{ info.bank_name }}</div>
          <div class="bt-bank-holder">a.n. {{ info.bank_account_holder }}</div>
        </div>
      </div>

      <div class="bt-field">
        <div class="bt-field-label">Nomor Rekening</div>
        <div class="bt-field-row">
          <span class="bt-field-value mono">{{ info.bank_account_number }}</span>
          <n-button
            size="small"
            :type="copiedField === 'account' ? 'success' : 'primary'"
            secondary
            @click="copy('account', info.bank_account_number, 'Nomor rekening')"
          >
            <template #icon>
              <n-icon :size="14"><Check v-if="copiedField === 'account'" /><Copy v-else /></n-icon>
            </template>
            {{ copiedField === 'account' ? 'Tersalin' : 'Salin' }}
          </n-button>
        </div>
      </div>

      <div class="bt-field highlight">
        <div class="bt-field-label">Jumlah Transfer — Wajib Sesuai</div>
        <div class="bt-field-row">
          <span class="bt-field-value mono bt-amount">{{ formatRp(info.total_amount) }}</span>
          <n-button
            size="small"
            :type="copiedField === 'amount' ? 'success' : 'primary'"
            @click="copy('amount', String(info.total_amount ?? ''), 'Jumlah transfer')"
          >
            <template #icon>
              <n-icon :size="14"><Check v-if="copiedField === 'amount'" /><Copy v-else /></n-icon>
            </template>
            {{ copiedField === 'amount' ? 'Tersalin' : 'Salin' }}
          </n-button>
        </div>
        <div class="bt-code-hint">
          <n-icon :size="13"><InfoCircle /></n-icon>
          <span>Termasuk kode unik <strong>{{ codeLabel(info.unique_code) }}</strong> di 3 digit terakhir — transfer PERSIS jumlah ini agar pembayaran lebih cepat diverifikasi.</span>
        </div>
      </div>

      <div class="bt-note">
        Setelah transfer, pesanan akan dikonfirmasi admin secara manual dan status berubah menjadi <strong>Lunas</strong>. Menggunakan nominal persis (termasuk kode unik) mempercepat proses ini.
      </div>
    </div>

    <template #footer>
      <n-button block type="primary" @click="emit('update:show', false)">Mengerti, Tutup</n-button>
    </template>
  </n-modal>
</template>

<style scoped>
.bt-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bt-bank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.05);
}
:root.dark .bt-bank-row { background: rgba(255, 255, 255, 0.04); }

.bt-bank-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.bt-bank-meta { min-width: 0; }
.bt-bank-name { font-weight: 800; font-size: 15px; letter-spacing: 0.2px; }
.bt-bank-holder { font-size: 12px; opacity: 0.6; margin-top: 1px; }

.bt-field {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid rgba(128, 128, 128, 0.16);
}
:root.dark .bt-field { border-color: rgba(255, 255, 255, 0.1); }

.bt-field.highlight {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.05);
}

.bt-field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  opacity: 0.55;
  margin-bottom: 6px;
}

.bt-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.bt-field-value { font-size: 16px; font-weight: 700; }
.mono { font-family: ui-monospace, monospace; }
.bt-amount { font-size: 19px; color: #16a34a; }
:root.dark .bt-amount { color: #22c55e; }

.bt-code-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.8;
}
.bt-code-hint .n-icon { flex-shrink: 0; margin-top: 1px; color: #f59e0b; }

.bt-note {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.55;
  padding: 0 2px;
}
</style>
