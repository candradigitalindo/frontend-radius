import http from '../http'

export const tenantApi = {
  current: () => http.get('/tenant'),
  update: (data: Record<string, any>) => http.put('/tenant', data),
  updateSettings: (data: Record<string, any>) => http.put('/tenant/settings', data),
  testSettings: (data?: Record<string, any>) => http.post('/tenant/settings/test', data || {}),
  webhooks: () => http.get('/tenant/webhook-urls'),
  list: () => http.get('/tenants'),
  create: (data: Record<string, any>) => http.post('/tenants', data),
  getById: (id: string) => http.get(`/tenants/${id}`),
  adminUpdate: (id: string, data: Record<string, any>) => http.put(`/tenants/${id}`, data),
  resetPassword: (id: string) => http.post(`/tenants/${id}/reset-password`),
  approve: (id: string) => http.post(`/tenants/${id}/approve`),
}

export const reminderApi = {
  list: () => http.get('/reminders'),
  create: (data: Record<string, any>) => http.post('/reminders', data),
  get: (id: string) => http.get(`/reminders/${id}`),
  update: (id: string, data: Record<string, any>) => http.put(`/reminders/${id}`, data),
  delete: (id: string) => http.delete(`/reminders/${id}`),
  trigger: () => http.post('/reminders/trigger'),
}
