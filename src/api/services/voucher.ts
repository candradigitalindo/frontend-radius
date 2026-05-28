import http from '../http'

export const voucherApi = {
  products: (params?: Record<string, any>) => http.get('/voucher-products', { params }),
  getProduct: (id: string) => http.get(`/voucher-products/${id}`),
  createProduct: (data: Record<string, any>) => http.post('/voucher-products', data),
  updateProduct: (id: string, data: Record<string, any>) => http.put(`/voucher-products/${id}`, data),
  deleteProduct: (id: string) => http.delete(`/voucher-products/${id}`),
  list: (params?: Record<string, any>) => http.get('/vouchers', { params }),
  generate: (data: Record<string, any>) => http.post('/vouchers/generate', data),
  sell: (id: string, data: Record<string, any>) => http.post(`/vouchers/${id}/sell`, data),
  activate: (id: string) => http.post(`/vouchers/${id}/activate`),
  delete: (id: string) => http.delete(`/vouchers/${id}`),
}
