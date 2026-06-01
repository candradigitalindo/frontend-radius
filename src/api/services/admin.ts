import http from '../http'

export const adminApi = {
  // SuperAdmin Dashboard — overview stats across all tenants
  dashboard: () => http.get('/admin/dashboard'),

  // Per-tenant stats (customer counts, router counts, plan)
  tenants: () => http.get('/admin/tenants'),

  // All routers across all tenants (with pagination)
  routers: (params?: Record<string, any>) => http.get('/admin/routers', { params }),

  // Customer counts per tenant (active/inactive)
  customers: () => http.get('/admin/customers'),

  // Rolling 6-month revenue across all tenants
  rollingRevenue: () => http.get('/admin/revenue/rolling'),

  // Rolling 6-month subscription revenue
  subscriptionRevenue: () => http.get('/admin/revenue/subscription'),

  // SuperAdmin Settings
  getSettings: () => http.get('/admin/settings'),
  updateSettings: (data: Record<string, any>) => http.put('/admin/settings', data),
  testPG: () => http.post('/admin/settings/test-pg'),

  // SuperAdmin WhatsApp Session (dedicated endpoints)
  waStartSession: () => http.post('/admin/wa/start'),
  waGetStatus: () => http.get('/admin/wa/status'),
  waGetQR: () => http.get('/admin/wa/qr'),
  waStopSession: () => http.delete('/admin/wa/stop'),

  // Subscription Plan management
  listSubscriptionPlans: () => http.get('/admin/subscription/plans'),
  createSubscriptionPlan: (data: Record<string, any>) => http.post('/admin/subscription/plans', data),
  updateSubscriptionPlan: (id: string, data: Record<string, any>) => http.put(`/admin/subscription/plans/${id}`, data),
  deleteSubscriptionPlan: (id: string) => http.delete(`/admin/subscription/plans/${id}`),

  // Subscription Reminder template management
  listSubscriptionReminders: () => http.get('/admin/subscription/reminders'),
  updateSubscriptionReminder: (id: string, data: Record<string, any>) => http.put(`/admin/subscription/reminders/${id}`, data),

  // Webhook URLs for subscription payment gateway
  getWebhookUrls: () => http.get('/admin/webhook-urls'),

  // Subscription Order CRUD (superadmin)
  listSubOrders: (params?: Record<string, any>) => http.get('/admin/subscription/orders', { params }),
  getSubOrder: (id: string) => http.get(`/admin/subscription/orders/${id}`),
  createSubOrder: (data: Record<string, any>) => http.post('/admin/subscription/orders', data),
  updateSubOrder: (id: string, data: Record<string, any>) => http.put(`/admin/subscription/orders/${id}`, data),
  deleteSubOrder: (id: string) => http.delete(`/admin/subscription/orders/${id}`),
}
