import http from '../http'

export const rewardApi = {
  list: (params?: Record<string, any>) => http.get('/rewards', { params }),
  get: (id: string) => http.get(`/rewards/${id}`),
  create: (data: Record<string, any>) => http.post('/rewards', data),
  update: (id: string, data: Record<string, any>) => http.put(`/rewards/${id}`, data),
  delete: (id: string) => http.delete(`/rewards/${id}`),
  stats: () => http.get('/rewards/stats'),
  dashboard: (params?: { months?: number }) => http.get('/rewards/dashboard', { params }),
}

export const rewardClaimApi = {
  list: (params?: Record<string, any>) => http.get('/reward-claims', { params }),
  apply: (id: string) => http.post(`/reward-claims/${id}/apply`),
  balance: (customerId: string) => http.get(`/reward-claims/balance/${customerId}`),
}

export const referralApi = {
  list: (params?: Record<string, any>) => http.get('/referrals', { params }),
  get: (id: string) => http.get(`/referrals/${id}`),
  markRewarded: (id: string) => http.post(`/referrals/${id}/reward`),
}
