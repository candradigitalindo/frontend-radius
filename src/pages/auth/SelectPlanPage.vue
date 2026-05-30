<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NButton, NSpace, NText, NTag, NSpin, useMessage,
} from 'naive-ui'
import { authApi } from '../../api'
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const message = useMessage()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const isDark = computed(() => themeStore.isDark)
const loading = ref(true)
const saving = ref(false)
const plans = ref<any[]>([])

async function fetchPlans() {
  loading.value = true
  try {
    const { data } = await authApi.listPlans()
    plans.value = data.data || []
  } catch (e: any) {
    message.error('Gagal memuat paket langganan')
  } finally {
    loading.value = false
  }
}

async function handleSelectPlan(slug: string) {
  saving.value = true
  try {
    await authApi.selectPlan({ plan_slug: slug })
    message.success('Paket berhasil dipilih. Selamat datang di D Radius!')
    
    // Update local user state
    await authStore.fetchUser()
    
    // Redirect to dashboard
    router.push('/')
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal memilih paket')
  } finally {
    saving.value = false
  }
}

function formatPrice(price: number) {
  if (price === 0) return 'Gratis'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price)
}

onMounted(() => {
  fetchPlans()
})
</script>

<template>
  <div class="select-plan-page" :class="{ 'light-mode': !isDark }">
    <div class="content-wrapper">
      <div class="header-section">
        <h2>Pilih Paket Langganan</h2>
        <p>Silakan pilih paket yang sesuai dengan kebutuhan operasional ISP Anda untuk memulai.</p>
      </div>

      <div v-if="loading" style="text-align: center; padding: 50px 0;">
        <n-spin size="large" />
      </div>

      <div v-else class="plans-grid">
        <n-card v-for="plan in plans" :key="plan.id" class="plan-card" :class="{'popular': plan.is_popular}">
          <template v-if="plan.is_popular" #header-extra>
            <n-tag type="warning" size="small" round>Paling Diminati</n-tag>
          </template>
          
          <h3 class="plan-name">{{ plan.name }}</h3>
          <div class="plan-price">
            <span class="amount">{{ formatPrice(plan.price) }}</span>
            <span class="period" v-if="plan.price > 0">/ {{ plan.duration_months > 1 ? plan.duration_months + ' bln' : 'bulan' }}</span>
          </div>
          
          <p class="plan-desc">{{ plan.description }}</p>
          
          <ul class="plan-features">
            <li>
              <span class="icon">✓</span>
              <span>Maksimal <strong>{{ plan.max_customers === 0 ? 'Tanpa Batas' : plan.max_customers }}</strong> Pelanggan</span>
            </li>
            <li>
              <span class="icon">✓</span>
              <span>Maksimal <strong>{{ plan.max_routers === 0 ? 'Tanpa Batas' : plan.max_routers }}</strong> Router</span>
            </li>
            <li v-for="(feat, idx) in plan.features" :key="idx">
              <span class="icon">✓</span>
              <span>{{ feat }}</span>
            </li>
          </ul>

          <template #footer>
            <n-button 
              block 
              size="large" 
              :type="plan.is_popular ? 'primary' : 'default'"
              :loading="saving"
              @click="handleSelectPlan(plan.slug)"
            >
              Pilih Paket Ini
            </n-button>
          </template>
        </n-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-plan-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  background-color: #1a1b26;
  color: #fff;
}

.select-plan-page.light-mode {
  background-color: #f7fafc;
  color: #1a202c;
}

.content-wrapper {
  max-width: 1200px;
  width: 100%;
}

.header-section {
  text-align: center;
  margin-bottom: 50px;
}

.header-section h2 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-section p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  max-width: 600px;
  margin: 0 auto;
}

.light-mode .header-section p {
  color: #4a5568;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  justify-content: center;
}

.plan-card {
  border-radius: 16px;
  background-color: #24283b;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.light-mode .plan-card {
  background-color: #ffffff;
  border-color: #e2e8f0;
}

.plan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.light-mode .plan-card:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
}

.plan-card.popular {
  border-color: #f59e0b;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.1);
}

.plan-name {
  font-size: 20px;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 16px;
}

.plan-price {
  margin-bottom: 20px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.amount {
  font-size: 32px;
  font-weight: 700;
}

.period {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.light-mode .period {
  color: #a0aec0;
}

.plan-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 24px;
  min-height: 42px;
}

.light-mode .plan-desc {
  color: #718096;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 30px 0;
  flex-grow: 1;
}

.plan-features li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
}

.plan-features .icon {
  color: #10b981;
  font-weight: bold;
}
</style>
