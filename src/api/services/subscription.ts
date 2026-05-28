import http from '../http'

export const subscriptionApi = {
  plans: () => http.get('/subscription/plans'),
  getPlan: (id: string) => http.get(`/subscription/plans/${id}`),
  subscribe: (planId: string, durationMonths?: number) =>
    http.post('/subscription/subscribe', { plan_id: planId, duration_months: durationMonths || 1 }),
  orders: (params?: Record<string, any>) => http.get('/subscription/orders', { params }),
  getOrder: (id: string) => http.get(`/subscription/orders/${id}`),
  createPayment: (id: string, returnURL?: string) =>
    http.post(`/subscription/orders/${id}/pay`, { return_url: returnURL }),
  confirmOrder: (id: string, data?: { payment_method?: string; payment_ref?: string }) =>
    http.post(`/subscription/orders/${id}/confirm`, data),
}
