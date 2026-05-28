<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NTag, NButton, NSpace, NDescriptions, NDescriptionsItem,
  NGrid, NGridItem, NStatistic, useMessage
} from 'naive-ui'
import { ontApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const ont = ref<any>({})
const id = route.params.id as string

const isMobile = ref(window.innerWidth < 640)
function onResize() { isMobile.value = window.innerWidth < 640 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

function rxPowerColor(rx: number | null): string {
  if (rx == null) return '#999'
  if (rx >= -25) return '#18a058'
  if (rx >= -28) return '#f0a020'
  return '#d03050'
}

function rxPowerLabel(rx: number | null): string {
  if (rx == null) return 'N/A'
  if (rx >= -25) return 'Baik'
  if (rx >= -28) return 'Lemah'
  return 'Kritis'
}

function rxPowerTagType(rx: number | null): any {
  if (rx == null) return 'default'
  if (rx >= -25) return 'success'
  if (rx >= -28) return 'warning'
  return 'error'
}

const statusMap: Record<string, { type: any; label: string }> = {
  online: { type: 'success', label: 'Online' },
  offline: { type: 'error', label: 'Offline' },
  registered: { type: 'info', label: 'Registered' },
}

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await ontApi.get(id)
    ont.value = res.data || res
  } catch { message.error('ONT tidak ditemukan'); router.push('/onts') }
  loading.value = false
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

onMounted(fetchData)
</script>

<template>
  <n-space vertical :size="16">
    <!-- Header -->
    <n-card>
      <template #header>
        <div class="detail-header">
          <n-button text @click="router.push('/onts')">← ONT</n-button>
          <span class="detail-sn">{{ ont.serial_number }}</span>
          <n-tag v-if="ont.status" :type="(statusMap[ont.status] || statusMap.offline).type" size="small" round>
            {{ (statusMap[ont.status] || statusMap.offline).label }}
          </n-tag>
        </div>
      </template>
    </n-card>

    <!-- Signal Stats -->
    <n-grid :cols="isMobile ? 2 : 4" :x-gap="12" :y-gap="12">
      <n-grid-item>
        <n-card>
          <n-statistic label="Rx Power">
            <template #default>
              <span :style="{ color: rxPowerColor(ont.rx_power), fontSize: isMobile ? '16px' : undefined }">
                {{ ont.rx_power != null ? `${ont.rx_power} dBm` : '-' }}
              </span>
            </template>
            <template #suffix>
              <n-tag v-if="ont.rx_power != null" :type="rxPowerTagType(ont.rx_power)" size="tiny">
                {{ rxPowerLabel(ont.rx_power) }}
              </n-tag>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="Tx Power">
            <template #default>
              <span :style="{ fontSize: isMobile ? '16px' : undefined }">{{ ont.tx_power != null ? `${ont.tx_power} dBm` : '-' }}</span>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Pelanggan" :value="ont.customer?.name || '-'" /></n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card><n-statistic label="Terakhir Online" :value="ont.last_online_at ? formatDate(ont.last_online_at) : '-'" /></n-card>
      </n-grid-item>
    </n-grid>

    <!-- Info -->
    <n-card title="Informasi ONT" :loading="loading">
      <n-descriptions :label-placement="isMobile ? 'top' : 'left'" bordered :column="isMobile ? 1 : 2">
        <n-descriptions-item label="Serial Number">
          <span style="font-family: monospace">{{ ont.serial_number }}</span>
        </n-descriptions-item>
        <n-descriptions-item label="Status">
          <n-tag v-if="ont.status" :type="(statusMap[ont.status] || statusMap.offline).type" size="small">
            {{ (statusMap[ont.status] || statusMap.offline).label }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="Vendor">{{ ont.vendor || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Model">{{ ont.model || '-' }}</n-descriptions-item>
        <n-descriptions-item label="MAC Address">
          <span style="font-family: monospace">{{ ont.mac_address || '-' }}</span>
        </n-descriptions-item>
        <n-descriptions-item label="IP Address">{{ ont.ip_address || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Rx Power">
          <n-tag v-if="ont.rx_power != null" :type="rxPowerTagType(ont.rx_power)" size="small">{{ ont.rx_power }} dBm ({{ rxPowerLabel(ont.rx_power) }})</n-tag>
          <span v-else>-</span>
        </n-descriptions-item>
        <n-descriptions-item label="Tx Power">{{ ont.tx_power != null ? `${ont.tx_power} dBm` : '-' }}</n-descriptions-item>
        <n-descriptions-item label="Pelanggan">{{ ont.customer?.name || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Terakhir Online">{{ ont.last_online_at ? formatDate(ont.last_online_at) : '-' }}</n-descriptions-item>
        <n-descriptions-item label="Catatan" :span="isMobile ? 1 : 2">{{ ont.notes || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Dibuat">{{ formatDate(ont.created_at) }}</n-descriptions-item>
        <n-descriptions-item label="Diperbarui">{{ formatDate(ont.updated_at) }}</n-descriptions-item>
      </n-descriptions>
    </n-card>
  </n-space>
</template>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.detail-sn {
  font-size: 20px;
  font-weight: 600;
  font-family: monospace;
}
@media (max-width: 639px) {
  .detail-sn {
    font-size: 15px;
  }
}
</style>
