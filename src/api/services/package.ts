import http from '../http'

export const packageApi = {
  list: (params?: Record<string, any>) => http.get('/packages', { params }),
  get: (id: string) => http.get(`/packages/${id}`),
  create: (data: Record<string, any>) => http.post('/packages', data),
  update: (id: string, data: Record<string, any>) => http.put(`/packages/${id}`, data),
  delete: (id: string) => http.delete(`/packages/${id}`),
}
