import http from '../http'

export const adminApi = {
  // SuperAdmin Dashboard — overview stats across all tenants
  dashboard: () => http.get('/admin/dashboard'),

  // Per-tenant stats (customer counts, router counts, plan)
  tenants: () => http.get('/admin/tenants'),

  // All routers across all tenants (with pagination)
  routers: (params?: Record<string, any>) => http.get('/admin/routers', { params }),

  // Customer counts per tenant (active/inactive)
  customers: () => http.get('/admin/customers'),

  // Rolling 6-month revenue across all tenants
  rollingRevenue: () => http.get('/admin/revenue/rolling'),

  // Rolling 6-month subscription revenue
  subscriptionRevenue: () => http.get('/admin/revenue/subscription'),
}
