import http from '../http'

export const reportApi = {
  revenue: (params?: Record<string, any>) => http.get('/reports/revenue', { params }),
  customers: (params?: Record<string, any>) => http.get('/reports/customers', { params }),
  payments: (params?: Record<string, any>) => http.get('/reports/payments', { params }),
  collectionRate: (params?: Record<string, any>) => http.get('/reports/collection-rate', { params }),
  profitLoss: (params?: Record<string, any>) => http.get('/reports/profit-loss', { params }),
  vouchers: (params?: Record<string, any>) => http.get('/reports/vouchers', { params }),
}

export const exportApi = {
  revenueExcel: (params?: Record<string, any>) =>
    http.get('/exports/revenue/excel', { params, responseType: 'blob' }),
  revenuePdf: (params?: Record<string, any>) =>
    http.get('/exports/revenue/pdf', { params, responseType: 'blob' }),
  invoiceExcel: (params?: Record<string, any>) =>
    http.get('/exports/invoices/excel', { params, responseType: 'blob' }),
  invoicePdf: (params?: Record<string, any>) =>
    http.get('/exports/invoices/pdf', { params, responseType: 'blob' }),
  customerGrowthExcel: (params?: Record<string, any>) =>
    http.get('/exports/customer-growth/excel', { params, responseType: 'blob' }),
  customerGrowthPdf: (params?: Record<string, any>) =>
    http.get('/exports/customer-growth/pdf', { params, responseType: 'blob' }),
  profitLossExcel: (params?: Record<string, any>) =>
    http.get('/exports/profit-loss/excel', { params, responseType: 'blob' }),
  profitLossPdf: (params?: Record<string, any>) =>
    http.get('/exports/profit-loss/pdf', { params, responseType: 'blob' }),
}
