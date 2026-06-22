import http from '../http'

export const resellerApi = {
  list: (params?: Record<string, any>) => http.get('/resellers', { params }),
  get: (id: string) => http.get(`/resellers/${id}`),
  create: (data: Record<string, any>) => http.post('/resellers', data),
  update: (id: string, data: Record<string, any>) => http.put(`/resellers/${id}`, data),
  delete: (id: string) => http.delete(`/resellers/${id}`),
  customers: (id: string, params?: Record<string, any>) => http.get(`/resellers/${id}/customers`, { params }),
  addCommission: (id: string, data: Record<string, any>) => http.post(`/resellers/${id}/commissions`, data),
  commissions: (id: string, params?: Record<string, any>) => http.get(`/resellers/${id}/commissions`, { params }),
  commissionSummary: (id: string) => http.get(`/resellers/${id}/commission-summary`),
  payAll: (id: string) => http.post(`/resellers/${id}/commissions/pay-all`),
  payCommission: (commissionId: string) => http.post(`/resellers/commissions/${commissionId}/pay`),
}
