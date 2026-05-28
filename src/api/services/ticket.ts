import http from '../http'

export const ticketApi = {
  list: (params?: Record<string, any>) => http.get('/tickets', { params }),
  get: (id: string) => http.get(`/tickets/${id}`),
  create: (data: Record<string, any>) => http.post('/tickets', data),
  update: (id: string, data: Record<string, any>) => http.put(`/tickets/${id}`, data),
  delete: (id: string) => http.delete(`/tickets/${id}`),
  updateStatus: (id: string, status: string) => http.put(`/tickets/${id}/status`, { status }),
  assign: (id: string, data: { assigned_to: string }) => http.put(`/tickets/${id}/assign`, data),
  messages: (id: string) => http.get(`/tickets/${id}/messages`),
  reply: (id: string, data: { message: string }) => http.post(`/tickets/${id}/messages`, data),
}
