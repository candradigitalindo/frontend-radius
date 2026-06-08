import http from '../http'

export const ftthApi = {
  getStats: () => http.get('/ftth/stats'),
  getMapItems: () => http.get('/ftth/map'),
}
