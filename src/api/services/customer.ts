import http from '../http'

export const customerApi = {
  list: (params?: Record<string, any>) => http.get('/customers', { params }),
  get: (id: string) => http.get(`/customers/${id}`),
  create: (data: Record<string, any>) => http.post('/customers', data),
  update: (id: string, data: Record<string, any>) => http.put(`/customers/${id}`, data),
  delete: (id: string) => http.delete(`/customers/${id}`),
  nextCode: () => http.get('/customers/next-code'),
  stats: () => http.get('/customers/stats'),
  isolate: (id: string) => http.post(`/customers/${id}/isolate`),
  activate: (id: string) => http.post(`/customers/${id}/activate`),
  updateProfile: (id: string, data: Record<string, any>) => http.put(`/customers/${id}/profile`, data),
  updateAccess: (id: string, data: Record<string, any>) => http.put(`/customers/${id}/access`, data),
  updateService: (id: string, data: Record<string, any>) => http.put(`/customers/${id}/service`, data),
  logs: (id: string, params?: Record<string, any>) => http.get(`/customers/${id}/logs`, { params }),
  invoices: (id: string, params?: Record<string, any>) => http.get(`/customers/${id}/invoices`, { params }),
  bandwidth: (id: string, params?: Record<string, any>) => http.get(`/customers/${id}/bandwidth`, { params }),
  bandwidthHistory: (id: string, params?: Record<string, any>) => http.get(`/customers/${id}/bandwidth/history`, { params }),
  connections: (id: string, params?: Record<string, any>) => http.get(`/customers/${id}/connections`, { params }),
  rewardBalance: (id: string) => http.get(`/customers/${id}/reward-balance`),
  getOnt: (id: string) => http.get(`/customers/${id}/ont`),
}
