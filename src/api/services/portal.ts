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
  device: () => http.get('/portal/device'),
  setDeviceWifi: (data: { ssid: string; password: string }) => http.put('/portal/device/wifi', data),
  rebootDevice: () => http.post('/portal/device/reboot'),
  payInvoiceGateway: (id: string, data: { payment_method?: string; return_url?: string }) =>
    http.post(`/portal/invoices/${id}/pay-gateway`, data),
  packages: () => http.get('/portal/packages'),
  changePackage: (data: { package_id: string; package_name: string; change_type: string; notes?: string }) =>
    http.post('/portal/change-package', data),
  referral: () => http.get('/portal/referral'),
  paymentConfig: () => http.get('/portal/payment-config'),
  // Web push (PWA)
  registerPush: (data: { fcm_token: string; device_type?: string }) =>
    http.post('/portal/push/register', data),
  unregisterPush: (data: { fcm_token: string }) =>
    http.post('/portal/push/unregister', data),
}
