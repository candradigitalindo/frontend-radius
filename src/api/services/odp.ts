import http from '../http'

export const odpApi = {
  list: (params?: Record<string, any>) => http.get('/odps', { params }),
  get: (id: string) => http.get(`/odps/${id}`),
  create: (data: Record<string, any>) => http.post('/odps', data),
  update: (id: string, data: Record<string, any>) => http.put(`/odps/${id}`, data),
  delete: (id: string) => http.delete(`/odps/${id}`),
  ports: (id: string) => http.get(`/odps/${id}/ports`),
  createPort: (id: string, data: Record<string, any>) => http.post(`/odps/${id}/ports`, data),
  updatePort: (id: string, portId: string, data: Record<string, any>) => http.put(`/odps/${id}/ports/${portId}`, data),
  deletePort: (id: string, portId: string) => http.delete(`/odps/${id}/ports/${portId}`),
  listSplitters: (params?: Record<string, any>) => http.get('/splitters', { params }),
  createSplitter: (data: Record<string, any>) => http.post('/splitters', data),
  getSplitter: (id: string) => http.get(`/splitters/${id}`),
  updateSplitter: (id: string, data: Record<string, any>) => http.put(`/splitters/${id}`, data),
  deleteSplitter: (id: string) => http.delete(`/splitters/${id}`),
}
