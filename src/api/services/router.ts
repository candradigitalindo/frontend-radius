import http from '../http'

export const routerApi = {
  list: (params?: Record<string, any>) => http.get('/routers', { params }),
  get: (id: string) => http.get(`/routers/${id}`),
  create: (data: Record<string, any>) => http.post('/routers', data),
  update: (id: string, data: Record<string, any>) => http.put(`/routers/${id}`, data),
  delete: (id: string) => http.delete(`/routers/${id}`),
  regenerateToken: (id: string) => http.post(`/routers/${id}/regenerate-token`),
  sessions: (id: string, params?: Record<string, any>) => http.get(`/routers/${id}/sessions`, { params }),
  traffic: (id: string) => http.get(`/routers/${id}/traffic`),
  test: (id: string) => http.post(`/routers/${id}/test`),
  sync: (id: string) => http.post(`/routers/${id}/sync`),
  connectionLogs: (id: string, params?: Record<string, any>) => http.get(`/routers/${id}/connection-logs`, { params }),
  vpnPeers: () => http.get('/routers/vpn/peers'),
  vpnKey: (id: string, data: { public_key: string }) => http.post(`/routers/${id}/vpn-key`, data),
  mikrotikConfig: (id: string) => http.get(`/routers/${id}/mikrotik-config`),
  interfaces: (id: string) => http.get(`/routers/${id}/interfaces`),
}
