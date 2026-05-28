import http from '../http'

export const invoiceApi = {
  list: (params?: Record<string, any>) => http.get('/invoices', { params }),
  get: (id: string) => http.get(`/invoices/${id}`),
  create: (data: Record<string, any>) => http.post('/invoices', data),
  update: (id: string, data: Record<string, any>) => http.put(`/invoices/${id}`, data),
  delete: (id: string) => http.delete(`/invoices/${id}`),
  generate: (data: Record<string, any>) => http.post('/invoices/generate', data),
  pay: (id: string, data: Record<string, any>) => http.post(`/invoices/${id}/pay`, data),
  payGateway: (id: string, data: Record<string, any>) => http.post(`/invoices/${id}/pay-gateway`, data),
  payments: (id: string) => http.get(`/invoices/${id}/payments`),
}

export const paymentApi = {
  list: (params?: Record<string, any>) => http.get('/payments', { params }),
  create: (data: Record<string, any>) => http.post('/payments', data),
}
