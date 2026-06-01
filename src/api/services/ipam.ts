import http from '../http'

export const ipamApi = {
  pools: (params?: Record<string, any>) => http.get('/ip-pools', { params }),
  getPool: (id: string) => http.get(`/ip-pools/${id}`),
  createPool: (data: Record<string, any>) => http.post('/ip-pools', data),
  updatePool: (id: string, data: Record<string, any>) => http.put(`/ip-pools/${id}`, data),
  deletePool: (id: string) => http.delete(`/ip-pools/${id}`),
  addresses: (poolId: string, params?: Record<string, any>) => http.get(`/ip-pools/${poolId}/addresses`, { params }),
  createAddress: (poolId: string, data: Record<string, any>) => http.post(`/ip-pools/${poolId}/addresses`, data),
  createAddressBatch: (poolId: string, data: Record<string, any>) => http.post(`/ip-pools/${poolId}/addresses/batch`, data),
  findAvailable: (poolId: string) => http.get(`/ip-pools/${poolId}/available`),
  poolStats: (poolId: string) => http.get(`/ip-pools/${poolId}/stats`),
  assignAddress: (poolId: string, addrId: string, data: Record<string, any>) => http.post(`/ip-pools/${poolId}/addresses/${addrId}/assign`, data),
  releaseAddress: (poolId: string, addrId: string) => http.post(`/ip-pools/${poolId}/addresses/${addrId}/release`),
  poolByRouter: (routerId: string) => http.get(`/routers/${routerId}/ip-pool`),
}
