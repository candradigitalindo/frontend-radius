import http from '../http'

export const oltApi = {
  list: (params?: Record<string, any>) => http.get('/olts', { params }),
  get: (id: string) => http.get(`/olts/${id}`),
  create: (data: Record<string, any>) => http.post('/olts', data),
  update: (id: string, data: Record<string, any>) => http.put(`/olts/${id}`, data),
  delete: (id: string) => http.delete(`/olts/${id}`),
  ponPorts: (id: string) => http.get(`/olts/${id}/pon-ports`),
  createPonPort: (id: string, data: Record<string, any>) => http.post(`/olts/${id}/pon-ports`, data),
  updatePonPort: (id: string, portId: string, data: Record<string, any>) => http.put(`/olts/${id}/pon-ports/${portId}`, data),
  deletePonPort: (id: string, portId: string) => http.delete(`/olts/${id}/pon-ports/${portId}`),
  snmpSystem: (id: string) => http.get(`/olts/${id}/snmp/system`),
  snmpPonPorts: (id: string) => http.get(`/olts/${id}/snmp/pon-ports`),
  snmpMonitor: (id: string) => http.get(`/olts/${id}/snmp/monitor`),
  sync: (id: string) => http.post(`/olts/${id}/sync`),
}
