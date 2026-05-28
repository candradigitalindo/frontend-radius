import http from '../http'

export const portalApi = {
  // Public (no auth)
  tenantInfo: (slug: string) => http.get(`/public/portal/${slug}`),
  login: (slug: string, data: { customer_code: string; password: string }) =>
    http.post(`/public/portal/${slug}/login`, data),
  requestResetPIN: (slug: string, data: { customer_code: string }) =>
    http.post(`/public/portal/${slug}/reset-pin`, data),
  resetPassword: (slug: string, data: { customer_code: string; pin: string; new_password: string }) =>
    http.post(`/public/portal/${slug}/reset-password`, data),
  // Protected (auth required)
  profile: () => http.get('/portal/profile'),
  customer: () => http.get('/portal/customer'),
  invoices: (params?: Record<string, any>) => http.get('/portal/invoices', { params }),
  invoice: (id: string) => http.get(`/portal/invoices/${id}`),
  invoicePayments: (id: string) => http.get(`/portal/invoices/${id}/payments`),
  tickets: (params?: Record<string, any>) => http.get('/portal/tickets', { params }),
  createTicket: (data: Record<string, any>) => http.post('/portal/tickets', data),
  ticket: (id: string) => http.get(`/portal/tickets/${id}`),
  ticketMessages: (id: string) => http.get(`/portal/tickets/${id}/messages`),
  replyTicket: (id: string, data: { message: string }) => http.post(`/portal/tickets/${id}/messages`, data),
  changePassword: (data: { current_password: string; new_password: string }) => http.put('/portal/change-password', data),
}
