import http from '../http'

export const settingApi = {
  list: () => http.get('/settings'),
  get: (key: string) => http.get(`/settings/${key}`),
  set: (data: { key: string; value: string }) => http.post('/settings', data),
  update: (key: string, data: Record<string, any>) => http.put(`/settings/${key}`, data),
  bulkSet: (data: Record<string, string>) => http.put('/settings/bulk', data),
  delete: (key: string) => http.delete(`/settings/${key}`),
  getIsolirPage: () => http.get('/settings/isolir-page'),
  updateIsolirPage: (data: Record<string, string>) => http.put('/settings/isolir-page', data),
  getTheme: () => http.get('/settings/theme'),
  updateTheme: (data: { theme?: string; language?: string }) => http.put('/settings/theme', data),
}
