import http from '../http'

// Public self-service payment (no auth). Used by the WhatsApp-blast payment link
// page at /pay/:tenantId/:customerCode.
export const publicPayApi = {
  // Customer info + unpaid invoices
  info: (tenantId: string, customerCode: string) =>
    http.get(`/public/pay/${tenantId}/${customerCode}`),

  // Create a gateway payment for one invoice
  create: (
    tenantId: string,
    customerCode: string,
    data: {
      invoice_id: string
      payment_method?: string
      customer_name?: string
      customer_email?: string
      customer_phone?: string
      return_url?: string
    },
  ) => http.post(`/public/pay/${tenantId}/${customerCode}`, data),

  // Check status of a gateway transaction
  checkStatus: (trxId: string) => http.get(`/public/pay/check/${trxId}`),
}
