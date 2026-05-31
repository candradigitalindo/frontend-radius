import http from '../http'

export const billingProfileApi = {
  list: () => http.get('/billing-profiles'),
  get: (id: string) => http.get(`/billing-profiles/${id}`),
  create: (data: Record<string, any>) => http.post('/billing-profiles', data),
  update: (id: string, data: Record<string, any>) => http.put(`/billing-profiles/${id}`, data),
  delete: (id: string) => http.delete(`/billing-profiles/${id}`),
  setDefault: (id: string) => http.put(`/billing-profiles/${id}/default`),
}
