import http from '../http'

export const bandwidthApi = {
  topUsers: (params?: Record<string, any>) => http.get('/bandwidth/top-users', { params }),
  summary: (params?: Record<string, any>) => http.get('/bandwidth/summary', { params }),
  saturation: (params?: Record<string, any>) => http.get('/bandwidth/saturation', { params }),
}
