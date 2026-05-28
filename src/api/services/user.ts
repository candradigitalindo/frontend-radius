import http from '../http'

export const userApi = {
  getPreferences: () => http.get('/user/preferences'),
  updatePreferences: (data: { theme?: string; language?: string }) => http.put('/user/preferences', data),
  // User management (owner only)
  list: () => http.get('/users'),
  create: (data: Record<string, any>) => http.post('/users', data),
  update: (id: string, data: Record<string, any>) => http.put(`/users/${id}`, data),
  delete: (id: string) => http.delete(`/users/${id}`),
  toggleActive: (id: string) => http.post(`/users/${id}/toggle-active`),
}

export const roleApi = {
  list: () => http.get('/roles'),
  permissions: () => http.get('/roles/permissions'),
  create: (data: Record<string, any>) => http.post('/roles', data),
  update: (id: string, data: Record<string, any>) => http.put(`/roles/${id}`, data),
  delete: (id: string) => http.delete(`/roles/${id}`),
}
