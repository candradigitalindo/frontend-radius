import http from '../http'

export const ontApi = {
  list: (params?: Record<string, any>) => http.get('/onts', { params }),
  get: (id: string) => http.get(`/onts/${id}`),
  create: (data: Record<string, any>) => http.post('/onts', data),
  update: (id: string, data: Record<string, any>) => http.put(`/onts/${id}`, data),
  delete: (id: string) => http.delete(`/onts/${id}`),
  sync: (id: string) => http.post(`/onts/${id}/sync`),
  reboot: (id: string) => http.post(`/onts/${id}/reboot`),
  provision: (id: string) => http.post(`/onts/${id}/provision`),
  wifi: (id: string, data: Record<string, any>) => http.post(`/onts/${id}/wifi`, data),
  diagnostics: (id: string) => http.get(`/onts/${id}/diagnostics`),
  pppoe: (id: string, data: Record<string, any>) => http.post(`/onts/${id}/pppoe`, data),
}
