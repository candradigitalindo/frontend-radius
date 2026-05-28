import http from '../http'

export const dashboardApi = {
  stats: (params?: { month?: number; year?: number }) =>
    http.get('/dashboard/stats', { params }),
  revenue: (params?: { year?: number }) =>
    http.get('/dashboard/revenue', { params }),
  rollingRevenue: () =>
    http.get('/dashboard/revenue/rolling'),
}
