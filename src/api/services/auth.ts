import http from '../http'

export const authApi = {
  login: (data: { email: string; password: string; tenant_id?: string }) =>
    http.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    http.post('/auth/register', data),
  me: () => http.get('/auth/me'),
  updateProfile: (data: { name: string; email: string; phone?: string }) =>
    http.put('/auth/me', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    http.put('/auth/change-password', data),
  refresh: (refresh_token: string) => http.post('/auth/refresh', { refresh_token }),
  logout: () => http.post('/auth/logout'),
  requestResetPIN: (data: { email: string; phone: string }) =>
    http.post('/auth/reset-pin', data),
  resetPassword: (data: { email: string; phone: string; pin: string; new_password: string }) =>
    http.post('/auth/reset-password', data),
}
