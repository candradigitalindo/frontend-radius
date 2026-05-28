import http from '../http'

export const whatsappApi = {
  // Config
  getConfig: () => http.get('/whatsapp/config'),
  updateConfig: (data: Record<string, any>) => http.put('/whatsapp/config', data),
  // Session (Baileys)
  startSession: () => http.post('/whatsapp/sessions/start'),
  getStatus: () => http.get('/whatsapp/sessions/status'),
  getQR: () => http.get('/whatsapp/sessions/qr'),
  stopSession: () => http.delete('/whatsapp/sessions'),
  // Send
  send: (data: { phone: string; message: string }) => http.post('/whatsapp/send', data),
  // Logs
  logs: (params?: Record<string, any>) => http.get('/whatsapp/logs', { params }),
  // Broadcast
  broadcast: (data: Record<string, any>) => http.post('/broadcasts', data),
  broadcastList: (params?: Record<string, any>) => http.get('/broadcasts', { params }),
  broadcastGet: (id: string) => http.get(`/broadcasts/${id}`),
  // Templates
  templates: (params?: Record<string, any>) => http.get('/whatsapp/templates', { params }),
  getTemplate: (id: string) => http.get(`/whatsapp/templates/${id}`),
  createTemplate: (data: Record<string, any>) => http.post('/whatsapp/templates', data),
  updateTemplate: (id: string, data: Record<string, any>) => http.put(`/whatsapp/templates/${id}`, data),
  deleteTemplate: (id: string) => http.delete(`/whatsapp/templates/${id}`),
}
