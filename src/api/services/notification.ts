import http from '../http'

export const notificationApi = {
  list: (params?: Record<string, any>) => http.get('/notifications', { params }),
  send: (data: FormData | Record<string, any>) => http.post('/notifications/send', data),
  broadcast: (data: FormData | Record<string, any>) => http.post('/notifications/broadcast', data),
  markRead: (id: string) => http.put(`/notifications/${id}/read`),
  markAllRead: () => http.put('/notifications/read-all'),
}

export const i18nApi = {
  languages: () => http.get('/languages'),
  translations: () => http.get('/translations'),
}
