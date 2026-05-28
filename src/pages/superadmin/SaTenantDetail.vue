<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NDescriptions, NDescriptionsItem, NTag, NButton, NSpace, useMessage
} from 'naive-ui'
import { tenantApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const tenant = ref<any>({})
const id = route.params.id as string

onMounted(async () => {
  try {
    const { data } = await tenantApi.getById(id)
    tenant.value = data.data || data
  } catch {
    message.error('Gagal memuat detail tenant')
  }
  loading.value = false
})
</script>

<template>
  <n-space vertical :size="16">
    <n-button text @click="router.push('/superadmin/tenants')">← Kembali</n-button>
    <n-card :title="tenant.name || 'Detail Tenant'" :loading="loading">
      <n-descriptions bordered :column="2">
        <n-descriptions-item label="ID">{{ tenant.id || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Nama">{{ tenant.name || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Domain">{{ tenant.domain || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Status">
          <n-tag :type="tenant.is_active !== false ? 'success' : 'error'" size="small">{{ tenant.is_active !== false ? 'Aktif' : 'Non-Aktif' }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="Dibuat">{{ tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('id-ID') : '-' }}</n-descriptions-item>
        <n-descriptions-item label="Diperbarui">{{ tenant.updated_at ? new Date(tenant.updated_at).toLocaleDateString('id-ID') : '-' }}</n-descriptions-item>
      </n-descriptions>

      <div v-if="tenant.settings" style="margin-top: 16px">
        <h4>Settings</h4>
        <n-descriptions bordered :column="2">
          <n-descriptions-item v-for="(val, key) in tenant.settings" :key="String(key)" :label="String(key)">{{ val }}</n-descriptions-item>
        </n-descriptions>
      </div>
    </n-card>
  </n-space>
</template>
